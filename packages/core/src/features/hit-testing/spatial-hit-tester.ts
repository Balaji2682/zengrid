/**
 * SpatialHitTester - Efficient cell lookup using RTree
 *
 * Uses RTree from shared package for O(log n) spatial queries.
 * Particularly useful for:
 * - Merged cells
 * - Variable cell sizes
 * - Finding cells at mouse coordinates
 * - Viewport intersection queries
 */

import { RTree, type Rectangle } from '@zengrid/shared';

/**
 * Cell position in the grid
 */
export interface CellPosition {
  row: number;
  col: number;
}

/**
 * Cell bounds (in pixels)
 */
export interface CellBounds extends Rectangle {
  row: number;
  col: number;
}

/**
 * Hit test result
 */
export interface HitTestResult {
  row: number;
  col: number;
  bounds: Rectangle;
  distance?: number;
}

/**
 * Hit tester options
 */
export interface SpatialHitTesterOptions {
  /**
   * Enable merged cell support
   * @default false
   */
  supportMergedCells?: boolean;
}

/**
 * SpatialHitTester - Uses RTree for efficient spatial queries
 *
 * @example
 * ```typescript
 * const hitTester = new SpatialHitTester();
 *
 * // Index all visible cells
 * for (let row = 0; row < 100; row++) {
 *   for (let col = 0; col < 50; col++) {
 *     const bounds = getCellBounds(row, col);
 *     hitTester.indexCell(row, col, bounds);
 *   }
 * }
 *
 * // Find cell at mouse coordinates
 * const cell = hitTester.hitTest(mouseX, mouseY);
 * if (cell) {
 *   console.log(`Clicked cell: row=${cell.row}, col=${cell.col}`);
 * }
 *
 * // Find all cells in viewport
 * const visibleCells = hitTester.findCellsInRect({
 *   minX: viewportLeft,
 *   minY: viewportTop,
 *   maxX: viewportRight,
 *   maxY: viewportBottom,
 * });
 * ```
 */
export class SpatialHitTester {
  private rtree: RTree<CellPosition>;
  private supportMergedCells: boolean;

  // Cache for merged cells
  private mergedCells: Map<string, CellBounds> = new Map();

  constructor(options: SpatialHitTesterOptions = {}) {
    this.supportMergedCells = options.supportMergedCells ?? false;
    this.rtree = new RTree<CellPosition>({
      maxEntries: 16, // Optimize for grid queries
    });
  }

  /**
   * Index a cell for spatial queries
   */
  indexCell(row: number, col: number, bounds: Rectangle): void {
    this.rtree.insert(bounds, { row, col });
  }

  /**
   * Index a merged cell (spanning multiple rows/columns)
   */
  indexMergedCell(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
    bounds: Rectangle
  ): void {
    if (!this.supportMergedCells) {
      console.warn('Merged cells not enabled');
      return;
    }

    const key = this.getMergedCellKey(startRow, startCol, endRow, endCol);
    this.mergedCells.set(key, {
      ...bounds,
      row: startRow,
      col: startCol,
    });

    // Index the merged cell with the top-left cell position
    this.rtree.insert(bounds, { row: startRow, col: startCol });
  }

  /**
   * Hit test at a specific point
   * Returns the cell at the given coordinates
   */
  hitTest(x: number, y: number): HitTestResult | null {
    const results = this.rtree.searchAtPoint(x, y);

    if (results.length === 0) {
      return null;
    }

    // If multiple cells overlap (e.g., merged cells), return the first one
    // In a real implementation, you might want to return the top-most cell
    const result = results[0];

    return {
      row: result.data.row,
      col: result.data.col,
      bounds: result.rect,
    };
  }

  /**
   * Find the nearest cell to a point
   */
  hitTestNearest(x: number, y: number, maxDistance?: number): HitTestResult | null {
    const results = this.rtree.nearest(x, y, 1, maxDistance);

    if (results.length === 0) {
      return null;
    }

    const result = results[0];

    return {
      row: result.data.row,
      col: result.data.col,
      bounds: result.rect,
      distance: result.distance,
    };
  }

  /**
   * Find all cells intersecting a rectangle
   */
  findCellsInRect(rect: Rectangle): HitTestResult[] {
    const results = this.rtree.search(rect);

    return results.map((result) => ({
      row: result.data.row,
      col: result.data.col,
      bounds: result.rect,
    }));
  }

  /**
   * Find all cells in viewport
   */
  findCellsInViewport(
    viewportLeft: number,
    viewportTop: number,
    viewportRight: number,
    viewportBottom: number
  ): HitTestResult[] {
    return this.findCellsInRect({
      minX: viewportLeft,
      minY: viewportTop,
      maxX: viewportRight,
      maxY: viewportBottom,
    });
  }

  /**
   * Check if a cell is merged
   */
  isMergedCell(row: number, col: number): boolean {
    if (!this.supportMergedCells) {
      return false;
    }

    // Check if this cell is part of any merged cell
    for (const [key, bounds] of this.mergedCells) {
      const [startRow, startCol, endRow, endCol] = this.parseMergedCellKey(key);
      if (
        row >= startRow &&
        row <= endRow &&
        col >= startCol &&
        col <= endCol
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get merged cell info
   */
  getMergedCellInfo(row: number, col: number): CellBounds | null {
    if (!this.supportMergedCells) {
      return null;
    }

    for (const [key, bounds] of this.mergedCells) {
      const [startRow, startCol, endRow, endCol] = this.parseMergedCellKey(key);
      if (
        row >= startRow &&
        row <= endRow &&
        col >= startCol &&
        col <= endCol
      ) {
        return bounds;
      }
    }

    return null;
  }

  /**
   * Clear all indexed cells
   */
  clear(): void {
    this.rtree = new RTree<CellPosition>({
      maxEntries: 16,
    });
    this.mergedCells.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    indexedCells: number;
    mergedCells: number;
  } {
    return {
      indexedCells: this.rtree.size,
      mergedCells: this.mergedCells.size,
    };
  }

  /**
   * Generate key for merged cell
   */
  private getMergedCellKey(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ): string {
    return `${startRow},${startCol},${endRow},${endCol}`;
  }

  /**
   * Parse merged cell key
   */
  private parseMergedCellKey(key: string): [number, number, number, number] {
    const [startRow, startCol, endRow, endCol] = key.split(',').map(Number);
    return [startRow, startCol, endRow, endCol];
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.clear();
  }
}
