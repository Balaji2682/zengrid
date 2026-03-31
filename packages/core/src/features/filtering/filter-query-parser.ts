import type {
  FilterAst,
  FilterAstNode,
  FilterAstPredicateNode,
  FilterAstTarget,
  FilterExpression,
  FilterModel,
  FilterOperator,
  FilterQuery,
} from '../../types';
import { projectFilterAstToModels, toStandardFilterOperator } from './filter-ast';

type NamedQueryParams = Record<string, unknown>;
type PositionalSqlParams = unknown[];

type SqlTokenType =
  | 'identifier'
  | 'string'
  | 'number'
  | 'param'
  | 'keyword'
  | 'operator'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'eof';

interface SqlToken {
  type: SqlTokenType;
  value: string | number;
  start: number;
  end: number;
}

const KEYWORDS = new Set([
  'AND',
  'OR',
  'NOT',
  'LIKE',
  'BETWEEN',
  'IN',
  'IS',
  'NULL',
  'TRUE',
  'FALSE',
]);

/**
 * FilterQueryParser - Parses SQL-like filter queries
 *
 * Converts SQL-like syntax to FilterExpression for both backend and frontend use.
 * Supported syntax is lowered into semantic AST nodes so frontend and backend
 * now share the same canonical filter tree.
 */
export class FilterQueryParser {
  private columnMap: Map<string, number> = new Map();

  /**
   * Set column name to index mapping
   * Required for converting SQL field names to column indices
   */
  setColumnMapping(mapping: Record<string, number>): void {
    this.columnMap = new Map(Object.entries(mapping));
  }

  /**
   * Parse SQL-like filter query into FilterExpression
   */
  parse(query: FilterQuery): FilterExpression {
    try {
      const { sql: boundSql, params } = this.toPositionalQuery(query.sql, query.params ?? {});
      const ast = this.parseSemanticAst(query.sql, query.params ?? {});

      return {
        type: 'sql',
        ast,
        sql: query.sql,
        boundSql,
        params,
      };
    } catch (error) {
      throw new Error(`Failed to parse filter query: ${(error as Error).message}`);
    }
  }

  /**
   * Convert SQL query to FilterModels (for frontend filtering)
   */
  parseToModels(query: FilterQuery, columnNames: string[]): FilterModel[] {
    const expression = this.parse(query);
    const projection = projectFilterAstToModels(expression.ast, {
      columns: columnNames.map((name) => ({ field: name, header: name })),
    });

    if (projection.complete) {
      return projection.models;
    }

    console.warn(
      'FilterQueryParser.parseToModels(): Converting SQL to FilterModels has limitations. Consider using the canonical filter AST for complex queries.'
    );

    for (const warning of projection.warnings) {
      console.warn(`FilterQueryParser.parseToModels(): ${warning}`);
    }

    return [];
  }

  private parseSemanticAst(sql: string, params: NamedQueryParams): FilterAst {
    const parser = new SqlAstParser(sql, params, (field) => this.resolveTarget(field));
    return parser.parse();
  }

  private resolveTarget(field: string): FilterAstTarget {
    const column = this.columnMap.get(field);
    return {
      field,
      column,
    };
  }

  private toPositionalQuery(
    sql: string,
    namedParams: NamedQueryParams
  ): {
    sql: string;
    params: PositionalSqlParams;
  } {
    const params: PositionalSqlParams = [];

    const tokenRegex = /'((?:''|[^'])*)'|(-?\d+(?:\.\d+)?)\b|:([A-Za-z_][A-Za-z0-9_]*)\b/g;
    const boundSql = sql.replace(
      tokenRegex,
      (match, stringValue?: string, numberValue?: string, namedParam?: string) => {
        if (namedParam !== undefined) {
          if (!Object.prototype.hasOwnProperty.call(namedParams, namedParam)) {
            throw new Error(`Missing named parameter :${namedParam}`);
          }

          params.push(this.toSqlParamValue(namedParams[namedParam]));
          return '?';
        }

        if (stringValue !== undefined) {
          params.push(stringValue.replace(/''/g, "'"));
          return '?';
        }

        if (numberValue !== undefined) {
          params.push(parseFloat(numberValue));
          return '?';
        }

        return match;
      }
    );

    return { sql: boundSql, params };
  }

  private toSqlParamValue(value: unknown): unknown {
    if (
      typeof value === 'number' ||
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      value == null
    ) {
      return value;
    }

    return String(value);
  }
}

class SqlAstParser {
  private readonly sql: string;
  private readonly params: NamedQueryParams;
  private readonly resolveTarget: (field: string) => FilterAstTarget;
  private readonly tokens: SqlToken[];
  private index = 0;

  constructor(
    sql: string,
    params: NamedQueryParams,
    resolveTarget: (field: string) => FilterAstTarget
  ) {
    this.sql = sql;
    this.params = params;
    this.resolveTarget = resolveTarget;
    this.tokens = tokenizeSql(sql);
  }

  parse(): FilterAst {
    const node = this.parseOrExpression();
    this.expect('eof');

    return {
      version: 1,
      root: node.kind === 'group' ? node : this.createGroup('AND', [node]),
    };
  }

  private parseOrExpression(): FilterAstNode {
    const nodes = [this.parseAndExpression()];

    while (this.matchKeyword('OR')) {
      nodes.push(this.parseAndExpression());
    }

    return this.combineNodes('OR', nodes);
  }

  private parseAndExpression(): FilterAstNode {
    const nodes = [this.parseNotExpression()];

    while (this.matchKeyword('AND')) {
      nodes.push(this.parseNotExpression());
    }

    return this.combineNodes('AND', nodes);
  }

  private parseNotExpression(): FilterAstNode {
    if (this.matchKeyword('NOT')) {
      return {
        kind: 'not',
        source: 'sql',
        child: this.parseNotExpression(),
      };
    }

    return this.parsePrimaryExpression();
  }

  private parsePrimaryExpression(): FilterAstNode {
    if (this.match('lparen')) {
      const node = this.parseOrExpression();
      this.expect('rparen');
      return node;
    }

    return this.parsePredicate();
  }

  private parsePredicate(): FilterAstNode {
    const field = this.expectIdentifier();

    if (this.matchKeyword('IS')) {
      if (this.matchKeyword('NOT')) {
        this.expectKeyword('NULL');
        return this.createPredicate(field, 'notBlank');
      }

      this.expectKeyword('NULL');
      return this.createPredicate(field, 'blank');
    }

    if (this.matchKeyword('NOT')) {
      if (this.matchKeyword('LIKE')) {
        return this.buildLikeNode(field, this.parseValue(), true);
      }

      if (this.matchKeyword('BETWEEN')) {
        const value = this.parseValue();
        this.expectKeyword('AND');
        const valueTo = this.parseValue();
        return this.createNotNode(this.createPredicate(field, 'between', value, valueTo));
      }

      if (this.matchKeyword('IN')) {
        return this.createPredicate(field, 'notIn', this.parseValueList());
      }

      throw this.error('Expected LIKE, BETWEEN, or IN after NOT in predicate.');
    }

    if (this.matchKeyword('BETWEEN')) {
      const value = this.parseValue();
      this.expectKeyword('AND');
      const valueTo = this.parseValue();
      return this.createPredicate(field, 'between', value, valueTo);
    }

    if (this.matchKeyword('IN')) {
      return this.createPredicate(field, 'in', this.parseValueList());
    }

    if (this.matchKeyword('LIKE')) {
      return this.buildLikeNode(field, this.parseValue(), false);
    }

    const operator = this.matchComparisonOperator();
    if (!operator) {
      throw this.error('Expected a comparison operator, LIKE, BETWEEN, IN, or IS NULL.');
    }

    return this.createComparisonNode(field, operator, this.parseValue());
  }

  private createComparisonNode(field: string, operator: string, value: unknown): FilterAstNode {
    switch (operator) {
      case '=':
        return this.createPredicate(field, 'equals', value);
      case '!=':
      case '<>':
        return this.createPredicate(field, 'notEquals', value);
      case '>':
        return this.createPredicate(field, 'greaterThan', value);
      case '<':
        return this.createPredicate(field, 'lessThan', value);
      case '>=':
        return this.createPredicate(field, 'greaterThanOrEqual', value);
      case '<=':
        return this.createPredicate(field, 'lessThanOrEqual', value);
      default:
        throw this.error(`Unsupported comparison operator ${operator}.`);
    }
  }

  private buildLikeNode(field: string, rawValue: unknown, negated: boolean): FilterAstNode {
    const pattern = String(rawValue);
    const wildcardCount = countLikeWildcards(pattern);
    const simpleInner = pattern.replace(/^%/, '').replace(/%$/, '');
    const hasUnderscore = pattern.includes('_');

    if (wildcardCount === 0 && !hasUnderscore) {
      return this.createPredicate(field, negated ? 'notEquals' : 'equals', pattern);
    }

    if (!hasUnderscore && wildcardCount === 2 && pattern.startsWith('%') && pattern.endsWith('%')) {
      return this.createPredicate(field, negated ? 'notContains' : 'contains', simpleInner);
    }

    if (!hasUnderscore && wildcardCount === 1 && pattern.endsWith('%')) {
      const predicate = this.createPredicate(field, 'startsWith', pattern.slice(0, -1));
      return negated ? this.createNotNode(predicate) : predicate;
    }

    if (!hasUnderscore && wildcardCount === 1 && pattern.startsWith('%')) {
      const predicate = this.createPredicate(field, 'endsWith', pattern.slice(1));
      return negated ? this.createNotNode(predicate) : predicate;
    }

    const predicate = this.createPredicate(field, 'regex', likePatternToRegex(pattern));
    return negated ? this.createNotNode(predicate) : predicate;
  }

  private createPredicate(
    field: string,
    operator: FilterOperator,
    value?: unknown,
    valueTo?: unknown
  ): FilterAstPredicateNode {
    return {
      kind: 'predicate',
      source: 'sql',
      target: this.resolveTarget(field),
      operator: toStandardFilterOperator(operator),
      value,
      valueTo,
      valueType: inferValueType(value, valueTo),
      sourceOperator: operator,
    };
  }

  private createNotNode(child: FilterAstNode): FilterAstNode {
    return {
      kind: 'not',
      source: 'sql',
      child,
    };
  }

  private combineNodes(logic: 'AND' | 'OR', nodes: FilterAstNode[]): FilterAstNode {
    const children: FilterAstNode[] = [];

    for (const node of nodes) {
      if (node.kind === 'group' && node.logic === logic && node.source === 'sql') {
        children.push(...node.children);
        continue;
      }

      children.push(node);
    }

    if (children.length === 1) {
      return children[0];
    }

    return this.createGroup(logic, children);
  }

  private createGroup(
    logic: 'AND' | 'OR',
    children: FilterAstNode[]
  ): Extract<FilterAstNode, { kind: 'group' }> {
    return {
      kind: 'group',
      logic,
      children,
      source: 'sql',
    };
  }

  private parseValueList(): unknown[] {
    this.expect('lparen');

    const values: unknown[] = [];
    do {
      values.push(this.parseValue());
    } while (this.match('comma'));

    this.expect('rparen');
    return values;
  }

  private parseValue(): unknown {
    const token = this.peek();

    switch (token.type) {
      case 'string':
      case 'number':
        this.index += 1;
        return token.value;
      case 'param':
        this.index += 1;
        return this.resolveParam(String(token.value));
      case 'identifier':
        this.index += 1;
        return token.value;
      case 'keyword':
        if (token.value === 'TRUE' || token.value === 'FALSE') {
          this.index += 1;
          return token.value === 'TRUE';
        }

        if (token.value === 'NULL') {
          this.index += 1;
          return null;
        }
        break;
    }

    throw this.error(`Expected a literal or parameter value, received ${describeToken(token)}.`);
  }

  private resolveParam(name: string): unknown {
    if (!Object.prototype.hasOwnProperty.call(this.params, name)) {
      throw this.error(`Missing named parameter :${name}`);
    }

    return this.params[name];
  }

  private expectIdentifier(): string {
    const token = this.expect('identifier');
    return String(token.value);
  }

  private matchComparisonOperator(): string | null {
    const token = this.peek();
    if (token.type !== 'operator') {
      return null;
    }

    const operator = String(token.value);
    if (!['=', '!=', '<>', '>', '<', '>=', '<='].includes(operator)) {
      return null;
    }

    this.index += 1;
    return operator;
  }

  private expectKeyword(value: string): void {
    const token = this.peek();
    if (token.type === 'keyword' && token.value === value) {
      this.index += 1;
      return;
    }

    throw this.error(`Expected keyword ${value}, received ${describeToken(token)}.`);
  }

  private matchKeyword(value: string): boolean {
    const token = this.peek();
    if (token.type === 'keyword' && token.value === value) {
      this.index += 1;
      return true;
    }

    return false;
  }

  private expect(type: SqlTokenType): SqlToken {
    const token = this.peek();
    if (token.type !== type) {
      throw this.error(`Expected ${type}, received ${describeToken(token)}.`);
    }

    this.index += 1;
    return token;
  }

  private match(type: SqlTokenType): boolean {
    if (this.peek().type !== type) {
      return false;
    }

    this.index += 1;
    return true;
  }

  private peek(): SqlToken {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1];
  }

  private error(message: string): Error {
    return new Error(`${message} At position ${this.peek().start} in "${this.sql}".`);
  }
}

function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  let index = 0;

  while (index < sql.length) {
    const char = sql[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'lparen', value: char, start: index, end: index + 1 });
      index += 1;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'rparen', value: char, start: index, end: index + 1 });
      index += 1;
      continue;
    }

    if (char === ',') {
      tokens.push({ type: 'comma', value: char, start: index, end: index + 1 });
      index += 1;
      continue;
    }

    if (char === ':') {
      const start = index;
      index += 1;
      const nameStart = index;
      while (index < sql.length && /[A-Za-z0-9_]/.test(sql[index])) {
        index += 1;
      }

      if (nameStart === index || !/[A-Za-z_]/.test(sql[nameStart] ?? '')) {
        throw new Error(`Invalid named parameter near position ${start} in "${sql}".`);
      }

      tokens.push({
        type: 'param',
        value: sql.slice(nameStart, index),
        start,
        end: index,
      });
      continue;
    }

    if (char === "'") {
      const start = index;
      index += 1;
      let value = '';

      while (index < sql.length) {
        if (sql[index] === "'" && sql[index + 1] === "'") {
          value += "'";
          index += 2;
          continue;
        }

        if (sql[index] === "'") {
          index += 1;
          tokens.push({ type: 'string', value, start, end: index });
          value = '';
          break;
        }

        value += sql[index];
        index += 1;
      }

      if (value !== '') {
        throw new Error(`Unterminated string literal near position ${start} in "${sql}".`);
      }
      continue;
    }

    if (/[0-9]/.test(char) || (char === '-' && /[0-9]/.test(sql[index + 1] ?? ''))) {
      const start = index;
      index += 1;
      while (index < sql.length && /[0-9]/.test(sql[index])) {
        index += 1;
      }
      if (sql[index] === '.' && /[0-9]/.test(sql[index + 1] ?? '')) {
        index += 1;
        while (index < sql.length && /[0-9]/.test(sql[index])) {
          index += 1;
        }
      }

      tokens.push({
        type: 'number',
        value: Number(sql.slice(start, index)),
        start,
        end: index,
      });
      continue;
    }

    const operator = readOperator(sql, index);
    if (operator) {
      tokens.push({
        type: 'operator',
        value: operator,
        start: index,
        end: index + operator.length,
      });
      index += operator.length;
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      const start = index;
      index += 1;
      while (index < sql.length && /[A-Za-z0-9_.]/.test(sql[index])) {
        index += 1;
      }

      const raw = sql.slice(start, index);
      const upper = raw.toUpperCase();
      tokens.push({
        type: KEYWORDS.has(upper) ? 'keyword' : 'identifier',
        value: KEYWORDS.has(upper) ? upper : raw,
        start,
        end: index,
      });
      continue;
    }

    throw new Error(`Unexpected token "${char}" at position ${index} in "${sql}".`);
  }

  tokens.push({ type: 'eof', value: '', start: sql.length, end: sql.length });
  return tokens;
}

function readOperator(sql: string, index: number): string | null {
  const twoChar = sql.slice(index, index + 2);
  if (['>=', '<=', '!=', '<>'].includes(twoChar)) {
    return twoChar;
  }

  if (['=', '>', '<'].includes(sql[index])) {
    return sql[index];
  }

  return null;
}

function describeToken(token: SqlToken): string {
  if (token.type === 'eof') {
    return 'end of input';
  }

  return `${token.type}(${String(token.value)})`;
}

function countLikeWildcards(pattern: string): number {
  return Array.from(pattern).filter((char) => char === '%').length;
}

function likePatternToRegex(pattern: string): string {
  let regex = '^';

  for (const char of pattern) {
    if (char === '%') {
      regex += '.*';
      continue;
    }

    if (char === '_') {
      regex += '.';
      continue;
    }

    regex += escapeRegexChar(char);
  }

  return `${regex}$`;
}

function escapeRegexChar(char: string): string {
  return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function inferValueType(value: unknown, valueTo?: unknown): FilterAstPredicateNode['valueType'] {
  const sample = valueTo !== undefined ? valueTo : value;

  if (sample instanceof Date) {
    return 'date';
  }

  if (typeof sample === 'number') {
    return 'number';
  }

  if (typeof sample === 'boolean') {
    return 'boolean';
  }

  if (Array.isArray(sample)) {
    return 'enum';
  }

  if (typeof sample === 'string') {
    return 'text';
  }

  if (sample == null) {
    return 'unknown';
  }

  return 'custom';
}
