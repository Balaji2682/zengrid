import type { DataLoadRequest, DataLoadResponse, SortState, FilterModel } from '../types';
import { OperationModeManager, type OperationModeConfig } from '@zengrid/shared';
import type { EventEmitter } from '../events/event-emitter';
import type { GridEvents } from '../events/grid-events';

/**
 * Data manager options
 */
export interface DataManagerOptions {
  /**
   * Initial row count
   */
  rowCount: number;

  /**
   * Event emitter for grid events
   */
  events?: EventEmitter<GridEvents>;

  /**
   * Data operation mode configuration
   */
  modeConfig: OperationModeConfig<(request: DataLoadRequest) => Promise<DataLoadResponse>>;
}

/**
 * DataManager - Manages data loading in frontend or backend mode
 *
 * **Frontend Mode** (default):
 * - All data loaded in memory via setData()
 * - Filtering and sorting applied in-memory
 * - Fast operations, suitable for datasets that fit in memory
 *
 * **Backend Mode**:
 * - Data loaded on-demand via onDataRequest callback
 * - Filtering and sorting delegated to server
 * - Ideal for large datasets, server-side pagination
 *
 * **Auto Mode**:
 * - Uses backend if onDataRequest callback is provided
 * - Falls back to frontend mode otherwise
 *
 * @example Frontend Mode
 * ```typescript
 * const dataManager = new DataManager({
 *   rowCount: 100000,
 *   modeConfig: { mode: 'frontend' },
 * });
 *
 * dataManager.setData(allData);
 * ```
 *
 * @example Backend Mode
 * ```typescript
 * const dataManager = new DataManager({
 *   rowCount: 1000000,
 *   modeConfig: {
 *     mode: 'backend',
 *     callback: async (request) => {
 *       const response = await fetch('/api/data', {
 *         method: 'POST',
 *         body: JSON.stringify(request),
 *       });
 *       return response.json();
 *     },
 *   },
 * });
 *
 * // Data loaded automatically when needed
 * await dataManager.loadRange(0, 100);
 * ```
 */
export class DataManager extends OperationModeManager<(request: DataLoadRequest) => Promise<DataLoadResponse>> {
  private rowCount: number;
  private events?: EventEmitter<GridEvents>;
  private data: any[][] = [];
  private cachedRanges: Map<string, any[][]> = new Map();
  private totalRows: number = 0;
  private pendingRequests: Map<string, Promise<void>> = new Map();
  private isLoading: boolean = false;
  private maxCacheSize: number = 100; // Maximum cached ranges

  constructor(options: DataManagerOptions) {
    super(options.modeConfig, { rowCount: options.rowCount });
    this.rowCount = Math.max(0, options.rowCount || 0);
    this.events = options.events;
    this.totalRows = Math.max(0, options.rowCount || 0);
  }

  /**
   * Set data (frontend mode)
   */
  setData(data: any[][]): void {
    // Validate input
    if (!data) {
      console.warn('setData() called with null/undefined. Using empty array.');
      data = [];
    }

    if (!Array.isArray(data)) {
      console.error('setData() requires 2D array. Received:', typeof data);
      throw new TypeError('Data must be a 2D array');
    }

    if (this.isBackendMode()) {
      console.warn('setData() called in backend mode. Data will be stored but not used unless mode changes.');
    }

    // Validate that it's actually a 2D array
    if (data.length > 0 && !Array.isArray(data[0])) {
      console.error('setData() requires 2D array. First element is not an array.');
      throw new TypeError('Data must be a 2D array (array of arrays)');
    }

    this.data = data;
    this.rowCount = data.length;
    this.totalRows = data.length;

    // Clear cache when new data is set
    this.clearCache();

    if (this.events) {
      this.events.emit('data:load', {
        rowCount: this.rowCount,
        colCount: data[0]?.length ?? 0,
      });
    }
  }

  /**
   * Get all data (frontend mode)
   */
  getData(): any[][] {
    return this.data;
  }

  /**
   * Get value at specific cell
   */
  getValue(row: number, col: number): any {
    if (this.isFrontendMode()) {
      return this.data[row]?.[col];
    }

    // In backend mode, data should be loaded via loadRange first
    return this.data[row]?.[col];
  }

  /**
   * Get row data
   */
  getRow(row: number): any[] {
    if (this.isFrontendMode()) {
      return this.data[row] ?? [];
    }

    return this.data[row] ?? [];
  }

  /**
   * Load data range (backend mode)
   */
  async loadRange(
    startRow: number,
    endRow: number,
    sortState?: SortState[],
    filterState?: FilterModel[],
    filterExports?: {
      filter?: import('../features/filtering/types').FieldFilterState;
      queryString?: string;
      graphqlWhere?: Record<string, any>;
      sql?: import('../features/filtering/adapters/types').SQLFilterExport;
    }
  ): Promise<void> {
    // In frontend mode, data is already loaded
    if (this.isFrontendMode()) {
      return;
    }

    // Validate backend mode setup
    if (!this.callback) {
      const error = new Error('Backend mode requires onDataRequest callback');
      if (this.events) {
        this.events.emit('error', {
          message: 'Backend mode not configured properly',
          error,
          context: { startRow, endRow },
        });
      }
      throw error;
    }

    // Validate and normalize input
    startRow = Math.max(0, Math.floor(startRow));
    endRow = Math.max(startRow, Math.floor(endRow));

    // Handle empty range
    if (startRow === endRow) {
      console.warn('loadRange() called with empty range:', { startRow, endRow });
      return;
    }

    // Handle out of bounds (if totalRows is known)
    if (this.totalRows > 0 && startRow >= this.totalRows) {
      console.warn('loadRange() startRow exceeds totalRows:', { startRow, totalRows: this.totalRows });
      return;
    }

    // Clamp endRow to totalRows if known
    if (this.totalRows > 0) {
      endRow = Math.min(endRow, this.totalRows);
    }

    // Generate cache key
    const cacheKey = `${startRow}-${endRow}-${JSON.stringify(sortState)}-${JSON.stringify(filterState)}`;

    // Check cache first
    if (this.cachedRanges.has(cacheKey)) {
      const cachedData = this.cachedRanges.get(cacheKey)!;
      this.mergeRangeData(startRow, cachedData);
      return;
    }

    // Check for pending request for same range
    if (this.pendingRequests.has(cacheKey)) {
      // Wait for existing request to complete
      return this.pendingRequests.get(cacheKey);
    }

    // Create loading promise
    const loadPromise = this.executeLoadRange(startRow, endRow, sortState, filterState, filterExports, cacheKey);

    // Track pending request
    this.pendingRequests.set(cacheKey, loadPromise);

    try {
      await loadPromise;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Execute the actual data load request
   */
  private async executeLoadRange(
    startRow: number,
    endRow: number,
    sortState: SortState[] | undefined,
    filterState: FilterModel[] | undefined,
    filterExports: {
      filter?: import('../features/filtering/types').FieldFilterState;
      queryString?: string;
      graphqlWhere?: Record<string, any>;
      sql?: import('../features/filtering/adapters/types').SQLFilterExport;
    } | undefined,
    cacheKey: string
  ): Promise<void> {
    const loadStartTime = Date.now();
    this.isLoading = true;

    // Emit loading:start event
    if (this.events) {
      this.events.emit('loading:start', {
        timestamp: loadStartTime,
        message: `Loading rows ${startRow}-${endRow}...`,
      });
    }

    // Emit before-load event
    if (this.events) {
      this.events.emit('data:load', {
        rowCount: endRow - startRow,
        colCount: 0,
      });
    }

    // Calculate pagination info
    const pageSize = endRow - startRow;
    const page = Math.floor(startRow / pageSize);

    // Prepare request with filter exports
    const request: DataLoadRequest = {
      startRow,
      endRow,
      sortState,
      filterState,
      filter: filterExports?.filter,
      filterExport: filterExports ? {
        queryString: filterExports.queryString || '',
        graphqlWhere: filterExports.graphqlWhere || {},
        sql: filterExports.sql || {
          whereClause: '',
          positionalParams: [],
          namedParams: {},
          namedSql: '',
        },
      } : undefined,
      pagination: {
        page,
        pageSize,
        offset: startRow,
      },
    };

    try {
      // Call backend with timeout
      const timeoutMs = 30000; // 30 second timeout
      const response = await Promise.race([
        this.callback!(request),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Data load timeout')), timeoutMs)
        ),
      ]);

      // Validate response
      this.validateLoadResponse(response, startRow, endRow);

      // Update total row count from response
      if (typeof response.totalRows === 'number' && response.totalRows >= 0) {
        this.totalRows = response.totalRows;
        this.rowCount = response.totalRows;
      }

      // Handle empty response
      if (!response.data || response.data.length === 0) {
        console.warn('Backend returned empty data for range:', { startRow, endRow });
        this.mergeRangeData(startRow, []);
      } else {
        // Merge loaded data
        this.mergeRangeData(response.startRow, response.data);

        // Cache the range (with size limit)
        this.addToCache(cacheKey, response.data);
      }

      // Emit after-load event
      if (this.events) {
        this.events.emit('data:load', {
          rowCount: response.data?.length ?? 0,
          colCount: response.data?.[0]?.length ?? 0,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to load data range:', errorMessage, { startRow, endRow });

      if (this.events) {
        this.events.emit('error', {
          message: `Failed to load data range: ${errorMessage}`,
          error: error as Error,
          context: { startRow, endRow, sortState, filterState },
        });
      }

      throw error;
    } finally {
      this.isLoading = false;

      // Emit loading:end event
      if (this.events) {
        this.events.emit('loading:end', {
          timestamp: Date.now(),
          duration: Date.now() - loadStartTime,
        });
      }
    }
  }

  /**
   * Validate load response
   */
  private validateLoadResponse(response: DataLoadResponse, requestedStart: number, _requestedEnd: number): void {
    if (!response) {
      throw new Error('Backend returned null/undefined response');
    }

    if (typeof response.totalRows !== 'number' || response.totalRows < 0) {
      throw new Error(`Invalid totalRows in response: ${response.totalRows}`);
    }

    if (typeof response.startRow !== 'number' || response.startRow < 0) {
      throw new Error(`Invalid startRow in response: ${response.startRow}`);
    }

    if (typeof response.endRow !== 'number' || response.endRow < response.startRow) {
      throw new Error(`Invalid endRow in response: ${response.endRow}`);
    }

    if (!Array.isArray(response.data)) {
      throw new Error('Response data must be an array');
    }

    // Warn if response doesn't match request
    if (response.startRow !== requestedStart) {
      console.warn('Response startRow differs from request:', {
        requested: requestedStart,
        received: response.startRow,
      });
    }

    // Validate data is 2D array
    if (response.data.length > 0 && !Array.isArray(response.data[0])) {
      throw new Error('Response data must be a 2D array');
    }
  }

  /**
   * Add to cache with size limit
   */
  private addToCache(key: string, data: any[][]): void {
    // Remove oldest entries if cache is full
    if (this.cachedRanges.size >= this.maxCacheSize) {
      const firstKey = this.cachedRanges.keys().next().value;
      if (firstKey) {
        this.cachedRanges.delete(firstKey);
      }
    }

    this.cachedRanges.set(key, data);
  }

  /**
   * Merge loaded range data into existing data
   */
  private mergeRangeData(startRow: number, rangeData: any[][]): void {
    // Ensure data array is large enough
    while (this.data.length < startRow + rangeData.length) {
      this.data.push([]);
    }

    // Merge range data
    for (let i = 0; i < rangeData.length; i++) {
      this.data[startRow + i] = rangeData[i];
    }
  }

  /**
   * Clear cache (e.g., after sort/filter changes)
   */
  clearCache(): void {
    this.cachedRanges.clear();
  }

  /**
   * Get total row count
   */
  getTotalRows(): number {
    return this.totalRows;
  }

  /**
   * Update row count
   */
  updateRowCount(rowCount: number): void {
    const newCount = Math.max(0, rowCount || 0);
    this.rowCount = newCount;
    this.totalRows = newCount;

    // If reducing row count, clear cache as it may be invalid
    if (newCount < this.data.length) {
      this.clearCache();
    }
  }

  /**
   * Check if data is currently loading
   */
  isDataLoading(): boolean {
    return this.isLoading || this.pendingRequests.size > 0;
  }

  /**
   * Get number of pending requests
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Cancel all pending requests
   */
  cancelPendingRequests(): void {
    this.pendingRequests.clear();
    this.isLoading = false;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.cachedRanges.size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // TODO: Track cache hits/misses
    };
  }

  /**
   * Set maximum cache size
   */
  setMaxCacheSize(size: number): void {
    this.maxCacheSize = Math.max(1, size);

    // Trim cache if needed
    while (this.cachedRanges.size > this.maxCacheSize) {
      const firstKey = this.cachedRanges.keys().next().value;
      if (firstKey) {
        this.cachedRanges.delete(firstKey);
      }
    }
  }

  /**
   * Destroy data manager
   */
  destroy(): void {
    this.cancelPendingRequests();
    this.data = [];
    this.cachedRanges.clear();
    this.totalRows = 0;
    this.rowCount = 0;
  }
}
