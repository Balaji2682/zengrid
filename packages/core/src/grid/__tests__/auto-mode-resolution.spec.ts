import { Grid } from '../grid-core';
import { resetTracking } from '../../reactive/tracking';
import { resetDebug } from '../../reactive/debug';
import { resetScheduler } from '../../reactive/effect-scheduler';

let container: HTMLElement;
let grid: Grid;

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

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

describe('Grid Auto Mode Resolution', () => {
  it('uses backend data mode when auto mode has onDataRequest', async () => {
    const onDataRequest = jest.fn().mockResolvedValue({
      data: [['Alice', 10]],
      totalRows: 1,
      startRow: 0,
      endRow: 1,
    });

    grid = new Grid(container, {
      rowCount: 1,
      colCount: 2,
      rowHeight: 30,
      colWidth: 100,
      dataMode: 'auto',
      onDataRequest,
    });

    grid.render();
    await flushAsyncWork();

    expect(grid.getDataMode()).toBe('backend');
    expect(onDataRequest).toHaveBeenCalledTimes(1);
  });

  it('falls back to frontend data mode when auto mode has no data callback', async () => {
    grid = new Grid(container, {
      rowCount: 2,
      colCount: 1,
      rowHeight: 30,
      colWidth: 100,
      dataMode: 'auto',
    });

    grid.setData([[1], [2]]);
    grid.render();
    await flushAsyncWork();

    expect(grid.getDataMode()).toBe('frontend');
    expect(grid.getData(1, 0)).toBe(2);
  });

  it('falls back to frontend sort mode when data mode resolves to frontend', async () => {
    grid = new Grid(container, {
      rowCount: 3,
      colCount: 2,
      rowHeight: 30,
      colWidth: 100,
      dataMode: 'auto',
    });

    grid.setData([
      ['Bob', 20],
      ['Alice', 10],
      ['Cara', 15],
    ]);
    grid.render();
    await flushAsyncWork();

    grid.sort.apply([{ column: 1, direction: 'asc' }]);
    await flushAsyncWork();

    const store = grid.getStore();
    expect(grid.sort.getMode()).toBe('frontend');
    expect(store.get('rows.viewIndices')).toEqual([1, 2, 0]);
  });

  it('keeps auto sort in frontend mode even when data loading resolves backend', async () => {
    const onDataRequest = jest
      .fn()
      .mockResolvedValue({
        data: [
          ['Bob', 20],
          ['Alice', 10],
        ],
        totalRows: 2,
        startRow: 0,
        endRow: 2,
      });

    grid = new Grid(container, {
      rowCount: 2,
      colCount: 2,
      rowHeight: 30,
      colWidth: 100,
      columns: [
        { field: 'name', header: 'Name' },
        { field: 'score', header: 'Score' },
      ],
      dataMode: 'auto',
      onDataRequest,
    });

    grid.render();
    await flushAsyncWork();

    grid.sort.apply([{ column: 1, direction: 'asc' }]);
    await flushAsyncWork();

    const store = grid.getStore();

    expect(grid.getDataMode()).toBe('backend');
    expect(grid.sort.getMode()).toBe('frontend');
    expect(onDataRequest).toHaveBeenCalledTimes(1);
    expect(store.get('rows.viewIndices')).toEqual([1, 0]);
  });

  it('keeps auto filter in frontend mode even when data loading resolves backend', async () => {
    const onDataRequest = jest
      .fn()
      .mockResolvedValue({
        data: [
          ['Bob', 20],
          ['Alice', 10],
        ],
        totalRows: 2,
        startRow: 0,
        endRow: 2,
      });

    grid = new Grid(container, {
      rowCount: 2,
      colCount: 2,
      rowHeight: 30,
      colWidth: 100,
      columns: [
        { field: 'name', header: 'Name' },
        { field: 'score', header: 'Score' },
      ],
      dataMode: 'auto',
      onDataRequest,
    });

    grid.render();
    await flushAsyncWork();

    grid.filter.setColumn(1, [{ operator: 'greaterThan', value: 15 }]);
    await flushAsyncWork();

    const store = grid.getStore();

    expect(grid.getDataMode()).toBe('backend');
    expect(grid.filter.getMode()).toBe('frontend');
    expect(onDataRequest).toHaveBeenCalledTimes(1);
    expect(store.get('rows.viewIndices')).toEqual([0]);
  });

  it('aborts superseded auto-mode data requests without surfacing an error', async () => {
    const secondRequest = createDeferred<{
      data: any[][];
      totalRows: number;
      startRow: number;
      endRow: number;
    }>();
    let firstSignal: AbortSignal | undefined;

    const onDataRequest = jest
      .fn()
      .mockImplementationOnce((request) => {
        firstSignal = request.signal;
        return new Promise((_, reject) => {
          request.signal?.addEventListener(
            'abort',
            () => reject(createAbortError('superseded auto request aborted')),
            { once: true }
          );
        });
      })
      .mockImplementationOnce(() => secondRequest.promise);

    grid = new Grid(container, {
      rowCount: 20,
      colCount: 1,
      rowHeight: 30,
      colWidth: 100,
      dataMode: 'auto',
      onDataRequest,
    });

    grid.render();
    await flushAsyncWork();

    void grid.refreshData();
    await flushAsyncWork();

    expect(grid.getDataMode()).toBe('backend');
    expect(firstSignal?.aborted).toBe(true);
    expect(grid.getDataStatus()).toEqual(
      expect.objectContaining({
        status: 'loading',
        error: null,
        canRetry: false,
      })
    );

    secondRequest.resolve({
      data: [[222]],
      totalRows: 20,
      startRow: 0,
      endRow: 1,
    });
    await flushAsyncWork();

    expect(grid.getData(0, 0)).toBe(222);
    expect(grid.getDataStatus()).toEqual(
      expect.objectContaining({
        status: 'success',
        error: null,
        canRetry: false,
      })
    );
    expect(container.querySelector('.zg-data-state-error')).toBeNull();
  });
});
