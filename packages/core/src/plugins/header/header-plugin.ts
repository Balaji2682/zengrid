import type { GridPlugin, PluginDisposable, GridStore, GridApi } from '../../reactive/types';
import type { GridOptions, SortState, FilterModel } from '../../types';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import type { HeaderRenderer } from '../../rendering/headers/header-renderer.interface';
import type { HeaderCellMetadata } from './header-types';
import { resolveHeaderHeight, resolveColumnGroupLevels } from './header-types';
import { HeaderRendererRegistry } from '../../rendering/headers/header-registry';
import { registerDefaultRenderers } from './header-registry-setup';
import {
  createHeaderCellsContainer,
  destroyHeaders,
  syncHorizontalScroll,
  syncPinnedHeaders,
  renderColumnGroups,
  syncGroupScroll,
} from './header-dom-operations';
import { renderAllHeaders, updateHeaderByColumnId, updateHeaderByIndex, updateAllHeaders } from './header-rendering';
import { subscribeToColumnChanges } from './header-reactive-subscription';
import type { ColumnModel } from '../../features/columns/column-model';
import { ColumnVisibilityPlugin } from '../../features/columns/plugins/column-visibility';

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
      let headerGroupsContainer: HTMLElement | null = null;
      let columnSubscription: (() => void) | null = null;
      let colPinUnsub: (() => void) | null = null;
      let colGroupUnsub: (() => void) | null = null;
      let lastScrollLeft = 0;
      const eventUnsubs: Array<() => void> = [];

      // Leaf-header row height; grouped-header banners add `levels` rows on top.
      const headerHeight = resolveHeaderHeight(options);
      const groupLevels = resolveColumnGroupLevels(options);
      const groupsHeight = headerHeight * groupLevels;

      // Draw the grouped-header banners at the current scroll offset.
      function paintGroups(scrollLeft: number): void {
        if (!headerGroupsContainer) return;
        renderColumnGroups(
          headerGroupsContainer,
          getColumnModel(),
          options.colGroupProvider,
          headerHeight,
          scrollLeft
        );
      }

      // Freeze the pinned header cells at the current scroll offset. No-op unless
      // a `colPinProvider` is configured. Uses the body scroll container's width so
      // the right band lines up with the frozen body cells (which exclude the
      // vertical scrollbar).
      function freezePinnedHeaders(scrollLeft: number): void {
        lastScrollLeft = scrollLeft;
        if (!options.colPinProvider) return;
        const columnModel = getColumnModel();
        const scrollContainer = store.get('dom.scrollContainer') as HTMLElement | null;
        const viewportWidth = scrollContainer?.clientWidth ?? 0;
        syncPinnedHeaders(
          headerCells,
          columnModel,
          options.colPinProvider,
          scrollLeft,
          viewportWidth
        );
      }

      // Toggle a group's collapsed state and reconcile column visibility from the
      // provider. Hiding/showing columns fires the model's visibility events,
      // which re-render the headers (banners included) and the body.
      function toggleGroupCollapse(groupId: string): void {
        const provider = options.colGroupProvider;
        const model = getColumnModel();
        if (!provider?.toggleCollapse || !model) return;
        provider.toggleCollapse(groupId);

        const managed = provider.managedFields?.() ?? [];
        if (managed.length === 0) {
          store.exec('header:refresh');
          return;
        }
        const hidden = new Set(provider.hiddenFields?.() ?? []);
        const visibility = new ColumnVisibilityPlugin(model);
        model.batchUpdate(() => {
          for (const field of managed) {
            const col = model.getColumnByField(field);
            if (!col) continue;
            if (hidden.has(field)) visibility.hide(col.id);
            else visibility.show(col.id);
          }
        });
      }

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
                syncGroupScroll(headerGroupsContainer, payload.scrollLeft);
                freezePinnedHeaders(payload.scrollLeft);
                lastScrollLeft = payload.scrollLeft;
              }
            })
          );

          // Re-freeze headers when the pinned set changes live (pin/unpin).
          colPinUnsub =
            options.colPinProvider?.subscribe?.(() => {
              store.exec('header:refresh');
            }) ?? null;

          // Re-render banners when the grouping changes (e.g. expand/collapse).
          colGroupUnsub =
            options.colGroupProvider?.subscribe?.(() => {
              store.exec('header:refresh');
            }) ?? null;

          // Delegate banner-toggle clicks to collapse/expand a group. Bound on
          // the stable header container since the banner strip is rebuilt each
          // render.
          if (options.colGroupProvider?.toggleCollapse) {
            const headerContainer = store.get('dom.headerContainer') as HTMLElement | null;
            if (headerContainer) {
              const onGroupToggle = (e: Event) => {
                const toggle = (e.target as HTMLElement | null)?.closest?.(
                  '.zg-header-group-toggle'
                ) as HTMLElement | null;
                const groupId = toggle?.dataset['groupId'];
                if (groupId) toggleGroupCollapse(groupId);
              };
              headerContainer.addEventListener('click', onGroupToggle);
              eventUnsubs.push(() =>
                headerContainer.removeEventListener('click', onGroupToggle)
              );
            }
          }
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

          // Create header cells container (+ grouped-header strip when configured).
          // Rebuilt each render so the leaf/group offsets stay correct.
          const containers = createHeaderCellsContainer(
            config.container,
            headerHeight,
            groupsHeight
          );
          headerCellsContainer = containers.cells;
          headerGroupsContainer = containers.groups;

          // Render all headers
          renderAllHeaders(
            config.columnModel,
            headerCellsContainer,
            headerCells,
            registry,
            config,
            headerHeight
          );

          // Grouped-header banners above the leaf headers.
          paintGroups(lastScrollLeft);

          // A fresh render re-creates the cell elements, so re-apply freezing.
          freezePinnedHeaders(lastScrollLeft);
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
          syncGroupScroll(headerGroupsContainer, scrollLeft);
          freezePinnedHeaders(scrollLeft);
          lastScrollLeft = scrollLeft;
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
            if (colPinUnsub) {
              colPinUnsub();
              colPinUnsub = null;
            }
            if (colGroupUnsub) {
              colGroupUnsub();
              colGroupUnsub = null;
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
