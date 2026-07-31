/**
 * Grid configuration and state types
 */

import type { RendererCacheConfig } from '../rendering/cache';
import type { OperationMode } from '@zengrid/shared';
import type { CellRef, CellRange } from './cell';
import type { ColumnDef, SortIcons } from './column';
import type { SortState } from './sort';
import type { FilterModel } from './filter';
import type { DataLoadRequest, DataLoadResponse } from './data';
import type { PaginationConfig } from './pagination';
import type { LoadingConfig } from './loading';
import type { ZenGridTheme, PartialTheme } from '../theming/theme.interface';

/**
 * Grid options
 */
export interface GridOptions {
  rowCount: number;
  colCount: number;
  rowHeight: number | number[]; // Uniform or variable row heights
  colWidth: number | number[]; // Uniform or variable column widths
  columns?: ColumnDef[];

  /** Header row height in pixels. Defaults to 40. */
  headerHeight?: number;

  /**
   * Theme to apply. One of:
   * - a registered theme ID string (e.g. 'dark', 'material')
   * - a full ZenGridTheme object
   * - `{ base, override }` to start from a base theme (id or object) and apply
   *   a deep PartialTheme on top - e.g.
   *   `{ base: 'light', override: { colors: { text: { primary: '#123' } } } }`
   */
  theme?: string | ZenGridTheme | { base: string | ZenGridTheme; override: PartialTheme };

  /**
   * Automatically render the grid on the first `setData()` call (and refresh on
   * subsequent calls) so `new Zengrid(...)` + `setData(...)` shows data without a
   * separate `render()`. Set to false for fully manual control. (default: true)
   */
  autoRender?: boolean;

  /**
   * Emit the legacy bare `data-theme="light|dark"` attribute on the container.
   * The well-namespaced `data-zg-theme` and `.zg-theme-dark` class are always
   * set; disable this to avoid colliding with host apps that theme off a plain
   * `[data-theme]` selector. (default: true)
   */
  legacyThemeAttribute?: boolean;

  /**
   * Automatically switch between light/dark themes based on prefers-color-scheme
   * When enabled, uses 'light' theme for light mode and 'dark' theme for dark mode
   */
  autoTheme?: boolean;

  /**
   * Drop the last column's own right-edge border (header + body cells) so it
   * doesn't double up against a bordered container into a thin "empty column"
   * strip. Off by default. (default: false)
   */
  hideLastColumnBorder?: boolean;

  /**
   * Cell editing behavior configuration
   */
  editing?: EditingConfig;

  enableSelection?: boolean;
  enableMultiSelection?: boolean;
  /**
   * Selection type (cell, row, column, or range)
   * @default 'cell'
   */
  selectionType?: 'cell' | 'row' | 'column' | 'range';
  enableKeyboardNavigation?: boolean;
  enableA11y?: boolean;

  /** Number of rows to render beyond visible area (default: 10) - prevents blank areas during fast scrolling */
  overscanRows?: number;

  /** Number of columns to render beyond visible area (default: 5) - prevents blank areas during fast scrolling */
  overscanCols?: number;

  enableCellPooling?: boolean;
  rendererCache?: RendererCacheConfig;
  sortIcons?: SortIcons; // Configurable sort icons with defaults

  // Data Operation Modes - unified pattern for frontend/backend operations
  /**
   * Data loading mode
   * - 'frontend': All data loaded in memory (default)
   * - 'backend': Data loaded on-demand and query state delegated via onDataRequest
   * - 'auto': Use backend loading if onDataRequest is present, while sort/filter stay frontend
   */
  dataMode?: OperationMode;

  // Callbacks for backend operations
  /**
   * Backend data loading callback
   * Called when dataMode is 'backend' or when auto mode resolves to backend loading.
   * In explicit backend mode, request.query includes canonical sort/filter/pagination state.
   * In auto mode, request.query is limited to pagination/range state so sort/filter remain frontend.
   */
  onDataRequest?: (request: DataLoadRequest) => Promise<DataLoadResponse>;

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

  // Viewport Management
  /**
   * Automatically update viewport when container size changes (default: true)
   * Uses ResizeObserver to detect changes from:
   * - Window resize
   * - Dev tools open/close
   * - Sidebar collapse/expand
   * - Parent container size changes
   *
   * Set to false for manual control via grid.updateViewport()
   */
  autoResize?: boolean;

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
    /** Skip header width when auto-fitting columns (default: false - headers included) */
    skipHeaderOnAutoSize?: boolean;
    /** Show visual resize handles (default: true) */
    showHandles?: boolean;
    /** Show preview line during drag (default: true) */
    showPreview?: boolean;
    /** Auto-fit all columns on initial load (default: false) */
    autoFitOnLoad?: boolean;
  };

  // Column Drag
  /**
   * Enable column drag and drop reordering (default: true)
   */
  enableColumnDrag?: boolean;

  /**
   * Column drag configuration
   */
  columnDrag?: {
    /** Drag threshold in pixels before drag starts (default: 5) */
    dragThreshold?: number;
    /** Show ghost element during drag (default: true) */
    showGhost?: boolean;
    /** Show drop indicator (default: true) */
    showDropIndicator?: boolean;
    /** Show adjacent column highlights (default: true) */
    showAdjacentHighlights?: boolean;
    /** Enable touch support (default: true) */
    enableTouch?: boolean;
    /** Long press duration for touch in ms (default: 500) */
    touchLongPressDuration?: number;
    /** Enable keyboard navigation (default: true) */
    enableKeyboard?: boolean;
  };

  // Infinite Scrolling
  /**
   * Enable infinite scrolling (dynamic data loading)
   */
  infiniteScrolling?: {
    /** Enable infinite scrolling (default: false) */
    enabled?: boolean;
    /** Number of rows from the bottom to trigger data loading (default: 20) */
    threshold?: number;
    /** Initial row count (will grow as more data loads) */
    initialRowCount?: number;

    // Sliding Window (Memory Management)
    /** Enable sliding window to limit memory usage (default: false) */
    enableSlidingWindow?: boolean;
    /** Maximum number of rows to keep in memory (default: 1000) */
    windowSize?: number;
    /** Row count threshold to trigger pruning old rows (default: windowSize + 200) */
    pruneThreshold?: number;
    /** Callback when old rows are pruned from memory */
    onDataPruned?: (prunedRowCount: number, newVirtualOffset: number) => void;
  };

  /**
   * Infinite scrolling data loader callback
   * Called when user scrolls near the bottom and more data is needed
   *
   * @param currentRowCount - Current total rows in the grid
   * @returns Promise resolving to new rows to append
   *
   * @example
   * ```typescript
   * onLoadMoreRows: async (currentRowCount) => {
   *   const response = await fetch(`/api/data?offset=${currentRowCount}&limit=100`);
   *   const newRows = await response.json();
   *   return newRows;
   * }
   * ```
   */
  onLoadMoreRows?: (currentRowCount: number) => Promise<any[][]>;

  // Row Height Configuration
  /**
   * Row height mode
   * - 'fixed': All rows use fixed height from rowHeight option (default)
   * - 'auto': Automatically measure and adjust row heights based on content
   * - 'content-aware': Measure only rows with height-affecting columns
   */
  rowHeightMode?: 'fixed' | 'auto' | 'content-aware';

  /**
   * Row height configuration options
   * Only applies when rowHeightMode is 'auto' or 'content-aware'
   */
  rowHeightConfig?: RowHeightConfig;

  /**
   * Global cell overflow configuration
   * Can be overridden per-column via ColumnDef.overflow
   */
  cellOverflow?: CellOverflowConfig;

  // Event callbacks
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  onCellClick?: (row: number, col: number) => void;
  onCellDoubleClick?: (row: number, col: number) => void;
  onCellContextMenu?: (row: number, col: number, event: MouseEvent) => void;
  onSelectionChange?: (selection: CellRange[]) => void;
  onPageChange?: (page: number, pageSize: number) => void;
  onColumnWidthsChange?: (widths: number[]) => void; // Called when column widths change (for persistence)
}

/**
 * How the mode behaves when an edit fails validation.
 * - 'block': keep the editor open and flag it invalid (red border + tooltip);
 *   the user must fix the value or press Escape. Never loses input. (default)
 * - 'revert': discard the invalid input, restore the original value and close
 *   the editor, so focus can move to another cell.
 * - 'commit': accept the invalid value, close the editor and mark the cell
 *   with `.zg-cell-invalid` so the error stays visible in the grid.
 */
export type InvalidEditMode = 'block' | 'revert' | 'commit';

/**
 * Cell editing behavior configuration
 */
export interface EditingConfig {
  /**
   * What to do when an edit commit fails the editor's validation.
   * @default 'block'
   */
  invalidEditMode?: InvalidEditMode;
}

/**
 * Grid state
 */
export interface GridState {
  data: any[][];
  selection: CellRange[];
  activeCell: CellRef | null;
  scrollPosition: { top: number; left: number };
  editingCell: CellRef | null;
}

/**
 * Column state snapshot for persistence
 */
export interface ColumnStateSnapshot {
  id?: string;
  field?: string;
  width?: number;
  visible?: boolean;
  order?: number;
}

/**
 * Grid state snapshot for persistence
 */
export interface GridStateSnapshot {
  columns?: ColumnStateSnapshot[];
  sortState?: SortState[];
  filterState?: FilterModel[];
}

/**
 * Grid export options
 */
export interface GridExportOptions {
  /** Rows to export */
  rows?: 'all' | 'filtered' | 'selected' | number[];
  /** Columns to export */
  columns?: 'all' | 'visible' | number[];
  /** Include header row */
  includeHeaders?: boolean;
  /** Custom delimiter (default: comma for CSV) */
  delimiter?: string;
}

/**
 * Row height configuration options
 */
export interface RowHeightConfig {
  /**
   * Default row height in pixels
   * Used as initial estimate and fallback
   * @default 30
   */
  defaultHeight?: number;

  /**
   * Minimum row height constraint in pixels
   * @default 20
   */
  minHeight?: number;

  /**
   * Maximum row height constraint in pixels
   * @default 200
   */
  maxHeight?: number;

  /**
   * When to measure row heights (for 'auto' mode)
   * - 'render': Measure when row enters viewport (lazy, recommended)
   * - 'scroll-end': Measure after scroll stops (debounced)
   * - 'on-demand': Only measure via explicit API call
   * @default 'render'
   */
  measureTiming?: 'render' | 'scroll-end' | 'on-demand';

  /**
   * Number of rows to measure per animation frame
   * Lower = smoother but slower, Higher = faster but may cause jank
   * @default 10
   */
  measureBatchSize?: number;

  /**
   * Debounce delay for batch height updates (in milliseconds)
   * Prevents layout thrashing by batching multiple height changes
   * @default 16 (approx 1 frame at 60fps)
   */
  debounceMs?: number;

  /**
   * Cache measured heights for performance
   * Disable if content changes frequently
   * @default true
   */
  cacheHeights?: boolean;

  /**
   * Columns that can affect row height (for 'content-aware' mode)
   * Only these columns will be measured
   * If undefined, all columns are considered
   */
  heightAffectingColumns?: string[];

  /**
   * Custom height calculator function
   * Overrides automatic measurement
   * @param row - Row index
   * @param rowData - Full row data
   * @returns Height in pixels
   */
  heightCalculator?: (row: number, rowData: any) => number;

  /**
   * Callback when row heights change
   * Useful for persistence or synchronization
   * @param heights - Map of row index to height
   */
  onHeightsChange?: (heights: Map<number, number>) => void;
}

/**
 * Cell overflow configuration
 */
export interface CellOverflowConfig {
  /**
   * Overflow handling mode
   * - 'clip': Hide overflow content (default)
   * - 'ellipsis': Show ellipsis (...) for overflow
   * - 'wrap': Allow text wrapping (multi-line)
   * - 'expand': Expand row height to fit content (requires auto row height mode)
   * - 'scroll': Enable horizontal scrolling
   */
  mode: 'clip' | 'ellipsis' | 'wrap' | 'expand' | 'scroll';

  /**
   * Maximum lines before truncation (only for 'wrap' mode)
   * @default undefined (no limit)
   */
  maxLines?: number;

  /**
   * Show overflow indicator (e.g., "..." or scroll arrows)
   * @default true
   */
  showIndicator?: boolean;
}
