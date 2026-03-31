import type { GridPlugin, PluginDisposable } from '../reactive/types';
import { buildUnexecutableFilterError } from '../features/filtering/filter-execution-error';
import { FilterManager } from '../features/filtering/filter-manager';
import { buildModelFilterExpression } from '../features/filtering/filter-expression';
import type {
  FilterCondition,
  FilterExpression,
  FilterModel,
  FilterQuickState,
  ColumnDef,
} from '../types';
import type { FieldFilterState } from '../features/filtering/types';
import type { DataAccessor } from '../data/data-accessor/data-accessor.interface';
import { resolveQueryExecutionMode } from '../grid/query-mode';

export interface FilterPluginOptions {
  colCount?: number;
  columns?: ColumnDef[];
  enableExport?: boolean;
  usePipeline?: boolean;
}

export function createFilterPlugin(options?: FilterPluginOptions): GridPlugin {
  return {
    name: 'filter',
    phase: 20,
    dependencies: ['core'],
    setup(store, api, context): PluginDisposable {
      store.extend('filter.state', [], 'filter');
      store.extend('filter.ast', null, 'filter');
      store.extend('filter.quickFilter', { query: '', columns: null as number[] | null }, 'filter');
      store.extend('filter.expression', null as FilterExpression | null, 'filter');
      store.extend('pipeline.filter', undefined, 'filter', 20);

      const usePipeline = options?.usePipeline !== false;
      const getColumns = () => context.options.columns ?? options?.columns;
      const getColCount = () => context.options.colCount ?? options?.colCount ?? 0;

      let mgr = createManager(getColCount());

      // Quick filter state
      let quickFilterQuery = '';
      let quickFilterColumns: number[] | null = null;
      let quickFilterCache: string[] | null = null;
      let quickFilterCacheKey: string | null = null;

      function getQueryMode(): 'frontend' | 'backend' {
        return resolveQueryExecutionMode(context.options.dataMode);
      }

      function createManager(colCount: number, dataAccessor?: DataAccessor | null): FilterManager {
        const getValue = dataAccessor
          ? (row: number, col: number) => dataAccessor.getValue(row, col)
          : (row: number, col: number) => {
              const raw = store.get('rows.raw') as unknown[][];
              return raw[row]?.[col];
            };

        return new FilterManager({
          colCount,
          getValue,
          columns: getColumns(),
          enableExport: options?.enableExport ?? true,
        });
      }

      function clearQuickFilterCache(): void {
        quickFilterCache = null;
        quickFilterCacheKey = null;
      }

      function getQuickFilterState(): FilterQuickState {
        return {
          query: quickFilterQuery,
          columns: quickFilterColumns ? [...quickFilterColumns] : null,
        };
      }

      function buildExpression(): FilterExpression {
        const columns = getColumns();
        const hasColumns = Array.isArray(columns) && columns.length > 0;

        return buildModelFilterExpression({
          models: mgr.getFilterState(),
          quickFilter: getQuickFilterState(),
          fieldState: hasColumns ? mgr.getFieldFilterState() : null,
          filterExport: hasColumns ? mgr.getFilterExport() : null,
          ast: mgr.getFilterAst(),
          columns,
        });
      }

      function persistState(): FilterExpression {
        const expression = buildExpression();
        store.set('filter.state', mgr.getFilterState());
        store.set('filter.ast', expression.ast ?? null);
        store.set('filter.expression', expression);
        return expression;
      }

      function warnOnStructuredProjection(): void {
        const projectionWarnings = mgr.getAstProjectionWarnings();

        if (!mgr.isUsingAstExecution() || projectionWarnings.length === 0) {
          return;
        }

        console.warn(
          'FilterPlugin: filter.state is a compatibility projection for structured filters. ' +
            'Use filter.ast for the canonical frontend/backend contract.'
        );

        for (const warning of projectionWarnings) {
          console.warn(`FilterPlugin: ${warning}`);
        }
      }

      function resolveQuickFilterColumns(): number[] {
        if (quickFilterColumns && quickFilterColumns.length > 0) {
          return quickFilterColumns;
        }
        const columns = getColumns();
        const colCount = getColCount();
        if (columns && columns.length > 0) {
          return columns.map((_c, index) => index);
        }
        return Array.from({ length: colCount }, (_, i) => i);
      }

      const unsubscribeOptions = context.subscribeOptions((change) => {
        if (!change.changedKeys.includes('columns') && !change.changedKeys.includes('colCount')) {
          return;
        }

        mgr.setColumns(getColumns() ?? []);
        mgr.setColCount(getColCount());
        clearQuickFilterCache();
        applyFilter();
      });

      function ensureQuickFilterCache(columns: number[]): void {
        const cacheKey = columns.join(',');
        if (quickFilterCache && quickFilterCacheKey === cacheKey) {
          return;
        }

        const raw = store.get('rows.raw') as unknown[][];
        if (!raw || raw.length === 0) {
          quickFilterCache = null;
          quickFilterCacheKey = null;
          return;
        }

        const rowCount = raw.length;
        const cache: string[] = new Array(rowCount);

        for (let row = 0; row < rowCount; row++) {
          const parts: string[] = [];
          for (const col of columns) {
            const value = raw[row]?.[col];
            if (value !== undefined && value !== null) {
              parts.push(String(value));
            }
          }
          cache[row] = parts.join(' ').toLowerCase();
        }

        quickFilterCache = cache;
        quickFilterCacheKey = cacheKey;
      }

      function applyQuickFilterToRows(rows: number[]): number[] {
        const query = quickFilterQuery.trim().toLowerCase();
        if (!query) return rows;

        const columns = resolveQuickFilterColumns();
        if (columns.length === 0) return rows;

        ensureQuickFilterCache(columns);
        if (!quickFilterCache) return rows;

        const matches: number[] = [];
        for (const row of rows) {
          const rowText = quickFilterCache[row];
          if (rowText && rowText.includes(query)) {
            matches.push(row);
          }
        }
        return matches;
      }

      function applyFilter(): FilterExpression {
        const hasStructuredFilters = mgr.hasStructuredFilters();
        const hasQuickFilter = quickFilterQuery.trim().length > 0;
        const expression = persistState();

        if (!usePipeline) {
          store.set('pipeline.filter', undefined);
          return expression;
        }

        if (!hasStructuredFilters && !hasQuickFilter) {
          store.set('pipeline.filter', undefined);
          warnOnStructuredProjection();
          return expression;
        }

        if (mgr.hasUnexecutableFilters()) {
          const error = buildUnexecutableFilterError(mgr.getAstExecutionWarnings());
          api.fireEvent('filter:error', {
            timestamp: Date.now(),
            error,
          });
          throw error;
        }

        const rowCount = store.get('rows.count') as number;
        const input =
          (store.getUnphased('pipeline.sort') as number[] | undefined) ??
          (store.get('rows.indices') as number[]);

        let result = input;

        if (hasStructuredFilters) {
          const visibleSet = new Set(mgr.getVisibleRows(rowCount));
          result = result.filter((idx) => visibleSet.has(idx));
        }

        if (hasQuickFilter) {
          result = applyQuickFilterToRows(result);
        }

        store.set('pipeline.filter', result);
        warnOnStructuredProjection();
        return expression;
      }

      store.action(
        'filter:setColumn',
        (col: number, conditions: FilterCondition[], logic: 'AND' | 'OR' = 'AND') => {
          const prev = mgr.getFilterState();
          mgr.setColumnFilter(col, conditions, logic);
          applyFilter();
          api.fireEvent('filter:change', {
            filterState: mgr.getFilterState(),
            previousFilterState: prev,
          });
        },
        'filter'
      );

      store.action(
        'filter:clear',
        () => {
          const prev = mgr.getFilterState();
          mgr.clearAll();
          quickFilterQuery = '';
          quickFilterColumns = null;
          clearQuickFilterCache();
          store.set('filter.quickFilter', { query: '', columns: null });
          applyFilter();
          api.fireEvent('filter:change', { filterState: [], previousFilterState: prev });
        },
        'filter'
      );

      store.action(
        'filter:clearColumn',
        (col: number) => {
          const prev = mgr.getFilterState();
          mgr.clearColumnFilter(col);
          applyFilter();
          api.fireEvent('filter:change', {
            filterState: mgr.getFilterState(),
            previousFilterState: prev,
          });
        },
        'filter'
      );

      store.action(
        'filter:reapply',
        () => {
          applyFilter();
        },
        'filter'
      );

      store.action(
        'filter:init',
        (colCount: number, dataAccessor?: DataAccessor | null) => {
          mgr?.destroy();
          mgr = createManager(colCount, dataAccessor);
          clearQuickFilterCache();
          applyFilter();
        },
        'filter'
      );

      store.action(
        'filter:setQuickFilter',
        (query: string, columns?: number[]) => {
          const prev = mgr.getFilterState();
          quickFilterQuery = query ?? '';
          quickFilterColumns = columns ?? null;
          store.set('filter.quickFilter', { query: quickFilterQuery, columns: quickFilterColumns });
          applyFilter();
          api.fireEvent('filter:change', {
            filterState: mgr.getFilterState(),
            previousFilterState: prev,
          });
        },
        'filter'
      );

      store.action(
        'filter:clearQuickFilter',
        () => {
          const prev = mgr.getFilterState();
          quickFilterQuery = '';
          quickFilterColumns = null;
          clearQuickFilterCache();
          store.set('filter.quickFilter', { query: '', columns: null });
          applyFilter();
          api.fireEvent('filter:change', {
            filterState: mgr.getFilterState(),
            previousFilterState: prev,
          });
        },
        'filter'
      );

      store.action(
        'filter:setState',
        (models: FilterModel[]) => {
          const prev = mgr.getFilterState();
          mgr.clearAll();
          for (const model of models) {
            mgr.setColumnFilter(
              model.column,
              model.conditions as FilterCondition[],
              model.logic ?? 'AND'
            );
          }
          applyFilter();
          api.fireEvent('filter:change', {
            filterState: mgr.getFilterState(),
            previousFilterState: prev,
          });
        },
        'filter'
      );

      store.action(
        'filter:setFieldState',
        (state: FieldFilterState) => {
          const prev = mgr.getFilterState();
          mgr.setFieldFilter(state);
          applyFilter();
          api.fireEvent('filter:change', {
            filterState: mgr.getFilterState(),
            previousFilterState: prev,
          });
        },
        'filter'
      );

      persistState();

      api.register('filter', {
        setColumnFilter: (col: number, conds: FilterCondition[], logic?: 'AND' | 'OR') =>
          store.exec('filter:setColumn', col, conds, logic),
        setFieldFilterState: (state: FieldFilterState) => store.exec('filter:setFieldState', state),
        clearColumnFilter: (col: number) => store.exec('filter:clearColumn', col),
        clear: () => store.exec('filter:clear'),
        reapply: () => store.exec('filter:reapply'),
        getState: () => store.get('filter.state'),
        hasActiveFilters: () => mgr.hasActiveFilters() || quickFilterQuery.trim().length > 0,
        getFieldFilterState: () => mgr.getFieldFilterState(),
        getFilterExports: () => mgr.getFilterExport(),
        getQuickFilter: () => store.get('filter.quickFilter'),
        getExpression: () => store.get('filter.expression'),
        getMode: () => getQueryMode(),
      });

      return { teardown: [unsubscribeOptions, () => mgr.destroy()] };
    },
  };
}
