/**
 * Filter types
 */

import type { FilterExportResult } from '../features/filtering/adapters/types';
import type { FieldFilterState, StandardFilterOperator } from '../features/filtering/types';

/**
 * Filter operator types
 */
export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'blank'
  | 'notBlank'
  | 'between'
  | 'in'
  | 'notIn'
  | 'regex';

/**
 * Filter condition
 */
export interface FilterCondition {
  operator: FilterOperator;
  value?: any;
}

/**
 * Filter model for a column
 */
export interface FilterModel {
  column: number;
  conditions: FilterCondition[];
  logic?: 'AND' | 'OR';
}

/**
 * Quick filter state shared across frontend/backend request paths
 */
export interface FilterQuickState {
  query: string;
  columns: number[] | null;
}

/**
 * SQL-like filter query with parameterization
 * Supports cleaner syntax than FilterModel for complex queries
 */
export interface FilterQuery {
  sql: string;
  params?: Record<string, any>;
}

/**
 * Canonical value classification for AST predicates.
 */
export type FilterValueType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'enum'
  | 'custom'
  | 'unknown';

/**
 * Shared target reference for AST predicates and search nodes.
 *
 * The long-term canonical key is `field`, but `column` remains available
 * for compatibility with existing index-based APIs.
 */
export type FilterAstTarget =
  | {
      field: string;
      column?: number;
      columnId?: string;
    }
  | {
      field?: string;
      column: number;
      columnId?: string;
    }
  | {
      field?: string;
      column?: number;
      columnId: string;
    };

/**
 * Base metadata shared across AST nodes.
 */
export interface FilterAstBaseNode {
  source?: 'model' | 'field' | 'quickFilter' | 'sql' | 'api';
}

/**
 * Group node for boolean composition.
 */
export interface FilterAstGroupNode extends FilterAstBaseNode {
  kind: 'group';
  logic: 'AND' | 'OR';
  children: FilterAstNode[];
}

/**
 * Predicate node for field/column constraints.
 */
export interface FilterAstPredicateNode extends FilterAstBaseNode {
  kind: 'predicate';
  target: FilterAstTarget;
  operator: StandardFilterOperator | string;
  value?: any;
  valueTo?: any;
  valueType?: FilterValueType;
  sourceOperator?: FilterOperator | string;
}

/**
 * Search node for global or scoped quick-filter semantics.
 */
export interface FilterAstSearchNode extends FilterAstBaseNode {
  kind: 'search';
  query: string;
  targets?: FilterAstTarget[] | null;
}

/**
 * NOT node for future advanced filtering support.
 */
export interface FilterAstNotNode extends FilterAstBaseNode {
  kind: 'not';
  child: FilterAstNode;
}

/**
 * Filter AST node union.
 */
export type FilterAstNode =
  | FilterAstGroupNode
  | FilterAstPredicateNode
  | FilterAstSearchNode
  | FilterAstNotNode;

/**
 * Canonical filter AST envelope.
 */
export interface FilterAst {
  version: 1;
  root: FilterAstGroupNode | null;
}

/**
 * Parsed filter expression shared by backend callbacks and backend data requests.
 */
export interface FilterExpression {
  /**
   * Canonical typed filter AST.
   */
  ast?: FilterAst | null;

  /**
   * Type of filter input.
   */
  type: 'sql' | 'model';

  /**
   * Original SQL query (if type is 'sql').
   */
  sql?: string;

  /**
   * Bound SQL converted to positional placeholders (if type is 'sql').
   */
  boundSql?: string;

  /**
   * Parameters array for positional binding.
   */
  params?: any[];

  /**
   * Column-based filter models.
   */
  models?: FilterModel[];

  /**
   * Quick filter state applied alongside column filters.
   */
  quickFilter?: FilterQuickState;

  /**
   * Field-based filter state for backend-friendly consumption.
   */
  fieldState?: FieldFilterState | null;

  /**
   * Pre-computed backend exports (REST / GraphQL / SQL).
   */
  filterExport?: FilterExportResult | null;
}
