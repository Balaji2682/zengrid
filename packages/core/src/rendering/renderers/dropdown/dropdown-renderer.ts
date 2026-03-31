import type { CellRenderer, RenderParams } from '../renderer.interface';
import type { DropdownRendererOptions } from './dropdown-types';
import {
  createDropdownTrigger,
  createDropdownMenu,
  createSearchInput,
  createOptionsList,
  defaultOptionRenderer,
  updateTriggerDisplay,
  setAriaAttributes,
} from './dropdown-dom';
import { DropdownState, globalOpenDropdownMenus } from './dropdown-state';
import { DropdownNavigation } from './dropdown-navigation';
import { DropdownEventManager } from './dropdown-events';

/**
 * DropdownRenderer - Renders a searchable dropdown/select component
 *
 * Features:
 * - Single and multi-select modes with 3 display formats (tags/count/list)
 * - Searchable/filterable options with LRU cache
 * - Option grouping with visual group headers
 * - Custom option rendering
 * - Global singleton pattern for dropdown management (only one open at a time)
 * - Full keyboard navigation (ArrowDown/Up, Enter, Space, Escape, Home, End)
 * - Document click to close dropdown
 * - Event delegation for performance
 * - Deep value comparison for complex option values
 * - Full ARIA attributes for accessibility
 * - Optimized update() method for virtual scrolling
 *
 * Performance:
 * - LRU cache for filtered search results (200 items)
 * - DocumentFragment for batch DOM operations
 * - Event delegation for option clicks
 * - Optimized for 1000+ options with search
 *
 * @example
 * ```typescript
 * // Simple single-select dropdown
 * const renderer = new DropdownRenderer({
 *   options: [
 *     { label: 'Active', value: 'active' },
 *     { label: 'Inactive', value: 'inactive' },
 *     { label: 'Pending', value: 'pending' }
 *   ],
 *   onChange: (value, params) => {
 *     console.log('Status changed to:', value);
 *   }
 * });
 *
 * // Searchable multi-select with grouping
 * const renderer = new DropdownRenderer({
 *   options: [
 *     { label: 'Red', value: 'red', group: 'Colors' },
 *     { label: 'Green', value: 'green', group: 'Colors' },
 *     { label: 'Circle', value: 'circle', group: 'Shapes' },
 *     { label: 'Square', value: 'square', group: 'Shapes' }
 *   ],
 *   searchable: true,
 *   multiSelect: true,
 *   multiSelectDisplay: 'count'
 * });
 * ```
 */
export class DropdownRenderer implements CellRenderer {
  private options: Required<
    Pick<
      DropdownRendererOptions,
      | 'searchable'
      | 'multiSelect'
      | 'allowCustom'
      | 'placeholder'
      | 'className'
      | 'maxHeight'
      | 'multiSelectDisplay'
      | 'caseSensitiveSearch'
      | 'maxVisibleOptions'
    >
  > &
    DropdownRendererOptions;
  private state: DropdownState;
  private navigation: DropdownNavigation;
  private eventManager: DropdownEventManager;

  constructor(options: DropdownRendererOptions = {}) {
    // Throw if options array is empty or missing
    if (!options.options || options.options.length === 0) {
      throw new Error('DropdownRenderer requires at least one option');
    }

    this.options = {
      options: options.options ?? [],
      searchable: options.searchable ?? false,
      multiSelect: options.multiSelect ?? false,
      allowCustom: options.allowCustom ?? false,
      placeholder: options.placeholder ?? 'Select...',
      className: options.className ?? 'zg-dropdown',
      maxHeight: options.maxHeight ?? 300,
      multiSelectDisplay: options.multiSelectDisplay ?? 'tags',
      caseSensitiveSearch: options.caseSensitiveSearch ?? false,
      maxVisibleOptions: options.maxVisibleOptions ?? 10,
      onChange: options.onChange,
      optionRenderer: options.optionRenderer ?? defaultOptionRenderer,
    };

    this.state = new DropdownState();
    this.navigation = new DropdownNavigation();
    this.eventManager = new DropdownEventManager(this.state, this.navigation);
  }

  render(element: HTMLElement, params: RenderParams): void {
    this.destroy(element);
    element.classList.add('zg-cell-dropdown');

    const container = document.createElement('div');
    container.className = `zg-dropdown-wrapper ${this.options.className}`;

    const displayText = this.state.getDisplayText(
      params.value,
      this.options.options!,
      this.options.multiSelect,
      this.options.multiSelectDisplay,
      this.options.placeholder
    );
    const trigger = createDropdownTrigger(displayText);
    container.appendChild(trigger);

    const menu = createDropdownMenu(this.options.maxHeight);

    if (this.options.searchable) {
      const searchInput = createSearchInput();
      menu.appendChild(searchInput);
    }

    const selectedValues = this.state.normalizeValue(params.value);
    const optionsList = createOptionsList(
      this.options.options!,
      selectedValues,
      this.options.optionRenderer!
    );
    menu.appendChild(optionsList);

    this.state.registerMenu(menu, container);

    this.eventManager.attachEventHandlers(
      container,
      trigger,
      menu,
      params,
      {
        searchable: this.options.searchable,
        multiSelect: this.options.multiSelect,
        caseSensitiveSearch: this.options.caseSensitiveSearch,
        onChange: this.options.onChange,
      },
      this.options.options!
    );

    setAriaAttributes(container, menu, params, this.options.multiSelect);

    element.appendChild(container);
    this.update(element, params);
  }

  update(element: HTMLElement, params: RenderParams): void {
    const container = element.querySelector('.zg-dropdown-wrapper') as HTMLElement;
    if (!container) return;

    const trigger = container.querySelector('.zg-dropdown-trigger') as HTMLElement;
    const menu =
      globalOpenDropdownMenus.get(container) ||
      (container.querySelector('.zg-dropdown-menu') as HTMLElement | null);

    if (!trigger || !menu) return;

    const displayText = this.state.getDisplayText(
      params.value,
      this.options.options!,
      this.options.multiSelect,
      this.options.multiSelectDisplay,
      this.options.placeholder
    );
    updateTriggerDisplay(trigger, displayText);

    const selectedValues = this.state.normalizeValue(params.value);
    this.state.updateSelectedStates(menu, selectedValues);

    container.dataset['row'] = String(params.cell.row);
    container.dataset['col'] = String(params.cell.col);
    if (params.column?.field) {
      container.dataset['field'] = params.column.field;
    }

    trigger.setAttribute(
      'aria-label',
      `${params.column?.header || params.column?.field || 'Dropdown'} dropdown`
    );
  }

  destroy(element: HTMLElement): void {
    const container = element.querySelector('.zg-dropdown-wrapper') as HTMLElement;
    if (container) {
      const menu =
        globalOpenDropdownMenus.get(container) ||
        (container.querySelector('.zg-dropdown-menu') as HTMLElement | null);

      this.eventManager.removeEventHandlers(container);

      if (menu) {
        this.state.dismissDropdown(menu, container);
        globalOpenDropdownMenus.delete(container);
        menu.remove();
      }
    }

    element.innerHTML = '';
    element.classList.remove('zg-cell-dropdown');
  }

  getCellClass(params: RenderParams): string | undefined {
    const values = this.state.normalizeValue(params.value);

    if (values.length === 0) {
      return 'zg-dropdown-empty';
    }

    if (this.options.multiSelect && values.length > 1) {
      return 'zg-dropdown-multiple';
    }

    return 'zg-dropdown-has-value';
  }
}

/**
 * Factory function to create DropdownRenderer
 *
 * @example
 * ```typescript
 * // In column definition
 * const column = {
 *   field: 'status',
 *   header: 'Status',
 *   renderer: 'dropdown',
 * };
 *
 * // Or create directly
 * const renderer = createDropdownRenderer({
 *   options: [
 *     { label: 'Active', value: 'active' },
 *     { label: 'Inactive', value: 'inactive' },
 *     { label: 'Pending', value: 'pending' }
 *   ],
 *   searchable: true,
 *   onChange: (value) => console.log('Status changed to:', value)
 * });
 * ```
 */
export function createDropdownRenderer(options: DropdownRendererOptions): DropdownRenderer {
  return new DropdownRenderer(options);
}
