import type { FilterExpression, FilterQuickState } from '../../types';
import type { FieldFilterCondition, FieldFilterGroup } from '../../features/filtering/types';
import type { ChipDescriptor, ColumnLabelResolver, FilterChipActions } from './filter-ui-types';
import { removeTopLevelCondition, removeTopLevelGroup } from './field-state-utils';

export function buildChipDescriptors(
  expression: FilterExpression | null,
  labels: ColumnLabelResolver,
  actions: FilterChipActions
): ChipDescriptor[] {
  const chips: ChipDescriptor[] = [];
  const fieldRoot = expression?.fieldState?.root ?? null;
  const quickFilter = expression?.quickFilter ?? null;

  if (fieldRoot) {
    chips.push(...buildFieldStateChips(fieldRoot, expression!, labels, actions));
  }

  if (quickFilter?.query?.trim()) {
    chips.push({
      label: describeQuickFilter(quickFilter, labels),
      remove: () => actions.clearQuickFilter(),
    });
  }

  return chips;
}

function buildFieldStateChips(
  root: FieldFilterGroup,
  expression: FilterExpression,
  labels: ColumnLabelResolver,
  actions: FilterChipActions
): ChipDescriptor[] {
  if (root.logic !== 'AND') {
    return [{ label: describeFieldGroup(root, labels), remove: () => actions.applyStructuredRoot(null) }];
  }

  const chips: ChipDescriptor[] = [];
  root.conditions.forEach((condition, index) => {
    chips.push({
      label: describeFieldCondition(condition, labels),
      remove: () =>
        actions.applyStructuredRoot(
          removeTopLevelCondition(expression.fieldState?.root, index)
        ),
    });
  });

  (root.groups ?? []).forEach((group, index) => {
    chips.push({
      label: describeFieldGroup(group, labels),
      remove: () =>
        actions.applyStructuredRoot(removeTopLevelGroup(expression.fieldState?.root, index)),
    });
  });

  return chips;
}

function describeQuickFilter(
  quickFilter: FilterQuickState,
  labels: ColumnLabelResolver
): string {
  const query = formatValue(quickFilter.query);
  if (!quickFilter.columns || quickFilter.columns.length === 0) {
    return `Search ${query}`;
  }

  const columnLabels = quickFilter.columns.map((column) => labels.getColumnLabelByIndex(column));
  return `Search ${columnLabels.join(', ')} ${query}`;
}

function describeFieldGroup(
  group: FieldFilterGroup,
  labels: ColumnLabelResolver,
  nested = false
): string {
  const parts = [
    ...group.conditions.map((condition) => describeFieldCondition(condition, labels)),
    ...(group.groups ?? []).map((child) => describeFieldGroup(child, labels, true)),
  ];

  if (parts.length === 0) return 'Filter group';

  const joined = parts.join(` ${group.logic} `);
  return nested && parts.length > 1 ? `(${joined})` : joined;
}

function describeFieldCondition(
  condition: FieldFilterCondition,
  labels: ColumnLabelResolver
): string {
  const label = labels.getColumnLabelByField(condition.field);

  switch (condition.operator) {
    case 'eq':
    case 'equals':
      return `${label} = ${formatValue(condition.value)}`;
    case 'neq':
    case 'notEquals':
      return `${label} != ${formatValue(condition.value)}`;
    case 'contains':
      return `${label} contains ${formatValue(condition.value)}`;
    case 'notContains':
      return `${label} does not contain ${formatValue(condition.value)}`;
    case 'startsWith':
      return `${label} starts with ${formatValue(condition.value)}`;
    case 'endsWith':
      return `${label} ends with ${formatValue(condition.value)}`;
    case 'gt':
    case 'greaterThan':
      return `${label} > ${formatValue(condition.value)}`;
    case 'gte':
    case 'greaterThanOrEqual':
      return `${label} >= ${formatValue(condition.value)}`;
    case 'lt':
    case 'lessThan':
      return `${label} < ${formatValue(condition.value)}`;
    case 'lte':
    case 'lessThanOrEqual':
      return `${label} <= ${formatValue(condition.value)}`;
    case 'between':
      return `${label} between ${formatValue(condition.value)} and ${formatValue(
        condition.valueTo
      )}`;
    case 'in':
      return `${label} in ${formatValue(condition.value)}`;
    case 'notIn':
      return `${label} not in ${formatValue(condition.value)}`;
    case 'isNull':
    case 'blank':
      return `${label} is blank`;
    case 'isNotNull':
    case 'notBlank':
      return `${label} is not blank`;
    case 'regex':
      return `${label} matches ${formatValue(condition.value)}`;
    default:
      return condition.value === undefined
        ? `${label} ${condition.operator}`
        : `${label} ${condition.operator} ${formatValue(condition.value)}`;
  }
}

function formatValue(value: any): string {
  if (Array.isArray(value)) return `[${value.map((item) => formatValue(item)).join(', ')}]`;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return `"${value}"`;
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  return String(value);
}
