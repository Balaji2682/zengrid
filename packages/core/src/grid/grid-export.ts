import type { GridExportOptions, CellRange, ColumnDef } from '../types';
import { CSVExporter } from '../features/export';
import type { ExportSource } from '../features/export';
import type { DataAccessor } from '../data/data-accessor';
import type { ColumnModel } from '../features/columns/column-model';

export interface GridExportDeps {
  dataAccessor: DataAccessor | null;
  options: { rowCount: number; colCount: number; columns?: ColumnDef[] };
  viewIndices: number[] | null;
  columnModel: ColumnModel | null;
  selection: CellRange[];
}

/**
 * Build a reusable {@link ExportSource} from the grid's data. Shared by the built-in
 * delimited exporters and exposed via `grid.export.source()` for other formats.
 */
export function buildExportSource(deps: GridExportDeps): ExportSource {
  return {
    getValue: (row: number, col: number) => deps.dataAccessor?.getValue(row, col),
    rowCount: deps.options.rowCount,
    colCount: deps.options.colCount,
    getColumnHeader: (col: number) => getColumnHeader(col, deps.options.columns),
  };
}

export function exportDelimited(
  delimiter: string,
  exportOptions: GridExportOptions,
  deps: GridExportDeps
): string {
  if (!deps.dataAccessor) return '';

  const rows = resolveExportRows(exportOptions.rows, deps);
  const { columns, headers } = resolveExportColumns(exportOptions.columns, deps);

  const exporter = new CSVExporter(buildExportSource(deps));

  return exporter.export({
    rows,
    columns,
    headers,
    includeHeaders: exportOptions.includeHeaders ?? true,
    delimiter,
  });
}

function resolveExportRows(rows: GridExportOptions['rows'], deps: GridExportDeps): number[] {
  if (Array.isArray(rows)) {
    return rows;
  }

  if (rows === 'filtered') {
    return deps.viewIndices ?? range(0, deps.options.rowCount - 1);
  }

  if (rows === 'selected') {
    const selected = new Set<number>();
    const rowMap = deps.viewIndices;
    for (const r of deps.selection) {
      for (let row = r.startRow; row <= r.endRow; row++) {
        const mappedRow = rowMap ? rowMap[row] : row;
        if (mappedRow !== undefined) {
          selected.add(mappedRow);
        }
      }
    }
    return Array.from(selected).sort((a, b) => a - b);
  }

  return range(0, deps.options.rowCount - 1);
}

function resolveExportColumns(
  columns: GridExportOptions['columns'],
  deps: GridExportDeps
): { columns: number[]; headers?: string[] } {
  if (Array.isArray(columns)) {
    return { columns };
  }

  if (columns === 'visible' && deps.columnModel) {
    const visible = deps.columnModel.getVisibleColumnsInOrder();
    return {
      columns: visible.map((col) => col.dataIndex),
      headers: visible.map((col) => getColumnHeader(col.dataIndex, deps.options.columns)),
    };
  }

  return {
    columns: range(0, deps.options.colCount - 1),
  };
}

export function getColumnHeader(col: number, columns?: ColumnDef[]): string {
  const column = columns?.[col];
  if (!column) return `Column ${col}`;

  if (typeof column.header === 'string') {
    return column.header;
  }

  return column.header?.text ?? column.field ?? `Column ${col}`;
}

export function range(start: number, end: number): number[] {
  if (end < start) return [];
  const out: number[] = [];
  for (let i = start; i <= end; i++) {
    out.push(i);
  }
  return out;
}
