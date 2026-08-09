import type { GridPlugin, PluginDisposable } from '../../reactive/types';
import type { GridOptions } from '../../types';
import { Paginator } from '../../features/pagination';
import { resolveQueryExecutionMode } from '../../grid/query-mode';
import { resolveHeaderHeight } from '../header/header-types';

/** Vertical space reserved for a rendered pagination bar. */
const PAGINATION_BAR_HEIGHT = 56;

export interface PaginationPluginOptions {
  options: GridOptions;
}

/**
 * PaginationPlugin - Manages pagination state and controls.
 *
 * Replaces the legacy GridPagination class. Wraps the Paginator feature
 * and exposes it through store actions and API methods.
 */
export function createPaginationPlugin(opts: PaginationPluginOptions): GridPlugin {
  return {
    name: 'pagination',
    phase: 80,
    dependencies: ['core'],
    setup(store, api): PluginDisposable {
      const { options } = opts;

      if (!options.pagination?.enabled) {
        // Register no-op API so callers don't need to check
        api.register('pagination', {
          goToPage: () => {},
          nextPage: () => {},
          previousPage: () => {},
          firstPage: () => {},
          lastPage: () => {},
          setPageSize: () => {},
          getCurrentPage: () => 0,
          getPageSize: () => 100,
          getTotalPages: () => 0,
          update: () => {},
        });
        return { teardown: [] };
      }

      const paginator = new Paginator(options.pagination);

      store.extend('pagination.currentPage', 0, 'pagination', 80);
      store.extend('pagination.pageSize', options.pagination.pageSize ?? 100, 'pagination', 80);
      store.extend('pagination.totalPages', 0, 'pagination', 80);

      // Frontend pagination: slice the post-sort/filter view down to the
      // current page so virtual scrolling only renders that page. Backend
      // pagination is sliced by the data plugin, so no pipeline phase there.
      const isFrontend = resolveQueryExecutionMode(options.dataMode) !== 'backend';
      if (isFrontend) {
        store.computed(
          'pipeline.pagination',
          () => {
            const upstream =
              (store.getUnphased('pipeline.filter') as number[] | undefined) ??
              (store.getUnphased('pipeline.sort') as number[] | undefined) ??
              (store.getUnphased('rows.indices') as number[] | undefined);
            if (!upstream) return undefined;
            const pageSize = store.getUnphased('pagination.pageSize') as number;
            if (!Number.isFinite(pageSize) || pageSize <= 0) return upstream;
            const currentPage = store.getUnphased('pagination.currentPage') as number;
            const start = Math.max(0, currentPage) * pageSize;
            return upstream.slice(start, start + pageSize);
          },
          'pagination',
          30
        );
      }

      let paginationTop: HTMLElement | null = null;
      let paginationBottom: HTMLElement | null = null;
      let scrollContainerEl: HTMLElement | null = null;
      let headerHeightPx = 0;

      // Create the bar's host element(s) inside the grid DOM and reserve layout
      // space for them by insetting the scroll container. Runs once; a host that
      // called `setContainers` itself keeps its own containers (early return).
      function ensureContainers(): void {
        if (paginationTop || paginationBottom) return;

        const viewport = api.getMethod('dom', 'getViewport')?.() as HTMLElement | null | undefined;
        const scrollContainer = api
          .getMethod('dom', 'getScrollContainer')
          ?.() as HTMLElement | null | undefined;
        if (!viewport || !scrollContainer) return;

        scrollContainerEl = scrollContainer;
        const position = options.pagination?.position ?? 'bottom';
        headerHeightPx =
          options.columns && options.columns.length > 0 ? resolveHeaderHeight(options) : 0;

        const makeHost = (): HTMLElement => {
          const host = document.createElement('div');
          host.className = 'zg-pagination-host';
          host.style.cssText = `position:absolute;left:0;right:0;height:${PAGINATION_BAR_HEIGHT}px;z-index:9;overflow:hidden;`;
          viewport.appendChild(host);
          return host;
        };

        if (position === 'top' || position === 'both') {
          paginationTop = makeHost();
          paginationTop.style.top = `${headerHeightPx}px`;
          scrollContainer.style.top = `${headerHeightPx + PAGINATION_BAR_HEIGHT}px`;
        }
        if (position === 'bottom' || position === 'both') {
          paginationBottom = makeHost();
          paginationBottom.style.bottom = '0';
          scrollContainer.style.bottom = `${PAGINATION_BAR_HEIGHT}px`;
        }
      }

      // Size each host to its bar's real height and inset the scroll container to
      // match. The bar wraps to multiple rows in narrow grids, so a fixed reserve
      // would clip it; measuring keeps every control visible. PAGINATION_BAR_HEIGHT
      // is the floor so single-row bars keep their comfortable height.
      function reflowContainers(): void {
        if (!scrollContainerEl) return;

        const measure = (host: HTMLElement | null): number => {
          const bar = host?.firstElementChild as HTMLElement | null;
          if (!bar) return PAGINATION_BAR_HEIGHT;
          return Math.max(PAGINATION_BAR_HEIGHT, Math.ceil(bar.getBoundingClientRect().height));
        };

        if (paginationTop) {
          const h = measure(paginationTop);
          paginationTop.style.height = `${h}px`;
          scrollContainerEl.style.top = `${headerHeightPx + h}px`;
        }
        if (paginationBottom) {
          const h = measure(paginationBottom);
          paginationBottom.style.height = `${h}px`;
          scrollContainerEl.style.bottom = `${h}px`;
        }
      }

      function getTotalPages(): number {
        const pageSize = store.get('pagination.pageSize') as number;
        if (pageSize <= 0) return 0;
        const rowCount = (store.get('rows.count') as number) ?? options.rowCount;
        if (rowCount <= 0) return 0;
        return Math.ceil(rowCount / pageSize);
      }

      function validateAndClamp(): void {
        const totalPages = getTotalPages();
        const currentPage = store.get('pagination.currentPage') as number;
        if (totalPages === 0) {
          store.set('pagination.currentPage', 0);
        } else if (currentPage >= totalPages) {
          store.set('pagination.currentPage', Math.max(0, totalPages - 1));
        }
        store.set('pagination.totalPages', totalPages);
      }

      function updatePaginationUI(): void {
        ensureContainers();
        validateAndClamp();

        const currentPage = store.get('pagination.currentPage') as number;
        const pageSize = store.get('pagination.pageSize') as number;
        const totalPages = store.get('pagination.totalPages') as number;
        const totalRows = (store.get('rows.count') as number) ?? options.rowCount;

        const state = {
          currentPage,
          totalPages,
          pageSize,
          totalRows,
          pageSizeOptions: options.pagination?.pageSizeOptions ?? [25, 50, 100, 200, 500],
        };

        const handlers = {
          onPageChange: (page: number) => store.exec('pagination:goToPage', page),
          onPageSizeChange: (size: number) => store.exec('pagination:setPageSize', size),
          onFirstPage: () => store.exec('pagination:firstPage'),
          onLastPage: () => store.exec('pagination:lastPage'),
          onNextPage: () => store.exec('pagination:nextPage'),
          onPreviousPage: () => store.exec('pagination:previousPage'),
        };

        const paginationElement = paginator.render(state, handlers);

        if (
          paginationTop &&
          (options.pagination?.position === 'top' || options.pagination?.position === 'both')
        ) {
          paginationTop.innerHTML = '';
          paginationTop.appendChild(paginationElement.cloneNode(true));
        }

        if (
          paginationBottom &&
          (options.pagination?.position === 'bottom' ||
            options.pagination?.position === 'both' ||
            !options.pagination?.position)
        ) {
          paginationBottom.innerHTML = '';
          paginationBottom.appendChild(paginationElement);
        }

        reflowContainers();
      }

      store.action(
        'pagination:goToPage',
        (page: number) => {
          const totalPages = getTotalPages();
          if (page < 0 || page >= totalPages) return;
          const currentPage = store.get('pagination.currentPage') as number;
          if (currentPage === page) return;
          store.set('pagination.currentPage', page);
          updatePaginationUI();
          store.exec('rendering:syncAfterPipeline');
          if (options.onPageChange) {
            options.onPageChange(page, store.get('pagination.pageSize') as number);
          }
        },
        'pagination'
      );

      store.action(
        'pagination:nextPage',
        () => {
          const page = store.get('pagination.currentPage') as number;
          store.exec('pagination:goToPage', page + 1);
        },
        'pagination'
      );

      store.action(
        'pagination:previousPage',
        () => {
          const page = store.get('pagination.currentPage') as number;
          store.exec('pagination:goToPage', page - 1);
        },
        'pagination'
      );

      store.action(
        'pagination:firstPage',
        () => {
          store.exec('pagination:goToPage', 0);
        },
        'pagination'
      );

      store.action(
        'pagination:lastPage',
        () => {
          const totalPages = getTotalPages();
          store.exec('pagination:goToPage', totalPages - 1);
        },
        'pagination'
      );

      store.action(
        'pagination:setPageSize',
        (pageSize: number) => {
          if (!Number.isFinite(pageSize) || pageSize <= 0) return;
          pageSize = Math.max(1, Math.floor(pageSize));

          const currentPageSize = store.get('pagination.pageSize') as number;
          if (pageSize === currentPageSize) return;

          const currentPage = store.get('pagination.currentPage') as number;
          const currentFirstRow = currentPage * currentPageSize;
          const newPage = Math.floor(currentFirstRow / pageSize);

          store.set('pagination.pageSize', pageSize);
          store.set('pagination.currentPage', newPage);
          updatePaginationUI();
          store.exec('rendering:syncAfterPipeline');

          if (options.onPageChange) {
            options.onPageChange(
              store.get('pagination.currentPage') as number,
              pageSize
            );
          }
        },
        'pagination'
      );

      store.action(
        'pagination:setContainers',
        (top: HTMLElement | null, bottom: HTMLElement | null) => {
          paginationTop = top;
          paginationBottom = bottom;
        },
        'pagination'
      );

      store.action('pagination:update', updatePaginationUI, 'pagination');

      api.register('pagination', {
        goToPage: (page: number) => store.exec('pagination:goToPage', page),
        nextPage: () => store.exec('pagination:nextPage'),
        previousPage: () => store.exec('pagination:previousPage'),
        firstPage: () => store.exec('pagination:firstPage'),
        lastPage: () => store.exec('pagination:lastPage'),
        setPageSize: (size: number) => store.exec('pagination:setPageSize', size),
        getCurrentPage: () => store.get('pagination.currentPage'),
        getPageSize: () => store.get('pagination.pageSize'),
        getTotalPages: () => getTotalPages(),
        update: () => store.exec('pagination:update'),
        setContainers: (top: HTMLElement | null, bottom: HTMLElement | null) =>
          store.exec('pagination:setContainers', top, bottom),
      });

      return { teardown: [] };
    },
  };
}
