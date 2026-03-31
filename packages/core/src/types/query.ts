/**
 * Shared query-state envelope.
 */

import type { FilterAst } from './filter';
import type { SortDescriptor } from './sort';

/**
 * Query pagination slice.
 */
export interface QueryPaginationState {
  page: number;
  pageSize: number;
  offset: number;
  cursor?: string | null;
}

/**
 * Shared query-state contract.
 */
export interface QueryState {
  version: 1;
  filter?: FilterAst | null;
  sort?: SortDescriptor[] | null;
  pagination?: QueryPaginationState | null;
}
