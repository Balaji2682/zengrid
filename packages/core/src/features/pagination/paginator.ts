import type {
  PaginationState,
  PaginationConfig,
  PaginationHandlers,
} from '../../types';

/**
 * Paginator - Renders pagination controls with multiple template styles
 *
 * Provides 5 built-in template styles:
 * 1. **Simple**: Minimal navigation < 1 2 3 >
 * 2. **Material**: Material Design inspired
 * 3. **Bootstrap**: Bootstrap style with ellipsis
 * 4. **Compact**: Compact with page input field
 * 5. **Full**: Full-featured with all controls
 *
 * @example Basic Usage
 * ```typescript
 * const paginator = new Paginator({
 *   enabled: true,
 *   pageSize: 100,
 *   template: 'material',
 * });
 *
 * const container = paginator.render(state, handlers);
 * document.body.appendChild(container);
 * ```
 */
export class Paginator {
  private config: Required<Omit<PaginationConfig, 'customTemplate'>> & Pick<PaginationConfig, 'customTemplate'>;

  constructor(config: PaginationConfig = {}) {
    this.config = {
      enabled: config.enabled ?? false,
      pageSize: config.pageSize ?? 100,
      pageSizeOptions: config.pageSizeOptions ?? [25, 50, 100, 200, 500],
      template: config.template ?? 'material',
      position: config.position ?? 'bottom',
      showPageSizeSelector: config.showPageSizeSelector ?? true,
      showTotalCount: config.showTotalCount ?? true,
      showPageInfo: config.showPageInfo ?? true,
      maxPageButtons: config.maxPageButtons ?? 7,
      customTemplate: config.customTemplate,
    };
  }

  /**
   * Render pagination controls
   */
  render(state: PaginationState, handlers: PaginationHandlers): HTMLElement {
    // Use custom template if provided
    if (this.config.customTemplate) {
      return this.config.customTemplate(state, handlers);
    }

    // Use built-in template
    switch (this.config.template) {
      case 'simple':
        return this.renderSimpleTemplate(state, handlers);
      case 'material':
        return this.renderMaterialTemplate(state, handlers);
      case 'bootstrap':
        return this.renderBootstrapTemplate(state, handlers);
      case 'compact':
        return this.renderCompactTemplate(state, handlers);
      case 'full':
        return this.renderFullTemplate(state, handlers);
      default:
        return this.renderMaterialTemplate(state, handlers);
    }
  }

  /**
   * Template 1: Simple - Minimal navigation
   * Layout: < 1 2 3 4 5 >
   */
  private renderSimpleTemplate(state: PaginationState, handlers: PaginationHandlers): HTMLElement {
    const container = document.createElement('div');
    container.className = 'zg-pagination zg-pagination-simple';

    // Previous button
    const prevBtn = this.createButton('‹', () => handlers.onPreviousPage(), state.currentPage === 0);
    container.appendChild(prevBtn);

    // Page numbers
    const pages = this.getPageNumbers(state);
    pages.forEach(pageNum => {
      if (pageNum === -1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'zg-pagination-ellipsis';
        ellipsis.textContent = '...';
        container.appendChild(ellipsis);
      } else {
        const pageBtn = this.createButton(
          String(pageNum + 1),
          () => handlers.onPageChange(pageNum),
          false,
          pageNum === state.currentPage
        );
        container.appendChild(pageBtn);
      }
    });

    // Next button
    const nextBtn = this.createButton('›', () => handlers.onNextPage(), state.currentPage >= state.totalPages - 1);
    container.appendChild(nextBtn);

    return container;
  }

  /**
   * Template 2: Material - Material Design style
   * Layout: Rows per page: [100] | 1-100 of 1000 | < >
   */
  private renderMaterialTemplate(state: PaginationState, handlers: PaginationHandlers): HTMLElement {
    const container = document.createElement('div');
    container.className = 'zg-pagination zg-pagination-material';

    // Page size selector
    if (this.config.showPageSizeSelector) {
      const selectorContainer = document.createElement('div');
      selectorContainer.className = 'zg-pagination-size-selector';

      const label = document.createElement('span');
      label.textContent = 'Rows per page:';
      label.className = 'zg-pagination-label';
      selectorContainer.appendChild(label);

      const select = this.createPageSizeSelector(state, handlers);
      selectorContainer.appendChild(select);

      container.appendChild(selectorContainer);
    }

    // Page info
    if (this.config.showPageInfo) {
      const info = this.createPageInfo(state);
      container.appendChild(info);
    }

    // Navigation controls
    const navControls = document.createElement('div');
    navControls.className = 'zg-pagination-nav';

    const prevBtn = this.createIconButton('‹', () => handlers.onPreviousPage(), state.currentPage === 0);
    const nextBtn = this.createIconButton('›', () => handlers.onNextPage(), state.currentPage >= state.totalPages - 1);

    navControls.appendChild(prevBtn);
    navControls.appendChild(nextBtn);
    container.appendChild(navControls);

    return container;
  }

  /**
   * Template 3: Bootstrap - Bootstrap style with ellipsis
   * Layout: First | Previous | 1 2 ... 5 6 7 ... 10 | Next | Last
   */
  private renderBootstrapTemplate(state: PaginationState, handlers: PaginationHandlers): HTMLElement {
    const container = document.createElement('div');
    container.className = 'zg-pagination zg-pagination-bootstrap';

    const nav = document.createElement('nav');
    const ul = document.createElement('ul');
    ul.className = 'zg-pagination-list';

    // First button
    const firstLi = this.createListItem(
      '«',
      () => handlers.onFirstPage(),
      state.currentPage === 0
    );
    ul.appendChild(firstLi);

    // Previous button
    const prevLi = this.createListItem(
      '‹',
      () => handlers.onPreviousPage(),
      state.currentPage === 0
    );
    ul.appendChild(prevLi);

    // Page numbers with ellipsis
    const pages = this.getPageNumbers(state);
    pages.forEach(pageNum => {
      if (pageNum === -1) {
        const ellipsisLi = document.createElement('li');
        ellipsisLi.className = 'zg-pagination-item';
        const span = document.createElement('span');
        span.textContent = '...';
        span.className = 'zg-pagination-ellipsis';
        ellipsisLi.appendChild(span);
        ul.appendChild(ellipsisLi);
      } else {
        const pageLi = this.createListItem(
          String(pageNum + 1),
          () => handlers.onPageChange(pageNum),
          false,
          pageNum === state.currentPage
        );
        ul.appendChild(pageLi);
      }
    });

    // Next button
    const nextLi = this.createListItem(
      '›',
      () => handlers.onNextPage(),
      state.currentPage >= state.totalPages - 1
    );
    ul.appendChild(nextLi);

    // Last button
    const lastLi = this.createListItem(
      '»',
      () => handlers.onLastPage(),
      state.currentPage >= state.totalPages - 1
    );
    ul.appendChild(lastLi);

    nav.appendChild(ul);
    container.appendChild(nav);

    return container;
  }

  /**
   * Template 4: Compact - Compact with page input
   * Layout: [100] items/page | Page [__5__] of 10 | < >
   */
  private renderCompactTemplate(state: PaginationState, handlers: PaginationHandlers): HTMLElement {
    const container = document.createElement('div');
    container.className = 'zg-pagination zg-pagination-compact';

    // Page size selector
    if (this.config.showPageSizeSelector) {
      const select = this.createPageSizeSelector(state, handlers);
      select.style.marginRight = '8px';
      container.appendChild(select);

      const label = document.createElement('span');
      label.textContent = 'items/page';
      label.className = 'zg-pagination-label';
      label.style.marginRight = '16px';
      container.appendChild(label);
    }

    // Page input
    const pageInputContainer = document.createElement('div');
    pageInputContainer.className = 'zg-pagination-page-input';

    const pageLabel = document.createElement('span');
    pageLabel.textContent = 'Page';
    pageLabel.className = 'zg-pagination-label';
    pageInputContainer.appendChild(pageLabel);

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.max = String(state.totalPages);
    input.value = String(state.currentPage + 1);
    input.className = 'zg-pagination-input';
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const page = Math.max(1, Math.min(state.totalPages, parseInt(target.value) || 1)) - 1;
      handlers.onPageChange(page);
    });
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    });
    pageInputContainer.appendChild(input);

    const ofLabel = document.createElement('span');
    ofLabel.textContent = `of ${state.totalPages}`;
    ofLabel.className = 'zg-pagination-label';
    pageInputContainer.appendChild(ofLabel);

    container.appendChild(pageInputContainer);

    // Navigation
    const prevBtn = this.createIconButton('‹', () => handlers.onPreviousPage(), state.currentPage === 0);
    const nextBtn = this.createIconButton('›', () => handlers.onNextPage(), state.currentPage >= state.totalPages - 1);

    container.appendChild(prevBtn);
    container.appendChild(nextBtn);

    return container;
  }

  /**
   * Template 5: Full - Full-featured with all controls
   * Layout: Showing 1-100 of 1000 | [100] per page | First | < | 1 2 3 4 5 | > | Last | Page 1 of 10
   */
  private renderFullTemplate(state: PaginationState, handlers: PaginationHandlers): HTMLElement {
    const container = document.createElement('div');
    container.className = 'zg-pagination zg-pagination-full';

    // Left section: Page info
    const leftSection = document.createElement('div');
    leftSection.className = 'zg-pagination-section-left';

    if (this.config.showPageInfo) {
      const info = this.createPageInfo(state);
      leftSection.appendChild(info);
    }

    if (this.config.showPageSizeSelector) {
      const sizeContainer = document.createElement('div');
      sizeContainer.className = 'zg-pagination-size-selector';

      const select = this.createPageSizeSelector(state, handlers);
      sizeContainer.appendChild(select);

      const label = document.createElement('span');
      label.textContent = 'per page';
      label.className = 'zg-pagination-label';
      sizeContainer.appendChild(label);

      leftSection.appendChild(sizeContainer);
    }

    container.appendChild(leftSection);

    // Center section: Page navigation
    const centerSection = document.createElement('div');
    centerSection.className = 'zg-pagination-section-center';

    const firstBtn = this.createButton('First', () => handlers.onFirstPage(), state.currentPage === 0);
    const prevBtn = this.createIconButton('‹', () => handlers.onPreviousPage(), state.currentPage === 0);

    centerSection.appendChild(firstBtn);
    centerSection.appendChild(prevBtn);

    // Page numbers
    const pages = this.getPageNumbers(state);
    pages.forEach(pageNum => {
      if (pageNum === -1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'zg-pagination-ellipsis';
        ellipsis.textContent = '...';
        centerSection.appendChild(ellipsis);
      } else {
        const pageBtn = this.createButton(
          String(pageNum + 1),
          () => handlers.onPageChange(pageNum),
          false,
          pageNum === state.currentPage
        );
        centerSection.appendChild(pageBtn);
      }
    });

    const nextBtn = this.createIconButton('›', () => handlers.onNextPage(), state.currentPage >= state.totalPages - 1);
    const lastBtn = this.createButton('Last', () => handlers.onLastPage(), state.currentPage >= state.totalPages - 1);

    centerSection.appendChild(nextBtn);
    centerSection.appendChild(lastBtn);

    container.appendChild(centerSection);

    // Right section: Page counter
    const rightSection = document.createElement('div');
    rightSection.className = 'zg-pagination-section-right';

    const pageCounter = document.createElement('span');
    pageCounter.className = 'zg-pagination-counter';
    pageCounter.textContent = `Page ${state.currentPage + 1} of ${state.totalPages}`;
    rightSection.appendChild(pageCounter);

    container.appendChild(rightSection);

    return container;
  }

  /**
   * Helper: Create button element
   */
  private createButton(
    text: string,
    onClick: () => void,
    disabled: boolean = false,
    active: boolean = false
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = 'zg-pagination-btn';
    if (disabled) button.classList.add('zg-pagination-btn-disabled');
    if (active) button.classList.add('zg-pagination-btn-active');
    button.disabled = disabled;
    button.addEventListener('click', onClick);
    return button;
  }

  /**
   * Helper: Create icon button element
   */
  private createIconButton(
    icon: string,
    onClick: () => void,
    disabled: boolean = false
  ): HTMLButtonElement {
    const button = this.createButton(icon, onClick, disabled);
    button.classList.add('zg-pagination-btn-icon');
    return button;
  }

  /**
   * Helper: Create list item for bootstrap template
   */
  private createListItem(
    text: string,
    onClick: () => void,
    disabled: boolean = false,
    active: boolean = false
  ): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'zg-pagination-item';
    if (active) li.classList.add('zg-pagination-item-active');

    const button = document.createElement('button');
    button.textContent = text;
    button.className = 'zg-pagination-link';
    button.disabled = disabled;
    button.addEventListener('click', onClick);

    li.appendChild(button);
    return li;
  }

  /**
   * Helper: Create page size selector
   */
  private createPageSizeSelector(state: PaginationState, handlers: PaginationHandlers): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'zg-pagination-select';

    state.pageSizeOptions.forEach(size => {
      const option = document.createElement('option');
      option.value = String(size);
      option.textContent = String(size);
      if (size === state.pageSize) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      const newSize = parseInt((e.target as HTMLSelectElement).value);
      handlers.onPageSizeChange(newSize);
    });

    return select;
  }

  /**
   * Helper: Create page info element
   */
  private createPageInfo(state: PaginationState): HTMLElement {
    const info = document.createElement('span');
    info.className = 'zg-pagination-info';

    const startRow = state.currentPage * state.pageSize + 1;
    const endRow = Math.min((state.currentPage + 1) * state.pageSize, state.totalRows);

    if (this.config.showTotalCount) {
      info.textContent = `Showing ${startRow.toLocaleString()}-${endRow.toLocaleString()} of ${state.totalRows.toLocaleString()}`;
    } else {
      info.textContent = `${startRow.toLocaleString()}-${endRow.toLocaleString()}`;
    }

    return info;
  }

  /**
   * Helper: Get page numbers to display with ellipsis
   */
  private getPageNumbers(state: PaginationState): number[] {
    const { currentPage, totalPages } = state;
    const maxButtons = this.config.maxPageButtons;

    if (totalPages <= maxButtons) {
      // Show all pages
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const pages: number[] = [];
    const halfMax = Math.floor(maxButtons / 2);

    // Always show first page
    pages.push(0);

    let startPage = Math.max(1, currentPage - halfMax + 1);
    let endPage = Math.min(totalPages - 2, currentPage + halfMax);

    // Adjust if at boundaries
    if (currentPage < halfMax) {
      endPage = Math.min(totalPages - 2, maxButtons - 2);
    } else if (currentPage > totalPages - halfMax - 1) {
      startPage = Math.max(1, totalPages - maxButtons + 1);
    }

    // Add ellipsis before if needed
    if (startPage > 1) {
      pages.push(-1); // -1 represents ellipsis
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis after if needed
    if (endPage < totalPages - 2) {
      pages.push(-1);
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages - 1);
    }

    return pages;
  }

  /**
   * Update pagination config
   */
  updateConfig(config: Partial<PaginationConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Destroy paginator and clean up
   */
  destroy(): void {
    // Cleanup if needed
  }
}
