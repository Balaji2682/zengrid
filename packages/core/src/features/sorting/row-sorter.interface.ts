import type { IndexMap } from '../../data/index-map';
import type { DataAccessor } from '../../data/data-accessor';
import type { SortDirection } from '../../types';

/**
 * Position for null/undefined values in sort order
 */
export type NullPosition = 'first' | 'last' | 'natural';

/**
 * Options for row sorting
 */
export interface SortOptions {
  /**
   * Sort direction
   * - 'asc': Ascending order
   * - 'desc': Descending order
   * - null: No sorting (identity map)
   */
  direction: SortDirection;

  /**
   * Where to place null/undefined values
   * - 'first': Nulls appear at the beginning
   * - 'last': Nulls appear at the end
   * - 'natural': Nulls treated as smallest value
   *
   * @default 'last'
   */
  nullPosition?: NullPosition;

  /**
   * Whether to use case-sensitive comparison for strings
   * @default true
   */
  caseSensitive?: boolean;
}

/**
 * Interface for row sorting functionality
 *
 * Sorts rows by a column's values without modifying underlying data.
 * Returns an IndexMap that remaps visual indices to data indices.
 */
export interface RowSorter {
  /**
   * Sort rows by a specific column
   *
   * @param dataAccessor - Accessor for grid data
   * @param column - Column identifier to sort by
   * @param options - Sort options
   * @returns IndexMap mapping visual indices to data indices
   *
   * @example
   * ```typescript
   * const sorter = new SingleColumnSorter();
   * const indexMap = sorter.sort(dataAccessor, 0, {
   *   direction: 'asc',
   *   nullPosition: 'last'
   * });
   *
   * // Visual row 0 now shows the row with the smallest value
   * const dataRow = indexMap.toDataIndex(0);
   * ```
   */
  sort(
    dataAccessor: DataAccessor,
    column: number | string,
    options: SortOptions
  ): IndexMap;
}
