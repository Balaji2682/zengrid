import { PluginHost } from '../../grid/plugin-host';
import { GridApiImpl } from '../../grid/grid-api';
import { GridStoreImpl } from '../../reactive/store';
import { resetTracking } from '../../reactive/tracking';
import { resetDebug } from '../../reactive/debug';
import { resetScheduler } from '../../reactive/effect-scheduler';
import type { GridPlugin } from '../../reactive/types';
import type { GridState } from '../../types';
import { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import { createLifecyclePlugin, isAdditiveHeaderSortInteraction } from './lifecycle-plugin';

let store: GridStoreImpl;
let events: EventEmitter<GridEvents>;
let api: GridApiImpl;
let host: PluginHost;
let container: HTMLElement;
let headerContainer: HTMLElement;
let state: GridState;

function createCorePlugin(): GridPlugin {
  return {
    name: 'core',
    phase: 0,
    setup(store, api) {
      store.action('column:setup', () => {}, 'core');
      store.action('editing:setup', () => {}, 'core');
      store.action('sort:toggle', () => {}, 'core');

      api.register('column', {
        getModel: () => null,
      });
    },
  };
}

function createDomPlugin(): GridPlugin {
  return {
    name: 'dom',
    phase: 0,
    setup(store) {
      store.extend('dom.headerContainer', headerContainer, 'dom');
      store.extend('dom.scrollContainer', null, 'dom');
      store.action('dom:setup', () => {}, 'dom');
    },
  };
}

function createRenderingPlugin(): GridPlugin {
  return {
    name: 'rendering',
    phase: 0,
    setup(store) {
      store.action('rendering:initialize', () => {}, 'rendering');
      store.action('rendering:updateCanvasSize', () => {}, 'rendering');
      store.action('rendering:renderCells', () => {}, 'rendering');
      store.action('rendering:setRowCount', () => {}, 'rendering');
      store.action('rendering:clearCache', () => {}, 'rendering');
      store.action('rendering:refresh', () => {}, 'rendering');
      store.action('rendering:syncAfterPipeline', () => {}, 'rendering');
    },
  };
}

describe('LifecyclePlugin sort header handler', () => {
  beforeEach(() => {
    resetTracking();
    resetDebug();
    resetScheduler();

    store = new GridStoreImpl();
    events = new EventEmitter<GridEvents>();
    api = new GridApiImpl(store, events);
    host = new PluginHost(store, api);
    container = document.createElement('div');
    headerContainer = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 300, configurable: true });
    document.body.appendChild(container);

    state = {
      data: [],
      selection: [],
      activeCell: null,
      scrollPosition: { top: 0, left: 0 },
      editingCell: null,
    };

    host.use(createCorePlugin());
    host.use(createDomPlugin());
    host.use(createRenderingPlugin());
    host.use(
      createLifecyclePlugin({
        options: {
          rowCount: 3,
          colCount: 2,
          rowHeight: 30,
          colWidth: 100,
        },
        state,
        container,
        events,
        getColumnModel: () => null,
        getDataAccessor: () => null,
        setColumnModel: () => {},
      })
    );

    store.exec('lifecycle:render');
  });

  afterEach(() => {
    host.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('forwards additive sort intent to sort:toggle', () => {
    const execSpy = jest.spyOn(store, 'exec');

    events.emit('header:sort:click', {
      columnIndex: 1,
      column: { field: 'name', header: 'Name', sortable: true },
      currentDirection: 'asc',
      nextDirection: 'desc',
      additive: true,
      trigger: 'keyboard',
      nativeEvent: new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }),
    });

    expect(execSpy).toHaveBeenCalledWith('sort:toggle', 1, true);
  });

  it('derives additive sort intent from modifier keys when additive is not provided', () => {
    expect(
      isAdditiveHeaderSortInteraction({
        columnIndex: 0,
        column: { field: 'name', header: 'Name', sortable: true },
        nextDirection: 'asc',
        nativeEvent: new MouseEvent('click', { shiftKey: true }),
      })
    ).toBe(true);

    expect(
      isAdditiveHeaderSortInteraction({
        columnIndex: 0,
        column: { field: 'name', header: 'Name', sortable: true },
        nextDirection: 'asc',
        nativeEvent: new MouseEvent('click'),
      })
    ).toBe(false);
  });
});
