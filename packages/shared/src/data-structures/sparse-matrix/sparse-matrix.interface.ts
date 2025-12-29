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
   * @complexity O(1) - direct map lookup
   */
  getRow(row: number): ReadonlyMap<number, T>;

  /**
   * Get all values in a column
   * @param col - Column index
   * @returns Map of row index to value
   * @complexity O(r) where r = number of rows with data (not total cells)
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
   * @complexity O(1) - direct map deletion
   */
  deleteRow(row: number): number;

  /**
   * Delete entire column
   * @param col - Column index
   * @returns Number of cells deleted
   * @complexity O(r) where r = number of rows with data
   */
  deleteColumn(col: number): number;
}

/**
 * Options for creating a sparse matrix
 */
export interface SparseMatrixOptions {
  /**
   * Initial capacity (number of expected rows with data)
   * Hint for Map pre-allocation to reduce resizing
   * @default 16
   */
  initialCapacity?: number;
}
