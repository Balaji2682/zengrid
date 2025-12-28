/**
 * Options for creating a CellPool
 */
export interface CellPoolOptions {
  /**
   * Parent container element for pooled cells
   */
  container: HTMLElement;

  /**
   * Number of cells to pre-create
   * @default 100
   */
  initialSize?: number;

  /**
   * Maximum number of cells to keep in pool
   * Excess cells are removed from DOM
   * @default 500
   */
  maxSize?: number;
}

/**
 * Pool statistics
 */
export interface CellPoolStats {
  /**
   * Number of cells currently in use
   */
  active: number;

  /**
   * Number of cells available in pool
   */
  pooled: number;

  /**
   * Total number of cells (active + pooled)
   */
  total: number;
}

/**
 * CellPool interface
 *
 * Manages a pool of reusable DOM elements for cells.
 * Reduces DOM creation/destruction overhead during scrolling.
 */
export interface CellPool {
  /**
   * Acquire a cell element from the pool
   * Returns existing active cell if already acquired with this key
   *
   * @param key - Unique cell identifier (e.g., "row-col")
   * @returns DOM element for the cell
   */
  acquire(key: string): HTMLElement;

  /**
   * Release a cell back to the pool
   * Cleans up the element and makes it available for reuse
   *
   * @param key - Cell identifier
   */
  release(key: string): void;

  /**
   * Release all cells except those in the provided set
   * Useful for releasing cells that scrolled out of view
   *
   * @param activeKeys - Set of keys to keep active
   */
  releaseExcept(activeKeys: Set<string>): void;

  /**
   * Get pool statistics
   */
  readonly stats: CellPoolStats;

  /**
   * Clear all cells from pool and DOM
   */
  clear(): void;
}
