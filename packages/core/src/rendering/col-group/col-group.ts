/**
 * Column groups (grouped header banners) — generic render mechanism.
 *
 * Core ships no grouping of its own: grouped headers are OFF unless a
 * `colGroupProvider` is supplied on `GridOptions`. The provider reports how many
 * banner rows sit above the leaf headers (`levels`) and, each render, which
 * banner cells to draw and the leaf-column range each one spans. The header then
 * draws those banners, aligned to the columns and scroll-synced with the body.
 *
 * `@zengrid/enterprise`'s `columnGroups()` is the license-gated provider that
 * turns a nested group definition into this layout.
 */

/** A visible column, in display order, handed to the provider. */
export interface ColumnGroupInfo {
  index: number;
  field: string;
  width: number;
}

/** What the provider is asked each render pass. */
export interface ColumnGroupContext {
  columns: ColumnGroupInfo[];
}

/** One banner cell: a label spanning the leaf columns `[startCol, endCol)`. */
export interface ColumnGroupCell {
  label: string;
  /** First visible leaf column the banner spans (inclusive). */
  startCol: number;
  /** One past the last leaf column the banner spans (exclusive). */
  endCol: number;
  /** Banner row, 0 = topmost. Leaf headers sit at row `levels`. */
  level: number;
  groupId?: string;
  /** When true, the banner draws a toggle that collapses/expands the group. */
  collapsible?: boolean;
  /** Current collapse state, used to draw the toggle direction. */
  collapsed?: boolean;
}

/** The banner rows to draw and how deep they stack. */
export interface ColumnGroupLayout {
  levels: number;
  cells: ColumnGroupCell[];
}

/** Supplies the grouped-header layout; core ships none. */
export interface ColumnGroupProvider {
  /** Number of banner rows above the leaf headers (fixed for the header height). */
  readonly levels: number;
  getGroups(ctx: ColumnGroupContext): ColumnGroupLayout;
  /** Notify the grid when the grouping changes (e.g. expand/collapse). */
  subscribe?(cb: () => void): () => void;
  /**
   * Flip a group's collapsed state. Called by the header when its banner toggle
   * is clicked; the grid then reconciles column visibility from
   * `hiddenFields()`/`managedFields()`.
   */
  toggleCollapse?(groupId: string): void;
  /** Leaf fields that should be hidden right now, given the collapse state. */
  hiddenFields?(): string[];
  /** Every leaf field any group owns — the columns collapse may hide or show. */
  managedFields?(): string[];
}

/** A banner cell with its pixel geometry resolved from the column widths. */
export interface ResolvedGroupCell extends ColumnGroupCell {
  x: number;
  width: number;
}

/**
 * Resolve each banner cell's `x`/`width` from the visible column widths (prefix
 * sums), so the header can position banners flush over the columns they span.
 * `widthOf(col)` returns a visible column's rendered width.
 */
export function resolveColumnGroupCells(
  cells: ColumnGroupCell[],
  widthOf: (col: number) => number,
  colCount: number
): ResolvedGroupCell[] {
  // Prefix sum of column offsets.
  const offset: number[] = new Array(colCount + 1);
  offset[0] = 0;
  for (let c = 0; c < colCount; c++) offset[c + 1] = offset[c] + widthOf(c);

  const clamp = (c: number) => Math.max(0, Math.min(colCount, c));
  return cells
    .filter((cell) => cell.endCol > cell.startCol)
    .map((cell) => {
      const start = clamp(cell.startCol);
      const end = clamp(cell.endCol);
      const x = offset[start];
      return { ...cell, x, width: offset[end] - x };
    });
}
