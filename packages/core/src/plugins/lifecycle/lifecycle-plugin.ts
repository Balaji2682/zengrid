import type { GridPlugin, PluginDisposable, GridStore, GridApi } from '../../reactive/types';
import type { GridOptions, GridState } from '../../types';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import type { ColumnModel } from '../../features/columns/column-model';

export interface LifecyclePluginOptions {
  options: GridOptions;
  state: GridState;
  container: HTMLElement;
  events: EventEmitter<GridEvents>;
  getColumnModel: () => ColumnModel | null;
  getDataAccessor: () => any;
  setColumnModel: (cm: ColumnModel | null) => void;
  setSelectionChecker?: (checker: ((row: number, col: number) => boolean) | null) => void;
}

type HeaderSortInteraction = GridEvents['header:sort:click'];

export function isAdditiveHeaderSortInteraction(event: HeaderSortInteraction): boolean {
  if (typeof event.additive === 'boolean') {
    return event.additive;
  }

  return !!(event.nativeEvent?.shiftKey || event.nativeEvent?.ctrlKey || event.nativeEvent?.metaKey);
}

export function createLifecyclePlugin(opts: LifecyclePluginOptions): GridPlugin {
  return {
    name: 'lifecycle',
    phase: 250,
    dependencies: ['core', 'dom', 'rendering'],
    setup(store: GridStore, api: GridApi): PluginDisposable {
      const { options, state, container, events, getDataAccessor, setColumnModel } = opts;
      const eventUnsubs: Array<() => void> = [];
      let rendered = false;

      store.action(
        'lifecycle:render',
        () => {
          if (!rendered) {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;

            // Setup DOM
            store.exec('dom:setup');

            // Setup column model
            store.exec('column:setup');

            // Get column model reference
            const colApi = api.getMethod('column', 'getModel');
            const columnModel: ColumnModel | null = colApi ? colApi() : null;
            setColumnModel(columnModel);

            // Initialize rendering
            store.exec('rendering:initialize', containerWidth, containerHeight);

            // Size the viewport to the initial pipeline view (e.g. first page)
            syncAfterPipeline();

            // Attach scroll + resize
            const scrollContainer = store.get('dom.scrollContainer') as HTMLElement | null;
            if (scrollContainer) {
              if (store.hasAction('scroll:attach'))
                store.exec('scroll:attach', scrollContainer);
              if (store.hasAction('resize:attach'))
                store.exec('resize:attach', scrollContainer, containerWidth, containerHeight);
            }

            // Column resize
            if (options.enableColumnResize !== false && store.hasAction('column:initResize')) {
              store.exec('column:initResize');
            }

            // Column drag
            if (options.enableColumnDrag !== false && columnModel) {
              store.exec('column:initDrag');
            }

            // Headers
            if (columnModel) {
              store.exec('header:initialize');
              store.exec('header:render');

              const headerApi = api.getMethod('header', 'getHeaderCellsContainer');
              const hc: HTMLElement | null = headerApi ? headerApi() : null;
              if (hc) {
                if (options.enableColumnResize !== false && store.hasAction('column:attachResize'))
                  store.exec('column:attachResize', hc);
                if (options.enableColumnDrag !== false) store.exec('column:attachDrag', hc);
              }
            }

            // Selection
            if (store.hasAction('selection:attach') && scrollContainer) {
              store.exec('selection:attach', {
                container: scrollContainer,
                selectionType: options.selectionType ?? 'cell',
                enableMultiSelection: !!options.enableMultiSelection,
                rowCount: () => options.rowCount,
                getDataValue: (row: number, col: number) => getDataAccessor()?.getValue(row, col),
                getViewIndices: () => store.get('rows.viewIndices') as number[] | undefined,
                onCellClick: options.onCellClick,
                onCellDoubleClick: options.onCellDoubleClick,
                onCellContextMenu: options.onCellContextMenu,
              });

              // Sync selection state
              eventUnsubs.push(
                events.on('selection:change', (payload: any) => {
                  state.selection = payload.ranges ?? [];
                  opts.setSelectionChecker?.(payload.isSelected ?? null);
                  if (options.onSelectionChange) options.onSelectionChange(state.selection);
                  store.exec('rendering:refreshSelectionClasses');
                  store.exec('lifecycle:updateHeaderCheckbox');
                })
              );
            }

            // Sort header click handler
            eventUnsubs.push(
              events.on('header:sort:click', (event: HeaderSortInteraction) => {
                let dataCol = event.columnIndex;
                if (columnModel) {
                  const orderedColumns = columnModel.getVisibleColumnsInOrder();
                  if (orderedColumns[event.columnIndex]) dataCol = orderedColumns[event.columnIndex].dataIndex;
                }
                store.exec('sort:toggle', dataCol, isAdditiveHeaderSortInteraction(event));
                syncAfterPipeline();
              })
            );

            // Checkbox header handler
            eventUnsubs.push(
              events.on('header:checkbox:change', (event: any) => {
                if (!store.hasAction('selection:clear')) return;
                if (event.action === 'select-all') store.exec('selection:selectAll', options.rowCount);
                else store.exec('selection:clear');
              })
            );

            // Viewport resize handler
            eventUnsubs.push(
              events.on('viewport:resized' as any, () => {
                store.exec('rendering:updateScroller');
                store.exec('rendering:refresh');
              })
            );

            // Scroll viewport handler
            eventUnsubs.push(
              events.on('scroll', (payload: any) => {
                if (store.hasAction('viewport:updateRange') && payload.visibleRange) {
                  store.exec('viewport:updateRange', payload.visibleRange);
                }
              })
            );

            // Filter UI
            if (store.hasAction('filterUI:attach')) {
              store.exec('filterUI:attach', container, events);
            }

            // Infinite scroll
            if (store.hasAction('infiniteScroll:setup')) {
              store.exec('infiniteScroll:setup');
            }

            // Editing
            store.exec('editing:setup');

            // Keyboard navigation
            if (store.hasAction('keyboard:setup')) {
              store.exec('keyboard:setup');
            }

            // Clipboard (copy/cut/paste)
            if (store.hasAction('clipboard:setup')) {
              store.exec('clipboard:setup');
            }

            rendered = true;
          }

          // Render visible cells
          store.exec('rendering:updateCanvasSize');
          store.exec('rendering:renderCells', state.scrollPosition.top, state.scrollPosition.left);

          // Auto-fit columns on load
          if (options.columnResize?.autoFitOnLoad) {
            store.exec('column:autoFitAll');
          }

          // Update viewport range
          const renderingApi = api.getMethod('rendering', 'getVisibleRange');
          if (store.hasAction('viewport:updateRange') && renderingApi) {
            const initialRange = renderingApi();
            if (initialRange) store.exec('viewport:updateRange', initialRange);
          }

          // Update pagination
          if (store.hasAction('pagination:update')) {
            store.exec('pagination:update');
          }

          const ensureDataRange = api.getMethod('data', 'ensureVisibleRange');
          if (ensureDataRange) {
            void ensureDataRange('initial');
          }
        },
        'lifecycle'
      );

      // Delegate to the single shared viewport-sync implementation in the
      // rendering plugin so sort, pagination, and init stay in lockstep.
      function syncAfterPipeline(): void {
        store.exec('rendering:syncAfterPipeline');
      }

      store.action(
        'lifecycle:syncAfterPipeline',
        () => syncAfterPipeline(),
        'lifecycle'
      );

      store.action(
        'lifecycle:updateHeaderCheckbox',
        () => {
          const checkbox = container.querySelector('.zg-header-checkbox-input') as HTMLInputElement | null;
          if (!checkbox) return;
          if (options.selectionType && options.selectionType !== 'row') {
            checkbox.indeterminate = false;
            checkbox.checked = false;
            return;
          }
          const rowCount = options.rowCount;
          const hasSelection = state.selection.length > 0;
          const hasFullRange = state.selection.some(
            (range) => range.startRow <= 0 && range.endRow >= rowCount - 1
          );
          checkbox.checked = hasFullRange;
          checkbox.indeterminate = hasSelection && !hasFullRange;
        },
        'lifecycle'
      );

      api.register('lifecycle', {
        render: () => store.exec('lifecycle:render'),
        syncAfterPipeline: () => store.exec('lifecycle:syncAfterPipeline'),
        updateHeaderCheckbox: () => store.exec('lifecycle:updateHeaderCheckbox'),
        isRendered: () => rendered,
      });

      return {
        teardown: [
          () => {
            for (const unsub of eventUnsubs) unsub();
            eventUnsubs.length = 0;
          },
        ],
      };
    },
  };
}
