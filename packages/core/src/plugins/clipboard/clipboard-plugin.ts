import type { GridPlugin, PluginDisposable } from '../../reactive/types';
import type { CellRange, CellRef, GridOptions, GridState } from '../../types';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import { ClipboardManager } from '../../features/copy-paste/clipboard-manager';
import { isEditableTarget } from '../keyboard/keyboard-nav-utils';

export interface ClipboardPluginOptions {
  options?: GridOptions;
  state?: GridState;
  container?: HTMLElement;
  events?: EventEmitter<GridEvents>;
  getColumnModel?: () => any;
  getDataAccessor?: () => any;
}

/**
 * ClipboardPlugin - Wires copy/cut/paste (Ctrl/Cmd+C/X/V) to the ClipboardManager.
 *
 * Operates in view coordinates: ranges come from `selection.ranges` (falling back to a
 * single-cell range at `state.activeCell`), and get/set map view row/col to data row/col
 * the same way the editing plugin does, so TSV/HTML round-trips with Excel and Sheets.
 */
export function createClipboardPlugin(pluginOpts?: ClipboardPluginOptions): GridPlugin {
  return {
    name: 'clipboard',
    phase: 47,
    dependencies: ['core'],
    setup(store, api): PluginDisposable {
      const domCleanups: Array<() => void> = [];
      let manager: ClipboardManager | null = null;

      const mapViewRowToDataRow = (viewRow: number): number => {
        const viewIndices = store.get('rows.viewIndices') as number[] | undefined;
        return viewIndices?.[viewRow] ?? viewRow;
      };

      const mapViewColToDataCol = (viewCol: number): number => {
        const columnModel = pluginOpts?.getColumnModel?.();
        if (!columnModel) return viewCol;
        const ordered = columnModel.getVisibleColumnsInOrder();
        return ordered?.[viewCol]?.dataIndex ?? viewCol;
      };

      const setCellValue = (row: number, col: number, value: any): void => {
        const state = pluginOpts?.state;
        if (!state) return;
        const dataRow = mapViewRowToDataRow(row);
        const dataCol = mapViewColToDataCol(col);
        const rowData = state.data[dataRow];
        if (Array.isArray(rowData)) rowData[dataCol] = value;
        store.exec('rendering:updateCells', [{ row, col }]);
      };

      function getManager(): ClipboardManager {
        if (manager) return manager;
        manager = new ClipboardManager({
          events: pluginOpts?.events,
          getValue: (row, col) => {
            const dataRow = mapViewRowToDataRow(row);
            const dataCol = mapViewColToDataCol(col);
            return pluginOpts?.getDataAccessor?.()?.getValue(dataRow, dataCol);
          },
          setValue: setCellValue,
          getRowCount: () => {
            const viewIndices = store.get('rows.viewIndices') as number[] | undefined;
            if (viewIndices) return viewIndices.length;
            return pluginOpts?.state?.data?.length ?? 0;
          },
          getColumnCount: () => {
            const columnModel = pluginOpts?.getColumnModel?.();
            const ordered = columnModel?.getVisibleColumnsInOrder?.();
            return ordered?.length ?? pluginOpts?.options?.columns?.length ?? 0;
          },
        });
        return manager;
      }

      function currentRanges(): CellRange[] {
        const ranges = store.get('selection.ranges') as CellRange[] | undefined;
        if (ranges && ranges.length > 0) return ranges;
        const active = pluginOpts?.state?.activeCell;
        if (active) {
          return [{ startRow: active.row, startCol: active.col, endRow: active.row, endCol: active.col }];
        }
        return [];
      }

      function pasteTarget(): CellRef | null {
        const active = pluginOpts?.state?.activeCell;
        if (active) return active;
        const ranges = store.get('selection.ranges') as CellRange[] | undefined;
        if (ranges && ranges.length > 0) {
          return { row: ranges[0].startRow, col: ranges[0].startCol };
        }
        return null;
      }

      const handleKeyDown = (event: KeyboardEvent): void => {
        const state = pluginOpts?.state;
        if (!state || state.editingCell) return;
        if (!(event.ctrlKey || event.metaKey)) return;
        if (isEditableTarget(event.target)) return;

        const key = event.key.toLowerCase();
        if (key === 'c') {
          const ranges = currentRanges();
          if (ranges.length === 0) return;
          event.preventDefault();
          void getManager().copy(ranges);
        } else if (key === 'x') {
          const ranges = currentRanges();
          if (ranges.length === 0) return;
          event.preventDefault();
          void getManager().cut(ranges);
        } else if (key === 'v') {
          const target = pasteTarget();
          if (!target) return;
          event.preventDefault();
          void getManager().paste(target.row, target.col);
        }
      };

      store.action(
        'clipboard:setup',
        () => {
          const container = pluginOpts?.container;
          if (!container) return;
          container.addEventListener('keydown', handleKeyDown);
          domCleanups.push(() => container.removeEventListener('keydown', handleKeyDown));
        },
        'clipboard'
      );

      api.register('clipboard', {
        copy: () => getManager().copy(currentRanges()),
        cut: () => getManager().cut(currentRanges()),
        paste: () => {
          const target = pasteTarget();
          return target ? getManager().paste(target.row, target.col) : Promise.resolve();
        },
      });

      return { teardown: [() => domCleanups.forEach((fn) => fn())] };
    },
  };
}
