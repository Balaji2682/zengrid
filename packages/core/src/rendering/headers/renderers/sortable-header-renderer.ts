import { TextHeaderRenderer } from './text-header-renderer';
import type { HeaderRenderParams } from '../header-renderer.interface';

/**
 * SortableHeaderRenderer - Header renderer with sort indicators
 *
 * Extends TextHeaderRenderer and adds:
 * - Sort direction indicators (ascending/descending arrows)
 * - Click-to-sort functionality
 * - Visual feedback for sorted state
 *
 * @example
 * ```typescript
 * const renderer = new SortableHeaderRenderer();
 * renderer.render(element, {
 *   columnIndex: 0,
 *   column: { field: 'name', header: 'Name', sortable: true },
 *   config: {
 *     text: 'Name',
 *     type: 'sortable',
 *     interactive: true,
 *     sortIndicator: { show: true, ascIcon: '▲', descIcon: '▼' }
 *   },
 *   sortDirection: 'asc',
 *   width: 200,
 *   height: 40,
 * });
 * ```
 */
export class SortableHeaderRenderer extends TextHeaderRenderer {
  /**
   * This renderer wires its own sort-click handler; skip the grid's fallback.
   */
  readonly handlesSortInteraction = true;

  /**
   * Default sort icons
   */
  private static readonly DEFAULT_ASC_ICON = '▲';
  private static readonly DEFAULT_DESC_ICON = '▼';

  /**
   * Initial render of sortable header
   */
  override render(element: HTMLElement, params: HeaderRenderParams): void {
    // Call parent render
    super.render(element, params);

    // Add sortable class
    element.classList.add('zg-header-sortable');

    // Make cursor pointer to indicate clickable
    element.style.cursor = 'pointer';
    element.tabIndex = 0;

    // Add sort indicator
    this.renderSortIndicator(element, params);

    // Override interaction handlers to include sort toggle
    this.setupSortInteractionHandlers(element, params);
  }

  /**
   * Update sortable header
   */
  override update(element: HTMLElement, params: HeaderRenderParams): void {
    // Call parent update
    super.update(element, params);

    // Update sort indicator
    this.updateSortIndicator(element, params);

    // Update sorted state classes
    element.classList.remove('sorted-asc', 'sorted-desc');
    if (params.sortDirection === 'asc') {
      element.classList.add('sorted-asc');
    } else if (params.sortDirection === 'desc') {
      element.classList.add('sorted-desc');
    }

    element.tabIndex = 0;
  }

  /**
   * Render sort indicator element
   */
  protected renderSortIndicator(element: HTMLElement, params: HeaderRenderParams): void {
    const contentWrapper = element.querySelector('.zg-header-content');
    if (!contentWrapper) return;

    const sortIndicator = params.config.sortIndicator;
    if (!sortIndicator?.show) return;

    // Create sort indicator container
    const sortEl = document.createElement('span');
    sortEl.className = 'zg-sort-indicator';
    sortEl.style.cssText = `
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-left: 2px;
      font-size: 9px;
      line-height: 1;
      flex-shrink: 0;
      width: 14px;
      min-width: 14px;
      max-width: 14px;
      overflow: visible;
    `;

    // Update sort icon based on current state
    this.updateSortIcon(sortEl, params);

    // Add to content wrapper based on position
    const position = sortIndicator.position || 'trailing';
    if (position === 'leading') {
      contentWrapper.insertBefore(sortEl, contentWrapper.firstChild);
    } else {
      contentWrapper.appendChild(sortEl);
    }
  }

  /**
   * Update sort indicator
   */
  protected updateSortIndicator(element: HTMLElement, params: HeaderRenderParams): void {
    const sortEl = element.querySelector('.zg-sort-indicator');
    if (!sortEl) return;

    this.updateSortIcon(sortEl as HTMLElement, params);
  }

  /**
   * Update sort icon based on sort direction
   */
  protected updateSortIcon(sortEl: HTMLElement, params: HeaderRenderParams): void {
    const sortIndicator = params.config.sortIndicator;
    const { sortDirection, sortPriority } = params;

    if (!sortDirection) {
      // Not sorted - show both arrows in muted state
      sortEl.innerHTML = `
        <span style="opacity: 0.3;">${sortIndicator?.ascIcon || SortableHeaderRenderer.DEFAULT_ASC_ICON}</span>
        <span style="opacity: 0.3; margin-top: -2px;">${sortIndicator?.descIcon || SortableHeaderRenderer.DEFAULT_DESC_ICON}</span>
      `;
      sortEl.style.opacity = '0.5';
    } else if (sortDirection === 'asc') {
      // Ascending sort
      sortEl.innerHTML = sortIndicator?.ascIcon || SortableHeaderRenderer.DEFAULT_ASC_ICON;
      sortEl.style.opacity = '1';
      sortEl.style.color = 'var(--zg-primary-color, #0066cc)';
    } else if (sortDirection === 'desc') {
      // Descending sort
      sortEl.innerHTML = sortIndicator?.descIcon || SortableHeaderRenderer.DEFAULT_DESC_ICON;
      sortEl.style.opacity = '1';
      sortEl.style.color = 'var(--zg-primary-color, #0066cc)';
    }

    // Show sort priority for multi-column sort
    if (sortPriority !== undefined && sortPriority >= 0 && sortDirection) {
      const priorityBadge = document.createElement('span');
      priorityBadge.className = 'zg-sort-priority';
      priorityBadge.textContent = String(sortPriority + 1);
      priorityBadge.style.cssText = `
        position: absolute;
        top: 2px;
        right: 2px;
        font-size: 8px;
        background: var(--zg-primary-color, #0066cc);
        color: white;
        border-radius: 50%;
        width: 12px;
        height: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      sortEl.style.position = 'relative';
      sortEl.appendChild(priorityBadge);
    }
  }

  /**
   * Setup sort click handler
   */
  protected setupSortInteractionHandlers(element: HTMLElement, params: HeaderRenderParams): void {
    // Remove existing click listeners (stored by parent)
    const existingListeners = (element as any)._headerListeners || [];
    existingListeners
      .filter((l: any) => l.event === 'click' || l.event === 'keydown')
      .forEach((l: any) => {
        element.removeEventListener(l.event, l.handler);
      });

    // Add new sort click handler
    const sortClickHandler = (e: Event) => {
      const mouseEvent = e as MouseEvent;

      // Emit header:click event (generic header click)
      if (params.emit) {
        params.emit('header:click', {
          columnIndex: params.columnIndex,
          column: params.column,
          nativeEvent: mouseEvent,
        });
      }

      // Emit header:sort:click event (specific sort click)
      this.emitSortInteraction(params, mouseEvent, 'click');

      // Call user's onClick if provided
      if (params.config.onClick) {
        params.config.onClick(mouseEvent, params.columnIndex);
      }
    };

    const sortKeyDownHandler = (e: Event) => {
      const keyboardEvent = e as KeyboardEvent;
      if (!this.isSortActivationKey(keyboardEvent)) {
        return;
      }

      keyboardEvent.preventDefault();
      this.emitSortInteraction(params, keyboardEvent, 'keyboard');
    };

    element.addEventListener('click', sortClickHandler);
    element.addEventListener('keydown', sortKeyDownHandler);

    // Update stored listeners
    const newListeners = existingListeners.filter(
      (l: any) => l.event !== 'click' && l.event !== 'keydown'
    );
    newListeners.push({ event: 'click', handler: sortClickHandler });
    newListeners.push({ event: 'keydown', handler: sortKeyDownHandler });
    (element as any)._headerListeners = newListeners;
  }

  private emitSortInteraction(
    params: HeaderRenderParams,
    nativeEvent: MouseEvent | KeyboardEvent,
    trigger: 'click' | 'keyboard'
  ): void {
    if (!params.emit) {
      return;
    }

    params.emit('header:sort:click', {
      columnIndex: params.columnIndex,
      column: params.column,
      currentDirection: params.sortDirection,
      nextDirection:
        params.sortDirection === 'asc'
          ? 'desc'
          : params.sortDirection === 'desc'
            ? null
            : 'asc',
      additive: this.isAdditiveSortInteraction(nativeEvent),
      trigger,
      nativeEvent,
    });
  }

  private isAdditiveSortInteraction(event: MouseEvent | KeyboardEvent): boolean {
    return !!(event.shiftKey || event.ctrlKey || event.metaKey);
  }

  private isSortActivationKey(event: KeyboardEvent): boolean {
    return event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
  }

  /**
   * Get additional CSS class for sorted state
   */
  override getHeaderClass?(params: HeaderRenderParams): string | undefined {
    const parentClass = super.getHeaderClass?.(params);
    const classes: string[] = parentClass ? [parentClass] : [];

    if (params.sortDirection) {
      classes.push('sorted');
      classes.push(`sorted-${params.sortDirection}`);
    }

    return classes.length > 0 ? classes.join(' ') : undefined;
  }
}
