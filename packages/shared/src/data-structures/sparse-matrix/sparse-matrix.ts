import type {
  SparseMatrix as ISparseMatrix,
  SparseMatrixOptions,
} from './sparse-matrix.interface';

/**
 * SparseMatrix implementation using Map of Maps
 *
 * Memory-efficient storage for large grids where most cells are empty.
 * Uses nested Maps with numeric keys for optimal performance.
 *
 * Structure: Map<row, Map<col, value>>
 * - Row operations are O(1) - direct map lookup
 * - Column operations are O(r) where r = rows with data (not total cells)
 * - Memory efficient: only allocates maps for rows that have data
 *
 * @example
 * ```typescript
 * const matrix = new SparseMatrix<string>();
 * matrix.set(0, 0, 'A1');
 * matrix.set(1000, 1000, 'B1000');
 * console.log(matrix.get(0, 0)); // 'A1'
 * console.log(matrix.size); // 2 (only stores non-empty cells)
 * ```
 */
export class SparseMatrix<T> implements ISparseMatrix<T> {
  private rows: Map<number, Map<number, T>>;
  private cellCount: number;

  constructor(_options: SparseMatrixOptions = {}) {
    // Note: initialCapacity hint is not used in Map of Maps implementation
    // Maps in JavaScript auto-resize efficiently
    this.rows = new Map<number, Map<number, T>>();
    this.cellCount = 0;
  }

  get(row: number, col: number): T | undefined {
    const rowMap = this.rows.get(row);
    return rowMap?.get(col);
  }

  has(row: number, col: number): boolean {
    const rowMap = this.rows.get(row);
    return rowMap?.has(col) ?? false;
  }

  set(row: number, col: number, value: T): void {
    // Don't store null/undefined values - treat as delete
    if (value === null || value === undefined) {
      this.delete(row, col);
      return;
    }

    // Get or create row map
    let rowMap = this.rows.get(row);
    if (!rowMap) {
      rowMap = new Map<number, T>();
      this.rows.set(row, rowMap);
    }

    // Track if this is a new cell
    const isNewCell = !rowMap.has(col);
    rowMap.set(col, value);

    if (isNewCell) {
      this.cellCount++;
    }
  }

  delete(row: number, col: number): boolean {
    const rowMap = this.rows.get(row);
    if (!rowMap) {
      return false;
    }

    const deleted = rowMap.delete(col);

    // Remove row map if empty
    if (deleted) {
      this.cellCount--;
      if (rowMap.size === 0) {
        this.rows.delete(row);
      }
    }

    return deleted;
  }

  clear(): void {
    this.rows.clear();
    this.cellCount = 0;
  }

  getRow(row: number): ReadonlyMap<number, T> {
    // O(1) - direct map lookup!
    const rowMap = this.rows.get(row);
    return rowMap ?? new Map<number, T>();
  }

  getColumn(col: number): ReadonlyMap<number, T> {
    // O(r) where r = rows with data (not total cells!)
    const colData = new Map<number, T>();

    for (const [rowIndex, rowMap] of this.rows.entries()) {
      const value = rowMap.get(col);
      if (value !== undefined) {
        colData.set(rowIndex, value);
      }
    }

    return colData;
  }

  setRow(row: number, values: Map<number, T>): void {
    for (const [col, value] of values.entries()) {
      this.set(row, col, value);
    }
  }

  deleteRow(row: number): number {
    // O(1) - direct map deletion!
    const rowMap = this.rows.get(row);
    if (!rowMap) {
      return 0;
    }

    const deletedCount = rowMap.size;
    this.rows.delete(row);
    this.cellCount -= deletedCount;

    return deletedCount;
  }

  deleteColumn(col: number): number {
    // O(r) where r = rows with data
    let deletedCount = 0;
    const rowsToDelete: number[] = [];

    for (const [rowIndex, rowMap] of this.rows.entries()) {
      if (rowMap.delete(col)) {
        deletedCount++;

        // Mark row for deletion if now empty
        if (rowMap.size === 0) {
          rowsToDelete.push(rowIndex);
        }
      }
    }

    // Clean up empty rows
    for (const rowIndex of rowsToDelete) {
      this.rows.delete(rowIndex);
    }

    this.cellCount -= deletedCount;
    return deletedCount;
  }

  get size(): number {
    return this.cellCount;
  }

  *[Symbol.iterator](): IterableIterator<[number, number, T]> {
    for (const [rowIndex, rowMap] of this.rows.entries()) {
      for (const [colIndex, value] of rowMap.entries()) {
        yield [rowIndex, colIndex, value];
      }
    }
  }

  /**
   * Convert to dense 2D array (for debugging/testing)
   * WARNING: Can be memory-intensive for large sparse matrices
   */
  toDenseArray(maxRow: number, maxCol: number, defaultValue: T): T[][] {
    const result: T[][] = Array.from({ length: maxRow + 1 }, () =>
      Array(maxCol + 1).fill(defaultValue)
    );

    for (const [row, col, value] of this) {
      if (row <= maxRow && col <= maxCol) {
        result[row][col] = value;
      }
    }

    return result;
  }
}
