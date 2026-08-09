/**
 * Read access the grid hands a {@link CellStyleProvider} so it can inspect a cell
 * (its value, row record, and field) without reaching into grid internals.
 */
export interface CellStyleContext {
  /** The full row record for a row index, in display order. */
  getRowData: (row: number) => unknown;
  /** The displayed value at a cell, following sort/filter and column order. */
  getValue: (row: number, col: number) => unknown;
  /** The `field` of a visible column by its display index. */
  getField: (col: number) => string | undefined;
  /** Total row count, for bounds-aware callers. */
  rowCount: number;
  /** Visible column count, for bounds-aware callers. */
  colCount: number;
}

/**
 * The per-cell styling a provider contributes. Applied to the single cell element
 * (unlike row styling, which stamps every cell of a row).
 */
export interface CellStyleResult {
  /** CSS classes added to the cell. */
  classes?: string[];
  /**
   * Inline styles set on the cell, keyed by CSS property name in kebab-case
   * (e.g. `'background-color'`, not `backgroundColor`). Applied via
   * `style.setProperty`, so custom properties (`--foo`) work too.
   */
  style?: Record<string, string>;
}

/**
 * Supplies grid-wide per-cell class/style to the renderer. Core ships no
 * implementation — the grid styles cells this way only when a provider is set on
 * `GridOptions.cellStyleProvider` (see `@zengrid/enterprise`'s `cellStyling()`),
 * so the default build is unaffected. This is separate from the per-column
 * `cellClass`/`cellStyle` (which core resolves directly): the provider sees every
 * cell across all columns, for grid-wide conditional formatting.
 * Called for each visible cell per render pass.
 */
export interface CellStyleProvider {
  /**
   * Return the class/style for a cell, or `undefined`/nothing when the cell is
   * unstyled. Keep it pure and cheap — it is consulted during rendering.
   */
  getCellStyle(row: number, col: number, ctx: CellStyleContext): CellStyleResult | undefined;
  /**
   * Optional change notification. When the styling depends on mutable state, call
   * the subscriber to force a re-render; return an unsubscribe function.
   */
  subscribe?(cb: () => void): () => void;
}

/**
 * Arguments to a column's `cellClass`/`cellStyle` callback — everything needed to
 * decide a cell's styling from its own value and row.
 */
export interface CellStyleParams {
  /** Row index in display order. */
  row: number;
  /** Column index in display order. */
  col: number;
  /** The column's `field`. */
  field: string;
  /** The cell's displayed value. */
  value: unknown;
  /** The full row record. */
  data: unknown;
}

/** A class contribution: one class, several, or nothing. */
export type CellClassValue = string | string[] | null | undefined;

/** A style contribution: CSS property/value pairs, or nothing. Keys may be camelCase. */
export type CellStyleValue = Record<string, string | number> | null | undefined;

/** Normalize a class contribution to a deduped, non-empty list of class names. */
export function toCellClasses(value: CellClassValue): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  const seen = new Set<string>();
  for (const raw of list) {
    for (const cls of String(raw).split(/\s+/)) {
      if (cls) seen.add(cls);
    }
  }
  return [...seen];
}

/** camelCase → kebab-case, leaving custom properties (`--x`) and already-kebab keys intact. */
export function cellStyleKeyToKebab(prop: string): string {
  if (prop.startsWith('--')) return prop;
  return prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** Normalize a style contribution to CSS property/value string pairs the core hook applies. */
export function toCellStyle(value: CellStyleValue): Record<string, string> {
  if (!value) return {};
  const out: Record<string, string> = {};
  for (const [prop, val] of Object.entries(value)) {
    if (val === null || val === undefined) continue;
    out[cellStyleKeyToKebab(prop)] = String(val);
  }
  return out;
}
