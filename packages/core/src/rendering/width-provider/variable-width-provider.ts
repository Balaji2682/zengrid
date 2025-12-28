import { PrefixSumArray } from '@zengrid/shared/data-structures/prefix-sum-array';
import type { WidthProvider } from './width-provider.interface';

/**
 * VariableWidthProvider - Variable widths using PrefixSumArray
 *
 * Supports different width for each column using prefix sums for efficient lookup.
 * - O(1) for getWidth, getOffset, getTotalWidth
 * - O(log n) for findIndexAtOffset (binary search)
 * - O(n) for setWidth (updates all prefix sums after the changed index)
 *
 * @example
 * ```typescript
 * const widths = [100, 150, 200, 100, 120];
 * const provider = new VariableWidthProvider(widths);
 * provider.getWidth(2); // 200
 * provider.getOffset(2); // 250 (100 + 150)
 * provider.findIndexAtOffset(300); // 2
 * ```
 */
export class VariableWidthProvider implements WidthProvider {
  private widths: PrefixSumArray;

  /**
   * Create a variable width provider
   * @param widths - Array of widths for each column
   */
  constructor(widths: number[]) {
    if (widths.some((w) => w < 0)) {
      throw new RangeError('All widths must be non-negative');
    }

    this.widths = new PrefixSumArray({ values: widths });
  }

  getWidth(index: number): number {
    return this.widths.getValue(index);
  }

  getOffset(index: number): number {
    return this.widths.getOffset(index);
  }

  getTotalWidth(): number {
    return this.widths.total;
  }

  findIndexAtOffset(offset: number): number {
    return this.widths.findIndexAtOffset(offset);
  }

  setWidth(index: number, width: number): void {
    if (width < 0) {
      throw new RangeError('Width must be non-negative');
    }
    this.widths.update(index, width);
  }

  get length(): number {
    return this.widths.length;
  }
}
