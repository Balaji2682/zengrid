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

describe('Grid Backend Data Mode', () => {
  it('loads the initial backend range on render', async () => {
    const onDataRequest = jest.fn().mockResolvedValue({
      data: [
        ['Alice', 10],
        ['Bob', 20],
      ],
      totalRows: 2,
      startRow: 0,
      endRow: 2,
    });

    grid = new Grid(container, {
      rowCount: 0,
      colCount: 2,
      rowHeight: 30,
      colWidth: 100,
      dataMode: 'backend',
      onDataRequest,
    });

    grid.render();
    await flushAsyncWork();

    expect(grid.getDataMode()).toBe('backend');
    expect(onDataRequest).toHaveBeenCalledTimes(1);
    expect(onDataRequest.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        startRow: 0,
      })
    );
    expect(grid.getData(0, 0)).toBe('Alice');
    expect(grid.getDataStatus()).toEqual(
      expect.objectContaining({
        status: 'success',
        totalRows: 2,
        canRetry: false,
      })
    );
  });


  it('does not mutate the caller options object after backend loads', async () => {
    const onDataRequest = jest.fn().mockResolvedValue({
      data: [
        ['Alice', 10],
        ['Bob', 20],
      ],
      totalRows: 2,
      startRow: 0,
      endRow: 2,
    });

    const userOptions = {
      rowCount: 0,
      colCount: 2,
      rowHeight: 30,
      colWidth: 100,
      dataMode: 'backend' as const,
      onDataRequest,
    };

    grid = new Grid(container, userOptions);

    grid.render();
    await flushAsyncWork();

    expect(userOptions.rowCount).toBe(0);
    expect(grid.getDataStatus()).toEqual(
      expect.objectContaining({
        totalRows: 2,
      })
    );
  });

  it('syncs the live grid options rowCount after backend loads', async () => {
    const onDataRequest = jest.fn().mockResolvedValue({
      data: [
        ['Alice', 10],
        ['Bob', 20],
      ],
      totalRows: 2,
      startRow: 0,
      endRow: 2,
    });

    grid = new Grid(container, {
      rowCount: 0,
      colCount: 2,
      rowHeight: 30,
      colWidth: 100,
      dataMode: 'backend',
      onDataRequest,
    });

    grid.render();
    await flushAsyncWork();

    const getOptions = grid.getGridApi().getMethod('options', 'get') as (() => {
      rowCount: number;
    }) | undefined;

    expect(getOptions?.().rowCount).toBe(2);
  });

  it('shows an empty state when the backend returns no rows', async () => {
    const onDataRequest = jest.fn().mockResolvedValue({
      data: [],
      totalRows: 0,
      startRow: 0,
      endRow: 0,
    });

    grid = new Grid(container, {
      rowCount: 0,
      colCount: 2,
      rowHeight: 30,
      colWidth: 100,
      dataMode: 'backend',
      onDataRequest,
    });

    grid.render();
    await flushAsyncWork();

    expect(grid.getDataStatus()).toEqual(
      expect.objectContaining({
        status: 'empty',
        totalRows: 0,
      })
    );
    expect(container.querySelector('.zg-data-state-empty')).not.toBeNull();
  });

  it('supports retry after a backend load failure', async () => {
    const onDataRequest = jest
      .fn()
      .mockRejectedValueOnce(new Error('Backend unavailable'))
      .mockResolvedValueOnce({
        data: [['Recovered']],
        totalRows: 1,
        startRow: 0,
        endRow: 1,
      });

    grid = new Grid(container, {
      rowCount: 0,
      colCount: 1,
      rowHeight: 30,
      colWidth: 100,
      dataMode: 'backend',
      onDataRequest,
    });

    grid.render();
    await flushAsyncWork();

    expect(grid.getDataStatus()).toEqual(
      expect.objectContaining({
        status: 'error',
        canRetry: true,
      })
    );
    expect(container.querySelector('.zg-data-state-error')).not.toBeNull();

    await grid.retryDataRequest();
    await flushAsyncWork();

    expect(onDataRequest).toHaveBeenCalledTimes(2);
    expect(grid.getData(0, 0)).toBe('Recovered');
    expect(grid.getDataStatus()).toEqual(
      expect.objectContaining({
        status: 'success',
        canRetry: false,
      })
    );
  });

  it('ignores stale responses after the backend query changes', async () => {
    const firstRequest = createDeferred<{
      data: any[][];
      totalRows: number;
      startRow: number;
      endRow: number;
    }>();
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
        return firstRequest.promise;
      })
      .mockImplementationOnce(() => secondRequest.promise);

    grid = new Grid(container, {
      rowCount: 20,
      colCount: 1,
      rowHeight: 30,
      colWidth: 100,
      dataMode: 'backend',
      onDataRequest,
    });

    grid.render();
    await flushAsyncWork();

    grid.sort.apply([{ column: 0, direction: 'asc' }]);
    await flushAsyncWork();

    expect(onDataRequest).toHaveBeenCalledTimes(2);
    expect(firstSignal?.aborted).toBe(true);

    firstRequest.resolve({
      data: [[111]],
      totalRows: 20,
      startRow: 0,
      endRow: 1,
    });
    await flushAsyncWork();

    expect(grid.getData(0, 0)).toBeUndefined();

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
        canRetry: false,
      })
    );
  });

  it('does not surface an error state when a superseded request aborts', async () => {
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
            () => reject(createAbortError('superseded request aborted')),
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
      dataMode: 'backend',
      onDataRequest,
    });

    grid.render();
    await flushAsyncWork();

    grid.sort.apply([{ column: 0, direction: 'asc' }]);
    await flushAsyncWork();

    expect(firstSignal?.aborted).toBe(true);
    expect(grid.getDataStatus()).toEqual(
      expect.objectContaining({
        status: 'loading',
        error: null,
        canRetry: false,
      })
    );
    expect(container.querySelector('.zg-data-state-error')).toBeNull();

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
