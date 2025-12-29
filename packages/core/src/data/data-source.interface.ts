import type { CellRef } from '../types';
import type { EventEmitter } from '../events/event-emitter';

/**
 * Data source interface
 *
 * Abstraction layer for grid data management.
 * Provides methods for CRUD operations and change tracking.
 */
export interface DataSource {
  /**
   * Get value at specific cell
   * @param row - Row index
   * @param col - Column index
   * @returns Cell value or undefined
   */
  getValue(row: number, col: number): any;

  /**
   * Set value at specific cell
   * @param row - Row index
   * @param col - Column index
   * @param value - New value
   */
  setValue(row: number, col: number, value: any): void;

  /**
   * Get all values in a row
   * @param row - Row index
   * @returns Array of values or object with column keys
   */
  getRow(row: number): any[] | Record<string, any>;

  /**
   * Get all values in a column
   * @param col - Column index
   * @returns Array of values
   */
  getColumn(col: number): any[];

  /**
   * Set data for multiple cells
   * @param data - 2D array or map of data
   */
  setData(data: any[][] | Map<string, any>): void;

  /**
   * Clear all data
   */
  clear(): void;

  /**
   * Total number of rows
   */
  readonly rowCount: number;

  /**
   * Total number of columns
   */
  readonly colCount: number;

  /**
   * Event emitter for data changes
   */
  readonly events?: EventEmitter<DataSourceEvents>;
}

/**
 * Data source events
 */
export interface DataSourceEvents {
  'change': {
    cell: CellRef;
    oldValue: any;
    newValue: any;
  };

  'bulkChange': {
    changes: Array<{
      cell: CellRef;
      oldValue: any;
      newValue: any;
    }>;
  };

  'clear': {
    timestamp: number;
  };

  'dataLoad': {
    rowCount: number;
    colCount: number;
  };
}
