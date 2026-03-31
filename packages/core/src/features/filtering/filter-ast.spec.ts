import type { FilterModel } from '../../types';
import type { FieldFilterState } from './types';
import {
  buildFilterAst,
  buildFilterAstFromFieldState,
  buildFilterAstFromModels,
  projectFilterAstToFieldState,
  projectFilterAstToModels,
} from './filter-ast';

function normalizeFieldState(state: FieldFilterState): FieldFilterState {
  return {
    ...state,
    timestamp: 0,
  };
}

describe('filter-ast adapters', () => {
  it('projects model filters into an AST and nested field-state groups without losing operator detail', () => {
    const models: FilterModel[] = [
      {
        column: 1,
        logic: 'AND',
        conditions: [
          { operator: 'greaterThanOrEqual', value: 18 },
          { operator: 'lessThan', value: 65 },
        ],
      },
      {
        column: 2,
        logic: 'AND',
        conditions: [{ operator: 'in', value: ['active', 'pending'] }],
      },
      {
        column: 3,
        logic: 'AND',
        conditions: [{ operator: 'between', value: [10, 20] }],
      },
    ];
    const columns = [
      { field: 'name', header: 'Name' },
      { field: 'age', header: 'Age' },
      { field: 'status', header: 'Status' },
      { field: 'score', header: 'Score' },
    ];

    const ast = buildFilterAstFromModels(models, { columns });
    const result = projectFilterAstToFieldState(ast);

    expect(ast).toEqual({
      version: 1,
      root: {
        kind: 'group',
        logic: 'AND',
        source: 'model',
        children: [
          {
            kind: 'group',
            logic: 'AND',
            source: 'model',
            children: [
              {
                kind: 'predicate',
                source: 'model',
                target: { column: 1, field: 'age', columnId: undefined },
                operator: 'gte',
                value: 18,
                valueType: 'number',
                sourceOperator: 'greaterThanOrEqual',
              },
              {
                kind: 'predicate',
                source: 'model',
                target: { column: 1, field: 'age', columnId: undefined },
                operator: 'lt',
                value: 65,
                valueType: 'number',
                sourceOperator: 'lessThan',
              },
            ],
          },
          {
            kind: 'predicate',
            source: 'model',
            target: { column: 2, field: 'status', columnId: undefined },
            operator: 'in',
            value: ['active', 'pending'],
            valueType: 'enum',
            sourceOperator: 'in',
          },
          {
            kind: 'predicate',
            source: 'model',
            target: { column: 3, field: 'score', columnId: undefined },
            operator: 'between',
            value: 10,
            valueTo: 20,
            valueType: 'number',
            sourceOperator: 'between',
          },
        ],
      },
    });
    expect(result.complete).toBe(true);
    expect(normalizeFieldState(result.state)).toEqual({
      root: {
        logic: 'AND',
        conditions: [
          { field: 'status', operator: 'in', value: ['active', 'pending'], valueTo: undefined },
          { field: 'score', operator: 'between', value: 10, valueTo: 20 },
        ],
        groups: [
          {
            logic: 'AND',
            conditions: [
              { field: 'age', operator: 'gte', value: 18, valueTo: undefined },
              { field: 'age', operator: 'lt', value: 65, valueTo: undefined },
            ],
          },
        ],
      },
      activeFields: ['status', 'score', 'age'],
      timestamp: 0,
    });
  });

  it('round-trips nested field-state groups through the AST without losing structure', () => {
    const state: FieldFilterState = {
      root: {
        logic: 'OR',
        conditions: [{ field: 'role', operator: 'eq', value: 'admin' }],
        groups: [
          {
            logic: 'AND',
            conditions: [
              { field: 'age', operator: 'gte', value: 18 },
              { field: 'age', operator: 'lt', value: 65 },
            ],
          },
          {
            logic: 'AND',
            conditions: [{ field: 'status', operator: 'in', value: ['active', 'pending'] }],
          },
        ],
      },
      activeFields: ['role', 'age', 'status'],
      timestamp: 123,
    };
    const columns = [
      { field: 'role', header: 'Role' },
      { field: 'age', header: 'Age' },
      { field: 'status', header: 'Status' },
    ];

    const ast = buildFilterAstFromFieldState(state, { columns });
    const projected = projectFilterAstToFieldState(ast);

    expect(projected.complete).toBe(true);
    expect(normalizeFieldState(projected.state)).toEqual({
      root: state.root,
      activeFields: state.activeFields,
      timestamp: 0,
    });
  });

  it('marks model projection incomplete when a field-state AST contains a cross-column OR root', () => {
    const state: FieldFilterState = {
      root: {
        logic: 'OR',
        conditions: [
          { field: 'age', operator: 'gte', value: 18 },
          { field: 'status', operator: 'eq', value: 'active' },
        ],
      },
      activeFields: ['age', 'status'],
      timestamp: Date.now(),
    };
    const columns = [
      { field: 'age', header: 'Age' },
      { field: 'status', header: 'Status' },
    ];

    const ast = buildFilterAstFromFieldState(state, { columns });
    const projected = projectFilterAstToModels(ast, { columns });

    expect(projected.models).toEqual([]);
    expect(projected.complete).toBe(false);
    expect(projected.warnings).toContain(
      'Top-level OR groups cannot be represented as FilterModel[].'
    );
  });

  it('composes an existing canonical AST with quick filter search', () => {
    const baseAst = buildFilterAstFromFieldState(
      {
        root: {
          logic: 'AND',
          conditions: [{ field: 'status', operator: 'eq', value: 'active' }],
        },
        activeFields: ['status'],
        timestamp: Date.now(),
      },
      {
        columns: [
          { field: 'name', header: 'Name' },
          { field: 'status', header: 'Status' },
        ],
      }
    );

    const ast = buildFilterAst({
      ast: baseAst,
      quickFilter: { query: 'ali', columns: [0] },
      columns: [
        { field: 'name', header: 'Name' },
        { field: 'status', header: 'Status' },
      ],
    });

    expect(ast).toEqual({
      version: 1,
      root: {
        kind: 'group',
        logic: 'AND',
        source: 'api',
        children: [
          {
            kind: 'group',
            logic: 'AND',
            source: 'field',
            children: [
              {
                kind: 'predicate',
                source: 'field',
                target: { column: 1, field: 'status', columnId: undefined },
                operator: 'eq',
                value: 'active',
                valueType: 'text',
              },
            ],
          },
          {
            kind: 'search',
            source: 'quickFilter',
            query: 'ali',
            targets: [{ column: 0, field: 'name', columnId: undefined }],
          },
        ],
      },
    });
  });

  it('composes predicate filters and quick filter search into one AST root', () => {
    const ast = buildFilterAst({
      models: [
        {
          column: 0,
          conditions: [{ operator: 'contains', value: 'ali' }],
          logic: 'AND',
        },
      ],
      quickFilter: { query: 'ali', columns: [0] },
      columns: [{ field: 'name', header: 'Name' }],
    });

    expect(ast).toEqual({
      version: 1,
      root: {
        kind: 'group',
        logic: 'AND',
        source: 'api',
        children: [
          {
            kind: 'group',
            logic: 'AND',
            source: 'model',
            children: [
              {
                kind: 'predicate',
                source: 'model',
                target: { column: 0, field: 'name', columnId: undefined },
                operator: 'contains',
                value: 'ali',
                valueType: 'text',
                sourceOperator: 'contains',
              },
            ],
          },
          {
            kind: 'search',
            source: 'quickFilter',
            query: 'ali',
            targets: [{ column: 0, field: 'name', columnId: undefined }],
          },
        ],
      },
    });
  });

  it('normalizes malformed between values without unsafe array access', () => {
    const ast = buildFilterAstFromModels(
      [
        {
          column: 0,
          logic: 'AND',
          conditions: [{ operator: 'between', value: [10] }],
        },
      ],
      {
        columns: [{ field: 'score', header: 'Score' }],
      }
    );

    expect(ast).toEqual({
      version: 1,
      root: {
        kind: 'group',
        logic: 'AND',
        source: 'model',
        children: [
          {
            kind: 'predicate',
            source: 'model',
            target: { column: 0, field: 'score', columnId: undefined },
            operator: 'between',
            value: [10],
            valueTo: undefined,
            valueType: 'enum',
            sourceOperator: 'between',
          },
        ],
      },
    });
  });
});
