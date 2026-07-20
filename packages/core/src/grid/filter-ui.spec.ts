/**
 * @jest-environment jsdom
 */

import { GridFilterUI } from '../plugins/filter-ui/grid-filter-ui';
import { EventEmitter } from '../events/event-emitter';
import type { GridEvents } from '../events/grid-events';
import type { FilterExpression } from '../types';

describe('GridFilterUI', () => {
  let container: HTMLElement;
  let viewport: HTMLElement;
  let scrollContainer: HTMLElement;
  let header: HTMLElement;
  let anchor: HTMLButtonElement;
  let events: EventEmitter<GridEvents>;
  let filterUI: GridFilterUI;
  let setColumnFilter: jest.Mock;
  let setFieldState: jest.Mock;
  let clearColumnFilter: jest.Mock;
  let clearQuickFilter: jest.Mock;
  let clearAllFilters: jest.Mock;
  let filterExpression: FilterExpression | null;

  beforeEach(() => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    container = document.createElement('div');
    document.body.appendChild(container);

    viewport = document.createElement('div');
    viewport.className = 'zg-viewport';
    container.appendChild(viewport);

    header = document.createElement('div');
    header.className = 'zg-header';
    Object.defineProperty(header, 'offsetHeight', { value: 40, configurable: true });
    viewport.appendChild(header);

    scrollContainer = document.createElement('div');
    scrollContainer.className = 'zg-scroll-container';
    viewport.appendChild(scrollContainer);

    anchor = document.createElement('button');
    anchor.textContent = 'filter';
    document.body.appendChild(anchor);

    events = new EventEmitter<GridEvents>();
    setColumnFilter = jest.fn();
    setFieldState = jest.fn();
    clearColumnFilter = jest.fn();
    clearQuickFilter = jest.fn();
    clearAllFilters = jest.fn();
    filterExpression = null;

    filterUI = new GridFilterUI({
      container,
      events,
      columns: [
        {
          field: 'name',
          header: 'Name',
        },
      ],
      getFilterState: () => [],
      getFilterExpression: () => filterExpression,
      setColumnFilter,
      setFieldState,
      clearColumnFilter,
      clearQuickFilter,
      clearAllFilters,
      getColumnDef: () => ({
        field: 'name',
        header: 'Name',
      }),
      mapVisualToDataCol: (visualCol) => visualCol,
    });
  });

  afterEach(() => {
    filterUI.destroy();
    jest.restoreAllMocks();
    document.querySelectorAll('.zg-filter-chip-bar').forEach((chipBar) => chipBar.remove());
    document.querySelectorAll('.zg-filter-popup').forEach((popup) => popup.remove());
    anchor.remove();
    container.remove();
  });

  function openPopup(): HTMLElement {
    events.emit('header:filter:click', {
      columnIndex: 0,
      column: {
        field: 'name',
        header: 'Name',
      },
      hasActiveFilter: false,
      dropdownType: 'text',
      anchorElement: anchor,
    });

    const popup = document.querySelector('.zg-filter-popup') as HTMLElement | null;
    if (!popup) {
      throw new Error('Filter popup not found');
    }
    return popup;
  }

  it('opens a body-portaled filter popup and closes it on outside click', () => {
    const popup = openPopup();

    expect(popup.parentElement).toBe(document.body);

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(document.querySelector('.zg-filter-popup')).toBeNull();
  });

  it('applies a filter condition from the popup controls', () => {
    const popup = openPopup();
    const input = popup.querySelector('.zg-filter-popup__input') as HTMLInputElement;
    const applyButton = popup.querySelector(
      '.zg-filter-popup__btn.primary'
    ) as HTMLButtonElement;

    input.value = 'ali';
    applyButton.click();

    expect(setColumnFilter).toHaveBeenCalledWith(
      0,
      [{ operator: 'contains', value: 'ali' }],
      'AND'
    );
    expect(document.querySelector('.zg-filter-popup')).toBeNull();
  });

  it('renders filter chips for structured filters and quick search', () => {
    filterExpression = {
      type: 'model',
      models: [],
      quickFilter: { query: 'ali', columns: [0] },
      fieldState: {
        root: {
          logic: 'AND',
          conditions: [{ field: 'name', operator: 'contains', value: 'alice' }],
        },
        activeFields: ['name'],
        timestamp: Date.now(),
      },
    };

    events.emit('filter:change', {
      filterState: [],
      previousFilterState: [],
    });

    const chips = Array.from(document.querySelectorAll('.zg-filter-chip__label')).map((node) =>
      node.textContent?.trim()
    );

    expect(chips).toEqual(['Name contains "alice"', 'Search Name "ali"']);
    expect(scrollContainer.style.top).toBe('40px');
  });

  it('removes a structured chip by updating field state', () => {
    filterExpression = {
      type: 'model',
      models: [],
      fieldState: {
        root: {
          logic: 'AND',
          conditions: [{ field: 'name', operator: 'contains', value: 'alice' }],
        },
        activeFields: ['name'],
        timestamp: Date.now(),
      },
      quickFilter: { query: '', columns: null },
    };

    events.emit('filter:change', {
      filterState: [],
      previousFilterState: [],
    });

    const removeButton = document.querySelector('.zg-filter-chip__remove') as HTMLButtonElement;
    removeButton.click();

    expect(setFieldState).toHaveBeenCalledWith(
      expect.objectContaining({
        root: null,
        activeFields: [],
      })
    );
  });

  it('removes the quick filter chip and supports clearing all chips', () => {
    filterExpression = {
      type: 'model',
      models: [],
      quickFilter: { query: 'ali', columns: [0] },
      fieldState: {
        root: {
          logic: 'AND',
          conditions: [{ field: 'name', operator: 'contains', value: 'alice' }],
        },
        activeFields: ['name'],
        timestamp: Date.now(),
      },
    };

    events.emit('filter:change', {
      filterState: [],
      previousFilterState: [],
    });

    const removeButtons = document.querySelectorAll('.zg-filter-chip__remove');
    (removeButtons[1] as HTMLButtonElement).click();

    expect(clearQuickFilter).toHaveBeenCalledTimes(1);

    const clearAllButton = document.querySelector(
      '.zg-filter-chip-bar__clear'
    ) as HTMLButtonElement;
    clearAllButton.click();

    expect(clearAllFilters).toHaveBeenCalledTimes(1);
  });
});
