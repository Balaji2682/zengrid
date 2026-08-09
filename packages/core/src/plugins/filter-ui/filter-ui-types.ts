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

/**
 * The addressable pieces of the per-column filter popup. Enterprise theming
 * targets each part by name to add classes/styles or replace its DOM.
 */
export type FilterPopupPart =
  | 'popup'
  | 'header'
  | 'title'
  | 'close'
  | 'match'
  | 'conditions'
  | 'conditionRow'
  | 'operatorSelect'
  | 'valueInput'
  | 'valueInputTo'
  | 'addBtn'
  | 'actions'
  | 'applyBtn'
  | 'clearBtn';

/** Context handed to a {@link FilterPopupCustomization.render} slot override. */
export interface FilterPartContext {
  part: FilterPopupPart;
  columnDef: ColumnDef;
  dataCol: number;
  /** The element the popup built by default — decorate or discard it. */
  defaultElement: HTMLElement;
}

/**
 * Fine-grained customization surface for the filter popup. Core applies it when
 * building the popup; enterprise `filterTheme()` is the ergonomic way to supply
 * it. All fields optional — an absent surface leaves the default popup untouched.
 */
export interface FilterPopupCustomization {
  /** CSS custom properties set on the popup root (e.g. `--zg-filter-radius`). */
  tokens?: Record<string, string>;
  /** Per-part class/inline-style additions, composed over the defaults. */
  parts?: Partial<
    Record<FilterPopupPart, { class?: string | string[]; style?: Record<string, string> }>
  >;
  /**
   * Per-part DOM replacement. Returning an element swaps the default; returning
   * nothing keeps it. Replacing a control part (`operatorSelect`/`valueInput*`)
   * requires the returned element to expose a `.value` — it becomes the control.
   */
  render?: Partial<Record<FilterPopupPart, (ctx: FilterPartContext) => HTMLElement | void>>;
}

export interface FilterUIOptions {
  container: HTMLElement;
  events: EventEmitter<GridEvents>;
  columns?: ColumnDef[];
  customization?: FilterPopupCustomization;
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
  customization?: FilterPopupCustomization;
  setColumnFilter: FilterUIOptions['setColumnFilter'];
  clearColumnFilter: FilterUIOptions['clearColumnFilter'];
  getColumnLabel(column: ColumnDef, index: number): string;
}
