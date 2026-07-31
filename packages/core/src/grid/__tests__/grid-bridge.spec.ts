import { Zengrid } from '../grid-core';
import { resetTracking } from '../../reactive/tracking';
import { resetDebug } from '../../reactive/debug';
import { resetScheduler } from '../../reactive/effect-scheduler';

let container: HTMLElement;
let grid: Zengrid;

const DATA = [
  [30, 'Charlie'],
  [10, 'Alice'],
  [20, 'Bob'],
];

beforeEach(() => {
  resetTracking();
  resetDebug();
  resetScheduler();
  container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: 400, configurable: true });
  Object.defineProperty(container, 'clientHeight', { value: 300, configurable: true });
  document.body.appendChild(container);
  grid = new Zengrid(container, { rowCount: 3, colCount: 2, rowHeight: 30, colWidth: 100 });
});

afterEach(() => {
  grid.destroy();
  if (container.parentNode) container.parentNode.removeChild(container);
});

describe('Grid Bridge: setData', () => {
  it('syncs rows.raw, rows.count, rows.indices to store', () => {
    grid.setData(DATA);
    const store = grid.getStore();
    expect(store.get('rows.raw')).toEqual(DATA);
    expect(store.get('rows.count')).toBe(3);
    expect(store.get('rows.indices')).toEqual([0, 1, 2]);
  });
});

describe('Grid Bridge: sort operations', () => {
  beforeEach(() => {
    grid.setData(DATA);
  });

  it('toggleSort syncs sort.state and pipeline.sort to store', () => {
    grid.toggleSort(0);
    const store = grid.getStore();
    const state = store.get('sort.state') as any[];
    expect(state.length).toBe(1);
    expect(state[0].column).toBe(0);
    const sorted = store.get('pipeline.sort') as number[];
    // Ascending by column 0: 10(idx1), 20(idx2), 30(idx0)
    expect(sorted).toEqual([1, 2, 0]);
  });

  it('clearSort resets sort state in store', () => {
    grid.toggleSort(0);
    grid.clearSort();
    const store = grid.getStore();
    expect(store.get('sort.state')).toEqual([]);
    expect(store.get('pipeline.sort')).toBeUndefined();
  });

  it('sort(col, dir) syncs to store', () => {
    grid.sort.apply([{ column: 0, direction: 'desc' }]);
    const store = grid.getStore();
    const state = store.get('sort.state') as any[];
    expect(state).toEqual([{ column: 0, direction: 'desc' }]);
    const sorted = store.get('pipeline.sort') as number[];
    // Descending: 30(idx0), 20(idx2), 10(idx1)
    expect(sorted).toEqual([0, 2, 1]);
  });

  it('sort(col, null) clears sort in store', () => {
    grid.sort.apply([{ column: 0, direction: 'asc' }]);
    grid.sort.clear();
    const store = grid.getStore();
    expect(store.get('sort.state')).toEqual([]);
    expect(store.get('pipeline.sort')).toBeUndefined();
  });

  it('setSortState syncs to store', () => {
    grid.setSortState([{ column: 0, direction: 'asc' }]);
    const store = grid.getStore();
    const state = store.get('sort.state') as any[];
    expect(state).toEqual([{ column: 0, direction: 'asc' }]);
    expect(store.get('pipeline.sort')).toBeDefined();
  });
});

describe('Grid Bridge: filter operations', () => {
  beforeEach(() => {
    grid.setData(DATA);
  });

  it('setColumnFilter syncs filter.state and pipeline.filter to store', () => {
    grid.setColumnFilter(0, [{ operator: 'greaterThan', value: 15 }]);
    const store = grid.getStore();
    const state = store.get('filter.state') as any[];
    expect(state.length).toBeGreaterThan(0);
    const pipeline = store.get('pipeline.filter') as number[];
    expect(pipeline).toBeDefined();
    // Rows with col 0 > 15: idx 0 (30), idx 2 (20)
    expect(pipeline).toEqual(expect.arrayContaining([0, 2]));
    expect(pipeline).not.toContain(1);
  });

  it('clearFilters resets filter state in store', () => {
    grid.setColumnFilter(0, [{ operator: 'greaterThan', value: 15 }]);
    grid.clearFilters();
    const store = grid.getStore();
    expect(store.get('filter.state')).toEqual([]);
    expect(store.get('pipeline.filter')).toBeUndefined();
  });

  it('clearColumnFilter clears single column in store', () => {
    grid.setColumnFilter(0, [{ operator: 'greaterThan', value: 15 }]);
    grid.clearColumnFilter(0);
    const store = grid.getStore();
    expect(store.get('filter.state')).toEqual([]);
    expect(store.get('pipeline.filter')).toBeUndefined();
  });

  it('setFilter (single condition) syncs to store', () => {
    grid.setFilter(0, 'gt', 15);
    const store = grid.getStore();
    const state = store.get('filter.state') as any[];
    expect(state.length).toBeGreaterThan(0);
  });

  it('setFilterState re-applies all models to store', () => {
    grid.setFilterState([
      { column: 0, conditions: [{ operator: 'greaterThan', value: 15 }], logic: 'AND' },
    ]);
    const store = grid.getStore();
    const state = store.get('filter.state') as any[];
    expect(state.length).toBeGreaterThan(0);
  });
});

describe('Grid Bridge: destroy', () => {
  it('calls pluginHost.destroy()', () => {
    const host = grid.getPluginHost();
    const spy = jest.spyOn(host, 'destroy');
    grid.destroy();
    expect(spy).toHaveBeenCalled();
  });

  it('tolerates partially initialized teardown state', () => {
    (grid as any).ctx.optionsManager = undefined;

    expect(() => grid.destroy()).not.toThrow();
  });
});

describe('Grid Bridge: updateOptions', () => {
  it('mutates the existing options object so held references stay current', () => {
    const optionsRef = (grid as any).ctx.options;

    grid.updateOptions({ rowHeight: 42, enableA11y: false });

    expect((grid as any).ctx.options).toBe(optionsRef);
    expect(optionsRef.rowHeight).toBe(42);
    expect(optionsRef.enableA11y).toBe(false);
  });

  it('exposes option subscriptions to plugins through the shared setup context', () => {
    grid.usePlugin({
      name: 'options-observer',
      phase: 400,
      dependencies: ['core'],
      setup(store, _api, context) {
        store.extend('optionsObserver.rowHeight', context.options.rowHeight, 'options-observer');
        store.extend('optionsObserver.changedKeys', [] as string[], 'options-observer');

        return {
          teardown: [
            context.subscribeOptions((change) => {
              store.set('optionsObserver.rowHeight', context.options.rowHeight);
              store.set('optionsObserver.changedKeys', [...change.changedKeys]);
            }),
          ],
        };
      },
    });

    grid.updateOptions({ rowHeight: 42 });

    expect(grid.getStore().get('optionsObserver.rowHeight')).toBe(42);
    expect(grid.getStore().get('optionsObserver.changedKeys')).toEqual(['rowHeight']);
  });
});

describe('Grid Bridge: public API accessors', () => {
  it('getStore() returns GridStoreImpl', () => {
    expect(grid.getStore()).toBeDefined();
    expect(typeof grid.getStore().get).toBe('function');
  });

  it('getPluginHost() returns PluginHost', () => {
    expect(grid.getPluginHost()).toBeDefined();
    expect(typeof grid.getPluginHost().has).toBe('function');
  });

  it('getGridApi() returns GridApiImpl', () => {
    expect(grid.getGridApi()).toBeDefined();
    expect(typeof grid.getGridApi().exec).toBe('function');
  });

  it('usePlugin() registers a custom plugin', () => {
    grid.setData(DATA);
    grid.usePlugin({
      name: 'custom',
      phase: 100,
      dependencies: ['core'],
      setup(store) {
        store.extend('custom.value', 42, 'custom');
      },
    });
    expect(grid.getStore().get('custom.value')).toBe(42);
    expect(grid.getPluginHost().has('custom')).toBe(true);
  });
});
