import type { GridOptions, GridState, CellRef, VisibleRange } from './types';
import { EventEmitter } from './events/event-emitter';
import type { GridEvents } from './events/grid-events';
import { VirtualScroller } from './rendering/virtual-scroller/virtual-scroller';
import { CellPool } from './rendering/cell-pool/cell-pool';
import { CellPositioner } from './rendering/cell-positioner/cell-positioner';
import { RendererRegistry } from './rendering/renderers/renderer-registry';
import { RendererCache } from './rendering/cache';
import { NumberRenderer } from './rendering/renderers/number-renderer';
import { ImageRenderer } from './rendering/renderers/image-renderer';
import { AdvancedCellRenderer } from './rendering/renderers/advanced-cell-renderer';
import { ArrayAccessor } from './data/data-accessor/array-accessor';
import type { DataAccessor } from './data/data-accessor/data-accessor.interface';
import { DataManager } from './data/data-manager';
import { SpatialHitTester } from './rendering/spatial-hit-tester';
import { FilterAutocomplete } from './features/filtering/filter-autocomplete';
import { FilterOptimizer } from './features/filtering/filter-optimizer';
import { SubstringFilter } from './features/filtering/substring-filter';
import { FilterManager } from './features/filtering/filter-manager';
import { FormulaCalculator } from './features/formulas/formula-calculator';
import { AutofillManager } from './features/autofill/autofill-manager';
import { SortManager } from './features/sorting/sort-manager';
import { Paginator } from './features/pagination';
import { LoadingIndicator } from './features/loading';

/**
 * Grid - Main grid class that integrates all components
 *
 * Orchestrates VirtualScroller, CellPool, CellPositioner, and Renderers
 * to create a high-performance virtual scrolling data grid.
 *
 * @example
 * ```typescript
 * const container = document.getElementById('grid-container');
 * const grid = new Grid(container, {
 *   rowCount: 100000,
 *   colCount: 10,
 *   rowHeight: 30,
 *   colWidth: 100,
 * });
 *
 * // Set data
 * const data = Array.from({ length: 100000 }, (_, i) =>
 *   Array.from({ length: 10 }, (_, j) => `Cell ${i},${j}`)
 * );
 * grid.setData(data);
 *
 * // Render
 * grid.render();
 * ```
 */
export class Grid {
  private container: HTMLElement;
  private options: GridOptions;
  private state: GridState;

  // Core components
  private scroller: VirtualScroller | null = null;
  private pool: CellPool | null = null;
  private positioner: CellPositioner | null = null;
  private registry: RendererRegistry;
  private cache: RendererCache | null = null;
  private dataAccessor: DataAccessor | null = null;

  // Advanced features using new data structures & algorithms
  public spatialHitTester: SpatialHitTester = new SpatialHitTester();
  public filterAutocomplete: FilterAutocomplete = new FilterAutocomplete();
  public filterOptimizer: FilterOptimizer = new FilterOptimizer();
  public substringFilter: SubstringFilter = new SubstringFilter();
  public formulaCalculator: FormulaCalculator = new FormulaCalculator();
  public autofillManager: AutofillManager = new AutofillManager();
  private dataManager: DataManager | null = null;
  private sortManager: SortManager | null = null;
  private filterManager: FilterManager | null = null;
  private paginator: Paginator | null = null;
  private loadingIndicator: LoadingIndicator | null = null;

  // Filter state cache
  private cachedVisibleRows: number[] | null = null;

  // Events
  private events: EventEmitter<GridEvents> = new EventEmitter();

  // Pagination state
  private currentPage: number = 0;
  private pageSize: number = 100;

  // DOM elements
  private viewport: HTMLElement | null = null;
  private canvas: HTMLElement | null = null;
  private scrollContainer: HTMLElement | null = null;
  private paginationTop: HTMLElement | null = null;
  private paginationBottom: HTMLElement | null = null;

  // Lifecycle
  private isDestroyed = false;
  private rafId: number | null = null;

  constructor(container: HTMLElement, options: GridOptions) {
    if (!container) {
      throw new Error('Container element is required');
    }

    this.container = container;
    this.options = this.validateOptions(options);

    // Initialize state
    this.state = {
      data: [],
      selection: [],
      activeCell: null,
      sortState: [],
      filterState: [],
      scrollPosition: { top: 0, left: 0 },
      editingCell: null,
    };

    // Initialize renderer registry
    this.registry = new RendererRegistry();
    this.registry.register('number', new NumberRenderer());
    this.registry.register('image', new ImageRenderer());
    this.registry.register('advanced', new AdvancedCellRenderer({ elements: [] }));

    // Initialize renderer cache
    if (this.options.rendererCache?.enabled !== false) {
      this.cache = new RendererCache(this.options.rendererCache);
    }

    // Initialize pagination
    if (this.options.pagination?.enabled) {
      this.paginator = new Paginator(this.options.pagination);
      this.pageSize = this.options.pagination.pageSize ?? 100;
    }

    // Initialize loading indicator
    if (this.options.loading?.enabled !== false) {
      this.loadingIndicator = new LoadingIndicator(this.options.loading);
    }

    // Set up loading event listeners
    this.setupLoadingListeners();

    // Setup DOM structure
    this.setupDOM();
  }

  /**
   * Set grid data
   * @param data - 2D array of cell values
   */
  setData(data: any[][]): void {
    if (!Array.isArray(data)) {
      throw new Error('Data must be a 2D array');
    }

    this.state.data = data;
    this.dataAccessor = new ArrayAccessor(data);

    // Update row/col counts to match actual data
    const actualRows = data.length;
    const actualCols = data[0]?.length ?? 0;

    // IMPORTANT: Always update if row/col count changes (not just when increasing)
    // This fixes pagination mode where we go from 100K rows -> 100 rows
    if (actualRows !== this.options.rowCount || actualCols !== this.options.colCount) {
      this.options.rowCount = actualRows;
      this.options.colCount = actualCols;
      this.updateScroller();
    }

    // Initialize or update data manager
    if (!this.dataManager) {
      this.dataManager = new DataManager({
        rowCount: actualRows,
        events: this.events,
        modeConfig: {
          mode: this.options.dataMode,
          callback: this.options.onDataRequest,
        },
      });
    } else {
      this.dataManager.updateRowCount(actualRows);
    }

    // Set data in data manager (frontend mode)
    this.dataManager.setData(data);

    // Initialize or update sort manager
    if (!this.sortManager) {
      this.sortManager = new SortManager({
        rowCount: actualRows,
        events: this.events,
        getValue: (row: number, col: number) => {
          return this.dataAccessor?.getValue(row, col);
        },
        initialSort: this.state.sortState,
        sortMode: this.options.sortMode,
        onSortRequest: this.options.onSortRequest,
      });
    } else {
      this.sortManager.updateRowCount(actualRows);
    }

    // Initialize or update filter manager
    if (!this.filterManager) {
      this.filterManager = new FilterManager({
        colCount: actualCols,
        events: this.events,
        getValue: (row: number, col: number) => {
          return this.dataAccessor?.getValue(row, col);
        },
        mode: this.options.filterMode,
        onFilterRequest: this.options.onFilterRequest,
        columns: this.options.columns,
        enableExport: true, // Enable filter export by default
      });
    }
  }

  /**
   * Render the grid
   */
  render(): void {
    if (this.isDestroyed) {
      throw new Error('Cannot render destroyed grid');
    }

    // Ensure components are initialized
    if (!this.scroller || !this.pool || !this.positioner) {
      this.initializeComponents();
    }

    // Check again after initialization attempt
    if (!this.scroller || !this.pool || !this.positioner) {
      throw new Error('Grid initialization failed. Viewport may have no dimensions.');
    }

    // Initial render at scroll position 0,0
    this.positioner.renderVisibleCells(
      this.state.scrollPosition.top,
      this.state.scrollPosition.left
    );
  }

  /**
   * Refresh all visible cells
   */
  refresh(): void {
    if (!this.positioner) return;
    this.positioner.refresh();
  }

  /**
   * Clear renderer cache
   * Useful when data changes significantly and cached content is invalid
   */
  clearCache(): void {
    if (this.cache) {
      this.cache.clear();
    }
  }

  /**
   * Update specific cells
   * @param cells - Array of cell references to update
   */
  updateCells(cells: CellRef[]): void {
    if (!this.positioner) return;
    this.positioner.updateCells(cells);
  }

  /**
   * Scroll to a specific cell
   * @param row - Target row
   * @param col - Target column
   */
  scrollToCell(row: number, col: number): void {
    if (!this.scroller || !this.scrollContainer) return;

    const position = this.scroller.getCellPosition(row, col);
    this.scrollContainer.scrollTop = position.y;
    this.scrollContainer.scrollLeft = position.x;
  }

  /**
   * Get current scroll position
   */
  getScrollPosition(): { top: number; left: number } {
    return { ...this.state.scrollPosition };
  }

  /**
   * Get visible range
   */
  getVisibleRange(): VisibleRange | null {
    if (!this.scroller) return null;
    return this.scroller.calculateVisibleRange(
      this.state.scrollPosition.top,
      this.state.scrollPosition.left
    );
  }

  /**
   * Register a custom renderer
   * @param name - Renderer name
   * @param renderer - Renderer instance
   */
  registerRenderer(name: string, renderer: any): void {
    this.registry.register(name, renderer);
  }

  /**
   * Update grid options
   * @param options - Partial options to update
   */
  updateOptions(options: Partial<GridOptions>): void {
    this.options = { ...this.options, ...options };
    this.updateScroller();
    this.refresh();
  }

  /**
   * Get grid statistics
   */
  getStats(): {
    rowCount: number;
    colCount: number;
    visibleCells: number;
    poolStats: any;
    cacheStats?: any;
  } {
    const visibleRange = this.getVisibleRange();
    const visibleCells = visibleRange
      ? (visibleRange.endRow - visibleRange.startRow) * (visibleRange.endCol - visibleRange.startCol)
      : 0;

    return {
      rowCount: this.options.rowCount,
      colCount: this.options.colCount,
      visibleCells,
      poolStats: this.pool?.stats ?? { active: 0, pooled: 0, total: 0 },
      cacheStats: this.cache?.getStats(),
    };
  }

  /**
   * Get total grid dimensions (useful for header sizing)
   */
  getDimensions(): { width: number; height: number } {
    if (!this.scroller) {
      return { width: 0, height: 0 };
    }
    return {
      width: this.scroller.getTotalWidth(),
      height: this.scroller.getTotalHeight(),
    };
  }

  /**
   * Get column position for a given column index (useful for header positioning)
   */
  getColumnPosition(col: number): { x: number; width: number } {
    if (!this.scroller) {
      return { x: 0, width: 0 };
    }
    const position = this.scroller.getCellPosition(0, col);
    return {
      x: position.x,
      width: position.width,
    };
  }

  /**
   * Sort grid by column
   * @param column - Column index to sort by
   * @param direction - Sort direction ('asc', 'desc', or null to clear)
   */
  sort(column: number, direction: 'asc' | 'desc' | null = 'asc'): void {
    if (!this.sortManager) {
      console.warn('Sort manager not initialized. Call setData() first.');
      return;
    }

    // Clear existing sort
    this.sortManager.clearSort();

    // Apply new sort if direction is not null
    if (direction !== null) {
      this.sortManager.setSortState([{ column, direction }]);
    }

    // Update state
    this.state.sortState = this.sortManager.getSortState();

    // Clear cache since data order has changed
    this.clearCache();

    // Refresh grid to show sorted data
    this.refresh();
  }

  /**
   * Toggle sort on a column (cycles: asc -> desc -> none)
   * @param column - Column index to toggle sort
   */
  toggleSort(column: number): void {
    if (!this.sortManager) {
      console.warn('Sort manager not initialized. Call setData() first.');
      return;
    }

    this.sortManager.toggleSort(column, false);
    this.state.sortState = this.sortManager.getSortState();

    // Clear cache since data order has changed
    this.clearCache();

    // Refresh grid to show sorted data
    this.refresh();
  }

  /**
   * Get current sort state
   */
  getSortState() {
    return this.sortManager?.getSortState() ?? [];
  }

  /**
   * Get sort direction for a specific column
   * @param column - Column index
   */
  getColumnSort(column: number) {
    return this.sortManager?.getColumnSort(column) ?? null;
  }

  /**
   * Get sort icons with defaults
   * Returns configured icons or defaults ('▲' for asc, '▼' for desc)
   */
  getSortIcons(): { asc: string; desc: string } {
    return {
      asc: this.options.sortIcons?.asc ?? '▲',
      desc: this.options.sortIcons?.desc ?? '▼',
    };
  }

  /**
   * Get current data mode
   * Returns 'frontend' | 'backend' (resolved from 'auto')
   */
  getDataMode(): 'frontend' | 'backend' {
    return this.dataManager?.getMode() ?? 'frontend';
  }

  /**
   * Get current sort mode
   * Returns 'frontend' | 'backend' (resolved from 'auto')
   */
  getSortMode(): 'frontend' | 'backend' {
    return this.sortManager?.getSortMode() ?? 'frontend';
  }

  /**
   * Clear all sorting
   */
  clearSort(): void {
    if (!this.sortManager) return;

    this.sortManager.clearSort();
    this.state.sortState = [];

    // Clear cache since data order has changed
    this.clearCache();

    // Refresh grid
    this.refresh();
  }

  /**
   * Set filter for a specific column (replaces existing filter)
   *
   * **Note:** This replaces any existing filter on the column.
   * For multiple conditions on the same column, use `setColumnFilter()` instead.
   *
   * @param column - Column index
   * @param operator - Filter operator
   * @param value - Filter value
   *
   * @example
   * ```typescript
   * // Single condition - this is fine
   * grid.setFilter(3, 'greaterThan', 100);
   *
   * // Multiple conditions - use setColumnFilter instead!
   * grid.setColumnFilter(3, [
   *   { operator: 'greaterThan', value: 100 },
   *   { operator: 'lessThan', value: 500 }
   * ], 'AND');
   * ```
   */
  setFilter(column: number, operator: string, value: any): void {
    if (!this.filterManager) {
      console.warn('Filter manager not initialized. Call setData() first.');
      return;
    }

    // Build conditions array from operator and value
    const conditions = [{
      operator: operator as any,
      value: value,
    }];

    this.filterManager.setColumnFilter(column, conditions);
    this.state.filterState = this.filterManager.getFilterState();

    // Get visible rows after filtering and cache them
    this.cachedVisibleRows = this.filterManager.getVisibleRows(this.options.rowCount);
    console.log(`🔍 Filter applied: ${this.cachedVisibleRows.length} of ${this.options.rowCount} rows visible`);

    // Re-apply sort to filtered rows if sorting is active
    if (this.sortManager && this.state.sortState.length > 0) {
      console.log('🔄 Re-applying sort to filtered rows...');
      // Recreate sort manager with filtered row count
      const currentSort = this.state.sortState;
      this.sortManager = new SortManager({
        rowCount: this.cachedVisibleRows.length,
        getValue: (row: number, col: number) => {
          // Get value from filtered row
          const dataRow = this.cachedVisibleRows![row];
          return this.dataAccessor?.getValue(dataRow, col);
        },
        sortMode: this.options.sortMode,
        onSortRequest: this.options.onSortRequest,
        events: this.events,
      });
      // Reapply the sort state
      this.sortManager.setSortState(currentSort);
    }

    // Recreate scroller with filtered row count to adjust scrollbar
    if (this.scroller && this.scrollContainer && this.canvas) {
      const viewportWidth = this.scrollContainer.clientWidth;
      const viewportHeight = this.scrollContainer.clientHeight;

      this.scroller = new VirtualScroller({
        rowCount: this.cachedVisibleRows.length,
        colCount: this.options.colCount,
        rowHeight: this.options.rowHeight,
        colWidth: this.options.colWidth,
        viewportWidth,
        viewportHeight,
        overscanRows: this.options.overscanRows ?? 3,
        overscanCols: this.options.overscanCols ?? 2,
      });

      // Update canvas size
      this.canvas.style.width = `${this.scroller.getTotalWidth()}px`;
      this.canvas.style.height = `${this.scroller.getTotalHeight()}px`;

      // Scroll to top to show filtered results
      this.scrollContainer.scrollTop = 0;

      // Re-create ONLY the positioner (don't call initializeComponents as it recreates scroller!)
      if (this.pool) {
        this.positioner = new CellPositioner({
          scroller: this.scroller,
          pool: this.pool,
          registry: this.registry,
          cache: this.cache ?? undefined,
          getData: (row: number, col: number) => {
            let dataRow = row;

            // When filtering is active, apply filter+sort correctly
            if (this.cachedVisibleRows && this.cachedVisibleRows.length > 0) {
              if (row >= this.cachedVisibleRows.length) return undefined;

              // If sort is also active, apply sort mapping within filtered space first
              const indexMap = this.sortManager?.getIndexMap();
              const filteredRow = indexMap ? indexMap.toDataIndex(row) : row;

              // Then map to actual data row
              dataRow = this.cachedVisibleRows[filteredRow];
            } else {
              // No filtering, only apply sort if active
              const indexMap = this.sortManager?.getIndexMap();
              dataRow = indexMap ? indexMap.toDataIndex(row) : row;
            }

            return this.dataAccessor?.getValue(dataRow, col);
          },
          getColumn: (col: number) => {
            return this.options.columns?.[col];
          },
          isSelected: (row: number, col: number) => {
            return this.state.selection.some(range =>
              row >= range.startRow && row <= range.endRow &&
              col >= range.startCol && col <= range.endCol
            );
          },
          isActive: (row: number, col: number) => {
            return this.state.activeCell?.row === row && this.state.activeCell?.col === col;
          },
          isEditing: (row: number, col: number) => {
            return this.state.editingCell?.row === row && this.state.editingCell?.col === col;
          },
        });

        // Force render at top position
        this.positioner.renderVisibleCells(0, 0);
      }
    }

    // Emit filter:export event with all export formats
    const fieldState = this.filterManager.getFieldFilterState();
    if (fieldState) {
      const exports = this.filterManager.getFilterExport();
      if (exports) {
        this.events.emit('filter:export', {
          state: fieldState,
          rest: exports.rest,
          graphql: exports.graphql,
          sql: exports.sql,
          previousState: { root: null, activeFields: [], timestamp: Date.now() },
        });
      }
    }

    // Clear cache since filtered data changed
    this.clearCache();

    // Refresh grid with filtered data
    this.refresh();
  }

  /**
   * Set multiple filter conditions for a column with AND/OR logic
   *
   * Use this method when you need multiple conditions on the same column.
   * Conditions can be combined with 'AND' or 'OR' logic.
   *
   * @param column - Column index
   * @param conditions - Array of filter conditions
   * @param logic - Logic operator ('AND' or 'OR'), default 'AND'
   *
   * @example
   * ```typescript
   * // Salary between 100 and 500 (AND logic)
   * grid.setColumnFilter(3, [
   *   { operator: 'greaterThanOrEqual', value: 100 },
   *   { operator: 'lessThanOrEqual', value: 500 }
   * ], 'AND');
   *
   * // Status is 'Active' OR 'Remote' (OR logic)
   * grid.setColumnFilter(5, [
   *   { operator: 'equals', value: 'Active' },
   *   { operator: 'equals', value: 'Remote' }
   * ], 'OR');
   * ```
   */
  setColumnFilter(
    column: number,
    conditions: Array<{ operator: string; value: any }>,
    logic: 'AND' | 'OR' = 'AND'
  ): void {
    if (!this.filterManager) {
      console.warn('Filter manager not initialized. Call setData() first.');
      return;
    }

    // Set column filter with all conditions
    this.filterManager.setColumnFilter(column, conditions as any, logic);
    this.state.filterState = this.filterManager.getFilterState();

    // Get visible rows after filtering and cache them
    this.cachedVisibleRows = this.filterManager.getVisibleRows(this.options.rowCount);
    console.log(`🔍 Filter applied: ${this.cachedVisibleRows.length} of ${this.options.rowCount} rows visible`);

    // Re-apply sort to filtered rows if sorting is active
    if (this.sortManager && this.state.sortState.length > 0) {
      console.log('🔄 Re-applying sort to filtered rows...');
      const currentSort = this.state.sortState;
      this.sortManager = new SortManager({
        rowCount: this.cachedVisibleRows.length,
        getValue: (row: number, col: number) => {
          const dataRow = this.cachedVisibleRows![row];
          return this.dataAccessor?.getValue(dataRow, col);
        },
        sortMode: this.options.sortMode,
        onSortRequest: this.options.onSortRequest,
        events: this.events,
      });
      this.sortManager.setSortState(currentSort);
    }

    // Recreate scroller with filtered row count
    if (this.scroller && this.scrollContainer && this.canvas) {
      const viewportWidth = this.scrollContainer.clientWidth;
      const viewportHeight = this.scrollContainer.clientHeight;

      this.scroller = new VirtualScroller({
        rowCount: this.cachedVisibleRows.length,
        colCount: this.options.colCount,
        rowHeight: this.options.rowHeight,
        colWidth: this.options.colWidth,
        viewportWidth,
        viewportHeight,
        overscanRows: this.options.overscanRows ?? 3,
        overscanCols: this.options.overscanCols ?? 2,
      });

      this.canvas.style.width = `${this.scroller.getTotalWidth()}px`;
      this.canvas.style.height = `${this.scroller.getTotalHeight()}px`;
      this.scrollContainer.scrollTop = 0;

      if (this.pool) {
        this.positioner = new CellPositioner({
          scroller: this.scroller,
          pool: this.pool,
          registry: this.registry,
          cache: this.cache ?? undefined,
          getData: (row: number, col: number) => {
            let dataRow = row;

            if (this.cachedVisibleRows && this.cachedVisibleRows.length > 0) {
              if (row >= this.cachedVisibleRows.length) return undefined;
              const indexMap = this.sortManager?.getIndexMap();
              const filteredRow = indexMap ? indexMap.toDataIndex(row) : row;
              dataRow = this.cachedVisibleRows[filteredRow];
            } else {
              const indexMap = this.sortManager?.getIndexMap();
              dataRow = indexMap ? indexMap.toDataIndex(row) : row;
            }

            return this.dataAccessor?.getValue(dataRow, col);
          },
          getColumn: (col: number) => this.options.columns?.[col],
          isSelected: (row: number, col: number) =>
            this.state.selection.some(range =>
              row >= range.startRow && row <= range.endRow &&
              col >= range.startCol && col <= range.endCol
            ),
          isActive: (row: number, col: number) =>
            this.state.activeCell?.row === row && this.state.activeCell?.col === col,
          isEditing: (row: number, col: number) =>
            this.state.editingCell?.row === row && this.state.editingCell?.col === col,
        });

        this.positioner.renderVisibleCells(0, 0);
      }
    }

    // Emit filter:export event
    const fieldState = this.filterManager.getFieldFilterState();
    if (fieldState) {
      const exports = this.filterManager.getFilterExport();
      if (exports) {
        this.events.emit('filter:export', {
          ...exports,
          previousState: { root: null, activeFields: [], timestamp: Date.now() },
        });
      }
    }

    this.clearCache();
    this.refresh();
  }

  /**
   * Get current filter state (column-based)
   */
  getFilterState() {
    return this.filterManager?.getFilterState() ?? [];
  }

  /**
   * Get field-based filter state (for backends)
   */
  getFieldFilterState() {
    return this.filterManager?.getFieldFilterState() ?? null;
  }

  /**
   * Get filter exports in all formats (REST, GraphQL, SQL)
   */
  getFilterExports() {
    return this.filterManager?.getFilterExport() ?? null;
  }

  /**
   * Get current filter mode
   * Returns 'frontend' | 'backend' (resolved from 'auto')
   */
  getFilterMode(): 'frontend' | 'backend' {
    return this.filterManager?.getFilterMode() ?? 'frontend';
  }

  /**
   * Update viewport dimensions and re-render
   * Call this when container size changes (e.g., panels expand/collapse, window resize)
   *
   * @example
   * ```typescript
   * // After a panel expands/collapses
   * grid.updateViewport();
   *
   * // On window resize
   * window.addEventListener('resize', () => grid.updateViewport());
   * ```
   */
  updateViewport(): void {
    if (!this.scroller || !this.scrollContainer) {
      console.warn('Grid not fully initialized. Cannot update viewport.');
      return;
    }

    // Get current viewport dimensions
    const newWidth = this.scrollContainer.clientWidth;
    const newHeight = this.scrollContainer.clientHeight;

    console.log(`📐 Updating viewport: ${newWidth}x${newHeight}px`);

    // Update scroller viewport
    this.scroller.setViewport(newWidth, newHeight);

    // Re-render with new dimensions
    this.refresh();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    if (!this.filterManager) return;

    this.filterManager.clearAll();
    this.state.filterState = [];

    // Clear cached visible rows
    this.cachedVisibleRows = null;

    // Restore sort manager to work with all rows if sorting is active
    if (this.sortManager && this.state.sortState.length > 0 && this.dataAccessor) {
      console.log('🔄 Restoring sort to all rows...');
      const currentSort = this.state.sortState;
      this.sortManager = new SortManager({
        rowCount: this.options.rowCount,
        getValue: (row: number, col: number) => {
          return this.dataAccessor?.getValue(row, col);
        },
        sortMode: this.options.sortMode,
        onSortRequest: this.options.onSortRequest,
        events: this.events,
      });
      // Reapply the sort state
      this.sortManager.setSortState(currentSort);
    }

    // Recreate scroller with original row count to restore scrollbar
    if (this.scroller && this.scrollContainer && this.canvas) {
      const viewportWidth = this.scrollContainer.clientWidth;
      const viewportHeight = this.scrollContainer.clientHeight;

      this.scroller = new VirtualScroller({
        rowCount: this.options.rowCount,
        colCount: this.options.colCount,
        rowHeight: this.options.rowHeight,
        colWidth: this.options.colWidth,
        viewportWidth,
        viewportHeight,
        overscanRows: this.options.overscanRows ?? 3,
        overscanCols: this.options.overscanCols ?? 2,
      });

      // Update canvas size
      this.canvas.style.width = `${this.scroller.getTotalWidth()}px`;
      this.canvas.style.height = `${this.scroller.getTotalHeight()}px`;

      // Re-create ONLY the positioner (don't call initializeComponents!)
      if (this.pool) {
        this.positioner = new CellPositioner({
          scroller: this.scroller,
          pool: this.pool,
          registry: this.registry,
          cache: this.cache ?? undefined,
          getData: (row: number, col: number) => {
            let dataRow = row;

            // When filtering is active, apply filter+sort correctly
            if (this.cachedVisibleRows && this.cachedVisibleRows.length > 0) {
              if (row >= this.cachedVisibleRows.length) return undefined;

              // If sort is also active, apply sort mapping within filtered space first
              const indexMap = this.sortManager?.getIndexMap();
              const filteredRow = indexMap ? indexMap.toDataIndex(row) : row;

              // Then map to actual data row
              dataRow = this.cachedVisibleRows[filteredRow];
            } else {
              // No filtering, only apply sort if active
              const indexMap = this.sortManager?.getIndexMap();
              dataRow = indexMap ? indexMap.toDataIndex(row) : row;
            }

            return this.dataAccessor?.getValue(dataRow, col);
          },
          getColumn: (col: number) => {
            return this.options.columns?.[col];
          },
          isSelected: (row: number, col: number) => {
            return this.state.selection.some(range =>
              row >= range.startRow && row <= range.endRow &&
              col >= range.startCol && col <= range.endCol
            );
          },
          isActive: (row: number, col: number) => {
            return this.state.activeCell?.row === row && this.state.activeCell?.col === col;
          },
          isEditing: (row: number, col: number) => {
            return this.state.editingCell?.row === row && this.state.editingCell?.col === col;
          },
        });

        // Force render at top position
        this.positioner.renderVisibleCells(0, 0);
      }
    }

    // Clear cache since filtered data changed
    this.clearCache();

    // Refresh grid
    this.refresh();
  }

  /**
   * Go to specific page
   * @param page - Page number (0-based)
   */
  goToPage(page: number): void {
    if (!this.paginator) {
      console.warn('Pagination not enabled. Call with pagination config to use pagination.');
      return;
    }

    // Validate page number
    if (!Number.isFinite(page) || page < 0) {
      console.warn('Invalid page number:', page);
      return;
    }

    // Floor the page number
    page = Math.floor(page);

    const totalPages = this.getTotalPages();

    // Handle edge case: no pages
    if (totalPages === 0) {
      console.warn('Cannot navigate: no pages available');
      return;
    }

    // Clamp to valid range
    const newPage = Math.max(0, Math.min(page, totalPages - 1));

    // Warn if clamped
    if (newPage !== page) {
      console.warn(`Page ${page} out of bounds. Clamped to ${newPage}. Total pages: ${totalPages}`);
    }

    if (newPage !== this.currentPage) {
      this.currentPage = newPage;
      this.updatePagination();
      this.refresh();

      // Emit page change event
      if (this.options.onPageChange) {
        this.options.onPageChange(this.currentPage, this.pageSize);
      }
    }
  }

  /**
   * Go to next page
   */
  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  /**
   * Go to previous page
   */
  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  /**
   * Go to first page
   */
  firstPage(): void {
    this.goToPage(0);
  }

  /**
   * Go to last page
   */
  lastPage(): void {
    this.goToPage(this.getTotalPages() - 1);
  }

  /**
   * Change page size
   * @param pageSize - New page size
   */
  setPageSize(pageSize: number): void {
    if (!this.paginator) {
      console.warn('Pagination not enabled');
      return;
    }

    // Validate page size
    if (!Number.isFinite(pageSize) || pageSize <= 0) {
      console.error('Invalid page size:', pageSize, '- Must be a positive number');
      return;
    }

    // Floor and clamp page size
    pageSize = Math.max(1, Math.floor(pageSize));

    // Check if page size is in allowed options (if configured)
    const allowedSizes = this.options.pagination?.pageSizeOptions;
    if (allowedSizes && allowedSizes.length > 0 && !allowedSizes.includes(pageSize)) {
      console.warn(`Page size ${pageSize} not in allowed options:`, allowedSizes);
    }

    // Only update if changed
    if (pageSize === this.pageSize) {
      return;
    }

    const oldPageSize = this.pageSize;
    this.pageSize = pageSize;

    // Try to maintain current position when changing page size
    // Calculate what row the user was viewing
    const currentFirstRow = this.currentPage * oldPageSize;

    // Calculate new page that shows the same row
    this.currentPage = Math.floor(currentFirstRow / pageSize);

    // Ensure new page is valid
    const totalPages = this.getTotalPages();
    this.currentPage = Math.max(0, Math.min(this.currentPage, totalPages - 1));

    this.updatePagination();
    this.refresh();

    // Emit page change event
    if (this.options.onPageChange) {
      this.options.onPageChange(this.currentPage, this.pageSize);
    }
  }

  /**
   * Get current page number
   */
  getCurrentPage(): number {
    return this.currentPage;
  }

  /**
   * Get page size
   */
  getPageSize(): number {
    return this.pageSize;
  }

  /**
   * Get total number of pages
   */
  getTotalPages(): number {
    // Handle edge cases
    if (!this.paginator || this.pageSize <= 0) {
      return 0;
    }

    const rowCount = this.dataManager?.getTotalRows() ?? this.options.rowCount;

    if (rowCount <= 0) {
      return 0;
    }

    return Math.ceil(rowCount / this.pageSize);
  }

  /**
   * Update pagination controls
   */
  private updatePagination(): void {
    if (!this.paginator) return;

    // Validate and synchronize pagination state
    this.validatePaginationState();

    const totalRows = this.dataManager?.getTotalRows() ?? this.options.rowCount;
    const totalPages = this.getTotalPages();

    const state = {
      currentPage: this.currentPage,
      totalPages: totalPages,
      pageSize: this.pageSize,
      totalRows: totalRows,
      pageSizeOptions: this.options.pagination?.pageSizeOptions ?? [25, 50, 100, 200, 500],
    };

    const handlers = {
      onPageChange: (page: number) => this.goToPage(page),
      onPageSizeChange: (size: number) => this.setPageSize(size),
      onFirstPage: () => this.firstPage(),
      onLastPage: () => this.lastPage(),
      onNextPage: () => this.nextPage(),
      onPreviousPage: () => this.previousPage(),
    };

    // Render pagination controls
    const paginationElement = this.paginator.render(state, handlers);

    // Update top pagination
    if (this.paginationTop && (this.options.pagination?.position === 'top' || this.options.pagination?.position === 'both')) {
      this.paginationTop.innerHTML = '';
      this.paginationTop.appendChild(paginationElement.cloneNode(true));
    }

    // Update bottom pagination
    if (this.paginationBottom && (this.options.pagination?.position === 'bottom' || this.options.pagination?.position === 'both' || !this.options.pagination?.position)) {
      this.paginationBottom.innerHTML = '';
      this.paginationBottom.appendChild(paginationElement);
    }
  }

  /**
   * Validate and synchronize pagination state
   */
  private validatePaginationState(): void {
    if (!this.paginator) return;

    const totalPages = this.getTotalPages();

    // Handle no data case
    if (totalPages === 0) {
      this.currentPage = 0;
      return;
    }

    // Ensure current page is within bounds
    if (this.currentPage >= totalPages) {
      const oldPage = this.currentPage;
      this.currentPage = Math.max(0, totalPages - 1);
      console.warn(`Current page ${oldPage} exceeds total pages ${totalPages}. Reset to page ${this.currentPage}`);
    }

    // Ensure page size is valid
    if (this.pageSize <= 0) {
      console.error('Invalid page size detected:', this.pageSize);
      this.pageSize = this.options.pagination?.pageSize ?? 100;
    }
  }

  /**
   * Set up loading event listeners
   */
  private setupLoadingListeners(): void {
    // Listen for loading:start event
    this.events.on('loading:start', (event) => {
      if (this.loadingIndicator && this.container) {
        this.loadingIndicator.show(this.container, {
          isLoading: true,
          message: event.message,
        });
      }
    });

    // Listen for loading:end event
    this.events.on('loading:end', () => {
      if (this.loadingIndicator) {
        this.loadingIndicator.hide();
      }
    });

    // Listen for loading:progress event
    this.events.on('loading:progress', (event) => {
      if (this.loadingIndicator) {
        this.loadingIndicator.update({
          isLoading: true,
          message: event.message,
          progress: event.progress,
        });
      }
    });
  }

  /**
   * Destroy the grid and clean up resources
   */
  destroy(): void {
    if (this.isDestroyed) return;

    // Cancel pending animations
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Destroy components
    if (this.positioner) {
      this.positioner.destroy();
      this.positioner = null;
    }

    if (this.pool) {
      this.pool.clear();
      this.pool = null;
    }

    // Clear DOM
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.handleScroll);
    }

    this.container.innerHTML = '';
    this.viewport = null;
    this.canvas = null;
    this.scrollContainer = null;

    // Destroy data manager
    if (this.dataManager) {
      this.dataManager.destroy();
      this.dataManager = null;
    }

    // Destroy sort manager
    if (this.sortManager) {
      this.sortManager.destroy();
      this.sortManager = null;
    }

    // Destroy filter manager
    if (this.filterManager) {
      this.filterManager.destroy();
      this.filterManager = null;
    }

    // Destroy loading indicator
    if (this.loadingIndicator) {
      this.loadingIndicator.destroy();
      this.loadingIndicator = null;
    }

    // Clear state
    this.state.data = [];
    this.state.selection = [];
    this.scroller = null;
    this.dataAccessor = null;

    this.isDestroyed = true;
  }

  /**
   * Setup DOM structure
   */
  private setupDOM(): void {
    // Create viewport
    this.viewport = document.createElement('div');
    this.viewport.className = 'zg-viewport';
    this.viewport.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    `;

    // Create scroll container
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.className = 'zg-scroll-container';
    this.scrollContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: auto;
    `;

    // Create canvas (scroll area)
    this.canvas = document.createElement('div');
    this.canvas.className = 'zg-canvas';
    this.canvas.style.cssText = `
      position: relative;
      pointer-events: none;
    `;

    // Create cells container
    const cellsContainer = document.createElement('div');
    cellsContainer.className = 'zg-cells';
    cellsContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: auto;
    `;

    // Assemble DOM
    this.canvas.appendChild(cellsContainer);
    this.scrollContainer.appendChild(this.canvas);
    this.viewport.appendChild(this.scrollContainer);
    this.container.appendChild(this.viewport);

    // Attach event listeners
    this.scrollContainer.addEventListener('scroll', this.handleScroll);
  }

  /**
   * Initialize core components
   */
  private initializeComponents(): void {
    if (!this.scrollContainer || !this.canvas) return;

    const viewportWidth = this.scrollContainer.clientWidth;
    const viewportHeight = this.scrollContainer.clientHeight;

    // Initialize VirtualScroller
    this.scroller = new VirtualScroller({
      rowCount: this.options.rowCount,
      colCount: this.options.colCount,
      rowHeight: this.options.rowHeight,
      colWidth: this.options.colWidth,
      viewportWidth,
      viewportHeight,
      overscanRows: this.options.overscanRows ?? 3,
      overscanCols: this.options.overscanCols ?? 2,
    });

    // Update canvas size
    this.canvas.style.width = `${this.scroller.getTotalWidth()}px`;
    this.canvas.style.height = `${this.scroller.getTotalHeight()}px`;

    // Initialize CellPool
    const cellsContainer = this.canvas.querySelector('.zg-cells') as HTMLElement;
    this.pool = new CellPool({
      container: cellsContainer,
      initialSize: 100,
      maxSize: 500,
    });

    // Initialize CellPositioner
    this.positioner = new CellPositioner({
      scroller: this.scroller,
      pool: this.pool,
      registry: this.registry,
      cache: this.cache ?? undefined,
      getData: (row: number, col: number) => {
        // Apply filter mapping using cached visible rows
        let dataRow = row;

        if (this.cachedVisibleRows && this.cachedVisibleRows.length > 0) {
          if (row >= this.cachedVisibleRows.length) return undefined;
          dataRow = this.cachedVisibleRows[row];
        }

        // Then apply sort index mapping if active
        const indexMap = this.sortManager?.getIndexMap();
        const mappedRow = indexMap ? indexMap.toDataIndex(dataRow) : dataRow;

        return this.dataAccessor?.getValue(mappedRow, col);
      },
      getColumn: (col: number) => {
        return this.options.columns?.[col];
      },
      isSelected: (row: number, col: number) => {
        return this.state.selection.some(range =>
          row >= range.startRow && row <= range.endRow &&
          col >= range.startCol && col <= range.endCol
        );
      },
      isActive: (row: number, col: number) => {
        return this.state.activeCell?.row === row && this.state.activeCell?.col === col;
      },
      isEditing: (row: number, col: number) => {
        return this.state.editingCell?.row === row && this.state.editingCell?.col === col;
      },
    });
  }

  /**
   * Update scroller with new dimensions
   */
  private updateScroller(): void {
    if (!this.scroller || !this.scrollContainer || !this.canvas) return;

    const viewportWidth = this.scrollContainer.clientWidth;
    const viewportHeight = this.scrollContainer.clientHeight;

    this.scroller = new VirtualScroller({
      rowCount: this.options.rowCount,
      colCount: this.options.colCount,
      rowHeight: this.options.rowHeight,
      colWidth: this.options.colWidth,
      viewportWidth,
      viewportHeight,
      overscanRows: this.options.overscanRows ?? 3,
      overscanCols: this.options.overscanCols ?? 2,
    });

    // Update canvas size
    this.canvas.style.width = `${this.scroller.getTotalWidth()}px`;
    this.canvas.style.height = `${this.scroller.getTotalHeight()}px`;

    // CRITICAL: Recreate positioner with the new scroller
    // This ensures the positioner uses the updated row/col counts
    // Fixes pagination mode where row count changes (100K -> 100)
    if (this.positioner && this.pool) {
      this.positioner = new CellPositioner({
        scroller: this.scroller,
        pool: this.pool,
        registry: this.registry,
        cache: this.cache ?? undefined,
        getData: (row: number, col: number) => {
          let dataRow = row;

          // When filtering is active, apply filter+sort correctly
          if (this.cachedVisibleRows && this.cachedVisibleRows.length > 0) {
            if (row >= this.cachedVisibleRows.length) return undefined;

            // If sort is also active, apply sort mapping within filtered space first
            const indexMap = this.sortManager?.getIndexMap();
            const filteredRow = indexMap ? indexMap.toDataIndex(row) : row;

            // Then map to actual data row
            dataRow = this.cachedVisibleRows[filteredRow];
          } else {
            // No filtering, only apply sort if active
            const indexMap = this.sortManager?.getIndexMap();
            dataRow = indexMap ? indexMap.toDataIndex(row) : row;
          }

          return this.dataAccessor?.getValue(dataRow, col);
        },
        getColumn: (col: number) => this.options.columns?.[col],
        isSelected: (row: number, col: number) =>
          this.state.selection.some(range =>
            row >= range.startRow && row <= range.endRow &&
            col >= range.startCol && col <= range.endCol
          ),
        isActive: (row: number, col: number) =>
          this.state.activeCell?.row === row && this.state.activeCell?.col === col,
        isEditing: (row: number, col: number) =>
          this.state.editingCell?.row === row && this.state.editingCell?.col === col,
      });
    }
  }

  /**
   * Handle scroll events
   */
  private handleScroll = (event: Event): void => {
    const target = event.target as HTMLElement;
    const scrollTop = target.scrollTop;
    const scrollLeft = target.scrollLeft;

    // Update state
    this.state.scrollPosition = { top: scrollTop, left: scrollLeft };

    // Throttle render using requestAnimationFrame
    if (this.rafId !== null) {
      return; // Already scheduled
    }

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;

      if (!this.positioner) return;
      this.positioner.renderVisibleCells(scrollTop, scrollLeft);

      // Call user callback for external header sync, etc.
      if (this.options.onScroll) {
        this.options.onScroll(scrollTop, scrollLeft);
      }
    });
  };

  /**
   * Subscribe to grid events
   * @param event - Event name
   * @param handler - Event handler
   */
  on<K extends keyof GridEvents>(event: K, handler: (payload: GridEvents[K]) => void): void {
    this.events.on(event, handler);
  }

  /**
   * Unsubscribe from grid events
   * @param event - Event name
   * @param handler - Event handler
   */
  off<K extends keyof GridEvents>(event: K, handler: (payload: GridEvents[K]) => void): void {
    this.events.off(event, handler);
  }

  /**
   * Validate and normalize options
   */
  private validateOptions(options: GridOptions): GridOptions {
    if (options.rowCount <= 0 || options.colCount <= 0) {
      throw new Error('rowCount and colCount must be positive');
    }

    return {
      ...options,
      enableSelection: options.enableSelection ?? true,
      enableMultiSelection: options.enableMultiSelection ?? true,
      enableKeyboardNavigation: options.enableKeyboardNavigation ?? true,
      enableA11y: options.enableA11y ?? true,
      overscanRows: options.overscanRows ?? 3,
      overscanCols: options.overscanCols ?? 2,
      enableCellPooling: options.enableCellPooling ?? true,
    };
  }
}
