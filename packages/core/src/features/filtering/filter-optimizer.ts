/**
 * Filter Optimizer using Bloom Filter
 *
 * Provides fast filter membership checks to skip expensive scans.
 */

import { BloomFilter } from '@zengrid/shared/algorithms/filter';

/**
 * FilterOptimizer - Quick filter membership tests using Bloom Filter
 *
 * Uses probabilistic Bloom Filter to quickly determine if a value
 * definitely does NOT exist, avoiding expensive column scans.
 *
 * @example
 * ```typescript
 * const optimizer = new FilterOptimizer();
 *
 * // Index column with 1 million values
 * optimizer.indexColumn(0, products);
 *
 * // Quick check before expensive scan
 * if (!optimizer.mightContain(0, 'iPhone')) {
 *   return []; // Definitely not in column - skip scan
 * }
 *
 * // Bloom filter says it might exist - do actual scan
 * const results = grid.scan(0, value => value.includes('iPhone'));
 * ```
 */
export class FilterOptimizer {
  private columnFilters: Map<number, BloomFilter> = new Map();
  private columnStats: Map<number, { uniqueValues: number; falsePositiveRate: number }> = new Map();

  /**
   * Index column values for quick membership tests
   *
   * @param col - Column index
   * @param values - All values in the column
   * @param falsePositiveRate - Desired false positive rate (default 0.01 = 1%)
   */
  indexColumn(col: number, values: any[], falsePositiveRate: number = 0.01): void {
    // Calculate unique values
    const uniqueValues = new Set(values.map(v => String(v ?? '')));

    // Calculate optimal bloom filter parameters
    const size = BloomFilter.optimalSize(uniqueValues.size, falsePositiveRate);
    const hashCount = BloomFilter.optimalHashCount(size, uniqueValues.size);

    const filter = new BloomFilter(size, hashCount);

    // Add all unique values
    uniqueValues.forEach(value => {
      if (value) filter.add(value);
    });

    this.columnFilters.set(col, filter);
    this.columnStats.set(col, {
      uniqueValues: uniqueValues.size,
      falsePositiveRate,
    });
  }

  /**
   * Quick check if value might exist in column
   *
   * - Returns false: value definitely DOES NOT exist
   * - Returns true: value MIGHT exist (needs actual check)
   *
   * @param col - Column index
   * @param value - Value to check
   * @returns true if value might exist, false if definitely doesn't
   */
  mightContain(col: number, value: string): boolean {
    const filter = this.columnFilters.get(col);
    return filter?.contains(value) ?? true; // If no filter, assume it might exist
  }

  /**
   * Check if column is indexed
   *
   * @param col - Column index
   * @returns true if column has bloom filter
   */
  isIndexed(col: number): boolean {
    return this.columnFilters.has(col);
  }

  /**
   * Get false positive rate for a column
   *
   * @param col - Column index
   * @returns Estimated false positive rate
   */
  getFalsePositiveRate(col: number): number | null {
    const stats = this.columnStats.get(col);
    return stats?.falsePositiveRate ?? null;
  }

  /**
   * Get statistics about indexed column
   *
   * @param col - Column index
   */
  getStats(col: number): {
    uniqueValues: number;
    falsePositiveRate: number;
  } | null {
    return this.columnStats.get(col) ?? null;
  }

  /**
   * Clear filter for a column
   *
   * @param col - Column index
   */
  clearColumn(col: number): void {
    this.columnFilters.delete(col);
    this.columnStats.delete(col);
  }

  /**
   * Clear all filters
   */
  clearAll(): void {
    this.columnFilters.clear();
    this.columnStats.clear();
  }

  /**
   * Get all indexed columns
   *
   * @returns Array of column indices
   */
  getIndexedColumns(): number[] {
    return Array.from(this.columnFilters.keys());
  }

  /**
   * Get memory usage estimate (in bytes)
   *
   * Bloom filters are very space-efficient.
   * For 10,000 unique values with 1% false positive rate:
   * - Optimal size: ~1.2 KB
   *
   * @param col - Column index
   * @returns Estimated memory usage in bytes
   */
  getMemoryUsage(col: number): number | null {
    const filter = this.columnFilters.get(col);
    if (!filter) return null;

    // Rough estimate: each entry in bloom filter uses minimal space
    const stats = this.columnStats.get(col)!;
    const optimalSize = BloomFilter.optimalSize(stats.uniqueValues, stats.falsePositiveRate);

    // Bloom filter uses bit array, so divide by 8 to get bytes
    return Math.ceil(optimalSize / 8);
  }
}
