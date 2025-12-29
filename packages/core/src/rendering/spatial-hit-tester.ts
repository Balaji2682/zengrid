/**
 * Spatial Hit Tester using RTree
 *
 * Provides fast hit testing for finding cells at mouse/touch coordinates.
 */

import { RTree, type Rectangle } from '@zengrid/shared/data-structures/rtree';

/**
 * Cell reference
 */
export interface CellRef {
  row: number;
  col: number;
}

/**
 * SpatialHitTester - Fast hit testing using RTree spatial index
 *
 * Maintains a spatial index of rendered cells for O(log n) hit testing.
 *
 * @example
 * ```typescript
 * const hitTester = new SpatialHitTester();
 *
 * // Register cells as they're rendered
 * hitTester.registerCell(0, 0, { minX: 0, minY: 0, maxX: 100, maxY: 30 });
 * hitTester.registerCell(0, 1, { minX: 100, minY: 0, maxX: 200, maxY: 30 });
 *
 * // Find cell at mouse position
 * const cell = hitTester.getCellAtPoint(150, 15);
 * // { row: 0, col: 1 }
 * ```
 */
export class SpatialHitTester {
  private spatialIndex: RTree<CellRef> = new RTree();
  private renderedCells: Map<string, Rectangle> = new Map();

  /**
   * Register a rendered cell with its screen coordinates
   *
   * @param row - Row index
   * @param col - Column index
   * @param rect - Bounding rectangle on screen
   */
  registerCell(row: number, col: number, rect: Rectangle): void {
    const cellId = this.getCellId(row, col);

    // Remove old position if exists
    const oldRect = this.renderedCells.get(cellId);
    if (oldRect) {
      this.spatialIndex.remove(oldRect, { row, col });
    }

    // Add new position
    this.spatialIndex.insert(rect, { row, col });
    this.renderedCells.set(cellId, rect);
  }

  /**
   * Unregister a cell (e.g., when it scrolls out of view)
   *
   * @param row - Row index
   * @param col - Column index
   */
  unregisterCell(row: number, col: number): void {
    const cellId = this.getCellId(row, col);
    const rect = this.renderedCells.get(cellId);

    if (rect) {
      this.spatialIndex.remove(rect, { row, col });
      this.renderedCells.delete(cellId);
    }
  }

  /**
   * Find cell at mouse/touch coordinates
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Cell reference or null if no cell at point
   */
  getCellAtPoint(x: number, y: number): CellRef | null {
    const results = this.spatialIndex.searchAtPoint(x, y);

    // Return topmost cell (last in render order)
    return results.length > 0 ? results[results.length - 1].data : null;
  }

  /**
   * Find all cells in a rectangular region (e.g., selection box)
   *
   * @param rect - Search rectangle
   * @returns Array of cell references
   */
  getCellsInRect(rect: Rectangle): CellRef[] {
    return this.spatialIndex.search(rect).map(r => r.data);
  }

  /**
   * Find cells near a point (for touch targets with margin)
   *
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param maxDistance - Maximum distance in pixels
   * @param maxResults - Maximum number of results
   * @returns Array of nearest cells, sorted by distance
   */
  getCellsNear(x: number, y: number, maxDistance: number = 50, maxResults: number = 5): CellRef[] {
    return this.spatialIndex
      .nearest(x, y, maxResults, maxDistance)
      .map(r => r.data);
  }

  /**
   * Check if a cell is currently registered
   *
   * @param row - Row index
   * @param col - Column index
   * @returns true if cell is registered
   */
  hasCell(row: number, col: number): boolean {
    return this.renderedCells.has(this.getCellId(row, col));
  }

  /**
   * Get the bounding rectangle of a registered cell
   *
   * @param row - Row index
   * @param col - Column index
   * @returns Bounding rectangle or null if not registered
   */
  getCellRect(row: number, col: number): Rectangle | null {
    return this.renderedCells.get(this.getCellId(row, col)) ?? null;
  }

  /**
   * Clear all registered cells (e.g., on scroll or resize)
   */
  clear(): void {
    this.spatialIndex.clear();
    this.renderedCells.clear();
  }

  /**
   * Get statistics about the spatial index
   */
  getStats(): {
    cellCount: number;
    treeHeight: number;
    nodeCount: number;
  } {
    const stats = this.spatialIndex.getStats();

    return {
      cellCount: stats.size,
      treeHeight: stats.height,
      nodeCount: stats.nodeCount,
    };
  }

  /**
   * Generate unique cell ID
   */
  private getCellId(row: number, col: number): string {
    return `${row},${col}`;
  }
}
