/**
 * Field-Based Filter Types
 *
 * This module defines a new field-based filtering system that uses
 * field names instead of column indices, making it easier for backends
 * to consume filter parameters without complex mapping logic.
 */

/**
 * Standard filter operators
 * Short, backend-friendly identifiers that map to common database operations
 */
export type StandardFilterOperator =
  // Equality
  | 'eq'          // equals
  | 'neq'         // not equals

  // Comparison
  | 'gt'          // greater than
  | 'gte'         // greater than or equal
  | 'lt'          // less than
  | 'lte'         // less than or equal

  // String operations
  | 'contains'    // contains substring
  | 'notContains' // does not contain substring
  | 'startsWith'  // starts with
  | 'endsWith'    // ends with

  // List operations
  | 'in'          // value in array
  | 'notIn'       // value not in array
  | 'between'     // value between min and max

  // Null checks
  | 'isNull'      // is null/undefined
  | 'isNotNull'   // is not null/undefined

  // Pattern matching
  | 'regex';      // regex match

/**
 * Custom operator definition
 * Allows registration of domain-specific operators
 *
 * @example
 * ```typescript
 * const fuzzyOperator: CustomOperator = {
 *   id: 'fuzzy',
 *   label: 'Fuzzy Match',
 *   valueCount: 1,
 *   predicate: (cellValue, filterValue) => {
 *     return levenshtein(cellValue, filterValue) < 3;
 *   },
 *   sqlTemplate: "SIMILARITY(?, ?) > 0.7",
 *   graphqlKey: '_similar',
 *   restSuffix: '_fuzzy'
 * };
 * ```
 */
export interface CustomOperator {
  /**
   * Unique operator identifier
   */
  id: string;

  /**
   * Human-readable label for UI
   */
  label: string;

  /**
   * Number of values required
   * - 0: no values (e.g., isNull)
   * - 1: single value (e.g., equals, contains)
   * - 2: two values (e.g., between)
   * - 'array': array of values (e.g., in)
   */
  valueCount: 0 | 1 | 2 | 'array';

  /**
   * Frontend predicate function for filtering rows
   * @param cellValue - The value from the cell
   * @param filterValue - The filter value(s)
   * @returns true if row matches filter
   */
  predicate: (cellValue: any, filterValue: any) => boolean;

  /**
   * SQL template for backend queries
   * Use ? for value placeholders
   * @example "SIMILARITY(?, ?) > 0.7"
   */
  sqlTemplate: string;

  /**
   * GraphQL key for the operator
   * @example "_similar" for Hasura, "similar" for Prisma
   */
  graphqlKey?: string;

  /**
   * REST suffix for query params
   * @example "_fuzzy" results in "name_fuzzy=value"
   */
  restSuffix?: string;
}

/**
 * Field-based filter condition
 *
 * This is the NEW format sent to backends, using field names
 * instead of column indices.
 *
 * @example
 * ```typescript
 * // Simple condition
 * { field: 'age', operator: 'gt', value: 18 }
 *
 * // Between condition
 * { field: 'price', operator: 'between', value: 100, valueTo: 500 }
 *
 * // In condition
 * { field: 'status', operator: 'in', value: ['active', 'pending'] }
 *
 * // Null check
 * { field: 'deletedAt', operator: 'isNull' }
 * ```
 */
export interface FieldFilterCondition {
  /**
   * Field name from ColumnDef.field
   */
  field: string;

  /**
   * Filter operator
   */
  operator: StandardFilterOperator | string;

  /**
   * Filter value
   * - undefined for isNull/isNotNull
   * - single value for most operators
   * - array for 'in'/'notIn'
   */
  value?: any;

  /**
   * Secondary value for 'between' operator
   */
  valueTo?: any;
}

/**
 * Filter group with logic operator
 *
 * Allows combining multiple conditions with AND/OR logic
 * and supports nesting for complex queries.
 *
 * @example
 * ```typescript
 * // Simple AND group
 * {
 *   logic: 'AND',
 *   conditions: [
 *     { field: 'age', operator: 'gt', value: 18 },
 *     { field: 'status', operator: 'eq', value: 'active' }
 *   ]
 * }
 *
 * // Nested groups: (age > 18 AND status = 'active') OR (role = 'admin')
 * {
 *   logic: 'OR',
 *   groups: [
 *     {
 *       logic: 'AND',
 *       conditions: [
 *         { field: 'age', operator: 'gt', value: 18 },
 *         { field: 'status', operator: 'eq', value: 'active' }
 *       ]
 *     },
 *     {
 *       logic: 'AND',
 *       conditions: [
 *         { field: 'role', operator: 'eq', value: 'admin' }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
export interface FieldFilterGroup {
  /**
   * Logic operator between conditions/groups
   */
  logic: 'AND' | 'OR';

  /**
   * Filter conditions in this group
   */
  conditions: FieldFilterCondition[];

  /**
   * Nested filter groups for complex queries
   */
  groups?: FieldFilterGroup[];
}

/**
 * Complete filter state in field-based format
 *
 * This is the top-level filter state that gets exported to backends.
 *
 * @example
 * ```typescript
 * const filterState: FieldFilterState = {
 *   root: {
 *     logic: 'AND',
 *     conditions: [
 *       { field: 'age', operator: 'gt', value: 18 },
 *       { field: 'status', operator: 'eq', value: 'active' }
 *     ]
 *   },
 *   activeFields: ['age', 'status'],
 *   timestamp: Date.now()
 * };
 * ```
 */
export interface FieldFilterState {
  /**
   * Root filter group
   * null if no filters are active
   */
  root: FieldFilterGroup | null;

  /**
   * Quick access to all active field names
   * Useful for UI highlighting
   */
  activeFields: string[];

  /**
   * Timestamp of last filter change
   * Useful for caching and tracking updates
   */
  timestamp: number;
}
