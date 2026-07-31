/**
 * Export source
 *
 * A value-accessor view of grid data, shared by every exporter (CSV in core,
 * Excel/PDF in `@zengrid/enterprise`). Obtain one from `grid.export.source()`.
 */
export interface ExportSource {
  getValue: (row: number, col: number) => any;
  rowCount: number;
  colCount: number;
  getColumnHeader?: (col: number) => string;
}
