import type { FilterPopupOptions } from './filter-ui-types';
import type { OperatorOption } from './filter-ui-types';

export interface ConditionRow {
  element: HTMLElement;
  operatorSelect: HTMLSelectElement;
  valueInput: HTMLInputElement;
  valueInputTo: HTMLInputElement;
  removeBtn: HTMLButtonElement;
}

export function createTitle(options: FilterPopupOptions): HTMLElement {
  const title = document.createElement('div');
  title.className = 'zg-filter-popup__title';
  title.textContent = `Filter: ${options.getColumnLabel(options.columnDef, options.dataCol)}`;
  return title;
}

export function createLogicRow(initial: 'AND' | 'OR'): {
  row: HTMLElement;
  select: HTMLSelectElement;
} {
  const row = document.createElement('div');
  row.className = 'zg-filter-popup__row';
  row.innerHTML = '<label>Match</label>';
  const select = document.createElement('select');
  select.className = 'zg-filter-popup__select';
  select.innerHTML = '<option value="AND">AND</option><option value="OR">OR</option>';
  select.value = initial;
  row.appendChild(select);
  return { row, select };
}

export function createConditionRow(
  condition: { operator: string; value?: any } | undefined,
  operators: OperatorOption[],
  dropdownType: string,
  onRemove: () => void
): ConditionRow {
  const element = document.createElement('div');
  element.className = 'zg-filter-popup__condition';
  const operatorSelect = createOperatorSelect(operators);
  const valueInput = createValueInput(dropdownType);
  const valueInputTo = createValueInput(dropdownType);
  valueInputTo.style.display = 'none';
  const removeBtn = createButton('zg-filter-popup__btn zg-filter-popup__btn--remove', 'Remove');

  appendRow(element, 'Operator', operatorSelect);
  appendRow(element, 'Value', valueInput, valueInputTo);
  const actions = document.createElement('div');
  actions.className = 'zg-filter-popup__condition-actions';
  actions.appendChild(removeBtn);
  element.appendChild(actions);

  const updateInputs = () => {
    const valueCount = operators.find((op) => op.value === operatorSelect.value)?.valueCount ?? 1;
    valueInput.style.display = valueCount === 0 ? 'none' : '';
    valueInputTo.style.display = valueCount === 2 ? '' : 'none';
  };
  operatorSelect.addEventListener('change', updateInputs);
  removeBtn.addEventListener('click', onRemove);
  applyConditionValue(condition, operatorSelect, valueInput, valueInputTo);
  updateInputs();
  return { element, operatorSelect, valueInput, valueInputTo, removeBtn };
}

export function createValueInput(dropdownType: string): HTMLInputElement {
  const input = document.createElement('input');
  input.className = 'zg-filter-popup__input';
  input.type = dropdownType === 'number' ? 'number' : dropdownType === 'date' ? 'date' : 'text';
  return input;
}

function createOperatorSelect(operators: OperatorOption[]): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'zg-filter-popup__select';
  operators.forEach((op) => {
    const option = document.createElement('option');
    option.value = op.value;
    option.textContent = op.label;
    select.appendChild(option);
  });
  return select;
}

export function createButton(className: string, text: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  return button;
}

export function appendRow(
  parent: HTMLElement,
  label: string,
  ...children: HTMLElement[]
): void {
  const row = document.createElement('div');
  row.className = 'zg-filter-popup__row';
  row.innerHTML = `<label>${label}</label>`;
  children.forEach((child) => row.appendChild(child));
  parent.appendChild(row);
}

export function createActions(): {
  actions: HTMLElement;
  applyBtn: HTMLButtonElement;
  clearBtn: HTMLButtonElement;
} {
  const actions = document.createElement('div');
  actions.className = 'zg-filter-popup__actions';
  const applyBtn = createButton('zg-filter-popup__btn primary', 'Apply');
  const clearBtn = createButton('zg-filter-popup__btn', 'Clear');
  actions.appendChild(applyBtn);
  actions.appendChild(clearBtn);
  return { actions, applyBtn, clearBtn };
}

export function applyConditionValue(
  condition: { operator: string; value?: any } | undefined,
  operatorSelect: HTMLSelectElement,
  valueInput: HTMLInputElement,
  valueInputTo: HTMLInputElement
): void {
  if (!condition) return;

  operatorSelect.value = condition.operator;
  if (Array.isArray(condition.value)) {
    valueInput.value = String(condition.value[0] ?? '');
    valueInputTo.value = String(condition.value[1] ?? '');
  } else if (condition.value != null) {
    valueInput.value = String(condition.value);
  }
}

export function positionUnanchoredPopup(
  popup: HTMLElement,
  options: FilterPopupOptions
): void {
  if (options.payload.anchorElement) return;

  const containerRect = options.container.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.top = `${containerRect.top + 12}px`;
  popup.style.left = `${containerRect.left + 12}px`;
}
