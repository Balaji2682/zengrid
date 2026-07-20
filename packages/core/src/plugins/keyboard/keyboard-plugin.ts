import type { GridPlugin, PluginDisposable } from '../../reactive/types';
import type { CellRef, GridOptions, GridState } from '../../types';
import { NAV_KEYS, isEditableTarget, nextCell } from './keyboard-nav-utils';

export interface KeyboardPluginOptions {
  options?: GridOptions;
  state?: GridState;
  container?: HTMLElement;
}

interface Scroller {
  getCellPosition(row: number, col: number): { x: number; y: number; width: number; height: number };
  getRowAtOffset(offset: number): number;
}

/**
 * KeyboardPlugin - Store-driven keyboard cell navigation.
 *
 * Maintains `state.activeCell` (the single source read by the rendering active-cell
 * highlight and the editing Enter-to-edit guard) and drives selection + scroll-into-view
 * as the active cell moves. Arrow/Page/Home/End move the cursor; Shift extends a range;
 * Ctrl/Cmd+A selects all. Enter/F2 editing is handled by the editing plugin's own keydown.
 */
export function createKeyboardPlugin(pluginOpts?: KeyboardPluginOptions): GridPlugin {
  return {
    name: 'keyboard',
    phase: 46,
    dependencies: ['core'],
    setup(store, api): PluginDisposable {
      const domCleanups: Array<() => void> = [];

      function colCount(): number {
        return pluginOpts?.options?.colCount ?? 0;
      }

      function rowCount(): number {
        return pluginOpts?.options?.rowCount ?? 0;
      }

      function getScroller(): Scroller | null {
        const fn = api.getMethod('rendering', 'getScroller') as (() => Scroller | null) | undefined;
        return fn ? fn() : null;
      }

      function pageStep(scroller: Scroller | null, scrollContainer: HTMLElement | null): number {
        if (scroller && scrollContainer) {
          const top = scrollContainer.scrollTop;
          const rows = scroller.getRowAtOffset(top + scrollContainer.clientHeight) -
            scroller.getRowAtOffset(top);
          if (rows > 0) return rows;
        }
        return 10;
      }

      function scrollIntoView(cell: CellRef): void {
        const scroller = getScroller();
        const scrollContainer = store.get('dom.scrollContainer') as HTMLElement | null;
        if (!scroller || !scrollContainer) return;

        const pos = scroller.getCellPosition(cell.row, cell.col);
        const st = scrollContainer.scrollTop;
        const sl = scrollContainer.scrollLeft;
        const ch = scrollContainer.clientHeight;
        const cw = scrollContainer.clientWidth;

        let newTop = st;
        let newLeft = sl;
        if (pos.y < st) newTop = pos.y;
        else if (pos.y + pos.height > st + ch) newTop = pos.y + pos.height - ch;
        if (pos.x < sl) newLeft = pos.x;
        else if (pos.x + pos.width > sl + cw) newLeft = pos.x + pos.width - cw;

        if (newTop !== st || newLeft !== sl) {
          scrollContainer.scrollTop = newTop;
          scrollContainer.scrollLeft = newLeft;
          if (store.hasAction('rendering:handleScroll')) {
            store.exec('rendering:handleScroll', newTop, newLeft);
          }
        }
      }

      let anchor: CellRef | null = null;

      function setActive(cell: CellRef, extend: boolean): void {
        const state = pluginOpts?.state;
        if (state) state.activeCell = cell;

        if (extend && anchor && store.hasAction('selection:selectRange')) {
          store.exec('selection:selectRange', anchor.row, anchor.col, cell.row, cell.col);
        } else if (store.hasAction('selection:selectCell')) {
          store.exec('selection:selectCell', cell.row, cell.col);
          anchor = cell;
        } else {
          anchor = cell;
        }

        // selection:* already refreshes classes via lifecycle; refresh directly when
        // there is no selection plugin so the active-cell highlight still repaints.
        if (!store.hasAction('selection:selectCell') && store.hasAction('rendering:refreshSelectionClasses')) {
          store.exec('rendering:refreshSelectionClasses');
        }

        scrollIntoView(cell);
      }

      const handleKeyDown = (event: KeyboardEvent): void => {
        const state = pluginOpts?.state;
        if (!state || state.editingCell) return;
        if (isEditableTarget(event.target)) return;

        const rows = rowCount();
        const cols = colCount();
        if (rows <= 0 || cols <= 0) return;

        const cmd = event.ctrlKey || event.metaKey;
        const key = event.key;

        if (cmd && (key === 'a' || key === 'A')) {
          if (store.hasAction('selection:selectAll')) {
            store.exec('selection:selectAll', rows);
            event.preventDefault();
          }
          return;
        }

        if (!NAV_KEYS.has(key)) return;

        const active = state.activeCell;
        if (!active) {
          setActive({ row: 0, col: 0 }, false);
          event.preventDefault();
          return;
        }

        let target: CellRef | null;
        if (cmd && key === 'Home') {
          target = { row: 0, col: 0 };
        } else if (cmd && key === 'End') {
          target = { row: rows - 1, col: cols - 1 };
        } else {
          const scrollContainer = store.get('dom.scrollContainer') as HTMLElement | null;
          const step = key === 'PageUp' || key === 'PageDown'
            ? pageStep(getScroller(), scrollContainer)
            : 1;
          target = nextCell(key, active, step, rows, cols);
        }

        if (!target) return;
        event.preventDefault();
        if (target === active) return;
        setActive(target, event.shiftKey);
      };

      const focusOnCellClick = (event: MouseEvent): void => {
        const container = pluginOpts?.container;
        const state = pluginOpts?.state;
        if (!container || (state && state.editingCell)) return;
        const cell = (event.target as HTMLElement).closest('.zg-cell');
        if (cell) container.focus();
      };

      store.action(
        'keyboard:setup',
        () => {
          const container = pluginOpts?.container;
          if (!container) return;

          if (!container.hasAttribute('tabindex')) {
            container.setAttribute('tabindex', '0');
          }

          container.addEventListener('keydown', handleKeyDown);
          container.addEventListener('mousedown', focusOnCellClick);
          domCleanups.push(() => container.removeEventListener('keydown', handleKeyDown));
          domCleanups.push(() => container.removeEventListener('mousedown', focusOnCellClick));
        },
        'keyboard'
      );

      api.register('keyboard', {
        setActiveCell: (cell: CellRef) => setActive(cell, false),
        getActiveCell: () => pluginOpts?.state?.activeCell ?? null,
      });

      return { teardown: [() => domCleanups.forEach((fn) => fn())] };
    },
  };
}
