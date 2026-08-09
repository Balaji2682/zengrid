import type { FilterPopupOptions } from './filter-ui-types';
import type { PartApplier } from './filter-popup-customize';
import { identityApplier } from './filter-popup-customize';

export function createHeader(
  options: FilterPopupOptions,
  applyPart: PartApplier = identityApplier
): { header: HTMLElement; closeBtn: HTMLButtonElement } {
  const header = document.createElement('div');
  header.className = 'zg-filter-popup__header';
  const title = document.createElement('div');
  title.className = 'zg-filter-popup__title';
  title.textContent = `Filter: ${options.getColumnLabel(options.columnDef, options.dataCol)}`;
  const closeBtn = createButton('zg-filter-popup__close', '×');
  closeBtn.setAttribute('aria-label', 'Close filter');
  header.appendChild(applyPart('title', title));
  header.appendChild(applyPart('close', closeBtn));
  return { header: applyPart('header', header), closeBtn };
}

export function createMatchControl(
  initial: 'AND' | 'OR',
  applyPart: PartApplier = identityApplier
): { row: HTMLElement; getValue: () => 'AND' | 'OR' } {
  const row = document.createElement('div');
  row.className = 'zg-filter-popup__match';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', 'Match');
  let value: 'AND' | 'OR' = initial;
  const buttons: Record<'AND' | 'OR', HTMLButtonElement> = {} as never;
  (['AND', 'OR'] as const).forEach((option) => {
    const btn = createButton('zg-filter-popup__match-btn', option);
    btn.addEventListener('click', () => {
      value = option;
      sync();
    });
    buttons[option] = btn;
    row.appendChild(btn);
  });
  const sync = (): void => {
    buttons.AND.classList.toggle('is-active', value === 'AND');
    buttons.OR.classList.toggle('is-active', value === 'OR');
  };
  sync();
  return { row: applyPart('match', row), getValue: () => value };
}

export function createButton(className: string, text: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  return button;
}

export function createActions(applyPart: PartApplier = identityApplier): {
  actions: HTMLElement;
  applyBtn: HTMLButtonElement;
  clearBtn: HTMLButtonElement;
} {
  const actions = document.createElement('div');
  actions.className = 'zg-filter-popup__actions';
  const applyBtn = applyPart('applyBtn', createButton('zg-filter-popup__btn primary', 'Apply')) as HTMLButtonElement;
  const clearBtn = applyPart('clearBtn', createButton('zg-filter-popup__btn', 'Clear')) as HTMLButtonElement;
  actions.appendChild(applyBtn);
  actions.appendChild(clearBtn);
  return { actions: applyPart('actions', actions), applyBtn, clearBtn };
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
