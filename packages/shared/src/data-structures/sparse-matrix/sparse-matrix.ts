import type {
  SparseMatrix as ISparseMatrix,
  SparseMatrixOptions,
} from './sparse-matrix.interface';

/**
 * SparseMatrix implementation using HashMap
 *
 * Memory-efficient storage for large grids where most cells are empty.
 * Uses a Map with string keys generated from (row, col) coordinates.
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
  private data: Map<string, T>;
  private hashFn: (row: number, col: number) => string;

  constructor(options: SparseMatrixOptions = {}) {
    this.data = new Map<string, T>();
    this.hashFn = options.hashFunction ?? this.defaultHash;
  }

  /**
   * Default hash function: concatenate row and column with ':'
   */
  private defaultHash(row: number, col: number): string {
    return `${row}:${col}`;
  }

  get(row: number, col: number): T | undefined {
    return this.data.get(this.hashFn(row, col));
  }

  has(row: number, col: number): boolean {
    return this.data.has(this.hashFn(row, col));
  }

  set(row: number, col: number, value: T): void {
    // Don't store null/undefined values - treat as delete
    if (value === null || value === undefined) {
      this.delete(row, col);
      return;
    }
    this.data.set(this.hashFn(row, col), value);
  }

  delete(row: number, col: number): boolean {
    return this.data.delete(this.hashFn(row, col));
  }

  clear(): void {
    this.data.clear();
  }

  getRow(row: number): ReadonlyMap<number, T> {
    const rowData = new Map<number, T>();

    // Scan all entries for matching row
    // This is why we need a better data structure for row-wise operations
    for (const [key, value] of this.data.entries()) {
      const [r, c] = this.parseKey(key);
      if (r === row) {
        rowData.set(c, value);
      }
    }

    return rowData;
  }

  getColumn(col: number): ReadonlyMap<number, T> {
    const colData = new Map<number, T>();

    // Scan all entries for matching column
    for (const [key, value] of this.data.entries()) {
      const [r, c] = this.parseKey(key);
      if (c === col) {
        colData.set(r, value);
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
    const keysToDelete: string[] = [];

    for (const key of this.data.keys()) {
      const [r] = this.parseKey(key);
      if (r === row) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.data.delete(key);
    }

    return keysToDelete.length;
  }

  deleteColumn(col: number): number {
    const keysToDelete: string[] = [];

    for (const key of this.data.keys()) {
      const [, c] = this.parseKey(key);
      if (c === col) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.data.delete(key);
    }

    return keysToDelete.length;
  }

  get size(): number {
    return this.data.size;
  }

  *[Symbol.iterator](): IterableIterator<[number, number, T]> {
    for (const [key, value] of this.data.entries()) {
      const [row, col] = this.parseKey(key);
      yield [row, col, value];
    }
  }

  /**
   * Parse key back to (row, col) coordinates
   * Only works with default hash function
   */
  private parseKey(key: string): [number, number] {
    const [row, col] = key.split(':').map(Number);
    return [row, col];
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
