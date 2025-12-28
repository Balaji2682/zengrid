import { PrefixSumArray } from '@zengrid/shared/data-structures/prefix-sum-array';
import type { HeightProvider } from './height-provider.interface';

/**
 * VariableHeightProvider - Variable heights using PrefixSumArray
 *
 * Supports different height for each row using prefix sums for efficient lookup.
 * - O(1) for getHeight, getOffset, getTotalHeight
 * - O(log n) for findIndexAtOffset (binary search)
 * - O(n) for setHeight (updates all prefix sums after the changed index)
 *
 * @example
 * ```typescript
 * const heights = [30, 40, 50, 30, 60];
 * const provider = new VariableHeightProvider(heights);
 * provider.getHeight(2); // 50
 * provider.getOffset(2); // 70 (30 + 40)
 * provider.findIndexAtOffset(100); // 2
 * ```
 */
export class VariableHeightProvider implements HeightProvider {
  private heights: PrefixSumArray;

  /**
   * Create a variable height provider
   * @param heights - Array of heights for each row
   */
  constructor(heights: number[]) {
    if (heights.some((h) => h < 0)) {
      throw new RangeError('All heights must be non-negative');
    }

    this.heights = new PrefixSumArray({ values: heights });
  }

  getHeight(index: number): number {
    return this.heights.getValue(index);
  }

  getOffset(index: number): number {
    return this.heights.getOffset(index);
  }

  getTotalHeight(): number {
    return this.heights.total;
  }

  findIndexAtOffset(offset: number): number {
    return this.heights.findIndexAtOffset(offset);
  }

  setHeight(index: number, height: number): void {
    if (height < 0) {
      throw new RangeError('Height must be non-negative');
    }
    this.heights.update(index, height);
  }

  get length(): number {
    return this.heights.length;
  }
}
