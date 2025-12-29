import type { ColumnStore as IColumnStore } from '@zengrid/shared';
import type { DataAccessor } from './data-accessor.interface';

/**
 * DataAccessor adapter for ColumnStore
 *
 * Provides unified access to column-oriented data for sorting/filtering/searching.
 */
export class ColumnStoreAccessor implements DataAccessor<any> {
  private store: IColumnStore;

  constructor(store: IColumnStore) {
    this.store = store;
  }

  getValue(row: number, col: number | string): any | undefined {
    if (typeof col === 'number') {
      // Convert numeric index to column name
      const columnName = this.store.columns[col];
      if (!columnName) {
        return undefined;
      }
      return this.store.getValue(row, columnName);
    }
    return this.store.getValue(row, col);
  }

  getRow(row: number): Iterable<[string, any]> {
    const rowData = this.store.getRow(row);
    // Convert Record<string, any> to array of [string, any] tuples
    return Object.entries(rowData);
  }

  getColumn(col: number | string): Iterable<[number, any]> {
    const columnName = typeof col === 'number' ? this.store.columns[col] : col;
    if (!columnName) {
      return [];
    }

    const columnData = this.store.getColumn(columnName);
    // Convert array to [rowIndex, value] tuples
    return columnData.map((value, rowIndex) => [rowIndex, value]);
  }

  get rowCount(): number {
    return this.store.rowCount;
  }

  get colCount(): number {
    return this.store.columnCount;
  }

  getColumnIds(): ReadonlyArray<string> {
    return this.store.columns;
  }
}

/**
 * Create a DataAccessor from a ColumnStore
 *
 * @param store - ColumnStore instance
 * @returns DataAccessor instance
 *
 * @example
 * ```typescript
 * const store = new ColumnStore({
 *   rowCount: 100,
 *   columns: [
 *     { name: 'id', type: 'int32' },
 *     { name: 'name', type: 'string' },
 *     { name: 'price', type: 'float64' }
 *   ]
 * });
 *
 * const accessor = createColumnStoreAccessor(store);
 * accessor.getValue(0, 'name'); // Get by column name
 * accessor.getValue(0, 1); // Get by column index
 * ```
 */
export function createColumnStoreAccessor(
  store: IColumnStore
): DataAccessor<any> {
  return new ColumnStoreAccessor(store);
}
