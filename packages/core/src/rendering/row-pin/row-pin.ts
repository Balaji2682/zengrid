/**
 * Which band a pinned row is fixed to.
 */
export type RowPinPosition = 'top' | 'bottom';

/**
 * Read access the grid hands a {@link RowPinProvider} so it can decide which rows
 * are pinned without reaching into grid internals. `getRowId` maps a render-row
 * index (post sort/filter/pagination) to a stable identity, so a provider can pin
 * by identity and have the pin survive reordering.
 */
export interface RowPinContext {
  /** Total number of rows in the current view. */
  rowCount: number;
  /** Stable identity of the row at a render-row index. */
  getRowId: (row: number) => unknown;
}

/**
 * A standalone pinned row whose data lives outside the grid's dataset — the
 * mechanism behind AG Grid's `pinnedTopRowData`/`pinnedBottomRowData`. Its cells
 * resolve their value from {@link PinnedDataRow.data} via each column's `field`,
 * so it needs no render-row index and is unaffected by sort/filter/pagination.
 */
export interface PinnedDataRow {
  /** Row object; each cell reads `data[column.field]`. */
  data: unknown;
  /** Explicit row height in px; falls back to the grid's default row height. */
  height?: number;
}

/**
 * The set of pinned rows for the current view. `top`/`bottom` are render-row
 * indices (existing dataset rows) in the order they appear within each band;
 * `topData`/`bottomData` are standalone rows supplied by data. Within a band the
 * standalone rows sit outermost — `topData` above the pinned dataset rows, and
 * `bottomData` below them.
 */
export interface RowPinLayout {
  top: number[];
  bottom: number[];
  topData?: PinnedDataRow[];
  bottomData?: PinnedDataRow[];
}

/**
 * Supplies the pinned-row layout to the renderer. Core ships no implementation —
 * pinned bands render only when a provider is set on `GridOptions.pinProvider`
 * (see `@zengrid/enterprise`'s `rowPinning()`), so the default build is
 * unaffected. Optionally exposes {@link subscribe} so the grid re-renders the
 * bands when the pinned set changes (e.g. a user pins a row).
 */
export interface RowPinProvider {
  /** Return the render-row indices pinned to each band for the current view. */
  getPinned(ctx: RowPinContext): RowPinLayout;
  /**
   * Subscribe to pin-set changes. The grid recomputes and re-renders the bands
   * when `onChange` fires. Returns an unsubscribe function.
   */
  subscribe?(onChange: () => void): () => void;
}
