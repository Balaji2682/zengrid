import { DataManager } from './data-manager';
import { EventEmitter } from '../events/event-emitter';
import type { GridEvents } from '../events/grid-events';

function createBackendManager(
  callback: (
    request: import('../types').DataLoadRequest
  ) => Promise<import('../types').DataLoadResponse>
): DataManager {
  return new DataManager({
    rowCount: 10,
    events: new EventEmitter<GridEvents>(),
    modeConfig: {
      mode: 'backend',
      callback,
    },
  });
}

describe('DataManager', () => {
  it('does not swallow load errors when destroyed during error handling', async () => {
    const expectedError = new Error('backend failed');
    const manager = createBackendManager(async () => {
      throw expectedError;
    });

    const events = (manager as any).events as EventEmitter<GridEvents>;
    events.on('error', () => {
      manager.destroy();
    });

    await expect(manager.loadRange(0, 5)).rejects.toThrow(expectedError);
  });

  it('cancels pending backend requests with an abort signal', async () => {
    let receivedSignal: AbortSignal | undefined;

    const manager = createBackendManager((request) => {
      receivedSignal = request.signal;
      return new Promise(() => {
        // Intentionally unresolved until cancellation.
      });
    });

    const loadPromise = manager.loadRange(0, 5);
    await Promise.resolve();

    manager.cancelPendingRequests();

    await expect(loadPromise).rejects.toMatchObject({ name: 'AbortError' });
    expect(receivedSignal).toBeDefined();
    expect(receivedSignal?.aborted).toBe(true);
    expect(manager.isDataLoading()).toBe(false);
  });

  it('coalesces identical range requests across distinct query objects', async () => {
    let resolveRequest!: (value: import('../types').DataLoadResponse) => void;
    const callback: (
      request: import('../types').DataLoadRequest
    ) => Promise<import('../types').DataLoadResponse> = jest.fn(
      async () =>
        await new Promise<import('../types').DataLoadResponse>((resolve) => {
          resolveRequest = resolve;
        })
    );

    const manager = createBackendManager(callback);

    const firstLoad = manager.loadRange(0, 5, {
      version: 1,
      filter: {
        version: 1,
        root: {
          kind: 'group',
          logic: 'AND',
          source: 'api',
          children: [
            {
              kind: 'predicate',
              source: 'api',
              target: { column: 0 },
              operator: 'eq',
              value: 'active',
            },
          ],
        },
      },
      pagination: { page: 0, pageSize: 5, offset: 0 },
    });
    const secondLoad = manager.loadRange(0, 5, {
      version: 1,
      filter: {
        version: 1,
        root: {
          kind: 'group',
          logic: 'AND',
          source: 'api',
          children: [
            {
              kind: 'predicate',
              source: 'api',
              target: { column: 0 },
              operator: 'eq',
              value: 'active',
            },
          ],
        },
      },
      pagination: { page: 0, pageSize: 5, offset: 0 },
    });

    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(1);

    resolveRequest({
      data: [[1], [2], [3], [4], [5]],
      startRow: 0,
      endRow: 5,
      totalRows: 10,
    });

    await Promise.all([firstLoad, secondLoad]);
  });
});
