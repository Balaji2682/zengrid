import type { CellRef, CellPosition, ColumnDef } from '../../types';

/**
 * Parameters passed to renderers for rendering a cell
 */
export interface RenderParams {
  /**
   * Cell coordinates
   */
  cell: CellRef;

  /**
   * Cell position and dimensions
   */
  position: CellPosition;

  /**
   * Cell data value
   */
  value: any;

  /**
   * Column definition (if available)
   */
  column?: ColumnDef;

  /**
   * Full row data (for composite renderers that need access to other columns)
   */
  rowData?: any;

  /**
   * Whether the cell is currently selected
   */
  isSelected: boolean;

  /**
   * Whether the cell is the active cell (has focus)
   */
  isActive: boolean;

  /**
   * Whether the cell is currently being edited
   */
  isEditing: boolean;
}

/**
 * Cell renderer interface
 *
 * Renderers are responsible for displaying cell content in DOM elements.
 * They support both initial render and incremental updates for performance.
 */
export interface CellRenderer {
  /**
   * Initial render into a DOM element
   * Called when a cell is first displayed or when switching renderers
   *
   * @param element - DOM element to render into (from cell pool)
   * @param params - Rendering parameters
   */
  render(element: HTMLElement, params: RenderParams): void;

  /**
   * Update an existing rendered element
   * Called when cell value or state changes but renderer type remains the same
   * Should be optimized for frequent calls (e.g., during scrolling)
   *
   * @param element - DOM element to update
   * @param params - Updated rendering parameters
   */
  update(element: HTMLElement, params: RenderParams): void;

  /**
   * Cleanup before element is returned to pool
   * Called when cell is scrolled out of view
   *
   * @param element - DOM element to cleanup
   */
  destroy(element: HTMLElement): void;

  /**
   * Optional: Get CSS class to apply to the cell based on its state
   * Useful for conditional styling
   *
   * @param params - Rendering parameters
   * @returns CSS class name or undefined
   */
  getCellClass?(params: RenderParams): string | undefined;
}
