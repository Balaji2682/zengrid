import { Grid } from '../../../../../packages/core/src/grid/index';
import { FilterPanel } from './filter-panel';
import { operators } from '../../config/operators';

export function applyFilters(filterPanel: FilterPanel, grid: Grid, columns: any[]): void {
  grid.clearFilters();

  const filterArray = filterPanel.getFiltersArray();

  if (filterArray.length === 0) {
    filterPanel.filterPreview.style.display = 'none';
    return;
  }

  // Group consecutive conditions by column with their logic
  const columnGroups = new Map<number, Array<{ operator: string; value: any; logic?: 'AND' | 'OR' }>>();

  for (let i = 0; i < filterArray.length; i++) {
    const filter = filterArray[i];
    const column = filter.column;

    if (!columnGroups.has(column)) {
      columnGroups.set(column, []);
    }

    columnGroups.get(column)!.push({
      operator: filter.operator,
      value: filter.value,
      logic: filter.logicToNext,
    });
  }

  // Detect impossible filter combinations
  const warnings = detectImpossibleFilters(filterArray, columns);

  // Show warnings if any
  if (warnings.length > 0) {
    filterPanel.filterWarningContent.innerHTML = warnings.map(w => `<div style="margin-bottom: 0.75rem;">${w}</div>`).join('');
    filterPanel.filterWarning.style.display = 'block';
  } else {
    filterPanel.filterWarning.style.display = 'none';
  }

  // Build preview showing the actual filter chain
  let previewHTML = '<div style="margin-bottom: 0.5rem;"><strong>Filter Chain:</strong></div>';
  let previewText = '';

  for (let i = 0; i < filterArray.length; i++) {
    const filter = filterArray[i];
    const columnName = columns[filter.column]?.header || `Column ${filter.column}`;
    const operatorLabel = operators.find(op => op.value === filter.operator)?.label || filter.operator;
    const valueStr = filter.value !== undefined ? String(filter.value) : '';

    const conditionText = `${columnName} ${operatorLabel} ${valueStr}`;

    previewText += conditionText;
    previewHTML += `<div style="margin-left: 1rem;">${conditionText}</div>`;

    if (i < filterArray.length - 1) {
      const logic = filter.logicToNext || 'AND';
      previewHTML += `<div style="margin-left: 2rem; font-weight: 600; color: #0c5460;">${logic}</div>`;
      previewText += ` ${logic} `;
    }
  }

  filterPanel.filterPreviewContent.innerHTML = previewHTML;
  filterPanel.filterPreview.style.display = 'block';

  // Apply filters: group consecutive same-column conditions with consistent logic
  const appliedColumns = new Set<number>();

  for (const [column, conditions] of columnGroups) {
    if (appliedColumns.has(column)) continue;

    const logic = conditions.find(c => c.logic)?.logic || 'AND';

    const cleanConditions = conditions.map(({ logic, ...rest }) => rest);

    (grid as any).filterManager.setColumnFilter(column, cleanConditions, logic);
    appliedColumns.add(column);
  }

  // Trigger the same refresh logic as setFilter
  if ((grid as any).filterManager) {
    (grid as any).state.filterState = (grid as any).filterManager.getFilterState();

    // Get visible rows and update the cache
    (grid as any).cachedVisibleRows = (grid as any).filterManager.getVisibleRows((grid as any).options.rowCount);
    // Re-apply sort if active
    if ((grid as any).sortManager && (grid as any).state.sortState.length > 0) {
      const currentSort = (grid as any).state.sortState;
      const SortManager = (grid as any).sortManager.constructor;
      (grid as any).sortManager = new SortManager({
        rowCount: (grid as any).cachedVisibleRows.length,
        getValue: (row: number, col: number) => {
          const dataRow = (grid as any).cachedVisibleRows[row];
          return (grid as any).dataAccessor?.getValue(dataRow, col);
        },
        events: (grid as any).events,
      });
      (grid as any).sortManager.setSortState(currentSort);
    }

    grid.refresh();

    // Emit filter:export event
    const fieldState = (grid as any).filterManager.getFieldFilterState();
    if (fieldState) {
      const exports = (grid as any).filterManager.getFilterExport();
      if (exports) {
        (grid as any).events.emit('filter:export', exports);
      }
    }
  }

}

export function detectImpossibleFilters(filterArray: any[], columns: any[]): string[] {
  const warnings: string[] = [];

  for (let i = 0; i < filterArray.length - 1; i++) {
    const current = filterArray[i];
    const next = filterArray[i + 1];
    const logic = current.logicToNext || 'AND';

    if (current.column === next.column) {
      const columnName = columns[current.column]?.header || `Column ${current.column}`;

      // Case 1: Same column, equals operator, different values, AND logic
      if (
        current.operator === 'equals' &&
        next.operator === 'equals' &&
        current.value !== next.value &&
        logic === 'AND'
      ) {
        warnings.push(
          `<strong>${columnName}</strong> cannot equal both <strong>${current.value}</strong> AND <strong>${next.value}</strong>. ` +
          `<br/>💡 <strong>Suggestion:</strong> Change the logic between these conditions to <strong>OR</strong> to show rows where ${columnName} is either value.`
        );
      }

      // Case 2: Contradictory range
      if (
        (current.operator === 'greaterThan' || current.operator === 'greaterThanOrEqual') &&
        (next.operator === 'lessThan' || next.operator === 'lessThanOrEqual') &&
        logic === 'AND' &&
        Number(current.value) > Number(next.value)
      ) {
        warnings.push(
          `<strong>${columnName}</strong> cannot be greater than <strong>${current.value}</strong> AND less than <strong>${next.value}</strong>. ` +
          `<br/>💡 <strong>Suggestion:</strong> Check your values—the range is inverted.`
        );
      }

      // Case 3: Same condition repeated with AND (redundant)
      if (
        current.operator === next.operator &&
        current.value === next.value &&
        logic === 'AND'
      ) {
        warnings.push(
          `<strong>${columnName}</strong> has a duplicate condition: <strong>${current.operator} ${current.value}</strong>. ` +
          `<br/>💡 <strong>Suggestion:</strong> Remove one of the duplicate filters.`
        );
      }
    }
  }

  return warnings;
}

export function updateFilterExports(event: any): void {
  const exportRest = document.getElementById('export-rest')!;
  const exportGraphQL = document.getElementById('export-graphql')!;
  const exportSQL = document.getElementById('export-sql')!;

  if (!event || !event.rest || !event.graphql || !event.sql) {
    exportRest.textContent = 'No filters applied';
    exportGraphQL.textContent = 'No filters applied';
    exportSQL.textContent = 'No filters applied';
    return;
  }

  // REST
  const restQuery = event.rest.queryString || 'No filters';
  exportRest.textContent = restQuery.startsWith('?')
    ? `/api/users${restQuery}`
    : restQuery;

  // GraphQL
  exportGraphQL.textContent = JSON.stringify(event.graphql.where, null, 2);

  // SQL
  const sqlText = event.sql.whereClause
    ? `SELECT * FROM users WHERE ${event.sql.whereClause}\n\nParams: ${JSON.stringify(event.sql.positionalParams)}`
    : 'No filters';
  exportSQL.textContent = sqlText;
}

export function clearFilters(grid: Grid, filterPanel: FilterPanel): void {
  grid.clearFilters();
  filterPanel.clear();
  updateFilterExports(null);
}
