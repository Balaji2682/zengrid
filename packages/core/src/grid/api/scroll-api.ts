import type { VisibleRange } from '../../types';
import type { SlimGridContext } from '../grid-context';

export interface ScrollApi {
  toCell(row: number, col: number): void;
  throughCells(
    cells: Array<{ row: number; col: number }>,
    options?: { delayMs?: number; smooth?: boolean; onCellReached?: (cell: { row: number; col: number }, index: number) => void }
  ): { promise: Promise<void>; abort: () => void };
  getPosition(): { top: number; left: number };
  getVisibleRange(): VisibleRange | null;
  getElement(): HTMLElement | null;
}

export function createScrollApi(ctx: SlimGridContext): ScrollApi {
  return {
    toCell(row: number, col: number): void {
      const api = ctx.gridApi.getMethod('rendering', 'getCellPosition');
      const scrollContainer = ctx.store.get('dom.scrollContainer') as HTMLElement | null;
      if (!api || !scrollContainer) return;
      const position = api(row, col);
      scrollContainer.scrollTop = position.y;
      scrollContainer.scrollLeft = position.x;
    },

    throughCells(
      cells: Array<{ row: number; col: number }>,
      options?: { delayMs?: number; smooth?: boolean; onCellReached?: (cell: { row: number; col: number }, index: number) => void }
    ): { promise: Promise<void>; abort: () => void } {
      const getPosition = ctx.gridApi.getMethod('rendering', 'getCellPosition');
      const scrollContainer = ctx.store.get('dom.scrollContainer') as HTMLElement | null;
      const { delayMs = 1000, smooth = true, onCellReached } = options ?? {};

      let currentIndex = 0;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let aborted = false;

      const abort = () => { aborted = true; if (timeoutId !== null) clearTimeout(timeoutId); };
      const promise = new Promise<void>((resolve) => {
        const next = () => {
          if (aborted || currentIndex >= cells.length) { resolve(); return; }
          const cell = cells[currentIndex];
          if (scrollContainer && getPosition) {
            const pos = getPosition(cell.row, cell.col);
            if (smooth) scrollContainer.scrollTo({ top: pos.y, left: pos.x, behavior: 'smooth' });
            else { scrollContainer.scrollTop = pos.y; scrollContainer.scrollLeft = pos.x; }
          }
          if (onCellReached) onCellReached(cell, currentIndex);
          currentIndex++;
          if (currentIndex < cells.length) timeoutId = setTimeout(next, delayMs);
          else resolve();
        };
        next();
      });
      return { promise, abort };
    },

    getPosition(): { top: number; left: number } {
      return { ...ctx.state.scrollPosition };
    },

    getVisibleRange(): VisibleRange | null {
      const api = ctx.gridApi.getMethod('rendering', 'getVisibleRange');
      return api ? api() : null;
    },

    getElement(): HTMLElement | null {
      return (ctx.store.get('dom.scrollContainer') as HTMLElement | null) ?? null;
    },
  };
}
