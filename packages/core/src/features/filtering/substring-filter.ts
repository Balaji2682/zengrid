/**
 * Substring Filter using Suffix Array
 *
 * Provides fast substring search ("contains") filtering for grid columns.
 */

import { SuffixArray } from '@zengrid/shared/data-structures/suffix-array';

/**
 * Mapping from suffix array position to row index
 */
interface PositionMap {
  /** Start position of each row in the combined text */
  rowStarts: number[];

  /** Row index for each start position */
  rowIndices: number[];

  /** Original values for reference */
  values: string[];
}

/**
 * SubstringFilter - Fast substring search using Suffix Array
 *
 * Indexes column values for O(m log n) substring search instead of O(n*m) linear scan.
 *
 * @example
 * ```typescript
 * const filter = new SubstringFilter();
 *
 * // Index column 0 with product names
 * filter.indexColumn(0, [
 *   'Apple iPhone 14',
 *   'Samsung Galaxy S23',
 *   'Microsoft Surface Pro'
 * ]);
 *
 * // Find all rows containing "phone" (matches "iPhone")
 * const rows = filter.filterBySubstring(0, 'phone');
 * // [0] - Row 0 contains "phone" in "iPhone"
 * ```
 */
export class SubstringFilter {
  private columnIndexes: Map<number, SuffixArray> = new Map();
  private columnMaps: Map<number, PositionMap> = new Map();

  /**
   * Index all values in a column for substring search
   *
   * @param col - Column index
   * @param values - All values in the column
   */
  indexColumn(col: number, values: any[]): void {
    const rowStarts: number[] = [];
    const rowIndices: number[] = [];
    const stringValues: string[] = [];

    // Convert all values to strings and build position map
    let currentPos = 0;
    values.forEach((value, rowIdx) => {
      const str = String(value ?? '');
      stringValues.push(str);
      rowStarts.push(currentPos);
      rowIndices.push(rowIdx);
      currentPos += str.length + 1; // +1 for separator
    });

    // Join all values with null separator
    const combinedText = stringValues.join('\0');

    // Build suffix array
    const suffixArray = new SuffixArray(combinedText, {
      caseSensitive: false,
      buildLCP: true,
    });

    // Store index and position map
    this.columnIndexes.set(col, suffixArray);
    this.columnMaps.set(col, {
      rowStarts,
      rowIndices,
      values: stringValues,
    });
  }

  /**
   * Find all rows where column value contains the substring
   *
   * @param col - Column index
   * @param substring - Substring to search for
   * @returns Array of row indices that match
   */
  filterBySubstring(col: number, substring: string): number[] {
    const suffixArray = this.columnIndexes.get(col);
    const positionMap = this.columnMaps.get(col);

    if (!suffixArray || !positionMap || !substring) {
      return [];
    }

    // Find all positions where substring occurs
    const positions = suffixArray.search(substring);

    // Convert positions to row indices
    const matchedRows = new Set<number>();

    for (const pos of positions) {
      // Find which row this position belongs to
      const rowIdx = this.findRowIndex(pos, positionMap.rowStarts);
      if (rowIdx !== -1) {
        matchedRows.add(rowIdx);
      }
    }

    return Array.from(matchedRows).sort((a, b) => a - b);
  }

  /**
   * Check if any row in the column contains the substring
   *
   * @param col - Column index
   * @param substring - Substring to check
   * @returns true if at least one row contains the substring
   */
  contains(col: number, substring: string): boolean {
    const suffixArray = this.columnIndexes.get(col);
    return suffixArray?.contains(substring) ?? false;
  }

  /**
   * Count how many rows contain the substring
   *
   * @param col - Column index
   * @param substring - Substring to count
   * @returns Number of rows containing the substring
   */
  count(col: number, substring: string): number {
    return this.filterBySubstring(col, substring).length;
  }

  /**
   * Get statistics for a column index
   *
   * @param col - Column index
   * @returns Statistics or null if not indexed
   */
  getStats(col: number) {
    const suffixArray = this.columnIndexes.get(col);
    const positionMap = this.columnMaps.get(col);

    if (!suffixArray || !positionMap) return null;

    return {
      ...suffixArray.getStats(),
      rowCount: positionMap.values.length,
      totalChars: positionMap.values.reduce((sum, v) => sum + v.length, 0),
    };
  }

  /**
   * Clear index for a column
   *
   * @param col - Column index
   */
  clearColumn(col: number): void {
    this.columnIndexes.get(col)?.clear();
    this.columnIndexes.delete(col);
    this.columnMaps.delete(col);
  }

  /**
   * Clear all indexes
   */
  clearAll(): void {
    this.columnIndexes.forEach(sa => sa.clear());
    this.columnIndexes.clear();
    this.columnMaps.clear();
  }

  // ==================== Private Methods ====================

  /**
   * Binary search to find which row a position belongs to
   */
  private findRowIndex(position: number, rowStarts: number[]): number {
    let left = 0;
    let right = rowStarts.length - 1;
    let result = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const nextStart = mid < rowStarts.length - 1 ? rowStarts[mid + 1] : Infinity;

      if (position >= rowStarts[mid] && position < nextStart) {
        return mid;
      } else if (position < rowStarts[mid]) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return result;
  }
}
