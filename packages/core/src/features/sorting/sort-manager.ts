import { timsortIndices } from '@zengrid/shared';
import type { SortState, SortDirection } from '../../types';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import { createIndexMap, type IndexMap } from '../../data/index-map';
import { normalizeSortState } from './sort-request';
import { SingleColumnSorter } from './single-column-sorter';

/**
 * Sort manager options
 */
export interface SortManagerOptions {
  /**
   * Total row count
   */
  rowCount: number;

  /**
   * Event emitter for grid events
   */
  events?: EventEmitter<GridEvents>;

  /**
   * Callback to get cell value
   */
  getValue: (row: number, col: number) => any;

  /**
   * Enable multi-column sorting
   * @default false
   */
  enableMultiSort?: boolean;

  /**
   * Initial sort state
   */
  initialSort?: SortState[];
}

/**
 * SortManager - Manages sorting state and execution
 *
 * Coordinates sorting across columns and maintains sort state.
 * Generates index maps for sorted data.
 *
 * @example
 * ```typescript
 * const sortManager = new SortManager({
 *   rowCount: 1000,
 *   getValue: (row, col) => data[row][col],
 * });
 *
 * // Toggle sort on column
 * sortManager.toggleSort(0);
 *
 * // Get sorted index map
 * const indexMap = sortManager.getIndexMap();
 *
 * // Get value from sorted position
 * const sortedRow = indexMap.getRowAt(0); // First row in sorted order
 * const value = getValue(sortedRow, 0);
 * ```
 */
export class SortManager {
  private rowCount: number;
  private events?: EventEmitter<GridEvents>;
  private getValue: (row: number, col: number) => any;
  private enableMultiSort: boolean;
  private sortState: SortState[] = [];
  private indexMap: IndexMap | null = null;

  constructor(options: SortManagerOptions) {
    this.rowCount = options.rowCount;
    this.events = options.events;
    this.getValue = options.getValue;
    this.enableMultiSort = options.enableMultiSort ?? false;

    if (options.initialSort) {
      this.sortState = normalizeSortState(options.initialSort);
      this.executeSort();
    }
  }

  /**
   * Toggle sort on a column
   * @param column - Column index
   * @param additive - Add to existing sorts (for multi-column)
   */
  toggleSort(column: number, additive: boolean = false): void {
    const previousState = [...this.sortState];

    if (!this.enableMultiSort || !additive) {
      // Single column sort - clear others
      const existing = this.sortState.find((s) => s.column === column);

      if (existing) {
        // Cycle: asc -> desc -> null
        if (existing.direction === 'asc') {
          existing.direction = 'desc';
        } else if (existing.direction === 'desc') {
          // Remove sort
          this.sortState = [];
        }
      } else {
        // New sort
        this.sortState = [
          {
            column,
            direction: 'asc',
          },
        ];
      }
    } else {
      // Multi-column sort
      const existingIndex = this.sortState.findIndex((s) => s.column === column);

      if (existingIndex >= 0) {
        const existing = this.sortState[existingIndex];

        // Cycle: asc -> desc -> remove
        if (existing.direction === 'asc') {
          existing.direction = 'desc';
        } else {
          this.sortState.splice(existingIndex, 1);
        }
      } else {
        // Add new sort
        this.sortState.push({
          column,
          direction: 'asc',
          sortIndex: this.sortState.length,
        });
      }
    }

    this.sortState = normalizeSortState(this.sortState);

    // Execute sort
    this.executeSort();

    // Emit event
    if (this.events) {
      this.events.emit('sort:change', {
        sortState: this.sortState,
        previousSortState: previousState,
      });
    }
  }

  /**
   * Set sort state directly
   * @param sortState - Array of sort states
   */
  setSortState(sortState: SortState[]): void {
    const previousState = [...this.sortState];
    this.sortState = normalizeSortState(sortState);

    this.executeSort();

    if (this.events) {
      this.events.emit('sort:change', {
        sortState: this.sortState,
        previousSortState: previousState,
      });
    }
  }

  /**
   * Clear all sorting
   */
  clearSort(): void {
    const previousState = [...this.sortState];
    this.sortState = [];
    this.indexMap = null;

    if (this.events) {
      this.events.emit('sort:change', {
        sortState: [],
        previousSortState: previousState,
      });
    }
  }

  /**
   * Get current sort state
   */
  getSortState(): SortState[] {
    return [...this.sortState];
  }

  /**
   * Get sort direction for a column
   * @param column - Column index
   * @returns Sort direction or null
   */
  getColumnSort(column: number): SortDirection {
    const state = this.sortState.find((s) => s.column === column);
    return state?.direction ?? null;
  }

  /**
   * Check if any sorting is active
   */
  isSorted(): boolean {
    return this.sortState.length > 0;
  }

  /**
   * Get the sorted index map
   * @returns Index map or null if no sorting
   */
  getIndexMap(): IndexMap | null {
    return this.indexMap;
  }

  /**
   * Execute the sort
   */
  private executeSort(): void {
    if (this.sortState.length === 0) {
      // No sorting - use identity map
      this.indexMap = null;
      return;
    }

    // Emit before-sort event
    if (this.events) {
      let cancelled = false;
      this.events.emit('sort:beforeSort', {
        sortState: this.sortState,
        cancel: () => {
          cancelled = true;
        },
      });

      if (cancelled) return;
    }

    if (this.sortState.length === 1) {
      const primarySort = this.sortState[0];
      const sorter = new SingleColumnSorter();

      const accessor = {
        getValue: this.getValue,
        getRow: (row: number) => {
          const values: [number, any][] = [];
          values.push([primarySort.column, this.getValue(row, primarySort.column)]);
          return values;
        },
        getColumn: (col: number) => {
          const values: [number, any][] = [];
          for (let row = 0; row < this.rowCount; row++) {
            values.push([row, this.getValue(row, col)]);
          }
          return values;
        },
        rowCount: this.rowCount,
        colCount: 1,
        getColumnIds: () => [primarySort.column],
      };

      this.indexMap = sorter.sort(accessor, primarySort.column, {
        direction: primarySort.direction!,
        nullPosition: 'last',
        caseSensitive: true,
      });
    } else {
      this.indexMap = this.sortMultipleColumns(this.sortState);
    }

    // Emit after-sort event
    if (this.events) {
      this.events.emit('sort:afterSort', {
        sortState: this.sortState,
        rowsAffected: this.rowCount,
      });
    }
  }

  private sortMultipleColumns(sortState: SortState[]): IndexMap {
    const indices = Array.from({ length: this.rowCount }, (_, index) => index);

    timsortIndices(indices, (row) => row, (rowA, rowB) => this.compareRows(rowA, rowB, sortState));

    return createIndexMap(indices);
  }

  private compareRows(rowA: number, rowB: number, sortState: SortState[]): number {
    for (const sort of sortState) {
      if (!sort.direction) {
        continue;
      }

      const valueA = this.getValue(rowA, sort.column);
      const valueB = this.getValue(rowB, sort.column);
      const comparison = this.compareValues(valueA, valueB, true);

      if (comparison !== 0) {
        return sort.direction === 'asc' ? comparison : -comparison;
      }
    }

    return 0;
  }

  private compareValues(a: any, b: any, caseSensitive: boolean): number {
    const isNullA = a === null || a === undefined;
    const isNullB = b === null || b === undefined;

    if (isNullA && isNullB) return 0;
    if (isNullA) return 1;
    if (isNullB) return -1;

    const typeA = typeof a;
    const typeB = typeof b;

    if (typeA !== typeB) {
      return this.compareStrings(String(a), String(b), caseSensitive);
    }

    if (typeA === 'number') {
      return this.compareNumbers(a, b);
    }

    if (typeA === 'string') {
      return this.compareStrings(a, b, caseSensitive);
    }

    if (typeA === 'boolean') {
      return this.compareBooleans(a, b);
    }

    if (a instanceof Date && b instanceof Date) {
      return this.compareDates(a, b);
    }

    return this.compareStrings(String(a), String(b), caseSensitive);
  }

  private compareNumbers(a: number, b: number): number {
    if (isNaN(a) && isNaN(b)) return 0;
    if (isNaN(a)) return 1;
    if (isNaN(b)) return -1;
    return a - b;
  }

  private compareStrings(a: string, b: string, caseSensitive: boolean): number {
    if (!caseSensitive) {
      a = a.toLowerCase();
      b = b.toLowerCase();
    }
    return a.localeCompare(b);
  }

  private compareBooleans(a: boolean, b: boolean): number {
    return Number(a) - Number(b);
  }

  private compareDates(a: Date, b: Date): number {
    return a.getTime() - b.getTime();
  }

  /**
   * Update row count
   * @param rowCount - New row count
   */
  updateRowCount(rowCount: number): void {
    this.rowCount = rowCount;

    // Re-execute sort if active
    if (this.sortState.length > 0) {
      this.executeSort();
    }
  }

  /**
   * Destroy sort manager
   */
  destroy(): void {
    this.sortState = [];
    this.indexMap = null;
  }
}
