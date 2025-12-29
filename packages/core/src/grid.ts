import type { GridOptions, GridState, CellRef, VisibleRange } from './types';
import { VirtualScroller } from './rendering/virtual-scroller';
import { CellPool } from './rendering/cell-pool';
import { CellPositioner } from './rendering/cell-positioner';
import { RendererRegistry } from './rendering/renderers/renderer-registry';
import { NumberRenderer } from './rendering/renderers/number-renderer';
import { ImageRenderer } from './rendering/renderers/image-renderer';
import { AdvancedCellRenderer } from './rendering/renderers/advanced-cell-renderer';
import { ArrayAccessor } from './data/data-accessor/array-accessor';
import type { DataAccessor } from './data/data-accessor/data-accessor.interface';
import { SpatialHitTester } from './rendering/spatial-hit-tester';
import { FilterAutocomplete } from './features/filtering/filter-autocomplete';
import { FilterOptimizer } from './features/filtering/filter-optimizer';
import { SubstringFilter } from './features/filtering/substring-filter';
import { FormulaCalculator } from './features/formulas/formula-calculator';
import { AutofillManager } from './features/autofill/autofill-manager';

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
  private dataAccessor: DataAccessor | null = null;

  // Advanced features using new data structures & algorithms
  public spatialHitTester: SpatialHitTester = new SpatialHitTester();
  public filterAutocomplete: FilterAutocomplete = new FilterAutocomplete();
  public filterOptimizer: FilterOptimizer = new FilterOptimizer();
  public substringFilter: SubstringFilter = new SubstringFilter();
  public formulaCalculator: FormulaCalculator = new FormulaCalculator();
  public autofillManager: AutofillManager = new AutofillManager();

  // DOM elements
  private viewport: HTMLElement | null = null;
  private canvas: HTMLElement | null = null;
  private scrollContainer: HTMLElement | null = null;

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

    // Update row/col counts if they exceed options
    const actualRows = data.length;
    const actualCols = data[0]?.length ?? 0;

    if (actualRows > this.options.rowCount || actualCols > this.options.colCount) {
      this.options.rowCount = Math.max(this.options.rowCount, actualRows);
      this.options.colCount = Math.max(this.options.colCount, actualCols);
      this.updateScroller();
    }
  }

  /**
   * Render the grid
   */
  render(): void {
    if (this.isDestroyed) {
      throw new Error('Cannot render destroyed grid');
    }

    if (!this.scroller || !this.pool || !this.positioner) {
      throw new Error('Grid not initialized. Call setData() first.');
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
    };
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

    // Initialize components after DOM is ready
    requestAnimationFrame(() => {
      this.initializeComponents();
    });

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
      getData: (row: number, col: number) => {
        return this.dataAccessor?.getValue(row, col);
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

      // Call user callback
      if (this.options.onScroll) {
        this.options.onScroll(scrollTop, scrollLeft);
      }
    });
  };

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
