import type { GridPlugin, PluginDisposable, GridStore, GridApi } from '../../reactive/types';
import type { GridOptions, GridState } from '../../types';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import type { DataAccessor } from '../../data/data-accessor/data-accessor.interface';
import { VirtualScroller } from '../../rendering/virtual-scroller/virtual-scroller';
import { CellPool } from '../../rendering/cell-pool/cell-pool';
import { CellPositioner } from '../../rendering/cell-positioner/cell-positioner';
import { PinnedRowsRenderer } from '../../rendering/row-pin/pinned-rows-renderer';
import { RendererRegistry } from '../../rendering/renderers/renderer-registry';
import { RendererCache } from '../../rendering/cache';
import { NumberRenderer } from '../../rendering/renderers/number';
import { ImageRenderer } from '../../rendering/renderers/image';
import { AdvancedCellRenderer } from '../../rendering/renderers/advanced-cell';
import { CheckboxRenderer } from '../../rendering/renderers/checkbox';
import { ProgressBarRenderer } from '../../rendering/renderers/progress-bar';
import { LinkRenderer } from '../../rendering/renderers/link';
import { ButtonRenderer } from '../../rendering/renderers/button';
import { DateRenderer } from '../../rendering/renderers/datetime';
import { SelectRenderer } from '../../rendering/renderers/select';
import { ChipRenderer } from '../../rendering/renderers/chip';
import { DropdownRenderer } from '../../rendering/renderers/dropdown';
import { LoadingIndicator } from '../../features/loading';
import { RowHeightManager } from '../../features/row-height';
import { SegmentTreeHeightProvider } from '../../rendering/height-provider/segment-tree-height-provider';
import { ColumnModelWidthProvider } from '../../rendering/width-provider/column-model-width-provider';

/**
 * Threshold for detecting fast scroll (pixels per millisecond)
 */
const FAST_SCROLL_VELOCITY_THRESHOLD = 2;

export interface RenderingPluginOptions {
  options: GridOptions;
  state: GridState;
  events: EventEmitter<GridEvents>;
  getDataAccessor: () => DataAccessor | null;
  getColumnModel: () => any;
  getSelectionChecker: () => ((row: number, col: number) => boolean) | null;
}

/**
 * RenderingPlugin - Manages virtual scrolling, cell rendering, and rendering infrastructure.
 *
 * Replaces the legacy GridInit and GridScroll classes. Owns VirtualScroller,
 * CellPool, CellPositioner, RendererRegistry, RendererCache, RowHeightManager,
 * and LoadingIndicator.
 */
export function createRenderingPlugin(opts: RenderingPluginOptions): GridPlugin {
  return {
    name: 'rendering',
    phase: 30,
    dependencies: ['core', 'dom'],
    setup(store: GridStore, api: GridApi): PluginDisposable {
      const { options, state, events, getDataAccessor, getColumnModel, getSelectionChecker } = opts;

      // Rendering infrastructure
      const registry = new RendererRegistry();
      let cache: RendererCache | null = null;
      let loadingIndicator: LoadingIndicator | null = null;
      let rowHeightManager: RowHeightManager | null = null;
      let scroller: VirtualScroller | null = null;
      let pool: CellPool | null = null;
      let positioner: CellPositioner | null = null;
      let pinnedRenderer: PinnedRowsRenderer | null = null;
      let pinUnsub: (() => void) | null = null;
      let rowStyleUnsub: (() => void) | null = null;
      let colPinUnsub: (() => void) | null = null;
      let rafId: number | null = null;

      // Scroll velocity tracking
      let lastScrollTop = 0;
      let lastScrollLeft = 0;
      let lastScrollTime = 0;
      let scrollVelocity = { vertical: 0, horizontal: 0 };

      // Store signals
      store.extend('rendering.initialized', false, 'rendering', 30);

      // Register built-in renderers
      registry.register('number', new NumberRenderer());
      registry.register('image', new ImageRenderer());
      registry.register('advanced', new AdvancedCellRenderer({ elements: [] }));
      registry.register('checkbox', new CheckboxRenderer());
      registry.register('progress', new ProgressBarRenderer());
      registry.register('link', new LinkRenderer());
      registry.register('button', new ButtonRenderer());
      registry.register('date', new DateRenderer());
      registry.register('select', new SelectRenderer({ options: [{ value: '', label: '' }] }));
      registry.register('chip', new ChipRenderer());
      registry.register(
        'dropdown',
        new DropdownRenderer({ options: [{ value: '', label: '' }] })
      );

      // Initialize cache
      if (options.rendererCache?.enabled !== false) {
        cache = new RendererCache(options.rendererCache);
      }

      // Initialize loading indicator
      if (options.loading?.enabled !== false) {
        loadingIndicator = new LoadingIndicator(options.loading);
      }

      function mapRowToDataIndex(row: number): number | undefined {
        // getUnphased: rows.viewIndices is a phase-Infinity computed, but rendering
        // runs at phase 30 (and can be driven synchronously from the phase-30 sync
        // effect). A phased read here would trip checkPhase and abort the render.
        const viewIndices = store.getUnphased('rows.viewIndices') as number[] | undefined;
        if (viewIndices) return viewIndices[row];
        return row;
      }

      function createPositionerCallbacks() {
        return {
          getData: (row: number, col: number) => {
            const mappedRow = mapRowToDataIndex(row);
            if (mappedRow === undefined || mappedRow < 0) return undefined;
            const columnModel = getColumnModel();
            const orderedColumns = columnModel?.getVisibleColumnsInOrder();
            const colState = orderedColumns?.[col];
            const dataCol = colState ? colState.dataIndex : col;

            // A calculated column derives its value from the row instead of a
            // positional read. `getValue(field)` resolves another column's source
            // value so the getter can combine fields.
            const valueGetter = colState?.definition?.valueGetter;
            if (valueGetter) {
              const accessor = getDataAccessor();
              return valueGetter({
                row,
                field: colState!.field,
                data: state.data[mappedRow],
                getValue: (field: string) => {
                  const target = orderedColumns?.find((c: any) => c.field === field);
                  return target ? accessor?.getValue(mappedRow, target.dataIndex) : undefined;
                },
              });
            }

            return getDataAccessor()?.getValue(mappedRow, dataCol);
          },
          getRowData: (row: number) => {
            const mappedRow = mapRowToDataIndex(row);
            if (mappedRow === undefined || mappedRow < 0) return undefined;
            return state.data[mappedRow];
          },
          getColumn: (col: number) => {
            const columnModel = getColumnModel();
            if (columnModel) {
              const orderedColumns = columnModel.getVisibleColumnsInOrder();
              if (orderedColumns && orderedColumns[col]) {
                return orderedColumns[col].definition;
              }
            }
            return options.columns?.[col];
          },
          isSelected: (row: number, col: number) => {
            const checker = getSelectionChecker();
            if (checker) return checker(row, col);
            return false;
          },
          isActive: (row: number, col: number) =>
            state.activeCell?.row === row && state.activeCell?.col === col,
          isEditing: (row: number, col: number) =>
            state.editingCell?.row === row && state.editingCell?.col === col,
        };
      }

      // --- Actions ---

      store.action(
        'rendering:initialize',
        (preReadWidth?: number, preReadHeight?: number) => {
          const scrollContainer = store.get('dom.scrollContainer') as HTMLElement | null;
          const canvas = store.get('dom.canvas') as HTMLElement | null;
          if (!scrollContainer || !canvas) return;

          // Use pre-read dimensions to avoid forced reflow after DOM setup
          const viewportWidth = preReadWidth ?? scrollContainer.clientWidth;
          const viewportHeight = preReadHeight ?? scrollContainer.clientHeight;

          // Initialize row height system
          const rowHeightMode = options.rowHeightMode ?? 'fixed';
          let heightProvider;

          if (rowHeightMode !== 'fixed') {
            const defaultHeight = Array.isArray(options.rowHeight)
              ? options.rowHeight[0]
              : options.rowHeight;

            heightProvider = new SegmentTreeHeightProvider(options.rowCount, defaultHeight);

            rowHeightManager = new RowHeightManager({
              mode: rowHeightMode,
              config: {
                defaultHeight,
                minHeight: options.rowHeightConfig?.minHeight,
                maxHeight: options.rowHeightConfig?.maxHeight,
                heightAffectingColumns: options.rowHeightConfig?.heightAffectingColumns,
                measureTiming: options.rowHeightConfig?.measureTiming,
                measureBatchSize: options.rowHeightConfig?.measureBatchSize,
                debounceMs: options.rowHeightConfig?.debounceMs,
                cacheHeights: options.rowHeightConfig?.cacheHeights,
              },
              heightProvider,
              columns: options.columns ?? [],
              onHeightUpdate: () => {
                if (canvas && scroller) {
                  canvas.style.height = `${scroller.getTotalHeight()}px`;
                }
              },
            });
          }

          const columnModel = getColumnModel();
          const widthProvider = columnModel ? new ColumnModelWidthProvider(columnModel) : undefined;
          const visibleColCount = columnModel
            ? columnModel.getVisibleCount()
            : options.colCount;

          // Initialize VirtualScroller
          scroller = new VirtualScroller({
            rowCount: options.rowCount,
            colCount: visibleColCount,
            rowHeight: options.rowHeight,
            colWidth: options.colWidth,
            widthProvider,
            viewportWidth,
            viewportHeight,
            heightProvider,
            overscanRows: options.overscanRows ?? 10,
            overscanCols: options.overscanCols ?? 5,
          });

          // Update canvas size
          canvas.style.width = `${scroller.getTotalWidth()}px`;
          canvas.style.height = `${scroller.getTotalHeight()}px`;

          // Initialize CellPool
          const cellsContainer = canvas.querySelector('.zg-cells') as HTMLElement;
          const pinLeftBand = canvas.querySelector('.zg-pin-left') as HTMLElement | null;
          const pinRightBand = canvas.querySelector('.zg-pin-right') as HTMLElement | null;
          pool = new CellPool({
            container: cellsContainer,
            initialSize: 100,
            maxSize: 500,
          });

          // Initialize CellPositioner
          const callbacks = createPositionerCallbacks();
          positioner = new CellPositioner({
            scroller,
            pool,
            registry,
            cache: cache ?? undefined,
            rowHeightManager: rowHeightManager ?? undefined,
            spanProvider: options.spanProvider,
            rowStyleProvider: options.rowStyleProvider,
            colPinProvider: options.colPinProvider,
            cellsContainer,
            pinLeftBand: pinLeftBand ?? undefined,
            pinRightBand: pinRightBand ?? undefined,
            getPinColumns: options.colPinProvider
              ? () => {
                  const cm = getColumnModel();
                  if (!cm) return [];
                  return cm
                    .getVisibleColumnsInOrder()
                    .map((c: any, i: number) => ({
                      index: i,
                      width: c.actualWidth,
                      def: c.definition,
                    }));
                }
              : undefined,
            ...callbacks,
          });

          // Re-render when row styling depends on mutable state and changes.
          rowStyleUnsub =
            options.rowStyleProvider?.subscribe?.(() => positioner?.refresh()) ?? null;

          // Re-render the body when the pinned set changes live (the header plugin
          // subscribes separately to re-sync its frozen cells).
          colPinUnsub =
            options.colPinProvider?.subscribe?.(() => positioner?.refresh()) ?? null;

          // Pinned-row bands (off unless a provider is configured).
          if (options.pinProvider) {
            const pinnedTop = store.get('dom.pinnedTop') as HTMLElement | null;
            const pinnedBottom = store.get('dom.pinnedBottom') as HTMLElement | null;
            if (pinnedTop && pinnedBottom) {
              pinnedRenderer = new PinnedRowsRenderer({
                topBand: pinnedTop,
                bottomBand: pinnedBottom,
                scroller,
                registry,
                getData: callbacks.getData,
                getColumn: callbacks.getColumn,
              });
              computePinLayout();
              renderPinned();
              // Re-render the bands whenever the pinned set changes (e.g. a user pins a row).
              pinUnsub = options.pinProvider.subscribe?.(() => {
                computePinLayout();
                renderPinned();
              }) ?? null;
            }
          }

          store.set('rendering.initialized', true);
        },
        'rendering'
      );

      // Recompute which rows are pinned (changes only on data/view/pin edits).
      function computePinLayout(): void {
        if (!pinnedRenderer || !scroller || !options.pinProvider) return;
        const layout = options.pinProvider.getPinned({
          rowCount: scroller.rowCount,
          getRowId: (row: number) => mapRowToDataIndex(row),
        });
        pinnedRenderer.setLayout(layout.top, layout.bottom, layout.topData, layout.bottomData);
      }

      // Redraw the band cells for the current visible columns and sync horizontal scroll.
      function renderPinned(): void {
        if (!pinnedRenderer || !scroller) return;
        const range = scroller.calculateVisibleRange(
          state.scrollPosition.top,
          state.scrollPosition.left
        );
        pinnedRenderer.render(range, state.scrollPosition.left);
      }

      store.action(
        'rendering:updateScroller',
        () => {
          const scrollContainer = store.get('dom.scrollContainer') as HTMLElement | null;
          const canvas = store.get('dom.canvas') as HTMLElement | null;
          if (!scroller || !scrollContainer || !canvas) return;

          const viewportWidth = scrollContainer.clientWidth;
          const viewportHeight = scrollContainer.clientHeight;

          const columnModel = getColumnModel();
          const visibleColCount = columnModel
            ? columnModel.getVisibleCount()
            : options.colCount;

          // Update scroller in-place to preserve CellPositioner's lastRange and renderedCells
          scroller.setViewport(viewportWidth, viewportHeight);
          scroller.setColCount(visibleColCount);

          if (columnModel) {
            scroller.setWidthProvider(new ColumnModelWidthProvider(columnModel));
          }

          canvas.style.width = `${scroller.getTotalWidth()}px`;
          canvas.style.height = `${scroller.getTotalHeight()}px`;

          // Re-render visible cells so positioner picks up new widths and data mapping
          // renderVisibleCells updates the visible range, then refresh() re-renders all
          // visible cells with correct lastRenderer tracking for proper destroy() cycles
          if (positioner) {
            positioner.renderVisibleCells(
              state.scrollPosition.top,
              state.scrollPosition.left,
            );
            positioner.refresh();
          }
          // Column widths/count may have changed — resize and redraw the bands.
          computePinLayout();
          renderPinned();
        },
        'rendering',
        { invalidates: ['rendering:refresh'] }
      );

      store.action(
        'rendering:renderCells',
        (scrollTop: number, scrollLeft: number) => {
          if (positioner) {
            positioner.renderVisibleCells(scrollTop, scrollLeft);
          }
          renderPinned();
        },
        'rendering'
      );

      store.action(
        'rendering:updateCells',
        (cells: Array<{ row: number; col: number }>) => {
          if (positioner) {
            positioner.updateCells(cells);
          }
        },
        'rendering'
      );

      store.action(
        'rendering:refresh',
        () => {
          if (positioner) positioner.refresh();
          renderPinned();
        },
        'rendering'
      );

      store.action(
        'rendering:refreshSelectionClasses',
        () => {
          if (positioner) positioner.refreshSelectionClasses();
        },
        'rendering'
      );

      store.action(
        'rendering:clearCache',
        () => {
          if (cache) cache.clear();
        },
        'rendering'
      );

      store.action(
        'rendering:handleScroll',
        (scrollTop: number, scrollLeft: number) => {
          const now = performance.now();
          const deltaTime = now - lastScrollTime;

          if (deltaTime > 0) {
            const deltaY = Math.abs(scrollTop - lastScrollTop);
            const deltaX = Math.abs(scrollLeft - lastScrollLeft);
            scrollVelocity.vertical = deltaY / deltaTime;
            scrollVelocity.horizontal = deltaX / deltaTime;
          }

          lastScrollTop = scrollTop;
          lastScrollLeft = scrollLeft;
          lastScrollTime = now;

          state.scrollPosition = { top: scrollTop, left: scrollLeft };

          const visibleRange = scroller?.calculateVisibleRange(scrollTop, scrollLeft) ?? {
            startRow: 0,
            endRow: 0,
            startCol: 0,
            endCol: 0,
          };

          events.emit('scroll' as any, {
            scrollTop,
            scrollLeft,
            visibleRange,
            firstRow: visibleRange.startRow,
            lastRow: visibleRange.endRow - 1,
            renderedNodes: pool?.stats.active ?? 0,
          });

          const isFastScroll =
            scrollVelocity.vertical > FAST_SCROLL_VELOCITY_THRESHOLD ||
            scrollVelocity.horizontal > FAST_SCROLL_VELOCITY_THRESHOLD;

          if (isFastScroll) {
            if (rafId !== null) {
              cancelAnimationFrame(rafId);
              rafId = null;
            }
            if (positioner) positioner.renderVisibleCells(scrollTop, scrollLeft);
            renderPinned();
            if (options.onScroll) options.onScroll(scrollTop, scrollLeft);
          } else {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
              rafId = null;
              if (!positioner) return;
              positioner.renderVisibleCells(scrollTop, scrollLeft);
              renderPinned();
              if (options.onScroll) options.onScroll(scrollTop, scrollLeft);
            });
          }
        },
        'rendering'
      );

      store.action(
        'rendering:updateCanvasSize',
        () => {
          const canvas = store.get('dom.canvas') as HTMLElement | null;
          if (canvas && scroller) {
            canvas.style.width = `${scroller.getTotalWidth()}px`;
            canvas.style.height = `${scroller.getTotalHeight()}px`;
          }
        },
        'rendering'
      );

      store.action(
        'rendering:setRowCount',
        (count: number) => {
          if (scroller) scroller.setRowCount(count);
        },
        'rendering'
      );

      store.action(
        'rendering:setColCount',
        (count: number) => {
          if (scroller) scroller.setColCount(count);
        },
        'rendering'
      );

      store.action(
        'rendering:registerRenderer',
        (name: string, renderer: any) => {
          registry.register(name, renderer);
        },
        'rendering'
      );

      // Single-responsibility viewport sync: resize the virtual scroller +
      // canvas to the current pipeline view, drop stale cache, and re-render.
      // This is the one shared implementation — explicit callers (sort,
      // pagination, init) run it synchronously via the action below; the
      // effect is a reactive safety net for pipeline changes that don't route
      // through an explicit call (e.g. filter, programmatic sort/filter).
      let lastViewIndicesRef: number[] | undefined;
      function syncViewport(): void {
        if (!scroller) return;
        const viewIndices = store.getUnphased('rows.viewIndices') as number[] | undefined;
        lastViewIndicesRef = viewIndices;
        const visibleCount = viewIndices ? viewIndices.length : options.rowCount;
        scroller.setRowCount(visibleCount);
        const canvas = store.get('dom.canvas') as HTMLElement | null;
        if (canvas) {
          canvas.style.width = `${scroller.getTotalWidth()}px`;
          canvas.style.height = `${scroller.getTotalHeight()}px`;
        }
        if (cache) cache.clear();
        // Re-render against the freshly-clamped visible range with fresh data.
        // refresh() can't be used here: it reuses the previous range (out of
        // bounds when the page shrinks) and skips cells whose row/col key is
        // unchanged even though the underlying data changed (page switch).
        if (positioner) {
          positioner.clearRenderedCells();
          positioner.renderVisibleCells(state.scrollPosition.top, state.scrollPosition.left);
        }
        // The view (sort/filter/page) changed, so which rows are pinned may have too.
        computePinLayout();
        renderPinned();
      }

      store.action('rendering:syncAfterPipeline', syncViewport, 'rendering');

      store.effect(
        'rendering:syncAfterPipeline:auto',
        () => {
          const viewIndices = store.getUnphased('rows.viewIndices') as number[] | undefined;
          // Explicit callers advance lastViewIndicesRef, so this coalesces to a
          // no-op on the next frame and avoids a duplicate render.
          if (viewIndices === lastViewIndicesRef) return;
          syncViewport();
        },
        'rendering',
        30
      );

      // Setup loading listeners (store unsubs for teardown)
      const eventUnsubs: Array<() => void> = [];
      eventUnsubs.push(
        events.on('loading:start', (event) => {
          const container = (store.get('dom.viewport') as HTMLElement | null)?.parentElement;
          if (loadingIndicator && container) {
            loadingIndicator.show(container, { isLoading: true, message: event.message });
          }
        }),
        events.on('loading:end', () => {
          if (loadingIndicator) loadingIndicator.hide();
        }),
        events.on('loading:progress', (event) => {
          if (loadingIndicator) {
            loadingIndicator.update({ isLoading: true, progress: event.progress, message: event.message });
          }
        })
      );

      api.register('rendering', {
        initialize: () => store.exec('rendering:initialize'),
        updateScroller: () => store.exec('rendering:updateScroller'),
        renderCells: (top: number, left: number) => store.exec('rendering:renderCells', top, left),
        updateCells: (cells: Array<{ row: number; col: number }>) =>
          store.exec('rendering:updateCells', cells),
        refresh: () => store.exec('rendering:refresh'),
        refreshSelectionClasses: () => store.exec('rendering:refreshSelectionClasses'),
        clearCache: () => store.exec('rendering:clearCache'),
        handleScroll: (top: number, left: number) =>
          store.exec('rendering:handleScroll', top, left),
        updateCanvasSize: () => store.exec('rendering:updateCanvasSize'),
        syncAfterPipeline: () => store.exec('rendering:syncAfterPipeline'),
        setRowCount: (count: number) => store.exec('rendering:setRowCount', count),
        setColCount: (count: number) => store.exec('rendering:setColCount', count),
        registerRenderer: (name: string, renderer: any) =>
          store.exec('rendering:registerRenderer', name, renderer),
        getScroller: () => scroller,
        getPositioner: () => positioner,
        getPool: () => pool,
        getRegistry: () => registry,
        getCache: () => cache,
        getRowHeightManager: () => rowHeightManager,
        isInitialized: () => store.get('rendering.initialized'),
        getStats: () => {
          const visibleRange = scroller
            ? scroller.calculateVisibleRange(
                state.scrollPosition.top,
                state.scrollPosition.left
              )
            : null;
          const visibleCells = visibleRange
            ? (visibleRange.endRow - visibleRange.startRow) *
              (visibleRange.endCol - visibleRange.startCol)
            : 0;
          return {
            rowCount: options.rowCount,
            colCount: options.colCount,
            visibleCells,
            poolStats: pool?.stats ?? { active: 0, pooled: 0, total: 0 },
            cacheStats: cache?.getStats(),
          };
        },
        getDimensions: () =>
          scroller
            ? { width: scroller.getTotalWidth(), height: scroller.getTotalHeight() }
            : { width: 0, height: 0 },
        getColumnPosition: (col: number) => {
          if (!scroller) return { x: 0, width: 0 };
          const position = scroller.getCellPosition(0, col);
          return { x: position.x, width: position.width };
        },
        getCellPosition: (row: number, col: number) =>
          scroller ? scroller.getCellPosition(row, col) : { x: 0, y: 0, width: 0, height: 0 },
        getVisibleRange: () =>
          scroller
            ? scroller.calculateVisibleRange(
                state.scrollPosition.top,
                state.scrollPosition.left
              )
            : null,
        subscribeToViewport: (viewportModel: any) => {
          if (positioner) positioner.subscribeToViewport(viewportModel);
        },
        setReactiveModels: (scrollModel: any, viewportModel: any) => {
          if (scroller) scroller.setReactiveModels(scrollModel, viewportModel);
        },
        getScrollPosition: () => ({ ...state.scrollPosition }),
      });

      return {
        teardown: [
          () => {
            for (const unsub of eventUnsubs) unsub();
            eventUnsubs.length = 0;
            if (rafId !== null) cancelAnimationFrame(rafId);
            if (pinUnsub) pinUnsub();
            if (rowStyleUnsub) rowStyleUnsub();
            if (colPinUnsub) colPinUnsub();
            if (pinnedRenderer) pinnedRenderer.destroy();
            if (positioner) positioner.destroy();
            if (pool) pool.clear();
            scroller = null;
            pool = null;
            positioner = null;
            pinnedRenderer = null;
            pinUnsub = null;
            rowStyleUnsub = null;
            colPinUnsub = null;
            rafId = null;
          },
        ],
      };
    },
  };
}
