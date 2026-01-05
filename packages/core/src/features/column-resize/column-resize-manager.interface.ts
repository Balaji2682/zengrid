import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import type { WidthProvider } from '../../rendering/width-provider';

/**
 * Column width constraints
 */
export interface ColumnConstraints {
  /** Minimum width in pixels (default: 30) */
  minWidth?: number;
  /** Maximum width in pixels (default: Infinity) */
  maxWidth?: number;
}

/**
 * Column resize options
 */
export interface ColumnResizeOptions {
  /** Event emitter for grid events */
  events?: EventEmitter<GridEvents>;

  /** Width provider for column widths */
  widthProvider: WidthProvider;

  /** Total number of columns */
  colCount: number;

  /** Get column offset (x position) */
  getColOffset: (col: number) => number;

  /** Get column width */
  getColWidth: (col: number) => number;

  /** Callback when column width changes */
  onWidthChange: (col: number, width: number) => void;

  /** Get cell value for auto-fit calculation */
  getValue?: (row: number, col: number) => any;

  /** Total row count for auto-fit */
  rowCount?: number;

  /** Enable column resize (default: true) */
  enabled?: boolean;

  /** Width of resize handle detection zone in pixels (default: 6) */
  resizeZoneWidth?: number;

  /** Global default constraints */
  defaultConstraints?: ColumnConstraints;

  /** Per-column constraints (keyed by column index) */
  columnConstraints?: Map<number, ColumnConstraints>;

  /** Maximum rows to sample for auto-fit (default: 100) */
  autoFitSampleSize?: number;

  /** Padding to add to auto-fit width (default: 16) */
  autoFitPadding?: number;

  /** Enable visual resize handles (default: true) */
  showHandles?: boolean;

  /** Enable resize preview line (default: true) */
  showPreview?: boolean;

  /** Callback when column widths change (for persistence) */
  onColumnWidthsChange?: (widths: number[]) => void;

  /** Undo/redo manager for integration */
  undoRedoManager?: any;

  /** Get scroll left position (for header that doesn't scroll itself) */
  getScrollLeft?: () => number;

  /** Get viewport height for preview line (defaults to header height) */
  getViewportHeight?: () => number;

  /** Resize strategy (defaults to SingleColumnResizeStrategy) */
  strategy?: ResizeStrategy;

  /** Called before resize starts - return false to prevent */
  onBeforeResize?: (event: BeforeResizeEvent) => boolean | Promise<boolean>;

  /** Called during resize drag */
  onDuringResize?: (event: DuringResizeEvent) => void;

  /** Validate resize operation */
  onValidateResize?: (
    column: number,
    newWidth: number
  ) => ResizeValidationResult | Promise<ResizeValidationResult>;
}

/**
 * Resize state during drag operation
 */
export interface ResizeState {
  /** Column being resized */
  column: number;
  /** Starting X position of drag */
  startX: number;
  /** Original column width */
  originalWidth: number;
  /** Whether resize is in progress */
  active: boolean;
}

/**
 * Resize zone detection result
 */
export interface ResizeZoneResult {
  /** Whether mouse is in resize zone */
  inResizeZone: boolean;
  /** Column index (the column whose RIGHT border is being dragged) */
  column: number;
  /** X position of the column border */
  borderX: number;
}

/**
 * Validation result for resize operations
 */
export interface ResizeValidationResult {
  /** Whether the resize is valid */
  valid: boolean;
  /** Reason for rejection (if invalid) */
  reason?: string;
  /** Alternative width suggestion (optional) */
  suggestedWidth?: number;
}

/**
 * Event data for before resize lifecycle hook
 */
export interface BeforeResizeEvent {
  /** Column being resized */
  column: number;
  /** Current width */
  currentWidth: number;
  /** Proposed new width */
  newWidth: number;
  /** Method to prevent the resize */
  preventDefault: () => void;
}

/**
 * Event data for during resize lifecycle hook
 */
export interface DuringResizeEvent {
  /** Column being resized */
  column: number;
  /** Original width when drag started */
  originalWidth: number;
  /** Current width during drag */
  currentWidth: number;
  /** Delta from start */
  deltaX: number;
}

/**
 * Minimal interface for data source that supports column resizing
 * Decouples resize logic from Grid internals
 */
export interface ResizableDataSource {
  /** Get total number of columns */
  getColumnCount(): number;
  /** Get column offset (x position) */
  getColumnOffset(col: number): number;
  /** Get column width */
  getColumnWidth(col: number): number;
  /** Set column width */
  setColumnWidth(col: number, width: number): void;
  /** Get cell value (optional, for auto-fit) */
  getValue?(row: number, col: number): any;
  /** Get row count (optional, for auto-fit) */
  getRowCount?(): number;
}

/**
 * Strategy interface for different resize behaviors
 */
export interface ResizeStrategy {
  /** Strategy name */
  readonly name: string;

  /**
   * Calculate new width based on current state and mouse position
   * @param state Current resize state
   * @param currentX Current mouse X position in grid coordinates
   * @param dataSource Data source for accessing column information
   * @returns New width for the column
   */
  calculateNewWidth(
    state: ResizeState,
    currentX: number,
    dataSource: ResizableDataSource
  ): number;

  /**
   * Get list of columns affected by this resize
   * @param column Column being resized
   * @param dataSource Data source for accessing column information
   * @returns Array of affected column indices
   */
  getAffectedColumns(column: number, dataSource: ResizableDataSource): number[];
}
