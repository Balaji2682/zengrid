/**
 * Read access the grid hands a {@link RowStyleProvider} so it can inspect a row's
 * data without reaching into grid internals.
 */
export interface RowStyleContext {
  /** The full row record for a row index, in display order. */
  getRowData: (row: number) => unknown;
  /** Total row count, for bounds-aware callers. */
  rowCount: number;
}

/**
 * The per-row styling a provider contributes. Because ZenGrid renders individual
 * pooled cells (there is no per-row DOM element), both the classes and the inline
 * styles are applied to **every cell** in the row.
 */
export interface RowStyleResult {
  /** CSS classes added to each cell of the row. */
  classes?: string[];
  /**
   * Inline styles set on each cell of the row, keyed by CSS property name in
   * kebab-case (e.g. `'background-color'`, not `backgroundColor`). Applied via
   * `style.setProperty`, so custom properties (`--foo`) work too.
   */
  style?: Record<string, string>;
}

/**
 * Supplies per-row class/style to the renderer. Core ships no implementation — the
 * grid styles rows only when a provider is set on `GridOptions.rowStyleProvider`
 * (see `@zengrid/enterprise`'s `rowStyling()`), so the default build is unaffected.
 * Called for each visible row per render pass (memoized within the pass).
 */
export interface RowStyleProvider {
  /**
   * Return the class/style for a row, or `undefined`/nothing when the row is
   * unstyled. Keep it pure and cheap — it is consulted during rendering.
   */
  getRowStyle(row: number, ctx: RowStyleContext): RowStyleResult | undefined;
  /**
   * Optional change notification. When the styling depends on mutable state, call
   * the subscriber to force a re-render; return an unsubscribe function.
   */
  subscribe?(cb: () => void): () => void;
}
