import type { CellRef } from '../../types';

export const NAV_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
]);

/**
 * Whether keydown originated in a form control / editable element, in which case
 * the grid should let the element handle the key rather than navigate cells.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true
  );
}

/**
 * Compute the destination cell for a navigation key, clamped to grid bounds.
 * Returns the same reference when the key does not move (already at an edge).
 */
export function nextCell(
  key: string,
  active: CellRef,
  step: number,
  rows: number,
  cols: number
): CellRef | null {
  let { row, col } = active;
  switch (key) {
    case 'ArrowUp':
      row = Math.max(0, row - 1);
      break;
    case 'ArrowDown':
      row = Math.min(rows - 1, row + 1);
      break;
    case 'ArrowLeft':
      col = Math.max(0, col - 1);
      break;
    case 'ArrowRight':
      col = Math.min(cols - 1, col + 1);
      break;
    case 'PageUp':
      row = Math.max(0, row - step);
      break;
    case 'PageDown':
      row = Math.min(rows - 1, row + step);
      break;
    case 'Home':
      col = 0;
      break;
    case 'End':
      col = cols - 1;
      break;
    default:
      return null;
  }
  if (row === active.row && col === active.col) return active;
  return { row, col };
}
