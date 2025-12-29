/**
 * @fileoverview Hit testing for mouse interaction with grid cells
 * @module @zengrid/core/selection/hit-tester
 */

import type { CellRef } from '../types';
import type {
  HitTestResult,
  HitTestOptions,
  IHeightProvider,
  IWidthProvider,
} from './hit-tester.interface';

/**
 * HitTester - Determines which cell is at given coordinates
 *
 * Supports both uniform and variable cell sizes with optimal performance:
 * - O(1) for uniform sizes
 * - O(log n) for variable sizes (using binary search)
 *
 * @example
 * ```typescript
 * const hitTester = new HitTester(heightProvider, widthProvider, {
 *   rowCount: 1000,
 *   colCount: 26
 * });
 *
 * // Find cell at mouse position
 * const result = hitTester.getCellAtPoint(150, 300);
 * if (result.hit) {
 *   console.log(`Clicked cell: ${result.cell.row}, ${result.cell.col}`);
 * }
 * ```
 */
export class HitTester {
  private heightProvider: IHeightProvider;
  private widthProvider: IWidthProvider;
  private rowCount: number;
  private colCount: number;

  constructor(
    heightProvider: IHeightProvider,
    widthProvider: IWidthProvider,
    options: { rowCount: number; colCount: number }
  ) {
    this.heightProvider = heightProvider;
    this.widthProvider = widthProvider;
    this.rowCount = options.rowCount;
    this.colCount = options.colCount;
  }

  /**
   * Finds the cell at given point coordinates
   *
   * @param x - X coordinate (in grid space, not viewport)
   * @param y - Y coordinate (in grid space, not viewport)
   * @param options - Hit test options
   * @returns Hit test result
   *
   * @example
   * ```typescript
   * const result = hitTester.getCellAtPoint(150, 300);
   * if (result.hit) {
   *   console.log(`Cell: ${result.cell.row}, ${result.cell.col}`);
   * }
   * ```
   */
  getCellAtPoint(x: number, y: number, options: HitTestOptions = {}): HitTestResult {
    const { allowOutside = false, includePreciseOffset = false, scrollOffset } = options;

    // Adjust for scroll offset if provided
    let adjustedX = x;
    let adjustedY = y;

    if (scrollOffset) {
      adjustedX += scrollOffset.left;
      adjustedY += scrollOffset.top;
    }

    // Find row at Y coordinate
    const row = this.heightProvider.findIndexAtOffset(adjustedY);
    const col = this.widthProvider.findIndexAtOffset(adjustedX);

    // Check if within grid boundaries
    const withinBounds = row >= 0 && row < this.rowCount && col >= 0 && col < this.colCount;

    if (!withinBounds && !allowOutside) {
      return { hit: false };
    }

    // Clamp to grid boundaries if allowing outside
    const clampedRow = Math.max(0, Math.min(row, this.rowCount - 1));
    const clampedCol = Math.max(0, Math.min(col, this.colCount - 1));

    const cell: CellRef = { row: clampedRow, col: clampedCol };

    // Build basic result
    const result: HitTestResult = {
      hit: true,
      cell,
    };

    // Add precise offset information if requested
    if (includePreciseOffset) {
      const cellLeft = this.widthProvider.getOffset(clampedCol);
      const cellTop = this.heightProvider.getOffset(clampedRow);
      const cellWidth = this.widthProvider.getWidth(clampedCol);
      const cellHeight = this.heightProvider.getHeight(clampedRow);

      result.cellLeft = cellLeft;
      result.cellTop = cellTop;
      result.cellWidth = cellWidth;
      result.cellHeight = cellHeight;

      // Calculate normalized offset within cell (0-1)
      result.cellOffsetX = Math.max(0, Math.min(1, (adjustedX - cellLeft) / cellWidth));
      result.cellOffsetY = Math.max(0, Math.min(1, (adjustedY - cellTop) / cellHeight));
    }

    return result;
  }

  /**
   * Finds the cell at point, returns null if outside grid
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Cell reference or null
   *
   * @example
   * ```typescript
   * const cell = hitTester.getCellAtPointOrNull(150, 300);
   * if (cell) {
   *   console.log(`Clicked: ${cell.row}, ${cell.col}`);
   * }
   * ```
   */
  getCellAtPointOrNull(x: number, y: number): CellRef | null {
    const result = this.getCellAtPoint(x, y, { allowOutside: false });
    return result.hit ? result.cell! : null;
  }

  /**
   * Checks if a point is within the grid boundaries
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns True if point is within grid
   */
  isPointInGrid(x: number, y: number): boolean {
    const totalWidth = this.widthProvider.getTotalSize();
    const totalHeight = this.heightProvider.getTotalSize();

    return x >= 0 && x < totalWidth && y >= 0 && y < totalHeight;
  }

  /**
   * Gets the bounding box of a cell
   *
   * @param row - Row index
   * @param col - Column index
   * @returns Bounding box { left, top, width, height }
   */
  getCellBounds(row: number, col: number): { left: number; top: number; width: number; height: number } {
    if (row < 0 || row >= this.rowCount || col < 0 || col >= this.colCount) {
      throw new Error(`Cell out of bounds: row=${row}, col=${col}`);
    }

    return {
      left: this.widthProvider.getOffset(col),
      top: this.heightProvider.getOffset(row),
      width: this.widthProvider.getWidth(col),
      height: this.heightProvider.getHeight(row),
    };
  }

  /**
   * Checks if a point is within a specific cell
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param row - Row index
   * @param col - Column index
   * @returns True if point is within the cell
   */
  isPointInCell(x: number, y: number, row: number, col: number): boolean {
    const bounds = this.getCellBounds(row, col);

    return (
      x >= bounds.left &&
      x < bounds.left + bounds.width &&
      y >= bounds.top &&
      y < bounds.top + bounds.height
    );
  }

  /**
   * Gets the row at a given Y coordinate
   *
   * @param y - Y coordinate
   * @returns Row index or -1 if outside
   */
  getRowAtY(y: number): number {
    const row = this.heightProvider.findIndexAtOffset(y);
    return row >= 0 && row < this.rowCount ? row : -1;
  }

  /**
   * Gets the column at a given X coordinate
   *
   * @param x - X coordinate
   * @returns Column index or -1 if outside
   */
  getColAtX(x: number): number {
    const col = this.widthProvider.findIndexAtOffset(x);
    return col >= 0 && col < this.colCount ? col : -1;
  }

  /**
   * Converts viewport coordinates to grid coordinates
   *
   * @param viewportX - X in viewport space
   * @param viewportY - Y in viewport space
   * @param scrollLeft - Horizontal scroll position
   * @param scrollTop - Vertical scroll position
   * @returns Grid coordinates { x, y }
   */
  viewportToGrid(
    viewportX: number,
    viewportY: number,
    scrollLeft: number,
    scrollTop: number
  ): { x: number; y: number } {
    return {
      x: viewportX + scrollLeft,
      y: viewportY + scrollTop,
    };
  }

  /**
   * Converts grid coordinates to viewport coordinates
   *
   * @param gridX - X in grid space
   * @param gridY - Y in grid space
   * @param scrollLeft - Horizontal scroll position
   * @param scrollTop - Vertical scroll position
   * @returns Viewport coordinates { x, y }
   */
  gridToViewport(
    gridX: number,
    gridY: number,
    scrollLeft: number,
    scrollTop: number
  ): { x: number; y: number } {
    return {
      x: gridX - scrollLeft,
      y: gridY - scrollTop,
    };
  }

  /**
   * Updates the grid dimensions
   *
   * @param rowCount - New row count
   * @param colCount - New column count
   */
  updateDimensions(rowCount: number, colCount: number): void {
    this.rowCount = rowCount;
    this.colCount = colCount;
  }

  /**
   * Gets current grid dimensions
   *
   * @returns { rowCount, colCount }
   */
  getDimensions(): { rowCount: number; colCount: number } {
    return {
      rowCount: this.rowCount,
      colCount: this.colCount,
    };
  }
}

/**
 * Creates a HitTester instance
 *
 * @param heightProvider - Provider for row heights
 * @param widthProvider - Provider for column widths
 * @param rowCount - Total number of rows
 * @param colCount - Total number of columns
 * @returns HitTester instance
 */
export function createHitTester(
  heightProvider: IHeightProvider,
  widthProvider: IWidthProvider,
  rowCount: number,
  colCount: number
): HitTester {
  return new HitTester(heightProvider, widthProvider, { rowCount, colCount });
}
