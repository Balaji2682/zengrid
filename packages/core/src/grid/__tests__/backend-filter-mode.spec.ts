import { Grid } from '../grid-core';
import { resetTracking } from '../../reactive/tracking';
import { resetDebug } from '../../reactive/debug';
import { resetScheduler } from '../../reactive/effect-scheduler';
import type { FieldFilterState } from '../../features/filtering/types';

let container: HTMLElement;
let grid: Grid;

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

describe('Grid Backend Filter Mode', () => {
  it('serializes backend filter state into onDataRequest for backend data mode', async () => {
    const onDataRequest = jest.fn().mockResolvedValue({
      data: [['Bob', 20]],
      totalRows: 1,
      startRow: 0,
      endRow: 1,
    });

    grid = new Grid(container, {
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

    grid.filter.setColumn(1, [{ operator: 'greaterThan', value: 15 }]);
    await flushAsyncWork();

    expect(onDataRequest).toHaveBeenCalledTimes(2);
    expect(onDataRequest.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        query: expect.objectContaining({
          version: 1,
          filter: grid.filter.getExpression()?.ast ?? null,
          sort: null,
        }),
      })
    );
  });

  it('keeps backend data-request payloads deterministic between model-state and field-state entry', async () => {
    const fieldState: FieldFilterState = {
      root: {
        logic: 'AND',
        conditions: [{ field: 'score', operator: 'gt', value: 15 }],
      },
      activeFields: ['score'],
      timestamp: Date.now(),
    };
    const modelOnDataRequest = jest.fn().mockResolvedValue({
      data: [['Bob', 20]],
      totalRows: 1,
      startRow: 0,
      endRow: 1,
    });

    grid = new Grid(container, {
      rowCount: 1,
      colCount: 2,
      rowHeight: 30,
      colWidth: 100,
      columns: [
        { field: 'name', header: 'Name' },
        { field: 'score', header: 'Score' },
      ],
      dataMode: 'backend',
      onDataRequest: modelOnDataRequest,
    });

    grid.render();
    await flushAsyncWork();

    grid.filter.setColumn(1, [{ operator: 'greaterThan', value: 15 }]);
    await flushAsyncWork();
    grid.filter.setQuick('ali', [0]);
    await flushAsyncWork();

    const modelRequest = modelOnDataRequest.mock.calls[2]?.[0];

    grid.destroy();

    const fieldOnDataRequest = jest.fn().mockResolvedValue({
      data: [['Bob', 20]],
      totalRows: 1,
      startRow: 0,
      endRow: 1,
    });

    grid = new Grid(container, {
      rowCount: 1,
      colCount: 2,
      rowHeight: 30,
      colWidth: 100,
      columns: [
        { field: 'name', header: 'Name' },
        { field: 'score', header: 'Score' },
      ],
      dataMode: 'backend',
      onDataRequest: fieldOnDataRequest,
    });

    grid.render();
    await flushAsyncWork();

    grid.filter.setFieldState(fieldState);
    await flushAsyncWork();
    grid.filter.setQuick('ali', [0]);
    await flushAsyncWork();

    const fieldRequest = fieldOnDataRequest.mock.calls[2]?.[0];

    expect(fieldRequest.query).toEqual(modelRequest.query);
  });

  it('keeps global quick search composed with column filters in backend data requests', async () => {
    const onDataRequest = jest.fn().mockResolvedValue({
      data: [['Alice', 'Sales', 'Boston']],
      totalRows: 1,
      startRow: 0,
      endRow: 1,
    });

    grid = new Grid(container, {
      rowCount: 4,
      colCount: 3,
      rowHeight: 30,
      colWidth: 100,
      columns: [
        { field: 'name', header: 'Name' },
        { field: 'department', header: 'Department' },
        { field: 'city', header: 'City' },
      ],
      dataMode: 'backend',
      onDataRequest,
    });

    grid.render();
    await flushAsyncWork();

    grid.filter.setColumn(1, [{ operator: 'equals', value: 'Sales' }]);
    await flushAsyncWork();
    grid.filter.setQuick('boston');
    await flushAsyncWork();

    expect(onDataRequest).toHaveBeenCalledTimes(3);
    expect(onDataRequest.mock.calls[2][0]).toEqual(
      expect.objectContaining({
        query: expect.objectContaining({
          version: 1,
          filter: grid.filter.getExpression()?.ast ?? null,
          sort: null,
        }),
      })
    );
  });
});
