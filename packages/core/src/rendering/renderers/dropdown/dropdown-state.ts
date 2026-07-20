import type { DropdownOption } from './dropdown-types';
import { deepEqual, SimpleLRUCache } from '../renderer-utils';
import { OverlayManager } from '../../../overlay/overlay-manager';

/**
 * Tracks the live menu element for each dropdown container. Menus stay body-portaled
 * for their whole lifetime so DOM ownership does not change between open/close.
 */
export const globalOpenDropdownMenus = new WeakMap<HTMLElement, HTMLElement>();

/**
 * Manages dropdown state and selection
 */
export class DropdownState {
  private filteredOptionsCache: SimpleLRUCache<string, DropdownOption[]>;
  private overlayManager: OverlayManager;

  constructor() {
    this.filteredOptionsCache = new SimpleLRUCache<string, DropdownOption[]>(200);
    this.overlayManager = OverlayManager.getInstance();
  }

  /**
   * Normalizes value to array format
   */
  normalizeValue(value: any): any[] {
    if (value === null || value === undefined) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }

  /**
   * Gets option label for a value
   */
  getOptionLabel(value: any, options: DropdownOption[]): string {
    const option = options.find((opt) => deepEqual(opt.value, value));
    return option ? option.label : String(value);
  }

  /**
   * Gets display text for the current value(s)
   */
  getDisplayText(
    value: any,
    options: DropdownOption[],
    multiSelect: boolean,
    multiSelectDisplay: 'tags' | 'count' | 'list',
    placeholder: string
  ): string {
    if (value === null || value === undefined) {
      return placeholder;
    }

    const values = this.normalizeValue(value);

    if (values.length === 0) {
      return placeholder;
    }

    if (multiSelect) {
      if (multiSelectDisplay === 'count') {
        return `${values.length} selected`;
      } else if (multiSelectDisplay === 'list') {
        const labels = values.map((v) => this.getOptionLabel(v, options));
        return labels.join(', ');
      } else {
        return `${values.length} selected`;
      }
    } else {
      return this.getOptionLabel(values[0], options);
    }
  }

  /**
   * Filters options based on search query
   */
  filterOptions(
    query: string,
    options: DropdownOption[],
    caseSensitive: boolean
  ): DropdownOption[] {
    const cacheKey = `${query}_${caseSensitive}`;
    let filteredOptions = this.filteredOptionsCache.get(cacheKey);

    if (!filteredOptions) {
      const normalizedQuery = caseSensitive ? query : query.toLowerCase();

      filteredOptions = options.filter((option) => {
        const normalizedLabel = caseSensitive ? option.label : option.label.toLowerCase();
        return normalizedLabel.includes(normalizedQuery);
      });

      this.filteredOptionsCache.set(cacheKey, filteredOptions);
    }

    return filteredOptions;
  }

  /**
   * Updates selected states in the menu
   */
  updateSelectedStates(menu: HTMLElement, selectedValues: any[]): void {
    const optionsList = menu.querySelector('.zg-dropdown-options');
    if (!optionsList) return;

    optionsList.querySelectorAll('.zg-dropdown-option').forEach((optionEl) => {
      const valueStr = (optionEl as HTMLElement).dataset['value'];
      if (valueStr) {
        const value = JSON.parse(valueStr);
        const isSelected = selectedValues.some((v) => deepEqual(v, value));

        if (isSelected) {
          optionEl.classList.add('selected');
          optionEl.setAttribute('aria-selected', 'true');
          (optionEl as HTMLElement).style.backgroundColor = '#e3f2fd';
        } else {
          optionEl.classList.remove('selected');
          optionEl.setAttribute('aria-selected', 'false');
          (optionEl as HTMLElement).style.backgroundColor = '#fff';
        }
      }
    });
  }

  /**
   * Applies filter to options list in the DOM
   */
  applyFilterToMenu(menu: HTMLElement, filteredOptions: DropdownOption[]): void {
    const optionsList = menu.querySelector('.zg-dropdown-options') as HTMLElement;
    if (!optionsList) return;

    const optionElements = optionsList.querySelectorAll('.zg-dropdown-option');
    optionElements.forEach((optionEl) => {
      const valueStr = (optionEl as HTMLElement).dataset['value'];
      if (valueStr) {
        const value = JSON.parse(valueStr);
        const isVisible = filteredOptions.some((opt) => deepEqual(opt.value, value));
        (optionEl as HTMLElement).style.display = isVisible ? '' : 'none';
      }
    });

    this.updateGroupHeadersVisibility(optionsList);
  }

  /**
   * Updates group headers visibility based on visible options
   */
  private updateGroupHeadersVisibility(optionsList: HTMLElement): void {
    const groupHeaders = optionsList.querySelectorAll('.zg-dropdown-group-header');
    groupHeaders.forEach((header) => {
      const nextOptions: HTMLElement[] = [];
      let sibling = header.nextElementSibling;

      while (sibling && !sibling.classList.contains('zg-dropdown-group-header')) {
        if (sibling.classList.contains('zg-dropdown-option')) {
          nextOptions.push(sibling as HTMLElement);
        }
        sibling = sibling.nextElementSibling;
      }

      const hasVisibleOptions = nextOptions.some((opt) => opt.style.display !== 'none');
      (header as HTMLElement).style.display = hasVisibleOptions ? '' : 'none';
    });
  }

  /**
   * Registers a dropdown menu and keeps it portaled to document.body for its full lifetime.
   */
  registerMenu(menu: HTMLElement, container: HTMLElement): void {
    if (menu.parentElement !== document.body) {
      document.body.appendChild(menu);
    }

    globalOpenDropdownMenus.set(container, menu);
    menu.style.display = 'none';
  }

  /**
   * Opens dropdown menu
   */
  openDropdown(menu: HTMLElement, container: HTMLElement): void {
    const trigger = container.querySelector('.zg-dropdown-trigger') as HTMLElement;
    if (!trigger) return;

    this.overlayManager.open({
      overlay: menu,
      anchor: trigger,
      additionalElements: [container],
      positionOptions: {
        placement: 'bottom-start',
        offset: 2,
        viewportPadding: 8,
      },
      scrollOptions: {
        // Trigger lives in a virtualized cell. While the cell is on-screen, keep
        // the menu glued to it (reposition); the moment it scrolls out of the
        // viewport, close. closeOnOutOfView fires while the element is still in
        // the viewport, i.e. before the cell is recycled to another row, so the
        // menu never anchors to the wrong row.
        closeOnOutOfView: true,
        repositionOnScroll: true,
      },
      restoreFocusOnClose: true,
      restoreFocusTo: trigger,
      onOpen: () => {
        menu.style.display = 'block';
        menu.style.minWidth = `${trigger.getBoundingClientRect().width}px`;
        container.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        globalOpenDropdownMenus.set(container, menu);
      },
      onClose: () => {
        this.applyClosedState(menu, container);
        this.clearSearch(menu);
      },
    });
  }

  /**
   * Closes dropdown menu
   */
  closeDropdown(menu: HTMLElement, container: HTMLElement): void {
    if (this.overlayManager.isOpen(menu)) {
      this.overlayManager.close(menu);
      return;
    }

    this.applyClosedState(menu, container);
  }

  dismissDropdown(menu: HTMLElement, container: HTMLElement): void {
    if (this.overlayManager.isOpen(menu)) {
      this.overlayManager.dismiss(menu);
    }

    this.applyClosedState(menu, container);
  }

  /**
   * Clears search input and resets options display
   */
  clearSearch(menu: HTMLElement): void {
    const searchInput = menu.querySelector('.zg-dropdown-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';

      const optionsList = menu.querySelector('.zg-dropdown-options') as HTMLElement;
      if (optionsList) {
        optionsList.querySelectorAll('.zg-dropdown-option').forEach((opt) => {
          (opt as HTMLElement).style.display = '';
        });
        optionsList.querySelectorAll('.zg-dropdown-group-header').forEach((header) => {
          (header as HTMLElement).style.display = '';
        });
      }
    }
  }

  private applyClosedState(menu: HTMLElement, container: HTMLElement): void {
    menu.style.display = 'none';
    container.classList.remove('open');

    const trigger = container.querySelector('.zg-dropdown-trigger') as HTMLElement;
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
    }
  }
}
