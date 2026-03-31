import type { ColumnType } from '@zengrid/shared';
import type {
  ColumnDef,
  FilterAst,
  FilterExpression,
  FilterModel,
  FilterQuery,
} from '../../../types';
import type { FilterExportResult } from '../adapters/types';
import type { ColumnFilter } from '../column-filter';
import type { FieldFilterState } from '../types';
import { FilterCore } from './filter-core';
import { FilterExporter } from './filter-export';
import { FilterOptimizer } from './filter-optimizer';
import { FilterQueryHandler } from './filter-query';
import type { FilterManagerOptions } from './types';

/**
 * FilterManager - Manages filtering across all columns.
 */
export class FilterManager {
  private core: FilterCore;
  private query: FilterQueryHandler;
  private exporter: FilterExporter;
  private optimizer: FilterOptimizer;

  constructor(options: FilterManagerOptions) {
    this.core = new FilterCore(
      options.colCount,
      options.getValue,
      options.columns,
      options.events,
      () => this.optimizer?.invalidateCache()
    );

    this.exporter = new FilterExporter(
      this.core,
      options.enableExport ?? true,
      options.columns,
      options.exportConfig
    );

    this.query = new FilterQueryHandler(
      this.core,
      options.columnNames || [],
      options.columns,
      options.events,
      () => this.exporter.getFieldFilterState(),
      () => this.exporter.getFilterExport()
    );

    this.optimizer = new FilterOptimizer(
      this.core,
      options.getValue,
      options.enableOptimizations ?? true,
      {
        enableCache: options.enableCache,
        cacheCapacity: options.cacheCapacity,
        enableVectorization: options.enableVectorization,
        maxIndexMemoryMB: options.maxIndexMemoryMB,
        enableRangeOptimization: options.enableRangeOptimization,
        dataVersion: options.dataVersion,
      }
    );

    if (options.initialFilters) {
      this.core.initializeFilters(options.initialFilters);
    }
  }

  // ==================== Core Filter Methods ====================

  setColumnFilter(column: number, conditions: any[], logic: 'AND' | 'OR' = 'AND'): void {
    this.core.setColumnFilter(column, conditions, logic);
  }

  clearColumnFilter(column: number): void {
    this.core.clearColumnFilter(column);
  }

  clearAll(): void {
    this.core.clearAll();
  }

  testRow(row: number): boolean {
    return this.core.testRow(row);
  }

  getVisibleRows(rowCount: number): number[] {
    return this.optimizer.getVisibleRows(rowCount);
  }

  getStats(rowCount: number): {
    totalRows: number;
    visibleRows: number;
    hiddenRows: number;
    activeFilters: number;
  } {
    const visibleRows = this.getVisibleRows(rowCount);

    const activeColumnFilters = this.core.getColumnFilters().size;

    return {
      totalRows: rowCount,
      visibleRows: visibleRows.length,
      hiddenRows: rowCount - visibleRows.length,
      activeFilters:
        activeColumnFilters > 0 ? activeColumnFilters : this.core.hasStructuredFilters() ? 1 : 0,
    };
  }

  getFilterState(): FilterModel[] {
    return this.core.getFilterState();
  }

  setFilterState(models: FilterModel[]): void {
    this.core.setFilterModels(models);
  }

  getFilterAst(): FilterAst | null {
    return this.core.getFilterAst();
  }

  getAstProjectionWarnings(): string[] {
    return this.core.getAstProjectionWarnings();
  }

  getAstExecutionWarnings(): string[] {
    return this.core.getAstExecutionWarnings();
  }

  hasActiveFilters(): boolean {
    return this.core.hasActiveFilters();
  }

  hasStructuredFilters(): boolean {
    return this.core.hasStructuredFilters();
  }

  isUsingAstExecution(): boolean {
    return this.core.isUsingAstExecution();
  }

  hasUnexecutableFilters(): boolean {
    return this.core.hasUnexecutableFilters();
  }

  getColumnFilter(column: number): ColumnFilter | undefined {
    return this.core.getColumnFilter(column);
  }

  // ==================== Query Methods ====================

  async applyFilter(filter: FilterQuery | FilterModel[] | null): Promise<void> {
    return this.query.applyFilter(filter);
  }

  getCurrentExpression(): FilterExpression | null {
    return this.query.getCurrentExpression();
  }

  setColumnNames(names: string[]): void {
    this.query.setColumnNames(names);
  }

  // ==================== Export Methods ====================

  getFieldFilterState(): FieldFilterState | null {
    return this.exporter.getFieldFilterState();
  }

  getFilterExport(): FilterExportResult | null {
    return this.exporter.getFilterExport();
  }

  getFilterExportAs<T>(format: string): T | null {
    return this.exporter.getFilterExportAs<T>(format);
  }

  setFieldFilter(state: FieldFilterState): void {
    this.exporter.setFieldFilter(state);
  }

  setColumns(columns: ColumnDef[]): void {
    this.core.setColumns(columns);
    this.query.setColumns(columns);
    this.exporter.setColumns(columns);
  }

  setColCount(colCount: number): void {
    this.core.setColCount(colCount);
  }

  // ==================== Optimization Methods ====================

  setDataVersion(version: number): void {
    this.optimizer.setDataVersion(version);
  }

  indexColumn(col: number, rowCount: number, type: ColumnType = 'float64'): void {
    this.optimizer.indexColumn(col, rowCount, type);
  }

  getCacheStats(): {
    hitCount: number;
    missCount: number;
    hitRate: number;
    size: number;
    capacity: number;
  } | null {
    return this.optimizer.getCacheStats();
  }

  getIndexMemoryStats(): {
    usedMB: number;
    limitMB: number;
    utilizationPercent: number;
    indexedColumns: number;
  } | null {
    return this.optimizer.getIndexMemoryStats();
  }

  clearOptimizations(): void {
    this.optimizer.clearOptimizations();
  }

  // ==================== Lifecycle ====================

  destroy(): void {
    this.core.clearAll();
    this.optimizer.clearOptimizations();
  }
}

export type { FilterManagerOptions } from './types';
