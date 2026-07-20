import type { FilterOperator } from '../../types';
import type { OperatorOption } from './filter-ui-types';

const TEXT_OPERATORS: OperatorOption[] = [
  { value: 'contains', label: 'Contains', valueCount: 1 },
  { value: 'equals', label: 'Equals', valueCount: 1 },
  { value: 'startsWith', label: 'Starts with', valueCount: 1 },
  { value: 'endsWith', label: 'Ends with', valueCount: 1 },
  { value: 'notContains', label: 'Not contains', valueCount: 1 },
  { value: 'notEquals', label: 'Not equals', valueCount: 1 },
  { value: 'blank', label: 'Is blank', valueCount: 0 },
  { value: 'notBlank', label: 'Is not blank', valueCount: 0 },
];

const NUMBER_OPERATORS: OperatorOption[] = [
  { value: 'equals', label: 'Equals', valueCount: 1 },
  { value: 'notEquals', label: 'Not equals', valueCount: 1 },
  { value: 'greaterThan', label: 'Greater than', valueCount: 1 },
  { value: 'greaterThanOrEqual', label: 'Greater than or equal', valueCount: 1 },
  { value: 'lessThan', label: 'Less than', valueCount: 1 },
  { value: 'lessThanOrEqual', label: 'Less than or equal', valueCount: 1 },
  { value: 'between', label: 'Between', valueCount: 2 },
  { value: 'blank', label: 'Is blank', valueCount: 0 },
  { value: 'notBlank', label: 'Is not blank', valueCount: 0 },
];

const DATE_OPERATORS: OperatorOption[] = [
  { value: 'equals', label: 'Equals', valueCount: 1 },
  { value: 'greaterThan', label: 'After', valueCount: 1 },
  { value: 'lessThan', label: 'Before', valueCount: 1 },
  { value: 'between', label: 'Between', valueCount: 2 },
  { value: 'blank', label: 'Is blank', valueCount: 0 },
  { value: 'notBlank', label: 'Is not blank', valueCount: 0 },
];

export function getOperatorsForType(type: string): OperatorOption[] {
  switch (type) {
    case 'number':
      return NUMBER_OPERATORS;
    case 'date':
      return DATE_OPERATORS;
    default:
      return TEXT_OPERATORS;
  }
}

export function getOperatorValueCount(operator: FilterOperator, type: string): 0 | 1 | 2 {
  return getOperatorsForType(type).find((op) => op.value === operator)?.valueCount ?? 1;
}

export function buildCondition(
  operator: FilterOperator,
  dropdownType: string,
  value: string,
  valueTo: string
): { operator: string; value?: any } {
  const valueCount = getOperatorValueCount(operator, dropdownType);
  if (valueCount === 0) return { operator };
  if (valueCount === 2) {
    return {
      operator,
      value: [parseInputValue(value, dropdownType), parseInputValue(valueTo, dropdownType)],
    };
  }
  return { operator, value: parseInputValue(value, dropdownType) };
}

function parseInputValue(value: string, dropdownType: string): any {
  if (dropdownType === 'number') {
    const num = Number(value);
    return Number.isNaN(num) ? value : num;
  }

  if (dropdownType === 'date') {
    const ts = Date.parse(value);
    return Number.isNaN(ts) ? value : ts;
  }

  return value;
}
