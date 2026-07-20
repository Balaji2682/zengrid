import type { GridPlugin, PluginDisposable } from '../../reactive/types';
import { SelectionManager } from '../../features/selection';
import type { SelectionMode } from '../../features/selection';
import type { CellRange, CellRef } from '../../types';

export interface SelectionPluginOptions {
  mode?: SelectionMode;
  selectionType?: 'cell' | 'row' | 'column' | 'range';
  enableMultiSelection?: boolean;
}

export interface SelectionAttachOptions {
  container: HTMLElement;
  selectionType: 'cell' | 'row' | 'column' | 'range';
  enableMultiSelection: boolean;
  rowCount: () => number;
  getDataValue: (row: number, col: number) => any;
  getViewIndices: () => number[] | undefined;
  onCellClick?: (row: number, col: number) => void;
  onCellDoubleClick?: (row: number, col: number) => void;
  onCellContextMenu?: (row: number, col: number, event: MouseEvent) => void;
}

/**
 * SelectionPlugin - Manages selection state and cell interaction DOM events.
 *
 * Selection ranges reference rows by data index (into rows.raw),
 * so they survive sort/filter changes.
 */
export function createSelectionPlugin(options?: SelectionPluginOptions): GridPlugin {
  return {
    name: 'selection',
    phase: 40,
    dependencies: ['core'],
    setup(store, api): PluginDisposable {
      store.extend('selection.ranges', [] as CellRange[], 'selection', 40);
      store.extend('selection.active', null as CellRef | null, 'selection', 40);

      const mode: SelectionMode = options?.enableMultiSelection
        ? 'multiple'
        : (options?.mode ?? 'single');

      const mgr = new SelectionManager({
        mode,
        enableRowSelection: true,
        enableColumnSelection: true,
      });

      // DOM listener state
      let clickHandler: ((e: MouseEvent) => void) | null = null;
      let dblClickHandler: ((e: MouseEvent) => void) | null = null;
      let contextMenuHandler: ((e: MouseEvent) => void) | null = null;
      let attachedContainer: HTMLElement | null = null;
      let anchorCell: { row: number; col: number } | null = null;

      const boundIsSelected = mgr.isSelected.bind(mgr);

      function syncToStore(): void {
        const ranges = mgr.getSelectedRanges().map((r) => ({
          startRow: r.startRow,
          endRow: r.endRow,
          startCol: r.startCol,
          endCol: r.endCol,
        }));
        const prev = store.get('selection.ranges') as CellRange[];
        store.set('selection.ranges', ranges);
        api.fireEvent('selection:change', { ranges, previousRanges: prev, isSelected: boundIsSelected });
      }

      function parseCellFromEvent(event: MouseEvent): { row: number; col: number } | null {
        const target = event.target as HTMLElement;
        const cell = target.closest('.zg-cell[data-row][data-col]') as HTMLElement;
        if (!cell) return null;
        return {
          row: parseInt(cell.dataset['row'] || '0', 10),
          col: parseInt(cell.dataset['col'] || '0', 10),
        };
      }

      function mapRowToDataIndex(row: number, opts: SelectionAttachOptions): number {
        const viewIndices = opts.getViewIndices();
        if (viewIndices) return viewIndices[row] ?? row;
        return row;
      }

      // --- Actions ---

      store.action(
        'selection:selectCell',
        (row: number, col: number, additive = false) => {
          if (mode === 'single' || !additive) mgr.clearSelection();
          mgr.selectCell(row, col, additive);
          store.set('selection.active', { row, col });
          syncToStore();
        },
        'selection'
      );

      store.action(
        'selection:toggleCell',
        (row: number, col: number) => {
          const selected = mgr.toggleCell(row, col);
          store.set('selection.active', selected ? { row, col } : null);
          syncToStore();
        },
        'selection'
      );

      store.action(
        'selection:selectRange',
        (startRow: number, startCol: number, endRow: number, endCol: number, additive = false) => {
          mgr.selectRange(startRow, startCol, endRow, endCol, additive);
          syncToStore();
        },
        'selection'
      );

      store.action(
        'selection:selectRows',
        (startRow: number, endRow: number, additive = false) => {
          mgr.selectRows(startRow, endRow, additive);
          syncToStore();
        },
        'selection'
      );

      store.action(
        'selection:selectColumns',
        (startCol: number, endCol: number, additive = false) => {
          mgr.selectColumns(startCol, endCol, additive);
          syncToStore();
        },
        'selection'
      );

      store.action(
        'selection:clear',
        () => {
          mgr.clearSelection();
          store.set('selection.active', null);
          syncToStore();
        },
        'selection'
      );

      store.action(
        'selection:selectAll',
        (rowCount: number) => {
          if (rowCount <= 0) return;
          mgr.selectRows(0, rowCount - 1, false);
          syncToStore();
        },
        'selection'
      );

      store.action(
        'selection:setActive',
        (cell: CellRef | null) => {
          store.set('selection.active', cell);
        },
        'selection'
      );

      store.action(
        'selection:attach',
        (opts: SelectionAttachOptions) => {
          // Detach previous if any
          if (attachedContainer) {
            if (clickHandler) attachedContainer.removeEventListener('click', clickHandler);
            if (dblClickHandler) attachedContainer.removeEventListener('dblclick', dblClickHandler);
            if (contextMenuHandler)
              attachedContainer.removeEventListener('contextmenu', contextMenuHandler);
          }

          attachedContainer = opts.container;
          const selType = opts.selectionType;
          const multiSel = opts.enableMultiSelection;

          clickHandler = (event: MouseEvent) => {
            const parsed = parseCellFromEvent(event);
            if (!parsed) return;
            const { row, col } = parsed;
            const dataRow = mapRowToDataIndex(row, opts);

            api.fireEvent('cell:click', {
              cell: { row, col },
              value: opts.getDataValue(dataRow, col),
              nativeEvent: event,
            });
            if (opts.onCellClick) opts.onCellClick(row, col);

            store.exec('selection:setActive', { row, col });

            // Triple-click the first column to select the entire row.
            if (event.detail >= 3 && col === 0) {
              const additiveRow = (event.ctrlKey || event.metaKey) && !!multiSel;
              store.exec('selection:selectRows', row, row, additiveRow);
              anchorCell = { row, col };
              return;
            }

            const additive = (event.ctrlKey || event.metaKey) && !!multiSel;

            if (event.shiftKey && anchorCell) {
              if (selType === 'row') {
                store.exec('selection:selectRows', anchorCell.row, row, additive);
              } else if (selType === 'column') {
                store.exec('selection:selectColumns', anchorCell.col, col, additive);
              } else {
                store.exec(
                  'selection:selectRange',
                  anchorCell.row,
                  anchorCell.col,
                  row,
                  col,
                  additive
                );
              }
            } else {
              switch (selType) {
                case 'row':
                  // Toggle: if this row is already selected (non-additive), deselect it
                  if (!additive && mgr.isRowSelected(row)) {
                    store.exec('selection:clear');
                  } else {
                    store.exec('selection:selectRows', row, row, additive);
                  }
                  break;
                case 'column':
                  store.exec('selection:selectColumns', col, col, additive);
                  break;
                case 'range':
                  store.exec('selection:selectRange', row, col, row, col, additive);
                  break;
                default:
                  if (additive) {
                    // Ctrl/Cmd+click toggles the individual cell in a multi-selection
                    store.exec('selection:toggleCell', row, col);
                  } else if (mgr.isSelected(row, col)) {
                    // Plain click on the already-selected cell clears it
                    store.exec('selection:clear');
                  } else {
                    store.exec('selection:selectCell', row, col);
                  }
              }
              anchorCell = { row, col };
            }
          };

          dblClickHandler = (event: MouseEvent) => {
            const parsed = parseCellFromEvent(event);
            if (!parsed) return;
            const dataRow = mapRowToDataIndex(parsed.row, opts);
            api.fireEvent('cell:doubleClick', {
              cell: parsed,
              value: opts.getDataValue(dataRow, parsed.col),
              nativeEvent: event,
            });
            if (opts.onCellDoubleClick) opts.onCellDoubleClick(parsed.row, parsed.col);
          };

          contextMenuHandler = (event: MouseEvent) => {
            const parsed = parseCellFromEvent(event);
            if (!parsed) return;
            const dataRow = mapRowToDataIndex(parsed.row, opts);
            api.fireEvent('cell:contextMenu', {
              cell: parsed,
              value: opts.getDataValue(dataRow, parsed.col),
              nativeEvent: event,
            });
            if (opts.onCellContextMenu) opts.onCellContextMenu(parsed.row, parsed.col, event);
          };

          opts.container.addEventListener('click', clickHandler);
          opts.container.addEventListener('dblclick', dblClickHandler);
          opts.container.addEventListener('contextmenu', contextMenuHandler);
        },
        'selection'
      );

      // --- API ---

      api.register('selection', {
        selectCell: (row: number, col: number, additive?: boolean) =>
          store.exec('selection:selectCell', row, col, additive),
        toggleCell: (row: number, col: number) => store.exec('selection:toggleCell', row, col),
        selectRange: (
          startRow: number,
          startCol: number,
          endRow: number,
          endCol: number,
          additive?: boolean
        ) => store.exec('selection:selectRange', startRow, startCol, endRow, endCol, additive),
        selectRows: (startRow: number, endRow: number, additive?: boolean) =>
          store.exec('selection:selectRows', startRow, endRow, additive),
        selectColumns: (startCol: number, endCol: number, additive?: boolean) =>
          store.exec('selection:selectColumns', startCol, endCol, additive),
        clear: () => store.exec('selection:clear'),
        selectAll: (rowCount: number) => store.exec('selection:selectAll', rowCount),
        setActive: (cell: CellRef | null) => store.exec('selection:setActive', cell),
        getRanges: () => store.get('selection.ranges'),
        getActive: () => store.get('selection.active'),
        isSelected: (row: number, col: number) => mgr.isSelected(row, col),
        isRowSelected: (row: number) => mgr.isRowSelected(row),
        hasSelection: () => mgr.hasSelection(),
      });

      return {
        teardown: [
          () => {
            if (attachedContainer) {
              if (clickHandler) attachedContainer.removeEventListener('click', clickHandler);
              if (dblClickHandler)
                attachedContainer.removeEventListener('dblclick', dblClickHandler);
              if (contextMenuHandler)
                attachedContainer.removeEventListener('contextmenu', contextMenuHandler);
              attachedContainer = null;
            }
            mgr.destroy();
          },
        ],
      };
    },
  };
}
