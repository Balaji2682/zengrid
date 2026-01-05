/**
 * Filter Export Manager
 *
 * Manages filter state transformation and export to multiple formats.
 * Orchestrates adapters and handles conversions between column-based and field-based filters.
 */

import type { ColumnDef, FilterModel, FilterOperator } from '../../types';
import type { FieldFilterState, FieldFilterCondition, StandardFilterOperator, CustomOperator } from './types';
import type { FilterExportResult } from './adapters/types';
import type { FilterAdapter } from './adapters/adapter.interface';
import { RESTFilterAdapter, type RESTAdapterOptions } from './adapters/rest-adapter';
import { GraphQLFilterAdapter, type GraphQLAdapterOptions } from './adapters/graphql-adapter';
import { SQLFilterAdapter, type SQLAdapterOptions } from './adapters/sql-adapter';

/**
 * FilterExportManager configuration
 */
export interface FilterExportManagerOptions {
  /**
   * Column definitions (for field mapping)
   */
  columns: ColumnDef[];

  /**
   * Adapter configurations
   */
  adapters?: {
    rest?: RESTAdapterOptions;
    graphql?: GraphQLAdapterOptions;
    sql?: SQLAdapterOptions;
  };

  /**
   * Custom operators
   */
  customOperators?: CustomOperator[];
}

/**
 * FilterExportManager - Manages filter transformation and export
 *
 * @example
 * ```typescript
 * const exportManager = new FilterExportManager({
 *   columns: [
 *     { field: 'id', header: 'ID' },
 *     { field: 'name', header: 'Name' },
 *     { field: 'age', header: 'Age' }
 *   ],
 *   adapters: {
 *     rest: { style: 'brackets' },
 *     graphql: { style: 'prisma' },
 *     sql: { paramStyle: 'named' }
 *   }
 * });
 *
 * // Convert internal FilterModel[] to field-based format
 * const fieldState = exportManager.convertFromModels(filterModels);
 *
 * // Export to all formats
 * const exports = exportManager.export(fieldState);
 * console.log(exports.rest.queryString);  // ?filter[age][gt]=18
 * console.log(exports.graphql.where);     // { age: { gt: 18 } }
 * console.log(exports.sql.whereClause);   // age > :age
 * ```
 */
export class FilterExportManager {
  private columns: ColumnDef[];
  private fieldToIndex: Map<string, number> = new Map();
  private indexToField: Map<number, string> = new Map();
  private adapters: Map<string, FilterAdapter<any>> = new Map();
  private customOperators: Map<string, CustomOperator> = new Map();

  constructor(options: FilterExportManagerOptions) {
    this.columns = options.columns || [];
    this.buildFieldMappings();
    this.initializeAdapters(options.adapters);
    this.registerCustomOperators(options.customOperators || []);
  }

  /**
   * Build field name to index mappings
   */
  private buildFieldMappings(): void {
    this.fieldToIndex.clear();
    this.indexToField.clear();

    this.columns.forEach((col, index) => {
      if (col.field) {
        this.fieldToIndex.set(col.field, index);
        this.indexToField.set(index, col.field);
      }
    });
  }

  /**
   * Initialize default adapters
   */
  private initializeAdapters(config?: {
    rest?: RESTAdapterOptions;
    graphql?: GraphQLAdapterOptions;
    sql?: SQLAdapterOptions;
  }): void {
    // REST Adapter
    this.adapters.set('rest', new RESTFilterAdapter(config?.rest));

    // GraphQL Adapter
    this.adapters.set('graphql', new GraphQLFilterAdapter(config?.graphql));

    // SQL Adapter
    this.adapters.set('sql', new SQLFilterAdapter(config?.sql));
  }

  /**
   * Register custom operators
   */
  private registerCustomOperators(operators: CustomOperator[]): void {
    for (const operator of operators) {
      this.customOperators.set(operator.id, operator);
    }
  }

  /**
   * Convert FilterModel[] (column-based) to FieldFilterState (field-based)
   *
   * This enables backend-friendly exports using field names instead of indices
   */
  convertFromModels(models: FilterModel[]): FieldFilterState {
    if (!models || models.length === 0) {
      return {
        root: null,
        activeFields: [],
        timestamp: Date.now(),
      };
    }

    const conditions: FieldFilterCondition[] = [];
    const activeFields = new Set<string>();

    for (const model of models) {
      const field = this.indexToField.get(model.column);
      if (!field) {
        console.warn(`FilterExportManager: No field found for column ${model.column}`);
        continue;
      }

      for (const condition of model.conditions) {
        conditions.push({
          field,
          operator: this.mapOperatorToStandard(condition.operator),
          value: condition.value,
        });
        activeFields.add(field);
      }
    }

    return {
      root: conditions.length > 0 ? { logic: 'AND', conditions } : null,
      activeFields: Array.from(activeFields),
      timestamp: Date.now(),
    };
  }

  /**
   * Convert FieldFilterState (field-based) to FilterModel[] (column-based)
   *
   * Reverse conversion for internal use
   */
  convertToModels(state: FieldFilterState): FilterModel[] {
    if (!state.root) {
      return [];
    }

    const models: FilterModel[] = [];
    const columnConditions: Map<number, { operator: FilterOperator; value?: any }[]> = new Map();

    // Group conditions by column
    for (const condition of state.root.conditions) {
      const columnIndex = this.fieldToIndex.get(condition.field);
      if (columnIndex === undefined) {
        console.warn(`FilterExportManager: No column found for field ${condition.field}`);
        continue;
      }

      if (!columnConditions.has(columnIndex)) {
        columnConditions.set(columnIndex, []);
      }

      columnConditions.get(columnIndex)!.push({
        operator: this.mapOperatorToInternal(condition.operator),
        value: condition.value,
      });
    }

    // Build FilterModels
    for (const [column, conditions] of columnConditions) {
      models.push({
        column,
        conditions,
        logic: state.root.logic,
      });
    }

    return models;
  }

  /**
   * Export filter state to all registered formats
   */
  export(state: FieldFilterState): FilterExportResult {
    const restAdapter = this.adapters.get('rest');
    const graphqlAdapter = this.adapters.get('graphql');
    const sqlAdapter = this.adapters.get('sql');

    return {
      rest: restAdapter ? restAdapter.transform(state) : {
        queryString: '',
        params: {},
        body: { logic: 'AND', conditions: [] },
      },
      graphql: graphqlAdapter ? graphqlAdapter.transform(state) : {
        where: {},
        variables: {},
        variablesTypeDef: '',
      },
      sql: sqlAdapter ? sqlAdapter.transform(state) : {
        whereClause: '',
        positionalParams: [],
        namedParams: {},
        namedSql: '',
      },
      state,
    };
  }

  /**
   * Export to specific format
   */
  exportAs<T>(state: FieldFilterState, adapterName: string): T {
    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      throw new Error(`Adapter '${adapterName}' not found`);
    }
    return adapter.transform(state);
  }

  /**
   * Register custom adapter
   */
  registerAdapter(name: string, adapter: FilterAdapter<any>): void {
    this.adapters.set(name, adapter);
  }

  /**
   * Register custom operator
   */
  registerOperator(operator: CustomOperator): void {
    this.customOperators.set(operator.id, operator);
  }

  /**
   * Update columns (rebuild mappings)
   */
  setColumns(columns: ColumnDef[]): void {
    this.columns = columns;
    this.buildFieldMappings();
  }

  /**
   * Map internal operator to standard operator
   */
  private mapOperatorToStandard(internal: FilterOperator): StandardFilterOperator {
    const mapping: Record<FilterOperator, StandardFilterOperator> = {
      'equals': 'eq',
      'notEquals': 'neq',
      'contains': 'contains',
      'notContains': 'notContains',
      'startsWith': 'startsWith',
      'endsWith': 'endsWith',
      'greaterThan': 'gt',
      'lessThan': 'lt',
      'greaterThanOrEqual': 'gte',
      'lessThanOrEqual': 'lte',
      'blank': 'isNull',
      'notBlank': 'isNotNull',
    };

    return mapping[internal] || 'eq';
  }

  /**
   * Map standard operator to internal operator
   */
  private mapOperatorToInternal(standard: string): FilterOperator {
    const mapping: Record<string, FilterOperator> = {
      'eq': 'equals',
      'neq': 'notEquals',
      'contains': 'contains',
      'notContains': 'notContains',
      'startsWith': 'startsWith',
      'endsWith': 'endsWith',
      'gt': 'greaterThan',
      'lt': 'lessThan',
      'gte': 'greaterThanOrEqual',
      'lte': 'lessThanOrEqual',
      'isNull': 'blank',
      'isNotNull': 'notBlank',
      'in': 'equals', // No direct mapping, default to equals
      'notIn': 'notEquals',
      'between': 'greaterThanOrEqual', // No direct mapping
      'regex': 'contains', // Approximate mapping
    };

    return mapping[standard] || 'equals';
  }

  /**
   * Get all registered adapters
   */
  getAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get all custom operators
   */
  getCustomOperators(): CustomOperator[] {
    return Array.from(this.customOperators.values());
  }
}
