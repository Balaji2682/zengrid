import type { FilterModel, ColumnDef } from '../../../types';
import type { EventEmitter } from '../../../events/event-emitter';
import type { GridEvents } from '../../../events/grid-events';
import type { FilterExportManagerOptions } from '../filter-export-manager';

/**
 * Filter manager options
 */
export interface FilterManagerOptions {
  /**
   * Total column count
   */
  colCount: number;

  /**
   * Event emitter for grid events
   */
  events?: EventEmitter<GridEvents>;

  /**
   * Callback to get cell value
   */
  getValue: (row: number, col: number) => any;

  /**
   * Initial filter models
   */
  initialFilters?: FilterModel[];

  /**
   * Column names for SQL query field mapping
   */
  columnNames?: string[];

  /**
   * Column definitions (for field-based filtering)
   * Required for FilterExportManager
   */
  columns?: ColumnDef[];

  /**
   * Enable automatic export transformation
   * @default true
   */
  enableExport?: boolean;

  /**
   * Export manager configuration
   */
  exportConfig?: Partial<FilterExportManagerOptions>;

  /**
   * Enable performance optimizations
   * @default true
   */
  enableOptimizations?: boolean;

  /**
   * Enable result caching with LRU cache
   * @default true
   */
  enableCache?: boolean;

  /**
   * Cache capacity (number of cached filter results)
   * @default 100
   */
  cacheCapacity?: number;

  /**
   * Enable vectorized filtering with ColumnStore
   * @default true
   */
  enableVectorization?: boolean;

  /**
   * Enable range query optimization with SegmentTree
   * @default true
   */
  enableRangeOptimization?: boolean;

  /**
   * Maximum memory for indexes (in MB)
   * @default 100
   */
  maxIndexMemoryMB?: number;

  /**
   * Data version for cache invalidation
   * Increment this when data changes
   * @default 0
   */
  dataVersion?: number;
}
