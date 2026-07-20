import type { CellRef, GridOptions, GridExportOptions, DataRequestState } from '../types';
import type { GridPlugin } from '../reactive';
import type { SlimGridContext } from './grid-context';
import { createSlimContext, installAllPlugins } from './grid-setup';
import { createThemeMethods, type ThemeMethods } from './grid-theme-methods';
import type { ZenGridTheme, PartialTheme } from '../theming/theme.interface';
import { registerTheme, listThemes } from '../theming/theme-registry';
import type { GridStoreImpl } from '../reactive/store';
import type { GridApiImpl } from './grid-api';
import type { PluginHost } from './plugin-host';
import type { HeaderRenderer } from '../rendering/headers';
import type { GridEvents } from '../events';
import { ArrayAccessor } from '../data/data-accessor/array-accessor';
import {
  createSortApi,
  type SortApi,
  createFilterApi,
  type FilterApi,
  createPaginationApi,
  type PaginationApi,
  createColumnApi,
  type ColumnApi,
  createScrollApi,
  type ScrollApi,
  createStateApi,
  type StateApi,
  createExportApi,
  type ExportApi,
} from './api';

export class Grid {
  private ctx: SlimGridContext;
  private _theme: ThemeMethods;

  readonly sort: SortApi;
  readonly filter: FilterApi;
  readonly pagination: PaginationApi;
  readonly columns: ColumnApi;
  readonly scroll: ScrollApi;
  readonly state: StateApi;
  readonly export: ExportApi;

  constructor(container: HTMLElement, options: GridOptions) {
    this.ctx = createSlimContext(container, options);
    installAllPlugins(this.ctx);

    this._theme = createThemeMethods(this.ctx as any);

    // Create namespaced API objects
    this.sort = createSortApi(this.ctx);
    this.filter = createFilterApi(this.ctx);
    this.pagination = createPaginationApi(this.ctx);
    this.columns = createColumnApi(this.ctx);
    this.scroll = createScrollApi(this.ctx);
    this.export = createExportApi(this.ctx, () => (this.ctx as any)._getDataAccessor?.());

    // state depends on sort + filter
    this.state = createStateApi(this.ctx, this.sort, this.filter);
  }

  // --- Data ---

  setData(data: any[][]): void {
    this.ctx.store.exec('core:setData', data);
    this.ctx.state.data = data;
    this.ctx.optionsManager.update({ rowCount: data.length });

    const dataAccessor = new ArrayAccessor(data);
    (this.ctx as any)._setDataAccessor?.(dataAccessor);

    if (this.ctx.pluginHost.has('infinite-scroll'))
      this.ctx.store.exec('infiniteScroll:init', data.length);
    if (this.ctx.pluginHost.has('filter'))
      this.ctx.store.exec('filter:init', this.ctx.options.colCount, dataAccessor);
    if (this.ctx.pluginHost.has('sort'))
      this.ctx.store.exec('sort:init', data.length, dataAccessor);
  }

  getData(row: number, col: number): any {
    return (this.ctx as any)._getDataAccessor?.()?.getValue(row, col);
  }

  getDataMode(): 'frontend' | 'backend' {
    const api = this.ctx.gridApi.getMethod('data', 'getMode');
    if (api) return api() as 'frontend' | 'backend';

    const mode = this.ctx.options.dataMode ?? 'frontend';
    if (mode === 'auto') return this.ctx.options.onDataRequest ? 'backend' : 'frontend';
    return mode === 'backend' ? 'backend' : 'frontend';
  }

  getDataStatus(): DataRequestState {
    const api = this.ctx.gridApi.getMethod('data', 'getStatus');
    if (api) return api() as DataRequestState;

    return {
      mode: this.getDataMode(),
      status: 'idle',
      isLoading: false,
      error: null,
      lastRequest: null,
      lastLoadedRange: null,
      totalRows: this.ctx.options.rowCount,
      canRetry: false,
    };
  }

  async refreshData(): Promise<void> {
    const api = this.ctx.gridApi.getMethod('data', 'refresh');
    if (api) {
      await api();
    }
  }

  async retryDataRequest(): Promise<void> {
    const api = this.ctx.gridApi.getMethod('data', 'retry');
    if (api) {
      await api();
    }
  }

  // --- Render / Lifecycle ---

  render(): void {
    if (this.ctx.isDestroyed) throw new Error('Cannot render destroyed grid');
    this.ctx.store.exec('lifecycle:render');
  }

  refresh(): void {
    this.ctx.store.exec('rendering:refresh');
  }

  clearCache(): void {
    this.ctx.store.exec('rendering:clearCache');
  }

  updateCells(cells: CellRef[]): void {
    this.ctx.store.exec('rendering:updateCells', cells);
  }

  destroy(): void {
    if (this.ctx.isDestroyed) return;
    this._theme.destroyAutoTheme();
    this.ctx.pluginHost?.destroy?.();
    this.ctx.optionsManager?.destroy?.();
    this.ctx.container.classList.remove('zg-grid');
    this.ctx.isDestroyed = true;
  }

  // --- Options / Stats ---

  registerRenderer(name: string, renderer: any): void {
    this.ctx.store.exec('rendering:registerRenderer', name, renderer);
  }

  updateOptions(options: Partial<GridOptions>): void {
    const change = this.ctx.optionsManager.update(options);
    if (!change) return;
    this.ctx.store.exec('rendering:updateScroller');
    this.ctx.store.exec('rendering:refresh');
  }

  getStats() {
    const api = this.ctx.gridApi.getMethod('rendering', 'getStats');
    return api ? api() : null;
  }

  getDimensions(): { width: number; height: number } {
    const api = this.ctx.gridApi.getMethod('rendering', 'getDimensions');
    return api ? api() : { width: 0, height: 0 };
  }

  getColumnPosition(col: number): { x: number; width: number } {
    const api = this.ctx.gridApi.getMethod('rendering', 'getColumnPosition');
    return api ? api(col) : { x: 0, width: 0 };
  }

  // --- Headers ---

  registerHeaderRenderer(name: string, renderer: HeaderRenderer): void {
    this.ctx.store.exec('header:registerRenderer', name, renderer);
  }

  updateHeader(columnIndex: number): void {
    this.ctx.store.exec('header:update', columnIndex);
  }

  updateAllHeaders(): void {
    this.ctx.store.exec('header:updateAll');
  }

  refreshHeaders(): void {
    this.ctx.store.exec('header:refresh');
  }

  // --- Infinite Scroll ---

  resetInfiniteScrolling(): void {
    if (this.ctx.pluginHost.has('infinite-scroll')) this.ctx.store.exec('infiniteScroll:reset');
  }

  getSlidingWindowStats() {
    if (this.ctx.pluginHost.has('infinite-scroll'))
      return this.ctx.store.get('infiniteScroll.stats');
    return {
      virtualOffset: 0,
      rowsInMemory: this.ctx.state.data.length,
      totalRowsLoaded: 0,
      prunedRows: 0,
    };
  }

  // --- Theme ---

  setTheme(nameOrObject: string | ZenGridTheme): void {
    this._theme.setTheme(nameOrObject);
  }

  getTheme(): ZenGridTheme {
    return this._theme.getTheme();
  }

  getThemeName(): string {
    return this._theme.getThemeName();
  }

  updateTheme(partial: PartialTheme): void {
    this._theme.updateTheme(partial);
  }

  resetTheme(): void {
    this._theme.resetTheme();
  }

  static registerTheme(theme: ZenGridTheme): void {
    registerTheme(theme);
  }

  static getAvailableThemes(): string[] {
    return listThemes();
  }

  // --- Events ---

  on<K extends keyof GridEvents>(event: K, handler: (payload: GridEvents[K]) => void): void {
    this.ctx.events.on(event, handler);
  }

  off<K extends keyof GridEvents>(event: K, handler: (payload: GridEvents[K]) => void): void {
    this.ctx.events.off(event, handler);
  }

  // --- Plugin System ---

  getContainer(): HTMLElement {
    return this.ctx.container;
  }

  getStore(): GridStoreImpl {
    return this.ctx.store;
  }

  getPluginHost(): PluginHost {
    return this.ctx.pluginHost;
  }

  getGridApi(): GridApiImpl {
    return this.ctx.gridApi;
  }

  usePlugin(plugin: GridPlugin): void {
    this.ctx.pluginHost.use(plugin);
  }

  // --- Backward-compatible flat methods ---
  // These delegate to the namespaced APIs for backward compatibility.

  sort_apply = (sortState: any[]) => this.sort.apply(sortState);
  toggleSort = (column: number) => this.sort.toggle(column);
  clearSort = () => this.sort.clear();
  getSortState = () => this.sort.getState();
  setSortState = (s: any[]) => this.sort.setState(s);
  getColumnSort = (col: number) => this.sort.getColumnSort(col);
  getSortIcons = () => this.sort.getIcons();
  getSortMode = () => this.sort.getMode();

  setFilter = (col: number, op: string, val: any) => this.filter.set(col, op, val);
  setColumnFilter = (col: number, conditions: any[], logic?: 'AND' | 'OR') =>
    this.filter.setColumn(col, conditions, logic);
  clearFilters = () => this.filter.clear();
  clearColumnFilter = (col: number) => this.filter.clearColumn(col);
  getFilterState = () => this.filter.getState();
  setFilterState = (m: any[]) => this.filter.setState(m);
  getFieldFilterState = () => this.filter.getFieldState();
  getFilterExports = () => this.filter.getExports();
  getFilterMode = () => this.filter.getMode();
  setQuickFilter = (q: string, cols?: number[]) => this.filter.setQuick(q, cols);
  clearQuickFilter = () => this.filter.clearQuick();
  getQuickFilter = () => this.filter.getQuick();

  goToPage = (p: number) => this.pagination.goTo(p);
  nextPage = () => this.pagination.next();
  previousPage = () => this.pagination.previous();
  firstPage = () => this.pagination.first();
  lastPage = () => this.pagination.last();
  setPageSize = (s: number) => this.pagination.setPageSize(s);
  getCurrentPage = () => this.pagination.getCurrentPage();
  getPageSize = () => this.pagination.getPageSize();
  getTotalPages = () => this.pagination.getTotalPages();

  attachColumnResize = (h: HTMLElement) => this.columns.attachResize(h);
  detachColumnResize = () => this.columns.detachResize();
  resizeColumn = (col: number, w: number) => this.columns.resize(col, w);
  autoFitColumn = (col: number) => this.columns.autoFit(col);
  autoFitAllColumns = () => this.columns.autoFitAll();
  setColumnConstraints = (col: number, c: any) => this.columns.setConstraints(col, c);
  updateColumnResizeHandles = () => this.columns.updateResizeHandles();
  attachColumnDrag = (h: HTMLElement) => this.columns.attachDrag(h);
  detachColumnDrag = () => this.columns.detachDrag();
  isDragging = () => this.columns.isDragging();
  getColumnState = () => this.columns.getState();
  applyColumnState = (s: any[], o?: any) => this.columns.applyState(s, o);

  scrollToCell = (r: number, c: number) => this.scroll.toCell(r, c);
  scrollThroughCells = (cells: any[], o?: any) => this.scroll.throughCells(cells, o);
  getScrollPosition = () => this.scroll.getPosition();
  getVisibleRange = () => this.scroll.getVisibleRange();

  getStateSnapshot = () => this.state.getSnapshot();
  applyStateSnapshot = (s: any) => this.state.applySnapshot(s);

  exportCSV = (o?: GridExportOptions) => this.export.csv(o);
  exportTSV = (o?: GridExportOptions) => this.export.tsv(o);

  /** @deprecated Use refreshData() */
  refreshGridData = () => this.refreshData();
  /** @deprecated Use retryDataRequest() */
  retryDataRequestAsync = () => this.retryDataRequest();
  /** @deprecated Use getDataStatus() */
  getDataRequestStatus = () => this.getDataStatus();
}
