import { resolveOperationMode } from '@zengrid/shared';
import type { EventEmitter } from '../events/event-emitter';
import type { GridEvents } from '../events/grid-events';
import { ArrayAccessor } from '../data/data-accessor/array-accessor';
import { buildQueryState, buildRangeQueryPaginationState } from '../features/query/query-state';
import type { DataAccessor } from '../data/data-accessor/data-accessor.interface';
import { DataManager } from '../data/data-manager';
import type {
  DataLoadRequest,
  DataRequestState,
  FilterAst,
  GridOptions,
  GridState,
  SortState,
} from '../types';
import type { GridPlugin, PluginDisposable } from '../reactive/types';
import { shouldDelegateQueryState } from '../grid/query-mode';

export interface DataPluginOptions {
  options: GridOptions;
  state: GridState;
  container: HTMLElement;
  events: EventEmitter<GridEvents>;
  setDataAccessor: (dataAccessor: DataAccessor | null) => void;
}

type LoadReason = 'initial' | 'scroll' | 'pagination' | 'sort' | 'filter' | 'refresh' | 'retry';

interface RequestedRange {
  startRow: number;
  endRow: number;
  reason: LoadReason;
}

const DEFAULT_ESTIMATED_ROWS = 50;

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function createInitialStatus(mode: 'frontend' | 'backend', totalRows: number): DataRequestState {
  return {
    mode,
    status: 'idle',
    isLoading: false,
    error: null,
    lastRequest: null,
    lastLoadedRange: null,
    totalRows,
    canRetry: false,
  };
}

function getEstimatedRowHeight(options: GridOptions): number {
  if (Array.isArray(options.rowHeight)) {
    return options.rowHeight[0] ?? 30;
  }

  return options.rowHeight || 30;
}

export function createDataPlugin(opts: DataPluginOptions): GridPlugin {
  return {
    name: 'data',
    phase: 35,
    dependencies: ['core', 'dom', 'rendering'],
    setup(store, api, context): PluginDisposable {
      const { options, state, container, events, setDataAccessor } = opts;
      const mode = resolveOperationMode(
        {
          mode: options.dataMode,
          callback: options.onDataRequest,
        },
        {
          rowCount: options.rowCount,
        }
      );

      store.extend('data.mode', mode, 'data', 35);
      store.extend('data.status', createInitialStatus(mode, options.rowCount), 'data', 35);

      if (mode === 'frontend') {
        api.register('data', {
          ensureVisibleRange: async () => {},
          refresh: async () => {},
          retry: async () => {},
          getMode: () => mode,
          getStatus: () => store.get('data.status'),
        });

        return { teardown: [] };
      }

      let knownTotalRows = options.rowCount;
      let dataManager = createManager();
      let activeLoad: Promise<void> | null = null;
      let lastFailedRange: RequestedRange | null = null;
      let queuedVisibleRange: { startRow: number; endRow: number } | null = null;
      let lastPaginationSignature = '';
      let overlay: HTMLElement | null = null;
      const eventUnsubs: Array<() => void> = [];

      function createManager(): DataManager {
        return new DataManager({
          rowCount: knownTotalRows,
          events,
          modeConfig: {
            mode: options.dataMode,
            callback: options.onDataRequest,
          },
        });
      }

      function isRendered(): boolean {
        const lifecycleApi = api.getMethod('lifecycle', 'isRendered');
        return lifecycleApi ? Boolean(lifecycleApi()) : false;
      }

      function getStatus(): DataRequestState {
        return store.get('data.status') as DataRequestState;
      }

      function delegatesQueryState(): boolean {
        return shouldDelegateQueryState(context.options.dataMode);
      }

      function setStatus(partial: Partial<DataRequestState>): void {
        store.set('data.status', {
          ...getStatus(),
          ...partial,
        });
      }

      function getOverlayHost(): HTMLElement | null {
        const getViewport = api.getMethod('dom', 'getViewport');
        return getViewport ? (getViewport() as HTMLElement | null) : container;
      }

      function clearOverlay(): void {
        if (overlay?.parentElement) {
          overlay.parentElement.removeChild(overlay);
        }
        overlay = null;
      }

      function createOverlayContainer(kind: 'empty' | 'error'): HTMLElement {
        const node = document.createElement('div');
        node.className = `zg-data-state zg-data-state-${kind}`;
        node.style.cssText = [
          'position:absolute',
          'inset:0',
          'z-index:25',
          'display:flex',
          'align-items:center',
          'justify-content:center',
          'background:rgba(255,255,255,0.82)',
          'backdrop-filter:blur(1px)',
          'padding:16px',
        ].join(';');
        return node;
      }

      function showEmptyState(message: string): void {
        clearOverlay();
        const host = getOverlayHost();
        if (!host) return;

        overlay = createOverlayContainer('empty');

        const card = document.createElement('div');
        card.style.cssText = [
          'display:flex',
          'flex-direction:column',
          'align-items:center',
          'gap:8px',
          'padding:20px 24px',
          'border-radius:12px',
          'background:#ffffff',
          'box-shadow:0 8px 24px rgba(15,23,42,0.08)',
          'color:#334155',
          'max-width:320px',
          'text-align:center',
        ].join(';');

        const title = document.createElement('div');
        title.textContent = 'No data';
        title.style.cssText = 'font-size:14px;font-weight:600;color:#0f172a;';

        const detail = document.createElement('div');
        detail.textContent = message;
        detail.style.cssText = 'font-size:13px;line-height:1.5;';

        card.appendChild(title);
        card.appendChild(detail);
        overlay.appendChild(card);
        host.appendChild(overlay);
      }

      function showErrorState(message: string): void {
        clearOverlay();
        const host = getOverlayHost();
        if (!host) return;

        overlay = createOverlayContainer('error');

        const card = document.createElement('div');
        card.style.cssText = [
          'display:flex',
          'flex-direction:column',
          'align-items:center',
          'gap:10px',
          'padding:20px 24px',
          'border-radius:12px',
          'background:#ffffff',
          'box-shadow:0 8px 24px rgba(15,23,42,0.12)',
          'color:#334155',
          'max-width:360px',
          'text-align:center',
          'pointer-events:auto',
        ].join(';');

        const title = document.createElement('div');
        title.textContent = 'Failed to load data';
        title.style.cssText = 'font-size:14px;font-weight:600;color:#991b1b;';

        const detail = document.createElement('div');
        detail.textContent = message;
        detail.style.cssText = 'font-size:13px;line-height:1.5;';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'zg-data-state-retry';
        button.textContent = 'Retry';
        button.style.cssText = [
          'appearance:none',
          'border:none',
          'border-radius:8px',
          'padding:8px 14px',
          'background:#0f172a',
          'color:#ffffff',
          'font-size:13px',
          'font-weight:600',
          'cursor:pointer',
        ].join(';');
        button.addEventListener('click', () => {
          void retryLastRequest();
        });

        card.appendChild(title);
        card.appendChild(detail);
        card.appendChild(button);
        overlay.appendChild(card);
        host.appendChild(overlay);
      }

      function syncManagerData(): void {
        const data = dataManager.getData();
        const totalRows = dataManager.getTotalRows();
        const previousTotalRows = knownTotalRows;
        const { top, left } = state.scrollPosition;

        knownTotalRows = totalRows;
        context.updateOptions({ rowCount: totalRows });
        state.data = data;
        setDataAccessor(new ArrayAccessor(data));

        store.exec('core:setData', data);
        store.exec('rendering:setRowCount', totalRows);
        store.exec('rendering:updateCanvasSize');
        store.exec('rendering:clearCache');
        if (totalRows !== previousTotalRows) {
          store.exec('rendering:renderCells', top, left);
        }
        store.exec('rendering:refresh');

        if (api.getMethod('pagination', 'update')) {
          store.exec('pagination:update');
        }
      }

      function replaceManager(): void {
        dataManager.destroy();
        dataManager = createManager();
        activeLoad = null;
        queuedVisibleRange = null;
        clearOverlay();
        syncManagerData();
      }

      function getRequestedRange(
        reason: LoadReason,
        visibleRange?: { startRow: number; endRow: number } | null
      ): RequestedRange {
        if (options.pagination?.enabled) {
          const currentPage = (store.get('pagination.currentPage') as number | undefined) ?? 0;
          const pageSize =
            (store.get('pagination.pageSize') as number | undefined) ??
            options.pagination.pageSize ??
            DEFAULT_ESTIMATED_ROWS;
          const startRow = Math.max(0, currentPage * pageSize);
          return {
            startRow,
            endRow: startRow + Math.max(1, pageSize),
            reason,
          };
        }

        const range =
          visibleRange ??
          (() => {
            const getVisibleRange = api.getMethod('rendering', 'getVisibleRange');
            return getVisibleRange
              ? (getVisibleRange() as { startRow: number; endRow: number } | null)
              : null;
          })();

        if (range && range.endRow > range.startRow) {
          return {
            startRow: Math.max(0, range.startRow),
            endRow: Math.max(range.startRow + 1, range.endRow),
            reason,
          };
        }

        const rowHeight = Math.max(1, getEstimatedRowHeight(options));
        const viewportHeight = container.clientHeight || rowHeight * 10;
        const estimatedRows = Math.max(
          1,
          Math.ceil(viewportHeight / rowHeight) + (options.overscanRows ?? 10)
        );

        return {
          startRow: 0,
          endRow: estimatedRows,
          reason,
        };
      }

      function getMissingRange(range: RequestedRange): RequestedRange | null {
        const rows = dataManager.getData();
        let missingStart = -1;
        let missingEnd = -1;

        for (let row = range.startRow; row < range.endRow; row += 1) {
          if (!Array.isArray(rows[row])) {
            if (missingStart === -1) {
              missingStart = row;
            }
            missingEnd = row + 1;
          }
        }

        if (missingStart === -1 || missingEnd === -1) {
          return null;
        }

        return {
          startRow: missingStart,
          endRow: missingEnd,
          reason: range.reason,
        };
      }

      function buildRequest(range: RequestedRange): DataLoadRequest {
        const sortState = delegatesQueryState()
          ? ((store.get('sort.state') as SortState[] | undefined) ?? [])
          : null;
        const filterAst = delegatesQueryState()
          ? ((store.get('filter.ast') as FilterAst | null | undefined) ?? null)
          : null;

        return {
          startRow: range.startRow,
          endRow: range.endRow,
          query: buildQueryState({
            sortState,
            filterAst,
            pagination: buildRangeQueryPaginationState(range.startRow, range.endRow),
            columns: options.columns,
          }),
        };
      }

      async function loadRange(range: RequestedRange): Promise<void> {
        const missingRange = getMissingRange(range);
        if (!missingRange) {
          const totalRows = dataManager.getTotalRows();
          const isEmpty = totalRows === 0;
          setStatus({
            status: isEmpty ? 'empty' : 'success',
            isLoading: false,
            error: null,
            totalRows,
            canRetry: false,
          });

          if (isEmpty) {
            showEmptyState('No rows to display.');
          } else {
            clearOverlay();
          }
          return;
        }

        const request = buildRequest(missingRange);
        let loadedSuccessfully = false;

        clearOverlay();
        lastFailedRange = null;
        setStatus({
          status: 'loading',
          isLoading: true,
          error: null,
          lastRequest: request,
          totalRows: dataManager.getTotalRows(),
          canRetry: false,
        });

        let currentLoad: Promise<void> | null = null;
        currentLoad = (async () => {
          try {
            await dataManager.loadRange(missingRange.startRow, missingRange.endRow, request.query);

            syncManagerData();
            loadedSuccessfully = true;

            const totalRows = dataManager.getTotalRows();
            const isEmpty = totalRows === 0;
            setStatus({
              status: isEmpty ? 'empty' : 'success',
              isLoading: false,
              error: null,
              lastLoadedRange: {
                startRow: missingRange.startRow,
                endRow: missingRange.endRow,
              },
              totalRows,
              canRetry: false,
            });

            if (isEmpty) {
              showEmptyState('No rows to display.');
            } else {
              clearOverlay();
            }
          } catch (error) {
            if (isAbortError(error)) {
              return;
            }

            const requestError = error instanceof Error ? error : new Error('Failed to load data');
            lastFailedRange = missingRange;
            setStatus({
              status: 'error',
              isLoading: false,
              error: requestError,
              lastLoadedRange: null,
              totalRows: dataManager.getTotalRows(),
              canRetry: true,
            });
            showErrorState(requestError.message);
          } finally {
            if (activeLoad === currentLoad) {
              activeLoad = null;
            }

            if (loadedSuccessfully && queuedVisibleRange && dataManager.getTotalRows() > 0) {
              const nextVisibleRange = queuedVisibleRange;
              queuedVisibleRange = null;
              void ensureVisibleRange('scroll', nextVisibleRange);
            }
          }
        })();

        activeLoad = currentLoad;
        await currentLoad;
      }

      async function ensureVisibleRange(
        reason: LoadReason,
        visibleRange?: { startRow: number; endRow: number } | null
      ): Promise<void> {
        if (activeLoad && reason === 'scroll') {
          if (visibleRange) {
            queuedVisibleRange = visibleRange;
          }
          return;
        }

        await loadRange(getRequestedRange(reason, visibleRange));
      }

      async function reloadCurrentContext(
        reason: Exclude<LoadReason, 'initial' | 'scroll'>
      ): Promise<void> {
        replaceManager();
        await loadRange(getRequestedRange(reason));
      }

      async function retryLastRequest(): Promise<void> {
        const retryRange = lastFailedRange ?? getRequestedRange('retry');
        replaceManager();
        await loadRange({ ...retryRange, reason: 'retry' });
      }

      syncManagerData();

      eventUnsubs.push(
        events.on('scroll', (payload: any) => {
          if (!isRendered() || options.pagination?.enabled) {
            return;
          }

          void ensureVisibleRange('scroll', payload.visibleRange);
        }),
        events.on('sort:change', () => {
          if (!isRendered() || !delegatesQueryState()) {
            return;
          }

          void reloadCurrentContext('sort');
        }),
        events.on('filter:change', () => {
          if (!isRendered() || !delegatesQueryState()) {
            return;
          }

          void reloadCurrentContext('filter');
        })
      );

      store.effect(
        'data:paginationSync',
        () => {
          if (!options.pagination?.enabled) {
            return;
          }

          const currentPage = (store.get('pagination.currentPage') as number | undefined) ?? 0;
          const pageSize = (store.get('pagination.pageSize') as number | undefined) ?? 0;
          const signature = `${currentPage}:${pageSize}`;

          if (!isRendered()) {
            return;
          }

          if (signature === lastPaginationSignature) {
            return;
          }

          lastPaginationSignature = signature;
          void reloadCurrentContext('pagination');
        },
        'data',
        81
      );

      api.register('data', {
        ensureVisibleRange: (
          reason: LoadReason = 'scroll',
          visibleRange?: { startRow: number; endRow: number } | null
        ) => ensureVisibleRange(reason, visibleRange),
        refresh: () => reloadCurrentContext('refresh'),
        retry: () => retryLastRequest(),
        getMode: () => mode,
        getStatus: () => store.get('data.status'),
      });

      return {
        teardown: [
          () => {
            for (const unsub of eventUnsubs) {
              unsub();
            }
            eventUnsubs.length = 0;
            clearOverlay();
            dataManager.destroy();
          },
        ],
      };
    },
  };
}
