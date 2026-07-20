import type { GridPlugin, PluginDisposable } from '../../reactive/types';
import type { CellRef, GridOptions, GridState } from '../../types';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import type { ColumnModel } from '../../features/columns/column-model';
import { EditorManager } from '../../editing/editor-manager';
import { resolveHeaderHeight } from '../header/header-types';

export interface EditingPluginOptions {
  options?: GridOptions;
  state?: GridState;
  container?: HTMLElement;
  events?: EventEmitter<GridEvents>;
  getColumnModel?: () => ColumnModel | null;
  getDataAccessor?: () => any;
}

export function createEditingPlugin(pluginOpts?: EditingPluginOptions): GridPlugin {
  return {
    name: 'editing',
    phase: 45,
    dependencies: ['core'],
    setup(store, api): PluginDisposable {
      store.extend('editing.active', null as CellRef | null, 'editing', 45);

      let editorManager: any = null;
      const eventUnsubs: Array<() => void> = [];
      const domCleanups: Array<() => void> = [];

      store.action(
        'editing:bind',
        (mgr: any) => {
          editorManager = mgr;
        },
        'editing'
      );

      store.action(
        'editing:setup',
        () => {
          if (!pluginOpts) return;
          const { options, state, container, events, getColumnModel, getDataAccessor } = pluginOpts;
          if (!options || !state || !container || !events) return;

          const scrollContainer = store.get('dom.scrollContainer') as HTMLElement | null;
          if (!scrollContainer) return;

          const mapViewRowToDataRow = (viewRow: number): number => {
            const viewIndices = store.get('rows.viewIndices') as number[] | undefined;
            return viewIndices?.[viewRow] ?? viewRow;
          };

          const mapViewColToDataCol = (viewCol: number): number => {
            const columnModel = getColumnModel?.();
            if (!columnModel) return viewCol;
            const orderedColumns = columnModel.getVisibleColumnsInOrder();
            return orderedColumns?.[viewCol]?.dataIndex ?? viewCol;
          };

          const setCellValue = (row: number, col: number, value: any): void => {
            const dataRow = mapViewRowToDataRow(row);
            const dataCol = mapViewColToDataCol(col);
            const rowData = state.data[dataRow];
            if (Array.isArray(rowData)) {
              rowData[dataCol] = value;
            }
            store.exec('rendering:updateCells', [{ row, col }]);
          };

          if (!editorManager) {
            editorManager = new EditorManager({
              container,
              scrollContainer,
              events,
              headerHeight: resolveHeaderHeight(options),
              invalidEditMode: options.editing?.invalidEditMode,
              getValue: (row, col) => {
                const dataRow = mapViewRowToDataRow(row);
                const dataCol = mapViewColToDataCol(col);
                return getDataAccessor?.()?.getValue(dataRow, dataCol);
              },
              setValue: setCellValue,
              getColumn: (col) => {
                const dataCol = mapViewColToDataCol(col);
                return options.columns?.[dataCol];
              },
              getRowData: (row) => {
                const dataRow = mapViewRowToDataRow(row);
                return state.data[dataRow];
              },
              getCellElement: (row, col) =>
                container.querySelector(
                  `.zg-cell[data-row="${row}"][data-col="${col}"]`
                ) as HTMLElement | null,
              onEditStart: (cell) => {
                state.editingCell = cell;
                store.exec('rendering:refreshSelectionClasses');
              },
              onEditEnd: () => {
                state.editingCell = null;
                store.set('editing.active', null as any);
                store.exec('rendering:refreshSelectionClasses');
              },
              onCommit: (cell, oldValue, newValue) => {
                if (!store.hasAction('undoRedo:recordCellEdit')) return;
                store.exec(
                  'undoRedo:recordCellEdit',
                  cell.row,
                  cell.col,
                  oldValue,
                  newValue,
                  setCellValue
                );
              },
            });

            store.exec('editing:bind', editorManager);

            eventUnsubs.push(
              events.on('scroll', () => {
                editorManager?.updateEditorPosition();
              })
            );

            eventUnsubs.push(
              events.on('viewport:resized' as any, () => {
                editorManager?.updateEditorPosition();
              })
            );
          }

          // Dblclick to start editing
          const dblclickHandler = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const cell = target.closest('.zg-cell[data-row][data-col]') as HTMLElement;
            if (!cell) return;

            const row = parseInt(cell.dataset['row'] || '0', 10);
            const col = parseInt(cell.dataset['col'] || '0', 10);
            const dataCol = mapViewColToDataCol(col);
            const column = options.columns?.[dataCol];
            if (column?.editable && column.editor) {
              event.preventDefault();
              event.stopPropagation();
              store.exec('editing:startEdit', { row, col });
            }
          };
          scrollContainer.addEventListener('dblclick', dblclickHandler);
          domCleanups.push(() => scrollContainer.removeEventListener('dblclick', dblclickHandler));

          // Enter key to start editing
          const keydownHandler = (event: KeyboardEvent) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
              const activeCell = state.activeCell;
              if (activeCell && !state.editingCell) {
                const dataCol = mapViewColToDataCol(activeCell.col);
                const column = options.columns?.[dataCol];
                if (column?.editable && column.editor) {
                  event.preventDefault();
                  event.stopPropagation();
                  store.exec('editing:startEdit', activeCell);
                }
              }
            }
          };
          container.addEventListener('keydown', keydownHandler);
          domCleanups.push(() => container.removeEventListener('keydown', keydownHandler));
        },
        'editing'
      );

      // Edit lifecycle events (edit:start/commit/cancel/end) are emitted by the
      // EditorManager itself via the shared `events` emitter, so both interactive
      // (Enter/Tab/blur) and programmatic commits fire exactly once. These actions
      // only drive the manager and keep editing.active in sync.
      store.action(
        'editing:startEdit',
        (cell: CellRef) => {
          if (!editorManager) return;
          if (store.get('editing.active')) return;
          editorManager.startEdit(cell);
          store.set('editing.active', cell);
        },
        'editing'
      );

      store.action(
        'editing:commitEdit',
        () => {
          if (!editorManager) return;
          if (!store.get('editing.active')) return;
          editorManager.commitEdit?.();
          store.set('editing.active', null);
        },
        'editing'
      );

      store.action(
        'editing:cancelEdit',
        () => {
          if (!editorManager) return;
          editorManager.cancelEdit?.();
          store.set('editing.active', null);
        },
        'editing'
      );

      api.register('editing', {
        startEdit: (cell: CellRef) => store.exec('editing:startEdit', cell),
        commitEdit: (value?: any) => store.exec('editing:commitEdit', value),
        cancelEdit: () => store.exec('editing:cancelEdit'),
        getActive: () => store.get('editing.active'),
        isEditing: () => store.get('editing.active') !== null,
        bind: (mgr: any) => store.exec('editing:bind', mgr),
        setup: () => store.exec('editing:setup'),
      });

      return {
        teardown: [
          () => {
            for (const unsub of eventUnsubs) unsub();
            eventUnsubs.length = 0;
            for (const cleanup of domCleanups) cleanup();
            domCleanups.length = 0;
            editorManager?.destroy();
            editorManager = null;
          },
        ],
      };
    },
  };
}
