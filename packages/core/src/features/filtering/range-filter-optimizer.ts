/**
 * Range Filter Optimizer using Segment Tree
 *
 * Provides O(log n) range queries for BETWEEN, MIN, MAX operations
 * instead of O(n) linear scans.
 */

import {
  SegmentTree,
  AggregationType,
  type SegmentTreeOptions,
} from '@zengrid/shared/data-structures/segment-tree';

/**
 * Column range index entry
 */
interface RangeIndexEntry {
  /** Min segment tree */
  minTree: SegmentTree;

  /** Max segment tree */
  maxTree: SegmentTree;

  /** Sum segment tree (for statistics) */
  sumTree: SegmentTree;

  /** Original values */
  values: number[];

  /** Sorted indices (for range queries) */
  sortedIndices: number[];

  /** Last updated */
  lastUpdated: number;
}

/**
 * Range query result
 */
interface RangeQueryResult {
  /** Matching row indices */
  rows: number[];

  /** Statistics */
  stats: {
    min: number;
    max: number;
    sum: number;
    avg: number;
    count: number;
  };
}

/**
 * RangeFilterOptimizer - Fast range queries with Segment Tree
 *
 * Optimizes BETWEEN, MIN, MAX queries using segment trees.
 * Provides O(log n) queries instead of O(n) scans.
 *
 * @example
 * ```typescript
 * const optimizer = new RangeFilterOptimizer();
 *
 * // Index column with numeric values
 * optimizer.indexColumn(0, values);
 *
 * // Query: price BETWEEN 100 AND 500
 * const result = optimizer.queryRange(0, 100, 500);
 * // O(log n) instead of O(n)
 * ```
 */
export class RangeFilterOptimizer {
  private columnIndexes: Map<number, RangeIndexEntry> = new Map();

  /**
   * Index a numeric column for range queries
   *
   * @param col - Column index
   * @param values - Array of numeric values (one per row)
   */
  indexColumn(col: number, values: number[]): void {
    // Filter out null/undefined values and convert to numbers
    const numericValues = values.map(v => {
      if (v == null) return 0;
      const num = Number(v);
      return isNaN(num) ? 0 : num;
    });

    // Create segment trees
    const minTree = new SegmentTree({
      values: numericValues,
      type: AggregationType.MIN,
    });

    const maxTree = new SegmentTree({
      values: numericValues,
      type: AggregationType.MAX,
    });

    const sumTree = new SegmentTree({
      values: numericValues,
      type: AggregationType.SUM,
    });

    // Create sorted indices for binary search
    const sortedIndices = numericValues
      .map((value, index) => ({ value, index }))
      .sort((a, b) => a.value - b.value)
      .map(item => item.index);

    // Store index
    this.columnIndexes.set(col, {
      minTree,
      maxTree,
      sumTree,
      values: numericValues,
      sortedIndices,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Query rows within a range (BETWEEN operator)
   *
   * @param col - Column index
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   * @returns Query result with matching rows and statistics
   */
  queryRange(col: number, min: number, max: number): RangeQueryResult | null {
    const entry = this.columnIndexes.get(col);
    if (!entry) return null;

    const matchingRows: number[] = [];

    // Use binary search on sorted values to find range
    const { values, sortedIndices } = entry;

    // Find first index where value >= min
    let left = this.binarySearchLeft(values, sortedIndices, min);

    // Find last index where value <= max
    let right = this.binarySearchRight(values, sortedIndices, max);

    // Collect all rows in range
    for (let i = left; i <= right; i++) {
      if (i >= 0 && i < sortedIndices.length) {
        const rowIndex = sortedIndices[i];
        const value = values[rowIndex];
        if (value >= min && value <= max) {
          matchingRows.push(rowIndex);
        }
      }
    }

    // Calculate statistics using segment trees
    const stats = this.calculateRangeStats(entry, matchingRows);

    return {
      rows: matchingRows,
      stats,
    };
  }

  /**
   * Get MIN value in a range of rows
   *
   * @param col - Column index
   * @param startRow - Start row index
   * @param endRow - End row index
   * @returns Minimum value in range
   */
  getMin(col: number, startRow: number, endRow: number): number | null {
    const entry = this.columnIndexes.get(col);
    if (!entry) return null;

    return entry.minTree.query(startRow, endRow);
  }

  /**
   * Get MAX value in a range of rows
   *
   * @param col - Column index
   * @param startRow - Start row index
   * @param endRow - End row index
   * @returns Maximum value in range
   */
  getMax(col: number, startRow: number, endRow: number): number | null {
    const entry = this.columnIndexes.get(col);
    if (!entry) return null;

    return entry.maxTree.query(startRow, endRow);
  }

  /**
   * Get SUM of values in a range of rows
   *
   * @param col - Column index
   * @param startRow - Start row index
   * @param endRow - End row index
   * @returns Sum of values in range
   */
  getSum(col: number, startRow: number, endRow: number): number | null {
    const entry = this.columnIndexes.get(col);
    if (!entry) return null;

    return entry.sumTree.query(startRow, endRow);
  }

  /**
   * Update a single value in the index
   *
   * @param col - Column index
   * @param row - Row index
   * @param value - New value
   */
  update(col: number, row: number, value: number): void {
    const entry = this.columnIndexes.get(col);
    if (!entry) return;

    const numValue = Number(value);
    if (isNaN(numValue)) return;

    // Update segment trees
    entry.minTree.update(row, numValue);
    entry.maxTree.update(row, numValue);
    entry.sumTree.update(row, numValue);
    entry.values[row] = numValue;

    // Mark as updated (note: sorted indices need full rebuild for perfect accuracy)
    entry.lastUpdated = Date.now();
  }

  /**
   * Rebuild sorted indices after multiple updates
   *
   * @param col - Column index
   */
  rebuildSortedIndices(col: number): void {
    const entry = this.columnIndexes.get(col);
    if (!entry) return;

    entry.sortedIndices = entry.values
      .map((value, index) => ({ value, index }))
      .sort((a, b) => a.value - b.value)
      .map(item => item.index);
  }

  /**
   * Check if column is indexed
   *
   * @param col - Column index
   * @returns true if column has range index
   */
  isIndexed(col: number): boolean {
    return this.columnIndexes.has(col);
  }

  /**
   * Clear index for a column
   *
   * @param col - Column index
   */
  clearColumn(col: number): void {
    this.columnIndexes.delete(col);
  }

  /**
   * Clear all indexes
   */
  clearAll(): void {
    this.columnIndexes.clear();
  }

  /**
   * Get statistics about indexed columns
   */
  getStats(): {
    indexedColumns: number;
    totalValues: number;
    memoryEstimateMB: number;
  } {
    let totalValues = 0;

    for (const entry of this.columnIndexes.values()) {
      totalValues += entry.values.length;
    }

    // Estimate: 3 segment trees × 8 bytes per number × 2 (tree overhead)
    const memoryBytes = totalValues * 8 * 3 * 2;
    const memoryMB = memoryBytes / (1024 * 1024);

    return {
      indexedColumns: this.columnIndexes.size,
      totalValues,
      memoryEstimateMB: memoryMB,
    };
  }

  // ==================== Private Methods ====================

  /**
   * Binary search for leftmost position where value >= target
   */
  private binarySearchLeft(
    values: number[],
    sortedIndices: number[],
    target: number
  ): number {
    let left = 0;
    let right = sortedIndices.length - 1;
    let result = sortedIndices.length;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const value = values[sortedIndices[mid]];

      if (value >= target) {
        result = mid;
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return result;
  }

  /**
   * Binary search for rightmost position where value <= target
   */
  private binarySearchRight(
    values: number[],
    sortedIndices: number[],
    target: number
  ): number {
    let left = 0;
    let right = sortedIndices.length - 1;
    let result = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const value = values[sortedIndices[mid]];

      if (value <= target) {
        result = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return result;
  }

  /**
   * Calculate statistics for matching rows
   */
  private calculateRangeStats(
    entry: RangeIndexEntry,
    rows: number[]
  ): RangeQueryResult['stats'] {
    if (rows.length === 0) {
      return { min: 0, max: 0, sum: 0, avg: 0, count: 0 };
    }

    let min = Infinity;
    let max = -Infinity;
    let sum = 0;

    for (const row of rows) {
      const value = entry.values[row];
      if (value < min) min = value;
      if (value > max) max = value;
      sum += value;
    }

    return {
      min,
      max,
      sum,
      avg: sum / rows.length,
      count: rows.length,
    };
  }
}
