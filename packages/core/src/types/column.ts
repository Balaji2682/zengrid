/**
 * Column definition types
 */

import type { HeaderConfig } from './header';
import type { CellRenderer } from '../rendering/renderers';
import type { CellEditor } from '../editing/cell-editor.interface';
import type { CellOverflowConfig } from './grid';

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
  resizable?: boolean; // Enable resize for this column (default: true)
  reorderable?: boolean; // Enable drag-to-reorder for this column (default: true)
  minWidth?: number; // Minimum width constraint
  maxWidth?: number; // Maximum width constraint

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
}

/**
 * Sort icons configuration
 */
export interface SortIcons {
  asc?: string; // Icon for ascending sort (default: '▲')
  desc?: string; // Icon for descending sort (default: '▼')
}
