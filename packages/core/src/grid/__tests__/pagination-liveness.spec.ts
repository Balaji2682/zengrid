/**
 * Feature-liveness guardrail: boots a REAL Grid in jsdom and drives frontend
 * pagination through the public API, asserting the visible row set (the
 * pipeline's `rows.viewIndices`) is actually sliced down to the current page
 * and changes when the page changes.
 *
 * This fails if frontend pagination has no row-slicing pipeline phase — the
 * "controls move but the body never paginates" bug. Unit tests miss it because
 * they never boot a Grid and read the derived view indices.
 */
import { Grid } from '../grid-core';
import { resetTracking } from '../../reactive/tracking';
import { resetDebug } from '../../reactive/debug';
import { resetScheduler } from '../../reactive/effect-scheduler';
import type { GridOptions } from '../../types';

let container: HTMLElement;
let grid: Grid;

function makeContainer(): HTMLElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'clientWidth', { value: 400, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: 300, configurable: true });
  document.body.appendChild(el);
  return el;
}

const FIVE_ROWS: unknown[][] = [
  [1, 'Alice'],
  [2, 'Bob'],
  [3, 'Carol'],
  [4, 'Dave'],
  [5, 'Erin'],
];

function viewIndices(g: Grid): number[] {
  return g.getStore().get('rows.viewIndices') as number[];
}

beforeEach(() => {
  resetTracking();
  resetDebug();
  resetScheduler();
  container = makeContainer();
});

afterEach(() => {
  grid?.destroy();
  if (container.parentNode) container.parentNode.removeChild(container);
});

describe('pagination liveness: frontend pagination slices the view', () => {
  function bootPaginated(): Grid {
    const g = new Grid(container, {
      rowCount: 5,
      colCount: 2,
      rowHeight: 30,
      colWidth: 100,
      pagination: { enabled: true, pageSize: 2 },
    } as GridOptions);
    g.setData(FIVE_ROWS as any[][]);
    g.render();
    return g;
  }

  it('renders only the first page of rows on boot', () => {
    grid = bootPaginated();
    expect(viewIndices(grid)).toEqual([0, 1]);
  });

  it('slices to the next page when goToPage is driven', () => {
    grid = bootPaginated();
    grid.goToPage(1);
    expect(viewIndices(grid)).toEqual([2, 3]);
    expect(grid.getCurrentPage()).toBe(1);
  });

  it('yields a short final page', () => {
    grid = bootPaginated();
    grid.goToPage(2);
    expect(viewIndices(grid)).toEqual([4]);
  });

  it('re-slices when page size changes', () => {
    grid = bootPaginated();
    grid.setPageSize(3);
    expect(viewIndices(grid)).toEqual([0, 1, 2]);
    grid.goToPage(1);
    expect(viewIndices(grid)).toEqual([3, 4]);
  });

  it('does not paginate when pagination is disabled', () => {
    grid = new Grid(container, {
      rowCount: 5,
      colCount: 2,
      rowHeight: 30,
      colWidth: 100,
    } as GridOptions);
    grid.setData(FIVE_ROWS as any[][]);
    grid.render();
    expect(viewIndices(grid)).toEqual([0, 1, 2, 3, 4]);
  });
});
