import type { DataSource, DataSourceEvents } from './data-source.interface';
import type { CellRef } from '../types';
import { SparseMatrix } from '@zengrid/shared/data-structures/sparse-matrix';
import { ColumnStore } from '@zengrid/shared/data-structures/column-store';
import { EventEmitter } from '../events/event-emitter';

/**
 * Grid data model options
 */
export interface GridDataModelOptions {
  /**
   * Initial row count
   */
  rowCount: number;

  /**
   * Initial column count
   */
  colCount: number;

  /**
   * Storage strategy: 'sparse' (SparseMatrix) or 'columnar' (ColumnStore)
   * @default 'sparse'
   */
  storage?: 'sparse' | 'columnar';

  /**
   * Enable change tracking and events
   * @default true
   */
  enableEvents?: boolean;

  /**
   * Column definitions (required for columnar storage)
   */
  columns?: Array<{
    name: string;
    type: 'number' | 'string' | 'boolean';
  }>;
}

/**
 * GridDataModel - Main data model for grid
 *
 * Provides a unified interface over SparseMatrix and ColumnStore.
 * Supports change tracking, events, and efficient data access.
 *
 * @example
 * ```typescript
 * // Sparse storage (default)
 * const model = new GridDataModel({
 *   rowCount: 100000,
 *   colCount: 10,
 * });
 *
 * model.setValue(0, 0, 'Hello');
 * const value = model.getValue(0, 0); // 'Hello'
 *
 * // Columnar storage
 * const columnarModel = new GridDataModel({
 *   rowCount: 100000,
 *   colCount: 3,
 *   storage: 'columnar',
 *   columns: [
 *     { name: 'id', type: 'number' },
 *     { name: 'name', type: 'string' },
 *     { name: 'active', type: 'boolean' },
 *   ],
 * });
 * ```
 */
export class GridDataModel implements DataSource {
  private rows: number;
  private cols: number;
  private storage: 'sparse' | 'columnar';
  private sparseData: SparseMatrix<any> | null = null;
  private columnarData: ColumnStore | null = null;
  private columnNames: string[] = []; // Maps column index to column name
  private emitter: EventEmitter<DataSourceEvents> | null = null;

  constructor(options: GridDataModelOptions) {
    this.rows = options.rowCount;
    this.cols = options.colCount;
    this.storage = options.storage ?? 'sparse';

    // Initialize event emitter
    if (options.enableEvents !== false) {
      this.emitter = new EventEmitter<DataSourceEvents>();
    }

    // Initialize storage
    if (this.storage === 'sparse') {
      this.sparseData = new SparseMatrix<any>();
    } else {
      if (!options.columns) {
        throw new Error('Column definitions required for columnar storage');
      }

      this.columnNames = options.columns.map((col) => col.name);
      this.columnarData = new ColumnStore({
        columns: options.columns.map((col) => ({
          name: col.name,
          type: col.type === 'number' ? 'float64' : col.type,
        })),
        rowCount: options.rowCount,
      });
    }
  }

  getValue(row: number, col: number): any {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return undefined;
    }

    if (this.storage === 'sparse') {
      return this.sparseData!.get(row, col);
    } else {
      const columnName = this.columnNames[col];
      if (!columnName) {
        return undefined;
      }
      return this.columnarData!.getValue(row, columnName);
    }
  }

  setValue(row: number, col: number, value: any): void {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      throw new RangeError(`Cell (${row}, ${col}) out of bounds`);
    }

    const oldValue = this.getValue(row, col);

    if (this.storage === 'sparse') {
      if (value === undefined || value === null) {
        this.sparseData!.delete(row, col);
      } else {
        this.sparseData!.set(row, col, value);
      }
    } else {
      const columnName = this.columnNames[col];
      if (columnName) {
        this.columnarData!.setValue(row, columnName, value);
      }
    }

    // Emit change event
    if (this.emitter && oldValue !== value) {
      this.emitter.emit('change', {
        cell: { row, col },
        oldValue,
        newValue: value,
      });
    }
  }

  getRow(row: number): any[] | Record<string, any> {
    if (row < 0 || row >= this.rows) {
      return [];
    }

    if (this.storage === 'sparse') {
      const rowData: any[] = new Array(this.cols);
      const rowMap = this.sparseData!.getRow(row);

      for (const [col, value] of rowMap) {
        rowData[col] = value;
      }

      return rowData;
    } else {
      return this.columnarData!.getRow(row);
    }
  }

  getColumn(col: number): any[] {
    if (col < 0 || col >= this.cols) {
      return [];
    }

    if (this.storage === 'sparse') {
      const colData: any[] = new Array(this.rows);
      const colMap = this.sparseData!.getColumn(col);

      for (const [row, value] of colMap) {
        colData[row] = value;
      }

      return colData;
    } else {
      const columnName = this.columnNames[col];
      if (!columnName) {
        return new Array(this.rows).fill(undefined);
      }
      const colData: any[] = [];
      for (let row = 0; row < this.rows; row++) {
        colData.push(this.columnarData!.getValue(row, columnName));
      }
      return colData;
    }
  }

  setData(data: any[][] | Map<string, any>): void {
    // Track changes for bulk event
    const changes: Array<{ cell: CellRef; oldValue: any; newValue: any }> = [];

    if (Array.isArray(data)) {
      // 2D array
      for (let row = 0; row < Math.min(data.length, this.rows); row++) {
        const rowData = data[row];
        for (let col = 0; col < Math.min(rowData.length, this.cols); col++) {
          const oldValue = this.getValue(row, col);
          const newValue = rowData[col];

          if (oldValue !== newValue) {
            if (this.storage === 'sparse') {
              if (newValue === undefined || newValue === null) {
                this.sparseData!.delete(row, col);
              } else {
                this.sparseData!.set(row, col, newValue);
              }
            } else {
              const columnName = this.columnNames[col];
              if (columnName) {
                this.columnarData!.setValue(row, columnName, newValue);
              }
            }

            changes.push({
              cell: { row, col },
              oldValue,
              newValue,
            });
          }
        }
      }
    } else if (data instanceof Map) {
      // Map format (for sparse data)
      for (const [key, value] of data) {
        const parts = key.split(',');
        const row = parseInt(parts[0], 10);
        const col = parseInt(parts[1], 10);

        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
          const oldValue = this.getValue(row, col);

          if (oldValue !== value) {
            this.setValue(row, col, value);
            changes.push({
              cell: { row, col },
              oldValue,
              newValue: value,
            });
          }
        }
      }
    }

    // Emit bulk change event
    if (this.emitter && changes.length > 0) {
      this.emitter.emit('bulkChange', { changes });
      this.emitter.emit('dataLoad', {
        rowCount: this.rows,
        colCount: this.cols,
      });
    }
  }

  clear(): void {
    if (this.storage === 'sparse') {
      this.sparseData!.clear();
    } else {
      this.columnarData!.clear();
    }

    if (this.emitter) {
      this.emitter.emit('clear', { timestamp: Date.now() });
    }
  }

  get rowCount(): number {
    return this.rows;
  }

  get colCount(): number {
    return this.cols;
  }

  get events(): EventEmitter<DataSourceEvents> | undefined {
    return this.emitter ?? undefined;
  }

  /**
   * Get storage type
   */
  getStorageType(): 'sparse' | 'columnar' {
    return this.storage;
  }

  /**
   * Get underlying storage instance
   */
  getStorage(): SparseMatrix<any> | ColumnStore {
    if (this.storage === 'sparse') {
      return this.sparseData!;
    } else {
      return this.columnarData!;
    }
  }

  /**
   * Check if cell has value
   * @param row - Row index
   * @param col - Column index
   */
  hasValue(row: number, col: number): boolean {
    if (this.storage === 'sparse') {
      return this.sparseData!.has(row, col);
    } else {
      const columnName = this.columnNames[col];
      if (!columnName) {
        return false;
      }
      const value = this.columnarData!.getValue(row, columnName);
      return value !== undefined && value !== null;
    }
  }

  /**
   * Get count of non-empty cells
   */
  getCellCount(): number {
    if (this.storage === 'sparse') {
      return this.sparseData!.size;
    } else {
      let count = 0;
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          if (this.hasValue(row, col)) {
            count++;
          }
        }
      }
      return count;
    }
  }
}
