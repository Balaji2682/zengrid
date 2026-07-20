import { PluginHost } from '../../grid/plugin-host';
import { GridApiImpl } from '../../grid/grid-api';
import { GridStoreImpl } from '../../reactive/store';
import { EventEmitter } from '../../utils';
import { resetTracking } from '../../reactive/tracking';
import { resetDebug } from '../../reactive/debug';
import { resetScheduler } from '../../reactive/effect-scheduler';
import { createCorePlugin } from '../core-plugin';
import { createSelectionPlugin } from '../selection';
import type { CellRange, CellRef } from '../../types';

let store: GridStoreImpl;
let emitter: EventEmitter;
let api: GridApiImpl;
let host: PluginHost;

beforeEach(() => {
  resetTracking();
  resetDebug();
  resetScheduler();
  store = new GridStoreImpl();
  emitter = new EventEmitter();
  api = new GridApiImpl(store, emitter);
  host = new PluginHost(store, api);
});

describe('SelectionPlugin', () => {
  it('throws without core dependency', () => {
    expect(() => host.use(createSelectionPlugin())).toThrow('requires "core"');
  });

  it('initializes selection.ranges = [] and selection.active = null', () => {
    host.use(createCorePlugin({ initialData: [[1], [2], [3]] }));
    host.use(createSelectionPlugin());

    expect(store.get('selection.ranges')).toEqual([]);
    expect(store.get('selection.active')).toBeNull();
  });

  it('selection:selectCell sets active and adds range', () => {
    host.use(createCorePlugin({ initialData: [[1], [2], [3]] }));
    host.use(createSelectionPlugin());

    store.exec('selection:selectCell', 1, 0);

    const active = store.get('selection.active') as CellRef;
    expect(active).toEqual({ row: 1, col: 0 });

    const ranges = store.get('selection.ranges') as CellRange[];
    expect(ranges.length).toBe(1);
    expect(ranges[0]).toEqual({
      startRow: 1,
      endRow: 1,
      startCol: 0,
      endCol: 0,
    });
  });

  it('selection:selectRange creates rectangular range', () => {
    host.use(
      createCorePlugin({
        initialData: [
          [1, 2],
          [3, 4],
          [5, 6],
        ],
      })
    );
    host.use(createSelectionPlugin());

    store.exec('selection:selectRange', 0, 0, 2, 1);

    const ranges = store.get('selection.ranges') as CellRange[];
    expect(ranges.length).toBe(1);
    expect(ranges[0]).toEqual({
      startRow: 0,
      endRow: 2,
      startCol: 0,
      endCol: 1,
    });
  });

  it('selection:selectRows selects full rows', () => {
    host.use(createCorePlugin({ initialData: [[1], [2], [3]] }));
    host.use(createSelectionPlugin());

    store.exec('selection:selectRows', 0, 2);

    const ranges = store.get('selection.ranges') as CellRange[];
    expect(ranges.length).toBe(1);
    expect(ranges[0].startRow).toBe(0);
    expect(ranges[0].endRow).toBe(2);
  });

  it('selection:clear empties ranges and nulls active', () => {
    host.use(createCorePlugin({ initialData: [[1], [2]] }));
    host.use(createSelectionPlugin());

    store.exec('selection:selectCell', 0, 0);
    expect((store.get('selection.ranges') as CellRange[]).length).toBe(1);

    store.exec('selection:clear');
    expect(store.get('selection.ranges')).toEqual([]);
    expect(store.get('selection.active')).toBeNull();
  });

  it('selection:selectAll selects all rows', () => {
    host.use(createCorePlugin({ initialData: [[1], [2], [3]] }));
    host.use(createSelectionPlugin());

    store.exec('selection:selectAll', 3);

    const ranges = store.get('selection.ranges') as CellRange[];
    expect(ranges.length).toBe(1);
    expect(ranges[0].startRow).toBe(0);
    expect(ranges[0].endRow).toBe(2);
  });

  it('single mode replaces previous selection', () => {
    host.use(createCorePlugin({ initialData: [[1], [2], [3]] }));
    host.use(createSelectionPlugin({ mode: 'single' }));

    store.exec('selection:selectCell', 0, 0);
    store.exec('selection:selectCell', 1, 0);

    const ranges = store.get('selection.ranges') as CellRange[];
    expect(ranges.length).toBe(1);
    expect(ranges[0].startRow).toBe(1);
  });

  it('multi mode with additive keeps previous selection', () => {
    host.use(createCorePlugin({ initialData: [[1], [2], [3]] }));
    host.use(createSelectionPlugin({ enableMultiSelection: true }));

    store.exec('selection:selectCell', 0, 0, true);
    store.exec('selection:selectCell', 2, 0, true);

    const ranges = store.get('selection.ranges') as CellRange[];
    expect(ranges.length).toBe(2);
  });

  it('selection:toggleCell adds then removes an individual cell', () => {
    host.use(createCorePlugin({ initialData: [[1], [2], [3]] }));
    host.use(createSelectionPlugin({ enableMultiSelection: true }));

    // Build a two-cell multi-selection additively.
    store.exec('selection:selectCell', 0, 0, true);
    store.exec('selection:toggleCell', 2, 0);
    expect((store.get('selection.ranges') as CellRange[]).length).toBe(2);
    expect(store.get('selection.active')).toEqual({ row: 2, col: 0 });

    // Toggling the same cell again removes just that cell.
    store.exec('selection:toggleCell', 2, 0);
    const ranges = store.get('selection.ranges') as CellRange[];
    expect(ranges.length).toBe(1);
    expect(ranges[0].startRow).toBe(0);
    expect(store.get('selection.active')).toBeNull();
  });

  it('fires selection:change event', () => {
    const events: unknown[] = [];
    emitter.on('selection:change', (d: unknown) => events.push(d));

    host.use(createCorePlugin({ initialData: [[1], [2]] }));
    host.use(createSelectionPlugin());

    store.exec('selection:selectCell', 0, 0);
    expect(events.length).toBe(1);
    expect((events[0] as any).ranges.length).toBe(1);
  });

  it('API methods are registered', () => {
    host.use(createCorePlugin({ initialData: [[1]] }));
    host.use(createSelectionPlugin());

    expect(api.getMethod('selection', 'selectCell')).toBeDefined();
    expect(api.getMethod('selection', 'toggleCell')).toBeDefined();
    expect(api.getMethod('selection', 'selectRange')).toBeDefined();
    expect(api.getMethod('selection', 'selectRows')).toBeDefined();
    expect(api.getMethod('selection', 'clear')).toBeDefined();
    expect(api.getMethod('selection', 'selectAll')).toBeDefined();
    expect(api.getMethod('selection', 'getRanges')).toBeDefined();
    expect(api.getMethod('selection', 'getActive')).toBeDefined();
    expect(api.getMethod('selection', 'isSelected')).toBeDefined();
    expect(api.getMethod('selection', 'hasSelection')).toBeDefined();
  });

  it('isSelected returns correct state', () => {
    host.use(createCorePlugin({ initialData: [[1], [2], [3]] }));
    host.use(createSelectionPlugin());

    store.exec('selection:selectCell', 1, 0);

    const isSelected = api.getMethod('selection', 'isSelected') as Function;
    expect(isSelected(1, 0)).toBe(true);
    expect(isSelected(0, 0)).toBe(false);
  });

  it('destroy cleans up without error', () => {
    host.use(createCorePlugin({ initialData: [[1]] }));
    host.use(createSelectionPlugin());

    store.exec('selection:selectCell', 0, 0);
    expect(() => host.destroy()).not.toThrow();
  });
});
