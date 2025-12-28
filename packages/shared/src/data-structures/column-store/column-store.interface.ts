/**
 * Column Store interfaces for ZenGrid
 * Column-oriented storage using typed arrays for performance
 */

/**
 * Supported column data types
 */
export type ColumnType = 'int32' | 'float64' | 'string' | 'boolean';

/**
 * Aggregation operations
 */
export type AggregateOperation = 'sum' | 'avg' | 'min' | 'max' | 'count';

/**
 * Column definition
 */
export interface ColumnDefinition {
  /** Column name/identifier */
  name: string;
  /** Data type */
  type: ColumnType;
  /** Default value for new rows */
  defaultValue?: any;
}

/**
 * Aggregation result
 */
export interface AggregationResult {
  operation: AggregateOperation;
  column: string;
  value: number;
  count: number; // Number of non-null values included
}

/**
 * Column Store interface
 *
 * Column-oriented storage for dense grid data.
 * Uses typed arrays (Float64Array, Int32Array) for numeric columns for better performance.
 */
export interface ColumnStore {
  /**
   * Add a new column
   * @param definition - Column definition
   * @complexity O(n) where n = rowCount
   */
  addColumn(definition: ColumnDefinition): void;

  /**
   * Remove a column
   * @param columnName - Column to remove
   * @returns true if column existed and was removed
   * @complexity O(1)
   */
  removeColumn(columnName: string): boolean;

  /**
   * Check if column exists
   * @param columnName - Column name
   * @complexity O(1)
   */
  hasColumn(columnName: string): boolean;

  /**
   * Get value at (row, column)
   * @param row - Row index
   * @param columnName - Column name
   * @returns Value or undefined if out of bounds
   * @complexity O(1)
   */
  getValue(row: number, columnName: string): any;

  /**
   * Set value at (row, column)
   * @param row - Row index
   * @param columnName - Column name
   * @param value - Value to set
   * @complexity O(1)
   */
  setValue(row: number, columnName: string, value: any): void;

  /**
   * Get entire row as object
   * @param row - Row index
   * @returns Object with column names as keys
   * @complexity O(c) where c = number of columns
   */
  getRow(row: number): Record<string, any>;

  /**
   * Set multiple values in a row
   * @param row - Row index
   * @param values - Object with column names and values
   * @complexity O(k) where k = Object.keys(values).length
   */
  setRow(row: number, values: Record<string, any>): void;

  /**
   * Get entire column as array
   * @param columnName - Column name
   * @returns Copy of column data
   * @complexity O(n) where n = rowCount
   */
  getColumn(columnName: string): any[];

  /**
   * Set entire column
   * @param columnName - Column name
   * @param values - Array of values (length must match rowCount)
   * @complexity O(n)
   */
  setColumn(columnName: string, values: any[]): void;

  /**
   * Perform aggregation on a column
   * @param columnName - Column to aggregate
   * @param operation - Aggregation operation
   * @returns Aggregation result
   * @complexity O(n)
   */
  aggregate(
    columnName: string,
    operation: AggregateOperation
  ): AggregationResult;

  /**
   * Add new rows (expand capacity)
   * @param count - Number of rows to add
   * @complexity O(n * c) where n = count, c = columns
   */
  addRows(count: number): void;

  /**
   * Clear all data but keep column definitions
   * @complexity O(c) where c = number of columns
   */
  clear(): void;

  /**
   * Number of rows
   */
  readonly rowCount: number;

  /**
   * Number of columns
   */
  readonly columnCount: number;

  /**
   * Column names
   */
  readonly columns: ReadonlyArray<string>;
}

/**
 * Options for creating a ColumnStore
 */
export interface ColumnStoreOptions {
  /**
   * Initial row count
   * @default 0
   */
  rowCount?: number;

  /**
   * Column definitions
   * @default []
   */
  columns?: ColumnDefinition[];

  /**
   * Whether to grow automatically when accessing rows beyond rowCount
   * @default false
   */
  autoGrow?: boolean;
}
