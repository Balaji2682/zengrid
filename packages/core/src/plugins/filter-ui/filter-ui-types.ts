import type {
  ColumnDef,
  FilterExpression,
  FilterModel,
  FilterOperator,
} from '../../types';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import type { FieldFilterGroup, FieldFilterState } from '../../features/filtering/types';
import type { OverlayManager } from '../../overlay/overlay-manager';

export interface FilterUIOptions {
  container: HTMLElement;
  events: EventEmitter<GridEvents>;
  columns?: ColumnDef[];
  getFilterState: () => FilterModel[];
  getFilterExpression: () => FilterExpression | null;
  setColumnFilter: (
    column: number,
    conditions: Array<{ operator: string; value: any }>,
    logic?: 'AND' | 'OR'
  ) => void;
  setFieldState: (state: FieldFilterState) => void;
  clearColumnFilter: (column: number) => void;
  clearQuickFilter: () => void;
  clearAllFilters: () => void;
  getColumnDef: (dataCol: number) => ColumnDef | undefined;
  mapVisualToDataCol: (visualCol: number) => number;
}

export interface OperatorOption {
  value: FilterOperator;
  label: string;
  valueCount: 0 | 1 | 2;
}

export interface ChipDescriptor {
  label: string;
  remove: () => void;
}

export interface ColumnLabelResolver {
  getColumnLabelByField(field: string): string;
  getColumnLabelByIndex(index: number): string;
}

export interface FilterChipActions {
  clearQuickFilter(): void;
  clearAllFilters(): void;
  applyStructuredRoot(root: FieldFilterGroup | null): void;
}

export interface FilterPopupHandle {
  close(): void;
  destroy(): void;
}

export interface FilterPopupOptions {
  container: HTMLElement;
  overlayManager: OverlayManager;
  payload: GridEvents['header:filter:click'];
  dataCol: number;
  columnDef: ColumnDef;
  existing?: FilterModel;
  setColumnFilter: FilterUIOptions['setColumnFilter'];
  clearColumnFilter: FilterUIOptions['clearColumnFilter'];
  getColumnLabel(column: ColumnDef, index: number): string;
}
