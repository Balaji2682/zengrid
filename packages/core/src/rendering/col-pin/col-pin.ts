/**
 * Column pinning (frozen columns) — generic render mechanism.
 *
 * Core ships no pinning behaviour of its own: freezing is OFF unless a
 * `colPinProvider` is supplied on `GridOptions`. The provider is asked, each
 * layout pass, which visible columns are frozen to the left or right edge; the
 * renderer then draws those columns "sticky" (repositioned to `scrollLeft +
 * offset` in the body, counter-translated in the header) so they stay in view
 * while the rest scroll horizontally.
 *
 * `@zengrid/enterprise`'s `columnPinning()` is the license-gated provider that
 * reads each column's declarative `pinned: 'left' | 'right'`.
 */

import type { ColumnDef } from '../../types/column';

/** A visible column, in display order, handed to the provider. */
export interface ColumnPinInfo {
  /** Visible (display) column index — the same index the renderer positions by. */
  index: number;
  /** Rendered width in pixels. */
  width: number;
  /** The column definition (carries `pinned` for declarative providers). */
  def: ColumnDef;
}

/** What the provider is asked each layout pass. */
export interface ColumnPinContext {
  /** Visible columns in display order. */
  columns: ColumnPinInfo[];
}

/** Which columns are frozen, by visible index, in visual left→right order. */
export interface ColumnPinLayout {
  left: number[];
  right: number[];
}

/** Supplies the frozen-column layout; core ships none. */
export interface ColumnPinProvider {
  getPinned(ctx: ColumnPinContext): ColumnPinLayout;
  /** Notify the grid when the pinned set changes (live pin/unpin). */
  subscribe?(cb: () => void): () => void;
}

/**
 * A resolved layout with the band widths and per-column offsets pre-computed —
 * shared by the body positioner and the header so both agree exactly.
 */
export interface ResolvedColumnPin {
  hasPins: boolean;
  leftCols: number[];
  rightCols: number[];
  leftBandWidth: number;
  rightBandWidth: number;
  /** Frozen side of a visible column, or null if it scrolls normally. */
  sideOf(col: number): 'left' | 'right' | null;
  /**
   * The canvas-space `left` a pinned cell must take so it appears fixed at the
   * band edge. Screen position is this minus `scrollLeft`. Used by the header,
   * whose whole cells track is JS-translated by `-scrollLeft`.
   */
  stickyLeft(col: number, scrollLeft: number, viewportWidth: number): number;
  /**
   * The band-local `left` a pinned cell takes inside its CSS `position: sticky`
   * pin band (left or right). The band freezes the column horizontally on the
   * compositor, so this offset is scroll-independent — the body positioner needs
   * no per-scroll repositioning. Left band: offset from the left edge. Right
   * band: negative offset from the band's right-anchored origin.
   */
  bandLeft(col: number): number;
}

const EMPTY: ResolvedColumnPin = {
  hasPins: false,
  leftCols: [],
  rightCols: [],
  leftBandWidth: 0,
  rightBandWidth: 0,
  sideOf: () => null,
  stickyLeft: () => 0,
  bandLeft: () => 0,
};

/**
 * Turn a raw `ColumnPinLayout` into a `ResolvedColumnPin`, summing band widths
 * and each column's offset within its band. `widthOf` returns a visible
 * column's rendered width.
 */
export function resolveColumnPin(
  layout: ColumnPinLayout | null | undefined,
  widthOf: (col: number) => number
): ResolvedColumnPin {
  const leftCols = layout?.left ?? [];
  const rightCols = layout?.right ?? [];
  if (leftCols.length === 0 && rightCols.length === 0) return EMPTY;

  const side = new Map<number, 'left' | 'right'>();
  const leftOffset = new Map<number, number>();
  const rightOffset = new Map<number, number>();

  let leftBandWidth = 0;
  for (const col of leftCols) {
    side.set(col, 'left');
    leftOffset.set(col, leftBandWidth);
    leftBandWidth += widthOf(col);
  }

  let rightBandWidth = 0;
  for (const col of rightCols) {
    side.set(col, 'right');
    rightOffset.set(col, rightBandWidth);
    rightBandWidth += widthOf(col);
  }

  return {
    hasPins: true,
    leftCols,
    rightCols,
    leftBandWidth,
    rightBandWidth,
    sideOf: (col) => side.get(col) ?? null,
    stickyLeft: (col, scrollLeft, viewportWidth) => {
      const s = side.get(col);
      if (s === 'left') return scrollLeft + (leftOffset.get(col) ?? 0);
      if (s === 'right') {
        return (
          scrollLeft + viewportWidth - rightBandWidth + (rightOffset.get(col) ?? 0)
        );
      }
      return scrollLeft;
    },
    bandLeft: (col) => {
      const s = side.get(col);
      if (s === 'left') return leftOffset.get(col) ?? 0;
      if (s === 'right') return (rightOffset.get(col) ?? 0) - rightBandWidth;
      return 0;
    },
  };
}
