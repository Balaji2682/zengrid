import type { QueryState, SortDescriptor } from '../../types';
import { getFilterAstSignature } from '../filtering/filter-signature';
import { stableHashValue } from '../../utils/stable-hash';

const querySignatureCache = new WeakMap<QueryState, string>();

export function getQueryStateSignature(query: QueryState | null | undefined): string {
  if (!query) {
    return 'version:1';
  }

  const cached = querySignatureCache.get(query);
  if (cached) {
    return cached;
  }

  const signature = [
    `version:${query.version ?? 1}`,
    `sort:${getSortSignature(query.sort)}`,
    `filter:${getFilterAstSignature(query.filter)}`,
    `pagination:${getPaginationSignature(query.pagination)}`,
  ].join('|');

  querySignatureCache.set(query, signature);
  return signature;
}

function getSortSignature(sort: SortDescriptor[] | null | undefined): string {
  if (!sort || sort.length === 0) {
    return '';
  }

  return stableHashValue(sort);
}

function getPaginationSignature(pagination: QueryState['pagination']): string {
  if (!pagination) {
    return '';
  }

  return [pagination.page, pagination.pageSize, pagination.offset, pagination.cursor ?? ''].join(
    ':'
  );
}
