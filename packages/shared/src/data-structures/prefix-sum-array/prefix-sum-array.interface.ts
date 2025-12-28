/**
 * Prefix Sum Array interfaces for ZenGrid
 * Used for efficient range queries and offset calculations
 */

/**
 * Prefix Sum Array for cumulative calculations
 *
 * Useful for:
 * - Variable row heights in virtual scrolling
 * - Finding element at specific offset (O(log n) with binary search)
 * - Range sum queries
 */
export interface PrefixSumArray {
  /**
   * Get cumulative sum up to (but not including) index
   * @param index - Index to query
   * @returns Sum of values[0] through values[index-1]
   * @complexity O(1)
   */
  getOffset(index: number): number;

  /**
   * Get cumulative sum up to and including index
   * @param index - Index to query
   * @returns Sum of values[0] through values[index]
   * @complexity O(1)
   */
  getSumUpTo(index: number): number;

  /**
   * Get sum of range [start, end)
   * @param start - Start index (inclusive)
   * @param end - End index (exclusive)
   * @returns Sum of values[start] through values[end-1]
   * @complexity O(1)
   */
  getRangeSum(start: number, end: number): number;

  /**
   * Find index where cumulative sum >= target offset
   * Uses binary search internally
   * @param offset - Target cumulative value
   * @returns Index where cumulative sum >= offset
   * @complexity O(log n)
   */
  findIndexAtOffset(offset: number): number;

  /**
   * Update value at index and rebuild prefix sums
   * @param index - Index to update
   * @param newValue - New value
   * @complexity O(n) - requires rebuilding from index onward
   */
  update(index: number, newValue: number): void;

  /**
   * Get original value at index (not cumulative)
   * @param index - Index to query
   * @returns Original value
   * @complexity O(1)
   */
  getValue(index: number): number;

  /**
   * Total number of elements
   */
  readonly length: number;

  /**
   * Total sum of all values
   */
  readonly total: number;

  /**
   * Get underlying prefix sum array (for debugging)
   */
  readonly prefixSums: ReadonlyArray<number>;
}

/**
 * Options for creating a PrefixSumArray
 */
export interface PrefixSumArrayOptions {
  /**
   * Initial values to build prefix sums from
   */
  values?: number[];
}
