/**
 * Foundation guardrail: boots a REAL Grid in jsdom and drives interactions through
 * the public surface, asserting that the lifecycle plugin actually fires each
 * feature's attach/setup action.
 *
 * These tests fail if a lifecycle presence-gate drifts from the action it fires
 * (the "plugin installed but never lifecycle-wired" class). Unit tests miss this
 * because they exec store actions directly and never boot the lifecycle.
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

function boot(options: GridOptions, data: unknown[][]): Grid {
  const g = new Grid(container, options);
  g.setData(data as any[][]);
  return g;
}

const NUM_NAME: unknown[][] = [
  [1, 'Alice'],
  [2, 'Bob'],
  [3, 'Carol'],
];

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

describe('interaction liveness: lifecycle fires guarded actions', () => {
  it('selection: clicking a rendered cell fires onCellClick and selects', () => {
    const onCellClick = jest.fn();
    grid = boot(
      { rowCount: 3, colCount: 2, rowHeight: 30, colWidth: 100, onCellClick },
      NUM_NAME
    );
    grid.render();

    const scrollContainer = container.querySelector('.zg-scroll-container') as HTMLElement;
    expect(scrollContainer).toBeTruthy();

    // Drive a real pointer click on a cell inside the scroll container.
    const cell = document.createElement('div');
    cell.className = 'zg-cell';
    cell.setAttribute('data-row', '0');
    cell.setAttribute('data-col', '0');
    scrollContainer.appendChild(cell);
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onCellClick).toHaveBeenCalledWith(0, 0);
    const ranges = grid.getStore().get('selection.ranges') as unknown[];
    expect(ranges.length).toBeGreaterThan(0);
  });

  it('selection: lifecycle execs selection:attach on render', () => {
    grid = boot({ rowCount: 3, colCount: 2, rowHeight: 30, colWidth: 100 }, NUM_NAME);
    const execSpy = jest.spyOn(grid.getStore(), 'exec');
    grid.render();
    expect(execSpy).toHaveBeenCalledWith('selection:attach', expect.anything());
  });

  it('filter UI: lifecycle execs filterUI:attach and mounts the chip bar', () => {
    grid = boot(
      {
        rowCount: 3,
        colCount: 2,
        rowHeight: 30,
        colWidth: 100,
        columns: [
          { field: 'num', header: 'Num', filterable: true },
          { field: 'name', header: 'Name', filterable: true },
        ],
      },
      NUM_NAME
    );
    expect(grid.getStore().hasAction('filterUI:attach')).toBe(true);

    const execSpy = jest.spyOn(grid.getStore(), 'exec');
    grid.render();

    expect(execSpy).toHaveBeenCalledWith('filterUI:attach', expect.anything(), expect.anything());
    expect(container.querySelector('.zg-filter-chip-bar')).toBeTruthy();
  });

  it('undo/redo: committing a cell edit records it into the undo stack', () => {
    grid = boot(
      {
        rowCount: 3,
        colCount: 2,
        rowHeight: 30,
        colWidth: 100,
        columns: [
          { field: 'num', header: 'Num' },
          { field: 'name', header: 'Name', editable: true, editor: 'text' },
        ],
      },
      NUM_NAME
    );
    grid.render();

    const store = grid.getStore();
    expect(store.get('undoRedo.canUndo')).toBe(false);

    store.exec('editing:startEdit', { row: 0, col: 1 });
    const input = container.querySelector('.zg-editor-container input') as HTMLInputElement;
    expect(input).toBeTruthy();
    input.value = 'Alicia';
    store.exec('editing:commitEdit', 'Alicia');

    expect(store.get('undoRedo.canUndo')).toBe(true);
  });

  it('editing: interactive Enter-commit fires edit:commit and edit:end once', () => {
    grid = boot(
      {
        rowCount: 3,
        colCount: 2,
        rowHeight: 30,
        colWidth: 100,
        columns: [
          { field: 'num', header: 'Num' },
          { field: 'name', header: 'Name', editable: true, editor: 'text' },
        ],
      },
      NUM_NAME
    );
    grid.render();

    const commits: unknown[] = [];
    const ends: unknown[] = [];
    grid.on('edit:commit', (d) => commits.push(d));
    grid.on('edit:end', (d) => ends.push(d));

    grid.getStore().exec('editing:startEdit', { row: 0, col: 1 });
    const input = container.querySelector('.zg-editor-container input') as HTMLInputElement;
    expect(input).toBeTruthy();
    input.value = 'Alicia';

    // Interactive commit: Enter inside the editor (bypasses the store action).
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(commits.length).toBe(1);
    expect(ends.length).toBe(1);
    expect((commits[0] as any).newValue).toBe('Alicia');
    expect((ends[0] as any).cancelled).toBe(false);
  });

  it('editing: programmatic commitEdit fires edit:commit and edit:end exactly once', () => {
    grid = boot(
      {
        rowCount: 3,
        colCount: 2,
        rowHeight: 30,
        colWidth: 100,
        columns: [
          { field: 'num', header: 'Num' },
          { field: 'name', header: 'Name', editable: true, editor: 'text' },
        ],
      },
      NUM_NAME
    );
    grid.render();

    const commits: unknown[] = [];
    const ends: unknown[] = [];
    grid.on('edit:commit', (d) => commits.push(d));
    grid.on('edit:end', (d) => ends.push(d));

    const store = grid.getStore();
    store.exec('editing:startEdit', { row: 0, col: 1 });
    const input = container.querySelector('.zg-editor-container input') as HTMLInputElement;
    input.value = 'Bobby';
    store.exec('editing:commitEdit');

    expect(commits.length).toBe(1);
    expect(ends.length).toBe(1);
    expect((commits[0] as any).newValue).toBe('Bobby');
  });

  it('keyboard: lifecycle execs keyboard:setup and makes the container focusable', () => {
    grid = boot({ rowCount: 3, colCount: 2, rowHeight: 30, colWidth: 100 }, NUM_NAME);
    expect(grid.getStore().hasAction('keyboard:setup')).toBe(true);

    const execSpy = jest.spyOn(grid.getStore(), 'exec');
    grid.render();

    expect(execSpy).toHaveBeenCalledWith('keyboard:setup');
    expect(container.getAttribute('tabindex')).toBe('0');
  });

  it('keyboard: arrow keys move the active cell and drive selection', () => {
    grid = boot({ rowCount: 3, colCount: 2, rowHeight: 30, colWidth: 100 }, NUM_NAME);
    grid.render();
    const store = grid.getStore();

    // First arrow with no active cell anchors at 0,0.
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(store.get('selection.active')).toEqual({ row: 0, col: 0 });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(store.get('selection.active')).toEqual({ row: 1, col: 0 });

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(store.get('selection.active')).toEqual({ row: 1, col: 1 });

    // Clamps at the grid edge.
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(store.get('selection.active')).toEqual({ row: 1, col: 1 });
  });

  it('keyboard: Ctrl+A selects all rows', () => {
    grid = boot({ rowCount: 3, colCount: 2, rowHeight: 30, colWidth: 100 }, NUM_NAME);
    grid.render();
    const store = grid.getStore();

    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true })
    );

    const ranges = store.get('selection.ranges') as Array<{ startRow: number; endRow: number }>;
    expect(ranges.length).toBeGreaterThan(0);
    expect(ranges[0].startRow).toBe(0);
    expect(ranges[0].endRow).toBe(2);
  });

  it('keyboard: does not navigate while a cell is being edited', () => {
    grid = boot(
      {
        rowCount: 3,
        colCount: 2,
        rowHeight: 30,
        colWidth: 100,
        columns: [
          { field: 'num', header: 'Num' },
          { field: 'name', header: 'Name', editable: true, editor: 'text' },
        ],
      },
      NUM_NAME
    );
    grid.render();
    const store = grid.getStore();

    store.exec('editing:startEdit', { row: 0, col: 1 });
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    // No navigation occurred: selection.active untouched by the arrow key.
    expect(store.get('selection.active')).toBeNull();
  });

  it('clipboard: lifecycle execs clipboard:setup on render', () => {
    grid = boot({ rowCount: 3, colCount: 2, rowHeight: 30, colWidth: 100 }, NUM_NAME);
    expect(grid.getStore().hasAction('clipboard:setup')).toBe(true);

    const execSpy = jest.spyOn(grid.getStore(), 'exec');
    grid.render();

    expect(execSpy).toHaveBeenCalledWith('clipboard:setup');
  });

  it('clipboard: Ctrl+C writes the selected cell to the clipboard', () => {
    const write = jest.fn().mockResolvedValue(undefined);
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { write, writeText },
      configurable: true,
    });
    (globalThis as any).ClipboardItem = class {
      constructor(public data: unknown) {}
    };

    grid = boot({ rowCount: 3, colCount: 2, rowHeight: 30, colWidth: 100 }, NUM_NAME);
    grid.render();

    // First arrow anchors an active cell + single-cell selection at (0,0).
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    container.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true })
    );

    expect(write).toHaveBeenCalledTimes(1);
  });

  it('infinite scroll: lifecycle execs infiniteScroll:setup on render', () => {
    grid = boot(
      {
        rowCount: 3,
        colCount: 2,
        rowHeight: 30,
        colWidth: 100,
        infiniteScrolling: { enabled: true },
        onLoadMoreRows: jest.fn().mockResolvedValue([]),
      } as GridOptions,
      NUM_NAME
    );
    expect(grid.getStore().hasAction('infiniteScroll:setup')).toBe(true);

    const execSpy = jest.spyOn(grid.getStore(), 'exec');
    grid.render();

    expect(execSpy).toHaveBeenCalledWith('infiniteScroll:setup');
  });
});
