/**
 * @jest-environment jsdom
 */

import { DropdownRenderer, createDropdownRenderer, type DropdownOption } from '../dropdown';
import { globalOpenDropdownMenus } from '../dropdown/dropdown-state';
import type { RenderParams } from '../renderer.interface';

function getDropdownWrapper(root: HTMLElement): HTMLElement {
  const wrapper = root.querySelector('.zg-dropdown-wrapper') as HTMLElement | null;
  if (!wrapper) {
    throw new Error('Dropdown wrapper not found');
  }
  return wrapper;
}

function getDropdownMenu(root: HTMLElement): HTMLElement {
  const wrapper = getDropdownWrapper(root);
  return (globalOpenDropdownMenus.get(wrapper) || wrapper.querySelector('.zg-dropdown-menu')) as HTMLElement;
}

describe('DropdownRenderer', () => {
  let renderer: DropdownRenderer;
  let element: HTMLElement;
  let params: RenderParams;

  const defaultOptions: DropdownOption[] = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Pending', value: 'pending' },
  ];

  beforeEach(() => {
    renderer = new DropdownRenderer({ options: defaultOptions });
    element = document.createElement('div');
    document.body.appendChild(element);
    params = {
      cell: { row: 0, col: 0 },
      position: { x: 0, y: 0, width: 200, height: 40 },
      value: 'active',
      column: { field: 'status', header: 'Status' },
      rowData: { id: 1, status: 'active' },
      isSelected: false,
      isActive: false,
      isEditing: false,
    } as RenderParams;
  });

  afterEach(() => {
    // Clean up any open dropdowns
    document.querySelectorAll('.zg-dropdown-menu').forEach((menu) => {
      menu.remove();
    });
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  describe('Constructor', () => {
    it('should create instance with default options', () => {
      const renderer = new DropdownRenderer({ options: defaultOptions });
      expect(renderer).toBeInstanceOf(DropdownRenderer);
    });

    it('should throw error if options array is empty', () => {
      expect(() => new DropdownRenderer({ options: [] })).toThrow(
        'DropdownRenderer requires at least one option'
      );
    });

    it('should throw error if options is missing', () => {
      expect(() => new DropdownRenderer({} as any)).toThrow(
        'DropdownRenderer requires at least one option'
      );
    });

    it('should accept searchable option', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        searchable: true,
      });
      renderer.render(element, params);

      const searchInput = getDropdownMenu(element).querySelector('.zg-dropdown-search-input');
      expect(searchInput).toBeTruthy();
    });

    it('should accept multiSelect option', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        multiSelect: true,
      });
      expect(renderer).toBeInstanceOf(DropdownRenderer);
    });

    it('should accept custom placeholder', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        placeholder: 'Choose one...',
      });
      const params2 = { ...params, value: null };
      renderer.render(element, params2);

      const trigger = element.querySelector('.zg-dropdown-trigger');
      expect(trigger?.textContent).toContain('Choose one...');
    });

    it('should accept custom className', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        className: 'custom-dropdown',
      });
      renderer.render(element, params);

      const wrapper = element.querySelector('.zg-dropdown-wrapper');
      expect(wrapper?.classList.contains('custom-dropdown')).toBe(true);
    });

    it('should accept onChange callback', () => {
      const onChange = jest.fn();
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        onChange,
      });
      expect(renderer).toBeInstanceOf(DropdownRenderer);
    });

    it('should accept maxHeight option', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        maxHeight: 400,
      });
      renderer.render(element, params);

      const menu = getDropdownMenu(element);
      expect(menu.style.maxHeight).toBe('400px');
    });

    it('should accept multiSelectDisplay option', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        multiSelect: true,
        multiSelectDisplay: 'count',
      });
      expect(renderer).toBeInstanceOf(DropdownRenderer);
    });
  });

  describe('render()', () => {
    it('should create dropdown container', () => {
      renderer.render(element, params);

      const wrapper = element.querySelector('.zg-dropdown-wrapper');
      expect(wrapper).toBeTruthy();
      expect(element.classList.contains('zg-cell-dropdown')).toBe(true);
    });

    it('should create dropdown trigger button', () => {
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger');
      expect(trigger).toBeTruthy();
      expect((trigger as HTMLElement).tagName).toBe('BUTTON');
      expect((trigger as HTMLElement).getAttribute('type')).toBe('button');
    });

    it('should create dropdown menu (initially hidden)', () => {
      renderer.render(element, params);

      const menu = getDropdownMenu(element);
      expect(menu).toBeTruthy();
      expect(menu.style.display).toBe('none');
    });

    it('keeps the menu body-portaled even while hidden', () => {
      renderer.render(element, params);

      const menu = getDropdownMenu(element);
      expect(menu.parentElement).toBe(document.body);
      expect(menu.style.display).toBe('none');
    });

    it('should display selected value in trigger', () => {
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger');
      expect(trigger?.textContent).toContain('Active');
    });

    it('should display placeholder when no value selected', () => {
      const params2 = { ...params, value: null };
      renderer.render(element, params2);

      const trigger = element.querySelector('.zg-dropdown-trigger');
      expect(trigger?.textContent).toContain('Select...');
    });

    it('should create dropdown arrow icon', () => {
      renderer.render(element, params);

      const arrow = element.querySelector('.zg-dropdown-arrow');
      expect(arrow).toBeTruthy();
      expect(arrow?.textContent).toBe('▼');
      expect(arrow?.getAttribute('aria-hidden')).toBe('true');
    });

    it('should render all options', () => {
      renderer.render(element, params);

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      expect(options.length).toBe(3);
    });

    it('should mark selected option', () => {
      renderer.render(element, params);

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      const activeOption = Array.from(options).find((opt) =>
        opt.getAttribute('data-value')?.includes('active')
      );

      expect(activeOption?.classList.contains('selected')).toBe(true);
      expect(activeOption?.getAttribute('aria-selected')).toBe('true');
    });

    it('should set data attributes', () => {
      renderer.render(element, params);

      const wrapper = element.querySelector('.zg-dropdown-wrapper') as HTMLElement;
      expect(wrapper.dataset.row).toBe('0');
      expect(wrapper.dataset.col).toBe('0');
      expect(wrapper.dataset.field).toBe('status');
    });

    it('should set ARIA attributes', () => {
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger');
      expect(trigger?.getAttribute('role')).toBe('combobox');
      expect(trigger?.getAttribute('aria-haspopup')).toBe('listbox');
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
      expect(trigger?.getAttribute('aria-label')).toContain('Status dropdown');

      const optionsList = getDropdownMenu(element).querySelector('.zg-dropdown-options');
      expect(optionsList?.getAttribute('role')).toBe('listbox');
      expect(optionsList?.getAttribute('aria-label')).toBe('Options list');
    });

    it('should create search input when searchable', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        searchable: true,
      });
      renderer.render(element, params);

      const searchInput = getDropdownMenu(element).querySelector('.zg-dropdown-search-input');
      expect(searchInput).toBeTruthy();
      expect(searchInput?.getAttribute('type')).toBe('text');
      expect(searchInput?.getAttribute('placeholder')).toBe('Search...');
      expect(searchInput?.getAttribute('aria-label')).toBe('Search options');
    });

    it('should not create search input when not searchable', () => {
      renderer.render(element, params);

      const searchInput = getDropdownMenu(element).querySelector('.zg-dropdown-search-input');
      expect(searchInput).toBeNull();
    });
  });

  describe('update()', () => {
    it('should update trigger display text', () => {
      renderer.render(element, params);

      const params2 = { ...params, value: 'inactive' };
      renderer.update(element, params2);

      const trigger = element.querySelector('.zg-dropdown-trigger');
      expect(trigger?.textContent).toContain('Inactive');
    });

    it('should update selected option', () => {
      renderer.render(element, params);

      const params2 = { ...params, value: 'pending' };
      renderer.update(element, params2);

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      const pendingOption = Array.from(options).find((opt) =>
        opt.getAttribute('data-value')?.includes('pending')
      );
      const activeOption = Array.from(options).find((opt) =>
        opt.getAttribute('data-value')?.includes('active')
      );

      expect(pendingOption?.classList.contains('selected')).toBe(true);
      expect(pendingOption?.getAttribute('aria-selected')).toBe('true');
      expect(activeOption?.classList.contains('selected')).toBe(false);
      expect(activeOption?.getAttribute('aria-selected')).toBe('false');
    });

    it('should preserve dropdown arrow icon', () => {
      renderer.render(element, params);

      const params2 = { ...params, value: 'inactive' };
      renderer.update(element, params2);

      const arrow = element.querySelector('.zg-dropdown-arrow');
      expect(arrow).toBeTruthy();
      expect(arrow?.textContent).toBe('▼');
    });

    it('should update data attributes', () => {
      renderer.render(element, params);

      const params2 = {
        ...params,
        cell: { row: 5, col: 3 },
        column: { field: 'newField', header: 'New Field' },
      };
      renderer.update(element, params2);

      const wrapper = element.querySelector('.zg-dropdown-wrapper') as HTMLElement;
      expect(wrapper.dataset.row).toBe('5');
      expect(wrapper.dataset.col).toBe('3');
      expect(wrapper.dataset.field).toBe('newField');
    });

    it('should handle empty value', () => {
      renderer.render(element, params);

      const params2 = { ...params, value: null };
      renderer.update(element, params2);

      const trigger = element.querySelector('.zg-dropdown-trigger');
      expect(trigger?.textContent).toContain('Select...');
    });

    it('should update ARIA label', () => {
      renderer.render(element, params);

      const params2 = {
        ...params,
        column: { field: 'priority', header: 'Priority' },
      };
      renderer.update(element, params2);

      const trigger = element.querySelector('.zg-dropdown-trigger');
      expect(trigger?.getAttribute('aria-label')).toContain('Priority dropdown');
    });
  });

  describe('destroy()', () => {
    it('should clear element content', () => {
      renderer.render(element, params);
      renderer.destroy(element);

      expect(element.innerHTML).toBe('');
    });

    it('should remove body-portaled menu on destroy', () => {
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      const menu = getDropdownMenu(element);
      trigger.click();

      expect(menu.parentElement).toBe(document.body);

      renderer.destroy(element);

      expect(document.body.contains(menu)).toBe(false);
      expect(element.innerHTML).toBe('');
    });

    it('should remove a hidden body-portaled menu on destroy', () => {
      renderer.render(element, params);

      const menu = getDropdownMenu(element);
      expect(menu.parentElement).toBe(document.body);

      renderer.destroy(element);

      expect(document.body.contains(menu)).toBe(false);
    });

    it('should remove cell class', () => {
      renderer.render(element, params);
      renderer.destroy(element);

      expect(element.classList.contains('zg-cell-dropdown')).toBe(false);
    });

    it('should remove event listeners', () => {
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      const clickSpy = jest.fn();
      trigger.addEventListener('click', clickSpy);

      renderer.destroy(element);

      // Verify no handlers remain (implicit - if handlers weren't removed, memory leak would occur)
      expect(element.innerHTML).toBe('');
    });
  });

  describe('getCellClass()', () => {
    it('should return empty class for null value', () => {
      const params2 = { ...params, value: null };
      const className = renderer.getCellClass(params2);

      expect(className).toBe('zg-dropdown-empty');
    });

    it('should return empty class for undefined value', () => {
      const params2 = { ...params, value: undefined };
      const className = renderer.getCellClass(params2);

      expect(className).toBe('zg-dropdown-empty');
    });

    it('should return has-value class for single value', () => {
      const className = renderer.getCellClass(params);

      expect(className).toBe('zg-dropdown-has-value');
    });

    it('should return multiple class for multi-select with multiple values', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        multiSelect: true,
      });
      const params2 = { ...params, value: ['active', 'pending'] };
      const className = renderer.getCellClass(params2);

      expect(className).toBe('zg-dropdown-multiple');
    });

    it('should return has-value class for multi-select with single value', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        multiSelect: true,
      });
      const params2 = { ...params, value: ['active'] };
      const className = renderer.getCellClass(params2);

      expect(className).toBe('zg-dropdown-has-value');
    });

    it('should return empty class for multi-select with empty array', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        multiSelect: true,
      });
      const params2 = { ...params, value: [] };
      const className = renderer.getCellClass(params2);

      expect(className).toBe('zg-dropdown-empty');
    });
  });

  describe('Dropdown Interaction', () => {
    it('should open dropdown when trigger clicked', () => {
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      const menu = getDropdownMenu(element);

      trigger.click();

      expect(menu.style.display).toBe('block');
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('should close dropdown when trigger clicked again', () => {
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      const menu = getDropdownMenu(element);

      trigger.click(); // Open
      trigger.click(); // Close

      expect(menu.style.display).toBe('none');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('keeps the menu body-portaled after close', () => {
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      const menu = getDropdownMenu(element);

      trigger.click();
      trigger.click();

      expect(menu.parentElement).toBe(document.body);
      expect(menu.style.display).toBe('none');
    });

    it('should close other dropdowns when opening', () => {
      // Create two dropdowns
      const element1 = document.createElement('div');
      const element2 = document.createElement('div');

      renderer.render(element1, params);
      renderer.render(element2, params);

      const trigger1 = element1.querySelector('.zg-dropdown-trigger') as HTMLElement;
      const trigger2 = element2.querySelector('.zg-dropdown-trigger') as HTMLElement;
      const menu1 = getDropdownMenu(element1);
      const menu2 = getDropdownMenu(element2);
      trigger1.click(); // Open first
      expect(menu1.style.display).toBe('block');
      expect(menu1.parentElement).toBe(document.body);

      trigger2.click(); // Open second, should close first
      expect(menu1.style.display).toBe('none');
      expect(menu1.parentElement).toBe(document.body);
      expect(menu2.style.display).toBe('block');
    });

    it('should call onChange when option selected', () => {
      const onChange = jest.fn();
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        onChange,
      });
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      trigger.click();

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      const inactiveOption = Array.from(options).find((opt) =>
        opt.getAttribute('data-value')?.includes('inactive')
      ) as HTMLElement;

      inactiveOption.click();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('inactive', params);
    });

    it('should close dropdown after single-select', () => {
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      const menu = getDropdownMenu(element);
      trigger.click();

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      const inactiveOption = options[1] as HTMLElement;
      inactiveOption.click();

      expect(menu.style.display).toBe('none');
    });

    it('should close on outside click through the shared overlay manager', () => {
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      const menu = getDropdownMenu(element);

      trigger.click();
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      expect(menu.style.display).toBe('none');
    });

    it('should not close dropdown after multi-select', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        multiSelect: true,
      });
      const params2 = { ...params, value: ['active'] };
      renderer.render(element, params2);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      const menu = getDropdownMenu(element);
      trigger.click();

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      const inactiveOption = options[1] as HTMLElement;
      inactiveOption.click();

      expect(menu.style.display).toBe('block');
    });

    it('should focus search input when dropdown opens (if searchable)', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        searchable: true,
      });
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      trigger.click();

      const searchInput = getDropdownMenu(element).querySelector('.zg-dropdown-search-input');
      expect(document.activeElement).toBe(searchInput);
    });
  });

  describe('Multi-select Mode', () => {
    it('should toggle values in multi-select mode', () => {
      const onChange = jest.fn();
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        multiSelect: true,
        onChange,
      });
      const params2 = { ...params, value: ['active'] };
      renderer.render(element, params2);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      trigger.click();

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      const pendingOption = Array.from(options).find((opt) =>
        opt.getAttribute('data-value')?.includes('pending')
      ) as HTMLElement;

      pendingOption.click();

      expect(onChange).toHaveBeenCalledWith(['active', 'pending'], params2);
    });

    it('should remove value when clicking already selected option', () => {
      const onChange = jest.fn();
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        multiSelect: true,
        onChange,
      });
      const params2 = { ...params, value: ['active', 'pending'] };
      renderer.render(element, params2);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      trigger.click();

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      const activeOption = Array.from(options).find((opt) =>
        opt.getAttribute('data-value')?.includes('active')
      ) as HTMLElement;

      activeOption.click();

      expect(onChange).toHaveBeenCalledWith(['pending'], params2);
    });

    it('should display count in multi-select mode', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        multiSelect: true,
        multiSelectDisplay: 'count',
      });
      const params2 = { ...params, value: ['active', 'pending'] };
      renderer.render(element, params2);

      const trigger = element.querySelector('.zg-dropdown-trigger');
      expect(trigger?.textContent).toContain('2 selected');
    });

    it('should display list in multi-select mode', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        multiSelect: true,
        multiSelectDisplay: 'list',
      });
      const params2 = { ...params, value: ['active', 'pending'] };
      renderer.render(element, params2);

      const trigger = element.querySelector('.zg-dropdown-trigger');
      expect(trigger?.textContent).toContain('Active, Pending');
    });

    it('should set aria-multiselectable attribute', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        multiSelect: true,
      });
      renderer.render(element, params);

      const optionsList = getDropdownMenu(element).querySelector('.zg-dropdown-options');
      expect(optionsList?.getAttribute('aria-multiselectable')).toBe('true');
    });
  });

  describe('Search Functionality', () => {
    it('should filter options based on search query', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        searchable: true,
      });
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      trigger.click();

      const searchInput = getDropdownMenu(element).querySelector('.zg-dropdown-search-input') as HTMLInputElement;
      searchInput.value = 'pend';
      searchInput.dispatchEvent(new Event('input'));

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      const visibleOptions = Array.from(options).filter(
        (opt) => (opt as HTMLElement).style.display !== 'none'
      );

      expect(visibleOptions.length).toBe(1);
      expect(visibleOptions[0].textContent).toBe('Pending');
    });

    it('should be case-insensitive by default', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        searchable: true,
      });
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      trigger.click();

      const searchInput = getDropdownMenu(element).querySelector('.zg-dropdown-search-input') as HTMLInputElement;
      searchInput.value = 'PENDING';
      searchInput.dispatchEvent(new Event('input'));

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      const visibleOptions = Array.from(options).filter(
        (opt) => (opt as HTMLElement).style.display !== 'none'
      );

      expect(visibleOptions.length).toBe(1);
    });

    it('should support case-sensitive search', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        searchable: true,
        caseSensitiveSearch: true,
      });
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      trigger.click();

      const searchInput = getDropdownMenu(element).querySelector('.zg-dropdown-search-input') as HTMLInputElement;
      searchInput.value = 'ACTIVE';
      searchInput.dispatchEvent(new Event('input'));

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      const visibleOptions = Array.from(options).filter(
        (opt) => (opt as HTMLElement).style.display !== 'none'
      );

      expect(visibleOptions.length).toBe(0);
    });

    it('should clear search when dropdown closes', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        searchable: true,
      });
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      trigger.click();

      const searchInput = getDropdownMenu(element).querySelector('.zg-dropdown-search-input') as HTMLInputElement;
      searchInput.value = 'act';
      searchInput.dispatchEvent(new Event('input'));

      trigger.click(); // Close

      expect(searchInput.value).toBe('');

      // Verify all options are visible again
      trigger.click(); // Reopen
      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      const visibleOptions = Array.from(options).filter(
        (opt) => (opt as HTMLElement).style.display !== 'none'
      );

      expect(visibleOptions.length).toBe(3);
    });

    it('should show all options when search is empty', () => {
      const renderer = new DropdownRenderer({
        options: defaultOptions,
        searchable: true,
      });
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      trigger.click();

      const searchInput = getDropdownMenu(element).querySelector('.zg-dropdown-search-input') as HTMLInputElement;
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      const visibleOptions = Array.from(options).filter(
        (opt) => (opt as HTMLElement).style.display !== 'none'
      );

      expect(visibleOptions.length).toBe(3);
    });
  });

  describe('Option Grouping', () => {
    it('should render group headers', () => {
      const groupedOptions: DropdownOption[] = [
        { label: 'Red', value: 'red', group: 'Colors' },
        { label: 'Green', value: 'green', group: 'Colors' },
        { label: 'Circle', value: 'circle', group: 'Shapes' },
        { label: 'Square', value: 'square', group: 'Shapes' },
      ];

      const renderer = new DropdownRenderer({ options: groupedOptions });
      renderer.render(element, params);

      const groupHeaders = getDropdownMenu(element).querySelectorAll('.zg-dropdown-group-header');
      expect(groupHeaders.length).toBe(2);
      expect(groupHeaders[0].textContent).toBe('Colors');
      expect(groupHeaders[1].textContent).toBe('Shapes');
    });

    it('should not render group headers for ungrouped options', () => {
      renderer.render(element, params);

      const groupHeaders = getDropdownMenu(element).querySelectorAll('.zg-dropdown-group-header');
      expect(groupHeaders.length).toBe(0);
    });

    it('should hide group headers with no visible options during search', () => {
      const groupedOptions: DropdownOption[] = [
        { label: 'Red', value: 'red', group: 'Colors' },
        { label: 'Green', value: 'green', group: 'Colors' },
        { label: 'Circle', value: 'circle', group: 'Shapes' },
        { label: 'Square', value: 'square', group: 'Shapes' },
      ];

      const renderer = new DropdownRenderer({
        options: groupedOptions,
        searchable: true,
      });
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      trigger.click();

      const searchInput = getDropdownMenu(element).querySelector('.zg-dropdown-search-input') as HTMLInputElement;
      searchInput.value = 'red';
      searchInput.dispatchEvent(new Event('input'));

      const groupHeaders = getDropdownMenu(element).querySelectorAll('.zg-dropdown-group-header');
      const visibleHeaders = Array.from(groupHeaders).filter(
        (header) => (header as HTMLElement).style.display !== 'none'
      );

      expect(visibleHeaders.length).toBe(1);
      expect(visibleHeaders[0].textContent).toBe('Colors');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should open dropdown on Enter key', () => {
      renderer.render(element, params);

      const menu = getDropdownMenu(element);
      const wrapper = element.querySelector('.zg-dropdown-wrapper') as HTMLElement;

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      wrapper.dispatchEvent(enterEvent);

      expect(menu.style.display).toBe('block');
    });

    it('should open dropdown on Space key', () => {
      renderer.render(element, params);

      const menu = getDropdownMenu(element);
      const wrapper = element.querySelector('.zg-dropdown-wrapper') as HTMLElement;

      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      wrapper.dispatchEvent(spaceEvent);

      expect(menu.style.display).toBe('block');
    });

    it('should close dropdown on Escape key', () => {
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      const menu = getDropdownMenu(element);
      const wrapper = element.querySelector('.zg-dropdown-wrapper') as HTMLElement;

      trigger.click(); // Open

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      wrapper.dispatchEvent(escapeEvent);

      expect(menu.style.display).toBe('none');
    });

    it('should open dropdown on ArrowDown when closed', () => {
      renderer.render(element, params);

      const menu = getDropdownMenu(element);
      const wrapper = element.querySelector('.zg-dropdown-wrapper') as HTMLElement;

      const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      wrapper.dispatchEvent(arrowDownEvent);

      expect(menu.style.display).toBe('block');
    });

    it('should navigate to first option on Home key', () => {
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      const wrapper = element.querySelector('.zg-dropdown-wrapper') as HTMLElement;
      trigger.click();

      const homeEvent = new KeyboardEvent('keydown', { key: 'Home' });
      wrapper.dispatchEvent(homeEvent);

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      expect(document.activeElement).toBe(options[0]);
    });

    it('should navigate to last option on End key', () => {
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      const wrapper = element.querySelector('.zg-dropdown-wrapper') as HTMLElement;
      trigger.click();

      const endEvent = new KeyboardEvent('keydown', { key: 'End' });
      wrapper.dispatchEvent(endEvent);

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      expect(document.activeElement).toBe(options[options.length - 1]);
    });
  });

  describe('Disabled Options', () => {
    it('should render disabled options', () => {
      const optionsWithDisabled: DropdownOption[] = [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive', disabled: true },
        { label: 'Pending', value: 'pending' },
      ];

      const renderer = new DropdownRenderer({ options: optionsWithDisabled });
      renderer.render(element, params);

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      const inactiveOption = Array.from(options).find((opt) =>
        opt.getAttribute('data-value')?.includes('inactive')
      );

      expect(inactiveOption?.classList.contains('disabled')).toBe(true);
      expect(inactiveOption?.getAttribute('aria-disabled')).toBe('true');
    });

    it('should not call onChange for disabled options', () => {
      const onChange = jest.fn();
      const optionsWithDisabled: DropdownOption[] = [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive', disabled: true },
        { label: 'Pending', value: 'pending' },
      ];

      const renderer = new DropdownRenderer({
        options: optionsWithDisabled,
        onChange,
      });
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      trigger.click();

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      const inactiveOption = Array.from(options).find((opt) =>
        opt.getAttribute('data-value')?.includes('inactive')
      ) as HTMLElement;

      inactiveOption.click();

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Custom Option Renderer', () => {
    it('should use custom option renderer', () => {
      const customRenderer = (option: DropdownOption) => {
        const div = document.createElement('div');
        div.className = 'custom-option';
        div.textContent = `Custom: ${option.label}`;
        return div;
      };

      const renderer = new DropdownRenderer({
        options: defaultOptions,
        optionRenderer: customRenderer,
      });
      renderer.render(element, params);

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      expect(options[0].textContent).toBe('Custom: Active');
      expect(options[0].classList.contains('custom-option')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty options array gracefully', () => {
      // Constructor should throw, but let's verify it
      expect(() => new DropdownRenderer({ options: [] })).toThrow();
    });

    it('should handle null value', () => {
      const params2 = { ...params, value: null };
      renderer.render(element, params2);

      const trigger = element.querySelector('.zg-dropdown-trigger');
      expect(trigger?.textContent).toContain('Select...');
    });

    it('should handle undefined value', () => {
      const params2 = { ...params, value: undefined };
      renderer.render(element, params2);

      const trigger = element.querySelector('.zg-dropdown-trigger');
      expect(trigger?.textContent).toContain('Select...');
    });

    it('should handle complex object values', () => {
      const complexOptions: DropdownOption[] = [
        { label: 'Option 1', value: { id: 1, name: 'First' } },
        { label: 'Option 2', value: { id: 2, name: 'Second' } },
      ];

      const onChange = jest.fn();
      const renderer = new DropdownRenderer({
        options: complexOptions,
        onChange,
      });
      const params2 = { ...params, value: { id: 1, name: 'First' } };
      renderer.render(element, params2);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      trigger.click();

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      const option2 = options[1] as HTMLElement;
      option2.click();

      expect(onChange).toHaveBeenCalledWith({ id: 2, name: 'Second' }, params2);
    });

    it('should handle onChange error gracefully', () => {
      const onChange = jest.fn(() => {
        throw new Error('Test error');
      });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const renderer = new DropdownRenderer({
        options: defaultOptions,
        onChange,
      });
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      trigger.click();

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      (options[1] as HTMLElement).click();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle very long option lists', () => {
      const manyOptions: DropdownOption[] = Array.from({ length: 1000 }, (_, i) => ({
        label: `Option ${i + 1}`,
        value: i + 1,
      }));

      const renderer = new DropdownRenderer({ options: manyOptions });
      renderer.render(element, params);

      const options = getDropdownMenu(element).querySelectorAll('.zg-dropdown-option');
      expect(options.length).toBe(1000);
    });

    it('should handle rapid open/close', () => {
      renderer.render(element, params);

      const trigger = element.querySelector('.zg-dropdown-trigger') as HTMLElement;
      const menu = getDropdownMenu(element);

      // Rapid clicks
      trigger.click();
      trigger.click();
      trigger.click();
      trigger.click();

      expect(menu.style.display).toBe('none');
    });

    it('should handle missing column information', () => {
      const params2 = { ...params, column: undefined };
      renderer.render(element, params2);

      const trigger = element.querySelector('.zg-dropdown-trigger');
      expect(trigger?.getAttribute('aria-label')).toContain('Dropdown dropdown');
    });
  });

  describe('Factory Function', () => {
    it('should create DropdownRenderer instance', () => {
      const renderer = createDropdownRenderer({ options: defaultOptions });
      expect(renderer).toBeInstanceOf(DropdownRenderer);
    });

    it('should pass options correctly', () => {
      const renderer = createDropdownRenderer({
        options: defaultOptions,
        searchable: true,
        multiSelect: true,
      });
      renderer.render(element, params);

      const searchInput = getDropdownMenu(element).querySelector('.zg-dropdown-search-input');
      expect(searchInput).toBeTruthy();
    });
  });
});
