import { FilterAstCompiler } from '../filter-ast-compiler';
import type { FieldFilterState } from '../types';
import { FilterManager } from './index';

function createRows() {
  return [
    ['Alice', 10, 'active'],
    ['Bob', 20, 'pending'],
    ['Cara', 30, 'active'],
  ];
}

function createManager() {
  const rows = createRows();

  return new FilterManager({
    colCount: 3,
    columns: [
      { field: 'name', header: 'Name' },
      { field: 'score', header: 'Score' },
      { field: 'status', header: 'Status' },
    ],
    getValue: (row, col) => rows[row]?.[col],
  });
}

function normalizeFieldState(state: FieldFilterState | null): FieldFilterState | null {
  if (!state) {
    return state;
  }

  return {
    ...state,
    timestamp: 0,
  };
}

describe('FilterManager canonical AST state', () => {
  it('stores field-state input as canonical AST while deriving legacy FilterModel state', () => {
    const manager = createManager();

    manager.setFieldFilter({
      root: {
        logic: 'AND',
        conditions: [{ field: 'score', operator: 'gt', value: 15 }],
      },
      activeFields: ['score'],
      timestamp: Date.now(),
    });

    expect(manager.getFilterAst()).toEqual(
      expect.objectContaining({
        version: 1,
        root: expect.objectContaining({ logic: 'AND' }),
      })
    );
    expect(manager.getFilterState()).toEqual([
      {
        column: 1,
        conditions: [{ operator: 'greaterThan', value: 15 }],
        logic: 'AND',
      },
    ]);
    expect(normalizeFieldState(manager.getFieldFilterState())).toEqual({
      root: {
        logic: 'AND',
        conditions: [{ field: 'score', operator: 'gt', value: 15, valueTo: undefined }],
      },
      activeFields: ['score'],
      timestamp: 0,
    });
  });

  it('executes top-level OR AST filters in frontend mode while keeping FilterModel[] empty', () => {
    const manager = createManager();

    manager.setFieldFilter({
      root: {
        logic: 'OR',
        conditions: [
          { field: 'score', operator: 'gt', value: 25 },
          { field: 'status', operator: 'eq', value: 'pending' },
        ],
      },
      activeFields: ['score', 'status'],
      timestamp: Date.now(),
    });

    expect(manager.getFilterState()).toEqual([]);
    expect(manager.hasActiveFilters()).toBe(true);
    expect(manager.hasStructuredFilters()).toBe(true);
    expect(manager.isUsingAstExecution()).toBe(true);
    expect(manager.getVisibleRows(3)).toEqual([1, 2]);
    expect(manager.getAstProjectionWarnings()).toContain(
      'Top-level OR groups cannot be represented as FilterModel[].'
    );
    expect(normalizeFieldState(manager.getFieldFilterState())).toEqual({
      root: {
        logic: 'OR',
        conditions: [
          { field: 'score', operator: 'gt', value: 25, valueTo: undefined },
          { field: 'status', operator: 'eq', value: 'pending', valueTo: undefined },
        ],
      },
      activeFields: ['score', 'status'],
      timestamp: 0,
    });
  });

  it('executes nested grouped AST filters in frontend mode', () => {
    const manager = createManager();

    manager.setFieldFilter({
      root: {
        logic: 'OR',
        conditions: [{ field: 'name', operator: 'eq', value: 'Bob' }],
        groups: [
          {
            logic: 'AND',
            conditions: [
              { field: 'score', operator: 'gt', value: 15 },
              { field: 'status', operator: 'eq', value: 'active' },
            ],
          },
        ],
      },
      activeFields: ['name', 'score', 'status'],
      timestamp: Date.now(),
    });

    expect(manager.getFilterState()).toEqual([]);
    expect(manager.hasActiveFilters()).toBe(true);
    expect(manager.getVisibleRows(3)).toEqual([1, 2]);
  });

  it('executes semantic SQL AST filters in frontend mode', async () => {
    const manager = createManager();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await manager.applyFilter({
      sql: 'score > :minScore OR status = :status',
      params: { minScore: 25, status: 'pending' },
    });

    expect(manager.hasStructuredFilters()).toBe(true);
    expect(manager.hasActiveFilters()).toBe(true);
    expect(manager.isUsingAstExecution()).toBe(true);
    expect(manager.getFilterState()).toEqual([]);
    expect(manager.getVisibleRows(3)).toEqual([1, 2]);

    warnSpy.mockRestore();
  });

  it('stores SQL input as semantic AST and canonicalizes representable state internally', async () => {
    const manager = createManager();

    await manager.applyFilter({
      sql: 'score > :minScore AND status = :status',
      params: { minScore: 15, status: 'active' },
    });

    const expression = manager.getCurrentExpression();

    expect(expression?.ast).toEqual(
      expect.objectContaining({
        version: 1,
        root: expect.objectContaining({ logic: 'AND', source: 'model' }),
      })
    );
    expect(manager.getFilterAst()).toEqual(
      expect.objectContaining({
        version: 1,
        root: expect.objectContaining({ logic: 'AND', source: 'model' }),
      })
    );
    expect(manager.getFilterState()).toEqual([
      {
        column: 1,
        conditions: [{ operator: 'greaterThan', value: 15 }],
        logic: 'AND',
      },
      {
        column: 2,
        conditions: [{ operator: 'equals', value: 'active' }],
        logic: 'AND',
      },
    ]);
    expect(manager.hasStructuredFilters()).toBe(true);
    expect(normalizeFieldState(expression?.fieldState ?? null)).toEqual({
      root: {
        logic: 'AND',
        conditions: [
          { field: 'score', operator: 'gt', value: 15, valueTo: undefined },
          { field: 'status', operator: 'eq', value: 'active', valueTo: undefined },
        ],
      },
      activeFields: ['score', 'status'],
      timestamp: 0,
    });
    expect(normalizeFieldState(expression?.filterExport?.state ?? null)).toEqual({
      root: {
        logic: 'AND',
        conditions: [
          { field: 'score', operator: 'gt', value: 15, valueTo: undefined },
          { field: 'status', operator: 'eq', value: 'active', valueTo: undefined },
        ],
      },
      activeFields: ['score', 'status'],
      timestamp: 0,
    });
    expect(expression).toEqual(
      expect.objectContaining({
        type: 'sql',
        ast: expect.objectContaining({
          version: 1,
          root: expect.objectContaining({ logic: 'AND', source: 'model' }),
        }),
      })
    );
  });

  it('throws when structured filters cannot execute in frontend mode', () => {
    const manager = createManager();

    manager.setFieldFilter({
      root: {
        logic: 'AND',
        conditions: [{ field: 'missingField', operator: 'eq', value: 'Alice' }],
      },
      activeFields: ['missingField'],
      timestamp: Date.now(),
    });

    expect(manager.hasStructuredFilters()).toBe(true);
    expect(manager.hasActiveFilters()).toBe(true);
    expect(manager.hasUnexecutableFilters()).toBe(true);
    expect(() => manager.testRow(0)).toThrow(
      'Structured filter cannot be executed in frontend mode.'
    );
    expect(() => manager.getVisibleRows(3)).toThrow(
      'AST predicate target is missing a column reference for frontend execution.'
    );
  });

  it('reuses filter-state snapshots until the state changes', () => {
    const manager = createManager();

    manager.setColumnFilter(1, [{ operator: 'greaterThan', value: 15 }]);

    const firstSnapshot = manager.getFilterState();
    const secondSnapshot = manager.getFilterState();

    expect(firstSnapshot).toBe(secondSnapshot);

    manager.setColumnFilter(2, [{ operator: 'equals', value: 'active' }]);

    expect(manager.getFilterState()).not.toBe(firstSnapshot);
  });
});

describe('FilterAstCompiler', () => {
  it('evaluates search nodes using joined row text across scoped columns', () => {
    const rows = [
      ['Alice', 'Sales', 'Boston'],
      ['Alice', 'Support', 'Boston'],
      ['Bob', 'Sales', 'Austin'],
    ];

    const compiler = new FilterAstCompiler({
      colCount: 3,
      columns: [
        { field: 'name', header: 'Name' },
        { field: 'department', header: 'Department' },
        { field: 'city', header: 'City' },
      ],
      getValue: (row, col) => rows[row]?.[col],
    });

    const compiled = compiler.compile({
      version: 1,
      root: {
        kind: 'group',
        logic: 'AND',
        source: 'api',
        children: [
          {
            kind: 'search',
            source: 'quickFilter',
            query: 'alice sales',
            targets: [{ column: 0 }, { column: 1 }],
          },
        ],
      },
    });

    expect(compiled.warnings).toEqual([]);
    expect(compiled.predicate?.(0)).toBe(true);
    expect(compiled.predicate?.(1)).toBe(false);
    expect(compiled.predicate?.(2)).toBe(false);
  });

  it('marks predicates without a resolvable column as unexecutable for frontend filtering', () => {
    const compiler = new FilterAstCompiler({
      colCount: 1,
      getValue: () => undefined,
    });

    const compiled = compiler.compile({
      version: 1,
      root: {
        kind: 'group',
        logic: 'AND',
        source: 'sql',
        children: [
          {
            kind: 'predicate',
            source: 'sql',
            target: { field: 'score' },
            operator: 'gt',
            value: 10,
          },
        ],
      },
    });

    expect(compiled.predicate).toBeNull();
    expect(compiled.complete).toBe(false);
    expect(compiled.warnings).toEqual([
      'AST predicate target is missing a column reference for frontend execution.',
    ]);
  });
});
