import type { ColumnType } from '@zengrid/shared';
import { FilterCache } from '../filter-cache';
import { FilterIndexManager } from '../filter-index-manager';
import { RangeFilterOptimizer } from '../range-filter-optimizer';
import type { FilterCore } from './filter-core';

/**
 * FilterOptimizer - Performance optimization module
 *
 * Handles caching, indexing, and optimized query execution.
 */
export class FilterOptimizer {
  private getValue: (row: number, col: number) => any;
  private filterCache: FilterCache | null = null;
  private indexManager: FilterIndexManager | null = null;
  private rangeOptimizer: RangeFilterOptimizer | null = null;
  private dataVersion: number;
  private core: FilterCore;

  constructor(
    core: FilterCore,
    getValue: (row: number, col: number) => any,
    enableOptimizations: boolean,
    options: {
      enableCache?: boolean;
      cacheCapacity?: number;
      enableVectorization?: boolean;
      maxIndexMemoryMB?: number;
      enableRangeOptimization?: boolean;
      dataVersion?: number;
    }
  ) {
    this.core = core;
    this.getValue = getValue;
    this.dataVersion = options.dataVersion ?? 0;

    // Initialize performance optimizations
    if (enableOptimizations) {
      // Initialize cache
      if (options.enableCache !== false) {
        this.filterCache = new FilterCache({
          capacity: options.cacheCapacity ?? 100,
          enabled: true,
        });
      }

      // Initialize vectorized filtering
      if (options.enableVectorization !== false) {
        this.indexManager = new FilterIndexManager({
          maxMemoryMB: options.maxIndexMemoryMB ?? 100,
        });
      }

      // Initialize range optimization
      if (options.enableRangeOptimization !== false) {
        this.rangeOptimizer = new RangeFilterOptimizer();
      }
    }
  }

  /**
   * Get all visible row indices with optimization
   * @param rowCount - Total row count
   * @returns Array of visible row indices
   */
  getVisibleRows(rowCount: number): number[] {
    const filterStateHash = this.core.getFilterStateHash();

    // Try cache first
    if (this.filterCache) {
      const cached = this.filterCache.get(filterStateHash, rowCount, this.dataVersion);
      if (cached) {
        return [...cached.visibleRows];
      }
    }

    // Try optimized filtering for single column numeric filters
    const optimizedResult = this.tryOptimizedFilter(rowCount);
    if (optimizedResult) {
      // Cache the result
      if (this.filterCache) {
        this.filterCache.set(filterStateHash, rowCount, this.dataVersion, optimizedResult);
      }
      return optimizedResult;
    }

    // Fall back to standard row-by-row filtering
    const visible = this.core.getVisibleRowsBasic(rowCount);

    // Cache the result
    if (this.filterCache) {
      this.filterCache.set(filterStateHash, rowCount, this.dataVersion, visible);
    }

    return visible;
  }

  /**
   * Set data version (invalidates cache)
   *
   * @param version - New data version
   */
  setDataVersion(version: number): void {
    if (version !== this.dataVersion) {
      this.dataVersion = version;
      if (this.filterCache) {
        this.filterCache.invalidateVersion(version);
      }
    }
  }

  /**
   * Index a column for optimized filtering
   *
   * @param col - Column index
   * @param rowCount - Total row count
   * @param type - Column data type
   */
  indexColumn(col: number, rowCount: number, type: ColumnType = 'float64'): void {
    if (!this.indexManager) return;

    this.indexManager.indexColumn(col, rowCount, (row) => this.getValue(row, col), type);

    // Also index with range optimizer for numeric columns
    if (this.rangeOptimizer && (type === 'int32' || type === 'float64')) {
      const values: number[] = [];
      for (let row = 0; row < rowCount; row++) {
        values.push(this.getValue(row, col));
      }
      this.rangeOptimizer.indexColumn(col, values);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    hitCount: number;
    missCount: number;
    hitRate: number;
    size: number;
    capacity: number;
  } | null {
    return this.filterCache?.getStats() ?? null;
  }

  /**
   * Get index memory statistics
   */
  getIndexMemoryStats(): {
    usedMB: number;
    limitMB: number;
    utilizationPercent: number;
    indexedColumns: number;
  } | null {
    return this.indexManager?.getMemoryStats() ?? null;
  }

  /**
   * Clear all caches and indexes
   */
  clearOptimizations(): void {
    if (this.filterCache) {
      this.filterCache.clear();
    }
    if (this.indexManager) {
      this.indexManager.clearAll();
    }
    if (this.rangeOptimizer) {
      this.rangeOptimizer.clearAll();
    }
  }

  /**
   * Invalidate cache when filter state changes
   */
  invalidateCache(): void {
    if (this.filterCache) {
      this.filterCache.invalidate();
    }
  }

  /**
   * Try optimized filtering using ColumnStore and SegmentTree
   * Returns null if optimization not applicable
   */
  private tryOptimizedFilter(_rowCount: number): number[] | null {
    if (!this.core.canOptimizeWithColumnFilters()) return null;

    const columnFilters = this.core.getColumnFilters();

    // Only optimize for single column filters
    if (columnFilters.size !== 1) return null;

    const [column, filter] = Array.from(columnFilters.entries())[0];
    const conditions = filter.getConditions();

    // Only optimize for single condition
    if (conditions.length !== 1) return null;

    const condition = conditions[0];
    const { operator, value } = condition;

    // Try range optimization for BETWEEN
    if (operator === 'between' && this.rangeOptimizer?.isIndexed(column)) {
      if (Array.isArray(value) && value.length === 2) {
        const result = this.rangeOptimizer.queryRange(column, value[0], value[1]);
        if (result) {
          return result.rows;
        }
      }
    }

    // Try vectorized filtering for numeric operators
    if (this.indexManager?.isIndexed(column)) {
      let vectorOp: any = null;

      switch (operator) {
        case 'greaterThan':
          vectorOp = { type: 'gt', value };
          break;
        case 'greaterThanOrEqual':
          vectorOp = { type: 'gte', value };
          break;
        case 'lessThan':
          vectorOp = { type: 'lt', value };
          break;
        case 'lessThanOrEqual':
          vectorOp = { type: 'lte', value };
          break;
        case 'equals':
          vectorOp = { type: 'eq', value };
          break;
        case 'notEquals':
          vectorOp = { type: 'neq', value };
          break;
        case 'between':
          if (Array.isArray(value) && value.length === 2) {
            vectorOp = { type: 'between', value: value[0], valueTo: value[1] };
          }
          break;
      }

      if (vectorOp) {
        const result = this.indexManager.filter(column, vectorOp);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }
}
