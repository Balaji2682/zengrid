import type { CellRef, ColumnDef } from '../../types';
import type { VirtualScroller } from '../virtual-scroller';
import type { CellPool } from '../cell-pool';
import type { RendererRegistry } from '../renderers';

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
   * Cleanup and release all resources
   */
  destroy(): void;
}
