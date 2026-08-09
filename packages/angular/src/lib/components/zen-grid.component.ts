import {
  Component,
  ElementRef,
  ChangeDetectionStrategy,
  afterNextRender,
  viewChild,
  contentChildren,
  input,
  output,
  model,
  effect,
  inject,
  PLATFORM_ID,
  ChangeDetectorRef,
  OutputEmitterRef,
  NgZone,
  DestroyRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Zengrid } from '@zengrid/core';
import type {
  GridOptions,
  GridExportOptions,
  GridEvents,
  SortState,
  FilterModel,
  CellRange,
  CellRef,
  ColumnDef,
  GridStateSnapshot,
  GridPlugin,
  ColumnConstraints,
  HeaderRenderer,
  VisibleRange,
  PaginationConfig,
  LoadingConfig,
  CellOverflowConfig,
  RowHeightConfig,
  SortIcons,
  RendererCacheConfig,
} from '@zengrid/core';
import { GridApiImpl, PluginHost } from '@zengrid/core';
import { resolveOperationMode, type OperationMode } from '@zengrid/shared';
import { EVENT_MAP } from '../utils/event-map';
import { ZenColumnComponent } from './zen-column.component';
import { TemplateBridgeService } from '../services/template-bridge.service';
import { ZEN_GRID_CONFIG } from '../services/zen-grid-config.token';

@Component({
  selector: 'zen-grid',
  standalone: true,
  template: `
    @if (_isBrowser) {
      <div #gridContainer class="zen-grid-container"></div>
    } @else {
      <div class="zen-grid-placeholder" [style.height.px]="placeholderHeight"></div>
    }
    <div style="display:none">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
      height: 100%;
    }
    .zen-grid-container {
      width: 100%;
      height: 100%;
    }
    .zen-grid-placeholder {
      width: 100%;
      background: #f5f5f5;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZenGridComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly templateBridge = inject(TemplateBridgeService);
  private readonly globalConfig = inject(ZEN_GRID_CONFIG, { optional: true });

  readonly _isBrowser = isPlatformBrowser(this.platformId);

  get placeholderHeight(): number {
    const rowHeight = this.getResolvedRowHeight();
    const height = typeof rowHeight === 'number' ? rowHeight : 30;
    return this.rowCount() * height;
  }

  private readonly gridContainerRef = viewChild<ElementRef<HTMLElement>>('gridContainer');
  private readonly columnChildren = contentChildren(ZenColumnComponent);

  private grid: Zengrid | null = null;
  private gridReady = false;
  private readonly explicitInputs = new Set<'rowHeight' | 'colWidth' | 'columns'>();
  private pendingModelDataSync: any[][] | null = null;

  // --- Core Inputs ---
  readonly rowCount = input.required<number>();
  readonly colCount = input.required<number>();
  readonly rowHeight = input<number | number[], number | number[]>(30, {
    transform: (value: number | number[]) => this.markExplicitInput('rowHeight', value),
  });
  readonly colWidth = input<number | number[], number | number[]>(100, {
    transform: (value: number | number[]) => this.markExplicitInput('colWidth', value),
  });
  readonly columns = input<ColumnDef[], ColumnDef[]>([], {
    transform: (value: ColumnDef[]) => this.markExplicitInput('columns', value),
  });

  // --- Feature Inputs ---
  readonly enableSelection = input<boolean | undefined>(undefined);
  readonly enableMultiSelection = input<boolean | undefined>(undefined);
  readonly selectionType = input<'cell' | 'row' | 'column' | 'range' | undefined>(undefined);
  readonly enableColumnResize = input<boolean | undefined>(undefined);
  readonly enableColumnDrag = input<boolean | undefined>(undefined);
  readonly enableKeyboardNavigation = input<boolean | undefined>(undefined);
  readonly enableA11y = input<boolean | undefined>(undefined);
  readonly enableCellPooling = input<boolean | undefined>(undefined);
  readonly hideLastColumnBorder = input<boolean | undefined>(undefined);

  // --- Mode Inputs ---
  readonly dataMode = input<OperationMode | undefined>(undefined);

  // --- Backend Callback Inputs ---
  readonly onDataRequest = input<GridOptions['onDataRequest']>(undefined);
  readonly onLoadMoreRows = input<GridOptions['onLoadMoreRows']>(undefined);

  // --- Config Object Inputs ---
  readonly pagination = input<PaginationConfig | undefined>(undefined);
  readonly loading = input<LoadingConfig | undefined>(undefined);
  readonly infiniteScrolling = input<GridOptions['infiniteScrolling']>(undefined);
  readonly rowHeightMode = input<'fixed' | 'auto' | 'content-aware' | undefined>(undefined);
  readonly rowHeightConfig = input<RowHeightConfig | undefined>(undefined);
  readonly headerHeight = input<GridOptions['headerHeight']>(undefined);
  readonly columnResize = input<GridOptions['columnResize']>(undefined);
  readonly columnDrag = input<GridOptions['columnDrag']>(undefined);
  readonly cellOverflow = input<CellOverflowConfig | undefined>(undefined);
  readonly editing = input<GridOptions['editing']>(undefined);
  readonly autoResize = input<boolean | undefined>(undefined);
  readonly overscanRows = input<number | undefined>(undefined);
  readonly overscanCols = input<number | undefined>(undefined);
  readonly sortIcons = input<SortIcons | undefined>(undefined);
  readonly rendererCache = input<RendererCacheConfig | undefined>(undefined);

  // --- Callback Inputs (GridOptions event callbacks) ---
  readonly onScrollCallback = input<GridOptions['onScroll']>(undefined);
  readonly onCellClickCallback = input<GridOptions['onCellClick']>(undefined);
  readonly onCellDoubleClickCallback = input<GridOptions['onCellDoubleClick']>(undefined);
  readonly onCellContextMenuCallback = input<GridOptions['onCellContextMenu']>(undefined);
  readonly onSelectionChangeCallback = input<GridOptions['onSelectionChange']>(undefined);
  readonly onPageChangeCallback = input<GridOptions['onPageChange']>(undefined);
  readonly onColumnWidthsChangeCallback = input<GridOptions['onColumnWidthsChange']>(undefined);

  // --- Plugin Input ---
  readonly plugins = input<GridPlugin[]>([]);

  // --- Two-way Model Signals ---
  readonly data = model<any[][]>([]);
  readonly selection = model<CellRange[]>([]);
  readonly sortState = model<SortState[]>([]);
  readonly filterState = model<FilterModel[]>([]);
  readonly currentPage = model<number>(1);

  // --- Cell Events ---
  readonly cellClick = output<GridEvents['cell:click']>();
  readonly cellDoubleClick = output<GridEvents['cell:doubleClick']>();
  readonly cellContextMenu = output<GridEvents['cell:contextMenu']>();
  readonly cellChange = output<GridEvents['cell:change']>();
  readonly cellBeforeChange = output<GridEvents['cell:beforeChange']>();
  readonly cellAfterChange = output<GridEvents['cell:afterChange']>();

  // --- Selection Events ---
  readonly selectionChangeEvent = output<GridEvents['selection:change']>({ alias: 'selectionChanged' });
  readonly selectionStart = output<GridEvents['selection:start']>();
  readonly selectionEnd = output<GridEvents['selection:end']>();

  // --- Editing Events ---
  readonly editStart = output<GridEvents['edit:start']>();
  readonly editEnd = output<GridEvents['edit:end']>();
  readonly editCommit = output<GridEvents['edit:commit']>();
  readonly editCancel = output<GridEvents['edit:cancel']>();

  // --- Scroll Events ---
  readonly scroll = output<GridEvents['scroll']>();
  readonly scrollStart = output<GridEvents['scroll:start']>();
  readonly scrollEnd = output<GridEvents['scroll:end']>();

  // --- Sort Events ---
  readonly sortChange = output<GridEvents['sort:change']>();
  readonly sortBeforeSort = output<GridEvents['sort:beforeSort']>();
  readonly sortAfterSort = output<GridEvents['sort:afterSort']>();

  // --- Filter Events ---
  readonly filterChange = output<GridEvents['filter:change']>();
  readonly filterBeforeFilter = output<GridEvents['filter:beforeFilter']>();
  readonly filterAfterFilter = output<GridEvents['filter:afterFilter']>();
  readonly filterExport = output<GridEvents['filter:export']>();
  readonly filterStart = output<GridEvents['filter:start']>();
  readonly filterEnd = output<GridEvents['filter:end']>();
  readonly filterError = output<GridEvents['filter:error']>();
  readonly filterClear = output<GridEvents['filter:clear']>();

  // --- Focus Events ---
  readonly focusChange = output<GridEvents['focus:change']>();
  readonly focusIn = output<GridEvents['focus:in']>();
  readonly focusOut = output<GridEvents['focus:out']>();

  // --- Keyboard Events ---
  readonly keyDown = output<GridEvents['key:down']>();
  readonly keyUp = output<GridEvents['key:up']>();
  readonly keyPress = output<GridEvents['key:press']>();

  // --- Column Events ---
  readonly columnResizeEvent = output<GridEvents['column:resize']>({ alias: 'columnResize' });
  readonly columnMove = output<GridEvents['column:move']>();
  readonly columnHide = output<GridEvents['column:hide']>();
  readonly columnShow = output<GridEvents['column:show']>();
  readonly columnDragStart = output<GridEvents['column:dragStart']>();
  readonly columnDragEvent = output<GridEvents['column:drag']>({ alias: 'columnDrag' });
  readonly columnDragEnd = output<GridEvents['column:dragEnd']>();
  readonly columnDragCancel = output<GridEvents['column:dragCancel']>();

  // --- Header Events ---
  readonly headerClick = output<GridEvents['header:click']>();
  readonly headerDoubleClick = output<GridEvents['header:doubleClick']>();
  readonly headerContextMenu = output<GridEvents['header:contextMenu']>();
  readonly headerHover = output<GridEvents['header:hover']>();
  readonly headerSortClick = output<GridEvents['header:sort:click']>();
  readonly headerFilterClick = output<GridEvents['header:filter:click']>();
  readonly headerCheckboxChange = output<GridEvents['header:checkbox:change']>();

  // --- Lifecycle Events ---
  readonly renderStart = output<GridEvents['render:start']>();
  readonly renderEnd = output<GridEvents['render:end']>();
  readonly dataLoad = output<GridEvents['data:load']>();
  readonly dataChange = output<GridEvents['data:change']>();
  readonly loadingStart = output<GridEvents['loading:start']>();
  readonly loadingEnd = output<GridEvents['loading:end']>();
  readonly loadingProgress = output<GridEvents['loading:progress']>();
  readonly undoRedoChange = output<GridEvents['undo-redo:change']>();
  readonly gridDestroy = output<GridEvents['destroy']>();
  readonly gridError = output<GridEvents['error']>();
  readonly gridWarning = output<GridEvents['warning']>();

  // --- Row Events ---
  readonly rowInsert = output<GridEvents['row:insert']>();
  readonly rowDelete = output<GridEvents['row:delete']>();
  readonly rowMove = output<GridEvents['row:move']>();

  // --- Clipboard Events ---
  readonly copy = output<GridEvents['copy']>();
  readonly cut = output<GridEvents['cut']>();
  readonly paste = output<GridEvents['paste']>();

  private outputMap: Record<string, OutputEmitterRef<any>> = {};
  private eventHandlers: Array<{ event: string; handler: (payload: any) => void }> = [];

  constructor() {
    this.buildOutputMap();

    this.destroyRef.onDestroy(() => {
      if (this.grid) {
        for (const { event, handler } of this.eventHandlers) {
          this.grid.off(event as any, handler);
        }
        this.grid.destroy();
        this.grid = null;
      }
      this.eventHandlers = [];
      this.gridReady = false;
      this.templateBridge.destroyAll();
    });

    afterNextRender(() => {
      this.ngZone.runOutsideAngular(() => {
        this.initGrid();
      });
    });

    // Sync data input → grid (skip first run, initGrid handles initial data)
    effect(() => {
      const data = this.data();
      if (!this.gridReady || this.getResolvedDataMode() !== 'frontend') return;
      if (!Array.isArray(data)) return;

      if (this.pendingModelDataSync === data) {
        this.pendingModelDataSync = null;
        return;
      }

      this.grid!.setData(data);
    });

    // Sync columns from content children or input (skip first run)
    effect(() => {
      this.columnChildren();
      this.columns();
      if (!this.gridReady) return;

      const resolvedColumns = this.getComponentColumns();
      if (resolvedColumns !== undefined) {
        this.grid!.updateOptions({ columns: resolvedColumns });
      }
    });

    // Sync option changes with previous-value diffing (only sends changed values)
    const prevOptions: Record<string, any> = {};
    effect(() => {
      const current: Array<[string, any]> = [
        ['rowHeight', this.getResolvedRowHeight()],
        ['colWidth', this.getResolvedColWidth()],
        ['selectionType', this.selectionType()],
        ['enableSelection', this.enableSelection()],
        ['enableMultiSelection', this.enableMultiSelection()],
        ['enableKeyboardNavigation', this.enableKeyboardNavigation()],
        ['enableA11y', this.enableA11y()],
        ['enableColumnResize', this.enableColumnResize()],
        ['enableColumnDrag', this.enableColumnDrag()],
        ['dataMode', this.getConfiguredDataMode()],
        ['pagination', this.pagination()],
        ['loading', this.loading()],
        ['infiniteScrolling', this.infiniteScrolling()],
        ['rowHeightMode', this.rowHeightMode()],
        ['rowHeightConfig', this.rowHeightConfig()],
        ['columnResize', this.columnResize()],
        ['columnDrag', this.columnDrag()],
        ['cellOverflow', this.cellOverflow()],
        ['autoResize', this.autoResize()],
        ['overscanRows', this.overscanRows()],
        ['overscanCols', this.overscanCols()],
      ];

      if (!this.gridReady) {
        // Store initial values for diffing on next run
        for (const [key, val] of current) {
          prevOptions[key] = val;
        }
        return;
      }

      const changed: Partial<GridOptions> = {};
      let hasChanges = false;

      for (const [key, val] of current) {
        if (val !== undefined && val !== prevOptions[key]) {
          (changed as any)[key] = val;
          hasChanges = true;
        }
        prevOptions[key] = val;
      }

      if (hasChanges) {
        this.grid!.updateOptions(changed);
      }
    });
  }

  private markExplicitInput<T>(name: 'rowHeight' | 'colWidth' | 'columns', value: T): T {
    this.explicitInputs.add(name);
    return value;
  }

  private hasExplicitInput(name: 'rowHeight' | 'colWidth' | 'columns'): boolean {
    return this.explicitInputs.has(name);
  }

  private getResolvedDataMode(): 'frontend' | 'backend' {
    return resolveOperationMode(
      {
        mode: this.getConfiguredDataMode(),
        callback:
          this.onDataRequest() ??
          (this.globalConfig?.['onDataRequest'] as GridOptions['onDataRequest'] | undefined),
      },
      { rowCount: this.rowCount() }
    );
  }

  private getConfiguredDataMode(): OperationMode | undefined {
    return this.dataMode() ?? (this.globalConfig?.['dataMode'] as OperationMode | undefined);
  }

  private getResolvedRowHeight(): number | number[] {
    const configured = this.globalConfig?.['rowHeight'] as GridOptions['rowHeight'] | undefined;
    return this.hasExplicitInput('rowHeight') || configured === undefined ? this.rowHeight() : configured;
  }

  private getResolvedColWidth(): number | number[] {
    const configured = this.globalConfig?.['colWidth'] as GridOptions['colWidth'] | undefined;
    return this.hasExplicitInput('colWidth') || configured === undefined ? this.colWidth() : configured;
  }

  private getComponentColumns(): ColumnDef[] | undefined {
    const columnChildren = this.columnChildren();
    if (columnChildren.length > 0) {
      return columnChildren.map(c => c.toColumnDef(this.templateBridge));
    }

    const inputColumns = this.columns();
    if (this.hasExplicitInput('columns') || inputColumns.length > 0) {
      return inputColumns;
    }

    return undefined;
  }

  private buildOutputMap(): void {
    this.outputMap = {
      cellClick: this.cellClick,
      cellDoubleClick: this.cellDoubleClick,
      cellContextMenu: this.cellContextMenu,
      cellChange: this.cellChange,
      cellBeforeChange: this.cellBeforeChange,
      cellAfterChange: this.cellAfterChange,
      selectionChange: this.selectionChangeEvent,
      selectionStart: this.selectionStart,
      selectionEnd: this.selectionEnd,
      editStart: this.editStart,
      editEnd: this.editEnd,
      editCommit: this.editCommit,
      editCancel: this.editCancel,
      scroll: this.scroll,
      scrollStart: this.scrollStart,
      scrollEnd: this.scrollEnd,
      sortChange: this.sortChange,
      sortBeforeSort: this.sortBeforeSort,
      sortAfterSort: this.sortAfterSort,
      filterChange: this.filterChange,
      filterBeforeFilter: this.filterBeforeFilter,
      filterAfterFilter: this.filterAfterFilter,
      filterExport: this.filterExport,
      filterStart: this.filterStart,
      filterEnd: this.filterEnd,
      filterError: this.filterError,
      filterClear: this.filterClear,
      focusChange: this.focusChange,
      focusIn: this.focusIn,
      focusOut: this.focusOut,
      keyDown: this.keyDown,
      keyUp: this.keyUp,
      keyPress: this.keyPress,
      columnResize: this.columnResizeEvent,
      columnMove: this.columnMove,
      columnHide: this.columnHide,
      columnShow: this.columnShow,
      columnDragStart: this.columnDragStart,
      columnDrag: this.columnDragEvent,
      columnDragEnd: this.columnDragEnd,
      columnDragCancel: this.columnDragCancel,
      headerClick: this.headerClick,
      headerDoubleClick: this.headerDoubleClick,
      headerContextMenu: this.headerContextMenu,
      headerHover: this.headerHover,
      headerSortClick: this.headerSortClick,
      headerFilterClick: this.headerFilterClick,
      headerCheckboxChange: this.headerCheckboxChange,
      renderStart: this.renderStart,
      renderEnd: this.renderEnd,
      dataLoad: this.dataLoad,
      dataChange: this.dataChange,
      loadingStart: this.loadingStart,
      loadingEnd: this.loadingEnd,
      loadingProgress: this.loadingProgress,
      undoRedoChange: this.undoRedoChange,
      gridDestroy: this.gridDestroy,
      gridError: this.gridError,
      gridWarning: this.gridWarning,
      rowInsert: this.rowInsert,
      rowDelete: this.rowDelete,
      rowMove: this.rowMove,
      copy: this.copy,
      cut: this.cut,
      paste: this.paste,
    };
  }

  private initGrid(): void {
    const containerRef = this.gridContainerRef();
    if (!containerRef) return;

    const container = containerRef.nativeElement;
    const dataValue = this.data();
    const componentColumns = this.getComponentColumns();
    const resolvedDataMode = this.getResolvedDataMode();

    const options: GridOptions = {
      ...(this.globalConfig ?? {}),
      rowCount: this.rowCount(),
      colCount: this.colCount(),
      ...this.getOptionalOptions(),
      rowHeight: this.getResolvedRowHeight(),
      colWidth: this.getResolvedColWidth(),
      ...(componentColumns !== undefined ? { columns: componentColumns } : {}),
      // This wrapper drives the render lifecycle itself (setData -> usePlugin ->
      // render), so opt out of the core auto-render-on-setData default to keep
      // late-installed plugins lifecycle-wired.
      autoRender: false,
    };

    this.grid = new Zengrid(container, options);

    // Wire up events
    this.wireEvents();

    // Frontend mode owns the in-memory dataset, including an explicit empty array.
    if (resolvedDataMode === 'frontend' && Array.isArray(dataValue)) {
      this.grid.setData(dataValue);
    }

    // Install plugins
    const pluginList = this.plugins();
    for (const plugin of pluginList) {
      this.grid.usePlugin(plugin);
    }

    this.grid.render();
    this.gridReady = true;
  }

  private getOptionalOptions(): Partial<GridOptions> {
    const opts: Partial<GridOptions> = {};

    const enSel = this.enableSelection();
    const enMulti = this.enableMultiSelection();
    const selType = this.selectionType();
    const enKb = this.enableKeyboardNavigation();
    const enA11y = this.enableA11y();
    const enPool = this.enableCellPooling();
    const hideLastColBorder = this.hideLastColumnBorder();
    const enResize = this.enableColumnResize();
    const enDrag = this.enableColumnDrag();
    const dMode = this.getConfiguredDataMode();
    const dReq = this.onDataRequest();
    const loadMore = this.onLoadMoreRows();
    const pag = this.pagination();
    const load = this.loading();
    const infScroll = this.infiniteScrolling();
    const rhMode = this.rowHeightMode();
    const rhConfig = this.rowHeightConfig();
    const hdrHeight = this.headerHeight();
    const colResizeConf = this.columnResize();
    const colDragConf = this.columnDrag();
    const overflow = this.cellOverflow();
    const editingConf = this.editing();
    const autoRes = this.autoResize();
    const oRows = this.overscanRows();
    const oCols = this.overscanCols();
    const sIcons = this.sortIcons();
    const rCache = this.rendererCache();
    const onScrollCb = this.onScrollCallback();
    const onCellClickCb = this.onCellClickCallback();
    const onCellDblClickCb = this.onCellDoubleClickCallback();
    const onCellCtxCb = this.onCellContextMenuCallback();
    const onSelChangeCb = this.onSelectionChangeCallback();
    const onPageChangeCb = this.onPageChangeCallback();
    const onColWidthsCb = this.onColumnWidthsChangeCallback();

    if (enSel !== undefined) opts.enableSelection = enSel;
    if (enMulti !== undefined) opts.enableMultiSelection = enMulti;
    if (selType !== undefined) opts.selectionType = selType;
    if (enKb !== undefined) opts.enableKeyboardNavigation = enKb;
    if (enA11y !== undefined) opts.enableA11y = enA11y;
    if (enPool !== undefined) opts.enableCellPooling = enPool;
    if (hideLastColBorder !== undefined) opts.hideLastColumnBorder = hideLastColBorder;
    if (enResize !== undefined) opts.enableColumnResize = enResize;
    if (enDrag !== undefined) opts.enableColumnDrag = enDrag;
    if (dMode !== undefined) opts.dataMode = dMode;
    if (dReq !== undefined) opts.onDataRequest = dReq;
    if (loadMore !== undefined) opts.onLoadMoreRows = loadMore;
    if (pag !== undefined) opts.pagination = pag;
    if (load !== undefined) opts.loading = load;
    if (infScroll !== undefined) opts.infiniteScrolling = infScroll;
    if (rhMode !== undefined) opts.rowHeightMode = rhMode;
    if (rhConfig !== undefined) opts.rowHeightConfig = rhConfig;
    if (hdrHeight !== undefined) opts.headerHeight = hdrHeight;
    if (colResizeConf !== undefined) opts.columnResize = colResizeConf;
    if (colDragConf !== undefined) opts.columnDrag = colDragConf;
    if (overflow !== undefined) opts.cellOverflow = overflow;
    if (editingConf !== undefined) opts.editing = editingConf;
    if (autoRes !== undefined) opts.autoResize = autoRes;
    if (oRows !== undefined) opts.overscanRows = oRows;
    if (oCols !== undefined) opts.overscanCols = oCols;
    if (sIcons !== undefined) opts.sortIcons = sIcons;
    if (rCache !== undefined) opts.rendererCache = rCache;
    if (onScrollCb !== undefined) opts.onScroll = onScrollCb;
    if (onCellClickCb !== undefined) opts.onCellClick = onCellClickCb;
    if (onCellDblClickCb !== undefined) opts.onCellDoubleClick = onCellDblClickCb;
    if (onCellCtxCb !== undefined) opts.onCellContextMenu = onCellCtxCb;
    if (onSelChangeCb !== undefined) opts.onSelectionChange = onSelChangeCb;
    if (onPageChangeCb !== undefined) opts.onPageChange = onPageChangeCb;
    if (onColWidthsCb !== undefined) opts.onColumnWidthsChange = onColWidthsCb;

    return opts;
  }

  private wireEvents(): void {
    if (!this.grid) return;

    for (const [gridEvent, outputName] of Object.entries(EVENT_MAP)) {
      const outputRef = this.outputMap[outputName];
      if (!outputRef) continue;

      const handler = (payload: any) => {
        this.ngZone.run(() => {
          outputRef.emit(payload);

          // Update two-way model signals for specific events
          if (gridEvent === 'selection:change' && payload?.ranges) {
            this.selection.set(payload.ranges);
          } else if (gridEvent === 'sort:change' && payload?.sortState) {
            this.sortState.set(payload.sortState);
          } else if (gridEvent === 'filter:change' && payload?.filterState) {
            this.filterState.set(payload.filterState);
          } else if (gridEvent === 'data:change') {
            // data:change doesn't carry full data, skip model update
          }

          this.cdr.markForCheck();
        });
      };

      this.grid.on(gridEvent as any, handler);
      this.eventHandlers.push({ event: gridEvent, handler });
    }
  }

  // --- Public API Methods ---

  get gridInstance(): Zengrid | null {
    return this.grid;
  }

  render(): void {
    this.grid?.render();
  }

  refresh(): void {
    this.grid?.refresh();
  }

  clearCache(): void {
    this.grid?.clearCache();
  }

  updateCells(cells: CellRef[]): void {
    this.grid?.updateCells(cells);
  }

  setData(data: any[][]): void {
    if (this.getResolvedDataMode() === 'frontend') {
      if (this.grid) {
        this.pendingModelDataSync = data;
        this.grid.setData(data);
      }
    }

    this.data.set(data);
  }

  getData(row: number, col: number): any {
    return this.grid?.getData(row, col);
  }

  // --- Sort API ---
  sortColumn(column: number, direction: 'asc' | 'desc' | null = 'asc'): void {
    if (direction === null) this.grid?.sort.clear();
    else this.grid?.sort.apply([{ column, direction }]);
  }

  toggleSort(column: number): void {
    this.grid?.sort.toggle(column);
  }

  getSortState(): SortState[] {
    return this.grid?.sort.getState() ?? [];
  }

  clearSort(): void {
    this.grid?.sort.clear();
  }

  setSortState(sortState: SortState[]): void {
    this.grid?.sort.setState(sortState);
  }

  // --- Filter API ---
  setFilter(column: number, operator: string, value: any): void {
    this.grid?.filter.set(column, operator, value);
  }

  setColumnFilter(
    column: number,
    conditions: Array<{ operator: string; value: any }>,
    logic: 'AND' | 'OR' = 'AND'
  ): void {
    this.grid?.filter.setColumn(column, conditions, logic);
  }

  getFilterState(): FilterModel[] {
    return this.grid?.filter.getState() ?? [];
  }

  setFilterState(models: FilterModel[]): void {
    this.grid?.filter.setState(models);
  }

  clearFilters(): void {
    this.grid?.filter.clear();
  }

  clearColumnFilter(column: number): void {
    this.grid?.filter.clearColumn(column);
  }

  setQuickFilter(query: string, columns?: number[]): void {
    this.grid?.filter.setQuick(query, columns);
  }

  clearQuickFilter(): void {
    this.grid?.filter.clearQuick();
  }

  // --- Export API ---
  exportCSV(options: GridExportOptions = {}): string {
    return this.grid?.export.csv(options) ?? '';
  }

  exportTSV(options: GridExportOptions = {}): string {
    return this.grid?.export.tsv(options) ?? '';
  }

  // --- Pagination API ---
  goToPage(page: number): void {
    this.grid?.pagination.goTo(page);
    this.currentPage.set(page);
  }

  nextPage(): void {
    this.grid?.pagination.next();
    this.currentPage.set(this.grid?.pagination.getCurrentPage() ?? 1);
  }

  previousPage(): void {
    this.grid?.pagination.previous();
    this.currentPage.set(this.grid?.pagination.getCurrentPage() ?? 1);
  }

  setPageSize(pageSize: number): void {
    this.grid?.pagination.setPageSize(pageSize);
  }

  getCurrentPage(): number {
    return this.grid?.pagination.getCurrentPage() ?? 1;
  }

  getPageSize(): number {
    return this.grid?.pagination.getPageSize() ?? 0;
  }

  getTotalPages(): number {
    return this.grid?.pagination.getTotalPages() ?? 0;
  }

  // --- Column API ---
  resizeColumn(col: number, width: number): void {
    this.grid?.resizeColumn(col, width);
  }

  autoFitColumn(col: number): void {
    this.grid?.autoFitColumn(col);
  }

  autoFitAllColumns(): void {
    this.grid?.autoFitAllColumns();
  }

  setColumnConstraints(col: number, constraints: ColumnConstraints): void {
    this.grid?.setColumnConstraints(col, constraints);
  }

  // --- State Persistence API ---
  getStateSnapshot(): GridStateSnapshot | null {
    return this.grid?.getStateSnapshot() ?? null;
  }

  applyStateSnapshot(snapshot: GridStateSnapshot): void {
    this.grid?.applyStateSnapshot(snapshot);
  }

  // --- Scroll API ---
  scrollToCell(row: number, col: number): void {
    this.grid?.scrollToCell(row, col);
  }

  getScrollPosition(): { top: number; left: number } {
    return this.grid?.getScrollPosition() ?? { top: 0, left: 0 };
  }

  getVisibleRange(): VisibleRange | null {
    return this.grid?.getVisibleRange() ?? null;
  }

  getScrollElement(): HTMLElement | null {
    return this.grid?.getScrollElement() ?? null;
  }

  // --- Header API ---
  registerHeaderRenderer(name: string, renderer: HeaderRenderer): void {
    this.grid?.registerHeaderRenderer(name, renderer);
  }

  updateHeader(columnIndex: number): void {
    this.grid?.updateHeader(columnIndex);
  }

  updateAllHeaders(): void {
    this.grid?.updateAllHeaders();
  }

  // --- Plugin API ---
  usePlugin(plugin: GridPlugin): void {
    this.grid?.usePlugin(plugin);
  }

  // --- Stats ---
  getStats(): any {
    return this.grid?.getStats();
  }

  getDimensions(): { width: number; height: number } {
    return this.grid?.getDimensions() ?? { width: 0, height: 0 };
  }

  getColumnPosition(col: number): { x: number; width: number } {
    return this.grid?.getColumnPosition(col) ?? { x: 0, width: 0 };
  }

  // --- Data Mode ---
  getDataMode(): 'frontend' | 'backend' {
    return this.grid?.getDataMode() ?? 'frontend';
  }

  // --- Sort (missing methods) ---
  getColumnSort(column: number): any {
    return this.grid?.getColumnSort(column);
  }

  getSortIcons(): { asc: string; desc: string } {
    return this.grid?.getSortIcons() ?? { asc: '▲', desc: '▼' };
  }

  getSortMode(): 'frontend' | 'backend' {
    return this.grid?.getSortMode() ?? 'frontend';
  }

  // --- Filter (missing methods) ---
  getFieldFilterState(): any {
    return this.grid?.getFieldFilterState();
  }

  getFilterExports(): any {
    return this.grid?.getFilterExports();
  }

  getFilterMode(): 'frontend' | 'backend' {
    return this.grid?.getFilterMode() ?? 'frontend';
  }

  getQuickFilter(): { query: string; columns: number[] | null } {
    return this.grid?.getQuickFilter() ?? { query: '', columns: null };
  }

  // --- Pagination (missing methods) ---
  firstPage(): void {
    this.grid?.firstPage();
    this.currentPage.set(this.grid?.getCurrentPage() ?? 1);
  }

  lastPage(): void {
    this.grid?.lastPage();
    this.currentPage.set(this.grid?.getCurrentPage() ?? 1);
  }

  // --- Scroll (missing methods) ---
  scrollThroughCells(
    cells: Array<{ row: number; col: number }>,
    options?: {
      delayMs?: number;
      smooth?: boolean;
      onCellReached?: (cell: { row: number; col: number }, index: number) => void;
    }
  ): { promise: Promise<void>; abort: () => void } {
    return this.grid?.scrollThroughCells(cells, options) ?? {
      promise: Promise.resolve(),
      abort: () => {},
    };
  }

  // --- Column Resize/Drag (missing methods) ---
  attachColumnResize(headerElement: HTMLElement): void {
    this.grid?.attachColumnResize(headerElement);
  }

  detachColumnResize(): void {
    this.grid?.detachColumnResize();
  }

  updateColumnResizeHandles(): void {
    this.grid?.updateColumnResizeHandles();
  }

  attachColumnDrag(headerElement: HTMLElement): void {
    this.grid?.attachColumnDrag(headerElement);
  }

  detachColumnDrag(): void {
    this.grid?.detachColumnDrag();
  }

  isDragging(): boolean {
    return this.grid?.isDragging() ?? false;
  }

  // --- Renderer Registration ---
  registerRenderer(name: string, renderer: any): void {
    this.grid?.registerRenderer(name, renderer);
  }

  // --- Options Update ---
  updateOptions(options: Partial<GridOptions>): void {
    this.grid?.updateOptions(options);
  }

  // --- Header (missing methods) ---
  refreshHeaders(): void {
    this.grid?.refreshHeaders();
  }

  // --- Infinite Scroll ---
  resetInfiniteScrolling(): void {
    this.grid?.resetInfiniteScrolling();
  }

  getSlidingWindowStats(): any {
    return this.grid?.getSlidingWindowStats();
  }

  // --- Plugin System (advanced) ---
  getStore(): any {
    return this.grid?.getStore();
  }

  getPluginHost(): PluginHost | null {
    return this.grid?.getPluginHost() ?? null;
  }

  getGridApi(): GridApiImpl | null {
    return this.grid?.getGridApi() ?? null;
  }

}
