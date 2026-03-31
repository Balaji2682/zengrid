import type { ColumnDef, FilterExpression, FilterModel, FilterQuery } from '../../../types';
import type { EventEmitter } from '../../../events/event-emitter';
import type { GridEvents } from '../../../events/grid-events';
import type { FilterExportResult } from '../adapters/types';
import { buildFilterAstFromModels } from '../filter-ast';
import { buildUnexecutableFilterError } from '../filter-execution-error';
import { FilterQueryParser } from '../filter-query-parser';
import type { FieldFilterState } from '../types';
import type { FilterCore } from './filter-core';

/**
 * FilterQueryHandler - SQL-like query parsing and expression management.
 */
export class FilterQueryHandler {
  private columnNames: string[];
  private columns?: ColumnDef[];
  private parser: FilterQueryParser;
  private currentExpression: FilterExpression | null = null;
  private events?: EventEmitter<GridEvents>;
  private core: FilterCore;
  private getFieldFilterState?: () => FieldFilterState | null;
  private getFilterExport?: () => FilterExportResult | null;

  constructor(
    core: FilterCore,
    columnNames: string[],
    columns?: ColumnDef[],
    events?: EventEmitter<GridEvents>,
    getFieldFilterState?: () => FieldFilterState | null,
    getFilterExport?: () => FilterExportResult | null
  ) {
    this.core = core;
    this.columnNames = columnNames;
    this.columns = columns;
    this.events = events;
    this.getFieldFilterState = getFieldFilterState;
    this.getFilterExport = getFilterExport;
    this.parser = new FilterQueryParser();

    if (this.columnNames.length > 0) {
      const columnMapping: Record<string, number> = {};
      this.columnNames.forEach((name, index) => {
        columnMapping[name] = index;
      });
      this.parser.setColumnMapping(columnMapping);
    }
  }

  /**
   * Apply filter using SQL-like query or FilterModels.
   */
  async applyFilter(filter: FilterQuery | FilterModel[] | null): Promise<void> {
    if (!filter) {
      this.core.clearAll();
      this.currentExpression = null;
      return;
    }

    try {
      const parsedExpression = this.parseFilterInput(filter);
      this.core.setFilterAst(parsedExpression.ast ?? null);
      const expression = this.buildCurrentExpression(parsedExpression);
      this.currentExpression = expression;

      if (this.events) {
        this.events.emit('filter:start', {
          timestamp: Date.now(),
          filter: expression,
        });
      }

      await this.applyFrontendFilter();

      if (this.events) {
        this.events.emit('filter:end', {
          timestamp: Date.now(),
          resultCount: this.core.getColumnFilters().size,
        });
      }
    } catch (error) {
      if (this.events) {
        this.events.emit('filter:error', {
          timestamp: Date.now(),
          error: error as Error,
        });
      }
      throw error;
    }
  }

  /**
   * Parse filter input into FilterExpression.
   */
  private parseFilterInput(filter: FilterQuery | FilterModel[]): FilterExpression {
    if (this.isFilterQuery(filter)) {
      return this.parser.parse(filter);
    }

    return {
      type: 'model',
      ast: buildFilterAstFromModels(filter, { columns: this.columns }),
      models: filter,
    };
  }

  private buildCurrentExpression(parsedExpression: FilterExpression): FilterExpression {
    const hasColumns = Array.isArray(this.columns) && this.columns.length > 0;

    return {
      type: parsedExpression.type,
      ast: this.core.getFilterAst(),
      sql: parsedExpression.sql,
      boundSql: parsedExpression.boundSql,
      params: parsedExpression.params,
      models: this.core.getFilterState(),
      quickFilter: parsedExpression.quickFilter,
      fieldState: hasColumns ? (this.getFieldFilterState?.() ?? null) : null,
      filterExport: hasColumns ? (this.getFilterExport?.() ?? null) : null,
    };
  }

  /**
   * Type guard for FilterQuery.
   */
  private isFilterQuery(filter: FilterQuery | FilterModel[]): filter is FilterQuery {
    return (filter as FilterQuery).sql !== undefined;
  }

  /**
   * Apply frontend filtering (in-memory).
   */
  private async applyFrontendFilter(): Promise<void> {
    const projectionWarnings = this.core.getAstProjectionWarnings();
    const executionWarnings = this.core.getAstExecutionWarnings();

    if (this.core.hasUnexecutableFilters()) {
      throw buildUnexecutableFilterError(executionWarnings);
    }

    if (!this.core.isUsingAstExecution() || projectionWarnings.length === 0) {
      return;
    }

    console.warn(
      'FilterQueryHandler: FilterModel[] is now a compatibility projection for structured filters. ' +
        'Use filter.ast for the canonical frontend/backend contract.'
    );

    for (const warning of projectionWarnings) {
      console.warn(`FilterQueryHandler: ${warning}`);
    }
  }

  /**
   * Get current filter expression.
   */
  getCurrentExpression(): FilterExpression | null {
    return this.currentExpression;
  }

  /**
   * Update column names (for SQL query mapping).
   */
  setColumnNames(names: string[]): void {
    this.columnNames = names;
    const columnMapping: Record<string, number> = {};
    names.forEach((name, index) => {
      columnMapping[name] = index;
    });
    this.parser.setColumnMapping(columnMapping);
  }

  /**
   * Update column metadata used for AST target enrichment.
   */
  setColumns(columns: ColumnDef[]): void {
    this.columns = columns;
  }
}
