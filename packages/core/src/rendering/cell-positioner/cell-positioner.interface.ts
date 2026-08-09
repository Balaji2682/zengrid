import type { CellRef, ColumnDef } from '../../types';
import type { VirtualScroller } from '../virtual-scroller';
import type { CellPool } from '../cell-pool';
import type { RendererRegistry } from '../renderers';
import type { IRendererCache } from '../cache';
import type { RowHeightManager } from '../../features/row-height/row-height-manager';
import type { RowSpanProvider } from '../row-span/row-span';
import type { RowStyleProvider } from '../row-style/row-style';
import type { CellStyleProvider } from '../cell-style/cell-style';
import type { ColumnPinProvider, ColumnPinInfo } from '../col-pin/col-pin';

/**
 * Options for creating a CellPositioner
 */
export interface CellPositionerOptions {
  /**
   * VirtualScroller instance for calculating visible ranges
   */
  scroller: VirtualScroller;

  /**
   * CellPool instance for element reuse
   */
  pool: CellPool;

  /**
   * RendererRegistry instance for renderer lookup
   */
  registry: RendererRegistry;

  /**
   * Renderer cache instance (optional)
   */
  cache?: IRendererCache;

  /**
   * Function to get cell data value
   */
  getData: (row: number, col: number) => any;

  /**
   * Function to get full row data (optional, for composite renderers)
   */
  getRowData?: (row: number) => any;

  /**
   * Function to get column definition (optional)
   */
  getColumn?: (col: number) => ColumnDef | undefined;

  /**
   * Function to check if cell is selected
   * @default () => false
   */
  isSelected?: (row: number, col: number) => boolean;

  /**
   * Function to check if cell is active (has focus)
   * @default () => false
   */
  isActive?: (row: number, col: number) => boolean;

  /**
   * Function to check if cell is being edited
   * @default () => false
   */
  isEditing?: (row: number, col: number) => boolean;

  /**
   * RowHeightManager for measuring dynamic row heights (optional)
   * When provided, rows will be measured after rendering if needed
   */
  rowHeightManager?: RowHeightManager;

  /**
   * Row-span layout provider (optional). When set, anchor cells are drawn tall
   * and the cells they cover are skipped. Core ships none; `@zengrid/enterprise`
   * supplies one via `rowSpanning()`.
   */
  spanProvider?: RowSpanProvider;

  /**
   * Per-row class/style provider (optional). When set, the resolved classes and
   * inline styles are applied to every cell in the row. Core ships none;
   * `@zengrid/enterprise` supplies one via `rowStyling()`.
   */
  rowStyleProvider?: RowStyleProvider;

  /**
   * Grid-wide per-cell class/style provider (optional). When set, the resolved
   * classes/styles are applied to the single cell. Combines with each column's
   * `cellClass`/`cellStyle`. Core ships none; `@zengrid/enterprise` supplies one
   * via `cellStyling()`.
   */
  cellStyleProvider?: CellStyleProvider;

  /**
   * Frozen-column layout provider (optional). When set, the columns it reports
   * are drawn "sticky" against the left/right edge each pass. Core ships none;
   * `@zengrid/enterprise` supplies one via `columnPinning()`.
   */
  colPinProvider?: ColumnPinProvider;

  /**
   * Returns the visible columns in display order (index/width/def), used to
   * build the pin provider's context. Only called when `colPinProvider` is set.
   */
  getPinColumns?: () => ColumnPinInfo[];

  /**
   * The scrolling cells container (the CellPool's container). Pinned cells are
   * moved out of it into a pin band and back when unpinned; supplied so the
   * positioner can re-parent recycled cells to the correct layer.
   */
  cellsContainer?: HTMLElement;

  /**
   * The left/right frozen-column sticky band containers (created by the DOM
   * plugin when a `colPinProvider` is set). Pinned cells are rendered into these
   * so CSS `position: sticky` freezes them horizontally with no per-frame JS.
   */
  pinLeftBand?: HTMLElement;
  pinRightBand?: HTMLElement;
}

/**
 * CellPositioner interface
 *
 * Orchestrates cell rendering by coordinating VirtualScroller,
 * CellPool, and RendererRegistry.
 */
export interface CellPositioner {
  /**
   * Render visible cells based on scroll position
   * This is the main rendering entry point
   *
   * @param scrollTop - Vertical scroll position in pixels
   * @param scrollLeft - Horizontal scroll position in pixels
   */
  renderVisibleCells(scrollTop: number, scrollLeft: number): void;

  /**
   * Update specific cells without re-rendering entire range
   * Useful for selection changes, editing state, etc.
   *
   * @param cells - Array of cell references to update
   */
  updateCells(cells: CellRef[]): void;

  /**
   * Force refresh all currently visible cells
   * Re-renders cells using their current renderers
   */
  refresh(): void;

  /**
   * Clear rendered cells tracking so next renderVisibleCells re-renders all cells
   */
  clearRenderedCells(): void;

  /**
   * Lightweight refresh that only toggles selection/active/editing CSS classes
   * on visible cells without re-running renderers. Use for selection changes.
   */
  refreshSelectionClasses(): void;

  /**
   * Cleanup and release all resources
   */
  destroy(): void;
}
