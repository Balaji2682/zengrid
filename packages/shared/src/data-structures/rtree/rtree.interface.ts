/**
 * R-Tree (Spatial Index) Interface
 *
 * Used for:
 * - Efficient spatial queries (hit testing, range queries)
 * - Finding cells at point (x, y)
 * - Finding cells in rectangular region
 * - Merged cell detection
 * - Selection range optimization
 */

/**
 * 2D Rectangle (Axis-Aligned Bounding Box)
 */
export interface Rectangle {
  /**
   * Minimum X coordinate (left edge)
   */
  minX: number;

  /**
   * Minimum Y coordinate (top edge)
   */
  minY: number;

  /**
   * Maximum X coordinate (right edge)
   */
  maxX: number;

  /**
   * Maximum Y coordinate (bottom edge)
   */
  maxY: number;
}

/**
 * R-Tree node data
 */
export interface RTreeData<T = any> {
  /**
   * The bounding rectangle
   */
  rect: Rectangle;

  /**
   * Associated data
   */
  data: T;
}

/**
 * R-Tree search result
 */
export interface RTreeSearchResult<T = any> {
  /**
   * The bounding rectangle
   */
  rect: Rectangle;

  /**
   * Associated data
   */
  data: T;

  /**
   * Distance from query point (if applicable)
   */
  distance?: number;
}

/**
 * R-Tree configuration options
 */
export interface RTreeOptions {
  /**
   * Maximum entries per node
   * @default 9
   */
  maxEntries?: number;

  /**
   * Minimum entries per node
   * @default Math.ceil(maxEntries * 0.4)
   */
  minEntries?: number;
}

/**
 * R-Tree statistics
 */
export interface RTreeStats {
  /**
   * Total number of items in the tree
   */
  size: number;

  /**
   * Height of the tree
   */
  height: number;

  /**
   * Total number of nodes
   */
  nodeCount: number;

  /**
   * Bounding box of all items
   */
  bounds: Rectangle | null;
}

/**
 * R-Tree interface
 */
export interface IRTree<T = any> {
  /**
   * Insert an item into the tree
   */
  insert(rect: Rectangle, data: T): void;

  /**
   * Search for items intersecting a rectangle
   */
  search(rect: Rectangle): RTreeSearchResult<T>[];

  /**
   * Search for items at a specific point
   */
  searchAtPoint(x: number, y: number): RTreeSearchResult<T>[];

  /**
   * Find nearest neighbors to a point
   */
  nearest(x: number, y: number, maxResults?: number, maxDistance?: number): RTreeSearchResult<T>[];

  /**
   * Remove an item from the tree
   */
  remove(rect: Rectangle, data?: T): boolean;

  /**
   * Remove all items from the tree
   */
  clear(): void;

  /**
   * Get all items in the tree
   */
  all(): RTreeSearchResult<T>[];

  /**
   * Check if the tree is empty
   */
  isEmpty(): boolean;

  /**
   * Get statistics about the tree
   */
  getStats(): RTreeStats;

  /**
   * Rebuild the tree (optimize structure)
   */
  rebuild(): void;
}
