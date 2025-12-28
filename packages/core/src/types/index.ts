/**
 * Core type definitions for ZenGrid
 */

/**
 * Reference to a specific cell in the grid
 */
export interface CellRef {
  row: number;
  col: number;
}

/**
 * A rectangular range of cells
 */
export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

/**
 * The currently visible range after virtual scrolling calculation
 */
export interface VisibleRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

/**
 * Cell position and dimensions (for absolute positioning)
 */
export interface CellPosition {
  x: number;      // Left offset in pixels
  y: number;      // Top offset in pixels
  width: number;  // Cell width in pixels
  height: number; // Cell height in pixels
}

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc' | null;

/**
 * Sort state for a column
 */
export interface SortState {
  column: number;
  direction: SortDirection;
  sortIndex?: number; // For multi-column sort
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
 * Column definition
 */
export interface ColumnDef {
  field: string;
  header: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  type?: 'text' | 'number' | 'date' | 'boolean';
  renderer?: string;
  editor?: string;
  formatter?: (value: any) => string;
  parser?: (value: string) => any;
}

/**
 * Grid configuration options
 */
export interface GridOptions {
  // Data
  rowCount: number;
  colCount: number;
  columns?: ColumnDef[];

  // Dimensions
  rowHeight: number | number[];
  colWidth: number | number[];
  headerHeight?: number;

  // Features
  enableSelection?: boolean;
  enableMultiSelection?: boolean;
  enableEditing?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableKeyboardNavigation?: boolean;

  // Accessibility
  enableA11y?: boolean;
  locale?: string;
  direction?: 'ltr' | 'rtl';

  // Performance
  overscanRows?: number;
  overscanCols?: number;
  enableCellPooling?: boolean;

  // Styling
  theme?: string;
  customCSS?: string;

  // Events
  onCellClick?: (cell: CellRef) => void;
  onCellDoubleClick?: (cell: CellRef) => void;
  onCellChange?: (cell: CellRef, oldValue: any, newValue: any) => void;
  onSelectionChange?: (ranges: CellRange[]) => void;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
}

/**
 * Grid state (internal)
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
