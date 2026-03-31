import type { FieldFilterState } from '../../features/filtering/types';
import { GridApiImpl } from '../../grid/grid-api';
import { PluginHost } from '../../grid/plugin-host';
import { resetDebug } from '../../reactive/debug';
import { resetScheduler } from '../../reactive/effect-scheduler';
import { GridStoreImpl } from '../../reactive/store';
import { resetTracking } from '../../reactive/tracking';
import type { FilterExpression } from '../../types';
import { EventEmitter } from '../../utils';
import { createCorePlugin } from '../core-plugin';
import { createFilterPlugin } from '../filter-plugin';
import { createSortPlugin } from '../sort-plugin';

let store: GridStoreImpl;
let emitter: EventEmitter;
let api: GridApiImpl;
let host: PluginHost;

function normalizeFilterExpression(expression: FilterExpression | null): FilterExpression | null {
  if (!expression) {
    return expression;
  }

  return {
    ...expression,
    fieldState: expression.fieldState
      ? {
          ...expression.fieldState,
          timestamp: 0,
        }
      : expression.fieldState,
    filterExport: expression.filterExport
      ? {
          ...expression.filterExport,
          state: expression.filterExport.state
            ? {
                ...expression.filterExport.state,
                timestamp: 0,
              }
            : expression.filterExport.state,
        }
      : expression.filterExport,
  };
}

beforeEach(() => {
  resetTracking();
  resetDebug();
  resetScheduler();
  store = new GridStoreImpl();
  emitter = new EventEmitter();
  api = new GridApiImpl(store, emitter);
  host = new PluginHost(store, api);
});

describe('FilterPlugin', () => {
  it('throws without core dependency', () => {
    expect(() => host.use(createFilterPlugin())).toThrow('requires "core"');
  });

  it('initializes filter.state = [] and pipeline.filter = undefined', () => {
    host.use(createCorePlugin({ initialData: [[10], [20], [30]] }));
    host.use(createFilterPlugin({ colCount: 1 }));

    expect(store.get('filter.state')).toEqual([]);
    expect(store.get('filter.ast')).toBeNull();
    expect(store.get('pipeline.filter')).toBeUndefined();
  });

  it('filter:setColumn filters rows and produces correct indices', () => {
    host.use(createCorePlugin({ initialData: [[10], [20], [30], [40], [50]] }));
    host.use(createFilterPlugin({ colCount: 1 }));

    store.exec('filter:setColumn', 0, [{ operator: 'greaterThan', value: 25 }]);
    const filtered = store.get('pipeline.filter') as number[];
    expect(filtered).toEqual([2, 3, 4]);
  });

  it('filter:clear resets pipeline.filter to undefined', () => {
    host.use(createCorePlugin({ initialData: [[10], [20], [30]] }));
    host.use(createFilterPlugin({ colCount: 1 }));

    store.exec('filter:setColumn', 0, [{ operator: 'greaterThan', value: 15 }]);
    expect(store.get('pipeline.filter')).toBeDefined();

    store.exec('filter:clear');
    expect(store.get('pipeline.filter')).toBeUndefined();
    expect(store.get('filter.state')).toEqual([]);
    expect(store.get('filter.ast')).toBeNull();
  });

  it('filter:setQuickFilter filters rows and persists a shared expression', () => {
    host.use(createCorePlugin({ initialData: [['Alice'], ['Bob'], ['Alicia']] }));
    host.use(createFilterPlugin({ colCount: 1, columns: [{ field: 'name', header: 'Name' }] }));

    store.exec('filter:setQuickFilter', 'ali', [0]);

    expect(store.get('pipeline.filter')).toEqual([0, 2]);
    expect(store.get('filter.ast')).toEqual(
      (store.get('filter.expression') as FilterExpression | null)?.ast ?? null
    );
    expect(store.get('filter.expression')).toEqual(
      expect.objectContaining({
        type: 'model',
        models: [],
        quickFilter: { query: 'ali', columns: [0] },
      })
    );
  });

  it('filter:setQuickFilter without column scoping searches globally and composes with column filters', () => {
    host.use(
      createCorePlugin({
        initialData: [
          ['Alice', 'Sales', 'Boston'],
          ['Bob', 'Sales', 'Austin'],
          ['Cara', 'Support', 'Boston'],
          ['Alicia', 'Sales', 'Boston'],
        ],
      })
    );
    host.use(
      createFilterPlugin({
        colCount: 3,
        columns: [
          { field: 'name', header: 'Name' },
          { field: 'department', header: 'Department' },
          { field: 'city', header: 'City' },
        ],
      })
    );

    store.exec('filter:setColumn', 1, [{ operator: 'equals', value: 'Sales' }]);
    store.exec('filter:setQuickFilter', 'boston');

    expect(store.get('pipeline.filter')).toEqual([0, 3]);
    expect(store.get('filter.expression')).toEqual(
      expect.objectContaining({
        type: 'model',
        models: [
          {
            column: 1,
            conditions: [{ operator: 'equals', value: 'Sales' }],
            logic: 'AND',
          },
        ],
        quickFilter: { query: 'boston', columns: null },
      })
    );
  });

  it('composed with sort: filter output preserves sort order', () => {
    host.use(createCorePlugin({ initialData: [[50], [10], [40], [20], [30]] }));
    host.use(createSortPlugin());
    host.use(createFilterPlugin({ colCount: 1 }));

    store.exec('sort:toggle', 0);
    const sorted = store.get('pipeline.sort') as number[];
    expect(sorted).toEqual([1, 3, 4, 2, 0]);

    store.exec('filter:setColumn', 0, [{ operator: 'greaterThan', value: 25 }]);
    const filtered = store.get('pipeline.filter') as number[];
    expect(filtered).toEqual([4, 2, 0]);
  });

  it('normalizes field-state entry to the same expression and export shape as model-state entry', () => {
    const fieldState: FieldFilterState = {
      root: {
        logic: 'AND',
        conditions: [{ field: 'score', operator: 'gt', value: 15 }],
      },
      activeFields: ['score'],
      timestamp: Date.now(),
    };

    host.use(
      createCorePlugin({
        initialData: [
          ['Alice', 10],
          ['Bob', 20],
          ['Alicia', 25],
        ],
      })
    );
    host.use(
      createFilterPlugin({
        colCount: 2,
        columns: [
          { field: 'name', header: 'Name' },
          { field: 'score', header: 'Score' },
        ],
      })
    );

    store.exec('filter:setState', [
      {
        column: 1,
        conditions: [{ operator: 'greaterThan', value: 15 }],
        logic: 'AND',
      },
    ]);
    store.exec('filter:setQuickFilter', 'ali', [0]);

    const modelExpression = normalizeFilterExpression(
      store.get('filter.expression') as FilterExpression | null
    );
    const modelExports = normalizeFilterExpression(modelExpression)?.filterExport;

    store.exec('filter:clear');
    store.exec('filter:setFieldState', fieldState);
    store.exec('filter:setQuickFilter', 'ali', [0]);

    const fieldExpression = normalizeFilterExpression(
      store.get('filter.expression') as FilterExpression | null
    );

    expect(store.get('filter.state')).toEqual([
      {
        column: 1,
        conditions: [{ operator: 'greaterThan', value: 15 }],
        logic: 'AND',
      },
    ]);
    expect(fieldExpression).toEqual(modelExpression);
    expect(fieldExpression?.filterExport).toEqual(modelExports);
  });

  it('keeps canonical AST in store and executes grouped field-state filters in the frontend', () => {
    const fieldState: FieldFilterState = {
      root: {
        logic: 'OR',
        conditions: [
          { field: 'score', operator: 'gt', value: 20 },
          { field: 'name', operator: 'eq', value: 'Alice' },
        ],
      },
      activeFields: ['score', 'name'],
      timestamp: Date.now(),
    };

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    host.use(
      createCorePlugin({
        initialData: [
          ['Alice', 10],
          ['Bob', 20],
          ['Alicia', 25],
        ],
      })
    );
    host.use(
      createFilterPlugin({
        colCount: 2,
        columns: [
          { field: 'name', header: 'Name' },
          { field: 'score', header: 'Score' },
        ],
      })
    );

    store.exec('filter:setFieldState', fieldState);

    const expression = normalizeFilterExpression(
      store.get('filter.expression') as FilterExpression | null
    );

    expect(store.get('filter.state')).toEqual([]);
    expect(store.get('pipeline.filter')).toEqual([0, 2]);
    expect(store.get('filter.ast')).toEqual(expression?.ast ?? null);
    expect(expression?.ast).toEqual(
      expect.objectContaining({
        version: 1,
        root: expect.objectContaining({ logic: 'OR' }),
      })
    );
    expect(expression?.fieldState).toEqual({
      ...fieldState,
      timestamp: 0,
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('filter.state is a compatibility projection for structured filters')
    );

    warnSpy.mockRestore();
  });

  it('executes nested grouped field-state filters through pipeline.filter', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    host.use(
      createCorePlugin({
        initialData: [
          ['Alice', 10, 'active'],
          ['Bob', 20, 'pending'],
          ['Cara', 30, 'active'],
        ],
      })
    );
    host.use(
      createFilterPlugin({
        colCount: 3,
        columns: [
          { field: 'name', header: 'Name' },
          { field: 'score', header: 'Score' },
          { field: 'status', header: 'Status' },
        ],
      })
    );

    store.exec('filter:setFieldState', {
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

    expect(store.get('filter.state')).toEqual([]);
    expect(store.get('pipeline.filter')).toEqual([1, 2]);

    warnSpy.mockRestore();
  });

  it('throws and emits filter:error when a structured frontend filter is unexecutable', () => {
    const errors: Error[] = [];
    emitter.on('filter:error', ({ error }) => errors.push(error));

    host.use(
      createCorePlugin({
        initialData: [
          ['Alice', 10],
          ['Bob', 20],
        ],
      })
    );
    host.use(
      createFilterPlugin({
        colCount: 2,
        columns: [
          { field: 'name', header: 'Name' },
          { field: 'score', header: 'Score' },
        ],
      })
    );

    expect(() =>
      store.exec('filter:setFieldState', {
        root: {
          logic: 'AND',
          conditions: [{ field: 'missingField', operator: 'eq', value: 'Alice' }],
        },
        activeFields: ['missingField'],
        timestamp: Date.now(),
      })
    ).toThrow('Structured filter cannot be executed in frontend mode.');

    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain(
      'AST predicate target is missing a column reference for frontend execution.'
    );
  });

  it('API methods are registered', () => {
    host.use(createCorePlugin({ initialData: [[1]] }));
    host.use(createFilterPlugin({ colCount: 1 }));

    expect(api.getMethod('filter', 'setColumnFilter')).toBeDefined();
    expect(api.getMethod('filter', 'clear')).toBeDefined();
    expect(api.getMethod('filter', 'reapply')).toBeDefined();
    expect(api.getMethod('filter', 'getState')).toBeDefined();
    expect(api.getMethod('filter', 'hasActiveFilters')).toBeDefined();
  });

  it('fires filter:change event with correct payload', () => {
    const events: unknown[] = [];
    emitter.on('filter:change', (data: unknown) => events.push(data));

    host.use(createCorePlugin({ initialData: [[10], [20], [30]] }));
    host.use(createFilterPlugin({ colCount: 1 }));

    store.exec('filter:setColumn', 0, [{ operator: 'greaterThan', value: 15 }]);
    expect(events.length).toBe(1);
    expect((events[0] as any).filterState).toBeDefined();
    expect((events[0] as any).previousFilterState).toEqual([]);
  });

  it('destroy cleans up without error', () => {
    host.use(createCorePlugin({ initialData: [[1]] }));
    host.use(createFilterPlugin({ colCount: 1 }));

    expect(() => host.destroy()).not.toThrow();
  });
});
