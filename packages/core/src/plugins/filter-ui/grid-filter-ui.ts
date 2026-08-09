import type { ColumnDef } from '../../types';
import type { GridEvents } from '../../events/grid-events';
import { OverlayManager } from '../../overlay/overlay-manager';
import { FilterChipBar } from './filter-chip-bar';
import type {
  FilterPopupCustomization,
  FilterPopupHandle,
  FilterUIOptions,
} from './filter-ui-types';
import { createFieldState } from './field-state-utils';
import { openFilterPopup } from './filter-popup';

export class GridFilterUI {
  private columns: ColumnDef[];
  private readonly overlayManager = OverlayManager.getInstance();
  private readonly chipBar: FilterChipBar;
  private popup: FilterPopupHandle | null = null;
  private customization?: FilterPopupCustomization;
  private filterClickUnsub: (() => void) | null = null;
  private filterChangeUnsub: (() => void) | null = null;

  constructor(private readonly options: FilterUIOptions) {
    this.columns = options.columns ?? [];
    this.customization = options.customization;
    this.chipBar = new FilterChipBar(
      options.container,
      options.getFilterExpression,
      {
        getColumnLabelByField: (field) => this.getColumnLabelByField(field),
        getColumnLabelByIndex: (index) => this.getColumnLabelByIndex(index),
      },
      {
        clearQuickFilter: options.clearQuickFilter,
        clearAllFilters: options.clearAllFilters,
        applyStructuredRoot: (root) => options.setFieldState(createFieldState(root)),
      }
    );

    this.filterClickUnsub = options.events.on('header:filter:click', (payload) => {
      this.openFilterPopup(payload);
    });
    this.filterChangeUnsub = options.events.on('filter:change', () => {
      this.chipBar.render();
    });

    this.chipBar.render();
  }

  setColumns(columns: ColumnDef[]): void {
    this.columns = [...columns];
    this.closePopup();
    this.chipBar.render();
  }

  setCustomization(customization: FilterPopupCustomization | undefined): void {
    this.customization = customization;
    this.closePopup();
  }

  destroy(): void {
    this.closePopup();
    this.filterClickUnsub?.();
    this.filterChangeUnsub?.();
    this.filterClickUnsub = null;
    this.filterChangeUnsub = null;
    this.chipBar.destroy();
  }

  private openFilterPopup(payload: GridEvents['header:filter:click']): void {
    const dataCol = this.options.mapVisualToDataCol(payload.columnIndex);
    const columnDef = this.options.getColumnDef(dataCol);
    if (!columnDef) return;

    this.closePopup();
    this.popup = openFilterPopup({
      container: this.options.container,
      overlayManager: this.overlayManager,
      payload,
      dataCol,
      columnDef,
      existing: this.options.getFilterState().find((filter) => filter.column === dataCol),
      customization: this.customization,
      setColumnFilter: this.options.setColumnFilter,
      clearColumnFilter: this.options.clearColumnFilter,
      getColumnLabel: (column, index) => this.getColumnLabel(column, index),
    });
  }

  private closePopup(): void {
    this.popup?.close();
    this.popup = null;
  }

  private getColumnLabel(column: ColumnDef, index: number): string {
    if (typeof column.header === 'string') return column.header;
    return column.header?.text ?? column.field ?? `Column ${index}`;
  }

  private getColumnLabelByField(field: string): string {
    const index = this.columns.findIndex((column) => column.field === field);
    if (index < 0) return field;
    return this.getColumnLabel(this.columns[index], index);
  }

  private getColumnLabelByIndex(index: number): string {
    const column = this.columns[index] ?? this.options.getColumnDef(index);
    return column ? this.getColumnLabel(column, index) : `Column ${index}`;
  }
}
