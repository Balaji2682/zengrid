import type { SlimGridContext } from '../grid-context';
import type { DataAccessor } from '../../data/data-accessor';

/**
 * Read rows back out of the grid.
 *
 * Two coordinate spaces are exposed. **Source** access (`getSourceValue`,
 * `getSourceRow`) is keyed by the row's original position in the data you
 * loaded and is unaffected by sort, filter, or paging — use it when you hold an
 * index into your own dataset. **Displayed** access (`getDisplayedValue`,
 * `getDisplayedRow`, `getDisplayedRowData`) is keyed by the row's on-screen
 * position and reflects the current sort and filter, with values returned in
 * the visible column order — use it when you want what the user actually sees.
 * `toSourceIndex` / `toDisplayedIndex` convert between the two.
 */
export interface RowsApi {
  /** Rows currently loaded, ignoring sort and filter. */
  getSourceRowCount(): number;
  /** Rows visible after the active sort and filter are applied. */
  getDisplayedRowCount(): number;

  /** Value at a source row/column — stable across sort, filter, and paging. */
  getSourceValue(row: number, col: number): unknown;
  /** A whole source row as an array of values in source column order. */
  getSourceRow(row: number): unknown[];

  /** Value at an on-screen row and visible column — reflects sort, filter, and column order. */
  getDisplayedValue(displayRow: number, visibleCol: number): unknown;
  /** A whole on-screen row as an array of values in visible column order. */
  getDisplayedRow(displayRow: number): unknown[];
  /** An on-screen row as an object keyed by each visible column's `field`. */
  getDisplayedRowData(displayRow: number): Record<string, unknown>;

  /** Map an on-screen (displayed) index to its source row index. */
  toSourceIndex(displayRow: number): number;
  /** Map a source row index to its on-screen index, or `-1` if filtered out. */
  toDisplayedIndex(sourceRow: number): number;

  /** Walk every displayed row in view order. */
  forEachDisplayedRow(
    fn: (values: unknown[], displayRow: number, sourceRow: number) => void
  ): void;
}

interface VisibleColumn {
  dataIndex: number;
  field?: string;
}

export function createRowsApi(
  ctx: SlimGridContext,
  getDataAccessor: () => DataAccessor | null
): RowsApi {
  function getViewIndices(): number[] | null {
    return (ctx.store.get('rows.viewIndices') as number[] | undefined) ?? null;
  }

  function getVisibleColumns(): VisibleColumn[] {
    const getModel = ctx.gridApi.getMethod('column', 'getModel');
    const model = getModel ? getModel() : null;
    if (model) {
      return model
        .getVisibleColumnsInOrder()
        .map((c: { dataIndex: number; field?: string }) => ({ dataIndex: c.dataIndex, field: c.field }));
    }
    // No column model yet — fall back to the raw option order.
    return (ctx.options.columns ?? []).map((def, i) => ({ dataIndex: i, field: def.field }));
  }

  function toSourceIndex(displayRow: number): number {
    const view = getViewIndices();
    return view ? view[displayRow] : displayRow;
  }

  return {
    getSourceRowCount(): number {
      return getDataAccessor()?.rowCount ?? ctx.options.rowCount ?? 0;
    },

    getDisplayedRowCount(): number {
      const view = getViewIndices();
      return view ? view.length : this.getSourceRowCount();
    },

    getSourceValue(row: number, col: number): unknown {
      return getDataAccessor()?.getValue(row, col);
    },

    getSourceRow(row: number): unknown[] {
      const accessor = getDataAccessor();
      if (!accessor) return [];
      const out: unknown[] = [];
      for (const [col, value] of accessor.getRow(row)) {
        if (typeof col === 'number') out[col] = value;
      }
      return out;
    },

    getDisplayedValue(displayRow: number, visibleCol: number): unknown {
      const column = getVisibleColumns()[visibleCol];
      if (!column) return undefined;
      return getDataAccessor()?.getValue(toSourceIndex(displayRow), column.dataIndex);
    },

    getDisplayedRow(displayRow: number): unknown[] {
      const accessor = getDataAccessor();
      if (!accessor) return [];
      const source = toSourceIndex(displayRow);
      return getVisibleColumns().map((c) => accessor.getValue(source, c.dataIndex));
    },

    getDisplayedRowData(displayRow: number): Record<string, unknown> {
      const accessor = getDataAccessor();
      const out: Record<string, unknown> = {};
      if (!accessor) return out;
      const source = toSourceIndex(displayRow);
      getVisibleColumns().forEach((c) => {
        const key = c.field ?? String(c.dataIndex);
        out[key] = accessor.getValue(source, c.dataIndex);
      });
      return out;
    },

    toSourceIndex,

    toDisplayedIndex(sourceRow: number): number {
      const view = getViewIndices();
      return view ? view.indexOf(sourceRow) : sourceRow;
    },

    forEachDisplayedRow(
      fn: (values: unknown[], displayRow: number, sourceRow: number) => void
    ): void {
      const count = this.getDisplayedRowCount();
      for (let i = 0; i < count; i++) {
        fn(this.getDisplayedRow(i), i, toSourceIndex(i));
      }
    },
  };
}
