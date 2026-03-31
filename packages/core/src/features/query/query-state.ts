import type {
  ColumnDef,
  FilterAst,
  QueryPaginationState,
  QueryState,
  SortState,
} from '../../types';
import { serializeSortState } from '../sorting/sort-request';

export interface BuildQueryStateOptions {
  sortState?: SortState[] | null;
  filterAst?: FilterAst | null;
  pagination?: QueryPaginationState | null;
  columns?: ColumnDef[];
}

export function buildQueryPaginationState(
  page: number,
  pageSize: number,
  offset = page * pageSize
): QueryPaginationState {
  return {
    page: Math.max(0, Math.floor(page)),
    pageSize: Math.max(1, Math.floor(pageSize)),
    offset: Math.max(0, Math.floor(offset)),
  };
}

export function buildRangeQueryPaginationState(
  startRow: number,
  endRow: number
): QueryPaginationState {
  const safeStartRow = Math.max(0, Math.floor(startRow));
  const pageSize = Math.max(1, Math.floor(endRow) - safeStartRow);

  return buildQueryPaginationState(Math.floor(safeStartRow / pageSize), pageSize, safeStartRow);
}

export function buildStoreQueryPaginationState(
  page: number | null | undefined,
  pageSize: number | null | undefined
): QueryPaginationState | null {
  if (typeof page !== 'number' || !Number.isFinite(page)) {
    return null;
  }

  if (typeof pageSize !== 'number' || !Number.isFinite(pageSize) || pageSize <= 0) {
    return null;
  }

  return buildQueryPaginationState(page, pageSize);
}

export function buildQueryState(options: BuildQueryStateOptions = {}): QueryState {
  const serializedSort = options.sortState?.length
    ? serializeSortState(options.sortState, options.columns)
    : [];
  const filter = options.filterAst?.root ? options.filterAst : null;

  return {
    version: 1,
    filter,
    sort: serializedSort.length > 0 ? serializedSort : null,
    pagination: options.pagination ?? null,
  };
}
