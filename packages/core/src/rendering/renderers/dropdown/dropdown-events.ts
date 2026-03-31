import type { RenderParams } from '../renderer.interface';
import type { DropdownOption } from './dropdown-types';
import { deepEqual } from '../renderer-utils';
import { DropdownState, globalOpenDropdownMenus } from './dropdown-state';
import { DropdownNavigation } from './dropdown-navigation';
import { updateTriggerDisplay } from './dropdown-dom';

/**
 * Manages event handlers for dropdown
 */
export class DropdownEventManager {
  private eventHandlers: Map<HTMLElement, Map<string, EventListener>>;
  private state: DropdownState;
  private navigation: DropdownNavigation;

  constructor(state: DropdownState, navigation: DropdownNavigation) {
    this.eventHandlers = new Map();
    this.state = state;
    this.navigation = navigation;
  }

  /**
   * Attaches event handlers to dropdown elements
   */
  attachEventHandlers(
    container: HTMLElement,
    trigger: HTMLElement,
    menu: HTMLElement,
    params: RenderParams,
    options: {
      searchable: boolean;
      multiSelect: boolean;
      caseSensitiveSearch: boolean;
      onChange?: (value: any | any[], params: RenderParams) => void;
    },
    dropdownOptions: DropdownOption[]
  ): void {
    const handlers = new Map<string, EventListener>();

    const clickHandler = (e: Event) => {
      e.stopPropagation();
      this.toggleDropdown(menu, container, options.searchable);
    };
    trigger.addEventListener('click', clickHandler);
    handlers.set('click', clickHandler);

    const optionClickHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      const optionEl = target.closest('.zg-dropdown-option') as HTMLElement;

      if (optionEl && !optionEl.classList.contains('disabled')) {
        e.stopPropagation();
        const valueStr = optionEl.dataset['value'];
        if (valueStr) {
          const value = JSON.parse(valueStr);
          this.handleOptionSelect(
            value,
            params,
            container,
            menu,
            options.multiSelect,
            options.onChange,
            dropdownOptions
          );
        }
      }
    };
    menu.addEventListener('click', optionClickHandler);
    handlers.set('optionClick', optionClickHandler);

    if (options.searchable) {
      const searchInput = menu.querySelector('.zg-dropdown-search-input') as HTMLInputElement;
      if (searchInput) {
        const searchHandler = (e: Event) => {
          const query = (e.target as HTMLInputElement).value;
          const filtered = this.state.filterOptions(
            query,
            dropdownOptions,
            options.caseSensitiveSearch
          );
          this.state.applyFilterToMenu(menu, filtered);
        };
        searchInput.addEventListener('input', searchHandler);
        handlers.set('search', searchHandler);
      }
    }

    const keydownHandler = (e: Event) => {
      this.navigation.handleKeyboardNavigation(
        e as KeyboardEvent,
        menu,
        container,
        () => this.openDropdown(menu, container, options.searchable),
        () => this.closeDropdown(menu, container, options.searchable)
      );
    };
    container.addEventListener('keydown', keydownHandler);
    handlers.set('keydown', keydownHandler);

    this.eventHandlers.set(container, handlers);
  }

  /**
   * Removes event handlers from container
   */
  removeEventHandlers(container: HTMLElement): void {
    const handlers = this.eventHandlers.get(container);
    if (handlers) {
      const trigger = container.querySelector('.zg-dropdown-trigger');
      const menu =
        globalOpenDropdownMenus.get(container) ||
        (container.querySelector('.zg-dropdown-menu') as HTMLElement | null);
      const searchInput = menu?.querySelector('.zg-dropdown-search-input');

      for (const [eventType, handler] of handlers) {
        if (eventType === 'click' && trigger) {
          trigger.removeEventListener('click', handler);
        } else if (eventType === 'optionClick' && menu) {
          menu.removeEventListener('click', handler);
        } else if (eventType === 'search' && searchInput) {
          searchInput.removeEventListener('input', handler);
        } else if (eventType === 'keydown') {
          container.removeEventListener('keydown', handler);
        }
      }

      this.eventHandlers.delete(container);
    }
  }

  /**
   * Toggles dropdown open/closed
   */
  private toggleDropdown(menu: HTMLElement, container: HTMLElement, searchable: boolean): void {
    const isOpen = menu.style.display !== 'none';

    if (isOpen) {
      this.closeDropdown(menu, container, searchable);
    } else {
      this.openDropdown(menu, container, searchable);
    }
  }

  /**
   * Opens dropdown menu
   */
  private openDropdown(menu: HTMLElement, container: HTMLElement, searchable: boolean): void {
    this.state.openDropdown(menu, container);

    if (searchable) {
      this.navigation.focusSearchInput(menu);
    }
  }

  /**
   * Closes dropdown menu
   */
  private closeDropdown(menu: HTMLElement, container: HTMLElement, searchable: boolean): void {
    this.state.closeDropdown(menu, container);

    if (searchable) {
      this.state.clearSearch(menu);
    }
  }

  /**
   * Handles option selection
   */
  private handleOptionSelect(
    value: any,
    params: RenderParams,
    container: HTMLElement,
    menu: HTMLElement,
    multiSelect: boolean,
    onChange: ((value: any | any[], params: RenderParams) => void) | undefined,
    dropdownOptions: DropdownOption[]
  ): void {
    let newValue: any;

    if (multiSelect) {
      const currentValues = this.state.normalizeValue(params.value);
      const index = currentValues.findIndex((v) => deepEqual(v, value));

      if (index >= 0) {
        currentValues.splice(index, 1);
      } else {
        currentValues.push(value);
      }

      newValue = currentValues;
      this.state.updateSelectedStates(menu, currentValues);
    } else {
      newValue = value;
      this.closeDropdown(menu, container, false);
    }

    const trigger = container.querySelector('.zg-dropdown-trigger') as HTMLElement;
    if (trigger) {
      const displayText = this.state.getDisplayText(
        newValue,
        dropdownOptions,
        multiSelect,
        'count',
        'Select...'
      );
      updateTriggerDisplay(trigger, displayText);
    }

    if (onChange) {
      try {
        onChange(newValue, params);
      } catch (error) {
        console.error('DropdownRenderer: Error in onChange handler:', error);
      }
    }
  }
}
