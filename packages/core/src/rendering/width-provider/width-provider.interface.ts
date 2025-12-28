/**
 * WidthProvider interface for configurable column width calculation
 *
 * Provides a strategy pattern for calculating column widths and positions.
 * Implementations can provide uniform widths, variable widths, or custom logic.
 */
export interface WidthProvider {
  /**
   * Get the width of a specific column
   * @param index - Column index
   * @returns Width in pixels
   * @complexity O(1)
   */
  getWidth(index: number): number;

  /**
   * Get the X offset where a column starts
   * @param index - Column index
   * @returns Offset in pixels from left
   * @complexity O(1) for uniform, O(1) for variable (cached)
   */
  getOffset(index: number): number;

  /**
   * Get the total width of all columns
   * @returns Total width in pixels
   * @complexity O(1)
   */
  getTotalWidth(): number;

  /**
   * Find which column contains a given X offset
   * @param offset - X position in pixels
   * @returns Column index at that offset
   * @complexity O(1) for uniform, O(log n) for variable
   */
  findIndexAtOffset(offset: number): number;

  /**
   * Update the width of a specific column (optional)
   * @param index - Column index
   * @param width - New width in pixels
   * @complexity Varies by implementation
   */
  setWidth?(index: number, width: number): void;

  /**
   * Total number of columns
   */
  readonly length: number;
}

/**
 * Options for creating a width provider
 */
export interface WidthProviderOptions {
  /**
   * Total number of columns
   */
  colCount: number;

  /**
   * Width value(s):
   * - number: uniform width for all columns
   * - number[]: individual widths per column
   */
  width: number | number[];
}
