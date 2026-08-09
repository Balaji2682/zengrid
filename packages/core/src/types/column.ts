/**
 * Column definition types
 */

import type { HeaderConfig } from './header';
import type { CellRenderer } from '../rendering/renderers';
import type { CellEditor } from '../editing/cell-editor.interface';
import type { CellOverflowConfig } from './grid';
import type { CellClassValue, CellStyleValue, CellStyleParams } from '../rendering/cell-style/cell-style';

/**
 * Arguments to a column's `valueGetter` — the current row plus a helper to read
 * sibling fields, so a column can derive its value from the rest of the row.
 */
export interface ValueGetterParams {
  /** Display row index. */
  row: number;
  /** This column's field. */
  field: string;
  /** The raw source row (as passed to `setData`). */
  data: unknown;
  /** Read another column's value in this row by its `field`. */
  getValue: (field: string) => unknown;
}

/**
 * Column definition
 */
export interface ColumnDef {
  id?: string; // Unique identifier for the column (auto-generated if not provided)
  field: string;
  /**
   * Header configuration
   * - string: Simple text header (backward compatible)
   * - HeaderConfig: Full configuration object
   */
  header: string | HeaderConfig;
  width?: number;
  /**
   * Horizontal alignment for this column's header and body cells.
   * Applies to the default renderers; custom renderers may override.
   * @default 'left'
   */
  align?: 'left' | 'center' | 'right';
  /**
   * Renderer configuration
   * - string: Renderer name registered in RendererRegistry (e.g., 'text', 'checkbox')
   * - CellRenderer: Direct renderer instance for custom behavior
   */
  renderer?: string | CellRenderer;
  sortable?: boolean;
  editable?: boolean;
  /**
   * Editor configuration
   * - string: Editor name registered in EditorManager (e.g., 'text', 'date')
   * - CellEditor: Direct editor instance for custom behavior
   */
  editor?: string | CellEditor<any>;
  editorOptions?: any; // Options passed to editor
  filterable?: boolean;
  /**
   * Data type of this column's filter, driving which operators the filter popup
   * offers and how typed input is parsed. `'text'` (default) → substring/equality
   * operators; `'number'` → comparison + range (Greater than, Between, …) with
   * numeric input; `'date'` → date comparisons with a date input. Only affects
   * the built-in filter UI; the filter engine matches any operator regardless.
   */
  filterType?: 'text' | 'number' | 'date';
  resizable?: boolean; // Enable resize for this column (default: true)
  reorderable?: boolean; // Enable drag-to-reorder for this column (default: true)
  minWidth?: number; // Minimum width constraint
  maxWidth?: number; // Maximum width constraint

  /**
   * Freeze this column to the left or right edge so it stays in view while the
   * other columns scroll horizontally. Declarative marker only — it does nothing
   * on its own; a `colPinProvider` (see `@zengrid/enterprise`'s `columnPinning()`)
   * must be set on the grid to read it and drive the frozen layout.
   */
  pinned?: 'left' | 'right' | null;

  /**
   * Derive this column's displayed value from the row instead of reading it
   * positionally from the data — e.g. a `total` from `price × quantity`. When set,
   * the grid calls this instead of the positional lookup. Declarative hook only;
   * `@zengrid/enterprise`'s `calculatedColumn()` builds a license-gated one.
   */
  valueGetter?: (params: ValueGetterParams) => unknown;

  /**
   * CSS class(es) added to this column's body cells. A plain string/array applies
   * to every cell; a callback is evaluated per cell for value-driven styling.
   * Classes hook into your stylesheet — target `.zg-cell.your-class`. Community.
   *
   * @example
   * cellClass: ({ value }) => (value < 0 ? 'negative' : null)
   */
  cellClass?: CellClassValue | ((params: CellStyleParams) => CellClassValue);

  /**
   * Inline styles set on this column's body cells. A plain object applies to every
   * cell; a callback is evaluated per cell. Keys may be camelCase
   * (`backgroundColor`) or kebab-case (`background-color`); custom properties
   * (`--x`) pass through as-is. Inline styles win over classes and the theme.
   * Community.
   *
   * @example
   * cellStyle: ({ value }) => (value < 0 ? { color: '#e5484d' } : null)
   */
  cellStyle?: CellStyleValue | ((params: CellStyleParams) => CellStyleValue);

  /**
   * Cell overflow configuration for this column
   * Overrides global cellOverflow setting from GridOptions
   */
  overflow?: CellOverflowConfig;

  /**
   * Enable auto-height for this column's cells
   * When true, rows will be measured and expanded to fit content in this column
   * Only applies when rowHeightMode is 'hybrid' or 'auto'
   *
   * Use cases:
   * - Columns with ChipRenderer that might wrap
   * - Multi-line text content
   * - Dynamic content that varies in height
   *
   * @default false
   */
  autoHeight?: boolean;

  /**
   * @deprecated Use autoHeight instead
   * Whether this column's content affects row height calculation
   * Only relevant when rowHeightMode is 'content-aware'
   * @default false
   */
  affectsRowHeight?: boolean;

  /**
   * Row spanning: merge this column's cell at `rowIndex` with the following rows
   * into a single tall cell. Return the number of rows the cell should span
   * (1 = no span). Typically used to group runs of a repeated value.
   *
   * Called once per anchor row within the rendered window only, so it stays fast
   * at large row counts. Rows covered by an anchor above are not rendered.
   *
   * @example
   * rowSpan: ({ value, rowIndex, getValue }) => {
   *   let span = 1;
   *   while (getValue(rowIndex + span) === value) span++;
   *   return span;
   * }
   */
  rowSpan?: RowSpanResolver;
}

/**
 * Parameters passed to a column's {@link ColumnDef.rowSpan} resolver.
 */
export interface RowSpanParams {
  /** Value of the anchor cell — this column at `rowIndex`. */
  value: unknown;
  /** Absolute row index of the anchor cell being measured. */
  rowIndex: number;
  /** Read this column's value at any absolute row, for looking ahead/behind. */
  getValue: (row: number) => unknown;
}

/**
 * Returns how many rows a cell spans in its column (1 = no span). See
 * {@link ColumnDef.rowSpan}.
 */
export type RowSpanResolver = (params: RowSpanParams) => number;

/**
 * Sort icons configuration
 */
export interface SortIcons {
  asc?: string; // Icon for ascending sort (default: '▲')
  desc?: string; // Icon for descending sort (default: '▼')
}
