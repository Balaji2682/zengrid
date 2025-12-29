import type { Comparator } from '@zengrid/shared/types';
import { timsortIndices } from '@zengrid/shared/algorithms/sorting';
import type { IndexMap } from '../../data/index-map';
import { createIndexMap, createIdentityIndexMap } from '../../data/index-map';
import type { DataAccessor } from '../../data/data-accessor';
import type { RowSorter, SortOptions, NullPosition } from './row-sorter.interface';

/**
 * Single-column row sorter
 *
 * Sorts grid rows by a single column's values using Timsort.
 * Returns an IndexMap that remaps visual indices to data indices.
 *
 * @example
 * ```typescript
 * const sorter = new SingleColumnSorter();
 * const indexMap = sorter.sort(dataAccessor, 'price', {
 *   direction: 'desc',
 *   nullPosition: 'last'
 * });
 * ```
 */
export class SingleColumnSorter implements RowSorter {
  /**
   * Sort rows by a specific column
   *
   * @param dataAccessor - Accessor for grid data
   * @param column - Column identifier to sort by
   * @param options - Sort options
   * @returns IndexMap mapping visual indices to data indices
   */
  sort(
    dataAccessor: DataAccessor,
    column: number | string,
    options: SortOptions
  ): IndexMap {
    const { direction, nullPosition = 'last', caseSensitive = true } = options;

    // If no sorting, return identity map
    if (direction === null) {
      return createIdentityIndexMap(dataAccessor.rowCount);
    }

    // Create initial index array [0, 1, 2, ..., rowCount-1]
    const indices = Array.from({ length: dataAccessor.rowCount }, (_, i) => i);

    // Create comparator for sorting
    const comparator = this.createComparator(
      dataAccessor,
      column,
      direction,
      nullPosition,
      caseSensitive
    );

    // Sort indices based on values
    timsortIndices(indices, (i) => i, comparator);

    return createIndexMap(indices);
  }

  /**
   * Create a comparator function for sorting row indices
   *
   * @param dataAccessor - Accessor for grid data
   * @param column - Column identifier
   * @param direction - Sort direction
   * @param nullPosition - Where to place null values
   * @param caseSensitive - Case-sensitive string comparison
   * @returns Comparator function
   */
  private createComparator(
    dataAccessor: DataAccessor,
    column: number | string,
    direction: 'asc' | 'desc',
    nullPosition: NullPosition,
    caseSensitive: boolean
  ): Comparator<number> {
    return (rowA: number, rowB: number): number => {
      const valueA = dataAccessor.getValue(rowA, column);
      const valueB = dataAccessor.getValue(rowB, column);

      // Handle null/undefined values
      const isNullA = valueA === null || valueA === undefined;
      const isNullB = valueB === null || valueB === undefined;

      if (isNullA && isNullB) {
        return 0; // Both null, equal
      }

      if (isNullA) {
        return this.getNullComparisonResult(nullPosition, direction, true);
      }

      if (isNullB) {
        return this.getNullComparisonResult(nullPosition, direction, false);
      }

      // Compare non-null values
      const comparison = this.compareValues(valueA, valueB, caseSensitive);

      // Apply direction
      return direction === 'asc' ? comparison : -comparison;
    };
  }

  /**
   * Get comparison result for null values
   *
   * @param nullPosition - Where nulls should appear
   * @param direction - Sort direction
   * @param isFirstNull - Whether the first value is null
   * @returns Comparison result (-1, 0, or 1)
   */
  private getNullComparisonResult(
    nullPosition: NullPosition,
    direction: 'asc' | 'desc',
    isFirstNull: boolean
  ): number {
    switch (nullPosition) {
      case 'first':
        // Nulls always first regardless of direction
        return isFirstNull ? -1 : 1;

      case 'last':
        // Nulls always last regardless of direction
        return isFirstNull ? 1 : -1;

      case 'natural':
        // Treat null as smallest value, respect direction
        if (direction === 'asc') {
          return isFirstNull ? -1 : 1;
        } else {
          return isFirstNull ? 1 : -1;
        }
    }
  }

  /**
   * Compare two non-null values
   *
   * @param a - First value
   * @param b - Second value
   * @param caseSensitive - Case-sensitive string comparison
   * @returns Comparison result (-1, 0, or 1)
   */
  private compareValues(a: any, b: any, caseSensitive: boolean): number {
    // Type coercion: try to determine the type
    const typeA = typeof a;
    const typeB = typeof b;

    // If types differ, compare as strings
    if (typeA !== typeB) {
      return this.compareStrings(String(a), String(b), caseSensitive);
    }

    // Both are numbers
    if (typeA === 'number') {
      return this.compareNumbers(a, b);
    }

    // Both are strings
    if (typeA === 'string') {
      return this.compareStrings(a, b, caseSensitive);
    }

    // Both are booleans
    if (typeA === 'boolean') {
      return this.compareBooleans(a, b);
    }

    // Both are dates
    if (a instanceof Date && b instanceof Date) {
      return this.compareDates(a, b);
    }

    // Fallback: compare as strings
    return this.compareStrings(String(a), String(b), caseSensitive);
  }

  /**
   * Compare two numbers
   */
  private compareNumbers(a: number, b: number): number {
    if (isNaN(a) && isNaN(b)) return 0;
    if (isNaN(a)) return 1; // NaN is greater
    if (isNaN(b)) return -1;
    return a - b;
  }

  /**
   * Compare two strings
   */
  private compareStrings(a: string, b: string, caseSensitive: boolean): number {
    if (!caseSensitive) {
      a = a.toLowerCase();
      b = b.toLowerCase();
    }
    return a.localeCompare(b);
  }

  /**
   * Compare two booleans (false < true)
   */
  private compareBooleans(a: boolean, b: boolean): number {
    return Number(a) - Number(b);
  }

  /**
   * Compare two dates
   */
  private compareDates(a: Date, b: Date): number {
    return a.getTime() - b.getTime();
  }
}
