import { FilterQueryParser } from './filter-query-parser';

describe('FilterQueryParser', () => {
  let parser: FilterQueryParser;

  beforeEach(() => {
    parser = new FilterQueryParser();
  });

  it('lowers simple SQL comparisons into semantic AST predicates and preserves positional params', () => {
    const expression = parser.parse({
      sql: 'age > :minAge AND status = :status',
      params: { minAge: 18, status: 'active' },
    });

    expect(expression).toEqual({
      type: 'sql',
      ast: {
        version: 1,
        root: {
          kind: 'group',
          logic: 'AND',
          source: 'sql',
          children: [
            {
              kind: 'predicate',
              source: 'sql',
              target: { field: 'age' },
              operator: 'gt',
              value: 18,
              valueTo: undefined,
              valueType: 'number',
              sourceOperator: 'greaterThan',
            },
            {
              kind: 'predicate',
              source: 'sql',
              target: { field: 'status' },
              operator: 'eq',
              value: 'active',
              valueTo: undefined,
              valueType: 'text',
              sourceOperator: 'equals',
            },
          ],
        },
      },
      sql: 'age > :minAge AND status = :status',
      boundSql: 'age > ? AND status = ?',
      params: [18, 'active'],
    });
  });

  it('lowers grouped BETWEEN and LIKE expressions into semantic AST nodes', () => {
    const expression = parser.parse({
      sql: 'age BETWEEN :min AND :max AND (name LIKE :search OR email LIKE :search)',
      params: { min: 18, max: 65, search: '%john%' },
    });

    expect(expression).toEqual({
      type: 'sql',
      ast: {
        version: 1,
        root: {
          kind: 'group',
          logic: 'AND',
          source: 'sql',
          children: [
            {
              kind: 'predicate',
              source: 'sql',
              target: { field: 'age' },
              operator: 'between',
              value: 18,
              valueTo: 65,
              valueType: 'number',
              sourceOperator: 'between',
            },
            {
              kind: 'group',
              logic: 'OR',
              source: 'sql',
              children: [
                {
                  kind: 'predicate',
                  source: 'sql',
                  target: { field: 'name' },
                  operator: 'contains',
                  value: 'john',
                  valueTo: undefined,
                  valueType: 'text',
                  sourceOperator: 'contains',
                },
                {
                  kind: 'predicate',
                  source: 'sql',
                  target: { field: 'email' },
                  operator: 'contains',
                  value: 'john',
                  valueTo: undefined,
                  valueType: 'text',
                  sourceOperator: 'contains',
                },
              ],
            },
          ],
        },
      },
      sql: 'age BETWEEN :min AND :max AND (name LIKE :search OR email LIKE :search)',
      boundSql: 'age BETWEEN ? AND ? AND (name LIKE ? OR email LIKE ?)',
      params: [18, 65, '%john%', '%john%'],
    });
  });

  it('lowers NOT LIKE, NOT IN, and IS NULL into semantic AST operators and not nodes', () => {
    const expression = parser.parse({
      sql: "deletedAt IS NULL OR status NOT IN ('archived', 'deleted') OR name NOT LIKE 'Ali%'",
    });

    expect(expression.ast).toEqual({
      version: 1,
      root: {
        kind: 'group',
        logic: 'OR',
        source: 'sql',
        children: [
          {
            kind: 'predicate',
            source: 'sql',
            target: { field: 'deletedAt' },
            operator: 'isNull',
            value: undefined,
            valueTo: undefined,
            valueType: 'unknown',
            sourceOperator: 'blank',
          },
          {
            kind: 'predicate',
            source: 'sql',
            target: { field: 'status' },
            operator: 'notIn',
            value: ['archived', 'deleted'],
            valueTo: undefined,
            valueType: 'enum',
            sourceOperator: 'notIn',
          },
          {
            kind: 'not',
            source: 'sql',
            child: {
              kind: 'predicate',
              source: 'sql',
              target: { field: 'name' },
              operator: 'startsWith',
              value: 'Ali',
              valueTo: undefined,
              valueType: 'text',
              sourceOperator: 'startsWith',
            },
          },
        ],
      },
    });
  });

  it('keeps named parameter values out of SQL text and emits positional params safely', () => {
    const expression = parser.parse({
      sql: 'status = :status',
      params: { status: "active' OR 1=1 --" },
    });

    expect(expression.boundSql).toBe('status = ?');
    expect(expression.params).toEqual(["active' OR 1=1 --"]);
    expect(expression.ast).toEqual({
      version: 1,
      root: {
        kind: 'group',
        logic: 'AND',
        source: 'sql',
        children: [
          {
            kind: 'predicate',
            source: 'sql',
            target: { field: 'status' },
            operator: 'eq',
            value: "active' OR 1=1 --",
            valueTo: undefined,
            valueType: 'text',
            sourceOperator: 'equals',
          },
        ],
      },
    });
  });

  it('throws when a named parameter is referenced but not provided', () => {
    expect(() =>
      parser.parse({
        sql: 'status = :status',
        params: {},
      })
    ).toThrow('Failed to parse filter query: Missing named parameter :status');
  });

  it('maps representable SQL clauses to column filter models through the semantic AST', () => {
    parser.setColumnMapping({ status: 0, age: 1, name: 2 });

    const models = parser.parseToModels(
      {
        sql: 'age >= :minAge AND name LIKE :search AND status = :status',
        params: { minAge: 18, search: '%ali%', status: 'active' },
      },
      []
    );

    expect(models).toEqual([
      {
        column: 1,
        conditions: [{ operator: 'greaterThanOrEqual', value: 18 }],
        logic: 'AND',
      },
      {
        column: 2,
        conditions: [{ operator: 'contains', value: 'ali' }],
        logic: 'AND',
      },
      {
        column: 0,
        conditions: [{ operator: 'equals', value: 'active' }],
        logic: 'AND',
      },
    ]);
  });

  it('maps field names through the provided columnNames fallback when no explicit mapping is set', () => {
    const models = parser.parseToModels(
      {
        sql: 'city = :city AND name LIKE :search',
        params: { city: 'Boston', search: 'Ali%' },
      },
      ['id', 'name', 'city']
    );

    expect(models).toEqual([
      {
        column: 2,
        conditions: [{ operator: 'equals', value: 'Boston' }],
        logic: 'AND',
      },
      {
        column: 1,
        conditions: [{ operator: 'startsWith', value: 'Ali' }],
        logic: 'AND',
      },
    ]);
  });

  it('returns an empty model list for semantic SQL shapes that cannot be flattened to FilterModel[]', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const models = parser.parseToModels(
      { sql: 'age > :minAge OR status = :status', params: { minAge: 18, status: 'active' } },
      ['age', 'status']
    );

    expect(models).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Converting SQL to FilterModels has limitations')
    );

    warnSpy.mockRestore();
  });
});
