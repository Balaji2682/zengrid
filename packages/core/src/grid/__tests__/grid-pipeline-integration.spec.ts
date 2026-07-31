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
  [40, 'Diana'],
  [5, 'Eve'],
];

beforeEach(() => {
  resetTracking();
  resetDebug();
  resetScheduler();
  container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: 400, configurable: true });
  Object.defineProperty(container, 'clientHeight', { value: 300, configurable: true });
  document.body.appendChild(container);
  grid = new Zengrid(container, { rowCount: 5, colCount: 2, rowHeight: 30, colWidth: 100 });
  grid.setData(DATA);
});

afterEach(() => {
  grid.destroy();
  if (container.parentNode) container.parentNode.removeChild(container);
});

describe('Pipeline Integration: core only', () => {
  it('rows.viewIndices = [0..N-1] with no sort/filter', () => {
    const store = grid.getStore();
    const viewIndices = store.get('rows.viewIndices') as number[];
    expect(viewIndices).toEqual([0, 1, 2, 3, 4]);
  });

  it('rows.viewCount = N with no sort/filter', () => {
    const store = grid.getStore();
    expect(store.get('rows.viewCount')).toBe(5);
  });
});

describe('Pipeline Integration: after sort', () => {
  it('rows.viewIndices = sorted order', () => {
    grid.sort.apply([{ column: 0, direction: 'asc' }]);
    const store = grid.getStore();
    const viewIndices = store.get('rows.viewIndices') as number[];
    // Ascending by col 0: 5(4), 10(1), 20(2), 30(0), 40(3)
    expect(viewIndices).toEqual([4, 1, 2, 0, 3]);
  });

  it('rows.viewIndices honor multiple sort keys and keep stable ties', () => {
    grid.setData([
      [1, 'b'],
      [1, 'a'],
      [2, 'a'],
      [1, 'a'],
    ]);

    grid.sort.apply([
      { column: 0, direction: 'asc', sortIndex: 0 },
      { column: 1, direction: 'asc', sortIndex: 1 },
    ]);

    const store = grid.getStore();
    const viewIndices = store.get('rows.viewIndices') as number[];
    expect(viewIndices).toEqual([1, 3, 0, 2]);
  });


  it('rows.viewIndices honor explicit sortIndex priority over array order', () => {
    grid.setData([
      [1, 'b'],
      [1, 'a'],
      [2, 'a'],
      [1, 'a'],
    ]);

    grid.sort.apply([
      { column: 1, direction: 'asc', sortIndex: 1 },
      { column: 0, direction: 'asc', sortIndex: 0 },
    ]);

    const store = grid.getStore();
    const viewIndices = store.get('rows.viewIndices') as number[];
    expect(grid.sort.getState()).toEqual([
      { column: 0, direction: 'asc', sortIndex: 0 },
      { column: 1, direction: 'asc', sortIndex: 1 },
    ]);
    expect(viewIndices).toEqual([1, 3, 0, 2]);
  });
});

describe('Pipeline Integration: sort + filter', () => {
  it('rows.viewIndices = sorted+filtered', () => {
    grid.sort.apply([{ column: 0, direction: 'asc' }]);
    // Filter: col 0 > 15 → keeps idx 0(30), 2(20), 3(40)
    grid.setColumnFilter(0, [{ operator: 'greaterThan', value: 15 }]);
    const store = grid.getStore();
    const viewIndices = store.get('rows.viewIndices') as number[];
    // Sorted ascending among {0,2,3}: 20(2), 30(0), 40(3)
    expect(viewIndices).toEqual([2, 0, 3]);
  });

  it('clear filter → falls back to sorted', () => {
    grid.sort.apply([{ column: 0, direction: 'asc' }]);
    grid.setColumnFilter(0, [{ operator: 'greaterThan', value: 15 }]);
    grid.clearFilters();
    const store = grid.getStore();
    const viewIndices = store.get('rows.viewIndices') as number[];
    // Back to full sorted: 5(4), 10(1), 20(2), 30(0), 40(3)
    expect(viewIndices).toEqual([4, 1, 2, 0, 3]);
  });

  it('clear sort → falls back to raw indices', () => {
    grid.sort.apply([{ column: 0, direction: 'asc' }]);
    grid.clearSort();
    const store = grid.getStore();
    const viewIndices = store.get('rows.viewIndices') as number[];
    expect(viewIndices).toEqual([0, 1, 2, 3, 4]);
  });

  it('rows.viewCount tracks filtered count', () => {
    grid.setColumnFilter(0, [{ operator: 'greaterThan', value: 15 }]);
    const store = grid.getStore();
    expect(store.get('rows.viewCount')).toBe(3);
  });
});

describe('Pipeline Integration: setData propagation', () => {
  it('setData with new data propagates through pipeline', () => {
    grid.sort.apply([{ column: 0, direction: 'asc' }]);
    const newData = [
      [100, 'Z'],
      [50, 'Y'],
    ];

    grid.setData(newData);

    const store = grid.getStore();
    expect(store.get('rows.raw')).toEqual(newData);
    expect(store.get('rows.count')).toBe(2);
    const viewIndices = store.get('rows.viewIndices') as number[];
    expect(viewIndices).toEqual([1, 0]);
  });

  it('preserves multi-column sort state across setData', () => {
    grid.sort.apply([
      { column: 0, direction: 'asc', sortIndex: 0 },
      { column: 1, direction: 'asc', sortIndex: 1 },
    ]);

    grid.setData([
      [1, 'b'],
      [1, 'a'],
      [2, 'a'],
      [1, 'a'],
    ]);

    const store = grid.getStore();
    expect(grid.sort.getState()).toEqual([
      { column: 0, direction: 'asc', sortIndex: 0 },
      { column: 1, direction: 'asc', sortIndex: 1 },
    ]);
    expect(store.get('rows.viewIndices')).toEqual([1, 3, 0, 2]);
  });
});
