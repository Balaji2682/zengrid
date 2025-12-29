import type { DataAccessor } from './data-accessor.interface';

/**
 * DataAccessor adapter for 2D arrays
 *
 * Provides unified access to array-based data for sorting/filtering/searching.
 */
export class ArrayAccessor<T = any> implements DataAccessor<T> {
  private data: ReadonlyArray<ReadonlyArray<T>>;
  private _colCount: number;

  constructor(data: T[][]) {
    this.data = data;
    this._colCount = data.length > 0 ? data[0].length : 0;
  }

  getValue(row: number, col: number | string): T | undefined {
    if (typeof col === 'string') {
      throw new TypeError(
        'ArrayAccessor requires numeric column indices, got string'
      );
    }

    if (row < 0 || row >= this.data.length) {
      return undefined;
    }

    const rowData = this.data[row];
    if (!rowData || col < 0 || col >= rowData.length) {
      return undefined;
    }

    return rowData[col];
  }

  getRow(row: number): Iterable<[number, T]> {
    if (row < 0 || row >= this.data.length) {
      return [];
    }

    const rowData = this.data[row];
    if (!rowData) {
      return [];
    }

    // Convert array to [columnIndex, value] tuples
    return rowData.map((value, colIndex) => [colIndex, value]);
  }

  getColumn(col: number | string): Iterable<[number, T]> {
    if (typeof col === 'string') {
      throw new TypeError(
        'ArrayAccessor requires numeric column indices, got string'
      );
    }

    if (col < 0 || col >= this._colCount) {
      return [];
    }

    // Extract column values from all rows
    const columnData: [number, T][] = [];
    for (let rowIndex = 0; rowIndex < this.data.length; rowIndex++) {
      const rowData = this.data[rowIndex];
      if (rowData && col < rowData.length) {
        columnData.push([rowIndex, rowData[col]]);
      }
    }

    return columnData;
  }

  get rowCount(): number {
    return this.data.length;
  }

  get colCount(): number {
    return this._colCount;
  }

  getColumnIds(): ReadonlyArray<number> {
    return Array.from({ length: this._colCount }, (_, i) => i);
  }
}

/**
 * Create a DataAccessor from a 2D array
 *
 * @param data - 2D array of data
 * @returns DataAccessor instance
 *
 * @example
 * ```typescript
 * const data = [
 *   ['Alice', 25, true],
 *   ['Bob', 30, false],
 *   ['Charlie', 35, true]
 * ];
 *
 * const accessor = createArrayAccessor(data);
 * accessor.getValue(0, 0); // 'Alice'
 * accessor.getValue(1, 1); // 30
 * ```
 */
export function createArrayAccessor<T>(data: T[][]): DataAccessor<T> {
  return new ArrayAccessor(data);
}
