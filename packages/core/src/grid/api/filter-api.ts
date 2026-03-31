import type { FilterExpression, FilterModel } from '../../types';
import type { FilterExportResult } from '../../features/filtering/adapters/types';
import type { FieldFilterState } from '../../features/filtering/types';
import type { SlimGridContext } from '../grid-context';
import { resolveQueryExecutionMode } from '../query-mode';

export interface FilterApi {
  set(column: number, operator: string, value: any): void;
  setColumn(column: number, conditions: Array<{ operator: string; value: any }>, logic?: 'AND' | 'OR'): void;
  setFieldState(state: FieldFilterState): void;
  clear(): void;
  clearColumn(column: number): void;
  getState(): FilterModel[];
  setState(models: FilterModel[]): void;
  getFieldState(): FieldFilterState | null;
  getExports(): FilterExportResult | null;
  getExpression(): FilterExpression | null;
  getMode(): 'frontend' | 'backend';
  setQuick(query: string, columns?: number[]): void;
  clearQuick(): void;
  getQuick(): { query: string; columns: number[] | null };
}

export function createFilterApi(ctx: SlimGridContext): FilterApi {
  function hasFilterPlugin(): boolean {
    return ctx.pluginHost.has('filter');
  }

  return {
    set(column: number, operator: string, value: any): void {
      if (!hasFilterPlugin()) return;
      ctx.store.exec('filter:setColumn', column, [{ operator, value }], 'AND');
    },

    setColumn(column: number, conditions: Array<{ operator: string; value: any }>, logic: 'AND' | 'OR' = 'AND'): void {
      if (!hasFilterPlugin()) return;
      ctx.store.exec('filter:setColumn', column, conditions, logic);
    },

    setFieldState(state: FieldFilterState): void {
      if (!hasFilterPlugin()) return;
      ctx.store.exec('filter:setFieldState', state);
    },

    clear(): void {
      if (!hasFilterPlugin()) return;
      ctx.store.exec('filter:clear');
    },

    clearColumn(column: number): void {
      if (!hasFilterPlugin()) return;
      ctx.store.exec('filter:clearColumn', column);
    },

    getState(): FilterModel[] {
      if (!hasFilterPlugin()) return [];
      return ctx.store.get('filter.state') as FilterModel[];
    },

    setState(models: FilterModel[]): void {
      if (!hasFilterPlugin()) return;
      ctx.store.exec('filter:setState', models);
    },

    getFieldState(): FieldFilterState | null {
      if (!hasFilterPlugin()) return null;
      const api = ctx.gridApi.getMethod('filter', 'getFieldFilterState');
      return api ? (api() as FieldFilterState | null) : null;
    },

    getExports(): FilterExportResult | null {
      if (!hasFilterPlugin()) return null;
      const api = ctx.gridApi.getMethod('filter', 'getFilterExports');
      return api ? (api() as FilterExportResult | null) : null;
    },

    getExpression(): FilterExpression | null {
      if (!hasFilterPlugin()) return null;
      const api = ctx.gridApi.getMethod('filter', 'getExpression');
      return api ? (api() as FilterExpression | null) : null;
    },

    getMode(): 'frontend' | 'backend' {
      if (!hasFilterPlugin()) return 'frontend';
      const api = ctx.gridApi.getMethod('filter', 'getMode');
      if (api) return api() as 'frontend' | 'backend';
      return resolveQueryExecutionMode(ctx.options.dataMode);
    },

    setQuick(query: string, columns?: number[]): void {
      if (!hasFilterPlugin()) return;
      ctx.store.exec('filter:setQuickFilter', query, columns);
    },

    clearQuick(): void {
      if (!hasFilterPlugin()) return;
      ctx.store.exec('filter:clearQuickFilter');
    },

    getQuick(): { query: string; columns: number[] | null } {
      if (!hasFilterPlugin()) return { query: '', columns: null };
      return ctx.store.get('filter.quickFilter') as { query: string; columns: number[] | null };
    },
  };
}
