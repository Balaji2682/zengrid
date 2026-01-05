/**
 * Filter Adapter Interface
 *
 * Base interface for all filter export adapters.
 * Adapters transform field-based filter state into specific output formats.
 */

import type { FieldFilterState, CustomOperator } from '../types';

/**
 * Base configuration for all adapters
 */
export interface AdapterConfig {
  /**
   * Custom operator definitions
   * Extends built-in operators with domain-specific ones
   */
  customOperators?: CustomOperator[];

  /**
   * Field name transformation function
   * Useful for converting between naming conventions
   *
   * @example camelCase to snake_case
   * ```typescript
   * fieldTransform: (field) => field.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`)
   * ```
   *
   * @example Add table prefix
   * ```typescript
   * fieldTransform: (field) => `users.${field}`
   * ```
   */
  fieldTransform?: (field: string) => string;

  /**
   * Value serialization function
   * Transforms filter values before export
   *
   * @example Date to ISO string
   * ```typescript
   * valueSerializer: (value) => value instanceof Date ? value.toISOString() : value
   * ```
   */
  valueSerializer?: (value: any) => any;
}

/**
 * Filter Adapter Interface
 *
 * All adapters must implement this interface to transform
 * filter state into their specific output format.
 *
 * @template TOutput - The output type of this adapter
 *
 * @example
 * ```typescript
 * class CustomAdapter implements FilterAdapter<MyCustomFormat> {
 *   readonly name = 'custom';
 *
 *   transform(state: FieldFilterState, options?: any): MyCustomFormat {
 *     // Transform logic here
 *     return customFormat;
 *   }
 *
 *   parse(input: MyCustomFormat): FieldFilterState {
 *     // Reverse parse logic (optional)
 *     return fieldState;
 *   }
 * }
 * ```
 */
export interface FilterAdapter<TOutput> {
  /**
   * Adapter name (unique identifier)
   * @example 'rest', 'graphql', 'sql'
   */
  readonly name: string;

  /**
   * Transform field-based filter state to output format
   *
   * @param state - Field-based filter state
   * @param options - Adapter-specific options (optional)
   * @returns Transformed output in adapter's format
   */
  transform(state: FieldFilterState, options?: any): TOutput;

  /**
   * Parse output format back to field-based filter state (optional)
   *
   * Enables bidirectional transformation for use cases like:
   * - URL-based filter state hydration
   * - Storing/loading filter presets
   * - Syncing filter state across tabs
   *
   * @param input - Output format to parse
   * @returns Field-based filter state
   */
  parse?(input: TOutput): FieldFilterState;
}

/**
 * Adapter registry type
 * Maps adapter names to adapter instances
 */
export type AdapterRegistry = Map<string, FilterAdapter<any>>;
