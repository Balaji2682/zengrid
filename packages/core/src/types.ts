/**
 * Core types for ZenGrid
 */

import type { RendererCacheConfig } from './rendering/cache';
import type { OperationMode } from '@zengrid/shared';

/**
 * Column definition
 */
export interface ColumnDef {
  field: string;
  header: string;
  width?: number;
  renderer?: string;
  sortable?: boolean;
  editable?: boolean;
  filterable?: boolean;
  resizable?: boolean; // Enable resize for this column (default: true)
  minWidth?: number; // Minimum width constraint
  maxWidth?: number; // Maximum width constraint
}

/**
 * Sort icons configuration
 */
export interface SortIcons {
  asc?: string;  // Icon for ascending sort (default: '▲')
  desc?: string; // Icon for descending sort (default: '▼')
}

/**
 * Grid options
 */
export interface GridOptions {
  rowCount: number;
  colCount: number;
  rowHeight: number | number[]; // Uniform or variable row heights
  colWidth: number | number[]; // Uniform or variable column widths
  columns?: ColumnDef[];
  enableSelection?: boolean;
  enableMultiSelection?: boolean;
  enableKeyboardNavigation?: boolean;
  enableA11y?: boolean;
  overscanRows?: number;
  overscanCols?: number;
  enableCellPooling?: boolean;
  rendererCache?: RendererCacheConfig;
  sortIcons?: SortIcons; // Configurable sort icons with defaults

  // Data Operation Modes - unified pattern for frontend/backend operations
  /**
   * Data loading mode
   * - 'frontend': All data loaded in memory (default)
   * - 'backend': Data loaded on-demand via onDataRequest
   * - 'auto': Use backend if onDataRequest provided, else frontend
   */
  dataMode?: OperationMode;

  /**
   * Sort mode
   * - 'frontend': Sort in memory using IndexMap (default)
   * - 'backend': Delegate sorting to server via onSortRequest
   * - 'auto': Use backend if onSortRequest provided, else frontend
   */
  sortMode?: OperationMode;

  /**
   * Filter mode
   * - 'frontend': Filter in memory (default)
   * - 'backend': Delegate filtering to server via onFilterRequest
   * - 'auto': Use backend if onFilterRequest provided, else frontend
   */
  filterMode?: OperationMode;

  // Callbacks for backend operations
  /**
   * Backend data loading callback
   * Called when dataMode is 'backend' or 'auto' (with callback present)
   * Application should fetch data based on request parameters
   */
  onDataRequest?: (request: DataLoadRequest) => Promise<DataLoadResponse>;

  /**
   * Backend sorting callback
   * Called when sortMode is 'backend' or 'auto' (with callback present)
   * Application should fetch sorted data and call grid.setData()
   */
  onSortRequest?: (sortState: SortState[]) => Promise<void> | void;

  /**
   * Backend filtering callback
   * Called when filterMode is 'backend' or 'auto' (with callback present)
   * Application should fetch filtered data and call grid.setData()
   *
   * Receives FilterExpression which contains:
   * - SQL query with parameters (if using SQL-like syntax)
   * - Filter models (if using traditional approach)
   *
   * @example SQL-like filtering
   * ```typescript
   * onFilterRequest: async (filter) => {
   *   if (filter.type === 'sql') {
   *     // Backend receives: filter.sql = "age > ? AND status = ?"
   *     // Backend receives: filter.params = [18, 'active']
   *     const data = await api.get('/data', {
   *       filter: filter.sql,
   *       params: filter.params
   *     });
   *     grid.setData(data);
   *   }
   * }
   * ```
   */
  onFilterRequest?: (filterExpression: FilterExpression) => Promise<void> | void;

  // Pagination
  /**
   * Pagination configuration
   */
  pagination?: PaginationConfig;

  // Loading indicator
  /**
   * Loading indicator configuration
   */
  loading?: LoadingConfig;

  // Column Resize
  /**
   * Enable column resize feature (default: true)
   */
  enableColumnResize?: boolean;

  /**
   * Column resize configuration
   */
  columnResize?: {
    /** Width of resize handle detection zone in pixels (default: 6) */
    resizeZoneWidth?: number;
    /** Default minimum width for all columns (default: 30) */
    defaultMinWidth?: number;
    /** Default maximum width for all columns (default: Infinity) */
    defaultMaxWidth?: number;
    /** Maximum rows to sample for auto-fit (default: 100) */
    autoFitSampleSize?: number;
    /** Padding to add to auto-fit width (default: 16) */
    autoFitPadding?: number;
    /** Show visual resize handles (default: true) */
    showHandles?: boolean;
    /** Show preview line during drag (default: true) */
    showPreview?: boolean;
  };

  // Event callbacks
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  onCellClick?: (row: number, col: number) => void;
  onCellDoubleClick?: (row: number, col: number) => void;
  onSelectionChange?: (selection: CellRange[]) => void;
  onPageChange?: (page: number, pageSize: number) => void;
  onColumnWidthsChange?: (widths: number[]) => void; // Called when column widths change (for persistence)
}

/**
 * Cell reference
 */
export interface CellRef {
  row: number;
  col: number;
}

/**
 * Cell range
 */
export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

/**
 * Visible range with overscan
 */
export interface VisibleRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc' | null;

/**
 * Sort mode - alias for OperationMode for backward compatibility
 * @deprecated Use OperationMode from @zengrid/shared instead
 */
export type SortMode = OperationMode;

/**
 * Sort state for a column
 */
export interface SortState {
  column: number;
  direction: SortDirection;
  sortIndex?: number; // For multi-column sort
}

/**
 * Data loading request parameters
 * Enhanced with field-based filter exports for backend convenience
 */
export interface DataLoadRequest {
  /**
   * Start row index (for pagination)
   */
  startRow: number;

  /**
   * End row index (for pagination)
   */
  endRow: number;

  /**
   * Current sort state
   */
  sortState?: SortState[];

  /**
   * Current filter state (column-based - DEPRECATED)
   * @deprecated Use `filter` field-based format instead
   * Kept for backwards compatibility
   */
  filterState?: FilterModel[];

  /**
   * Field-based filter state (NEW - recommended)
   * Uses field names instead of column indices
   */
  filter?: import('./features/filtering/types').FieldFilterState;

  /**
   * Pre-computed filter exports (NEW)
   * Ready-to-use formats for backend queries
   *
   * @example REST
   * ```typescript
   * fetch(`/api/users?${request.filterExport.queryString}`)
   * // => /api/users?filter[age][gt]=18
   * ```
   *
   * @example GraphQL
   * ```typescript
   * graphqlClient.query({
   *   query: GET_USERS,
   *   variables: { where: request.filterExport.graphqlWhere }
   * })
   * ```
   *
   * @example SQL
   * ```typescript
   * db.query(
   *   `SELECT * FROM users WHERE ${request.filterExport.sql.whereClause}`,
   *   request.filterExport.sql.positionalParams
   * )
   * ```
   */
  filterExport?: {
    /** REST query string (URL-encoded) */
    queryString: string;
    /** GraphQL where clause */
    graphqlWhere: Record<string, any>;
    /** SQL WHERE clause with parameters */
    sql: import('./features/filtering/adapters/types').SQLFilterExport;
  };

  /**
   * Pagination info (NEW)
   */
  pagination?: {
    /** Current page (0-based) */
    page: number;
    /** Items per page */
    pageSize: number;
    /** Row offset (startRow) */
    offset: number;
  };
}

/**
 * Data loading response
 */
export interface DataLoadResponse {
  /**
   * Loaded data rows
   */
  data: any[][];

  /**
   * Total row count (for pagination)
   */
  totalRows: number;

  /**
   * Start row of loaded data
   */
  startRow: number;

  /**
   * End row of loaded data
   */
  endRow: number;
}

/**
 * Filter operator types
 */
export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'blank'
  | 'notBlank';

/**
 * Filter condition
 */
export interface FilterCondition {
  operator: FilterOperator;
  value?: any;
}

/**
 * Filter model for a column
 */
export interface FilterModel {
  column: number;
  conditions: FilterCondition[];
  logic?: 'AND' | 'OR';
}

/**
 * SQL-like filter query with parameterization
 * Supports cleaner syntax than FilterModel for complex queries
 *
 * @example
 * ```typescript
 * // Simple query
 * { sql: "age > 18" }
 *
 * // Parameterized query (recommended - prevents injection)
 * {
 *   sql: "age > :minAge AND status = :status",
 *   params: { minAge: 18, status: 'active' }
 * }
 *
 * // Complex query
 * {
 *   sql: "age BETWEEN :min AND :max AND (name LIKE :search OR email LIKE :search)",
 *   params: { min: 18, max: 65, search: '%john%' }
 * }
 * ```
 */
export interface FilterQuery {
  /**
   * SQL-like query string
   * Supported operators: =, !=, <, >, <=, >=, LIKE, NOT LIKE, BETWEEN, IN, IS NULL, IS NOT NULL
   * Supported logic: AND, OR, NOT, parentheses for grouping
   */
  sql: string;

  /**
   * Named parameters for the query
   * Use :paramName in sql and provide values here
   * Recommended for security and readability
   */
  params?: Record<string, any>;
}

/**
 * Parsed filter expression (internal use)
 * Result of parsing FilterQuery or FilterModel
 */
export interface FilterExpression {
  /**
   * Type of filter input
   */
  type: 'sql' | 'model';

  /**
   * Original SQL query (if type is 'sql')
   */
  sql?: string;

  /**
   * Bound parameters with values substituted
   */
  boundSql?: string;

  /**
   * Parameters array for positional binding
   */
  params?: any[];

  /**
   * Parsed filter models (if type is 'model' or converted from sql)
   */
  models?: FilterModel[];
}

/**
 * Grid state
 */
export interface GridState {
  data: any[][];
  selection: CellRange[];
  activeCell: CellRef | null;
  sortState: SortState[];
  filterState: FilterModel[];
  scrollPosition: { top: number; left: number };
  editingCell: CellRef | null;
}

/**
 * Scroll position
 */
export interface ScrollPosition {
  top: number;
  left: number;
}

/**
 * Cell position (in pixels)
 */
export interface CellPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Viewport dimensions
 */
export interface ViewportDimensions {
  width: number;
  height: number;
}

/**
 * Pagination state
 */
export interface PaginationState {
  /**
   * Current page number (0-based)
   */
  currentPage: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Number of rows per page
   */
  pageSize: number;

  /**
   * Total number of rows across all pages
   */
  totalRows: number;

  /**
   * Available page size options
   */
  pageSizeOptions: number[];
}

/**
 * Pagination template type - 5 built-in styles
 */
export type PaginationTemplate =
  | 'simple'      // Minimal: < 1 2 3 >
  | 'material'    // Material Design style
  | 'bootstrap'   // Bootstrap style with ellipsis
  | 'compact'     // Compact with page input
  | 'full';       // Full featured with all controls

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  /**
   * Enable pagination
   * @default false
   */
  enabled?: boolean;

  /**
   * Page size (rows per page)
   * @default 100
   */
  pageSize?: number;

  /**
   * Available page size options for selector
   * @default [25, 50, 100, 200, 500]
   */
  pageSizeOptions?: number[];

  /**
   * Template style
   * @default 'material'
   */
  template?: PaginationTemplate;

  /**
   * Custom template renderer
   * If provided, overrides built-in templates
   */
  customTemplate?: (state: PaginationState, handlers: PaginationHandlers) => HTMLElement;

  /**
   * Position of pagination controls
   * @default 'bottom'
   */
  position?: 'top' | 'bottom' | 'both';

  /**
   * Show page size selector
   * @default true
   */
  showPageSizeSelector?: boolean;

  /**
   * Show total count
   * @default true
   */
  showTotalCount?: boolean;

  /**
   * Show page info (e.g., "Showing 1-100 of 1000")
   * @default true
   */
  showPageInfo?: boolean;

  /**
   * Maximum number of page buttons to show
   * @default 7
   */
  maxPageButtons?: number;
}

/**
 * Pagination event handlers
 */
export interface PaginationHandlers {
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
}

/**
 * Loading indicator template type - 4 built-in styles
 */
export type LoadingTemplate =
  | 'simple'      // Simple text "Loading..."
  | 'animated'    // Animated spinner with rotating dots
  | 'modern'      // Modern circular loader
  | 'skeleton';   // Skeleton screen shimmer effect

/**
 * Loading indicator state
 */
export interface LoadingState {
  /**
   * Whether data is currently loading
   */
  isLoading: boolean;

  /**
   * Loading message to display
   */
  message?: string;

  /**
   * Loading progress (0-100) for progress bar
   */
  progress?: number;
}

/**
 * Loading indicator configuration
 */
export interface LoadingConfig {
  /**
   * Enable loading indicator
   * @default true
   */
  enabled?: boolean;

  /**
   * Template style
   * @default 'modern'
   */
  template?: LoadingTemplate;

  /**
   * Custom template renderer
   * If provided, overrides built-in templates
   */
  customTemplate?: (state: LoadingState) => HTMLElement;

  /**
   * Loading message
   * @default 'Loading...'
   */
  message?: string;

  /**
   * Minimum display time in ms (prevents flash for fast loads)
   * @default 300
   */
  minDisplayTime?: number;

  /**
   * Position of loading indicator
   * @default 'center'
   */
  position?: 'top' | 'center' | 'bottom';

  /**
   * Show overlay behind loading indicator
   * @default true
   */
  showOverlay?: boolean;

  /**
   * Overlay opacity (0-1)
   * @default 0.5
   */
  overlayOpacity?: number;
}
