import type {
  ColumnDef,
  FilterExpression,
  FilterModel,
  FilterOperator,
  FilterQuickState,
} from '../types';
import type { EventEmitter } from '../events/event-emitter';
import type { GridEvents } from '../events/grid-events';
import { OverlayManager } from '../overlay/overlay-manager';
import type {
  FieldFilterCondition,
  FieldFilterGroup,
  FieldFilterState,
} from '../features/filtering/types';

interface FilterUIOptions {
  container: HTMLElement;
  events: EventEmitter<GridEvents>;
  columns?: ColumnDef[];
  getFilterState: () => FilterModel[];
  getFilterExpression: () => FilterExpression | null;
  setColumnFilter: (
    column: number,
    conditions: Array<{ operator: string; value: any }>,
    logic?: 'AND' | 'OR'
  ) => void;
  setFieldState: (state: FieldFilterState) => void;
  clearColumnFilter: (column: number) => void;
  clearQuickFilter: () => void;
  clearAllFilters: () => void;
  getColumnDef: (dataCol: number) => ColumnDef | undefined;
  mapVisualToDataCol: (visualCol: number) => number;
}

interface OperatorOption {
  value: FilterOperator;
  label: string;
  valueCount: 0 | 1 | 2;
}

const TEXT_OPERATORS: OperatorOption[] = [
  { value: 'contains', label: 'Contains', valueCount: 1 },
  { value: 'equals', label: 'Equals', valueCount: 1 },
  { value: 'startsWith', label: 'Starts with', valueCount: 1 },
  { value: 'endsWith', label: 'Ends with', valueCount: 1 },
  { value: 'notContains', label: 'Not contains', valueCount: 1 },
  { value: 'notEquals', label: 'Not equals', valueCount: 1 },
  { value: 'blank', label: 'Is blank', valueCount: 0 },
  { value: 'notBlank', label: 'Is not blank', valueCount: 0 },
];

const NUMBER_OPERATORS: OperatorOption[] = [
  { value: 'equals', label: 'Equals', valueCount: 1 },
  { value: 'notEquals', label: 'Not equals', valueCount: 1 },
  { value: 'greaterThan', label: 'Greater than', valueCount: 1 },
  { value: 'greaterThanOrEqual', label: 'Greater than or equal', valueCount: 1 },
  { value: 'lessThan', label: 'Less than', valueCount: 1 },
  { value: 'lessThanOrEqual', label: 'Less than or equal', valueCount: 1 },
  { value: 'between', label: 'Between', valueCount: 2 },
  { value: 'blank', label: 'Is blank', valueCount: 0 },
  { value: 'notBlank', label: 'Is not blank', valueCount: 0 },
];

const DATE_OPERATORS: OperatorOption[] = [
  { value: 'equals', label: 'Equals', valueCount: 1 },
  { value: 'greaterThan', label: 'After', valueCount: 1 },
  { value: 'lessThan', label: 'Before', valueCount: 1 },
  { value: 'between', label: 'Between', valueCount: 2 },
  { value: 'blank', label: 'Is blank', valueCount: 0 },
  { value: 'notBlank', label: 'Is not blank', valueCount: 0 },
];

export class GridFilterUI {
  private container: HTMLElement;
  private events: EventEmitter<GridEvents>;
  private columns: ColumnDef[];
  private getFilterState: () => FilterModel[];
  private getFilterExpression: () => FilterExpression | null;
  private setColumnFilter: (
    column: number,
    conditions: Array<{ operator: string; value: any }>,
    logic?: 'AND' | 'OR'
  ) => void;
  private setFieldState: (state: FieldFilterState) => void;
  private clearColumnFilter: (column: number) => void;
  private clearQuickFilter: () => void;
  private clearAllFilters: () => void;
  private getColumnDef: (dataCol: number) => ColumnDef | undefined;
  private mapVisualToDataCol: (visualCol: number) => number;
  private overlayManager: OverlayManager;

  private popup: HTMLElement | null = null;
  private chipBar: HTMLElement | null = null;
  private popupKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private filterClickUnsub: (() => void) | null = null;
  private filterChangeUnsub: (() => void) | null = null;

  constructor(options: FilterUIOptions) {
    this.container = options.container;
    this.events = options.events;
    this.columns = options.columns ?? [];
    this.getFilterState = options.getFilterState;
    this.getFilterExpression = options.getFilterExpression;
    this.setColumnFilter = options.setColumnFilter;
    this.setFieldState = options.setFieldState;
    this.clearColumnFilter = options.clearColumnFilter;
    this.clearQuickFilter = options.clearQuickFilter;
    this.clearAllFilters = options.clearAllFilters;
    this.getColumnDef = options.getColumnDef;
    this.mapVisualToDataCol = options.mapVisualToDataCol;
    this.overlayManager = OverlayManager.getInstance();

    this.filterClickUnsub = this.events.on('header:filter:click', (payload) => {
      this.openFilterPopup(payload);
    });
    this.filterChangeUnsub = this.events.on('filter:change', () => {
      this.renderFilterChips();
    });

    this.renderFilterChips();
  }

  setColumns(columns: ColumnDef[]): void {
    this.columns = [...columns];
    this.closePopup();
    this.renderFilterChips();
  }

  private openFilterPopup(payload: GridEvents['header:filter:click']): void {
    const dataCol = this.mapVisualToDataCol(payload.columnIndex);
    const columnDef = this.getColumnDef(dataCol);
    if (!columnDef) return;

    this.closePopup();

    const dropdownType = payload.dropdownType ?? 'text';
    const operators = this.getOperatorsForType(dropdownType);
    const existing = this.getFilterState().find((f) => f.column === dataCol);

    const popup = document.createElement('div');
    popup.className = 'zg-filter-popup';

    const title = document.createElement('div');
    title.className = 'zg-filter-popup__title';
    title.textContent = `Filter: ${this.getColumnLabel(columnDef, dataCol)}`;
    popup.appendChild(title);

    const logicRow = document.createElement('div');
    logicRow.className = 'zg-filter-popup__row';
    logicRow.innerHTML = `<label>Match</label>`;

    const logicSelect = document.createElement('select');
    logicSelect.className = 'zg-filter-popup__select';
    logicSelect.innerHTML = `
      <option value="AND">AND</option>
      <option value="OR">OR</option>
    `;
    logicSelect.value = existing?.logic ?? 'AND';
    logicRow.appendChild(logicSelect);
    popup.appendChild(logicRow);

    const conditionsContainer = document.createElement('div');
    conditionsContainer.className = 'zg-filter-popup__conditions';
    popup.appendChild(conditionsContainer);

    type ConditionRow = {
      element: HTMLElement;
      operatorSelect: HTMLSelectElement;
      valueInput: HTMLInputElement;
      valueInputTo: HTMLInputElement;
      removeBtn: HTMLButtonElement;
    };

    const conditionRows: ConditionRow[] = [];

    const createConditionRow = (condition?: { operator: string; value?: any }): ConditionRow => {
      const conditionEl = document.createElement('div');
      conditionEl.className = 'zg-filter-popup__condition';

      const operatorRow = document.createElement('div');
      operatorRow.className = 'zg-filter-popup__row';
      operatorRow.innerHTML = `<label>Operator</label>`;

      const operatorSelect = document.createElement('select');
      operatorSelect.className = 'zg-filter-popup__select';
      operators.forEach((op) => {
        const option = document.createElement('option');
        option.value = op.value;
        option.textContent = op.label;
        operatorSelect.appendChild(option);
      });
      operatorRow.appendChild(operatorSelect);
      conditionEl.appendChild(operatorRow);

      const valueRow = document.createElement('div');
      valueRow.className = 'zg-filter-popup__row';
      valueRow.innerHTML = `<label>Value</label>`;

      const valueInput = document.createElement('input');
      valueInput.className = 'zg-filter-popup__input';
      valueInput.type =
        dropdownType === 'number' ? 'number' : dropdownType === 'date' ? 'date' : 'text';

      const valueInputTo = document.createElement('input');
      valueInputTo.className = 'zg-filter-popup__input';
      valueInputTo.type = valueInput.type;
      valueInputTo.style.display = 'none';

      valueRow.appendChild(valueInput);
      valueRow.appendChild(valueInputTo);
      conditionEl.appendChild(valueRow);

      const actionsRow = document.createElement('div');
      actionsRow.className = 'zg-filter-popup__condition-actions';

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'zg-filter-popup__btn zg-filter-popup__btn--remove';
      removeBtn.textContent = 'Remove';
      actionsRow.appendChild(removeBtn);
      conditionEl.appendChild(actionsRow);

      const updateValueInputs = () => {
        const selected = operators.find((op) => op.value === operatorSelect.value);
        const valueCount = selected?.valueCount ?? 1;
        if (valueCount === 0) {
          valueInput.style.display = 'none';
          valueInputTo.style.display = 'none';
        } else if (valueCount === 2) {
          valueInput.style.display = '';
          valueInputTo.style.display = '';
        } else {
          valueInput.style.display = '';
          valueInputTo.style.display = 'none';
        }
      };

      operatorSelect.addEventListener('change', updateValueInputs);

      if (condition) {
        operatorSelect.value = condition.operator;
        if (Array.isArray(condition.value)) {
          valueInput.value = String(condition.value[0] ?? '');
          valueInputTo.value = String(condition.value[1] ?? '');
        } else if (condition.value != null) {
          valueInput.value = String(condition.value);
        }
      }

      updateValueInputs();

      removeBtn.addEventListener('click', () => {
        const index = conditionRows.findIndex((row) => row.element === conditionEl);
        if (index >= 0) {
          conditionRows.splice(index, 1);
        }
        conditionEl.remove();
        updateConditionControls();
      });

      return {
        element: conditionEl,
        operatorSelect,
        valueInput,
        valueInputTo,
        removeBtn,
      };
    };

    const updateConditionControls = () => {
      const showLogic = conditionRows.length > 1;
      logicRow.style.display = showLogic ? '' : 'none';
      conditionRows.forEach((row) => {
        row.removeBtn.style.display = showLogic ? '' : 'none';
      });
    };

    const addCondition = (condition?: { operator: string; value?: any }) => {
      const row = createConditionRow(condition);
      conditionRows.push(row);
      conditionsContainer.appendChild(row.element);
      updateConditionControls();
    };

    const existingConditions =
      existing?.conditions && existing.conditions.length > 0 ? existing.conditions : null;

    if (existingConditions) {
      existingConditions.forEach((condition) => addCondition(condition));
    } else {
      addCondition();
    }

    const addConditionBtn = document.createElement('button');
    addConditionBtn.type = 'button';
    addConditionBtn.className = 'zg-filter-popup__btn zg-filter-popup__btn--add';
    addConditionBtn.textContent = 'Add condition';
    addConditionBtn.addEventListener('click', () => addCondition());
    popup.appendChild(addConditionBtn);

    const actions = document.createElement('div');
    actions.className = 'zg-filter-popup__actions';

    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'zg-filter-popup__btn primary';
    applyBtn.textContent = 'Apply';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'zg-filter-popup__btn';
    clearBtn.textContent = 'Clear';

    actions.appendChild(applyBtn);
    actions.appendChild(clearBtn);
    popup.appendChild(actions);

    const applyFilter = () => {
      const conditions: Array<{ operator: string; value: any }> = [];
      for (const row of conditionRows) {
        const operator = row.operatorSelect.value as FilterOperator;
        const condition = this.buildCondition(
          operator,
          dropdownType,
          row.valueInput.value,
          row.valueInputTo.value
        );
        if (condition) {
          conditions.push(condition as { operator: string; value: any });
        }
      }

      if (conditions.length === 0) {
        return;
      }

      const logic = (logicSelect.value as 'AND' | 'OR') ?? 'AND';
      this.setColumnFilter(dataCol, conditions, logic);
      this.closePopup();
    };

    applyBtn.addEventListener('click', applyFilter);

    clearBtn.addEventListener('click', () => {
      this.clearColumnFilter(dataCol);
      this.closePopup();
    });

    this.popup = popup;
    document.body.appendChild(popup);

    this.popupKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const active = document.activeElement as HTMLElement | null;
        if (!active || !popup.contains(active)) {
          return;
        }

        const tag = active.tagName.toLowerCase();
        if (tag === 'input' || tag === 'select') {
          e.preventDefault();
          applyFilter();
        }
      }
    };
    popup.addEventListener('keydown', this.popupKeyHandler);

    if (!payload.anchorElement) {
      const containerRect = this.container.getBoundingClientRect();
      popup.style.position = 'fixed';
      popup.style.top = `${containerRect.top + 12}px`;
      popup.style.left = `${containerRect.left + 12}px`;
    }

    this.overlayManager.open({
      overlay: popup,
      anchor: payload.anchorElement,
      additionalElements: payload.anchorElement ? [payload.anchorElement] : [],
      restoreFocusOnClose: !!payload.anchorElement,
      restoreFocusTo: payload.anchorElement ?? null,
      closeOnEscape: true,
      positionOptions: {
        placement: 'bottom-start',
        offset: 4,
        viewportPadding: 8,
      },
      scrollOptions: {
        closeOnOutOfView: true,
        repositionOnScroll: false,
      },
      onClose: () => {
        this.teardownPopup();
      },
    });

    // Focus first input for usability
    setTimeout(() => {
      const first = conditionRows[0];
      if (!first) return;
      if (first.valueInput.style.display !== 'none') {
        first.valueInput.focus();
      } else {
        first.operatorSelect.focus();
      }
    }, 0);
  }

  private buildCondition(
    operator: FilterOperator,
    dropdownType: string,
    value: string,
    valueTo: string
  ): { operator: string; value?: any } | null {
    const valueCount = this.getOperatorValueCount(operator, dropdownType);

    if (valueCount === 0) {
      return { operator };
    }

    if (valueCount === 2) {
      const parsed = [
        this.parseInputValue(value, dropdownType),
        this.parseInputValue(valueTo, dropdownType),
      ];
      return { operator, value: parsed };
    }

    return { operator, value: this.parseInputValue(value, dropdownType) };
  }

  private parseInputValue(value: string, dropdownType: string): any {
    if (dropdownType === 'number') {
      const num = Number(value);
      return Number.isNaN(num) ? value : num;
    }

    if (dropdownType === 'date') {
      const ts = Date.parse(value);
      return Number.isNaN(ts) ? value : ts;
    }

    return value;
  }

  private getOperatorsForType(type: string): OperatorOption[] {
    switch (type) {
      case 'number':
        return NUMBER_OPERATORS;
      case 'date':
        return DATE_OPERATORS;
      default:
        return TEXT_OPERATORS;
    }
  }

  private getOperatorValueCount(operator: FilterOperator, type: string): 0 | 1 | 2 {
    const operators = this.getOperatorsForType(type);
    return operators.find((op) => op.value === operator)?.valueCount ?? 1;
  }

  private getColumnLabel(column: ColumnDef, index: number): string {
    if (typeof column.header === 'string') return column.header;
    return column.header?.text ?? column.field ?? `Column ${index}`;
  }

  private getColumnLabelByField(field: string): string {
    const index = this.columns.findIndex((column) => column.field === field);
    if (index < 0) {
      return field;
    }

    return this.getColumnLabel(this.columns[index], index);
  }

  private getColumnLabelByIndex(index: number): string {
    const column = this.columns[index] ?? this.getColumnDef(index);
    if (!column) {
      return `Column ${index}`;
    }

    return this.getColumnLabel(column, index);
  }

  private ensureChipBar(): HTMLElement {
    if (this.chipBar && this.chipBar.isConnected) {
      return this.chipBar;
    }

    const host =
      (this.container.querySelector('.zg-viewport') as HTMLElement | null) ?? this.container;
    const chipBar = document.createElement('div');
    chipBar.className = 'zg-filter-chip-bar';
    chipBar.style.display = 'none';
    host.appendChild(chipBar);
    this.chipBar = chipBar;
    return chipBar;
  }

  private renderFilterChips(): void {
    const chipBar = this.ensureChipBar();
    const expression = this.getFilterExpression();
    const chips = this.buildChipDescriptors(expression);

    chipBar.replaceChildren();

    if (chips.length === 0) {
      chipBar.style.display = 'none';
      this.updateChipBarLayout();
      return;
    }

    chipBar.style.display = '';

    const title = document.createElement('span');
    title.className = 'zg-filter-chip-bar__title';
    title.textContent = 'Filters';
    chipBar.appendChild(title);

    const chipList = document.createElement('div');
    chipList.className = 'zg-filter-chip-bar__list';

    for (const chip of chips) {
      chipList.appendChild(this.createChipElement(chip.label, chip.remove));
    }

    chipBar.appendChild(chipList);

    const clearAllButton = document.createElement('button');
    clearAllButton.type = 'button';
    clearAllButton.className = 'zg-filter-chip-bar__clear';
    clearAllButton.textContent = 'Clear all';
    clearAllButton.addEventListener('click', () => {
      this.clearAllFilters();
    });
    chipBar.appendChild(clearAllButton);

    this.updateChipBarLayout();
  }

  private createChipElement(label: string, remove: () => void): HTMLElement {
    const chip = document.createElement('div');
    chip.className = 'zg-filter-chip';
    chip.title = label;

    const text = document.createElement('span');
    text.className = 'zg-filter-chip__label';
    text.textContent = label;
    chip.appendChild(text);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'zg-filter-chip__remove';
    removeButton.setAttribute('aria-label', `Remove filter ${label}`);
    removeButton.textContent = '×';
    removeButton.addEventListener('click', () => {
      remove();
    });
    chip.appendChild(removeButton);

    return chip;
  }

  private buildChipDescriptors(expression: FilterExpression | null): Array<{
    label: string;
    remove: () => void;
  }> {
    const chips: Array<{ label: string; remove: () => void }> = [];
    const fieldRoot = expression?.fieldState?.root ?? null;
    const quickFilter = expression?.quickFilter ?? null;

    if (fieldRoot) {
      chips.push(...this.buildFieldStateChips(fieldRoot));
    }

    if (quickFilter?.query?.trim()) {
      chips.push({
        label: this.describeQuickFilter(quickFilter),
        remove: () => this.clearQuickFilter(),
      });
    }

    return chips;
  }

  private buildFieldStateChips(root: FieldFilterGroup): Array<{
    label: string;
    remove: () => void;
  }> {
    if (root.logic !== 'AND') {
      return [
        {
          label: this.describeFieldGroup(root),
          remove: () => this.applyStructuredRoot(null),
        },
      ];
    }

    const chips: Array<{ label: string; remove: () => void }> = [];

    root.conditions.forEach((condition, index) => {
      chips.push({
        label: this.describeFieldCondition(condition),
        remove: () => this.removeTopLevelCondition(index),
      });
    });

    (root.groups ?? []).forEach((group, index) => {
      chips.push({
        label: this.describeFieldGroup(group),
        remove: () => this.removeTopLevelGroup(index),
      });
    });

    return chips;
  }

  private removeTopLevelCondition(conditionIndex: number): void {
    const root = this.getFilterExpression()?.fieldState?.root;
    if (!root) {
      return;
    }

    if (root.logic !== 'AND') {
      this.applyStructuredRoot(null);
      return;
    }

    const nextRoot = this.normalizeFieldGroup({
      logic: root.logic,
      conditions: root.conditions.filter((_, index) => index !== conditionIndex),
      groups: root.groups ? [...root.groups] : undefined,
    });

    this.applyStructuredRoot(nextRoot);
  }

  private removeTopLevelGroup(groupIndex: number): void {
    const root = this.getFilterExpression()?.fieldState?.root;
    if (!root) {
      return;
    }

    if (root.logic !== 'AND') {
      this.applyStructuredRoot(null);
      return;
    }

    const nextRoot = this.normalizeFieldGroup({
      logic: root.logic,
      conditions: [...root.conditions],
      groups: root.groups?.filter((_, index) => index !== groupIndex),
    });

    this.applyStructuredRoot(nextRoot);
  }

  private applyStructuredRoot(root: FieldFilterGroup | null): void {
    this.setFieldState({
      root,
      activeFields: this.collectActiveFields(root),
      timestamp: Date.now(),
    });
  }

  private collectActiveFields(root: FieldFilterGroup | null): string[] {
    if (!root) {
      return [];
    }

    const fields = new Set<string>();
    const visit = (group: FieldFilterGroup) => {
      for (const condition of group.conditions) {
        fields.add(condition.field);
      }

      for (const nested of group.groups ?? []) {
        visit(nested);
      }
    };

    visit(root);
    return Array.from(fields);
  }

  private normalizeFieldGroup(group: FieldFilterGroup): FieldFilterGroup | null {
    const normalizedGroups = group.groups?.filter(
      (nested) => nested.conditions.length > 0 || (nested.groups?.length ?? 0) > 0
    );

    if (group.conditions.length === 0 && (normalizedGroups?.length ?? 0) === 0) {
      return null;
    }

    return {
      logic: group.logic,
      conditions: [...group.conditions],
      groups: normalizedGroups && normalizedGroups.length > 0 ? normalizedGroups : undefined,
    };
  }

  private describeQuickFilter(quickFilter: FilterQuickState): string {
    const query = this.formatValue(quickFilter.query);
    if (!quickFilter.columns || quickFilter.columns.length === 0) {
      return `Search ${query}`;
    }

    const labels = quickFilter.columns.map((column) => this.getColumnLabelByIndex(column));
    return `Search ${labels.join(', ')} ${query}`;
  }

  private describeFieldGroup(group: FieldFilterGroup, nested = false): string {
    const parts = [
      ...group.conditions.map((condition) => this.describeFieldCondition(condition)),
      ...(group.groups ?? []).map((child) => this.describeFieldGroup(child, true)),
    ];

    if (parts.length === 0) {
      return 'Filter group';
    }

    const joined = parts.join(` ${group.logic} `);
    return nested && parts.length > 1 ? `(${joined})` : joined;
  }

  private describeFieldCondition(condition: FieldFilterCondition): string {
    const label = this.getColumnLabelByField(condition.field);

    switch (condition.operator) {
      case 'eq':
      case 'equals':
        return `${label} = ${this.formatValue(condition.value)}`;
      case 'neq':
      case 'notEquals':
        return `${label} != ${this.formatValue(condition.value)}`;
      case 'contains':
        return `${label} contains ${this.formatValue(condition.value)}`;
      case 'notContains':
        return `${label} does not contain ${this.formatValue(condition.value)}`;
      case 'startsWith':
        return `${label} starts with ${this.formatValue(condition.value)}`;
      case 'endsWith':
        return `${label} ends with ${this.formatValue(condition.value)}`;
      case 'gt':
      case 'greaterThan':
        return `${label} > ${this.formatValue(condition.value)}`;
      case 'gte':
      case 'greaterThanOrEqual':
        return `${label} >= ${this.formatValue(condition.value)}`;
      case 'lt':
      case 'lessThan':
        return `${label} < ${this.formatValue(condition.value)}`;
      case 'lte':
      case 'lessThanOrEqual':
        return `${label} <= ${this.formatValue(condition.value)}`;
      case 'between':
        return `${label} between ${this.formatValue(condition.value)} and ${this.formatValue(
          condition.valueTo
        )}`;
      case 'in':
        return `${label} in ${this.formatValue(condition.value)}`;
      case 'notIn':
        return `${label} not in ${this.formatValue(condition.value)}`;
      case 'isNull':
      case 'blank':
        return `${label} is blank`;
      case 'isNotNull':
      case 'notBlank':
        return `${label} is not blank`;
      case 'regex':
        return `${label} matches ${this.formatValue(condition.value)}`;
      default:
        return condition.value === undefined
          ? `${label} ${condition.operator}`
          : `${label} ${condition.operator} ${this.formatValue(condition.value)}`;
    }
  }

  private formatValue(value: any): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.formatValue(item)).join(', ')}]`;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'string') {
      return `"${value}"`;
    }

    if (value === null) {
      return 'null';
    }

    if (value === undefined) {
      return 'undefined';
    }

    return String(value);
  }

  private updateChipBarLayout(): void {
    const scrollContainer = this.container.querySelector(
      '.zg-scroll-container'
    ) as HTMLElement | null;
    const header = this.container.querySelector('.zg-header') as HTMLElement | null;
    const headerHeight = header?.offsetHeight ?? 0;
    const chipHeight =
      this.chipBar && this.chipBar.style.display !== 'none' ? this.chipBar.offsetHeight : 0;

    if (this.chipBar) {
      this.chipBar.style.top = `${headerHeight}px`;
    }

    if (scrollContainer) {
      scrollContainer.style.top = `${headerHeight + chipHeight}px`;
    }
  }

  private closePopup = (): void => {
    const popup = this.popup;
    if (!popup) return;

    if (this.overlayManager.isOpen(popup)) {
      this.overlayManager.close(popup);
      return;
    }

    this.teardownPopup();
  };

  private teardownPopup(): void {
    if (this.popupKeyHandler && this.popup) {
      this.popup.removeEventListener('keydown', this.popupKeyHandler);
      this.popupKeyHandler = null;
    }

    if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }
  }

  destroy(): void {
    this.closePopup();
    if (this.filterClickUnsub) {
      this.filterClickUnsub();
      this.filterClickUnsub = null;
    }
    if (this.filterChangeUnsub) {
      this.filterChangeUnsub();
      this.filterChangeUnsub = null;
    }
    if (this.chipBar) {
      this.chipBar.remove();
      this.chipBar = null;
    }
    this.updateChipBarLayout();
  }
}
