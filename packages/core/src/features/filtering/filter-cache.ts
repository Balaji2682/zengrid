/**
 * Filter Cache using LRU Cache
 *
 * Caches filter results to avoid expensive re-scanning.
 * Automatically invalidates when filter state changes.
 */

import { LRUCache } from '@zengrid/shared/data-structures/lru-cache';

/**
 * Cache key for filter results
 */
interface FilterCacheKey {
  /** Filter state hash */
  filterHash: string;

  /** Row count */
  rowCount: number;

  /** Data version/timestamp */
  dataVersion: number;
}

/**
 * Cached filter result
 */
interface FilterCacheEntry {
  /** Visible row indices */
  visibleRows: number[];

  /** Statistics */
  stats: {
    totalRows: number;
    visibleRows: number;
    hiddenRows: number;
  };

  /** Timestamp */
  timestamp: number;

  /** Hit count for analytics */
  hitCount: number;
}

/**
 * FilterCache - LRU cache for filter results
 *
 * Caches the results of expensive filter operations. Automatically
 * invalidates when filter state or data changes.
 *
 * @example
 * ```typescript
 * const cache = new FilterCache({ capacity: 100 });
 *
 * // Check cache before expensive scan
 * const cached = cache.get(filterState, rowCount, dataVersion);
 * if (cached) {
 *   return cached.visibleRows; // Cache hit!
 * }
 *
 * // Cache miss - do expensive scan
 * const visibleRows = expensiveScan();
 * cache.set(filterState, rowCount, dataVersion, visibleRows);
 * ```
 */
export class FilterCache {
  private cache: LRUCache<string, FilterCacheEntry>;
  private hitCount = 0;
  private missCount = 0;
  private enabled = true;

  constructor(options: { capacity?: number; enabled?: boolean } = {}) {
    this.cache = new LRUCache({
      capacity: options.capacity ?? 100,
    });
    this.enabled = options.enabled ?? true;
  }

  /**
   * Get cached filter result
   *
   * @param filterHash - Hash of filter state
   * @param rowCount - Total row count
   * @param dataVersion - Data version/timestamp
   * @returns Cached entry or null
   */
  get(
    filterHash: string,
    rowCount: number,
    dataVersion: number
  ): FilterCacheEntry | null {
    if (!this.enabled) return null;

    const key = this.getCacheKey({ filterHash, rowCount, dataVersion });
    const entry = this.cache.get(key);

    if (entry) {
      this.hitCount++;
      entry.hitCount++;
      return entry;
    }

    this.missCount++;
    return null;
  }

  /**
   * Set filter result in cache
   *
   * @param filterHash - Hash of filter state
   * @param rowCount - Total row count
   * @param dataVersion - Data version/timestamp
   * @param visibleRows - Filtered row indices
   */
  set(
    filterHash: string,
    rowCount: number,
    dataVersion: number,
    visibleRows: number[]
  ): void {
    if (!this.enabled) return;

    const key = this.getCacheKey({ filterHash, rowCount, dataVersion });

    const entry: FilterCacheEntry = {
      visibleRows: [...visibleRows],
      stats: {
        totalRows: rowCount,
        visibleRows: visibleRows.length,
        hiddenRows: rowCount - visibleRows.length,
      },
      timestamp: Date.now(),
      hitCount: 0,
    };

    this.cache.set(key, entry);
  }

  /**
   * Invalidate all cache entries
   */
  invalidate(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache entries for specific data version
   *
   * @param dataVersion - Data version to invalidate
   */
  invalidateVersion(dataVersion: number): void {
    // LRU cache doesn't support partial invalidation by pattern
    // For now, clear all. Could be optimized with custom implementation.
    this.invalidate();
  }

  /**
   * Enable or disable caching
   *
   * @param enabled - Whether to enable caching
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.invalidate();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    hitCount: number;
    missCount: number;
    hitRate: number;
    size: number;
    capacity: number;
  } {
    const total = this.hitCount + this.missCount;
    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? this.hitCount / total : 0,
      size: this.cache.size(),
      capacity: this.cache.capacity(),
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Clear cache and reset statistics
   */
  clear(): void {
    this.invalidate();
    this.resetStats();
  }

  // ==================== Private Methods ====================

  /**
   * Generate cache key from components
   */
  private getCacheKey(key: FilterCacheKey): string {
    return `${key.filterHash}:${key.rowCount}:${key.dataVersion}`;
  }
}
