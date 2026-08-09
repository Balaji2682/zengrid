import type { GridOptions, GridState } from '../types';
import { EventEmitter } from '../events/event-emitter';
import type { GridEvents } from '../events/grid-events';
import { GridStoreImpl } from '../reactive/store';
import { PipelineRegistry } from '../reactive/pipeline';
import { GridApiImpl } from './grid-api';
import { PluginHost } from './plugin-host';
import { createCorePlugin } from '../plugins/core-plugin';
import { createSortPlugin } from '../plugins/sort-plugin';
import { createFilterPlugin } from '../plugins/filter-plugin';
import { createScrollPlugin } from '../plugins/scroll';
import { createViewportPlugin } from '../plugins/viewport';
import { createResizePlugin } from '../plugins/resize';
import { createSelectionPlugin } from '../plugins/selection';
import { createEditingPlugin } from '../plugins/editing';
import { createKeyboardPlugin } from '../plugins/keyboard';
import { createClipboardPlugin } from '../plugins/clipboard';
import { createUndoRedoPlugin } from '../plugins/undo-redo';
import { createDomPlugin } from '../plugins/dom';
import { createRenderingPlugin } from '../plugins/rendering';
import { createDataPlugin } from '../plugins/data-plugin';
import { createHeaderPlugin } from '../plugins/header';
import { createPaginationPlugin } from '../plugins/pagination';
import { createColumnPlugin } from '../plugins/column';
import { createFilterUIPlugin } from '../plugins/filter-ui';
import { createInfiniteScrollPlugin } from '../plugins/infinite-scroll';
import { createLifecyclePlugin } from '../plugins/lifecycle';
import { ViewportModel } from '../features/viewport/viewport-model';
import type { SlimGridContext } from './grid-context';
import { GridOptionsManager } from './options-manager';
import { resolveQueryExecutionMode } from './query-mode';

export function createSlimContext(container: HTMLElement, options: GridOptions): SlimGridContext {
  if (!container) throw new Error('Container element is required');
  container.classList.add('zg-grid');

  const normalizedOptions: GridOptions = { ...options };
  if (!normalizedOptions.rowCount || normalizedOptions.rowCount <= 0)
    normalizedOptions.rowCount = 0;
  if (!normalizedOptions.colCount || normalizedOptions.colCount <= 0)
    // Derive the column count from the column definitions when not given
    // explicitly, so column-keyed features (filtering, export) work without a
    // redundant colCount alongside `columns`.
    normalizedOptions.colCount = normalizedOptions.columns?.length ?? 0;

  const events = new EventEmitter<GridEvents>();
  const state: GridState = {
    data: [],
    selection: [],
    activeCell: null,
    scrollPosition: { top: 0, left: 0 },
    editingCell: null,
  };

  const store = new GridStoreImpl();
  const gridApi = new GridApiImpl(store, events);
  const optionsManager = new GridOptionsManager(normalizedOptions);
  const pluginHost = new PluginHost(store, gridApi, optionsManager.createPluginSetupContext());
  const pipelineRegistry = new PipelineRegistry();
  pipelineRegistry.registerPhase('sort', 10, 'pipeline.sort');
  pipelineRegistry.registerPhase('filter', 20, 'pipeline.filter');
  // Frontend pagination slices the post-sort/filter view; backend pagination
  // is handled by the data plugin, so no pipeline phase there.
  if (
    normalizedOptions.pagination?.enabled &&
    resolveQueryExecutionMode(normalizedOptions.dataMode) !== 'backend'
  ) {
    pipelineRegistry.registerPhase('pagination', 30, 'pipeline.pagination');
  }

  gridApi.register('options', {
    get: () => optionsManager.getOptions(),
    getSnapshot: () => optionsManager.getOptionsSnapshot(),
    subscribe: (listener: (change: any) => void) => optionsManager.subscribe(listener),
  });

  return {
    container,
    options: normalizedOptions,
    optionsManager,
    state,
    events,
    store,
    gridApi,
    pluginHost,
    pipelineRegistry,
    isDestroyed: false,
  };
}

export function installAllPlugins(ctx: SlimGridContext): void {
  const { options, events, pluginHost, store } = ctx;

  // Phase 0: Core
  pluginHost.use(createCorePlugin());

  // Phase 5: DOM
  pluginHost.use(createDomPlugin({ container: ctx.container, options }));

  // Phase 10: Sort
  pluginHost.use(
    createSortPlugin({
      enableMultiSort: true,
      columns: options.columns,
      usePipeline: resolveQueryExecutionMode(options.dataMode) !== 'backend',
    })
  );

  // Phase 20: Filter
  pluginHost.use(
    createFilterPlugin({
      colCount: options.colCount,
      columns: options.columns,
      usePipeline: resolveQueryExecutionMode(options.dataMode) !== 'backend',
    })
  );

  // Phase 30: Rendering
  let columnModel: any = null;
  let selectionChecker: ((row: number, col: number) => boolean) | null = null;
  let dataAccessor: any = null;

  pluginHost.use(
    createRenderingPlugin({
      options,
      state: ctx.state,
      events,
      getDataAccessor: () => dataAccessor,
      getColumnModel: () => columnModel,
      getSelectionChecker: () => selectionChecker,
    })
  );

  // Phase 35: Data
  pluginHost.use(
    createDataPlugin({
      options,
      state: ctx.state,
      container: ctx.container,
      events,
      setDataAccessor: (da) => {
        dataAccessor = da;
      },
    })
  );

  // Phase 40: Selection
  if (options.enableSelection !== false) {
    pluginHost.use(
      createSelectionPlugin({
        enableMultiSelection: options.enableMultiSelection,
        selectionType: options.selectionType,
      })
    );
  }

  // Phase 45: Editing
  pluginHost.use(
    createEditingPlugin({
      options,
      state: ctx.state,
      container: ctx.container,
      events,
      getColumnModel: () => columnModel,
      getDataAccessor: () => dataAccessor,
    })
  );

  // Phase 46: Keyboard navigation
  pluginHost.use(
    createKeyboardPlugin({
      options,
      state: ctx.state,
      container: ctx.container,
    })
  );

  // Phase 47: Clipboard (copy/cut/paste)
  pluginHost.use(
    createClipboardPlugin({
      options,
      state: ctx.state,
      container: ctx.container,
      events,
      getColumnModel: () => columnModel,
      getDataAccessor: () => dataAccessor,
    })
  );

  // Phase 50: Scroll, Viewport
  pluginHost.use(createScrollPlugin());
  pluginHost.use(createViewportPlugin());

  // Phase 60: Column
  pluginHost.use(
    createColumnPlugin({
      options,
      events,
      getDataAccessor: () => dataAccessor,
    })
  );

  // Phase 70: Header
  pluginHost.use(
    createHeaderPlugin({
      options,
      events,
      getColumnModel: () => columnModel,
    })
  );

  // Phase 80: Pagination
  if (options.pagination?.enabled) {
    pluginHost.use(createPaginationPlugin({ options }));
  }

  // Phase 100: Resize (window)
  pluginHost.use(createResizePlugin({ debounceMs: 150 }));

  // Phase 170: Undo/Redo
  pluginHost.use(createUndoRedoPlugin());

  // Phase 250: Lifecycle
  pluginHost.use(
    createLifecyclePlugin({
      options,
      state: ctx.state,
      container: ctx.container,
      events,
      getColumnModel: () => columnModel,
      getDataAccessor: () => dataAccessor,
      setColumnModel: (cm: any) => {
        columnModel = cm;
      },
      setSelectionChecker: (checker: ((row: number, col: number) => boolean) | null) => {
        selectionChecker = checker;
      },
    })
  );

  // Setup pipeline computeds
  ctx.pipelineRegistry.setupCoreComputeds(store);

  // Expose closures for late-binding references
  (ctx as any)._setColumnModel = (cm: any) => {
    columnModel = cm;
  };
  (ctx as any)._setDataAccessor = (da: any) => {
    dataAccessor = da;
  };
  (ctx as any)._getColumnModel = () => columnModel;
  (ctx as any)._getDataAccessor = () => dataAccessor;

  // Install filter UI if columns + filter are present
  if (
    options.columns &&
    options.columns.length > 0 &&
    pluginHost.has('filter') &&
    !pluginHost.has('filter-ui')
  ) {
    pluginHost.use(
      createFilterUIPlugin({
        getColumns: () => options.columns,
        getColumnDef: (dataCol: number) => options.columns?.[dataCol],
        getColumnModel: () => columnModel,
        getContainer: () => ctx.container,
        getFilterPopupCustomization: () => options.filterPopup,
      })
    );
  }

  // Install infinite scroll if configured
  if (options.infiniteScrolling?.enabled && options.onLoadMoreRows) {
    const cfg = options.infiniteScrolling;
    const infiniteScrollViewport = new ViewportModel();

    // Wire scroll events to the ViewportModel so infinite scroll can subscribe
    ctx.events.on('scroll', (payload: any) => {
      if (payload.visibleRange) {
        infiniteScrollViewport.setRange(payload.visibleRange, {
          top: payload.scrollTop,
          left: payload.scrollLeft,
        });
      }
    });

    pluginHost.use(
      createInfiniteScrollPlugin({
        enabled: true,
        threshold: cfg.threshold,
        enableSlidingWindow: cfg.enableSlidingWindow,
        windowSize: cfg.windowSize,
        pruneThreshold: cfg.pruneThreshold,
        onLoadMoreRows: options.onLoadMoreRows,
        onDataPruned: cfg.onDataPruned,
        getViewportModel: () => infiniteScrollViewport,
        getScroller: () => {
          const renderingApi = ctx.gridApi.getMethod('rendering', 'getScroller');
          return renderingApi ? renderingApi() : null;
        },
        getDOM: () => {
          const domApi = ctx.gridApi.getMethod('dom', 'getCanvas');
          return domApi
            ? {
                canvas: domApi(),
                updateCanvasSize: (w: number, h: number) =>
                  store.exec('dom:updateCanvasSize', w, h),
              }
            : null;
        },
        setData: (data: any[][]) => {
          store.exec('core:setData', data);
        },
        refresh: () => {
          store.exec('rendering:refresh');
        },
        getState: () => ({ data: ctx.state.data, rowCount: options.rowCount }),
        setRowCount: (count: number) => {
          ctx.optionsManager.update({ rowCount: count });
        },
      })
    );
  }
}
