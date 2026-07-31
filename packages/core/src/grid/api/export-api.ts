import type { GridExportOptions } from '../../types';
import type { SlimGridContext } from '../grid-context';
import type { DataAccessor } from '../../data/data-accessor';
import type { ExportSource } from '../../features/export';
import { buildExportSource, exportDelimited } from '../grid-export';

export interface ExportApi {
  csv(options?: GridExportOptions): string;
  tsv(options?: GridExportOptions): string;
  /**
   * A reusable value-accessor view of the grid's data, for building exports in
   * other formats (e.g. `@zengrid/enterprise`'s Excel/PDF exporters).
   */
  source(): ExportSource;
}

export function createExportApi(ctx: SlimGridContext, getDataAccessor: () => DataAccessor | null): ExportApi {
  function getExportDeps() {
    const viewIndices = ctx.store.get('rows.viewIndices') as number[] | undefined;
    const getModel = ctx.gridApi.getMethod('column', 'getModel');
    return {
      dataAccessor: getDataAccessor(),
      options: ctx.options,
      viewIndices: viewIndices ?? null,
      columnModel: getModel ? getModel() : null,
      selection: ctx.state.selection,
    };
  }

  return {
    csv(options: GridExportOptions = {}): string {
      return exportDelimited(',', options, getExportDeps());
    },

    tsv(options: GridExportOptions = {}): string {
      return exportDelimited('\t', options, getExportDeps());
    },

    source(): ExportSource {
      return buildExportSource(getExportDeps());
    },
  };
}
