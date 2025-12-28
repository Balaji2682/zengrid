import type { HeightProvider } from './height-provider.interface';

/**
 * UniformHeightProvider - Fixed height for all rows
 *
 * Provides constant-time O(1) operations for all methods.
 * Ideal for grids where all rows have the same height.
 *
 * @example
 * ```typescript
 * const provider = new UniformHeightProvider(30, 1000);
 * provider.getHeight(0); // 30
 * provider.getOffset(10); // 300
 * provider.findIndexAtOffset(450); // 15
 * ```
 */
export class UniformHeightProvider implements HeightProvider {
  private rowHeight: number;
  private rowCount: number;

  /**
   * Create a uniform height provider
   * @param height - Height in pixels for all rows
   * @param length - Total number of rows
   */
  constructor(height: number, length: number) {
    if (height <= 0) {
      throw new RangeError('Height must be positive');
    }
    if (length < 0) {
      throw new RangeError('Row count must be non-negative');
    }

    this.rowHeight = height;
    this.rowCount = length;
  }

  getHeight(index: number): number {
    if (index < 0 || index >= this.rowCount) {
      throw new RangeError(
        `Index ${index} out of bounds [0, ${this.rowCount - 1}]`
      );
    }
    return this.rowHeight;
  }

  getOffset(index: number): number {
    if (index < 0 || index > this.rowCount) {
      throw new RangeError(
        `Index ${index} out of bounds [0, ${this.rowCount}]`
      );
    }
    return index * this.rowHeight;
  }

  getTotalHeight(): number {
    return this.rowCount * this.rowHeight;
  }

  findIndexAtOffset(offset: number): number {
    if (offset < 0 || this.rowCount === 0) {
      return 0;
    }

    if (offset >= this.getTotalHeight()) {
      return this.rowCount;
    }

    return Math.floor(offset / this.rowHeight);
  }

  get length(): number {
    return this.rowCount;
  }
}
