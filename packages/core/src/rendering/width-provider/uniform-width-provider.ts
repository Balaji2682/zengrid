import type { WidthProvider } from './width-provider.interface';

/**
 * UniformWidthProvider - Fixed width for all columns
 *
 * Provides constant-time O(1) operations for all methods.
 * Ideal for grids where all columns have the same width.
 *
 * @example
 * ```typescript
 * const provider = new UniformWidthProvider(100, 50);
 * provider.getWidth(0); // 100
 * provider.getOffset(10); // 1000
 * provider.findIndexAtOffset(550); // 5
 * ```
 */
export class UniformWidthProvider implements WidthProvider {
  private colWidth: number;
  private colCount: number;

  /**
   * Create a uniform width provider
   * @param width - Width in pixels for all columns
   * @param length - Total number of columns
   */
  constructor(width: number, length: number) {
    if (width <= 0) {
      throw new RangeError('Width must be positive');
    }
    if (length < 0) {
      throw new RangeError('Column count must be non-negative');
    }

    this.colWidth = width;
    this.colCount = length;
  }

  getWidth(index: number): number {
    if (index < 0 || index >= this.colCount) {
      throw new RangeError(
        `Index ${index} out of bounds [0, ${this.colCount - 1}]`
      );
    }
    return this.colWidth;
  }

  getOffset(index: number): number {
    if (index < 0 || index > this.colCount) {
      throw new RangeError(
        `Index ${index} out of bounds [0, ${this.colCount}]`
      );
    }
    return index * this.colWidth;
  }

  getTotalWidth(): number {
    return this.colCount * this.colWidth;
  }

  findIndexAtOffset(offset: number): number {
    if (offset < 0 || this.colCount === 0) {
      return 0;
    }

    if (offset >= this.getTotalWidth()) {
      return this.colCount;
    }

    return Math.floor(offset / this.colWidth);
  }

  get length(): number {
    return this.colCount;
  }
}
