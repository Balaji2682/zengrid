/**
 * Abstraction layer for accessing grid data from different sources
 *
 * Enables sorting/filtering/searching to work with any data structure
 * (SparseMatrix, ColumnStore, or plain arrays).
 */
export interface DataAccessor<T = any> {
  /**
   * Get value at specific cell
   * @param row - Row index
   * @param col - Column identifier (number for SparseMatrix, string for ColumnStore)
   * @returns Cell value or undefined if not present
   */
  getValue(row: number, col: number | string): T | undefined;

  /**
   * Get all values in a row
   * @param row - Row index
   * @returns Iterable of [column, value] pairs
   */
  getRow(row: number): Iterable<[number | string, T]>;

  /**
   * Get all values in a column
   * @param col - Column identifier
   * @returns Iterable of [row, value] pairs
   */
  getColumn(col: number | string): Iterable<[number, T]>;

  /**
   * Total number of rows in data source
   */
  readonly rowCount: number;

  /**
   * Total number of columns
   */
  readonly colCount: number;

  /**
   * Get list of column identifiers
   * @returns Array of column identifiers (numbers or strings)
   */
  getColumnIds(): ReadonlyArray<number | string>;
}
