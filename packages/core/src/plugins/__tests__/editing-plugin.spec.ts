import { PluginHost } from '../../grid/plugin-host';
import { GridApiImpl } from '../../grid/grid-api';
import { GridStoreImpl } from '../../reactive/store';
import { EventEmitter } from '../../utils';
import { resetTracking } from '../../reactive/tracking';
import { resetDebug } from '../../reactive/debug';
import { resetScheduler } from '../../reactive/effect-scheduler';
import { createCorePlugin } from '../core-plugin';
import { createSelectionPlugin } from '../selection';
import { createEditingPlugin } from '../editing';
import type { CellRef } from '../../types';

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

function setupPlugins() {
  host.use(createCorePlugin({ initialData: [[1], [2], [3]] }));
  host.use(createSelectionPlugin());
  host.use(createEditingPlugin());
}

describe('EditingPlugin', () => {
  it('throws without core and selection dependencies', () => {
    expect(() => host.use(createEditingPlugin())).toThrow();
  });

  it('initializes editing.active = null', () => {
    setupPlugins();
    expect(store.get('editing.active')).toBeNull();
  });

  it('editing:bind accepts an editor manager reference', () => {
    setupPlugins();
    const mockMgr = { startEdit: jest.fn(), cancelEdit: jest.fn() };
    store.exec('editing:bind', mockMgr);

    // No error means bind worked
    expect(store.get('editing.active')).toBeNull();
  });

  it('editing:startEdit sets editing.active and drives the manager', () => {
    setupPlugins();

    // Edit lifecycle events are emitted by the EditorManager (via the shared
    // emitter), not the store action — mirror that here.
    const events: unknown[] = [];
    emitter.on('edit:start', (d: unknown) => events.push(d));

    const cell: CellRef = { row: 0, col: 0 };
    const mockMgr = {
      startEdit: jest.fn(() => emitter.emit('edit:start', { cell, value: 'test' })),
    };
    store.exec('editing:bind', mockMgr);

    store.exec('editing:startEdit', cell);

    expect(store.get('editing.active')).toEqual(cell);
    expect(mockMgr.startEdit).toHaveBeenCalledWith(cell);
    expect(events.length).toBe(1);
  });

  it('editing:startEdit does nothing when already editing', () => {
    setupPlugins();

    const mockMgr = { startEdit: jest.fn(), getCurrentValue: jest.fn() };
    store.exec('editing:bind', mockMgr);

    store.exec('editing:startEdit', { row: 0, col: 0 });
    store.exec('editing:startEdit', { row: 1, col: 0 });

    // Only first startEdit should have been called
    expect(mockMgr.startEdit).toHaveBeenCalledTimes(1);
  });

  it('editing:commitEdit clears editing.active and drives the manager', () => {
    setupPlugins();

    const commitEvents: unknown[] = [];
    const endEvents: unknown[] = [];
    emitter.on('edit:commit', (d: unknown) => commitEvents.push(d));
    emitter.on('edit:end', (d: unknown) => endEvents.push(d));

    const cell: CellRef = { row: 0, col: 0 };
    const mockMgr = {
      startEdit: jest.fn(),
      commitEdit: jest.fn(() => {
        emitter.emit('edit:commit', { cell, oldValue: 'original', newValue: 'new-value' });
        emitter.emit('edit:end', { cell, value: 'new-value', cancelled: false });
      }),
    };
    store.exec('editing:bind', mockMgr);

    store.exec('editing:startEdit', cell);
    store.exec('editing:commitEdit');

    expect(store.get('editing.active')).toBeNull();
    expect(mockMgr.commitEdit).toHaveBeenCalled();
    expect(commitEvents.length).toBe(1);
    expect(endEvents.length).toBe(1);
    expect((endEvents[0] as any).cancelled).toBe(false);
  });

  it('editing:cancelEdit clears editing.active and drives the manager', () => {
    setupPlugins();

    const cancelEvents: unknown[] = [];
    const endEvents: unknown[] = [];
    emitter.on('edit:cancel', (d: unknown) => cancelEvents.push(d));
    emitter.on('edit:end', (d: unknown) => endEvents.push(d));

    const cell: CellRef = { row: 0, col: 0 };
    const mockMgr = {
      startEdit: jest.fn(),
      cancelEdit: jest.fn(() => {
        emitter.emit('edit:cancel', { cell, value: undefined });
        emitter.emit('edit:end', { cell, value: undefined, cancelled: true });
      }),
    };
    store.exec('editing:bind', mockMgr);

    store.exec('editing:startEdit', cell);
    store.exec('editing:cancelEdit');

    expect(store.get('editing.active')).toBeNull();
    expect(mockMgr.cancelEdit).toHaveBeenCalled();
    expect(cancelEvents.length).toBe(1);
    expect(endEvents.length).toBe(1);
    expect((endEvents[0] as any).cancelled).toBe(true);
  });

  it('editing:startEdit does nothing without bound editor manager', () => {
    setupPlugins();

    // Don't bind any editor manager
    store.exec('editing:startEdit', { row: 0, col: 0 });
    expect(store.get('editing.active')).toBeNull();
  });

  it('API methods are registered', () => {
    setupPlugins();

    expect(api.getMethod('editing', 'startEdit')).toBeDefined();
    expect(api.getMethod('editing', 'commitEdit')).toBeDefined();
    expect(api.getMethod('editing', 'cancelEdit')).toBeDefined();
    expect(api.getMethod('editing', 'getActive')).toBeDefined();
    expect(api.getMethod('editing', 'isEditing')).toBeDefined();
    expect(api.getMethod('editing', 'bind')).toBeDefined();
  });

  it('isEditing reflects current editing state', () => {
    setupPlugins();

    const isEditing = api.getMethod('editing', 'isEditing') as Function;
    expect(isEditing()).toBe(false);

    const mockMgr = { startEdit: jest.fn(), cancelEdit: jest.fn(), getCurrentValue: jest.fn() };
    store.exec('editing:bind', mockMgr);
    store.exec('editing:startEdit', { row: 0, col: 0 });

    expect(isEditing()).toBe(true);
  });

  it('destroy cleans up without error', () => {
    setupPlugins();
    const mockMgr = { startEdit: jest.fn(), cancelEdit: jest.fn() };
    store.exec('editing:bind', mockMgr);
    expect(() => host.destroy()).not.toThrow();
  });
});
