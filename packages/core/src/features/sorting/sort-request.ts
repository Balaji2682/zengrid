import type { ColumnDef } from '../../types/column';
import type { SortDescriptor, SortDirection, SortState } from '../../types/sort';

function isActiveSortDirection(
  direction: SortDirection
): direction is Exclude<SortDirection, null> {
  return direction === 'asc' || direction === 'desc';
}

export function normalizeSortState(sortState: SortState[]): SortState[] {
  const normalized = sortState
    .filter((entry) => isActiveSortDirection(entry.direction))
    .map((entry, originalIndex) => ({
      column: entry.column,
      direction: entry.direction,
      sortIndex: entry.sortIndex,
      originalIndex,
    }));

  if (normalized.length <= 1) {
    return normalized.map((entry) => ({
      column: entry.column,
      direction: entry.direction,
    }));
  }

  const hasExplicitSortIndex = normalized.some(
    (entry) => typeof entry.sortIndex === 'number' && Number.isFinite(entry.sortIndex)
  );

  const ordered = hasExplicitSortIndex
    ? [...normalized].sort((left, right) => {
        const leftSortIndex =
          typeof left.sortIndex === 'number' && Number.isFinite(left.sortIndex)
            ? left.sortIndex
            : Number.MAX_SAFE_INTEGER;
        const rightSortIndex =
          typeof right.sortIndex === 'number' && Number.isFinite(right.sortIndex)
            ? right.sortIndex
            : Number.MAX_SAFE_INTEGER;

        if (leftSortIndex !== rightSortIndex) {
          return leftSortIndex - rightSortIndex;
        }

        return left.originalIndex - right.originalIndex;
      })
    : normalized;

  return ordered.map((entry, index) => ({
    column: entry.column,
    direction: entry.direction,
    sortIndex: index,
  }));
}

export function serializeSortState(
  sortState: SortState[],
  columns?: ColumnDef[]
): SortDescriptor[] {
  return normalizeSortState(sortState).map((entry, index) => ({
    column: entry.column,
    field: columns?.[entry.column]?.field,
    direction: entry.direction as Exclude<SortDirection, null>,
    sortIndex: entry.sortIndex ?? index,
  }));
}
