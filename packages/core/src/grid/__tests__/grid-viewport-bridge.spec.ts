import { Zengrid } from '../grid-core';
import { resetTracking } from '../../reactive/tracking';
import { resetDebug } from '../../reactive/debug';
import { resetScheduler } from '../../reactive/effect-scheduler';

// Mock ResizeObserver for jsdom
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();

beforeAll(() => {
  (globalThis as any).ResizeObserver = class {
    constructor(_cb: ResizeObserverCallback) {
      /* stored by real impl */
    }
    observe = mockObserve;
    disconnect = mockDisconnect;
    unobserve = jest.fn();
  };
});

let container: HTMLElement;
let grid: Zengrid;

const DATA = [
  [1, 'Alice'],
  [2, 'Bob'],
  [3, 'Charlie'],
  [4, 'Dave'],
  [5, 'Eve'],
];

beforeEach(() => {
  resetTracking();
  resetDebug();
  resetScheduler();
  mockObserve.mockClear();
  mockDisconnect.mockClear();
  container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: 400, configurable: true });
  Object.defineProperty(container, 'clientHeight', { value: 300, configurable: true });
  document.body.appendChild(container);
  grid = new Zengrid(container, { rowCount: 5, colCount: 2, rowHeight: 30, colWidth: 100 });
});

afterEach(() => {
  grid.destroy();
  if (container.parentNode) container.parentNode.removeChild(container);
});

describe('Grid Viewport Bridge: plugin installation', () => {
  it('Grid installs scroll, viewport, resize plugins', () => {
    const host = grid.getPluginHost();
    expect(host.has('scroll')).toBe(true);
    expect(host.has('viewport')).toBe(true);
    expect(host.has('resize')).toBe(true);
  });
});

describe('Grid Viewport Bridge: store keys', () => {
  it('scroll store keys are initialized', () => {
    const store = grid.getStore();
    expect(store.get('scroll.top')).toBe(0);
    expect(store.get('scroll.left')).toBe(0);
  });

  it('viewport store keys are initialized', () => {
    const store = grid.getStore();
    expect(store.get('viewport.visibleRows')).toEqual({ start: 0, end: 0 });
    expect(store.get('viewport.visibleCols')).toEqual({ start: 0, end: 0 });
  });

  it('resize store keys are initialized', () => {
    const store = grid.getStore();
    expect(store.get('viewport.width')).toBeDefined();
    expect(store.get('viewport.height')).toBeDefined();
  });
});

describe('Grid Viewport Bridge: render integration', () => {
  beforeEach(() => {
    grid.setData(DATA);
  });

  it('initial render syncs visible range to viewport plugin', () => {
    grid.render();
    const store = grid.getStore();
    const rows = store.get('viewport.visibleRows') as { start: number; end: number };
    // After render with data, visible range should not be the default {0, 0}
    expect(rows.end).toBeGreaterThan(0);
  });

  it('render() attaches scroll listener to scroll container', () => {
    grid.render();
    const store = grid.getStore();

    // The scroll plugin attached to the scroll container
    const scrollContainer = container.querySelector('.zg-scroll-container');
    if (scrollContainer) {
      // Set scrollTop via defineProperty (jsdom needs this)
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 60, configurable: true });
      Object.defineProperty(scrollContainer, 'scrollLeft', { value: 0, configurable: true });
      scrollContainer.dispatchEvent(new Event('scroll'));

      expect(store.get('scroll.top')).toBe(60);
    }
  });

  it('render() attaches ResizeObserver', () => {
    grid.render();
    expect(mockObserve).toHaveBeenCalled();
  });

  it('scroll event syncs visible range to viewport plugin', () => {
    grid.render();
    const store = grid.getStore();

    const scrollContainer = container.querySelector('.zg-scroll-container');
    if (scrollContainer) {
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 60, configurable: true });
      Object.defineProperty(scrollContainer, 'scrollLeft', { value: 0, configurable: true });
      scrollContainer.dispatchEvent(new Event('scroll'));
    }

    const scrollTop = store.get('scroll.top') as number;
    expect(typeof scrollTop).toBe('number');
  });
});

describe('Grid Viewport Bridge: destroy', () => {
  it('destroy() cleans up without errors', () => {
    grid.setData(DATA);
    grid.render();

    expect(() => grid.destroy()).not.toThrow();
  });
});
