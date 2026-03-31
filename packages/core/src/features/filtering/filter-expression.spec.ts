import { buildModelFilterExpression, hasActiveFilterExpression } from './filter-expression';

describe('filter-expression helpers', () => {
  it('buildModelFilterExpression fills defaults for quick filter, ast, and exports', () => {
    expect(buildModelFilterExpression({ models: [] })).toEqual({
      type: 'model',
      ast: null,
      models: [],
      quickFilter: { query: '', columns: null },
      fieldState: null,
      filterExport: null,
    });
  });

  it('treats quick-filter-only expressions as active', () => {
    expect(
      hasActiveFilterExpression({
        type: 'model',
        ast: {
          version: 1,
          root: {
            kind: 'group',
            logic: 'AND',
            children: [
              {
                kind: 'search',
                source: 'quickFilter',
                query: 'alice',
                targets: [{ column: 0 }],
              },
            ],
            source: 'api',
          },
        },
        models: [],
        quickFilter: { query: 'alice', columns: [0] },
        fieldState: null,
        filterExport: null,
      })
    ).toBe(true);
  });

  it('treats structured AST expressions as active even without legacy models', () => {
    expect(
      hasActiveFilterExpression({
        type: 'model',
        ast: {
          version: 1,
          root: {
            kind: 'group',
            logic: 'OR',
            source: 'field',
            children: [
              {
                kind: 'predicate',
                source: 'field',
                target: { field: 'score' },
                operator: 'gt',
                value: 20,
              },
            ],
          },
        },
        models: [],
        quickFilter: { query: '', columns: null },
        fieldState: null,
        filterExport: null,
      })
    ).toBe(true);
  });

  it('treats empty model expressions as inactive', () => {
    expect(
      hasActiveFilterExpression({
        type: 'model',
        ast: null,
        models: [],
        quickFilter: { query: '', columns: null },
        fieldState: null,
        filterExport: null,
      })
    ).toBe(false);
  });

  it('treats sql-origin expressions with a canonical AST as active', () => {
    expect(
      hasActiveFilterExpression({
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
              },
            ],
          },
        },
        sql: 'age > :minAge',
        boundSql: 'age > ?',
        params: [18],
      })
    ).toBe(true);
  });
});
