import type {
  ColumnDef,
  FilterAst,
  FilterAstGroupNode,
  FilterAstNode,
  FilterAstPredicateNode,
  FilterAstSearchNode,
  FilterAstTarget,
  FilterCondition,
  FilterModel,
  FilterOperator,
  FilterQuickState,
  FilterValueType,
} from '../../types';
import type {
  FieldFilterCondition,
  FieldFilterGroup,
  FieldFilterState,
  StandardFilterOperator,
} from './types';

const INTERNAL_TO_STANDARD_OPERATOR: Record<FilterOperator, StandardFilterOperator> = {
  equals: 'eq',
  notEquals: 'neq',
  contains: 'contains',
  notContains: 'notContains',
  startsWith: 'startsWith',
  endsWith: 'endsWith',
  greaterThan: 'gt',
  lessThan: 'lt',
  greaterThanOrEqual: 'gte',
  lessThanOrEqual: 'lte',
  blank: 'isNull',
  notBlank: 'isNotNull',
  between: 'between',
  in: 'in',
  notIn: 'notIn',
  regex: 'regex',
};

const STANDARD_TO_INTERNAL_OPERATOR: Record<string, FilterOperator> = {
  eq: 'equals',
  neq: 'notEquals',
  contains: 'contains',
  notContains: 'notContains',
  startsWith: 'startsWith',
  endsWith: 'endsWith',
  gt: 'greaterThan',
  gte: 'greaterThanOrEqual',
  lt: 'lessThan',
  lte: 'lessThanOrEqual',
  isNull: 'blank',
  isNotNull: 'notBlank',
  between: 'between',
  in: 'in',
  notIn: 'notIn',
  regex: 'regex',
};

export interface FilterAstBuildOptions {
  columns?: ColumnDef[];
}

export interface FilterAstCompositionOptions extends FilterAstBuildOptions {
  ast?: FilterAst | null;
  models?: FilterModel[];
  fieldState?: FieldFilterState | null;
  quickFilter?: FilterQuickState | null;
}

export interface FilterAstToModelsOptions {
  columns?: ColumnDef[];
}

export interface FilterAstToModelsResult {
  models: FilterModel[];
  complete: boolean;
  warnings: string[];
}

export interface FilterAstToFieldStateResult {
  state: FieldFilterState;
  complete: boolean;
  warnings: string[];
}

export function toStandardFilterOperator(
  operator: FilterOperator | string
): StandardFilterOperator | string {
  return INTERNAL_TO_STANDARD_OPERATOR[operator as FilterOperator] ?? operator;
}

export function toInternalFilterOperator(
  operator: StandardFilterOperator | string
): FilterOperator | null {
  return STANDARD_TO_INTERNAL_OPERATOR[operator] ?? null;
}

export function buildFilterAstFromModels(
  models: FilterModel[] | null | undefined,
  options: FilterAstBuildOptions = {}
): FilterAst | null {
  if (!models || models.length === 0) {
    return null;
  }

  const children = models
    .map((model) => buildFilterAstNodeFromModel(model, options))
    .filter((node): node is FilterAstNode => node !== null);

  return createFilterAst(children, 'AND', 'model');
}

export function buildFilterAstNodeFromModel(
  model: FilterModel,
  options: FilterAstBuildOptions = {}
): FilterAstNode | null {
  return modelToAstNode(model, options.columns);
}

export function buildFilterAstFromNodes(
  nodes: FilterAstNode[] | null | undefined,
  options: {
    logic?: 'AND' | 'OR';
    source?: FilterAstGroupNode['source'];
  } = {}
): FilterAst | null {
  return createFilterAst(nodes ?? [], options.logic ?? 'AND', options.source ?? 'api');
}

export function buildFilterAstFromFieldState(
  state: FieldFilterState | null | undefined,
  options: FilterAstBuildOptions = {}
): FilterAst | null {
  if (!state?.root) {
    return null;
  }

  return {
    version: 1,
    root: fieldGroupToAstGroup(state.root, options.columns),
  };
}

export function buildFilterAst(options: FilterAstCompositionOptions): FilterAst | null {
  const nodes: FilterAstNode[] = [];

  const baseAst = options.ast?.root
    ? options.ast
    : options.fieldState?.root
      ? buildFilterAstFromFieldState(options.fieldState, options)
      : options.models && options.models.length > 0
        ? buildFilterAstFromModels(options.models, options)
        : null;

  if (baseAst?.root) {
    nodes.push(baseAst.root);
  }

  const quickFilterNode = quickFilterToAstNode(options.quickFilter, options.columns);
  if (quickFilterNode) {
    nodes.push(quickFilterNode);
  }

  return createFilterAst(nodes, 'AND', 'api');
}

export function projectFilterAstToModels(
  ast: FilterAst | null | undefined,
  options: FilterAstToModelsOptions = {}
): FilterAstToModelsResult {
  const warnings: string[] = [];

  if (!ast?.root) {
    return {
      models: [],
      complete: true,
      warnings,
    };
  }

  const models = collectModelsFromGroup(ast.root, options.columns, warnings);

  return {
    models,
    complete: warnings.length === 0,
    warnings,
  };
}

export function projectFilterAstToFieldState(
  ast: FilterAst | null | undefined
): FilterAstToFieldStateResult {
  const warnings: string[] = [];

  if (!ast?.root) {
    return {
      state: {
        root: null,
        activeFields: [],
        timestamp: Date.now(),
      },
      complete: true,
      warnings,
    };
  }

  const root = astGroupToFieldGroup(ast.root, warnings);
  const activeFields = new Set<string>();

  if (root) {
    collectActiveFields(root, activeFields);
  }

  return {
    state: {
      root,
      activeFields: Array.from(activeFields),
      timestamp: Date.now(),
    },
    complete: warnings.length === 0,
    warnings,
  };
}

function modelToAstNode(model: FilterModel, columns?: ColumnDef[]): FilterAstNode | null {
  const target = resolveTargetByColumn(model.column, columns);
  const predicates = model.conditions
    .map((condition) => conditionToPredicateNode(condition, target, 'model'))
    .filter((node): node is FilterAstPredicateNode => node !== null);

  if (predicates.length === 0) {
    return null;
  }

  if (predicates.length === 1) {
    return predicates[0];
  }

  return {
    kind: 'group',
    logic: model.logic ?? 'AND',
    children: predicates,
    source: 'model',
  };
}

function fieldGroupToAstGroup(group: FieldFilterGroup, columns?: ColumnDef[]): FilterAstGroupNode {
  const children: FilterAstNode[] = [];

  for (const condition of group.conditions) {
    const target = resolveTargetByField(condition.field, columns);
    children.push(fieldConditionToPredicateNode(condition, target));
  }

  for (const nested of group.groups ?? []) {
    children.push(fieldGroupToAstGroup(nested, columns));
  }

  return {
    kind: 'group',
    logic: group.logic,
    children,
    source: 'field',
  };
}

function conditionToPredicateNode(
  condition: FilterCondition,
  target: FilterAstTarget,
  source: FilterAstPredicateNode['source']
): FilterAstPredicateNode | null {
  const normalized = normalizeConditionValue(condition.operator, condition.value);

  return {
    kind: 'predicate',
    source,
    target,
    operator: toStandardFilterOperator(condition.operator),
    value: normalized.value,
    valueTo: normalized.valueTo,
    valueType: inferValueType(normalized.value, normalized.valueTo),
    sourceOperator: condition.operator,
  };
}

function fieldConditionToPredicateNode(
  condition: FieldFilterCondition,
  target: FilterAstTarget
): FilterAstPredicateNode {
  return {
    kind: 'predicate',
    source: 'field',
    target,
    operator: condition.operator,
    value: condition.value,
    valueTo: condition.valueTo,
    valueType: inferValueType(condition.value, condition.valueTo),
  };
}

function quickFilterToAstNode(
  quickFilter: FilterQuickState | null | undefined,
  columns?: ColumnDef[]
): FilterAstSearchNode | null {
  const query = quickFilter?.query?.trim() ?? '';
  if (!query) {
    return null;
  }

  const targets = quickFilter?.columns
    ? quickFilter.columns.map((column) => resolveTargetByColumn(column, columns))
    : columns && columns.length > 0
      ? columns.map((column, index) => ({
          column: index,
          field: column.field,
          columnId: column.id,
        }))
      : null;

  return {
    kind: 'search',
    source: 'quickFilter',
    query,
    targets,
  };
}

function collectModelsFromGroup(
  group: FilterAstGroupNode,
  columns: ColumnDef[] | undefined,
  warnings: string[]
): FilterModel[] {
  if (group.logic !== 'AND') {
    warnings.push('Top-level OR groups cannot be represented as FilterModel[].');
    return [];
  }

  const models: FilterModel[] = [];

  for (const child of group.children) {
    if (child.kind === 'group') {
      const model = astNodeToModel(child, columns, warnings);
      if (model) {
        models.push(model);
      }
      continue;
    }

    if (child.kind === 'predicate') {
      const model = astNodeToModel(child, columns, warnings);
      if (model) {
        models.push(model);
      }
      continue;
    }

    warnings.push(`AST node kind "${child.kind}" cannot be represented as FilterModel[].`);
  }

  return models;
}

function astNodeToModel(
  node: FilterAstNode,
  columns: ColumnDef[] | undefined,
  warnings: string[]
): FilterModel | null {
  if (node.kind === 'predicate') {
    const condition = predicateNodeToCondition(node, warnings);
    const column = resolveColumnFromTarget(node.target, columns);

    if (!condition || column === undefined) {
      if (column === undefined) {
        warnings.push(
          'AST predicate target is missing a column reference for FilterModel[] projection.'
        );
      }
      return null;
    }

    return {
      column,
      conditions: [condition],
      logic: 'AND',
    };
  }

  if (node.kind !== 'group') {
    warnings.push(`AST node kind "${node.kind}" cannot be represented as FilterModel[].`);
    return null;
  }

  const predicates = node.children.filter(
    (child): child is FilterAstPredicateNode => child.kind === 'predicate'
  );

  if (predicates.length !== node.children.length) {
    warnings.push(
      'Nested groups, NOT nodes, search nodes, or SQL nodes cannot be flattened into FilterModel[].'
    );
    return null;
  }

  const first = predicates[0];
  if (!first) {
    return null;
  }

  const column = resolveColumnFromTarget(first.target, columns);
  if (column === undefined) {
    warnings.push('AST group target is missing a column reference for FilterModel[] projection.');
    return null;
  }

  const conditions: FilterCondition[] = [];
  for (const predicate of predicates) {
    const predicateColumn = resolveColumnFromTarget(predicate.target, columns);
    if (predicateColumn !== column) {
      warnings.push('Cross-column groups cannot be represented as a single FilterModel.');
      return null;
    }

    const condition = predicateNodeToCondition(predicate, warnings);
    if (!condition) {
      return null;
    }
    conditions.push(condition);
  }

  return {
    column,
    conditions,
    logic: node.logic,
  };
}

function predicateNodeToCondition(
  predicate: FilterAstPredicateNode,
  warnings: string[]
): FilterCondition | null {
  const operator =
    predicate.sourceOperator && isFilterOperator(predicate.sourceOperator)
      ? predicate.sourceOperator
      : toInternalFilterOperator(predicate.operator);

  if (!operator) {
    warnings.push(
      `AST predicate operator "${predicate.operator}" is not supported by FilterModel[] projection.`
    );
    return null;
  }

  if (operator === 'between') {
    if (predicate.valueTo === undefined) {
      warnings.push(
        'BETWEEN predicates require both value and valueTo for FilterModel[] projection.'
      );
      return null;
    }

    return {
      operator,
      value: [predicate.value, predicate.valueTo],
    };
  }

  if (operator === 'blank' || operator === 'notBlank') {
    return {
      operator,
    };
  }

  return {
    operator,
    value: predicate.value,
  };
}

function astGroupToFieldGroup(
  group: FilterAstGroupNode,
  warnings: string[]
): FieldFilterGroup | null {
  const conditions: FieldFilterCondition[] = [];
  const groups: FieldFilterGroup[] = [];

  for (const child of group.children) {
    if (child.kind === 'predicate') {
      if (!child.target.field) {
        warnings.push(
          'AST predicate target is missing a field reference for FieldFilterState projection.'
        );
        continue;
      }

      conditions.push({
        field: child.target.field,
        operator: child.operator,
        value: child.value,
        valueTo: child.valueTo,
      });
      continue;
    }

    if (child.kind === 'group') {
      const nested = astGroupToFieldGroup(child, warnings);
      if (nested) {
        groups.push(nested);
      }
      continue;
    }

    warnings.push(`AST node kind "${child.kind}" cannot be represented as FieldFilterState.`);
  }

  if (conditions.length === 0 && groups.length === 0) {
    return null;
  }

  return {
    logic: group.logic,
    conditions,
    groups: groups.length > 0 ? groups : undefined,
  };
}

function collectActiveFields(group: FieldFilterGroup, activeFields: Set<string>): void {
  for (const condition of group.conditions) {
    activeFields.add(condition.field);
  }

  for (const nested of group.groups ?? []) {
    collectActiveFields(nested, activeFields);
  }
}

function normalizeConditionValue(
  operator: FilterOperator,
  value: any
): { value?: any; valueTo?: any } {
  if (operator === 'between' && Array.isArray(value) && value.length >= 2) {
    return {
      value: value[0],
      valueTo: value[1],
    };
  }

  if (operator === 'blank' || operator === 'notBlank') {
    return {};
  }

  return { value };
}

function inferValueType(value: any, valueTo?: any): FilterValueType {
  const sample = valueTo !== undefined ? valueTo : value;

  if (sample instanceof Date) {
    return 'date';
  }

  if (typeof sample === 'number') {
    return 'number';
  }

  if (typeof sample === 'boolean') {
    return 'boolean';
  }

  if (Array.isArray(sample)) {
    return 'enum';
  }

  if (typeof sample === 'string') {
    return 'text';
  }

  if (sample == null) {
    return 'unknown';
  }

  return 'custom';
}

function resolveTargetByColumn(column: number, columns?: ColumnDef[]): FilterAstTarget {
  const columnDef = columns?.[column];
  return {
    column,
    field: columnDef?.field,
    columnId: columnDef?.id,
  };
}

function resolveTargetByField(field: string, columns?: ColumnDef[]): FilterAstTarget {
  const columnIndex = columns?.findIndex((column) => column.field === field);
  const columnDef =
    columnIndex !== undefined && columnIndex >= 0 ? columns?.[columnIndex] : undefined;

  return {
    field,
    column: columnIndex !== undefined && columnIndex >= 0 ? columnIndex : undefined,
    columnId: columnDef?.id,
  };
}

function resolveColumnFromTarget(
  target: FilterAstTarget,
  columns?: ColumnDef[]
): number | undefined {
  if (typeof target.column === 'number') {
    return target.column;
  }

  if (!target.field || !columns) {
    return undefined;
  }

  const index = columns.findIndex((column) => column.field === target.field);
  return index >= 0 ? index : undefined;
}

function createFilterAst(
  children: FilterAstNode[],
  logic: 'AND' | 'OR',
  source: FilterAstGroupNode['source']
): FilterAst | null {
  const normalizedChildren = children.filter((child) => child !== null);
  if (normalizedChildren.length === 0) {
    return null;
  }

  if (normalizedChildren.length === 1 && normalizedChildren[0].kind === 'group') {
    return {
      version: 1,
      root: normalizedChildren[0],
    };
  }

  return {
    version: 1,
    root: {
      kind: 'group',
      logic,
      children: normalizedChildren,
      source,
    },
  };
}

function isFilterOperator(value: string): value is FilterOperator {
  return value in INTERNAL_TO_STANDARD_OPERATOR;
}
