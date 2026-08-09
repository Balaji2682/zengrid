import type { ColumnDef } from '../../types/column';
import type { VisibleRange } from '../../types';

/**
 * Row-span layout for a single column over one rendered window.
 */
export interface ColumnSpanInfo {
  /** Rows hidden because an anchor above spans over them (skip rendering). */
  covered: Set<number>;
  /** Anchor row -> number of rows it spans (always > 1). */
  anchorSpan: Map<number, number>;
}

/**
 * Read access the grid hands a {@link RowSpanProvider} so it can inspect columns
 * and cell values for the visible window without reaching into grid internals.
 */
export interface RowSpanContext {
  /** The definition of a visible column by its render-order index. */
  getColumn: (col: number) => ColumnDef | undefined;
  /** The value at a cell, in display order. */
  getData: (row: number, col: number) => unknown;
  /** Total row count, for clamping spans at the end of the data. */
  rowCount: number;
}

/**
 * Supplies row-span layout to the renderer. Core ships no implementation — the
 * grid renders spans only when a provider is set on `GridOptions.spanProvider`
 * (see `@zengrid/enterprise`'s `rowSpanning()`), so the default build is
 * unaffected. Called once per render pass for the current window.
 */
export interface RowSpanProvider {
  /**
   * Return the per-column span layout for the visible window, keyed by visible
   * column index. Omit columns that don't span.
   */
  getSpans(range: VisibleRange, ctx: RowSpanContext): Map<number, ColumnSpanInfo>;
}
