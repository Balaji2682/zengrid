import type { SortState, SortDirection } from '../../types';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import { SingleColumnSorter } from './single-column-sorter';
import type { IndexMap } from '../../data/index-map';

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
      this.sortState = [...options.initialSort];
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
      const existing = this.sortState.find(s => s.column === column);

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
        this.sortState = [{
          column,
          direction: 'asc',
        }];
      }
    } else {
      // Multi-column sort
      const existingIndex = this.sortState.findIndex(s => s.column === column);

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
    this.sortState = [...sortState];

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
    const state = this.sortState.find(s => s.column === column);
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
        cancel: () => { cancelled = true; },
      });

      if (cancelled) return;
    }

    // For now, support only single column sort
    // TODO: Implement multi-column sort
    const primarySort = this.sortState[0];

    const sorter = new SingleColumnSorter();

    // Create data accessor
    const accessor = {
      getValue: this.getValue,
      getRow: (row: number) => {
        const values: [number, any][] = [];
        for (let col = 0; col < 1; col++) { // Only primary column for now
          values.push([col, this.getValue(row, col)]);
        }
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
      getColumnIds: () => [0],
    };

    // Sort and get index map
    this.indexMap = sorter.sort(accessor, primarySort.column, {
      direction: primarySort.direction!,
      nullPosition: 'last',
      caseSensitive: true,
    });

    // Emit after-sort event
    if (this.events) {
      this.events.emit('sort:afterSort', {
        sortState: this.sortState,
        rowsAffected: this.rowCount,
      });
    }
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
