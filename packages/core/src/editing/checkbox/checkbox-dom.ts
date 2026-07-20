import type { EditorParams } from '../cell-editor.interface';
import type { CheckboxEditorOptions } from './checkbox-types';
import { CheckboxState } from './checkbox-state';

/**
 * Create the container label element
 *
 * @param params - Edit parameters
 * @param options - Checkbox options
 * @returns The label element that will contain the checkbox
 */
export function createContainer(
  params: EditorParams,
  options: Required<Omit<CheckboxEditorOptions, 'validator'>> & {
    validator?: (value: boolean | null) => boolean | string;
  }
): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = options.className;
  label.style.display = 'flex';
  label.style.alignItems = 'center';
  label.style.justifyContent = 'center';
  label.style.cursor = options.disabled ? 'not-allowed' : 'pointer';
  label.style.padding = '8px';
  label.style.userSelect = 'none';
  // Fill the cell with an opaque, outlined surface so the underlying rendered
  // checkbox (e.g. CheckboxRenderer's centered box) does not show through.
  label.style.width = '100%';
  label.style.height = '100%';
  label.style.boxSizing = 'border-box';
  label.style.background = '#fff';
  label.style.border = '2px solid #4CAF50';

  // Set data attributes
  label.dataset['row'] = String(params.cell.row);
  label.dataset['col'] = String(params.cell.col);
  if (params.column?.field) {
    label.dataset['field'] = params.column.field;
  }

  return label;
}

/**
 * Create the checkbox input element with all attributes
 *
 * @param value - Initial value
 * @param params - Edit parameters
 * @param options - Checkbox options
 * @param state - Checkbox state manager
 * @returns The configured checkbox element
 */
export function createCheckboxElement(
  value: boolean | null,
  params: EditorParams,
  options: Required<Omit<CheckboxEditorOptions, 'validator'>> & {
    validator?: (value: boolean | null) => boolean | string;
  },
  state: CheckboxState
): HTMLInputElement {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'zg-checkbox-input';

  // Set initial state
  const normalizedValue = state.normalizeValue(value);
  if (normalizedValue === null && options.allowIndeterminate) {
    checkbox.indeterminate = true;
    checkbox.checked = false;
  } else {
    checkbox.indeterminate = false;
    checkbox.checked = normalizedValue === true;
  }

  if (options.disabled) {
    checkbox.disabled = true;
  }

  // Inline styles for better UX
  checkbox.style.width = '18px';
  checkbox.style.height = '18px';
  checkbox.style.cursor = options.disabled ? 'not-allowed' : 'pointer';

  // Set ARIA attributes for accessibility
  checkbox.setAttribute('role', 'checkbox');
  checkbox.setAttribute(
    'aria-label',
    `Edit ${params.column?.header || params.column?.field || 'checkbox'}`
  );
  state.updateAriaChecked(checkbox, normalizedValue);

  return checkbox;
}

/**
 * Create label text element
 *
 * @param labelText - The text to display
 * @returns The label text element
 */
export function createLabelText(labelText: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.textContent = labelText;
  span.className = 'zg-checkbox-label';
  span.style.marginLeft = '6px';
  span.style.userSelect = 'none';
  return span;
}
