/**
 * SQL Filter Adapter
 *
 * Transforms field-based filters into parameterized SQL WHERE clauses.
 * Supports positional (?), named (:name), and dollar ($1) parameter styles.
 */

import type { FilterAdapter, AdapterConfig } from './adapter.interface';
import type { SQLFilterExport } from './types';
import type { FieldFilterState, FieldFilterGroup, FieldFilterCondition, StandardFilterOperator } from '../types';

/**
 * SQL parameter styles
 */
export type SQLParamStyle = 'positional' | 'named' | 'dollar';

/**
 * SQL adapter configuration
 */
export interface SQLAdapterOptions extends AdapterConfig {
  /**
   * Parameter style
   * - positional: WHERE age > ? AND status = ?
   * - named:      WHERE age > :age AND status = :status
   * - dollar:     WHERE age > $1 AND status = $2 (PostgreSQL)
   *
   * @default 'positional'
   */
  paramStyle?: SQLParamStyle;

  /**
   * Named parameter prefix
   * Only used when paramStyle is 'named'
   *
   * @default ':'
   */
  namedPrefix?: string;

  /**
   * Quote identifiers (field names)
   * - true: "age" (double quotes)
   * - false: age (no quotes)
   *
   * @default false
   */
  quoteIdentifiers?: boolean;

  /**
   * Identifier quote character
   * - '"' for PostgreSQL, SQL Server
   * - '`' for MySQL, MariaDB
   * - '[' for SQL Server (uses ]' for closing)
   *
   * @default '"'
   */
  identifierQuote?: string;

  /**
   * Case sensitivity for string operations
   * - true: Use LOWER() for case-insensitive comparisons
   * - false: Use operators as-is
   *
   * @default false
   */
  caseInsensitive?: boolean;
}

/**
 * SQL Filter Adapter
 *
 * @example Positional parameters (default)
 * ```typescript
 * const adapter = new SQLFilterAdapter({ paramStyle: 'positional' });
 * const result = adapter.transform(filterState);
 * // result.whereClause: "age > ? AND status = ?"
 * // result.positionalParams: [18, "active"]
 * ```
 *
 * @example Named parameters
 * ```typescript
 * const adapter = new SQLFilterAdapter({ paramStyle: 'named' });
 * const result = adapter.transform(filterState);
 * // result.namedSql: "age > :age AND status = :status"
 * // result.namedParams: { age: 18, status: "active" }
 * ```
 *
 * @example Dollar parameters (PostgreSQL)
 * ```typescript
 * const adapter = new SQLFilterAdapter({ paramStyle: 'dollar' });
 * const result = adapter.transform(filterState);
 * // result.whereClause: "age > $1 AND status = $2"
 * // result.positionalParams: [18, "active"]
 * ```
 */
export class SQLFilterAdapter implements FilterAdapter<SQLFilterExport> {
  readonly name = 'sql';

  private options: Required<SQLAdapterOptions>;
  private positionalParams: any[] = [];
  private namedParams: Record<string, any> = {};
  private paramCounter = 0;

  constructor(options: SQLAdapterOptions = {}) {
    this.options = {
      paramStyle: options.paramStyle ?? 'positional',
      namedPrefix: options.namedPrefix ?? ':',
      quoteIdentifiers: options.quoteIdentifiers ?? false,
      identifierQuote: options.identifierQuote ?? '"',
      caseInsensitive: options.caseInsensitive ?? false,
      customOperators: options.customOperators ?? [],
      fieldTransform: options.fieldTransform ?? ((field) => field),
      valueSerializer: options.valueSerializer ?? ((value) => value),
    };
  }

  /**
   * Transform field-based filter state to SQL format
   */
  transform(state: FieldFilterState): SQLFilterExport {
    // Reset for each transformation
    this.positionalParams = [];
    this.namedParams = {};
    this.paramCounter = 0;

    if (!state.root || state.root.conditions.length === 0) {
      return {
        whereClause: '',
        positionalParams: [],
        namedParams: {},
        namedSql: '',
      };
    }

    const whereClause = this.processGroup(state.root);

    // Build named SQL version
    const namedSql = this.buildNamedSQL(state.root);

    return {
      whereClause,
      positionalParams: this.positionalParams,
      namedParams: this.namedParams,
      namedSql,
    };
  }

  /**
   * Process a filter group
   */
  private processGroup(group: FieldFilterGroup): string {
    const clauses: string[] = [];

    // Process conditions
    for (const condition of group.conditions) {
      const clause = this.buildConditionClause(condition);
      if (clause) {
        clauses.push(clause);
      }
    }

    // Process nested groups
    if (group.groups) {
      for (const nestedGroup of group.groups) {
        const nestedClause = this.processGroup(nestedGroup);
        if (nestedClause) {
          clauses.push(`(${nestedClause})`);
        }
      }
    }

    if (clauses.length === 0) return '';

    const logic = group.logic === 'OR' ? ' OR ' : ' AND ';
    return clauses.join(logic);
  }

  /**
   * Build SQL clause for a single condition
   */
  private buildConditionClause(condition: FieldFilterCondition): string {
    const field = this.quoteField(this.options.fieldTransform(condition.field));
    const operator = condition.operator as StandardFilterOperator;

    // Handle null checks
    if (operator === 'isNull') {
      return `${field} IS NULL`;
    }
    if (operator === 'isNotNull') {
      return `${field} IS NOT NULL`;
    }

    // Handle between operator
    if (operator === 'between') {
      if (condition.valueTo === undefined) {
        console.warn(`SQL Adapter: BETWEEN operator requires valueTo for field "${condition.field}", skipping condition`);
        return '';
      }
      const param1 = this.addParam(condition.value);
      const param2 = this.addParam(condition.valueTo);
      return `${field} BETWEEN ${param1} AND ${param2}`;
    }

    // Handle IN operator
    if (operator === 'in' || operator === 'notIn') {
      const values = Array.isArray(condition.value) ? condition.value : [condition.value];

      // Handle empty arrays - IN () is always false, NOT IN () is always true
      if (values.length === 0) {
        return operator === 'in' ? '1=0' : '1=1';
      }

      const params = values.map(v => this.addParam(v));
      const operatorSQL = operator === 'in' ? 'IN' : 'NOT IN';
      return `${field} ${operatorSQL} (${params.join(', ')})`;
    }

    // Standard operators
    const sqlOperator = this.mapOperatorToSQL(operator);
    const param = this.addParam(condition.value, operator);

    // Handle case-insensitive string operations
    if (
      this.options.caseInsensitive &&
      (operator === 'contains' || operator === 'notContains' ||
       operator === 'startsWith' || operator === 'endsWith')
    ) {
      return `LOWER(${field}) ${sqlOperator} LOWER(${param})`;
    }

    return `${field} ${sqlOperator} ${param}`;
  }

  /**
   * Map standard operator to SQL operator
   */
  private mapOperatorToSQL(operator: StandardFilterOperator): string {
    const mapping: Record<StandardFilterOperator, string> = {
      eq: '=',
      neq: '!=',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
      contains: 'LIKE',
      notContains: 'NOT LIKE',
      startsWith: 'LIKE',
      endsWith: 'LIKE',
      in: 'IN',
      notIn: 'NOT IN',
      between: 'BETWEEN',
      isNull: 'IS NULL',
      isNotNull: 'IS NOT NULL',
      regex: 'REGEXP', // MySQL/PostgreSQL - may need adjustment per DB
    };

    return mapping[operator] || '=';
  }

  /**
   * Add parameter and return placeholder
   */
  private addParam(value: any, operator?: StandardFilterOperator): string {
    let serialized = this.options.valueSerializer(value);

    // Add SQL LIKE wildcards for pattern matching operators
    if (typeof serialized === 'string') {
      if (operator === 'contains') {
        serialized = `%${serialized}%`;
      } else if (operator === 'startsWith') {
        serialized = `${serialized}%`;
      } else if (operator === 'endsWith') {
        serialized = `%${serialized}`;
      } else if (operator === 'notContains') {
        serialized = `%${serialized}%`;
      }
    }

    this.paramCounter++;

    // Store in positional params
    this.positionalParams.push(serialized);

    // Store in named params
    const paramName = `param${this.paramCounter}`;
    this.namedParams[paramName] = serialized;

    // Return appropriate placeholder
    switch (this.options.paramStyle) {
      case 'named':
        return `${this.options.namedPrefix}${paramName}`;
      case 'dollar':
        return `$${this.paramCounter}`;
      case 'positional':
      default:
        return '?';
    }
  }

  /**
   * Quote field identifier
   */
  private quoteField(field: string): string {
    if (!this.options.quoteIdentifiers) {
      return field;
    }

    const quote = this.options.identifierQuote;
    const closeQuote = quote === '[' ? ']' : quote;

    return `${quote}${field}${closeQuote}`;
  }

  /**
   * Build named SQL version
   */
  private buildNamedSQL(group: FieldFilterGroup): string {
    // Temporarily switch to named style
    const originalStyle = this.options.paramStyle;
    this.options.paramStyle = 'named';

    // Reset params
    this.positionalParams = [];
    this.namedParams = {};
    this.paramCounter = 0;

    const namedSql = this.processGroup(group);

    // Restore original style
    this.options.paramStyle = originalStyle;

    return namedSql;
  }
}
