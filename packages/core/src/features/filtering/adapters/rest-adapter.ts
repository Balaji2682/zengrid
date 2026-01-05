/**
 * REST Filter Adapter
 *
 * Transforms field-based filters into REST API query parameters.
 * Supports three query string styles: brackets, dots, and flat.
 */

import type { FilterAdapter, AdapterConfig } from './adapter.interface';
import type { RESTFilterExport } from './types';
import type { FieldFilterState, FieldFilterGroup, FieldFilterCondition, StandardFilterOperator } from '../types';

/**
 * REST adapter configuration
 */
export interface RESTAdapterOptions extends AdapterConfig {
  /**
   * Query string style
   * - brackets: ?filter[age][gt]=18
   * - dots:     ?filter.age.gt=18
   * - flat:     ?age_gt=18
   *
   * @default 'brackets'
   */
  style?: 'brackets' | 'dots' | 'flat';

  /**
   * Array format for 'in' operator
   * - brackets: ?status[]=active&status[]=pending
   * - comma:    ?status=active,pending
   * - repeat:   ?status=active&status=pending
   *
   * @default 'brackets'
   */
  arrayFormat?: 'brackets' | 'comma' | 'repeat';

  /**
   * URL-encode parameter values
   * @default true
   */
  encode?: boolean;

  /**
   * Prefix for filter parameters (used in brackets/dots styles)
   * @default 'filter'
   */
  prefix?: string;
}

/**
 * REST Filter Adapter
 *
 * @example Brackets style (default)
 * ```typescript
 * const adapter = new RESTFilterAdapter({ style: 'brackets' });
 * const result = adapter.transform(filterState);
 * // result.queryString: "?filter[age][gt]=18&filter[status][eq]=active"
 * ```
 *
 * @example Dots style
 * ```typescript
 * const adapter = new RESTFilterAdapter({ style: 'dots' });
 * const result = adapter.transform(filterState);
 * // result.queryString: "?filter.age.gt=18&filter.status.eq=active"
 * ```
 *
 * @example Flat style
 * ```typescript
 * const adapter = new RESTFilterAdapter({ style: 'flat' });
 * const result = adapter.transform(filterState);
 * // result.queryString: "?age_gt=18&status_eq=active"
 * ```
 */
export class RESTFilterAdapter implements FilterAdapter<RESTFilterExport> {
  readonly name = 'rest';

  private options: Required<RESTAdapterOptions>;

  constructor(options: RESTAdapterOptions = {}) {
    this.options = {
      style: options.style ?? 'brackets',
      arrayFormat: options.arrayFormat ?? 'brackets',
      encode: options.encode ?? true,
      prefix: options.prefix ?? 'filter',
      customOperators: options.customOperators ?? [],
      fieldTransform: options.fieldTransform ?? ((field) => field),
      valueSerializer: options.valueSerializer ?? ((value) => value),
    };
  }

  /**
   * Transform field-based filter state to REST format
   */
  transform(state: FieldFilterState): RESTFilterExport {
    if (!state.root || state.root.conditions.length === 0) {
      return {
        queryString: '',
        params: {},
        body: { logic: 'AND', conditions: [] },
      };
    }

    const params: Record<string, string> = {};
    this.processGroup(state.root, params);

    const queryString = this.buildQueryString(params);

    return {
      queryString,
      params,
      body: state.root,
    };
  }

  /**
   * Process a filter group and add parameters
   */
  private processGroup(group: FieldFilterGroup, params: Record<string, string>): void {
    // Process direct conditions
    for (const condition of group.conditions) {
      this.addConditionToParams(condition, params);
    }

    // Process nested groups
    if (group.groups) {
      for (const nestedGroup of group.groups) {
        this.processGroup(nestedGroup, params);
      }
    }
  }

  /**
   * Add a single condition to params
   */
  private addConditionToParams(condition: FieldFilterCondition, params: Record<string, string>): void {
    const field = this.options.fieldTransform(condition.field);
    const operator = condition.operator as StandardFilterOperator;

    // Handle null checks (no value needed)
    if (operator === 'isNull' || operator === 'isNotNull') {
      const key = this.buildParamKey(field, operator);
      params[key] = 'true';
      return;
    }

    // Handle array values (in/notIn operators)
    if (operator === 'in' || operator === 'notIn') {
      const values = Array.isArray(condition.value) ? condition.value : [condition.value];
      // Skip empty arrays
      if (values.length === 0) {
        return;
      }
      this.addArrayParam(field, operator, values, params);
      return;
    }

    // Handle between operator (two values)
    if (operator === 'between') {
      if (condition.valueTo === undefined) {
        console.warn(`REST Adapter: BETWEEN operator requires valueTo for field "${condition.field}", skipping condition`);
        return;
      }
      const key1 = this.buildParamKey(field, 'gte');
      const key2 = this.buildParamKey(field, 'lte');
      params[key1] = this.serializeValue(condition.value);
      params[key2] = this.serializeValue(condition.valueTo);
      return;
    }

    // Standard single-value operators
    const key = this.buildParamKey(field, operator);
    const value = this.serializeValue(condition.value);
    params[key] = value;
  }

  /**
   * Build parameter key based on style
   */
  private buildParamKey(field: string, operator: StandardFilterOperator | string): string {
    switch (this.options.style) {
      case 'brackets':
        return `${this.options.prefix}[${field}][${operator}]`;
      case 'dots':
        return `${this.options.prefix}.${field}.${operator}`;
      case 'flat':
        return `${field}_${operator}`;
      default:
        return `${this.options.prefix}[${field}][${operator}]`;
    }
  }

  /**
   * Add array parameter based on arrayFormat
   */
  private addArrayParam(
    field: string,
    operator: StandardFilterOperator,
    values: any[],
    params: Record<string, string>
  ): void {
    // Filter out undefined/null values unless explicitly needed
    const filteredValues = values.filter(v => v !== undefined && v !== null);

    if (filteredValues.length === 0) {
      console.warn(`REST Adapter: Array parameter for "${field}" has no valid values, skipping`);
      return;
    }

    switch (this.options.arrayFormat) {
      case 'brackets': {
        const key = this.buildParamKey(field, operator);
        filteredValues.forEach((value, index) => {
          params[`${key}[${index}]`] = this.serializeValue(value);
        });
        break;
      }
      case 'comma': {
        const key = this.buildParamKey(field, operator);
        params[key] = filteredValues.map(v => this.serializeValue(v)).join(',');
        break;
      }
      case 'repeat': {
        const key = this.buildParamKey(field, operator);
        // Will be handled in buildQueryString
        params[key] = filteredValues.map(v => this.serializeValue(v)).join('|REPEAT|');
        break;
      }
    }
  }

  /**
   * Serialize value to string
   */
  private serializeValue(value: any): string {
    const serialized = this.options.valueSerializer(value);

    if (serialized === null || serialized === undefined) {
      return '';
    }

    if (typeof serialized === 'object') {
      return JSON.stringify(serialized);
    }

    return String(serialized);
  }

  /**
   * Build query string from params
   */
  private buildQueryString(params: Record<string, string>): string {
    const pairs: string[] = [];

    for (const [key, value] of Object.entries(params)) {
      // Handle repeat format for arrays
      if (value.includes('|REPEAT|')) {
        const values = value.split('|REPEAT|');
        for (const v of values) {
          pairs.push(this.encodePair(key, v));
        }
      } else {
        pairs.push(this.encodePair(key, value));
      }
    }

    return pairs.length > 0 ? `?${pairs.join('&')}` : '';
  }

  /**
   * Encode a key-value pair
   */
  private encodePair(key: string, value: string): string {
    if (this.options.encode) {
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    }
    return `${key}=${value}`;
  }

  /**
   * Parse REST query string back to field-based filter state (optional)
   */
  parse(input: RESTFilterExport): FieldFilterState {
    // TODO: Implement reverse parsing if needed
    // For now, return the body as-is
    return {
      root: input.body,
      activeFields: input.body.conditions.map(c => c.field),
      timestamp: Date.now(),
    };
  }
}
