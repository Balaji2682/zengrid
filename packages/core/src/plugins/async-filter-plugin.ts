import type { GridPlugin, PluginDisposable, AsyncState } from '../reactive/types';
import { FilterManager } from '../features/filtering/filter-manager';
import { processInChunks } from '../reactive/yield';
import type { FilterCondition } from '../types';

export interface AsyncFilterPluginOptions {
  colCount?: number;
  chunkSize?: number;
}

export function createAsyncFilterPlugin(options?: AsyncFilterPluginOptions): GridPlugin {
  const chunkSize = options?.chunkSize ?? 10000;

  return {
    name: 'filter',
    phase: 20,
    dependencies: ['core'],
    setup(store, api): PluginDisposable {
      store.extend('filter.state', [], 'filter');

      const mgr = new FilterManager({
        colCount: options?.colCount ?? 0,
        getValue: (row, col) => {
          const raw = store.get('rows.raw') as unknown[][];
          return raw[row]?.[col];
        },
      });

      // Async computed: reads filter.state + pipeline.sort reactively,
      // then chunks the filter pass in an async worker.
      store.asyncComputed(
        'pipeline.filter',
        () => {
          void store.get('filter.state');
          const rowCount = store.get('rows.count') as number;
          // Compose with previous pipeline stage
          const sortOutput = store.getUnphased('pipeline.sort') as number[] | undefined;
          const rawIndices = store.get('rows.indices') as number[];

          return async () => {
            if (!mgr.hasActiveFilters()) return undefined;

            const visibleSet = new Set(mgr.getVisibleRows(rowCount));
            const input = sortOutput ?? rawIndices;
            const result: number[] = [];

            await processInChunks(
              input,
              (idx) => {
                if (visibleSet.has(idx)) result.push(idx);
              },
              chunkSize
            );

            return result;
          };
        },
        'filter',
        20
      );

      store.action(
        'filter:setColumn',
        (col: number, conditions: FilterCondition[], logic: 'AND' | 'OR' = 'AND') => {
          const prev = mgr.getFilterState();
          mgr.setColumnFilter(col, conditions, logic);
          store.set('filter.state', mgr.getFilterState());
          api.fireEvent('filter:change', { filterState: mgr.getFilterState(), previousFilterState: prev });
        },
        'filter'
      );

      store.action(
        'filter:clear',
        () => {
          const prev = mgr.getFilterState();
          mgr.clearAll();
          store.set('filter.state', []);
          api.fireEvent('filter:change', { filterState: [], previousFilterState: prev });
        },
        'filter'
      );

      store.action(
        'filter:clearColumn',
        (col: number) => {
          const prev = mgr.getFilterState();
          mgr.clearColumnFilter(col);
          store.set('filter.state', mgr.getFilterState());
          api.fireEvent('filter:change', { filterState: mgr.getFilterState(), previousFilterState: prev });
        },
        'filter'
      );

      store.action(
        'filter:reapply',
        () => {
          // Trigger by writing filter.state again to dirty the asyncComputed
          store.set('filter.state', mgr.getFilterState());
        },
        'filter'
      );

      api.register('filter', {
        setColumnFilter: (col: number, conds: FilterCondition[], logic?: 'AND' | 'OR') =>
          store.exec('filter:setColumn', col, conds, logic),
        clearColumnFilter: (col: number) => store.exec('filter:clearColumn', col),
        clear: () => store.exec('filter:clear'),
        reapply: () => store.exec('filter:reapply'),
        getState: () => store.get('filter.state'),
        hasActiveFilters: () => mgr.hasActiveFilters(),
        getAsyncState: () => store.get('pipeline.filter.__async') as AsyncState,
        isPending: () => (store.get('pipeline.filter.__async') as AsyncState)?.pending ?? false,
      });

      return { teardown: [() => mgr.destroy()] };
    },
  };
}
