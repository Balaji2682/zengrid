import type { FilterModel } from '../../types';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import { ColumnFilter } from './column-filter';

/**
 * Filter manager options
 */
export interface FilterManagerOptions {
  /**
   * Total column count
   */
  colCount: number;

  /**
   * Event emitter for grid events
   */
  events?: EventEmitter<GridEvents>;

  /**
   * Callback to get cell value
   */
  getValue: (row: number, col: number) => any;

  /**
   * Initial filter models
   */
  initialFilters?: FilterModel[];
}

/**
 * FilterManager - Manages filtering across all columns
 *
 * Coordinates column filters and applies them to rows.
 * Tracks visible/hidden rows and emits filter events.
 *
 * @example
 * ```typescript
 * const filterManager = new FilterManager({
 *   colCount: 10,
 *   getValue: (row, col) => data[row][col],
 * });
 *
 * // Add filter for column 0
 * filterManager.setColumnFilter(0, [
 *   { operator: 'greaterThan', value: 100 },
 * ]);
 *
 * // Test if row passes all filters
 * const passes = filterManager.testRow(5);
 *
 * // Get visible row indices
 * const visible = filterManager.getVisibleRows(1000);
 * ```
 */
export class FilterManager {
  private colCount: number;
  private events?: EventEmitter<GridEvents>;
  private getValue: (row: number, col: number) => any;
  private columnFilters: Map<number, ColumnFilter> = new Map();
  private filterState: FilterModel[] = [];

  constructor(options: FilterManagerOptions) {
    this.colCount = options.colCount;
    this.events = options.events;
    this.getValue = options.getValue;

    // Initialize with initial filters
    if (options.initialFilters) {
      for (const model of options.initialFilters) {
        this.setColumnFilterFromModel(model);
      }
    }
  }

  /**
   * Set filter for a column
   * @param column - Column index
   * @param conditions - Filter conditions
   * @param logic - Logic operator ('AND' or 'OR')
   */
  setColumnFilter(
    column: number,
    conditions: any[],
    logic: 'AND' | 'OR' = 'AND'
  ): void {
    if (column < 0 || column >= this.colCount) {
      throw new RangeError(`Column ${column} out of bounds`);
    }

    // Remove existing filter if empty
    if (conditions.length === 0) {
      this.clearColumnFilter(column);
      return;
    }

    // Create or update filter
    const filter = new ColumnFilter({
      column,
      conditions,
      logic,
      onChange: (_model) => this.updateFilterState(),
    });

    this.columnFilters.set(column, filter);
    this.updateFilterState();
    this.emitFilterChange();
  }

  /**
   * Set column filter from model
   */
  private setColumnFilterFromModel(model: FilterModel): void {
    this.setColumnFilter(model.column, model.conditions, model.logic);
  }

  /**
   * Clear filter for a column
   * @param column - Column index
   */
  clearColumnFilter(column: number): void {
    if (this.columnFilters.has(column)) {
      this.columnFilters.delete(column);
      this.updateFilterState();
      this.emitFilterChange();
    }
  }

  /**
   * Clear all filters
   */
  clearAll(): void {
    this.columnFilters.clear();
    this.filterState = [];
    this.emitFilterChange();
  }

  /**
   * Test if a row passes all filters
   * @param row - Row index
   * @returns True if row passes all filters
   */
  testRow(row: number): boolean {
    // No filters = all rows pass
    if (this.columnFilters.size === 0) return true;

    // Test each column filter
    for (const [column, filter] of this.columnFilters) {
      const value = this.getValue(row, column);
      if (!filter.test(value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all visible row indices
   * @param rowCount - Total row count
   * @returns Array of visible row indices
   */
  getVisibleRows(rowCount: number): number[] {
    const visible: number[] = [];

    for (let row = 0; row < rowCount; row++) {
      if (this.testRow(row)) {
        visible.push(row);
      }
    }

    return visible;
  }

  /**
   * Get filter statistics
   * @param rowCount - Total row count
   */
  getStats(rowCount: number): {
    totalRows: number;
    visibleRows: number;
    hiddenRows: number;
    activeFilters: number;
  } {
    const visibleRows = this.getVisibleRows(rowCount);

    return {
      totalRows: rowCount,
      visibleRows: visibleRows.length,
      hiddenRows: rowCount - visibleRows.length,
      activeFilters: this.columnFilters.size,
    };
  }

  /**
   * Get current filter state
   */
  getFilterState(): FilterModel[] {
    return [...this.filterState];
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(): boolean {
    return this.columnFilters.size > 0;
  }

  /**
   * Get filter for specific column
   * @param column - Column index
   */
  getColumnFilter(column: number): ColumnFilter | undefined {
    return this.columnFilters.get(column);
  }

  /**
   * Update filter state
   */
  private updateFilterState(): void {
    this.filterState = Array.from(this.columnFilters.values()).map(f => f.getModel());
  }

  /**
   * Emit filter change event
   */
  private emitFilterChange(): void {
    if (!this.events) return;

    this.events.emit('filter:change', {
      filterState: this.filterState,
      previousFilterState: [], // TODO: Track previous state
    });
  }

  /**
   * Destroy filter manager
   */
  destroy(): void {
    this.columnFilters.clear();
    this.filterState = [];
  }
}
