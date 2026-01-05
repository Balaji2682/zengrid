/**
 * Filter Export Format Types
 *
 * Defines output formats for different backend integrations:
 * - REST: Query string parameters
 * - GraphQL: Where clause objects
 * - SQL: Parameterized WHERE clauses
 */

import type { FieldFilterGroup, FieldFilterState } from '../types';

/**
 * REST filter export format
 *
 * Provides filter data in multiple REST-friendly formats
 *
 * @example
 * ```typescript
 * // Brackets style
 * {
 *   queryString: "filter[age][gt]=18&filter[status][eq]=active",
 *   params: {
 *     'filter[age][gt]': '18',
 *     'filter[status][eq]': 'active'
 *   },
 *   body: { logic: 'AND', conditions: [...] }
 * }
 *
 * // Flat style
 * {
 *   queryString: "age_gt=18&status_eq=active",
 *   params: {
 *     'age_gt': '18',
 *     'status_eq': 'active'
 *   },
 *   body: { logic: 'AND', conditions: [...] }
 * }
 * ```
 */
export interface RESTFilterExport {
  /**
   * URL-encoded query string (ready to append to URL)
   * @example "?filter[age][gt]=18&filter[status][eq]=active"
   */
  queryString: string;

  /**
   * Individual query parameters as key-value pairs
   * Useful for custom query string builders
   */
  params: Record<string, string>;

  /**
   * JSON body format (for POST requests)
   * The original field-based filter group
   */
  body: FieldFilterGroup;
}

/**
 * GraphQL filter export format
 *
 * Generates where clauses compatible with different GraphQL schemas
 *
 * @example Prisma
 * ```typescript
 * {
 *   where: {
 *     age: { gt: 18 },
 *     status: { equals: "active" }
 *   },
 *   variables: {
 *     age_gt: 18,
 *     status: "active"
 *   },
 *   variablesTypeDef: "$age_gt: Int, $status: String"
 * }
 * ```
 *
 * @example Hasura
 * ```typescript
 * {
 *   where: {
 *     age: { _gt: 18 },
 *     status: { _eq: "active" }
 *   },
 *   variables: {
 *     age: 18,
 *     status: "active"
 *   },
 *   variablesTypeDef: "$age: Int, $status: String"
 * }
 * ```
 */
export interface GraphQLFilterExport {
  /**
   * GraphQL where clause object
   * Format depends on the GraphQL schema (Prisma, Hasura, etc.)
   */
  where: Record<string, any>;

  /**
   * GraphQL query variables
   * Use these with parameterized queries
   */
  variables: Record<string, any>;

  /**
   * Variables type definition for GraphQL query
   * @example "$age: Int, $status: String"
   */
  variablesTypeDef: string;
}

/**
 * SQL filter export format
 *
 * Generates parameterized SQL WHERE clauses
 *
 * @example Positional parameters
 * ```typescript
 * {
 *   whereClause: "age > ? AND status = ?",
 *   positionalParams: [18, "active"],
 *   namedParams: { age: 18, status: "active" },
 *   namedSql: "age > :age AND status = :status"
 * }
 * ```
 *
 * @example Dollar-style (PostgreSQL)
 * ```typescript
 * {
 *   whereClause: "age > $1 AND status = $2",
 *   positionalParams: [18, "active"],
 *   namedParams: { age: 18, status: "active" },
 *   namedSql: "age > :age AND status = :status"
 * }
 * ```
 */
export interface SQLFilterExport {
  /**
   * WHERE clause with positional placeholders
   * Does NOT include the "WHERE" keyword
   * @example "age > ? AND status = ?"
   */
  whereClause: string;

  /**
   * Positional parameters array
   * Use with ? placeholders
   * @example [18, "active"]
   */
  positionalParams: any[];

  /**
   * Named parameters object
   * Use with :name placeholders
   * @example { age: 18, status: "active" }
   */
  namedParams: Record<string, any>;

  /**
   * WHERE clause with named placeholders
   * Does NOT include the "WHERE" keyword
   * @example "age > :age AND status = :status"
   */
  namedSql: string;
}

/**
 * Combined filter export result
 *
 * Contains all export formats for maximum flexibility
 *
 * @example
 * ```typescript
 * const exports = filterManager.getFilterExport();
 *
 * // Use REST
 * fetch(`/api/users?${exports.rest.queryString}`);
 *
 * // Use GraphQL
 * graphqlClient.query({
 *   query: GET_USERS,
 *   variables: { where: exports.graphql.where }
 * });
 *
 * // Use SQL
 * db.query(
 *   `SELECT * FROM users WHERE ${exports.sql.whereClause}`,
 *   exports.sql.positionalParams
 * );
 * ```
 */
export interface FilterExportResult {
  /**
   * REST export (query strings, params, body)
   */
  rest: RESTFilterExport;

  /**
   * GraphQL export (where clause, variables)
   */
  graphql: GraphQLFilterExport;

  /**
   * SQL export (WHERE clause, params)
   */
  sql: SQLFilterExport;

  /**
   * Original field-based filter state
   */
  state: FieldFilterState;
}
