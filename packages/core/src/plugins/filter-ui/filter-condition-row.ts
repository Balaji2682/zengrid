import type { OperatorOption } from './filter-ui-types';
import type { PartApplier } from './filter-popup-customize';
import { identityApplier } from './filter-popup-customize';
import { createButton } from './filter-popup-dom';

export interface ConditionRow {
  element: HTMLElement;
  operatorSelect: HTMLSelectElement;
  valueInput: HTMLInputElement;
  valueInputTo: HTMLInputElement;
  removeBtn: HTMLButtonElement;
  /** Pencil trigger shown in the collapsed summary; expands the row for editing. */
  editBtn: HTMLButtonElement;
  /** Collapse the row to a one-line summary, or expand it back to the editor. */
  setCollapsed: (collapsed: boolean) => void;
  /** True when the row holds a usable condition (has a value, or needs none). */
  isCommitted: () => boolean;
}

const PENCIL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"' +
  ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
  ' stroke-linejoin="round"><path d="M12 20h9"/>' +
  '<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

export function createConditionRow(
  condition: { operator: string; value?: any } | undefined,
  operators: OperatorOption[],
  dropdownType: string,
  onRemove: () => void,
  applyPart: PartApplier = identityApplier
): ConditionRow {
  const element = document.createElement('div');
  element.className = 'zg-filter-popup__condition';
  const operatorSelect = applyPart('operatorSelect', createOperatorSelect(operators)) as HTMLSelectElement;
  const valueInput = applyPart('valueInput', createValueInput(dropdownType)) as HTMLInputElement;
  const valueInputTo = applyPart('valueInputTo', createValueInput(dropdownType)) as HTMLInputElement;
  valueInputTo.style.display = 'none';
  const removeBtn = createButton('zg-filter-popup__btn zg-filter-popup__btn--remove', 'Remove');

  appendRow(element, 'Operator', operatorSelect);
  appendRow(element, 'Value', valueInput, valueInputTo);
  const actions = document.createElement('div');
  actions.className = 'zg-filter-popup__condition-actions';
  actions.appendChild(removeBtn);
  element.appendChild(actions);

  const { summary, editBtn, summaryText, summaryRemoveBtn } = createSummary();
  element.appendChild(summary);

  const currentOp = (): OperatorOption | undefined =>
    operators.find((op) => op.value === operatorSelect.value);

  const describe = (): string => {
    const op = currentOp();
    const label = op?.label ?? operatorSelect.value;
    const count = op?.valueCount ?? 1;
    if (count === 0) return label;
    if (count === 2) {
      return `${label} ${valueInput.value.trim() || '…'} – ${valueInputTo.value.trim() || '…'}`;
    }
    const v = valueInput.value.trim();
    return v ? `${label} “${v}”` : `${label} …`;
  };

  const isCommitted = (): boolean => {
    const count = currentOp()?.valueCount ?? 1;
    if (count === 0) return true;
    if (count === 2) return valueInput.value.trim() !== '' && valueInputTo.value.trim() !== '';
    return valueInput.value.trim() !== '';
  };

  const setCollapsed = (collapsed: boolean): void => {
    if (collapsed) summaryText.textContent = describe();
    element.classList.toggle('is-collapsed', collapsed);
  };

  const updateInputs = () => {
    const valueCount = currentOp()?.valueCount ?? 1;
    valueInput.style.display = valueCount === 0 ? 'none' : '';
    valueInputTo.style.display = valueCount === 2 ? '' : 'none';
  };
  operatorSelect.addEventListener('change', updateInputs);
  removeBtn.addEventListener('click', onRemove);
  summaryRemoveBtn.addEventListener('click', onRemove);
  applyConditionValue(condition, operatorSelect, valueInput, valueInputTo);
  updateInputs();
  return {
    element: applyPart('conditionRow', element),
    operatorSelect,
    valueInput,
    valueInputTo,
    removeBtn,
    editBtn,
    setCollapsed,
    isCommitted,
  };
}

function createSummary(): {
  summary: HTMLElement;
  editBtn: HTMLButtonElement;
  summaryText: HTMLElement;
  summaryRemoveBtn: HTMLButtonElement;
} {
  const summary = document.createElement('div');
  summary.className = 'zg-filter-popup__condition-summary';

  const editBtn = createButton('zg-filter-popup__condition-edit', '');
  editBtn.setAttribute('aria-label', 'Edit condition');
  editBtn.innerHTML = `${PENCIL_SVG}<span class="zg-filter-popup__condition-summary-text"></span>`;
  const summaryText = editBtn.querySelector('.zg-filter-popup__condition-summary-text') as HTMLElement;

  const summaryRemoveBtn = createButton('zg-filter-popup__condition-summary-remove', '×');
  summaryRemoveBtn.setAttribute('aria-label', 'Remove condition');

  summary.appendChild(editBtn);
  summary.appendChild(summaryRemoveBtn);
  return { summary, editBtn, summaryText, summaryRemoveBtn };
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

function appendRow(parent: HTMLElement, label: string, ...children: HTMLElement[]): void {
  const row = document.createElement('div');
  row.className = 'zg-filter-popup__row';
  row.innerHTML = `<label>${label}</label>`;
  children.forEach((child) => row.appendChild(child));
  parent.appendChild(row);
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
