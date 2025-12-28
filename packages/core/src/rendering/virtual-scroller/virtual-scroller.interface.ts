import type { HeightProvider } from '../height-provider';
import type { WidthProvider } from '../width-provider';
import type { VisibleRange } from '../../types';

/**
 * Options for creating a VirtualScroller
 */
export interface VirtualScrollerOptions {
  /**
   * Total number of rows
   */
  rowCount: number;

  /**
   * Total number of columns
   */
  colCount: number;

  /**
   * Viewport width in pixels
   */
  viewportWidth: number;

  /**
   * Viewport height in pixels
   */
  viewportHeight: number;

  /**
   * Custom height provider (optional)
   * If not provided, auto-selected based on rowHeight
   */
  heightProvider?: HeightProvider;

  /**
   * Row height(s) - used if heightProvider not provided
   * - number: uniform height for all rows
   * - number[]: individual heights per row
   * @default 30
   */
  rowHeight?: number | number[];

  /**
   * Custom width provider (optional)
   * If not provided, auto-selected based on colWidth
   */
  widthProvider?: WidthProvider;

  /**
   * Column width(s) - used if widthProvider not provided
   * - number: uniform width for all columns
   * - number[]: individual widths per column
   * @default 100
   */
  colWidth?: number | number[];

  /**
   * Number of rows to render beyond visible area (buffer)
   * @default 3
   */
  overscanRows?: number;

  /**
   * Number of columns to render beyond visible area (buffer)
   * @default 2
   */
  overscanCols?: number;
}

/**
 * Cell position and dimensions
 */
export interface CellPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * VirtualScroller interface
 *
 * Calculates which rows and columns are visible based on scroll position.
 * Uses HeightProvider and WidthProvider strategies for flexible dimension handling.
 */
export interface VirtualScroller {
  /**
   * Calculate the visible range of rows and columns
   * @param scrollTop - Vertical scroll position in pixels
   * @param scrollLeft - Horizontal scroll position in pixels
   * @returns Visible range with overscan buffer
   */
  calculateVisibleRange(scrollTop: number, scrollLeft: number): VisibleRange;

  /**
   * Get the position and dimensions of a specific cell
   * @param row - Row index
   * @param col - Column index
   * @returns Cell position (x, y, width, height)
   */
  getCellPosition(row: number, col: number): CellPosition;

  /**
   * Find which row is at a given Y offset
   * @param offset - Y position in pixels
   * @returns Row index
   */
  getRowAtOffset(offset: number): number;

  /**
   * Find which column is at a given X offset
   * @param offset - X position in pixels
   * @returns Column index
   */
  getColAtOffset(offset: number): number;

  /**
   * Get the Y offset where a row starts
   * @param row - Row index
   * @returns Y offset in pixels
   */
  getRowOffset(row: number): number;

  /**
   * Get the X offset where a column starts
   * @param col - Column index
   * @returns X offset in pixels
   */
  getColOffset(col: number): number;

  /**
   * Get the height of a specific row
   * @param row - Row index
   * @returns Height in pixels
   */
  getRowHeight(row: number): number;

  /**
   * Get the width of a specific column
   * @param col - Column index
   * @returns Width in pixels
   */
  getColWidth(col: number): number;

  /**
   * Get the total height of all rows
   * @returns Total height in pixels
   */
  getTotalHeight(): number;

  /**
   * Get the total width of all columns
   * @returns Total width in pixels
   */
  getTotalWidth(): number;

  /**
   * Update the height of a specific row
   * @param row - Row index
   * @param height - New height in pixels
   */
  updateRowHeight(row: number, height: number): void;

  /**
   * Update the width of a specific column
   * @param col - Column index
   * @param width - New width in pixels
   */
  updateColWidth(col: number, width: number): void;

  /**
   * Update the viewport dimensions
   * @param width - New viewport width
   * @param height - New viewport height
   */
  setViewport(width: number, height: number): void;

  /**
   * Total number of rows
   */
  readonly rowCount: number;

  /**
   * Total number of columns
   */
  readonly colCount: number;

  /**
   * Viewport width in pixels
   */
  readonly viewportWidth: number;

  /**
   * Viewport height in pixels
   */
  readonly viewportHeight: number;
}
