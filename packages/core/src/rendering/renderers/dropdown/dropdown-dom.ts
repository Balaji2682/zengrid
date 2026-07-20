import type { RenderParams } from '../renderer.interface';
import type { DropdownOption } from './dropdown-types';
import { deepEqual } from '../renderer-utils';

/**
 * Creates the dropdown trigger button/display area
 */
export function createDropdownTrigger(displayText: string): HTMLElement {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'zg-dropdown-trigger';
  trigger.textContent = displayText;

  const arrow = document.createElement('span');
  arrow.className = 'zg-dropdown-arrow';
  arrow.innerHTML = '▼';
  arrow.setAttribute('aria-hidden', 'true');
  trigger.appendChild(arrow);

  return trigger;
}

/**
 * Creates the dropdown menu container
 */
export function createDropdownMenu(maxHeight: number): HTMLElement {
  const menu = document.createElement('div');
  menu.className = 'zg-dropdown-menu';
  menu.style.display = 'none';
  menu.style.position = 'absolute';
  menu.style.zIndex = '1000';
  menu.style.maxHeight = `${maxHeight}px`;

  return menu;
}

/**
 * Creates search input for filtering options
 */
export function createSearchInput(): HTMLElement {
  const searchContainer = document.createElement('div');
  searchContainer.className = 'zg-dropdown-search';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'zg-dropdown-search-input';
  searchInput.placeholder = 'Search...';
  searchInput.setAttribute('aria-label', 'Search options');

  searchContainer.appendChild(searchInput);
  return searchContainer;
}

/**
 * Creates the list of options with grouping support
 */
export function createOptionsList(
  options: DropdownOption[],
  selectedValues: any[],
  optionRenderer: (option: DropdownOption) => HTMLElement
): HTMLElement {
  const list = document.createElement('div');
  list.className = 'zg-dropdown-options';
  list.setAttribute('role', 'listbox');

  const fragment = document.createDocumentFragment();
  const groupedOptions = groupOptions(options);

  for (const [groupName, groupOptions] of Object.entries(groupedOptions)) {
    if (groupName !== '__default__') {
      const groupHeader = createGroupHeader(groupName);
      fragment.appendChild(groupHeader);
    }

    for (const option of groupOptions) {
      const isSelected = selectedValues.some((v) => deepEqual(v, option.value));
      const optionElement = createOptionElement(option, isSelected, optionRenderer);
      fragment.appendChild(optionElement);
    }
  }

  if (options.length === 0) {
    const noOptions = createNoOptionsElement();
    fragment.appendChild(noOptions);
  }

  list.appendChild(fragment);
  return list;
}

/**
 * Creates a group header element
 */
function createGroupHeader(groupName: string): HTMLElement {
  const groupHeader = document.createElement('div');
  groupHeader.className = 'zg-dropdown-group-header';
  groupHeader.textContent = groupName;
  groupHeader.setAttribute('role', 'presentation');
  return groupHeader;
}

/**
 * Creates a single option element
 */
function createOptionElement(
  option: DropdownOption,
  isSelected: boolean,
  optionRenderer: (option: DropdownOption) => HTMLElement
): HTMLElement {
  const optionEl = optionRenderer(option);

  optionEl.classList.add('zg-dropdown-option');
  if (isSelected) optionEl.classList.add('selected');
  if (option.disabled) optionEl.classList.add('disabled');

  optionEl.setAttribute('role', 'option');
  optionEl.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  optionEl.setAttribute('data-value', JSON.stringify(option.value));
  optionEl.setAttribute('tabindex', option.disabled ? '-1' : '0');

  if (option.disabled) {
    optionEl.setAttribute('aria-disabled', 'true');
  }

  return optionEl;
}

/**
 * Creates "no options" message element
 */
function createNoOptionsElement(): HTMLElement {
  const noOptions = document.createElement('div');
  noOptions.className = 'zg-dropdown-no-options';
  noOptions.textContent = 'No options available';
  return noOptions;
}

/**
 * Groups options by their group property
 */
function groupOptions(options: DropdownOption[]): Record<string, DropdownOption[]> {
  const grouped: Record<string, DropdownOption[]> = {};

  for (const option of options) {
    const groupName = option.group || '__default__';
    if (!grouped[groupName]) {
      grouped[groupName] = [];
    }
    grouped[groupName].push(option);
  }

  return grouped;
}

/**
 * Default option renderer
 */
export function defaultOptionRenderer(option: DropdownOption): HTMLElement {
  const div = document.createElement('div');
  div.textContent = option.label;
  return div;
}

/**
 * Updates the trigger display text
 */
export function updateTriggerDisplay(trigger: HTMLElement, displayText: string): void {
  const arrow = trigger.querySelector('.zg-dropdown-arrow');
  trigger.textContent = displayText;
  if (arrow) {
    trigger.appendChild(arrow);
  }
}

/**
 * Sets ARIA attributes for accessibility
 */
export function setAriaAttributes(
  container: HTMLElement,
  menu: HTMLElement,
  params: RenderParams,
  multiSelect: boolean
): void {
  const trigger = container.querySelector('.zg-dropdown-trigger') as HTMLElement;

  if (trigger) {
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute(
      'aria-label',
      `${params.column?.header || params.column?.field || 'Dropdown'} dropdown`
    );
  }

  if (menu) {
    const optionsList = menu.querySelector('.zg-dropdown-options');
    if (optionsList) {
      optionsList.setAttribute('aria-label', 'Options list');
      if (multiSelect) {
        optionsList.setAttribute('aria-multiselectable', 'true');
      }
    }
  }
}
