import type {
  IRTree,
  Rectangle,
  RTreeData,
  RTreeOptions,
  RTreeSearchResult,
  RTreeStats,
} from './rtree.interface';

/**
 * R-Tree Node
 */
interface RTreeNode<T> {
  /** Child nodes (for internal nodes) or data items (for leaves) */
  children: (RTreeNode<T> | RTreeData<T>)[];

  /** Bounding box of all children */
  bbox: Rectangle;

  /** Height of this node */
  height: number;

  /** Is this a leaf node? */
  leaf: boolean;
}

/**
 * R-Tree - Spatial Index Data Structure
 *
 * An R-Tree is a tree data structure for indexing spatial data.
 * It groups nearby objects and represents them with their minimum bounding rectangle (MBR).
 *
 * **Time Complexity:**
 * - Insert: O(log n) average, O(n) worst case
 * - Search: O(log n + k) where k = number of results
 * - Delete: O(log n) average
 *
 * **Space Complexity:** O(n)
 *
 * **Use Cases in Grid:**
 * - Hit testing: Find cell at mouse coordinates - O(log n)
 * - Range queries: Find all cells in viewport - O(log n + k)
 * - Merged cells: Detect overlapping cell ranges
 * - Selection optimization: Quickly find cells in selection rect
 */
export class RTree<T = any> implements IRTree<T> {
  private root: RTreeNode<T>;
  private options: Required<RTreeOptions>;
  private itemCount: number = 0;

  constructor(options: RTreeOptions = {}) {
    this.options = {
      maxEntries: options.maxEntries ?? 9,
      minEntries: options.minEntries ?? Math.max(2, Math.ceil((options.maxEntries ?? 9) * 0.4)),
    };

    this.root = this.createNode([], 1, true);
  }

  /**
   * Insert an item into the R-Tree
   */
  insert(rect: Rectangle, data: T): void {
    const item: RTreeData<T> = { rect, data };
    this.insertItem(item);
    this.itemCount++;
  }

  /**
   * Search for items intersecting a rectangle
   */
  search(rect: Rectangle): RTreeSearchResult<T>[] {
    const results: RTreeSearchResult<T>[] = [];
    if (this.itemCount > 0) {
      this.searchNode(rect, this.root, results);
    }
    return results;
  }

  /**
   * Search for items at a specific point
   */
  searchAtPoint(x: number, y: number): RTreeSearchResult<T>[] {
    return this.search({
      minX: x,
      minY: y,
      maxX: x,
      maxY: y,
    });
  }

  /**
   * Find nearest neighbors to a point
   */
  nearest(x: number, y: number, maxResults: number = 1, maxDistance: number = Infinity): RTreeSearchResult<T>[] {
    const queue: Array<{ node: RTreeNode<T> | RTreeData<T>; dist: number; isItem: boolean }> = [];
    const results: RTreeSearchResult<T>[] = [];

    let furthestDist = maxDistance;

    // Start with root
    queue.push({
      node: this.root,
      dist: this.rectangleDistanceTo(this.root.bbox, x, y),
      isItem: false,
    });

    while (queue.length > 0) {
      queue.sort((a, b) => a.dist - b.dist);
      const current = queue.shift()!;

      if (current.dist > furthestDist) continue;

      if (current.isItem) {
        const item = current.node as RTreeData<T>;
        results.push({
          rect: item.rect,
          data: item.data,
          distance: current.dist,
        });

        if (results.length === maxResults) {
          furthestDist = results[results.length - 1].distance!;
        }
      } else {
        const node = current.node as RTreeNode<T>;

        for (const child of node.children) {
          const childBox = this.isNode(child) ? child.bbox : child.rect;
          const dist = this.rectangleDistanceTo(childBox, x, y);

          if (dist <= furthestDist) {
            queue.push({
              node: child,
              dist,
              isItem: !this.isNode(child),
            });
          }
        }
      }

      if (results.length === maxResults && (queue.length === 0 || queue[0].dist > furthestDist)) {
        break;
      }
    }

    return results.slice(0, maxResults);
  }

  /**
   * Remove an item from the tree
   */
  remove(rect: Rectangle, data?: T): boolean {
    const path: RTreeNode<T>[] = [];
    const toRemove: RTreeData<T>[] = [];

    this.findItem(rect, data, this.root, path, toRemove);

    if (toRemove.length === 0) return false;

    const removed = toRemove[0];
    const node = path[path.length - 1];
    const index = node.children.indexOf(removed);

    if (index !== -1) {
      node.children.splice(index, 1);
      this.itemCount--;

      for (let i = path.length - 1; i >= 0; i--) {
        if (path[i].children.length === 0) {
          if (i > 0) {
            const parent = path[i - 1];
            parent.children.splice(parent.children.indexOf(path[i]), 1);
          } else {
            this.root = this.createNode([], 1, true);
          }
        } else {
          this.calcBBox(path[i]);
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Clear all items from the tree
   */
  clear(): void {
    this.root = this.createNode([], 1, true);
    this.itemCount = 0;
  }

  /**
   * Get all items in the tree
   */
  all(): RTreeSearchResult<T>[] {
    const results: RTreeSearchResult<T>[] = [];
    if (this.itemCount > 0) {
      this.getAllItems(this.root, results);
    }
    return results;
  }

  /**
   * Check if the tree is empty
   */
  isEmpty(): boolean {
    return this.itemCount === 0;
  }

  /**
   * Get statistics about the tree
   */
  getStats(): RTreeStats {
    let nodeCount = 0;
    const countNodes = (node: RTreeNode<T>): void => {
      nodeCount++;
      if (!node.leaf) {
        for (const child of node.children) {
          countNodes(child as RTreeNode<T>);
        }
      }
    };

    if (this.itemCount > 0) {
      countNodes(this.root);
    }

    return {
      size: this.itemCount,
      height: this.root.height,
      nodeCount,
      bounds: this.itemCount > 0 ? this.root.bbox : null,
    };
  }

  /**
   * Rebuild the tree for better performance
   */
  rebuild(): void {
    if (this.itemCount === 0) return;

    const items = this.all().map(r => ({ rect: r.rect, data: r.data }));
    this.clear();

    items.forEach(item => this.insert(item.rect, item.data));
  }

  // ==================== Private Methods ====================

  private createNode(children: (RTreeNode<T> | RTreeData<T>)[], height: number, leaf: boolean): RTreeNode<T> {
    const node: RTreeNode<T> = {
      children,
      bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      height,
      leaf,
    };

    if (children.length > 0) {
      this.calcBBox(node);
    }

    return node;
  }

  private isNode(obj: any): obj is RTreeNode<T> {
    return obj && 'children' in obj && 'height' in obj;
  }

  private calcBBox(node: RTreeNode<T>): void {
    if (node.children.length === 0) {
      node.bbox = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      return;
    }

    const first = node.children[0];
    const firstBox = this.isNode(first) ? first.bbox : first.rect;

    node.bbox = {
      minX: firstBox.minX,
      minY: firstBox.minY,
      maxX: firstBox.maxX,
      maxY: firstBox.maxY,
    };

    for (let i = 1; i < node.children.length; i++) {
      const child = node.children[i];
      const childBox = this.isNode(child) ? child.bbox : child.rect;
      this.extendBBox(node.bbox, childBox);
    }
  }

  private extendBBox(a: Rectangle, b: Rectangle): void {
    a.minX = Math.min(a.minX, b.minX);
    a.minY = Math.min(a.minY, b.minY);
    a.maxX = Math.max(a.maxX, b.maxX);
    a.maxY = Math.max(a.maxY, b.maxY);
  }

  private intersects(a: Rectangle, b: Rectangle): boolean {
    return b.minX <= a.maxX && b.minY <= a.maxY && b.maxX >= a.minX && b.maxY >= a.minY;
  }

  private rectangleDistanceTo(rect: Rectangle, x: number, y: number): number {
    const dx = Math.max(rect.minX - x, 0, x - rect.maxX);
    const dy = Math.max(rect.minY - y, 0, y - rect.maxY);
    return Math.sqrt(dx * dx + dy * dy);
  }

  private searchNode(rect: Rectangle, node: RTreeNode<T>, results: RTreeSearchResult<T>[]): void {
    if (!node || !node.bbox) return;
    if (!this.intersects(rect, node.bbox)) return;

    if (node.leaf) {
      for (const item of node.children as RTreeData<T>[]) {
        if (item && item.rect && this.intersects(rect, item.rect)) {
          results.push({
            rect: item.rect,
            data: item.data,
          });
        }
      }
    } else {
      for (const child of node.children as RTreeNode<T>[]) {
        if (child && child.bbox) {
          this.searchNode(rect, child, results);
        }
      }
    }
  }

  private insertItem(item: RTreeData<T>): void {
    const bbox = item.rect;
    const insertPath: RTreeNode<T>[] = [];

    // Find leaf node to insert into
    let node = this.root;
    insertPath.push(node);

    // Navigate down to leaf level
    while (!node.leaf) {
      if (node.children.length === 0) {
        // Empty internal node - shouldn't happen but handle gracefully
        break;
      }

      let best = node.children[0] as RTreeNode<T>;
      let minEnlargement = this.enlargementNeeded(best.bbox, bbox);

      for (let i = 1; i < node.children.length; i++) {
        const child = node.children[i] as RTreeNode<T>;
        const enlargement = this.enlargementNeeded(child.bbox, bbox);

        if (enlargement < minEnlargement ||
            (enlargement === minEnlargement && this.area(child.bbox) < this.area(best.bbox))) {
          minEnlargement = enlargement;
          best = child;
        }
      }

      node = best;
      insertPath.push(node);
    }

    // Insert the item into leaf
    node.children.push(item);
    this.extendBBox(node.bbox, bbox);

    // Propagate changes upward and split if needed
    let level = insertPath.length - 1;
    while (level >= 0) {
      const current = insertPath[level];

      if (current.children.length > this.options.maxEntries) {
        const parent = level > 0 ? insertPath[level - 1] : undefined;
        this.split(current, parent);

        // Recalculate bbox for parent
        if (parent) {
          this.calcBBox(parent);
        }
      } else {
        // Just update bbox
        if (level > 0) {
          this.calcBBox(insertPath[level - 1]);
        }
      }

      level--;
    }
  }

  private enlargementNeeded(a: Rectangle, b: Rectangle): number {
    const currentArea = this.area(a);

    const newMinX = Math.min(a.minX, b.minX);
    const newMinY = Math.min(a.minY, b.minY);
    const newMaxX = Math.max(a.maxX, b.maxX);
    const newMaxY = Math.max(a.maxY, b.maxY);

    const newArea = (newMaxX - newMinX) * (newMaxY - newMinY);

    return newArea - currentArea;
  }

  private area(rect: Rectangle): number {
    return (rect.maxX - rect.minX) * (rect.maxY - rect.minY);
  }

  private split(node: RTreeNode<T>, parent?: RTreeNode<T>): void {
    const children = node.children;
    const midIndex = Math.ceil(children.length / 2);

    const left = children.slice(0, midIndex);
    const right = children.slice(midIndex);

    if (parent) {
      // Update current node with left children
      node.children = left;
      this.calcBBox(node);

      // Create sibling with right children
      const sibling = this.createNode(right, node.height, node.leaf);

      // Remove old node from parent and add both
      const nodeIndex = parent.children.indexOf(node);
      if (nodeIndex !== -1) {
        parent.children[nodeIndex] = node;
      }
      parent.children.push(sibling);
    } else {
      // Root split - create new root
      const leftNode = this.createNode(left, node.height, node.leaf);
      const rightNode = this.createNode(right, node.height, node.leaf);

      this.root = this.createNode([leftNode, rightNode], node.height + 1, false);
    }
  }

  private findItem(
    rect: Rectangle,
    data: T | undefined,
    node: RTreeNode<T>,
    path: RTreeNode<T>[],
    result: RTreeData<T>[]
  ): void {
    if (result.length > 0) return;

    if (node.leaf) {
      for (const item of node.children as RTreeData<T>[]) {
        if (
          this.rectanglesEqual(item.rect, rect) &&
          (data === undefined || item.data === data)
        ) {
          result.push(item);
          path.push(node);
          return;
        }
      }
    } else {
      for (const child of node.children as RTreeNode<T>[]) {
        if (this.intersects(child.bbox, rect)) {
          path.push(node);
          this.findItem(rect, data, child, path, result);
          if (result.length > 0) return;
          path.pop();
        }
      }
    }
  }

  private rectanglesEqual(a: Rectangle, b: Rectangle): boolean {
    return a.minX === b.minX && a.minY === b.minY && a.maxX === b.maxX && a.maxY === b.maxY;
  }

  private getAllItems(node: RTreeNode<T>, results: RTreeSearchResult<T>[]): void {
    if (node.leaf) {
      for (const item of node.children as RTreeData<T>[]) {
        results.push({
          rect: item.rect,
          data: item.data,
        });
      }
    } else {
      for (const child of node.children as RTreeNode<T>[]) {
        this.getAllItems(child, results);
      }
    }
  }
}
