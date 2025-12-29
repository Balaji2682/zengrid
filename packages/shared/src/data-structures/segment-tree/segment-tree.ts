/**
 * Segment Tree implementation
 * Efficient range query and update data structure
 */

import type {
  ISegmentTree,
  SegmentTreeOptions,
  AggregateFunction,
} from './segment-tree.interface';
import { Aggregations, SegmentTreeUtils, AggregationType } from './segment-tree.interface';

/**
 * Segment Tree - Efficient range queries and updates
 *
 * Implementation:
 * - Array-based complete binary tree
 * - Each node stores the aggregate of its range
 * - Supports lazy propagation for efficient range updates
 * - Generic type T for flexibility (numbers, objects, etc.)
 *
 * @example
 * ```typescript
 * // Sum queries
 * const tree = new SegmentTree({ values: [1, 3, 5, 7, 9, 11], type: 'sum' });
 * tree.query(1, 3); // Returns 15 (3 + 5 + 7)
 * tree.update(1, 10); // Change 3 to 10
 * tree.query(1, 3); // Returns 22 (10 + 5 + 7)
 *
 * // Min queries
 * const minTree = new SegmentTree({ values: [5, 2, 8, 1, 9], type: 'min' });
 * minTree.query(0, 4); // Returns 1
 * minTree.update(3, 10);
 * minTree.query(0, 4); // Returns 2
 *
 * // Status bar aggregation example
 * const cellValues = [100, 200, 150, 300, 250];
 * const sumTree = new SegmentTree({ values: cellValues, type: 'sum' });
 * sumTree.query(1, 3); // Sum of cells 1-3: 650
 * ```
 */
export class SegmentTree<T> implements ISegmentTree<T> {
  private tree: T[];
  private lazy: T[];
  private arr: T[];
  private n: number;
  private aggregate: AggregateFunction<T>;
  private identityValue: T;
  private useLazy: boolean;
  private _type: AggregationType;

  constructor(options: SegmentTreeOptions<T>) {
    this.arr = options.values ? [...options.values] : [];
    this.n = this.arr.length;
    this._type = options.type ?? AggregationType.CUSTOM;
    this.useLazy = options.lazy ?? true;

    // Determine aggregation function and identity
    if (this._type === AggregationType.CUSTOM) {
      if (!options.customAggregate || options.identity === undefined) {
        throw new Error(
          'CUSTOM aggregation type requires customAggregate function and identity value'
        );
      }
      this.aggregate = options.customAggregate;
      this.identityValue = options.identity;
    } else {
      const aggConfig = this.getAggregationConfig(this._type);
      this.aggregate = aggConfig.fn as unknown as AggregateFunction<T>;
      this.identityValue = aggConfig.identity as unknown as T;
    }

    // Initialize tree and lazy arrays
    const treeSize = SegmentTreeUtils.getTreeSize(this.n);
    this.tree = new Array(treeSize).fill(this.identityValue);
    this.lazy = new Array(treeSize).fill(this.identityValue);

    // Build the tree
    if (this.n > 0) {
      this.buildTree(0, 0, this.n - 1);
    }
  }

  /**
   * Get aggregation configuration
   */
  private getAggregationConfig(type: AggregationType): {
    fn: (a: number, b: number) => number;
    identity: number;
  } {
    switch (type) {
      case AggregationType.SUM:
        return Aggregations.sum;
      case AggregationType.MIN:
        return Aggregations.min;
      case AggregationType.MAX:
        return Aggregations.max;
      case AggregationType.GCD:
        return Aggregations.gcd;
      case AggregationType.LCM:
        return Aggregations.lcm;
      case AggregationType.PRODUCT:
        return Aggregations.product;
      default:
        throw new Error(`Unknown aggregation type: ${type}`);
    }
  }

  /**
   * Build the segment tree recursively
   */
  private buildTree(node: number, start: number, end: number): void {
    if (start === end) {
      // Leaf node
      this.tree[node] = this.arr[start];
      return;
    }

    const mid = SegmentTreeUtils.mid(start, end);
    const leftChild = SegmentTreeUtils.leftChild(node);
    const rightChild = SegmentTreeUtils.rightChild(node);

    this.buildTree(leftChild, start, mid);
    this.buildTree(rightChild, mid + 1, end);

    this.tree[node] = this.aggregate(this.tree[leftChild], this.tree[rightChild]);
  }

  /**
   * Push lazy updates down to children
   */
  private pushDown(node: number, start: number, end: number): void {
    if (!this.useLazy || this.lazy[node] === this.identityValue) {
      return;
    }

    // Apply lazy value to current node
    this.tree[node] = this.applyUpdate(
      this.tree[node],
      this.lazy[node],
      end - start + 1
    );

    // Propagate to children if not a leaf
    if (start !== end) {
      const leftChild = SegmentTreeUtils.leftChild(node);
      const rightChild = SegmentTreeUtils.rightChild(node);

      this.lazy[leftChild] = this.aggregate(
        this.lazy[leftChild],
        this.lazy[node]
      );
      this.lazy[rightChild] = this.aggregate(
        this.lazy[rightChild],
        this.lazy[node]
      );
    }

    this.lazy[node] = this.identityValue;
  }

  /**
   * Apply update to a node value
   * For SUM: multiply update by range size
   * For MIN/MAX: just use the update value
   */
  private applyUpdate(nodeValue: T, updateValue: T, rangeSize: number): T {
    if (this._type === AggregationType.SUM) {
      // For sum, we need to multiply by range size
      const update = (updateValue as unknown as number) * rangeSize;
      return this.aggregate(
        nodeValue,
        update as unknown as T
      );
    }
    return this.aggregate(nodeValue, updateValue);
  }

  /**
   * Query range [left, right]
   */
  query(left: number, right: number): T {
    if (!SegmentTreeUtils.isValidRange(left, right, this.n)) {
      throw new RangeError(
        `Invalid range [${left}, ${right}] for array of size ${this.n}`
      );
    }

    if (this.n === 0) {
      return this.identityValue;
    }

    return this.queryTree(0, 0, this.n - 1, left, right);
  }

  /**
   * Recursive query helper
   */
  private queryTree(
    node: number,
    start: number,
    end: number,
    left: number,
    right: number
  ): T {
    // Push down lazy updates
    if (this.useLazy) {
      this.pushDown(node, start, end);
    }

    // No overlap
    if (start > right || end < left) {
      return this.identityValue;
    }

    // Total overlap
    if (start >= left && end <= right) {
      return this.tree[node];
    }

    // Partial overlap
    const mid = SegmentTreeUtils.mid(start, end);
    const leftChild = SegmentTreeUtils.leftChild(node);
    const rightChild = SegmentTreeUtils.rightChild(node);

    const leftResult = this.queryTree(leftChild, start, mid, left, right);
    const rightResult = this.queryTree(rightChild, mid + 1, end, left, right);

    return this.aggregate(leftResult, rightResult);
  }

  /**
   * Update a single element
   */
  update(index: number, value: T): void {
    if (!SegmentTreeUtils.isValidIndex(index, this.n)) {
      throw new RangeError(`Index ${index} out of bounds [0, ${this.n - 1}]`);
    }

    this.arr[index] = value;
    this.updateTree(0, 0, this.n - 1, index, value);
  }

  /**
   * Recursive update helper
   */
  private updateTree(
    node: number,
    start: number,
    end: number,
    index: number,
    value: T
  ): void {
    // Push down lazy updates
    if (this.useLazy) {
      this.pushDown(node, start, end);
    }

    if (start === end) {
      // Leaf node
      this.tree[node] = value;
      return;
    }

    const mid = SegmentTreeUtils.mid(start, end);
    const leftChild = SegmentTreeUtils.leftChild(node);
    const rightChild = SegmentTreeUtils.rightChild(node);

    if (index <= mid) {
      this.updateTree(leftChild, start, mid, index, value);
    } else {
      this.updateTree(rightChild, mid + 1, end, index, value);
    }

    this.tree[node] = this.aggregate(this.tree[leftChild], this.tree[rightChild]);
  }

  /**
   * Update a range [left, right]
   */
  rangeUpdate(left: number, right: number, value: T): void {
    if (!SegmentTreeUtils.isValidRange(left, right, this.n)) {
      throw new RangeError(
        `Invalid range [${left}, ${right}] for array of size ${this.n}`
      );
    }

    if (this.useLazy) {
      this.rangeUpdateLazy(0, 0, this.n - 1, left, right, value);
    } else {
      // Fallback to individual updates
      for (let i = left; i <= right; i++) {
        this.arr[i] = this.aggregate(this.arr[i], value);
        this.update(i, this.arr[i]);
      }
    }
  }

  /**
   * Lazy range update helper
   */
  private rangeUpdateLazy(
    node: number,
    start: number,
    end: number,
    left: number,
    right: number,
    value: T
  ): void {
    // Push down existing lazy updates
    this.pushDown(node, start, end);

    // No overlap
    if (start > right || end < left) {
      return;
    }

    // Total overlap
    if (start >= left && end <= right) {
      this.lazy[node] = this.aggregate(this.lazy[node], value);
      this.pushDown(node, start, end);
      return;
    }

    // Partial overlap
    const mid = SegmentTreeUtils.mid(start, end);
    const leftChild = SegmentTreeUtils.leftChild(node);
    const rightChild = SegmentTreeUtils.rightChild(node);

    this.rangeUpdateLazy(leftChild, start, mid, left, right, value);
    this.rangeUpdateLazy(rightChild, mid + 1, end, left, right, value);

    // Recalculate current node
    this.pushDown(leftChild, start, mid);
    this.pushDown(rightChild, mid + 1, end);
    this.tree[node] = this.aggregate(this.tree[leftChild], this.tree[rightChild]);
  }

  /**
   * Get value at index
   */
  get(index: number): T {
    if (!SegmentTreeUtils.isValidIndex(index, this.n)) {
      throw new RangeError(`Index ${index} out of bounds [0, ${this.n - 1}]`);
    }

    return this.query(index, index);
  }

  /**
   * Build tree from new array
   */
  build(arr: T[]): void {
    this.arr = [...arr];
    this.n = this.arr.length;

    const treeSize = SegmentTreeUtils.getTreeSize(this.n);
    this.tree = new Array(treeSize).fill(this.identityValue);
    this.lazy = new Array(treeSize).fill(this.identityValue);

    if (this.n > 0) {
      this.buildTree(0, 0, this.n - 1);
    }
  }

  /**
   * Convert tree to array
   */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.n; i++) {
      result.push(this.get(i));
    }
    return result;
  }

  /**
   * Find first index where predicate is true
   */
  findFirst(left: number, predicate: (value: T) => boolean): number {
    for (let i = left; i < this.n; i++) {
      const value = this.query(left, i);
      if (predicate(value)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Get size of array
   */
  get size(): number {
    return this.n;
  }

  /**
   * Get total aggregated value
   */
  get total(): T {
    if (this.n === 0) {
      return this.identityValue;
    }
    return this.query(0, this.n - 1);
  }

  /**
   * Get aggregation type
   */
  get aggregationType(): AggregationType {
    return this._type;
  }

  /**
   * Create SegmentTree from array
   */
  static from<T>(values: T[], type: AggregationType = AggregationType.SUM): SegmentTree<T> {
    return new SegmentTree<T>({ values, type });
  }

  /**
   * Create custom SegmentTree
   */
  static custom<T>(
    values: T[],
    aggregate: AggregateFunction<T>,
    identity: T
  ): SegmentTree<T> {
    return new SegmentTree<T>({
      values,
      type: AggregationType.CUSTOM,
      customAggregate: aggregate,
      identity,
    });
  }

  /**
   * Debug: Print tree structure
   */
  toString(): string {
    return `SegmentTree(size: ${this.size}, type: ${this.aggregationType}, total: ${this.total})`;
  }

  /**
   * Debug: Validate tree structure
   */
  validate(): boolean {
    return this.validateNode(0, 0, this.n - 1);
  }

  private validateNode(node: number, start: number, end: number): boolean {
    if (this.n === 0) return true;

    if (start === end) {
      // Leaf node should match array value
      return this.tree[node] === this.arr[start];
    }

    const mid = SegmentTreeUtils.mid(start, end);
    const leftChild = SegmentTreeUtils.leftChild(node);
    const rightChild = SegmentTreeUtils.rightChild(node);

    // Check if current node is aggregate of children
    const expectedValue = this.aggregate(
      this.tree[leftChild],
      this.tree[rightChild]
    );

    if (this.tree[node] !== expectedValue) {
      return false;
    }

    return (
      this.validateNode(leftChild, start, mid) &&
      this.validateNode(rightChild, mid + 1, end)
    );
  }
}
