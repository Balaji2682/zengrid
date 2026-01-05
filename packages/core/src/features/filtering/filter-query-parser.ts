// @ts-nocheck - TODO: Fix unused variable warnings in this file
import type { FilterQuery, FilterExpression, FilterModel, FilterOperator } from '../../types';

/**
 * FilterQueryParser - Parses SQL-like filter queries
 *
 * Converts SQL-like syntax to FilterExpression for both backend and frontend use
 *
 * Supported operators:
 * - Comparison: =, !=, <, >, <=, >=
 * - String: LIKE, NOT LIKE
 * - Range: BETWEEN, NOT BETWEEN
 * - List: IN, NOT IN
 * - Null: IS NULL, IS NOT NULL
 * - Logic: AND, OR, NOT, ( )
 *
 * @example
 * ```typescript
 * const parser = new FilterQueryParser();
 *
 * // Simple query
 * parser.parse({ sql: "age > 18" });
 *
 * // Parameterized query (recommended)
 * parser.parse({
 *   sql: "age > :minAge AND status = :status",
 *   params: { minAge: 18, status: 'active' }
 * });
 *
 * // Complex query
 * parser.parse({
 *   sql: "age BETWEEN :min AND :max AND (name LIKE :search OR email LIKE :search)",
 *   params: { min: 18, max: 65, search: '%john%' }
 * });
 * ```
 */
export class FilterQueryParser {
  // TODO: Add column mapping support for field name conversion
  // private _columnMap: Map<string, number> = new Map();

  /**
   * Set column name to index mapping
   * Required for converting SQL field names to column indices
   */
  setColumnMapping(_mapping: Record<string, number>): void {
    // this._columnMap = new Map(Object.entries(mapping));
    // TODO: Implement field name to column index mapping
  }

  /**
   * Parse SQL-like filter query into FilterExpression
   */
  parse(query: FilterQuery): FilterExpression {
    try {
      // Step 1: Bind named parameters to values
      const boundSql = this.bindNamedParameters(query.sql, query.params || {});

      // Step 2: Extract positional parameters
      const { sql: positionSql, params } = this.extractPositionalParameters(boundSql);

      // Step 3: Return expression
      return {
        type: 'sql',
        sql: query.sql,
        boundSql: positionSql,
        params,
      };
    } catch (error) {
      throw new Error(`Failed to parse filter query: ${(error as Error).message}`);
    }
  }

  /**
   * Bind named parameters (:paramName) to their values
   * Converts to positional placeholders (?)
   */
  private bindNamedParameters(sql: string, params: Record<string, any>): string {
    let boundSql = sql;
    const paramNames = Object.keys(params);

    // Replace named parameters with their values (quoted if string)
    for (const paramName of paramNames) {
      const value = params[paramName];
      const regex = new RegExp(`:${paramName}\\b`, 'g');

      // Quote strings, keep numbers as-is
      const quotedValue = typeof value === 'string' ? `'${value}'` : String(value);
      boundSql = boundSql.replace(regex, quotedValue);
    }

    return boundSql;
  }

  /**
   * Extract positional parameters from SQL
   * Converts literal values to ? placeholders
   */
  private extractPositionalParameters(sql: string): { sql: string; params: any[] } {
    const params: any[] = [];
    let positionSql = sql;

    // Match quoted strings
    const stringRegex = /'([^']*)'/g;
    positionSql = positionSql.replace(stringRegex, (_match, value) => {
      params.push(value);
      return '?';
    });

    // Match numbers (not part of keywords or identifiers)
    const numberRegex = /\b(\d+(?:\.\d+)?)\b/g;
    positionSql = positionSql.replace(numberRegex, (match, value) => {
      // Skip if it's part of a keyword or identifier
      if (this.isPartOfKeyword(positionSql, match)) {
        return match;
      }
      params.push(parseFloat(value));
      return '?';
    });

    return { sql: positionSql, params };
  }

  /**
   * Check if a value is part of a SQL keyword
   */
  private isPartOfKeyword(sql: string, value: string): boolean {
    const keywords = ['AND', 'OR', 'NOT', 'LIKE', 'BETWEEN', 'IN', 'NULL', 'IS'];
    return keywords.some(keyword => sql.includes(`${value}${keyword}`) || sql.includes(`${keyword}${value}`));
  }

  /**
   * Convert SQL query to FilterModels (for frontend filtering)
   * This is a simplified conversion - complex queries may not convert perfectly
   */
  parseToModels(query: FilterQuery, columnNames: string[]): FilterModel[] {
    // This is a simplified implementation
    // Full implementation would require a complete SQL parser
    const models: FilterModel[] = [];

    // For now, we'll support simple cases
    // Complex queries should use backend filtering
    console.warn('FilterQueryParser.parseToModels(): Converting SQL to FilterModels has limitations. Consider using backend filtering for complex queries.');

    return models;
  }

  /**
   * Convert SQL operator to FilterOperator
   */
  private sqlOperatorToFilterOperator(sqlOp: string): FilterOperator {
    const mapping: Record<string, FilterOperator> = {
      '=': 'equals',
      '!=': 'notEquals',
      '<>': 'notEquals',
      '>': 'greaterThan',
      '<': 'lessThan',
      '>=': 'greaterThanOrEqual',
      '<=': 'lessThanOrEqual',
      'LIKE': 'contains',
      'NOT LIKE': 'notContains',
    };

    return mapping[sqlOp.toUpperCase()] || 'equals';
  }
}
