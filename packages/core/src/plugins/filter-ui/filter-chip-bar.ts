import type { FilterExpression } from '../../types';
import type { ColumnLabelResolver, FilterChipActions } from './filter-ui-types';
import { buildChipDescriptors } from './filter-chip-descriptors';

export class FilterChipBar {
  private chipBar: HTMLElement | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly getFilterExpression: () => FilterExpression | null,
    private readonly labels: ColumnLabelResolver,
    private readonly actions: FilterChipActions
  ) {}

  render(): void {
    const chipBar = this.ensureChipBar();
    const chips = buildChipDescriptors(this.getFilterExpression(), this.labels, this.actions);
    chipBar.replaceChildren();

    if (chips.length === 0) {
      chipBar.style.display = 'none';
      this.updateLayout();
      return;
    }

    chipBar.style.display = '';
    chipBar.appendChild(createTextElement('span', 'zg-filter-chip-bar__title', 'Filters'));

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
    clearAllButton.addEventListener('click', () => this.actions.clearAllFilters());
    chipBar.appendChild(clearAllButton);

    this.updateLayout();
  }

  destroy(): void {
    this.chipBar?.remove();
    this.chipBar = null;
    this.updateLayout();
  }

  private ensureChipBar(): HTMLElement {
    if (this.chipBar && this.chipBar.isConnected) return this.chipBar;

    const host =
      (this.container.querySelector('.zg-viewport') as HTMLElement | null) ?? this.container;
    const chipBar = document.createElement('div');
    chipBar.className = 'zg-filter-chip-bar';
    chipBar.style.display = 'none';
    host.appendChild(chipBar);
    this.chipBar = chipBar;
    return chipBar;
  }

  private createChipElement(label: string, remove: () => void): HTMLElement {
    const chip = document.createElement('div');
    chip.className = 'zg-filter-chip';
    chip.title = label;
    chip.appendChild(createTextElement('span', 'zg-filter-chip__label', label));

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'zg-filter-chip__remove';
    removeButton.setAttribute('aria-label', `Remove filter ${label}`);
    removeButton.textContent = 'x';
    removeButton.addEventListener('click', remove);
    chip.appendChild(removeButton);
    return chip;
  }

  private updateLayout(): void {
    const scrollContainer = this.container.querySelector(
      '.zg-scroll-container'
    ) as HTMLElement | null;
    const header = this.container.querySelector('.zg-header') as HTMLElement | null;
    const headerHeight = header?.offsetHeight ?? 0;
    const chipHeight =
      this.chipBar && this.chipBar.style.display !== 'none' ? this.chipBar.offsetHeight : 0;

    if (this.chipBar) this.chipBar.style.top = `${headerHeight}px`;
    if (scrollContainer) scrollContainer.style.top = `${headerHeight + chipHeight}px`;
  }
}

function createTextElement(tag: 'span', className: string, text: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}
