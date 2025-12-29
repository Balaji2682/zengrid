/**
 * Segment Tree interfaces for ZenGrid
 * Efficiently handles range queries and updates for aggregation operations
 */

/**
 * Aggregation function type
 * Combines two values into one
 */
export type AggregateFunction<T> = (a: T, b: T) => T;

/**
 * Common aggregation operations
 */
export enum AggregationType {
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  GCD = 'gcd',
  LCM = 'lcm',
  PRODUCT = 'product',
  CUSTOM = 'custom',
}

/**
 * Segment Tree interface
 *
 * A tree data structure for storing intervals or segments, allowing for efficient
 * querying and updating of array elements over ranges.
 *
 * Use cases:
 * - Status bar aggregations (sum, min, max of selected cells)
 * - Range statistics (average, count, sum over a range)
 * - Dynamic cumulative calculations
 * - Range minimum/maximum queries
 * - Frequent range updates with queries
 *
 * Performance:
 * - Build: O(n)
 * - Query: O(log n)
 * - Update (point): O(log n)
 * - Update (range): O(log n) with lazy propagation
 * - Space: O(4n) = O(n)
 */
export interface ISegmentTree<T> {
  /**
   * Query the aggregated value over a range [left, right]
   * @param left - Start index (inclusive)
   * @param right - End index (inclusive)
   * @returns Aggregated value over the range
   * @complexity O(log n)
   */
  query(left: number, right: number): T;

  /**
   * Update a single element at index
   * @param index - Index to update
   * @param value - New value
   * @complexity O(log n)
   */
  update(index: number, value: T): void;

  /**
   * Update a range of elements [left, right]
   * @param left - Start index (inclusive)
   * @param right - End index (inclusive)
   * @param value - Value to apply to the range
   * @complexity O(log n) with lazy propagation
   */
  rangeUpdate(left: number, right: number, value: T): void;

  /**
   * Get the value at a specific index
   * @param index - Index to query
   * @returns Value at index
   * @complexity O(log n) or O(1) depending on implementation
   */
  get(index: number): T;

  /**
   * Build or rebuild the tree from new array
   * @param arr - New array of values
   * @complexity O(n)
   */
  build(arr: T[]): void;

  /**
   * Get the entire array
   * @returns Current array values
   * @complexity O(n)
   */
  toArray(): T[];

  /**
   * Find the first index where the aggregate from start meets a condition
   * Useful for binary search on aggregates
   * @param left - Start index
   * @param predicate - Condition to test
   * @returns Index or -1 if not found
   * @complexity O(log^2 n)
   */
  findFirst(left: number, predicate: (value: T) => boolean): number;

  /**
   * Get the size of the underlying array
   */
  readonly size: number;

  /**
   * Get the total aggregated value (entire array)
   */
  readonly total: T;

  /**
   * Get the aggregation type
   */
  readonly aggregationType: AggregationType;
}

/**
 * Options for creating a Segment Tree
 */
export interface SegmentTreeOptions<T> {
  /**
   * Initial array of values
   */
  values?: T[];

  /**
   * Aggregation type (for common operations)
   * If CUSTOM is specified, must provide customAggregate function
   */
  type?: AggregationType;

  /**
   * Custom aggregation function
   * Required if type is CUSTOM
   */
  customAggregate?: AggregateFunction<T>;

  /**
   * Identity value for the aggregation
   * - For SUM: 0
   * - For MIN: Infinity
   * - For MAX: -Infinity
   * - For PRODUCT: 1
   * Must be provided for CUSTOM type
   */
  identity?: T;

  /**
   * Whether to use lazy propagation for range updates
   * @default true
   */
  lazy?: boolean;
}

/**
 * Predefined aggregation functions and identities
 */
export const Aggregations = {
  sum: {
    fn: (a: number, b: number) => a + b,
    identity: 0,
  },
  min: {
    fn: (a: number, b: number) => Math.min(a, b),
    identity: Infinity,
  },
  max: {
    fn: (a: number, b: number) => Math.max(a, b),
    identity: -Infinity,
  },
  gcd: {
    fn: (a: number, b: number) => {
      while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
      }
      return a;
    },
    identity: 0,
  },
  lcm: {
    fn: (a: number, b: number) => {
      const gcd = Aggregations.gcd.fn(a, b);
      return gcd === 0 ? 0 : (a * b) / gcd;
    },
    identity: 1,
  },
  product: {
    fn: (a: number, b: number) => a * b,
    identity: 1,
  },
};

/**
 * Helper functions for segment tree operations
 */
export const SegmentTreeUtils = {
  /**
   * Calculate the tree size needed for array of size n
   */
  getTreeSize(n: number): number {
    // Tree size is at most 4n for a complete binary tree
    return 4 * n;
  },

  /**
   * Check if index is valid
   */
  isValidIndex(index: number, size: number): boolean {
    return index >= 0 && index < size;
  },

  /**
   * Check if range is valid
   */
  isValidRange(left: number, right: number, size: number): boolean {
    return (
      left >= 0 &&
      right < size &&
      left <= right
    );
  },

  /**
   * Get parent index in tree
   */
  parent(index: number): number {
    return Math.floor((index - 1) / 2);
  },

  /**
   * Get left child index in tree
   */
  leftChild(index: number): number {
    return 2 * index + 1;
  },

  /**
   * Get right child index in tree
   */
  rightChild(index: number): number {
    return 2 * index + 2;
  },

  /**
   * Get the middle point of a range
   */
  mid(left: number, right: number): number {
    return Math.floor((left + right) / 2);
  },
};
