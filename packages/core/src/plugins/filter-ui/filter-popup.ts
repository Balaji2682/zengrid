import type { FilterOperator } from '../../types';
import type { FilterPopupHandle, FilterPopupOptions } from './filter-ui-types';
import { buildCondition, getOperatorsForType } from './filter-ui-operators';
import { applyTokens, createPartApplier } from './filter-popup-customize';
import {
  createActions,
  createButton,
  createHeader,
  createMatchControl,
  positionUnanchoredPopup,
} from './filter-popup-dom';
import { createConditionRow, type ConditionRow } from './filter-condition-row';

export function openFilterPopup(options: FilterPopupOptions): FilterPopupHandle {
  const dropdownType = options.payload.dropdownType ?? 'text';
  const operators = getOperatorsForType(dropdownType);
  const applyPart = createPartApplier(options.customization, {
    columnDef: options.columnDef,
    dataCol: options.dataCol,
  });

  const popup = document.createElement('div');
  popup.className = 'zg-filter-popup';
  applyPart('popup', popup);
  applyTokens(popup, options.customization?.tokens);

  const header = createHeader(options, applyPart);
  popup.appendChild(header.header);

  const matchControl = createMatchControl(options.existing?.logic ?? 'AND', applyPart);
  popup.appendChild(matchControl.row);

  const conditionsContainer = document.createElement('div');
  conditionsContainer.className = 'zg-filter-popup__conditions';
  popup.appendChild(applyPart('conditions', conditionsContainer));

  const conditionRows: ConditionRow[] = [];
  let activeRow: ConditionRow | null = null;

  const updateConditionControls = () => {
    const showLogic = conditionRows.length > 1;
    matchControl.row.style.display = showLogic ? '' : 'none';
    conditionRows.forEach((row) => {
      row.removeBtn.style.display = showLogic ? '' : 'none';
    });
  };

  const focusRow = (row: ConditionRow | null) => {
    if (!row) return;
    if (row.valueInput.style.display !== 'none') row.valueInput.focus();
    else row.operatorSelect.focus();
  };

  // Accordion: exactly one row is expanded (the "active" one); the rest collapse
  // to a one-line summary so stacking conditions stays compact. A lone row never
  // collapses.
  const expand = (row: ConditionRow) => {
    activeRow = row;
    conditionRows.forEach((r) => r.setCollapsed(r !== row && conditionRows.length > 1));
    updateConditionControls();
  };

  const settleAfterRemove = () => {
    if (conditionRows.length <= 1) {
      if (conditionRows[0]) expand(conditionRows[0]);
      else updateConditionControls();
    } else if (activeRow && conditionRows.includes(activeRow)) {
      expand(activeRow);
    } else {
      activeRow = null;
      conditionRows.forEach((r) => r.setCollapsed(true));
      updateConditionControls();
    }
  };

  const addCondition = (condition?: { operator: string; value?: any }, activate = true) => {
    const row = createConditionRow(
      condition,
      operators,
      dropdownType,
      () => {
        const index = conditionRows.findIndex((item) => item.element === row.element);
        if (index >= 0) conditionRows.splice(index, 1);
        row.element.remove();
        if (activeRow === row) activeRow = null;
        settleAfterRemove();
      },
      applyPart
    );
    row.editBtn.addEventListener('click', () => {
      expand(row);
      focusRow(row);
    });
    conditionRows.push(row);
    conditionsContainer.appendChild(row.element);
    if (activate) expand(row);
    else updateConditionControls();
  };

  const existingConditions = options.existing?.conditions?.length
    ? options.existing.conditions
    : null;
  if (existingConditions) {
    existingConditions.forEach((condition) => addCondition(condition, false));
    settleAfterRemove();
  } else {
    addCondition();
  }

  const addConditionBtn = applyPart(
    'addBtn',
    createButton('zg-filter-popup__btn zg-filter-popup__btn--add', 'Add condition')
  );
  addConditionBtn.addEventListener('click', () => {
    addCondition();
    focusRow(activeRow);
  });
  popup.appendChild(addConditionBtn);

  const { actions, applyBtn, clearBtn } = createActions(applyPart);
  popup.appendChild(actions);

  const applyFilter = () => {
    const conditions = conditionRows.map((row) =>
      buildCondition(
        row.operatorSelect.value as FilterOperator,
        dropdownType,
        row.valueInput.value,
        row.valueInputTo.value
      )
    ) as Array<{ operator: string; value: any }>;

    if (conditions.length === 0) return;
    options.setColumnFilter(options.dataCol, conditions, matchControl.getValue());
    handle.close();
  };

  applyBtn.addEventListener('click', applyFilter);
  clearBtn.addEventListener('click', () => {
    options.clearColumnFilter(options.dataCol);
    handle.close();
  });
  header.closeBtn.addEventListener('click', () => handle.close());

  let keyHandler: ((e: KeyboardEvent) => void) | null = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const active = document.activeElement as HTMLElement | null;
    if (!active || !popup.contains(active)) return;
    const tag = active.tagName.toLowerCase();
    if (tag === 'input' || tag === 'select') {
      e.preventDefault();
      applyFilter();
    }
  };
  popup.addEventListener('keydown', keyHandler);
  document.body.appendChild(popup);
  positionUnanchoredPopup(popup, options);

  const teardown = () => {
    if (keyHandler) {
      popup.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    popup.remove();
  };

  const handle: FilterPopupHandle = {
    close: () => {
      if (options.overlayManager.isOpen(popup)) {
        options.overlayManager.close(popup);
        return;
      }
      teardown();
    },
    destroy: teardown,
  };

  options.overlayManager.open({
    overlay: popup,
    anchor: options.payload.anchorElement,
    additionalElements: options.payload.anchorElement ? [options.payload.anchorElement] : [],
    restoreFocusOnClose: !!options.payload.anchorElement,
    restoreFocusTo: options.payload.anchorElement ?? null,
    closeOnEscape: true,
    positionOptions: { placement: 'bottom-start', offset: 4, viewportPadding: 8 },
    scrollOptions: { closeOnOutOfView: true, repositionOnScroll: false },
    onClose: teardown,
  });

  setTimeout(() => focusRow(activeRow ?? conditionRows[0] ?? null), 0);

  return handle;
}
