import type { SortState } from '../../types';
import type { SlimGridContext } from '../grid-context';
import { resolveQueryExecutionMode } from '../query-mode';

export interface SortApi {
  apply(sortState: SortState[]): void;
  toggle(column: number): void;
  clear(): void;
  getState(): SortState[];
  setState(sortState: SortState[]): void;
  getColumnSort(column: number): any;
  getIcons(): { asc: string; desc: string };
  getMode(): 'frontend' | 'backend';
}

export function createSortApi(ctx: SlimGridContext): SortApi {
  function hasSortPlugin(): boolean {
    return ctx.pluginHost.has('sort');
  }

  return {
    apply(sortState: SortState[]): void {
      if (!hasSortPlugin()) return;
      ctx.store.exec('sort:apply', sortState);
    },

    toggle(column: number): void {
      if (!hasSortPlugin()) return;
      ctx.store.exec('sort:toggle', column);
    },

    clear(): void {
      if (!hasSortPlugin()) return;
      ctx.store.exec('sort:clear');
    },

    getState(): SortState[] {
      if (!hasSortPlugin()) return [];
      return ctx.store.get('sort.state') as SortState[];
    },

    setState(sortState: SortState[]): void {
      if (!hasSortPlugin()) return;
      ctx.store.exec('sort:apply', sortState);
    },

    getColumnSort(column: number) {
      if (!hasSortPlugin()) return null;
      const api = ctx.gridApi.getMethod('sort', 'getColumnSort');
      return api ? api(column) : null;
    },

    getIcons(): { asc: string; desc: string } {
      return {
        asc: ctx.options.sortIcons?.asc ?? '▲',
        desc: ctx.options.sortIcons?.desc ?? '▼',
      };
    },

    getMode(): 'frontend' | 'backend' {
      if (!hasSortPlugin()) return 'frontend';
      const getMode = ctx.gridApi.getMethod('sort', 'getMode');
      if (getMode) return getMode() as 'frontend' | 'backend';
      return resolveQueryExecutionMode(ctx.options.dataMode);
    },
  };
}
