import type {
  ColumnDef,
  FilterAst,
  FilterAstNode,
  FilterAstPredicateNode,
  FilterAstSearchNode,
  FilterAstTarget,
  FilterCondition,
  FilterOperator,
} from '../../types';
import { toInternalFilterOperator } from './filter-ast';
import { FilterCompiler } from './filter-compiler';

export type FilterAstRowPredicate = (row: number) => boolean;

export interface FilterAstCompilerOptions {
  colCount: number;
  getValue: (row: number, col: number) => any;
  columns?: ColumnDef[];
}

export interface CompiledFilterAstResult {
  predicate: FilterAstRowPredicate | null;
  complete: boolean;
  warnings: string[];
}

const SUPPORTED_FILTER_OPERATORS = new Set<FilterOperator>([
  'equals',
  'notEquals',
  'contains',
  'notContains',
  'startsWith',
  'endsWith',
  'greaterThan',
  'lessThan',
  'greaterThanOrEqual',
  'lessThanOrEqual',
  'blank',
  'notBlank',
  'between',
  'in',
  'notIn',
  'regex',
]);

/**
 * Compiles canonical filter AST nodes into row predicates for frontend execution.
 */
export class FilterAstCompiler {
  private readonly colCount: number;
  private readonly getValue: (row: number, col: number) => any;
  private readonly fieldToColumn: Map<string, number>;
  private readonly conditionCompiler = new FilterCompiler();

  constructor(options: FilterAstCompilerOptions) {
    this.colCount = options.colCount;
    this.getValue = options.getValue;
    this.fieldToColumn = new Map();

    options.columns?.forEach((column, index) => {
      if (column.field) {
        this.fieldToColumn.set(column.field, index);
      }
    });
  }

  compile(ast: FilterAst | null | undefined): CompiledFilterAstResult {
    const warnings: string[] = [];

    if (!ast?.root) {
      return {
        predicate: null,
        complete: true,
        warnings,
      };
    }

    const predicate = this.compileNode(ast.root, warnings);

    return {
      predicate,
      complete: predicate !== null && warnings.length === 0,
      warnings: dedupeWarnings(warnings),
    };
  }

  private compileNode(node: FilterAstNode, warnings: string[]): FilterAstRowPredicate | null {
    switch (node.kind) {
      case 'group': {
        const children = node.children.map((child) => this.compileNode(child, warnings));
        if (children.some((child) => child === null)) {
          return null;
        }

        const predicates = children as FilterAstRowPredicate[];
        if (predicates.length === 0) {
          return () => true;
        }

        if (node.logic === 'AND') {
          return (row: number) => predicates.every((predicate) => predicate(row));
        }

        return (row: number) => predicates.some((predicate) => predicate(row));
      }

      case 'predicate':
        return this.compilePredicateNode(node, warnings);

      case 'search':
        return this.compileSearchNode(node, warnings);

      case 'not': {
        const child = this.compileNode(node.child, warnings);
        if (!child) {
          return null;
        }

        return (row: number) => !child(row);
      }
    }
  }

  private compilePredicateNode(
    node: FilterAstPredicateNode,
    warnings: string[]
  ): FilterAstRowPredicate | null {
    const column = this.resolveColumn(node.target);
    if (column === undefined) {
      warnings.push('AST predicate target is missing a column reference for frontend execution.');
      return null;
    }

    const condition = this.toFilterCondition(node, warnings);
    if (!condition) {
      return null;
    }

    const predicate = this.conditionCompiler.compile(condition);
    return (row: number) => predicate(this.getValue(row, column));
  }

  private compileSearchNode(
    node: FilterAstSearchNode,
    warnings: string[]
  ): FilterAstRowPredicate | null {
    const query = node.query.trim().toLowerCase();
    if (!query) {
      return () => true;
    }

    const columns = this.resolveSearchColumns(node.targets, warnings);
    if (!columns || columns.length === 0) {
      return null;
    }

    const requiresJoinedSearch = /\s/.test(query);

    if (!requiresJoinedSearch) {
      return (row: number) => {
        for (const column of columns) {
          const value = this.getValue(row, column);
          if (
            value !== undefined &&
            value !== null &&
            String(value).toLowerCase().includes(query)
          ) {
            return true;
          }
        }

        return false;
      };
    }

    return (row: number) => {
      let searchableText = '';

      for (const column of columns) {
        const value = this.getValue(row, column);
        if (value !== undefined && value !== null) {
          const normalized = String(value).toLowerCase();
          if (normalized.includes(query)) {
            return true;
          }

          searchableText = searchableText ? `${searchableText} ${normalized}` : normalized;
        }
      }

      return searchableText.includes(query);
    };
  }

  private resolveSearchColumns(
    targets: FilterAstTarget[] | null | undefined,
    warnings: string[]
  ): number[] | null {
    if (!targets || targets.length === 0) {
      return Array.from({ length: this.colCount }, (_, index) => index);
    }

    const columns: number[] = [];
    const seenColumns = new Set<number>();
    for (const target of targets) {
      const column = this.resolveColumn(target);
      if (column === undefined) {
        warnings.push('AST search target is missing a column reference for frontend execution.');
        return null;
      }

      if (!seenColumns.has(column)) {
        seenColumns.add(column);
        columns.push(column);
      }
    }

    return columns;
  }

  private resolveColumn(target: FilterAstTarget): number | undefined {
    if (typeof target.column === 'number') {
      return target.column;
    }

    if (!target.field) {
      return undefined;
    }

    return this.fieldToColumn.get(target.field);
  }

  private toFilterCondition(
    node: FilterAstPredicateNode,
    warnings: string[]
  ): FilterCondition | null {
    const sourceOperator =
      typeof node.sourceOperator === 'string' && isSupportedFilterOperator(node.sourceOperator)
        ? node.sourceOperator
        : undefined;
    const operator = sourceOperator ?? toInternalFilterOperator(node.operator);

    if (!operator) {
      warnings.push(
        `AST predicate operator "${node.operator}" is not supported by frontend execution.`
      );
      return null;
    }

    switch (operator) {
      case 'between':
        if (node.valueTo === undefined) {
          warnings.push(
            'BETWEEN predicates require both value and valueTo for frontend execution.'
          );
          return null;
        }
        return {
          operator,
          value: [node.value, node.valueTo],
        };

      case 'blank':
      case 'notBlank':
        return { operator };

      default:
        return {
          operator,
          value: node.value,
        };
    }
  }
}

function isSupportedFilterOperator(value: string): value is FilterOperator {
  return SUPPORTED_FILTER_OPERATORS.has(value as FilterOperator);
}

function dedupeWarnings(warnings: string[]): string[] {
  return Array.from(new Set(warnings));
}
