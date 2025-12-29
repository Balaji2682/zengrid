import type { ReadonlySparseMatrix } from '@zengrid/shared';
import type { DataAccessor } from './data-accessor.interface';

/**
 * DataAccessor adapter for SparseMatrix
 *
 * Provides unified access to sparse matrix data for sorting/filtering/searching.
 */
export class SparseMatrixAccessor<T = any> implements DataAccessor<T> {
  private matrix: ReadonlySparseMatrix<T>;
  private _rowCount: number;
  private _colCount: number;

  constructor(matrix: ReadonlySparseMatrix<T>, rowCount: number, colCount: number) {
    this.matrix = matrix;
    this._rowCount = rowCount;
    this._colCount = colCount;
  }

  getValue(row: number, col: number | string): T | undefined {
    if (typeof col === 'string') {
      throw new TypeError(
        'SparseMatrixAccessor requires numeric column indices, got string'
      );
    }
    return this.matrix.get(row, col);
  }

  getRow(row: number): Iterable<[number, T]> {
    const rowMap = this.matrix.getRow(row);
    // Convert Map<number, T> to array of [number, T] tuples
    return Array.from(rowMap.entries());
  }

  getColumn(col: number | string): Iterable<[number, T]> {
    if (typeof col === 'string') {
      throw new TypeError(
        'SparseMatrixAccessor requires numeric column indices, got string'
      );
    }
    const colMap = this.matrix.getColumn(col);
    // Convert Map<number, T> to array of [number, T] tuples
    return Array.from(colMap.entries());
  }

  get rowCount(): number {
    return this._rowCount;
  }

  get colCount(): number {
    return this._colCount;
  }

  getColumnIds(): ReadonlyArray<number> {
    return Array.from({ length: this._colCount }, (_, i) => i);
  }
}

/**
 * Create a DataAccessor from a SparseMatrix
 *
 * @param matrix - Sparse matrix instance
 * @param rowCount - Total number of rows (including empty rows)
 * @param colCount - Total number of columns (including empty columns)
 * @returns DataAccessor instance
 *
 * @example
 * ```typescript
 * const matrix = new SparseMatrix<number>();
 * matrix.set(0, 1, 42);
 * matrix.set(5, 3, 99);
 *
 * const accessor = createSparseMatrixAccessor(matrix, 10, 5);
 * accessor.getValue(0, 1); // 42
 * ```
 */
export function createSparseMatrixAccessor<T>(
  matrix: ReadonlySparseMatrix<T>,
  rowCount: number,
  colCount: number
): DataAccessor<T> {
  return new SparseMatrixAccessor(matrix, rowCount, colCount);
}
