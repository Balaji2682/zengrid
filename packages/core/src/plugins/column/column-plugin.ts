import type { GridPlugin, PluginDisposable, GridStore, GridApi } from '../../reactive/types';
import type { GridOptions, ColumnStateSnapshot, GridStateSnapshot, SortState, FilterModel } from '../../types';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import type { DataAccessor } from '../../data/data-accessor/data-accessor.interface';
import { ColumnModel } from '../../features/columns/column-model';
import { ColumnResizeManager, type ColumnConstraints } from '../../features/column-resize';
import { ColumnDragManager, type ColumnDragOptions } from '../../features/column-drag';
import { ColumnReorderPlugin } from '../../features/columns/plugins/column-reorder';
import { ColumnVisibilityPlugin } from '../../features/columns/plugins/column-visibility';
import { getHeaderText, resolveHeaderConfig } from '../../rendering/headers/header-config-resolver';
import { resolveHeaderHeight } from '../header/header-types';
import type { ColumnDef } from '../../types';

/**
 * Seed each column's width from the top-level `colWidth` option when the column
 * definition omits an explicit `width`. Keeps a single source of truth for width
 * so `colWidth` isn't silently ignored when a `columns` array is present.
 */
function seedColumnWidths(
  columns: ColumnDef[],
  colWidth: number | number[]
): ColumnDef[] {
  return columns.map((def, index) => {
    if (def.width != null) return def;
    const seed = Array.isArray(colWidth) ? colWidth[index] : colWidth;
    return seed != null ? { ...def, width: seed } : def;
  });
}

export interface ColumnPluginOptions {
  options: GridOptions;
  events: EventEmitter<GridEvents>;
  getDataAccessor: () => DataAccessor | null;
}

/**
 * ColumnPlugin - Orchestrates ColumnModel, column resize, and column drag.
 *
 * Replaces the legacy GridResize, GridDrag, and grid-column-methods. Provides a unified
 * plugin for all column-related operations including state persistence.
 */
export function createColumnPlugin(opts: ColumnPluginOptions): GridPlugin {
  return {
    name: 'column',
    phase: 60,
    dependencies: ['core', 'dom', 'rendering'],
    setup(store: GridStore, api: GridApi): PluginDisposable {
      const { options, events, getDataAccessor } = opts;

      let columnModel: ColumnModel | null = null;
      let resizeManager: ColumnResizeManager | null = null;
      let dragManager: ColumnDragManager | null = null;
      let reorderPlugin: ColumnReorderPlugin | null = null;
      let headerMeasureElement: HTMLElement | null = null;
      let columnSubscription: (() => void) | null = null;

      store.extend('column.model', null, 'column', 60);

      // --- ColumnModel Setup ---

      store.action(
        'column:setup',
        () => {
          if (!options.columns || options.columns.length === 0) return;

          // One source of truth for width: when a column omits `width`, seed it
          // from the top-level `colWidth` option (uniform number or per-column
          // array) so the two width sources can't silently disagree.
          columnModel = new ColumnModel(seedColumnWidths(options.columns, options.colWidth));
          store.set('column.model', columnModel);

          // Setup reorder plugin
          reorderPlugin = new ColumnReorderPlugin(columnModel);

          // Subscribe to column changes for rendering updates
          columnSubscription = columnModel.subscribeAll({
            onChange: (event) => {
              if (
                event.type === 'width' ||
                event.type === 'reorder' ||
                event.type === 'visibility'
              ) {
                if (event.type === 'visibility') {
                  const visibleCount = columnModel?.getVisibleCount() ?? options.colCount;
                  store.exec('rendering:setColCount', visibleCount);
                }
                if (event.type === 'reorder' || event.type === 'visibility') {
                  store.exec('rendering:clearCache');
                  store.exec('rendering:updateScroller');
                  if (resizeManager) resizeManager.updateHandles();
                } else {
                  store.exec('rendering:updateCanvasSize');
                  store.exec('rendering:refresh');
                }
              }
            },
          });
        },
        'column'
      );

      // --- Column Resize ---

      store.action(
        'column:initResize',
        () => {
          const renderingApi = api.getMethod('rendering', 'getScroller');
          const scroller = renderingApi ? renderingApi() : null;
          if (!scroller) return;

          const scrollContainer = store.get('dom.scrollContainer') as HTMLElement | null;

          let columnConstraints: Map<number, ColumnConstraints> | undefined;
          if (!columnModel && options.columns) {
            columnConstraints = new Map<number, ColumnConstraints>();
            options.columns.forEach((col, index) => {
              if (col.minWidth !== undefined || col.maxWidth !== undefined) {
                columnConstraints!.set(index, {
                  minWidth: col.minWidth,
                  maxWidth: col.maxWidth,
                });
              }
            });
          }

          const visibleColCount = columnModel
            ? columnModel.getVisibleCount()
            : options.colCount;

          resizeManager = new ColumnResizeManager({
            events,
            widthProvider: scroller.getWidthProvider(),
            colCount: visibleColCount,
            getColOffset: (col: number) => scroller.getColOffset(col),
            getColWidth: (col: number) => scroller.getColWidth(col),
            onWidthChange: (col: number, width: number) => {
              if (columnModel) {
                const columnId = columnModel.getVisibleColumnsInOrder()[col]?.id;
                if (!columnId) return;
                columnModel.setWidth(columnId, width);
              } else {
                scroller.updateColWidth(col, width);
                store.exec('rendering:updateCanvasSize');
                store.exec('rendering:refresh');
              }
            },
            getValue: (row: number, col: number) => getDataAccessor()?.getValue(row, col),
            rowCount: options.rowCount,
            resizeZoneWidth: options.columnResize?.resizeZoneWidth,
            defaultConstraints: {
              minWidth: options.columnResize?.defaultMinWidth,
              maxWidth: options.columnResize?.defaultMaxWidth,
            },
            columnConstraints,
            constraintProvider: columnModel
              ? (col: number) => {
                  const columnId = columnModel!.getVisibleColumnsInOrder()[col]?.id;
                  if (!columnId) return { minWidth: 50, maxWidth: 1000 };
                  return columnModel!.getConstraints(columnId) ?? { minWidth: 50, maxWidth: 1000 };
                }
              : undefined,
            isColumnResizable: columnModel
              ? (col: number) => {
                  const columnId = columnModel!.getVisibleColumnsInOrder()[col]?.id;
                  if (!columnId) return true;
                  return columnModel!.isResizable(columnId);
                }
              : undefined,
            autoFitSampleSize: options.columnResize?.autoFitSampleSize,
            autoFitPadding: options.columnResize?.autoFitPadding,
            getHeaderText: options.columns
              ? (col: number) => {
                  if (columnModel) {
                    const colState = columnModel.getVisibleColumnsInOrder()[col];
                    if (!colState) return undefined;
                    const columnDef = options.columns?.[colState.dataIndex];
                    return columnDef ? getHeaderText(columnDef.header) : undefined;
                  }
                  const columnDef = options.columns?.[col];
                  return columnDef ? getHeaderText(columnDef.header) : undefined;
                }
              : undefined,
            getFullHeaderWidth: options.columns
              ? (col: number) => {
                  if (columnModel) {
                    const colState = columnModel.getVisibleColumnsInOrder()[col];
                    if (!colState) return undefined;
                    return calculateFullHeaderWidth(colState.dataIndex);
                  }
                  return calculateFullHeaderWidth(col);
                }
              : undefined,
            skipHeaderOnAutoSize: options.columnResize?.skipHeaderOnAutoSize,
            showHandles: options.columnResize?.showHandles,
            showPreview: options.columnResize?.showPreview,
            onColumnWidthsChange: options.onColumnWidthsChange,
            getScrollLeft: () => scrollContainer?.scrollLeft ?? 0,
            getHeaderHeight: () => resolveHeaderHeight(options),
            getViewportHeight: () => scrollContainer?.clientHeight ?? 0,
          });
        },
        'column'
      );

      store.action(
        'column:attachResize',
        (headerElement: HTMLElement) => {
          resizeManager?.attach(headerElement);
        },
        'column'
      );

      store.action(
        'column:detachResize',
        () => {
          resizeManager?.detach();
        },
        'column'
      );

      store.action(
        'column:resizeColumn',
        (col: number, width: number) => {
          const renderingApi = api.getMethod('rendering', 'getScroller');
          const scroller = renderingApi ? renderingApi() : null;
          if (!scroller) return;

          const oldWidth = scroller.getColWidth(col);

          if (columnModel) {
            const columnId = `col-${col}`;
            columnModel.setWidth(columnId, width);
          } else {
            scroller.updateColWidth(col, width);
            store.exec('rendering:updateCanvasSize');
            store.exec('rendering:refresh');
          }

          const newWidth = scroller.getColWidth(col);
          if (oldWidth !== newWidth) {
            events.emit('column:resize', { column: col, oldWidth, newWidth });
          }

          if (options.onColumnWidthsChange) {
            const widths: number[] = [];
            for (let c = 0; c < options.colCount; c++) {
              widths.push(scroller.getColWidth(c));
            }
            options.onColumnWidthsChange(widths);
          }
        },
        'column'
      );

      store.action(
        'column:autoFit',
        (col: number) => {
          resizeManager?.autoFitColumn(col);
        },
        'column'
      );

      store.action(
        'column:autoFitAll',
        () => {
          if (!resizeManager) return;
          if (columnModel) {
            // Batch all width changes so the onChange subscriber fires only once
            columnModel.batchUpdate(() => {
              resizeManager!.autoFitAllColumns();
            });
          } else {
            resizeManager.autoFitAllColumns();
          }
        },
        'column'
      );

      store.action(
        'column:setConstraints',
        (col: number, constraints: ColumnConstraints) => {
          if (columnModel) {
            const columnId = `col-${col}`;
            columnModel.setConstraints(columnId, constraints);
          } else {
            resizeManager?.setColumnConstraints(col, constraints);
          }
        },
        'column'
      );

      store.action(
        'column:updateResizeHandles',
        () => {
          resizeManager?.updateHandles();
        },
        'column'
      );

      // --- Column Drag ---

      store.action(
        'column:initDrag',
        () => {
          if (!columnModel || !reorderPlugin) return;

          const scrollContainer = store.get('dom.scrollContainer') as HTMLElement | null;
          const lockedColumns = new Set<string>();
          if (options.columns) {
            options.columns.forEach((col) => {
              if (col.reorderable === false && col.id) {
                lockedColumns.add(col.id);
              }
            });
          }

          const dragOptions: Partial<ColumnDragOptions> = {
            columnModel,
            events,
            getScrollLeft: () => scrollContainer?.scrollLeft ?? 0,
            getHeaderCell: (id: string) =>
              (document.querySelector(`[data-column-id="${id}"]`) as HTMLElement) || null,
            lockedColumns,
            ...options.columnDrag,
          };

          dragManager = new ColumnDragManager(
            dragOptions as ColumnDragOptions,
            reorderPlugin
          );
        },
        'column'
      );

      store.action(
        'column:attachDrag',
        (headerElement: HTMLElement) => {
          dragManager?.attach(headerElement);
        },
        'column'
      );

      store.action(
        'column:detachDrag',
        () => {
          dragManager?.detach();
        },
        'column'
      );

      // --- State Persistence ---

      store.action(
        'column:applyState',
        (
          state: ColumnStateSnapshot[],
          applyOptions?: {
            applyWidth?: boolean;
            applyVisibility?: boolean;
            applyOrder?: boolean;
          }
        ) => {
          if (!columnModel || !state || state.length === 0) return;

          const applyWidth = applyOptions?.applyWidth !== false;
          const applyVisibility = applyOptions?.applyVisibility !== false;
          const applyOrder = applyOptions?.applyOrder !== false;

          const byId = new Map<string, ColumnStateSnapshot>();
          const byField = new Map<string, ColumnStateSnapshot>();

          state.forEach((snapshot) => {
            if (snapshot.id) byId.set(snapshot.id, snapshot);
            if (snapshot.field) byField.set(snapshot.field, snapshot);
          });

          const visibility = new ColumnVisibilityPlugin(columnModel);

          columnModel.batchUpdate(() => {
            for (const col of columnModel!.getColumns()) {
              const snapshot = byId.get(col.id) ?? (col.field ? byField.get(col.field) : undefined);
              if (!snapshot) continue;

              if (applyWidth && snapshot.width !== undefined) {
                columnModel!.setWidth(col.id, snapshot.width);
              }
              if (applyVisibility && snapshot.visible !== undefined) {
                if (snapshot.visible) visibility.show(col.id);
                else visibility.hide(col.id);
              }
              if (applyOrder && snapshot.order !== undefined) {
                const current = columnModel!.getColumn(col.id);
                if (current && current.order !== snapshot.order) {
                  columnModel!.updateState(
                    col.id,
                    { order: snapshot.order },
                    {
                      type: 'reorder',
                      columnId: col.id,
                      oldValue: current.order,
                      newValue: snapshot.order,
                      state: { ...current, order: snapshot.order },
                    }
                  );
                }
              }
            }
          });
        },
        'column'
      );

      // --- Helpers ---

      function calculateFullHeaderWidth(col: number): number | undefined {
        const columnDef = options.columns?.[col];
        if (!columnDef) return undefined;

        const config = resolveHeaderConfig(columnDef.header, columnDef);
        const CELL_PADDING = 24;
        const CONTENT_PADDING = 12;
        const ICON_WIDTH = 18;
        const SORT_INDICATOR_WIDTH = 16;
        const FILTER_TRIGGER_WIDTH = 18;
        const GAP = 4;

        let width = CELL_PADDING + CONTENT_PADDING;
        let elementCount = 0;

        if (config.leadingIcon) { width += ICON_WIDTH; elementCount++; }
        width += measureHeaderTextWidth(config.text);
        elementCount++;
        if (config.trailingIcon) { width += ICON_WIDTH; elementCount++; }
        if (config.sortIndicator?.show) { width += SORT_INDICATOR_WIDTH; elementCount++; }
        if (config.filterIndicator?.show) { width += FILTER_TRIGGER_WIDTH; elementCount++; }
        if (elementCount > 1) width += GAP * (elementCount - 1);

        return width;
      }

      function measureHeaderTextWidth(text: string): number {
        if (!headerMeasureElement) {
          headerMeasureElement = document.createElement('div');
          headerMeasureElement.style.cssText = `
            position: absolute;
            visibility: hidden;
            white-space: nowrap;
            font-family: inherit;
            font-size: inherit;
            font-weight: 600;
          `;
          document.body.appendChild(headerMeasureElement);
        }
        headerMeasureElement.textContent = text;
        return headerMeasureElement.offsetWidth;
      }

      // --- API ---

      api.register('column', {
        setup: () => store.exec('column:setup'),
        getModel: () => columnModel,
        initResize: () => store.exec('column:initResize'),
        attachResize: (el: HTMLElement) => store.exec('column:attachResize', el),
        detachResize: () => store.exec('column:detachResize'),
        resizeColumn: (col: number, width: number) =>
          store.exec('column:resizeColumn', col, width),
        autoFit: (col: number) => store.exec('column:autoFit', col),
        autoFitAll: () => store.exec('column:autoFitAll'),
        setConstraints: (col: number, constraints: ColumnConstraints) =>
          store.exec('column:setConstraints', col, constraints),
        updateResizeHandles: () => store.exec('column:updateResizeHandles'),
        initDrag: () => store.exec('column:initDrag'),
        attachDrag: (el: HTMLElement) => store.exec('column:attachDrag', el),
        detachDrag: () => store.exec('column:detachDrag'),
        isDragging: () => dragManager?.isDragging() ?? false,
        getState: () => {
          if (!columnModel) return [];
          return columnModel.getColumns().map((col) => ({
            id: col.id,
            field: col.field,
            width: col.width,
            visible: col.visible,
            order: col.order,
          }));
        },
        applyState: (
          s: ColumnStateSnapshot[],
          o?: { applyWidth?: boolean; applyVisibility?: boolean; applyOrder?: boolean }
        ) => store.exec('column:applyState', s, o),
        getStateSnapshot: (
          getSortState: () => SortState[],
          getFilterState: () => FilterModel[]
        ): GridStateSnapshot => ({
          columns: columnModel
            ? columnModel.getColumns().map((col) => ({
                id: col.id,
                field: col.field,
                width: col.width,
                visible: col.visible,
                order: col.order,
              }))
            : [],
          sortState: getSortState(),
          filterState: getFilterState(),
        }),
        applyStateSnapshot: (
          snapshot: GridStateSnapshot,
          setSortState: (s: SortState[]) => void,
          setFilterState: (m: FilterModel[]) => void
        ) => {
          if (snapshot.columns && snapshot.columns.length > 0) {
            store.exec('column:applyState', snapshot.columns);
          }
          if (snapshot.sortState) setSortState(snapshot.sortState);
          if (snapshot.filterState) setFilterState(snapshot.filterState);
        },
      });

      return {
        teardown: [
          () => {
            if (columnSubscription) {
              columnSubscription();
              columnSubscription = null;
            }
            resizeManager?.detach();
            dragManager?.destroy();
            dragManager = null;
            resizeManager = null;
            reorderPlugin = null;
            columnModel = null;
            if (headerMeasureElement?.parentNode) {
              headerMeasureElement.parentNode.removeChild(headerMeasureElement);
              headerMeasureElement = null;
            }
          },
        ],
      };
    },
  };
}
