/**
 * Interval Tree implementation
 * Augmented BST for efficient interval queries
 */

import type {
  IIntervalTree,
  Interval,
  IntervalData,
  IntervalTreeOptions,
} from './interval-tree.interface';
import { IntervalUtils } from './interval-tree.interface';

/**
 * Internal tree node
 */
class IntervalNode<T> {
  interval: IntervalData<T>;
  max: number; // Maximum endpoint in this subtree
  left: IntervalNode<T> | null = null;
  right: IntervalNode<T> | null = null;
  height: number = 1;

  constructor(interval: IntervalData<T>) {
    this.interval = interval;
    this.max = interval.end;
  }
}

/**
 * Interval Tree - Augmented BST for interval queries
 *
 * Implementation:
 * - Each node stores an interval and the max endpoint in its subtree
 * - Balanced using AVL tree rotations for guaranteed O(log n) operations
 * - Intervals are ordered by start time
 *
 * @example
 * ```typescript
 * const tree = new IntervalTree<string>();
 * tree.insert({ start: 10, end: 20 }, 'A');
 * tree.insert({ start: 15, end: 25 }, 'B');
 * tree.insert({ start: 30, end: 40 }, 'C');
 *
 * tree.search({ start: 18, end: 22 }); // Returns A and B
 * tree.searchPoint(35); // Returns C
 * ```
 */
export class IntervalTree<T> implements IIntervalTree<T> {
  private root: IntervalNode<T> | null = null;
  private count: number = 0;
  private nextId: number = 0;
  private readonly balanced: boolean;
  private readonly allowDuplicates: boolean;
  private readonly comparator: (a: Interval, b: Interval) => number;

  constructor(options: IntervalTreeOptions = {}) {
    this.balanced = options.balanced ?? false;
    this.allowDuplicates = options.allowDuplicates ?? true;
    this.comparator = options.comparator ?? IntervalUtils.defaultComparator;
  }

  /**
   * Insert an interval
   */
  insert(interval: Interval, data: T): IntervalData<T> {
    const intervalData: IntervalData<T> = {
      ...interval,
      data,
      id: this.nextId++,
    };

    this.root = this.insertNode(this.root, intervalData);
    this.count++;
    return intervalData;
  }

  private insertNode(
    node: IntervalNode<T> | null,
    interval: IntervalData<T>
  ): IntervalNode<T> {
    // Standard BST insert
    if (node === null) {
      return new IntervalNode(interval);
    }

    const cmp = this.comparator(interval, node.interval);

    if (cmp < 0 || (cmp === 0 && this.allowDuplicates)) {
      node.left = this.insertNode(node.left, interval);
    } else if (cmp > 0 || (cmp === 0 && this.allowDuplicates)) {
      node.right = this.insertNode(node.right, interval);
    } else {
      // Duplicate not allowed
      return node;
    }

    // Update max for this node
    node.max = Math.max(
      node.interval.end,
      node.left?.max ?? -Infinity,
      node.right?.max ?? -Infinity
    );

    if (this.balanced) {
      // Update height
      node.height =
        1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));

      // Balance the tree
      return this.balance(node);
    }

    return node;
  }

  /**
   * Delete an interval
   */
  delete(intervalData: IntervalData<T>): boolean {
    const sizeBefore = this.count;
    this.root = this.deleteNode(this.root, intervalData);
    return this.count < sizeBefore;
  }

  private deleteNode(
    node: IntervalNode<T> | null,
    interval: IntervalData<T>
  ): IntervalNode<T> | null {
    if (node === null) {
      return null;
    }

    // Check if this is the node to delete
    if (node.interval.id === interval.id) {
      this.count--;

      // Case 1: Leaf node
      if (node.left === null && node.right === null) {
        return null;
      }

      // Case 2: One child
      if (node.left === null) {
        return node.right;
      }
      if (node.right === null) {
        return node.left;
      }

      // Case 3: Two children
      // Find inorder successor (min in right subtree)
      const successor = this.findMinNode(node.right);
      if (successor) {
        node.interval = successor.interval;
        node.right = this.deleteNode(node.right, successor.interval);
      }
    } else {
      const cmp = this.comparator(interval, node.interval);

      if (cmp < 0) {
        node.left = this.deleteNode(node.left, interval);
      } else {
        node.right = this.deleteNode(node.right, interval);
      }
    }

    // Update max
    node.max = Math.max(
      node.interval.end,
      node.left?.max ?? -Infinity,
      node.right?.max ?? -Infinity
    );

    if (this.balanced) {
      // Update height
      node.height =
        1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));

      // Balance the tree
      return this.balance(node);
    }

    return node;
  }

  /**
   * Delete by ID
   */
  deleteById(id: string | number): boolean {
    // Find the interval with this ID
    const interval = this.findById(this.root, id);
    if (interval) {
      return this.delete(interval);
    }
    return false;
  }

  private findById(
    node: IntervalNode<T> | null,
    id: string | number
  ): IntervalData<T> | null {
    if (node === null) return null;
    if (node.interval.id === id) return node.interval;

    const left = this.findById(node.left, id);
    if (left) return left;

    return this.findById(node.right, id);
  }

  /**
   * Find all overlapping intervals
   */
  search(interval: Interval): IntervalData<T>[] {
    const result: IntervalData<T>[] = [];
    this.searchOverlap(this.root, interval, result);
    return result;
  }

  private searchOverlap(
    node: IntervalNode<T> | null,
    interval: Interval,
    result: IntervalData<T>[]
  ): void {
    if (node === null) {
      return;
    }

    // If left subtree exists and its max >= interval.start, search left
    if (node.left && node.left.max >= interval.start) {
      this.searchOverlap(node.left, interval, result);
    }

    // Check current node
    if (IntervalUtils.overlaps(node.interval, interval)) {
      result.push(node.interval);
    }

    // If current node's start <= interval.end, search right
    if (node.interval.start <= interval.end) {
      this.searchOverlap(node.right, interval, result);
    }
  }

  /**
   * Find all intervals containing a point
   */
  searchPoint(point: number): IntervalData<T>[] {
    return this.search({ start: point, end: point });
  }

  /**
   * Find all intervals contained within the given interval
   */
  searchContained(interval: Interval): IntervalData<T>[] {
    const result: IntervalData<T>[] = [];
    this.searchContainedHelper(this.root, interval, result);
    return result;
  }

  private searchContainedHelper(
    node: IntervalNode<T> | null,
    interval: Interval,
    result: IntervalData<T>[]
  ): void {
    if (node === null) return;

    // Search left
    if (node.left) {
      this.searchContainedHelper(node.left, interval, result);
    }

    // Check current node
    if (IntervalUtils.containsInterval(interval, node.interval)) {
      result.push(node.interval);
    }

    // Search right
    if (node.right) {
      this.searchContainedHelper(node.right, interval, result);
    }
  }

  /**
   * Find all intervals containing the given interval
   */
  searchContaining(interval: Interval): IntervalData<T>[] {
    const result: IntervalData<T>[] = [];
    this.searchContainingHelper(this.root, interval, result);
    return result;
  }

  private searchContainingHelper(
    node: IntervalNode<T> | null,
    interval: Interval,
    result: IntervalData<T>[]
  ): void {
    if (node === null) return;

    // Search left
    if (node.left) {
      this.searchContainingHelper(node.left, interval, result);
    }

    // Check current node
    if (IntervalUtils.containsInterval(node.interval, interval)) {
      result.push(node.interval);
    }

    // Search right
    if (node.right) {
      this.searchContainingHelper(node.right, interval, result);
    }
  }

  /**
   * Find minimum interval (by start time)
   */
  findMin(): IntervalData<T> | undefined {
    const node = this.findMinNode(this.root);
    return node?.interval;
  }

  private findMinNode(node: IntervalNode<T> | null): IntervalNode<T> | null {
    if (node === null) return null;
    while (node.left !== null) {
      node = node.left;
    }
    return node;
  }

  /**
   * Find maximum interval (by max endpoint in tree)
   */
  findMax(): IntervalData<T> | undefined {
    if (this.root === null) return undefined;
    return this.findMaxHelper(this.root);
  }

  private findMaxHelper(node: IntervalNode<T>): IntervalData<T> {
    // Find the interval with the maximum endpoint
    let maxInterval = node.interval;

    if (node.left) {
      const leftMax = this.findMaxHelper(node.left);
      if (leftMax.end > maxInterval.end) {
        maxInterval = leftMax;
      }
    }

    if (node.right) {
      const rightMax = this.findMaxHelper(node.right);
      if (rightMax.end > maxInterval.end) {
        maxInterval = rightMax;
      }
    }

    return maxInterval;
  }

  /**
   * Check if any interval overlaps
   */
  hasOverlap(interval: Interval): boolean {
    return this.hasOverlapHelper(this.root, interval);
  }

  private hasOverlapHelper(
    node: IntervalNode<T> | null,
    interval: Interval
  ): boolean {
    if (node === null) return false;

    // Check left subtree
    if (node.left && node.left.max >= interval.start) {
      if (this.hasOverlapHelper(node.left, interval)) {
        return true;
      }
    }

    // Check current node
    if (IntervalUtils.overlaps(node.interval, interval)) {
      return true;
    }

    // Check right subtree
    if (node.interval.start <= interval.end) {
      return this.hasOverlapHelper(node.right, interval);
    }

    return false;
  }

  /**
   * Get all intervals in sorted order
   */
  inorder(): IntervalData<T>[] {
    const result: IntervalData<T>[] = [];
    this.inorderHelper(this.root, result);
    return result;
  }

  private inorderHelper(
    node: IntervalNode<T> | null,
    result: IntervalData<T>[]
  ): void {
    if (node === null) return;
    this.inorderHelper(node.left, result);
    result.push(node.interval);
    this.inorderHelper(node.right, result);
  }

  /**
   * Iterate over all intervals
   */
  forEach(callback: (interval: IntervalData<T>) => void): void {
    this.forEachHelper(this.root, callback);
  }

  private forEachHelper(
    node: IntervalNode<T> | null,
    callback: (interval: IntervalData<T>) => void
  ): void {
    if (node === null) return;
    this.forEachHelper(node.left, callback);
    callback(node.interval);
    this.forEachHelper(node.right, callback);
  }

  /**
   * Filter intervals
   */
  filter(predicate: (interval: IntervalData<T>) => boolean): IIntervalTree<T> {
    const result = new IntervalTree<T>({
      balanced: this.balanced,
      allowDuplicates: this.allowDuplicates,
      comparator: this.comparator,
    });

    this.forEach((interval) => {
      if (predicate(interval)) {
        result.insert(interval, interval.data);
      }
    });

    return result;
  }

  /**
   * Map intervals
   */
  map<U>(mapper: (data: T, interval: Interval) => U): IIntervalTree<U> {
    const result = new IntervalTree<U>({
      balanced: this.balanced,
      allowDuplicates: this.allowDuplicates,
      comparator: this.comparator,
    });

    this.forEach((interval) => {
      const newData = mapper(interval.data, interval);
      result.insert(interval, newData);
    });

    return result;
  }

  /**
   * Clear the tree
   */
  clear(): void {
    this.root = null;
    this.count = 0;
    this.nextId = 0;
  }

  /**
   * Get tree size
   */
  get size(): number {
    return this.count;
  }

  /**
   * Check if empty
   */
  get isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Get tree height
   */
  get height(): number {
    return this.getHeight(this.root);
  }

  private getHeight(node: IntervalNode<T> | null): number {
    return node?.height ?? 0;
  }

  /**
   * AVL balancing methods
   */
  private balance(node: IntervalNode<T>): IntervalNode<T> {
    const balanceFactor = this.getBalanceFactor(node);

    // Left heavy
    if (balanceFactor > 1) {
      if (node.left && this.getBalanceFactor(node.left) < 0) {
        // Left-Right case
        node.left = this.rotateLeft(node.left);
      }
      // Left-Left case
      return this.rotateRight(node);
    }

    // Right heavy
    if (balanceFactor < -1) {
      if (node.right && this.getBalanceFactor(node.right) > 0) {
        // Right-Left case
        node.right = this.rotateRight(node.right);
      }
      // Right-Right case
      return this.rotateLeft(node);
    }

    return node;
  }

  private getBalanceFactor(node: IntervalNode<T>): number {
    return this.getHeight(node.left) - this.getHeight(node.right);
  }

  private rotateLeft(node: IntervalNode<T>): IntervalNode<T> {
    const newRoot = node.right!;
    node.right = newRoot.left;
    newRoot.left = node;

    // Update heights
    node.height =
      1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
    newRoot.height =
      1 +
      Math.max(this.getHeight(newRoot.left), this.getHeight(newRoot.right));

    // Update max values
    node.max = Math.max(
      node.interval.end,
      node.left?.max ?? -Infinity,
      node.right?.max ?? -Infinity
    );
    newRoot.max = Math.max(
      newRoot.interval.end,
      newRoot.left?.max ?? -Infinity,
      newRoot.right?.max ?? -Infinity
    );

    return newRoot;
  }

  private rotateRight(node: IntervalNode<T>): IntervalNode<T> {
    const newRoot = node.left!;
    node.left = newRoot.right;
    newRoot.right = node;

    // Update heights
    node.height =
      1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
    newRoot.height =
      1 +
      Math.max(this.getHeight(newRoot.left), this.getHeight(newRoot.right));

    // Update max values
    node.max = Math.max(
      node.interval.end,
      node.left?.max ?? -Infinity,
      node.right?.max ?? -Infinity
    );
    newRoot.max = Math.max(
      newRoot.interval.end,
      newRoot.left?.max ?? -Infinity,
      newRoot.right?.max ?? -Infinity
    );

    return newRoot;
  }

  /**
   * Create IntervalTree from array of intervals
   */
  static from<T>(
    intervals: Array<{ interval: Interval; data: T }>,
    options?: IntervalTreeOptions
  ): IntervalTree<T> {
    const tree = new IntervalTree<T>(options);
    for (const { interval, data } of intervals) {
      tree.insert(interval, data);
    }
    return tree;
  }

  /**
   * Debug: Get tree structure as string
   */
  toString(): string {
    return `IntervalTree(${this.size} intervals, height: ${this.height}, balanced: ${this.balanced})`;
  }

  /**
   * Debug: Validate tree structure
   */
  validate(): boolean {
    return this.validateNode(this.root);
  }

  private validateNode(node: IntervalNode<T> | null): boolean {
    if (node === null) return true;

    // Check max value
    const expectedMax = Math.max(
      node.interval.end,
      node.left?.max ?? -Infinity,
      node.right?.max ?? -Infinity
    );
    if (node.max !== expectedMax) {
      return false;
    }

    // Check BST property
    if (node.left && this.comparator(node.left.interval, node.interval) > 0) {
      return false;
    }
    if (node.right && this.comparator(node.right.interval, node.interval) < 0) {
      return false;
    }

    // Recursively validate children
    return this.validateNode(node.left) && this.validateNode(node.right);
  }
}
