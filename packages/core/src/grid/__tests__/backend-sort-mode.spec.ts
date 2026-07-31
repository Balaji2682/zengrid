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
  if (grid) {
    grid.destroy();
  }

  if (container.parentNode) {
    container.parentNode.removeChild(container);
  }
});

describe('Grid Backend Sort Mode', () => {
  it('serializes single-column backend sort state into onDataRequest for backend data mode', async () => {
    const onDataRequest = jest.fn().mockResolvedValue({
      data: [['Alice', 10]],
      totalRows: 1,
      startRow: 0,
      endRow: 1,
    });

    grid = new Zengrid(container, {
      rowCount: 1,
      colCount: 2,
      rowHeight: 30,
      colWidth: 100,
      columns: [
        { field: 'name', header: 'Name' },
        { field: 'score', header: 'Score' },
      ],
      dataMode: 'backend',
      onDataRequest,
    });

    grid.render();
    await flushAsyncWork();

    grid.sort.apply([{ column: 0, direction: 'asc' }]);
    await flushAsyncWork();

    expect(onDataRequest).toHaveBeenCalledTimes(2);
    expect(onDataRequest.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        query: expect.objectContaining({
          version: 1,
          filter: null,
          sort: [{ column: 0, field: 'name', direction: 'asc', sortIndex: 0 }],
        }),
      })
    );
  });

  it('serializes multi-column backend sort requests into onDataRequest', async () => {
    const onDataRequest = jest.fn().mockResolvedValue({
      data: [
        ['Alice', 10],
        ['Bob', 20],
      ],
      totalRows: 2,
      startRow: 0,
      endRow: 2,
    });

    grid = new Zengrid(container, {
      rowCount: 4,
      colCount: 2,
      rowHeight: 30,
      colWidth: 100,
      columns: [
        { field: 'name', header: 'Name' },
        { field: 'score', header: 'Score' },
      ],
      dataMode: 'backend',
      onDataRequest,
    });

    grid.render();
    await flushAsyncWork();

    grid.sort.apply([
      { column: 1, direction: 'desc', sortIndex: 1 },
      { column: 0, direction: 'asc', sortIndex: 0 },
    ]);
    await flushAsyncWork();

    expect(grid.sort.getMode()).toBe('backend');
    expect(onDataRequest).toHaveBeenCalledTimes(2);
    expect(onDataRequest.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        query: expect.objectContaining({
          version: 1,
          filter: null,
          sort: [
            { column: 0, field: 'name', direction: 'asc', sortIndex: 0 },
            { column: 1, field: 'score', direction: 'desc', sortIndex: 1 },
          ],
        }),
      })
    );
  });

  it('uses the same normalized multi-sort state for frontend runtime and backend data requests', async () => {
    const columns = [
      { field: 'name', header: 'Name' },
      { field: 'score', header: 'Score' },
    ];
    const data = [
      ['Bob', 20],
      ['Alice', 20],
      ['Cara', 10],
      ['Alice', 10],
    ];
    const inputState = [
      { column: 1, direction: 'desc' as const, sortIndex: 1 },
      { column: 0, direction: 'asc' as const, sortIndex: 0 },
    ];

    const frontendGrid = new Zengrid(container, {
      rowCount: 4,
      colCount: 2,
      rowHeight: 30,
      colWidth: 100,
      columns,
    });

    frontendGrid.setData(data);
    frontendGrid.render();
    await flushAsyncWork();

    frontendGrid.sort.apply(inputState);
    await flushAsyncWork();

    const frontendState = frontendGrid.sort.getState();
    expect(frontendState).toEqual([
      { column: 0, direction: 'asc', sortIndex: 0 },
      { column: 1, direction: 'desc', sortIndex: 1 },
    ]);
    frontendGrid.destroy();

    const onDataRequest = jest.fn().mockResolvedValue({
      data: data,
      totalRows: data.length,
      startRow: 0,
      endRow: data.length,
    });

    grid = new Zengrid(container, {
      rowCount: data.length,
      colCount: 2,
      rowHeight: 30,
      colWidth: 100,
      columns,
      dataMode: 'backend',
      onDataRequest,
    });

    grid.render();
    await flushAsyncWork();

    grid.sort.apply(inputState);
    await flushAsyncWork();

    expect(onDataRequest).toHaveBeenCalledTimes(2);
    expect(onDataRequest.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        query: expect.objectContaining({
          version: 1,
          filter: null,
          sort: [
            { column: 0, field: 'name', direction: 'asc', sortIndex: 0 },
            { column: 1, field: 'score', direction: 'desc', sortIndex: 1 },
          ],
        }),
      })
    );
  });
});
