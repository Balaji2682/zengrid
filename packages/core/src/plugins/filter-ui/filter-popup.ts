import type { FilterOperator } from '../../types';
import type { FilterPopupHandle, FilterPopupOptions } from './filter-ui-types';
import { buildCondition, getOperatorsForType } from './filter-ui-operators';
import {
  createActions,
  createButton,
  createConditionRow,
  createLogicRow,
  createTitle,
  positionUnanchoredPopup,
  type ConditionRow,
} from './filter-popup-dom';

export function openFilterPopup(options: FilterPopupOptions): FilterPopupHandle {
  const dropdownType = options.payload.dropdownType ?? 'text';
  const operators = getOperatorsForType(dropdownType);
  const popup = document.createElement('div');
  popup.className = 'zg-filter-popup';
  popup.appendChild(createTitle(options));

  const logicRow = createLogicRow(options.existing?.logic ?? 'AND');
  popup.appendChild(logicRow.row);

  const conditionsContainer = document.createElement('div');
  conditionsContainer.className = 'zg-filter-popup__conditions';
  popup.appendChild(conditionsContainer);

  const conditionRows: ConditionRow[] = [];
  const updateConditionControls = () => {
    const showLogic = conditionRows.length > 1;
    logicRow.row.style.display = showLogic ? '' : 'none';
    conditionRows.forEach((row) => {
      row.removeBtn.style.display = showLogic ? '' : 'none';
    });
  };

  const addCondition = (condition?: { operator: string; value?: any }) => {
    const row = createConditionRow(condition, operators, dropdownType, () => {
      const index = conditionRows.findIndex((item) => item.element === row.element);
      if (index >= 0) conditionRows.splice(index, 1);
      row.element.remove();
      updateConditionControls();
    });
    conditionRows.push(row);
    conditionsContainer.appendChild(row.element);
    updateConditionControls();
  };

  const existingConditions = options.existing?.conditions?.length
    ? options.existing.conditions
    : null;
  existingConditions ? existingConditions.forEach(addCondition) : addCondition();

  const addConditionBtn = createButton('zg-filter-popup__btn zg-filter-popup__btn--add', 'Add condition');
  addConditionBtn.addEventListener('click', () => addCondition());
  popup.appendChild(addConditionBtn);

  const { actions, applyBtn, clearBtn } = createActions();
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
    options.setColumnFilter(options.dataCol, conditions, logicRow.select.value as 'AND' | 'OR');
    handle.close();
  };

  applyBtn.addEventListener('click', applyFilter);
  clearBtn.addEventListener('click', () => {
    options.clearColumnFilter(options.dataCol);
    handle.close();
  });

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

  setTimeout(() => {
    const first = conditionRows[0];
    if (!first) return;
    if (first.valueInput.style.display !== 'none') first.valueInput.focus();
    else first.operatorSelect.focus();
  }, 0);

  return handle;
}
