import type { DropdownOption, DropdownEditorNormalizedOptions } from './types';
import type { EditorParams } from '../cell-editor.interface';
import { groupOptions } from './search-filter';

/**
 * Create search input element
 */
export function createSearchInput(
  options: DropdownEditorNormalizedOptions,
  placeholder: string
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = `${options.className}-search`;
  input.placeholder = placeholder;
  input.setAttribute('role', 'searchbox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', 'dropdown-menu');

  input.style.width = '100%';
  input.style.height = '100%';
  input.style.border = '2px solid #4CAF50';
  input.style.outline = 'none';
  input.style.padding = '4px 8px';
  input.style.fontSize = '13px';
  input.style.fontFamily = 'inherit';
  input.style.backgroundColor = '#fff';
  input.style.boxSizing = 'border-box';

  return input;
}

/**
 * Create display element (for non-searchable dropdown)
 */
export function createDisplayElement(
  options: DropdownEditorNormalizedOptions,
  displayText: string
): HTMLDivElement {
  const display = document.createElement('div');
  display.className = `${options.className}-display`;
  display.textContent = displayText;
  display.setAttribute('tabindex', '0');
  display.setAttribute('role', 'button');

  display.style.width = '100%';
  display.style.height = '100%';
  display.style.border = '2px solid #4CAF50';
  display.style.outline = 'none';
  display.style.padding = '4px 8px';
  display.style.fontSize = '13px';
  display.style.fontFamily = 'inherit';
  display.style.backgroundColor = '#fff';
  display.style.boxSizing = 'border-box';
  display.style.cursor = 'pointer';
  display.style.userSelect = 'none';
  display.style.display = 'flex';
  display.style.alignItems = 'center';

  return display;
}

/**
 * Create dropdown menu element
 */
export function createDropdownMenu(options: DropdownEditorNormalizedOptions): HTMLDivElement {
  const menu = document.createElement('div');
  menu.className = `${options.className}-menu`;
  menu.id = 'dropdown-menu';
  menu.setAttribute('role', 'listbox');

  if (options.multiSelect) {
    menu.setAttribute('aria-multiselectable', 'true');
  }

  menu.style.position = 'absolute';
  menu.style.top = '100%';
  menu.style.left = '0';
  menu.style.width = '100%';
  menu.style.maxHeight = `${options.maxHeight}px`;
  menu.style.overflowY = 'auto';
  menu.style.backgroundColor = '#fff';
  menu.style.border = '1px solid #ccc';
  menu.style.borderTop = 'none';
  menu.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  menu.style.zIndex = '1000';
  menu.style.display = 'none';
  menu.style.boxSizing = 'border-box';

  return menu;
}

/**
 * Create container element
 */
export function createContainer(
  options: DropdownEditorNormalizedOptions,
  params: EditorParams
): HTMLDivElement {
  const container = document.createElement('div');
  container.className = `${options.className}-container`;
  container.setAttribute('role', 'combobox');
  container.setAttribute('aria-expanded', 'false');
  container.setAttribute('aria-haspopup', 'listbox');
  container.setAttribute(
    'aria-label',
    `Edit ${params.column?.header || params.column?.field || 'dropdown'}`
  );

  if (options.required) {
    container.setAttribute('aria-required', 'true');
  }

  container.style.position = 'relative';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.boxSizing = 'border-box';

  container.dataset['row'] = String(params.cell.row);
  container.dataset['col'] = String(params.cell.col);
  if (params.column?.field) {
    container.dataset['field'] = params.column.field;
  }

  return container;
}

/**
 * Create an option element
 */
export function createOptionElement(
  option: DropdownOption,
  index: number,
  className: string,
  selectedValues: Set<any>,
  highlightedIndex: number,
  onSelectOption: (option: DropdownOption) => void
): HTMLElement {
  const optionElement = document.createElement('div');
  optionElement.className = `${className}-option`;
  optionElement.textContent = option.label;
  optionElement.setAttribute('role', 'option');
  optionElement.setAttribute('data-value', String(option.value));
  optionElement.setAttribute('data-index', String(index));

  optionElement.style.padding = '6px 8px';
  optionElement.style.cursor = option.disabled ? 'not-allowed' : 'pointer';
  optionElement.style.fontSize = '13px';
  optionElement.style.userSelect = 'none';

  if (option.disabled) {
    optionElement.classList.add('disabled');
    optionElement.setAttribute('aria-disabled', 'true');
    optionElement.style.color = '#ccc';
  } else {
    optionElement.addEventListener('mouseenter', () => {
      optionElement.style.backgroundColor = '#f5f5f5';
    });
    optionElement.addEventListener('mouseleave', () => {
      if (!selectedValues.has(option.value)) {
        optionElement.style.backgroundColor = 'transparent';
      }
    });
  }

  if (selectedValues.has(option.value)) {
    optionElement.classList.add('selected');
    optionElement.setAttribute('aria-selected', 'true');
    optionElement.style.backgroundColor = '#e3f2fd';
    optionElement.style.color = '#1976d2';
  }

  if (index === highlightedIndex) {
    optionElement.classList.add('highlighted');
    optionElement.style.backgroundColor = '#f0f0f0';
    optionElement.style.outline = '2px solid #4CAF50';
  }

  if (!option.disabled) {
    optionElement.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelectOption(option);
    });
  }

  return optionElement;
}

/**
 * Render filtered options in the dropdown menu
 */
export function renderFilteredOptions(
  dropdownMenu: HTMLElement,
  filteredOptions: DropdownOption[],
  className: string,
  selectedValues: Set<any>,
  highlightedIndex: number,
  onSelectOption: (option: DropdownOption) => void
): void {
  dropdownMenu.innerHTML = '';

  if (filteredOptions.length === 0) {
    const noResults = document.createElement('div');
    noResults.className = `${className}-no-results`;
    noResults.textContent = 'No results found';
    noResults.style.padding = '8px';
    noResults.style.color = '#999';
    noResults.style.textAlign = 'center';
    dropdownMenu.appendChild(noResults);
    return;
  }

  const grouped = groupOptions(filteredOptions);

  let optionIndex = 0;
  for (const [groupName, options] of Object.entries(grouped)) {
    if (groupName !== '__ungrouped__') {
      const groupHeader = document.createElement('div');
      groupHeader.className = `${className}-group-header`;
      groupHeader.textContent = groupName;
      groupHeader.style.padding = '6px 8px';
      groupHeader.style.fontWeight = 'bold';
      groupHeader.style.fontSize = '11px';
      groupHeader.style.color = '#666';
      groupHeader.style.textTransform = 'uppercase';
      groupHeader.style.borderTop = '1px solid #eee';
      dropdownMenu.appendChild(groupHeader);
    }

    options.forEach((option) => {
      const optionElement = createOptionElement(
        option,
        optionIndex,
        className,
        selectedValues,
        highlightedIndex,
        onSelectOption
      );
      dropdownMenu.appendChild(optionElement);
      optionIndex++;
    });
  }
}
