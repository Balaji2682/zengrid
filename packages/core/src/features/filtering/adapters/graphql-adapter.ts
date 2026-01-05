/**
 * GraphQL Filter Adapter
 *
 * Transforms field-based filters into GraphQL where clauses.
 * Supports Prisma, Hasura, and Apollo/custom schemas.
 */

import type { FilterAdapter, AdapterConfig } from './adapter.interface';
import type { GraphQLFilterExport } from './types';
import type { FieldFilterState, FieldFilterGroup, FieldFilterCondition, StandardFilterOperator } from '../types';

/**
 * GraphQL schema styles
 */
export type GraphQLStyle = 'prisma' | 'hasura' | 'apollo' | 'custom';

/**
 * GraphQL adapter configuration
 */
export interface GraphQLAdapterOptions extends AdapterConfig {
  /**
   * GraphQL schema style
   * - prisma:  { age: { gt: 18 }, status: { equals: "active" } }
   * - hasura:  { age: { _gt: 18 }, status: { _eq: "active" } }
   * - apollo:  Similar to Prisma but with different conventions
   * - custom:  Use customWhereBuilder
   *
   * @default 'prisma'
   */
  style?: GraphQLStyle;

  /**
   * Custom where clause builder
   * Only used when style is 'custom'
   */
  customWhereBuilder?: (conditions: FieldFilterCondition[]) => Record<string, any>;

  /**
   * Generate GraphQL variables instead of inline values
   * Recommended for security and performance
   *
   * @default true
   */
  useVariables?: boolean;
}

/**
 * GraphQL Filter Adapter
 *
 * @example Prisma style
 * ```typescript
 * const adapter = new GraphQLFilterAdapter({ style: 'prisma' });
 * const result = adapter.transform(filterState);
 * // result.where: {
 * //   age: { gt: 18 },
 * //   status: { equals: "active" }
 * // }
 * ```
 *
 * @example Hasura style
 * ```typescript
 * const adapter = new GraphQLFilterAdapter({ style: 'hasura' });
 * const result = adapter.transform(filterState);
 * // result.where: {
 * //   age: { _gt: 18 },
 * //   status: { _eq: "active" }
 * // }
 * ```
 *
 * @example With variables
 * ```typescript
 * const adapter = new GraphQLFilterAdapter({
 *   style: 'prisma',
 *   useVariables: true
 * });
 * const result = adapter.transform(filterState);
 * // result.where: { age: { gt: $age }, status: { equals: $status } }
 * // result.variables: { age: 18, status: "active" }
 * // result.variablesTypeDef: "$age: Int, $status: String"
 * ```
 */
export class GraphQLFilterAdapter implements FilterAdapter<GraphQLFilterExport> {
  readonly name = 'graphql';

  private options: Required<Omit<GraphQLAdapterOptions, 'customWhereBuilder'>> & Pick<GraphQLAdapterOptions, 'customWhereBuilder'>;
  private variables: Record<string, any> = {};
  private variableCounter = 0;

  constructor(options: GraphQLAdapterOptions = {}) {
    this.options = {
      style: options.style ?? 'prisma',
      useVariables: options.useVariables ?? true,
      customOperators: options.customOperators ?? [],
      fieldTransform: options.fieldTransform ?? ((field) => field),
      valueSerializer: options.valueSerializer ?? ((value) => value),
      customWhereBuilder: options.customWhereBuilder,
    };
  }

  /**
   * Transform field-based filter state to GraphQL format
   */
  transform(state: FieldFilterState): GraphQLFilterExport {
    // Reset for each transformation
    this.variables = {};
    this.variableCounter = 0;

    if (!state.root || state.root.conditions.length === 0) {
      return {
        where: {},
        variables: {},
        variablesTypeDef: '',
      };
    }

    // Use custom builder if provided
    if (this.options.style === 'custom' && this.options.customWhereBuilder) {
      const where = this.options.customWhereBuilder(state.root.conditions);
      return {
        where,
        variables: this.variables,
        variablesTypeDef: this.buildVariablesTypeDef(),
      };
    }

    const where = this.processGroup(state.root);

    return {
      where,
      variables: this.variables,
      variablesTypeDef: this.buildVariablesTypeDef(),
    };
  }

  /**
   * Process a filter group
   */
  private processGroup(group: FieldFilterGroup): Record<string, any> {
    const where: Record<string, any> = {};

    // Process conditions
    if (group.conditions.length > 0) {
      for (const condition of group.conditions) {
        const fieldWhere = this.buildConditionWhere(condition);
        Object.assign(where, fieldWhere);
      }
    }

    // Process nested groups
    if (group.groups && group.groups.length > 0) {
      const logic = group.logic === 'OR' ? 'OR' : 'AND';
      const nestedWhere = group.groups.map(g => this.processGroup(g));

      if (this.options.style === 'hasura') {
        where[`_${logic.toLowerCase()}`] = nestedWhere;
      } else {
        // Prisma/Apollo style
        where[logic] = nestedWhere;
      }
    }

    return where;
  }

  /**
   * Build where clause for a single condition
   */
  private buildConditionWhere(condition: FieldFilterCondition): Record<string, any> {
    const field = this.options.fieldTransform(condition.field);
    const operator = condition.operator as StandardFilterOperator;
    const graphqlOp = this.mapOperatorToGraphQL(operator);

    // Handle null checks
    if (operator === 'isNull') {
      if (this.options.style === 'hasura') {
        return { [field]: { _is_null: true } };
      }
      return { [field]: this.buildOperatorObject(graphqlOp, null) };
    }
    if (operator === 'isNotNull') {
      if (this.options.style === 'hasura') {
        return { [field]: { _is_null: false } };
      }
      return { [field]: this.buildOperatorObject(graphqlOp, null) };
    }

    // Handle between operator
    if (operator === 'between') {
      if (condition.valueTo === undefined) {
        console.warn(`GraphQL Adapter: BETWEEN operator requires valueTo for field "${condition.field}", skipping condition`);
        return {};
      }
      const gteOp = this.mapOperatorToGraphQL('gte');
      const lteOp = this.mapOperatorToGraphQL('lte');

      return {
        [field]: {
          ...this.buildOperatorObject(gteOp, condition.value),
          ...this.buildOperatorObject(lteOp, condition.valueTo),
        },
      };
    }

    // Standard operators
    let value = this.options.valueSerializer(condition.value);

    // Add wildcards for Hasura LIKE operators
    if (this.options.style === 'hasura' && typeof value === 'string') {
      if (operator === 'contains') {
        value = `%${value}%`;
      } else if (operator === 'startsWith') {
        value = `${value}%`;
      } else if (operator === 'endsWith') {
        value = `%${value}`;
      } else if (operator === 'notContains') {
        value = `%${value}%`;
      }
    }

    return {
      [field]: this.buildOperatorObject(graphqlOp, value),
    };
  }

  /**
   * Build operator object { op: value } or { op: $variable }
   */
  private buildOperatorObject(operator: string, value: any): Record<string, any> {
    if (this.options.useVariables && value !== null) {
      const varName = this.createVariable(value);
      return { [operator]: `$${varName}` };
    }

    return { [operator]: value };
  }

  /**
   * Map standard operator to GraphQL operator
   */
  private mapOperatorToGraphQL(operator: StandardFilterOperator): string {
    switch (this.options.style) {
      case 'hasura':
        return this.mapToHasura(operator);
      case 'prisma':
      case 'apollo':
      default:
        return this.mapToPrisma(operator);
    }
  }

  /**
   * Map to Prisma style operators
   */
  private mapToPrisma(operator: StandardFilterOperator): string {
    const mapping: Record<StandardFilterOperator, string> = {
      eq: 'equals',
      neq: 'not',
      gt: 'gt',
      gte: 'gte',
      lt: 'lt',
      lte: 'lte',
      contains: 'contains',
      notContains: 'notContains',
      startsWith: 'startsWith',
      endsWith: 'endsWith',
      in: 'in',
      notIn: 'notIn',
      between: 'between', // Handled separately
      isNull: 'equals', // null value
      isNotNull: 'not', // null value
      regex: 'regex',
    };

    return mapping[operator] || operator;
  }

  /**
   * Map to Hasura style operators (with underscore prefix)
   */
  private mapToHasura(operator: StandardFilterOperator): string {
    const mapping: Record<StandardFilterOperator, string> = {
      eq: '_eq',
      neq: '_neq',
      gt: '_gt',
      gte: '_gte',
      lt: '_lt',
      lte: '_lte',
      contains: '_like', // Hasura uses LIKE
      notContains: '_nlike',
      startsWith: '_like', // With % suffix
      endsWith: '_like', // With % prefix
      in: '_in',
      notIn: '_nin',
      between: '_between', // Handled separately
      isNull: '_is_null',
      isNotNull: '_is_null', // with false value
      regex: '_regex',
    };

    return mapping[operator] || `_${operator}`;
  }

  /**
   * Create a GraphQL variable and return its name
   */
  private createVariable(value: any): string {
    this.variableCounter++;
    const varName = `var${this.variableCounter}`;
    this.variables[varName] = value;
    return varName;
  }

  /**
   * Build GraphQL variables type definition
   * @example "$var1: Int, $var2: String"
   */
  private buildVariablesTypeDef(): string {
    const typeDefs: string[] = [];

    for (const [name, value] of Object.entries(this.variables)) {
      const type = this.inferGraphQLType(value);
      typeDefs.push(`$${name}: ${type}`);
    }

    return typeDefs.join(', ');
  }

  /**
   * Infer GraphQL type from JavaScript value
   */
  private inferGraphQLType(value: any): string {
    if (value === null || value === undefined) {
      return 'Any';
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        console.warn('GraphQL Adapter: Empty array in filter, defaulting to [String]');
        return '[String]';
      }
      return `[${this.inferGraphQLType(value[0])}]`;
    }

    switch (typeof value) {
      case 'number':
        return Number.isInteger(value) ? 'Int' : 'Float';
      case 'string':
        return 'String';
      case 'boolean':
        return 'Boolean';
      default:
        return 'Any';
    }
  }
}
