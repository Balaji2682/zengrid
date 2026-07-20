import type { GridPlugin, PluginDisposable, GridStore, GridApi } from '../../reactive/types';
import type { GridOptions, SortState, FilterModel } from '../../types';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import type { HeaderRenderer } from '../../rendering/headers/header-renderer.interface';
import type { HeaderCellMetadata } from './header-types';
import { resolveHeaderHeight } from './header-types';
import { HeaderRendererRegistry } from '../../rendering/headers/header-registry';
import { registerDefaultRenderers } from './header-registry-setup';
import {
  createHeaderCellsContainer,
  destroyHeaders,
  syncHorizontalScroll,
} from './header-dom-operations';
import { renderAllHeaders, updateHeaderByColumnId, updateHeaderByIndex, updateAllHeaders } from './header-rendering';
import { subscribeToColumnChanges } from './header-reactive-subscription';
import type { ColumnModel } from '../../features/columns/column-model';

export interface HeaderPluginOptions {
  options: GridOptions;
  events: EventEmitter<GridEvents>;
  getColumnModel: () => ColumnModel | null;
}

/**
 * HeaderPlugin - Manages grid header lifecycle and rendering.
 *
 * Replaces the legacy HeaderManager class. Coordinates header rendering,
 * scroll sync, and reactive column updates through the plugin system.
 */
export function createHeaderPlugin(opts: HeaderPluginOptions): GridPlugin {
  return {
    name: 'header',
    phase: 70,
    dependencies: ['core', 'dom', 'column'],
    setup(store: GridStore, api: GridApi): PluginDisposable {
      const { events, getColumnModel, options } = opts;

      const registry = new HeaderRendererRegistry();
      const headerCells = new Map<string, HeaderCellMetadata>();
      let headerCellsContainer: HTMLElement | null = null;
      let columnSubscription: (() => void) | null = null;
      const eventUnsubs: Array<() => void> = [];

      const headerHeight = resolveHeaderHeight(options);

      // Register default renderers
      registerDefaultRenderers(registry);

      function getSortState(): SortState[] {
        try {
          return (store.get('sort.state') as SortState[]) ?? [];
        } catch {
          return [];
        }
      }

      function getFilterState(): FilterModel[] {
        try {
          return (store.get('filter.state') as FilterModel[]) ?? [];
        } catch {
          return [];
        }
      }

      function getConfig() {
        const columnModel = getColumnModel();
        if (!columnModel) return null;
        const headerContainer = store.get('dom.headerContainer') as HTMLElement | null;
        if (!headerContainer) return null;
        return {
          columnModel,
          container: headerContainer,
          eventEmitter: events,
          getSortState,
          getFilterState,
          headerHeight,
          enableScrollSync: true,
        };
      }

      // --- Actions ---

      store.action(
        'header:initialize',
        () => {
          const columnModel = getColumnModel();
          if (!columnModel) return;

          // Subscribe to column model changes
          columnSubscription = subscribeToColumnChanges(columnModel, {
            onWidthChange: (columnId: string) => {
              const config = getConfig();
              if (config) {
                updateHeaderByColumnId(columnId, headerCells, config.columnModel, config, headerHeight);
              }
            },
            onVisibilityChange: () => store.exec('header:refresh'),
            onReorderChange: () => store.exec('header:refresh'),
            onOtherChange: (columnId: string) => {
              const config = getConfig();
              if (config) {
                updateHeaderByColumnId(columnId, headerCells, config.columnModel, config, headerHeight);
              }
            },
          });

          // Setup event listeners (store unsubs for teardown)
          eventUnsubs.push(
            events.on('sort:change', () => store.exec('header:updateAll')),
            events.on('filter:change', () => store.exec('header:updateAll')),
            events.on('scroll', (payload: any) => {
              if (payload.scrollLeft !== undefined) {
                syncHorizontalScroll(headerCellsContainer, payload.scrollLeft);
              }
            })
          );

        },
        'header'
      );

      store.action(
        'header:render',
        () => {
          const config = getConfig();
          if (!config) return;

          // Clear existing headers
          destroyHeaders(headerCells, headerCellsContainer);

          // Create header cells container
          if (!headerCellsContainer) {
            headerCellsContainer = createHeaderCellsContainer(
              config.container,
              headerHeight
            );
          }

          // Render all headers
          renderAllHeaders(
            config.columnModel,
            headerCellsContainer,
            headerCells,
            registry,
            config,
            headerHeight
          );
        },
        'header'
      );

      store.action(
        'header:update',
        (columnIndex: number) => {
          const config = getConfig();
          if (!config) return;
          updateHeaderByIndex(columnIndex, config.columnModel, headerCells, config, headerHeight);
        },
        'header'
      );

      store.action(
        'header:updateAll',
        () => {
          const config = getConfig();
          if (!config) return;
          updateAllHeaders(headerCells, config.columnModel, config, headerHeight);
        },
        'header'
      );

      store.action(
        'header:refresh',
        () => {
          store.exec('header:render');
        },
        'header'
      );

      store.action(
        'header:registerRenderer',
        (name: string, renderer: HeaderRenderer) => {
          registry.register(name, () => renderer);
        },
        'header'
      );

      store.action(
        'header:syncScroll',
        (scrollLeft: number) => {
          syncHorizontalScroll(headerCellsContainer, scrollLeft);
        },
        'header'
      );

      api.register('header', {
        initialize: () => store.exec('header:initialize'),
        render: () => store.exec('header:render'),
        update: (columnIndex: number) => store.exec('header:update', columnIndex),
        updateAll: () => store.exec('header:updateAll'),
        refresh: () => store.exec('header:refresh'),
        registerRenderer: (name: string, renderer: HeaderRenderer) =>
          store.exec('header:registerRenderer', name, renderer),
        syncScroll: (scrollLeft: number) => store.exec('header:syncScroll', scrollLeft),
        getHeaderHeight: () => headerHeight,
        getHeaderCellsContainer: () => headerCellsContainer,
        getHeaderContainer: () => store.get('dom.headerContainer'),
      });

      return {
        teardown: [
          () => {
            for (const unsub of eventUnsubs) unsub();
            eventUnsubs.length = 0;
            if (columnSubscription) {
              columnSubscription();
              columnSubscription = null;
            }
            destroyHeaders(headerCells, headerCellsContainer);
            headerCells.clear();
            headerCellsContainer = null;
          },
        ],
      };
    },
  };
}
