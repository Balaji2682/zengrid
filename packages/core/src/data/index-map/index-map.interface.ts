/**
 * An immutable mapping from visual indices to data indices
 *
 * IndexMap enables non-destructive transformations like sorting and filtering
 * by mapping visual/display indices to underlying data indices.
 *
 * @example
 * ```typescript
 * // After sorting: visual row 0 maps to data row 5
 * const indexMap = createIndexMap([5, 2, 8, 1]);
 * indexMap.toDataIndex(0); // 5
 * indexMap.toDataIndex(1); // 2
 * ```
 */
export interface IndexMap {
  /**
   * Get the data index for a visual index
   * @param visualIndex - Visual/display row index
   * @returns Data row index, or -1 if out of bounds
   */
  toDataIndex(visualIndex: number): number;

  /**
   * Get the visual index for a data index
   * @param dataIndex - Original data row index
   * @returns Visual row index, or -1 if filtered out
   */
  toVisualIndex(dataIndex: number): number;

  /**
   * Number of visible rows (after filtering)
   */
  readonly length: number;

  /**
   * Get data indices as array (for iteration)
   * @returns Read-only array of data indices in visual order
   */
  readonly indices: ReadonlyArray<number>;

  /**
   * Iterate over [visualIndex, dataIndex] pairs
   */
  [Symbol.iterator](): IterableIterator<[number, number]>;
}

/**
 * Options for creating an identity IndexMap
 */
export interface IndexMapOptions {
  /** Total number of rows */
  rowCount: number;
}
