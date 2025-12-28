import type {
  PrefixSumArray as IPrefixSumArray,
  PrefixSumArrayOptions,
} from './prefix-sum-array.interface';
import { binarySearch } from '../../algorithms/search';

/**
 * PrefixSumArray implementation
 *
 * Stores cumulative sums for efficient range queries and offset lookups.
 * Essential for virtual scrolling with variable row heights.
 *
 * @example
 * ```typescript
 * // Row heights: [30, 40, 50, 30, 60]
 * const heights = new PrefixSumArray({ values: [30, 40, 50, 30, 60] });
 *
 * // Get offset to row 2 (sum of rows 0 and 1)
 * heights.getOffset(2); // 70 (30 + 40)
 *
 * // Find which row is at scroll offset 100
 * heights.findIndexAtOffset(100); // 2 (rows 0,1,2 total 120, row 2 starts at 70)
 *
 * // Get range sum (rows 1-3)
 * heights.getRangeSum(1, 4); // 120 (40 + 50 + 30)
 * ```
 */
export class PrefixSumArray implements IPrefixSumArray {
  private values: number[];
  private sums: number[];

  constructor(options: PrefixSumArrayOptions = {}) {
    this.values = options.values ? [...options.values] : [];
    this.sums = [];
    this.build();
  }

  /**
   * Build prefix sum array from values
   * sums[i] = sum of values[0...i-1]
   * sums[0] = 0 (no elements before index 0)
   */
  private build(): void {
    this.sums = new Array(this.values.length + 1);
    this.sums[0] = 0;

    for (let i = 0; i < this.values.length; i++) {
      this.sums[i + 1] = this.sums[i] + this.values[i];
    }
  }

  getOffset(index: number): number {
    if (index < 0 || index > this.values.length) {
      throw new RangeError(
        `Index ${index} out of bounds [0, ${this.values.length}]`
      );
    }
    return this.sums[index];
  }

  getSumUpTo(index: number): number {
    if (index < 0 || index >= this.values.length) {
      throw new RangeError(
        `Index ${index} out of bounds [0, ${this.values.length - 1}]`
      );
    }
    return this.sums[index + 1];
  }

  getRangeSum(start: number, end: number): number {
    if (start < 0 || end > this.values.length || start > end) {
      throw new RangeError(
        `Invalid range [${start}, ${end}) for length ${this.values.length}`
      );
    }
    return this.sums[end] - this.sums[start];
  }

  findIndexAtOffset(offset: number): number {
    if (offset < 0 || this.values.length === 0) {
      return 0;
    }

    // Handle edge case: all zeros (total = 0)
    if (this.total === 0) {
      return 0; // Return first index
    }

    if (offset >= this.total) {
      return this.values.length;
    }

    // Binary search for index where sums[index] <= offset < sums[index + 1]
    // This means the element at index is the one containing the offset
    const result = binarySearch(this.sums, offset, {
      returnInsertionPoint: true,
    });

    if (result.found) {
      // Exact match - offset is at the boundary between elements
      return result.index;
    } else {
      // Insertion point - 1 gives us the element containing the offset
      return Math.max(0, result.index - 1);
    }
  }

  update(index: number, newValue: number): void {
    if (index < 0 || index >= this.values.length) {
      throw new RangeError(
        `Index ${index} out of bounds [0, ${this.values.length - 1}]`
      );
    }

    if (newValue < 0) {
      throw new RangeError('Value must be non-negative');
    }

    const delta = newValue - this.values[index];
    this.values[index] = newValue;

    // Update all prefix sums from this index onward
    for (let i = index + 1; i < this.sums.length; i++) {
      this.sums[i] += delta;
    }
  }

  getValue(index: number): number {
    if (index < 0 || index >= this.values.length) {
      throw new RangeError(
        `Index ${index} out of bounds [0, ${this.values.length - 1}]`
      );
    }
    return this.values[index];
  }

  get length(): number {
    return this.values.length;
  }

  get total(): number {
    return this.sums[this.sums.length - 1];
  }

  get prefixSums(): ReadonlyArray<number> {
    return this.sums;
  }

  /**
   * Add a new value to the end
   * @param value - Value to append
   */
  push(value: number): void {
    if (value < 0) {
      throw new RangeError('Value must be non-negative');
    }

    this.values.push(value);
    this.sums.push(this.sums[this.sums.length - 1] + value);
  }

  /**
   * Remove and return the last value
   * @returns Removed value or undefined if empty
   */
  pop(): number | undefined {
    if (this.values.length === 0) {
      return undefined;
    }

    this.sums.pop();
    return this.values.pop();
  }

  /**
   * Clear all values
   */
  clear(): void {
    this.values = [];
    this.sums = [0];
  }

  /**
   * Create from array of values
   * @param values - Array of non-negative numbers
   * @returns New PrefixSumArray instance
   */
  static from(values: number[]): PrefixSumArray {
    return new PrefixSumArray({ values });
  }
}
