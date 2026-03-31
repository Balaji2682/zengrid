import type { ColumnDef } from '../../../types';
import { FilterExportManager, type FilterExportManagerOptions } from '../filter-export-manager';
import { buildFilterAstFromFieldState, projectFilterAstToFieldState } from '../filter-ast';
import type { FieldFilterState } from '../types';
import type { FilterExportResult } from '../adapters/types';
import type { FilterCore } from './filter-core';

/**
 * FilterExporter - Export transformation module
 *
 * Handles field-based conversion and multi-format export (REST, GraphQL, SQL).
 */
export class FilterExporter {
  private exportManager: FilterExportManager | null = null;
  private enableExport: boolean;
  private core: FilterCore;
  private columns: ColumnDef[];

  constructor(
    core: FilterCore,
    enableExport: boolean,
    columns?: ColumnDef[],
    exportConfig?: Partial<FilterExportManagerOptions>
  ) {
    this.core = core;
    this.enableExport = enableExport;
    this.columns = columns ? [...columns] : [];

    if (this.enableExport && columns && columns.length > 0) {
      this.exportManager = new FilterExportManager({
        columns,
        ...exportConfig,
      });
    }
  }

  /**
   * Get current filter state in field-based format.
   */
  getFieldFilterState(): FieldFilterState | null {
    if (!this.exportManager) {
      console.warn(
        'FilterManager: Export manager not initialized. Provide columns in constructor.'
      );
      return null;
    }

    const result = projectFilterAstToFieldState(this.core.getFilterAst());
    for (const warning of result.warnings) {
      console.warn(`FilterManager: ${warning}`);
    }

    return result.state;
  }

  /**
   * Get filter export in all formats (REST, GraphQL, SQL)
   */
  getFilterExport(): FilterExportResult | null {
    if (!this.exportManager) {
      console.warn(
        'FilterManager: Export manager not initialized. Provide columns in constructor.'
      );
      return null;
    }

    const fieldState = this.getFieldFilterState();
    if (!fieldState) return null;

    return this.exportManager.export(fieldState);
  }

  /**
   * Get filter export in specific format
   */
  getFilterExportAs<T>(format: string): T | null {
    if (!this.exportManager) {
      console.warn(
        'FilterManager: Export manager not initialized. Provide columns in constructor.'
      );
      return null;
    }

    const fieldState = this.getFieldFilterState();
    if (!fieldState) return null;

    return this.exportManager.exportAs<T>(fieldState, format);
  }

  /**
   * Set filter from field-based format.
   */
  setFieldFilter(state: FieldFilterState): void {
    if (!this.exportManager) {
      console.warn(
        'FilterManager: Export manager not initialized. Provide columns in constructor.'
      );
      return;
    }

    const ast = buildFilterAstFromFieldState(state, { columns: this.columns });
    this.core.setFilterAst(ast);
  }

  /**
   * Update columns (for export manager)
   */
  setColumns(columns: ColumnDef[]): void {
    this.columns = [...columns];

    if (this.exportManager) {
      this.exportManager.setColumns(columns);
    } else if (this.enableExport) {
      this.exportManager = new FilterExportManager({
        columns,
      });
    }
  }
}
