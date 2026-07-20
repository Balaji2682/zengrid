import type { FieldFilterGroup, FieldFilterState } from '../../features/filtering/types';

export function createFieldState(root: FieldFilterGroup | null): FieldFilterState {
  return {
    root,
    activeFields: collectActiveFields(root),
    timestamp: Date.now(),
  };
}

export function collectActiveFields(root: FieldFilterGroup | null): string[] {
  if (!root) return [];

  const fields = new Set<string>();
  const visit = (group: FieldFilterGroup) => {
    for (const condition of group.conditions) {
      fields.add(condition.field);
    }
    for (const nested of group.groups ?? []) {
      visit(nested);
    }
  };

  visit(root);
  return Array.from(fields);
}

export function removeTopLevelCondition(
  root: FieldFilterGroup | null | undefined,
  conditionIndex: number
): FieldFilterGroup | null {
  if (!root || root.logic !== 'AND') return null;
  return normalizeFieldGroup({
    logic: root.logic,
    conditions: root.conditions.filter((_, index) => index !== conditionIndex),
    groups: root.groups ? [...root.groups] : undefined,
  });
}

export function removeTopLevelGroup(
  root: FieldFilterGroup | null | undefined,
  groupIndex: number
): FieldFilterGroup | null {
  if (!root || root.logic !== 'AND') return null;
  return normalizeFieldGroup({
    logic: root.logic,
    conditions: [...root.conditions],
    groups: root.groups?.filter((_, index) => index !== groupIndex),
  });
}

function normalizeFieldGroup(group: FieldFilterGroup): FieldFilterGroup | null {
  const normalizedGroups = group.groups?.filter(
    (nested) => nested.conditions.length > 0 || (nested.groups?.length ?? 0) > 0
  );

  if (group.conditions.length === 0 && (normalizedGroups?.length ?? 0) === 0) {
    return null;
  }

  return {
    logic: group.logic,
    conditions: [...group.conditions],
    groups: normalizedGroups && normalizedGroups.length > 0 ? normalizedGroups : undefined,
  };
}
