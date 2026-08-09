import { Zengrid } from '../grid-core';
import { resetTracking } from '../../reactive/tracking';
import { resetDebug } from '../../reactive/debug';
import { resetScheduler } from '../../reactive/effect-scheduler';

let container: HTMLElement;
let grid: Zengrid;

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
}

function makeGrid(): Zengrid {
  const g = new Zengrid(container, {
    rowCount: 3,
    colCount: 2,
    rowHeight: 30,
    colWidth: 100,
    columns: [
      { field: 'name', header: 'Name' },
      { field: 'score', header: 'Score' },
    ],
  });
  g.setData([
    ['Charlie', 10],
    ['Alice', 30],
    ['Bob', 20],
  ]);
  return g;
}

beforeEach(() => {
  resetTracking();
  resetDebug();
  resetScheduler();
  container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: 400, configurable: true });
  Object.defineProperty(container, 'clientHeight', { value: 300, configurable: true });
  document.body.appendChild(container);
});

afterEach(() => {
  if (grid) grid.destroy();
  if (container.parentNode) container.parentNode.removeChild(container);
});

describe('grid.rows', () => {
  it('reads source rows by their original index, unaffected by sort', async () => {
    grid = makeGrid();
    await flushAsyncWork();

    expect(grid.rows.getSourceRowCount()).toBe(3);
    expect(grid.rows.getSourceValue(0, 0)).toBe('Charlie');
    expect(grid.rows.getSourceRow(1)).toEqual(['Alice', 30]);

    grid.sort.apply([{ column: 0, direction: 'asc' }]);
    await flushAsyncWork();

    // Source access is stable regardless of the active sort.
    expect(grid.rows.getSourceValue(0, 0)).toBe('Charlie');
    expect(grid.rows.getSourceRow(1)).toEqual(['Alice', 30]);
  });

  it('reads displayed rows in on-screen order after a sort', async () => {
    grid = makeGrid();
    await flushAsyncWork();

    grid.sort.apply([{ column: 0, direction: 'asc' }]);
    await flushAsyncWork();

    expect(grid.rows.getDisplayedRowCount()).toBe(3);
    expect(grid.rows.getDisplayedRow(0)).toEqual(['Alice', 30]);
    expect(grid.rows.getDisplayedValue(2, 0)).toBe('Charlie');
    expect(grid.rows.getDisplayedRowData(0)).toEqual({ name: 'Alice', score: 30 });
  });

  it('maps between displayed and source indices', async () => {
    grid = makeGrid();
    await flushAsyncWork();

    grid.sort.apply([{ column: 0, direction: 'asc' }]);
    await flushAsyncWork();

    // Alice is source row 1 but shows first on screen.
    expect(grid.rows.toSourceIndex(0)).toBe(1);
    expect(grid.rows.toDisplayedIndex(1)).toBe(0);
  });

  it('walks every displayed row in view order', async () => {
    grid = makeGrid();
    await flushAsyncWork();

    grid.sort.apply([{ column: 0, direction: 'asc' }]);
    await flushAsyncWork();

    const names: unknown[] = [];
    grid.rows.forEachDisplayedRow((values) => names.push(values[0]));
    expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
  });
});
