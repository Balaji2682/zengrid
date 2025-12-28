/**
 * Sparse Matrix interfaces for ZenGrid
 */

/**
 * Read-only view of a sparse matrix
 */
export interface ReadonlySparseMatrix<T> {
  /**
   * Get value at position (row, col)
   * @param row - Row index
   * @param col - Column index
   * @returns Value at position or undefined if not set
   * @complexity O(1)
   */
  get(row: number, col: number): T | undefined;

  /**
   * Check if a value exists at position (row, col)
   * @param row - Row index
   * @param col - Column index
   * @returns true if value exists
   * @complexity O(1)
   */
  has(row: number, col: number): boolean;

  /**
   * Get all values in a row
   * @param row - Row index
   * @returns Map of column index to value
   * @complexity O(k) where k = number of values in row
   */
  getRow(row: number): ReadonlyMap<number, T>;

  /**
   * Get all values in a column
   * @param col - Column index
   * @returns Map of row index to value
   * @complexity O(n) where n = total number of values (needs full scan)
   */
  getColumn(col: number): ReadonlyMap<number, T>;

  /**
   * Number of non-empty cells
   */
  readonly size: number;

  /**
   * Iterate over all (row, col, value) tuples
   */
  [Symbol.iterator](): IterableIterator<[number, number, T]>;
}

/**
 * Mutable sparse matrix interface
 */
export interface SparseMatrix<T> extends ReadonlySparseMatrix<T> {
  /**
   * Set value at position (row, col)
   * @param row - Row index
   * @param col - Column index
   * @param value - Value to set
   * @complexity O(1)
   */
  set(row: number, col: number, value: T): void;

  /**
   * Delete value at position (row, col)
   * @param row - Row index
   * @param col - Column index
   * @returns true if value was deleted
   * @complexity O(1)
   */
  delete(row: number, col: number): boolean;

  /**
   * Clear all values
   * @complexity O(1)
   */
  clear(): void;

  /**
   * Set multiple values in a row
   * @param row - Row index
   * @param values - Map of column index to value
   * @complexity O(k) where k = values.size
   */
  setRow(row: number, values: Map<number, T>): void;

  /**
   * Delete entire row
   * @param row - Row index
   * @returns Number of cells deleted
   * @complexity O(k) where k = number of values in row
   */
  deleteRow(row: number): number;

  /**
   * Delete entire column
   * @param col - Column index
   * @returns Number of cells deleted
   * @complexity O(n) where n = total number of values
   */
  deleteColumn(col: number): number;
}

/**
 * Options for creating a sparse matrix
 */
export interface SparseMatrixOptions {
  /**
   * Initial capacity (number of expected non-empty cells)
   * @default 16
   */
  initialCapacity?: number;

  /**
   * Custom hash function for generating keys from (row, col)
   * @default (row, col) => `${row}:${col}`
   */
  hashFunction?: (row: number, col: number) => string;
}
