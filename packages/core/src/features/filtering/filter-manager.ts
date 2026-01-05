import type { FilterModel, FilterQuery, FilterExpression, ColumnDef } from '../../types';
import type { OperationMode } from '@zengrid/shared';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import { ColumnFilter } from './column-filter';
import { FilterQueryParser } from './filter-query-parser';
import { FilterExportManager, type FilterExportManagerOptions } from './filter-export-manager';
import type { FieldFilterState } from './types';
import type { FilterExportResult } from './adapters/types';
import { FilterCache } from './filter-cache';
import { FilterIndexManager } from './filter-index-manager';
import { RangeFilterOptimizer } from './range-filter-optimizer';
import type { ColumnType } from '@zengrid/shared/data-structures/column-store';

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
   * Filter mode: frontend, backend, or auto
   * @default 'frontend'
   */
  mode?: OperationMode;

  /**
   * Column names for SQL query field mapping
   */
  columnNames?: string[];

  /**
   * Backend filtering callback
   * Called when mode is 'backend' or 'auto' (with callback present)
   */
  onFilterRequest?: (filter: FilterExpression) => Promise<void> | void;

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

/**
 * FilterManager - Manages filtering across all columns
 *
 * Supports both frontend and backend filtering with two input formats:
 * 1. FilterModel[] - Traditional structured filters
 * 2. FilterQuery - SQL-like queries with parameterization
 *
 * @example Traditional Filtering
 * ```typescript
 * const filterManager = new FilterManager({
 *   colCount: 10,
 *   getValue: (row, col) => data[row][col],
 *   mode: 'frontend'
 * });
 *
 * // Add filter for column 0
 * filterManager.setColumnFilter(0, [
 *   { operator: 'greaterThan', value: 100 },
 * ]);
 *
 * // Test if row passes all filters
 * const passes = filterManager.testRow(5);
 *
 * // Get visible row indices
 * const visible = filterManager.getVisibleRows(1000);
 * ```
 *
 * @example SQL-like Filtering
 * ```typescript
 * const filterManager = new FilterManager({
 *   colCount: 10,
 *   getValue: (row, col) => data[row][col],
 *   mode: 'frontend',
 *   columnNames: ['id', 'name', 'age', 'status']
 * });
 *
 * // Apply SQL-like filter
 * await filterManager.applyFilter({
 *   sql: "age > :minAge AND status = :status",
 *   params: { minAge: 18, status: 'active' }
 * });
 * ```
 *
 * @example Backend Filtering
 * ```typescript
 * const filterManager = new FilterManager({
 *   colCount: 10,
 *   getValue: (row, col) => data[row][col],
 *   mode: 'backend',
 *   onFilterRequest: async (filter) => {
 *     const data = await api.get('/data', {
 *       filter: filter.sql,
 *       params: filter.params
 *     });
 *     grid.setData(data);
 *   }
 * });
 * ```
 */
export class FilterManager {
  private colCount: number;
  private events?: EventEmitter<GridEvents>;
  private getValue: (row: number, col: number) => any;
  private columnFilters: Map<number, ColumnFilter> = new Map();
  private filterState: FilterModel[] = [];
  private mode: OperationMode;
  private columnNames: string[];
  private parser: FilterQueryParser;
  private onFilterRequest?: (filter: FilterExpression) => Promise<void> | void;
  private currentExpression: FilterExpression | null = null;
  private exportManager: FilterExportManager | null = null;
  private enableExport: boolean;
  private filterCache: FilterCache | null = null;
  private indexManager: FilterIndexManager | null = null;
  private rangeOptimizer: RangeFilterOptimizer | null = null;
  private enableOptimizations: boolean;
  private dataVersion: number;
  private filterStateHash = '';

  constructor(options: FilterManagerOptions) {
    this.colCount = options.colCount;
    this.events = options.events;
    this.getValue = options.getValue;
    this.mode = options.mode || 'frontend';
    this.columnNames = options.columnNames || [];
    this.onFilterRequest = options.onFilterRequest;
    this.parser = new FilterQueryParser();
    this.enableExport = options.enableExport ?? true;
    this.enableOptimizations = options.enableOptimizations ?? true;
    this.dataVersion = options.dataVersion ?? 0;

    // Initialize performance optimizations
    if (this.enableOptimizations) {
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

    // Set up column name mapping for SQL queries
    if (this.columnNames.length > 0) {
      const columnMapping: Record<string, number> = {};
      this.columnNames.forEach((name, index) => {
        columnMapping[name] = index;
      });
      this.parser.setColumnMapping(columnMapping);
    }

    // Initialize FilterExportManager if columns are provided
    if (this.enableExport && options.columns && options.columns.length > 0) {
      this.exportManager = new FilterExportManager({
        columns: options.columns,
        ...options.exportConfig,
      });
    }

    // Initialize with initial filters
    if (options.initialFilters) {
      for (const model of options.initialFilters) {
        this.setColumnFilterFromModel(model);
      }
    }
  }

  /**
   * Set filter for a column
   * @param column - Column index
   * @param conditions - Filter conditions
   * @param logic - Logic operator ('AND' or 'OR')
   */
  setColumnFilter(
    column: number,
    conditions: any[],
    logic: 'AND' | 'OR' = 'AND'
  ): void {
    if (column < 0 || column >= this.colCount) {
      throw new RangeError(`Column ${column} out of bounds`);
    }

    // Remove existing filter if empty
    if (conditions.length === 0) {
      this.clearColumnFilter(column);
      return;
    }

    // Create or update filter
    const filter = new ColumnFilter({
      column,
      conditions,
      logic,
      onChange: (_model) => this.updateFilterState(),
    });

    this.columnFilters.set(column, filter);
    this.updateFilterState();
    this.emitFilterChange();
  }

  /**
   * Set column filter from model
   */
  private setColumnFilterFromModel(model: FilterModel): void {
    this.setColumnFilter(model.column, model.conditions, model.logic);
  }

  /**
   * Clear filter for a column
   * @param column - Column index
   */
  clearColumnFilter(column: number): void {
    if (this.columnFilters.has(column)) {
      this.columnFilters.delete(column);
      this.updateFilterState();
      this.emitFilterChange();
    }
  }

  /**
   * Clear all filters
   */
  clearAll(): void {
    this.columnFilters.clear();
    this.filterState = [];
    this.emitFilterChange();
  }

  /**
   * Test if a row passes all filters
   * @param row - Row index
   * @returns True if row passes all filters
   */
  testRow(row: number): boolean {
    // No filters = all rows pass
    if (this.columnFilters.size === 0) return true;

    // Test each column filter
    for (const [column, filter] of this.columnFilters) {
      const value = this.getValue(row, column);
      if (!filter.test(value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all visible row indices
   * @param rowCount - Total row count
   * @returns Array of visible row indices
   */
  getVisibleRows(rowCount: number): number[] {
    // Try cache first
    if (this.filterCache) {
      const cached = this.filterCache.get(
        this.filterStateHash,
        rowCount,
        this.dataVersion
      );
      if (cached) {
        return [...cached.visibleRows];
      }
    }

    // Try optimized filtering for single column numeric filters
    const optimizedResult = this.tryOptimizedFilter(rowCount);
    if (optimizedResult) {
      // Cache the result
      if (this.filterCache) {
        this.filterCache.set(
          this.filterStateHash,
          rowCount,
          this.dataVersion,
          optimizedResult
        );
      }
      return optimizedResult;
    }

    // Fall back to standard row-by-row filtering
    const visible: number[] = [];
    for (let row = 0; row < rowCount; row++) {
      if (this.testRow(row)) {
        visible.push(row);
      }
    }

    // Cache the result
    if (this.filterCache) {
      this.filterCache.set(
        this.filterStateHash,
        rowCount,
        this.dataVersion,
        visible
      );
    }

    return visible;
  }

  /**
   * Get filter statistics
   * @param rowCount - Total row count
   */
  getStats(rowCount: number): {
    totalRows: number;
    visibleRows: number;
    hiddenRows: number;
    activeFilters: number;
  } {
    const visibleRows = this.getVisibleRows(rowCount);

    return {
      totalRows: rowCount,
      visibleRows: visibleRows.length,
      hiddenRows: rowCount - visibleRows.length,
      activeFilters: this.columnFilters.size,
    };
  }

  /**
   * Get current filter state
   */
  getFilterState(): FilterModel[] {
    return [...this.filterState];
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(): boolean {
    return this.columnFilters.size > 0;
  }

  /**
   * Get filter for specific column
   * @param column - Column index
   */
  getColumnFilter(column: number): ColumnFilter | undefined {
    return this.columnFilters.get(column);
  }

  /**
   * Emit filter change event
   */
  private emitFilterChange(): void {
    if (!this.events) return;

    this.events.emit('filter:change', {
      filterState: this.filterState,
      previousFilterState: [], // TODO: Track previous state
    });
  }

  /**
   * Apply filter using SQL-like query or FilterModels
   * Supports both frontend and backend filtering
   *
   * @example SQL Query (Frontend)
   * ```typescript
   * await filterManager.applyFilter({
   *   sql: "age > :minAge AND status = :status",
   *   params: { minAge: 18, status: 'active' }
   * });
   * ```
   *
   * @example SQL Query (Backend)
   * ```typescript
   * // With mode='backend', this will call onFilterRequest callback
   * await filterManager.applyFilter({
   *   sql: "price BETWEEN :min AND :max",
   *   params: { min: 100, max: 500 }
   * });
   * ```
   *
   * @example FilterModels
   * ```typescript
   * await filterManager.applyFilter([
   *   {
   *     column: 2,
   *     conditions: [{ operator: 'greaterThan', value: 18 }],
   *     logic: 'AND'
   *   }
   * ]);
   * ```
   */
  async applyFilter(filter: FilterQuery | FilterModel[] | null): Promise<void> {
    if (!filter) {
      this.clearAll();
      return;
    }

    try {
      // Parse filter into FilterExpression
      const expression = this.parseFilterInput(filter);
      this.currentExpression = expression;

      // Emit filter:start event
      if (this.events) {
        this.events.emit('filter:start', {
          timestamp: Date.now(),
          filter: expression,
        });
      }

      // Apply filter based on mode
      if (this.mode === 'backend') {
        await this.applyBackendFilter(expression);
      } else if (this.mode === 'frontend') {
        await this.applyFrontendFilter(expression);
      } else if (this.mode === 'auto') {
        // Auto mode: use backend if callback provided, else frontend
        if (this.onFilterRequest) {
          await this.applyBackendFilter(expression);
        } else {
          await this.applyFrontendFilter(expression);
        }
      }

      // Emit filter:end event
      if (this.events) {
        this.events.emit('filter:end', {
          timestamp: Date.now(),
          resultCount: this.columnFilters.size,
        });
      }
    } catch (error) {
      if (this.events) {
        this.events.emit('filter:error', {
          timestamp: Date.now(),
          error: error as Error,
        });
      }
      throw error;
    }
  }

  /**
   * Parse filter input into FilterExpression
   */
  private parseFilterInput(filter: FilterQuery | FilterModel[]): FilterExpression {
    if (this.isFilterQuery(filter)) {
      // Parse SQL-like query
      return this.parser.parse(filter);
    } else {
      // Use FilterModel array
      return {
        type: 'model',
        models: filter,
      };
    }
  }

  /**
   * Type guard for FilterQuery
   */
  private isFilterQuery(filter: FilterQuery | FilterModel[]): filter is FilterQuery {
    return (filter as FilterQuery).sql !== undefined;
  }

  /**
   * Apply frontend filtering (in-memory)
   */
  private async applyFrontendFilter(expression: FilterExpression): Promise<void> {
    if (expression.type === 'model' && expression.models) {
      // Apply FilterModels using existing logic
      this.clearAll();
      for (const model of expression.models) {
        this.setColumnFilterFromModel(model);
      }
    } else if (expression.type === 'sql') {
      // For SQL filtering in frontend, we would need to:
      // 1. Parse SQL to FilterModels (complex)
      // 2. Or evaluate SQL directly against rows (simpler but limited)

      // For now, log a warning and suggest using FilterModels or backend mode
      console.warn(
        'Frontend SQL filtering is limited. For complex SQL queries, use backend mode. ' +
        'Alternatively, convert your query to FilterModels for full frontend support.'
      );

      // Clear filters as we can't apply SQL in frontend mode properly yet
      this.clearAll();
    }
  }

  /**
   * Apply backend filtering (delegate to server)
   */
  private async applyBackendFilter(expression: FilterExpression): Promise<void> {
    if (!this.onFilterRequest) {
      throw new Error('Backend filtering requires onFilterRequest callback');
    }

    // Delegate to backend
    // The backend callback should:
    // 1. Receive the FilterExpression
    // 2. Use expression.sql and expression.params to query the database
    // 3. Call grid.setData() with the filtered results
    await this.onFilterRequest(expression);
  }

  /**
   * Get current filter expression
   */
  getCurrentExpression(): FilterExpression | null {
    return this.currentExpression;
  }

  /**
   * Update column names (for SQL query mapping)
   */
  setColumnNames(names: string[]): void {
    this.columnNames = names;
    const columnMapping: Record<string, number> = {};
    names.forEach((name, index) => {
      columnMapping[name] = index;
    });
    this.parser.setColumnMapping(columnMapping);
  }

  /**
   * Get current filter state in field-based format
   * Returns filter state using field names instead of column indices
   *
   * @returns Field-based filter state or null if no export manager
   */
  getFieldFilterState(): FieldFilterState | null {
    if (!this.exportManager) {
      console.warn('FilterManager: Export manager not initialized. Provide columns in constructor.');
      return null;
    }

    return this.exportManager.convertFromModels(this.filterState);
  }

  /**
   * Get filter export in all formats (REST, GraphQL, SQL)
   * Returns ready-to-use filter formats for backend consumption
   *
   * @returns Filter export result with all formats
   *
   * @example
   * ```typescript
   * const exports = filterManager.getFilterExport();
   *
   * // REST
   * fetch(`/api/users?${exports.rest.queryString}`);
   *
   * // GraphQL
   * graphqlClient.query({ query, variables: { where: exports.graphql.where } });
   *
   * // SQL
   * db.query(`SELECT * FROM users WHERE ${exports.sql.whereClause}`, exports.sql.positionalParams);
   * ```
   */
  getFilterExport(): FilterExportResult | null {
    if (!this.exportManager) {
      console.warn('FilterManager: Export manager not initialized. Provide columns in constructor.');
      return null;
    }

    const fieldState = this.getFieldFilterState();
    if (!fieldState) return null;

    return this.exportManager.export(fieldState);
  }

  /**
   * Get filter export in specific format
   *
   * @param format - Adapter name ('rest', 'graphql', 'sql', or custom)
   * @returns Filter export in specified format
   *
   * @example
   * ```typescript
   * const restExport = filterManager.getFilterExportAs<RESTFilterExport>('rest');
   * fetch(`/api/users?${restExport.queryString}`);
   * ```
   */
  getFilterExportAs<T>(format: string): T | null {
    if (!this.exportManager) {
      console.warn('FilterManager: Export manager not initialized. Provide columns in constructor.');
      return null;
    }

    const fieldState = this.getFieldFilterState();
    if (!fieldState) return null;

    return this.exportManager.exportAs<T>(fieldState, format);
  }

  /**
   * Set filter from field-based format
   * Converts field-based filter state to column-based FilterModels
   *
   * @param state - Field-based filter state
   *
   * @example
   * ```typescript
   * filterManager.setFieldFilter({
   *   root: {
   *     logic: 'AND',
   *     conditions: [
   *       { field: 'age', operator: 'gt', value: 18 },
   *       { field: 'status', operator: 'eq', value: 'active' }
   *     ]
   *   },
   *   activeFields: ['age', 'status'],
   *   timestamp: Date.now()
   * });
   * ```
   */
  setFieldFilter(state: FieldFilterState): void {
    if (!this.exportManager) {
      console.warn('FilterManager: Export manager not initialized. Provide columns in constructor.');
      return;
    }

    const models = this.exportManager.convertToModels(state);
    this.clearAll();

    for (const model of models) {
      this.setColumnFilterFromModel(model);
    }
  }

  /**
   * Update columns (for export manager)
   */
  setColumns(columns: ColumnDef[]): void {
    if (this.exportManager) {
      this.exportManager.setColumns(columns);
    } else if (this.enableExport) {
      // Initialize export manager if it wasn't initialized before
      this.exportManager = new FilterExportManager({
        columns,
      });
    }
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
  indexColumn(col: number, rowCount: number, type: ColumnType = 'number'): void {
    if (!this.indexManager) return;

    this.indexManager.indexColumn(col, rowCount, this.getValue, type);

    // Also index with range optimizer for numeric columns
    if (this.rangeOptimizer && (type === 'number' || type === 'int32' || type === 'float64')) {
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
   * Destroy filter manager
   */
  destroy(): void {
    this.columnFilters.clear();
    this.filterState = [];
    this.currentExpression = null;
    this.exportManager = null;
    this.clearOptimizations();
    this.filterCache = null;
    this.indexManager = null;
    this.rangeOptimizer = null;
  }

  // ==================== Private Optimization Methods ====================

  /**
   * Try optimized filtering using ColumnStore and SegmentTree
   * Returns null if optimization not applicable
   */
  private tryOptimizedFilter(rowCount: number): number[] | null {
    // Only optimize for single column filters
    if (this.columnFilters.size !== 1) return null;

    const [column, filter] = Array.from(this.columnFilters.entries())[0];
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

  /**
   * Update filter state hash for caching
   */
  private updateFilterState(): void {
    this.filterState = Array.from(this.columnFilters.values()).map(f => f.getModel());

    // Update hash for cache key
    this.filterStateHash = JSON.stringify(this.filterState);

    // Invalidate cache when filter changes
    if (this.filterCache) {
      this.filterCache.invalidate();
    }
  }
}
