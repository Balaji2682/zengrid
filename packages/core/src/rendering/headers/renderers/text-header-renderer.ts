import type { HeaderRenderer, HeaderRenderParams } from '../header-renderer.interface';
import type { HeaderIcon } from '../../../types';

/**
 * TextHeaderRenderer - Default header renderer for simple text headers
 *
 * Supports:
 * - Text content
 * - Leading and trailing icons
 * - Tooltips
 * - Custom CSS classes and styles
 * - Click handlers
 *
 * @example
 * ```typescript
 * const renderer = new TextHeaderRenderer();
 * renderer.render(element, {
 *   columnIndex: 0,
 *   column: { field: 'name', header: 'Name' },
 *   config: { text: 'Name', type: 'text', interactive: false },
 *   width: 200,
 *   height: 40,
 * });
 * ```
 */
export class TextHeaderRenderer implements HeaderRenderer {
  /**
   * Initial render of header content
   */
  render(element: HTMLElement, params: HeaderRenderParams): void {
    // Clear previous content
    element.innerHTML = '';

    // Apply base classes
    element.className = 'zg-header-cell';

    // Add custom class if provided
    if (params.config.className) {
      element.classList.add(params.config.className);
    }

    // Add interactive class if header is interactive
    if (params.config.interactive) {
      element.classList.add('zg-header-interactive');
    }

    // Apply sizing
    element.style.width = `${params.width}px`;
    element.style.height = `${params.height}px`;
    element.style.flexShrink = '0'; // Prevent flexbox from shrinking headers
    element.style.boxSizing = 'border-box';
    element.style.overflow = 'hidden'; // Prevent content from bleeding outside

    // Apply custom styles
    if (params.config.style) {
      Object.assign(element.style, params.config.style);
    }

    // Resolve horizontal alignment from the column definition (defaults to left)
    const align = params.column?.align ?? 'left';
    const justify =
      align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start';

    // Create content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'zg-header-content';
    contentWrapper.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: ${justify};
      height: 100%;
      padding: 0 6px;
      gap: 4px;
      overflow: hidden;
      width: 100%;
    `;

    // Render leading icon
    if (params.config.leadingIcon) {
      const iconEl = this.createIconElement(params.config.leadingIcon, params.columnIndex);
      contentWrapper.appendChild(iconEl);
    }

    // Render text
    const textEl = document.createElement('span');
    textEl.className = 'zg-header-text';
    textEl.textContent = params.config.text;
    textEl.style.cssText = `
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: ${align};
    `;
    contentWrapper.appendChild(textEl);

    // Render trailing icon
    if (params.config.trailingIcon) {
      const iconEl = this.createIconElement(params.config.trailingIcon, params.columnIndex);
      contentWrapper.appendChild(iconEl);
    }

    element.appendChild(contentWrapper);

    // Setup event handlers
    this.setupEventHandlers(element, params);

    // Setup tooltip
    if (params.config.tooltip) {
      this.setupTooltip(element, params.config.tooltip);
    }
  }

  /**
   * Update existing header content
   */
  update(element: HTMLElement, params: HeaderRenderParams): void {
    // Update text content
    const textEl = element.querySelector('.zg-header-text');
    if (textEl) {
      textEl.textContent = params.config.text;
    }

    // Update width if changed
    if (element.style.width !== `${params.width}px`) {
      element.style.width = `${params.width}px`;
    }

    // Update interactive state
    if (params.config.interactive) {
      element.classList.add('zg-header-interactive');
    } else {
      element.classList.remove('zg-header-interactive');
    }

    // Update custom class
    const customClass = params.config.className;
    if (customClass) {
      // Remove old custom classes (all except base classes)
      const baseClasses = ['zg-header-cell', 'zg-header-interactive'];
      element.className = baseClasses.filter((cls) => element.classList.contains(cls)).join(' ');
      element.classList.add(customClass);
    }
  }

  /**
   * Cleanup before removal
   */
  destroy(element: HTMLElement): void {
    // Remove event listeners (stored on element)
    const listeners = (element as any)._headerListeners;
    if (listeners) {
      listeners.forEach((listener: any) => {
        element.removeEventListener(listener.event, listener.handler);
      });
      delete (element as any)._headerListeners;
    }

    // Clear content
    element.innerHTML = '';
  }

  /**
   * Get additional CSS class for header cell
   */
  getHeaderClass?(params: HeaderRenderParams): string | undefined {
    const classes: string[] = [];

    if (params.isHovered) classes.push('hovered');
    if (params.isFocused) classes.push('focused');
    if (params.isResizing) classes.push('resizing');

    return classes.length > 0 ? classes.join(' ') : undefined;
  }

  /**
   * Create icon element
   */
  protected createIconElement(icon: HeaderIcon, columnIndex: number): HTMLElement {
    const iconEl = document.createElement('span');
    iconEl.className = `zg-header-icon ${icon.className || ''}`;
    iconEl.innerHTML = icon.content;
    iconEl.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 18px;
      min-width: 18px;
      max-width: 18px;
      font-size: 14px;
      overflow: visible;
    `;

    // Add click handler if provided
    if (icon.onClick) {
      iconEl.style.cursor = 'pointer';
      iconEl.addEventListener('click', (e) => {
        e.stopPropagation();
        icon.onClick!(e as MouseEvent, columnIndex);
      });
    }

    return iconEl;
  }

  /**
   * Setup event handlers for header element
   */
  protected setupEventHandlers(element: HTMLElement, params: HeaderRenderParams): void {
    const listeners: any[] = [];

    // Click handler
    if (params.config.onClick) {
      const clickHandler = (e: Event) => {
        params.config.onClick!(e as MouseEvent, params.columnIndex);
      };
      element.addEventListener('click', clickHandler);
      listeners.push({ event: 'click', handler: clickHandler });
    }

    // Double-click handler
    if (params.config.onDoubleClick) {
      const dblClickHandler = (e: Event) => {
        params.config.onDoubleClick!(e as MouseEvent, params.columnIndex);
      };
      element.addEventListener('dblclick', dblClickHandler);
      listeners.push({ event: 'dblclick', handler: dblClickHandler });
    }

    // Context menu handler
    if (params.config.contextMenu) {
      const contextMenuHandler = (e: Event) => {
        e.preventDefault();
        this.showContextMenu(e as MouseEvent, params);
      };
      element.addEventListener('contextmenu', contextMenuHandler);
      listeners.push({ event: 'contextmenu', handler: contextMenuHandler });
    }

    // Emit grid events - hover
    if (params.emit) {
      const hoverEnterHandler = () => {
        params.emit!('header:hover', {
          columnIndex: params.columnIndex,
          column: params.column,
          isHovering: true,
        });
      };
      const hoverLeaveHandler = () => {
        params.emit!('header:hover', {
          columnIndex: params.columnIndex,
          column: params.column,
          isHovering: false,
        });
      };
      element.addEventListener('mouseenter', hoverEnterHandler);
      element.addEventListener('mouseleave', hoverLeaveHandler);
      listeners.push({ event: 'mouseenter', handler: hoverEnterHandler });
      listeners.push({ event: 'mouseleave', handler: hoverLeaveHandler });
    }

    // Store listeners for cleanup
    (element as any)._headerListeners = listeners;
  }

  /**
   * Setup tooltip for header element
   */
  protected setupTooltip(element: HTMLElement, tooltip: any): void {
    // Simple title attribute for now (can be enhanced with custom tooltip component)
    element.title = tooltip.content;
  }

  /**
   * Show context menu
   */
  protected showContextMenu(_event: MouseEvent, params: HeaderRenderParams): void {
    const menuItems = params.config.contextMenu;
    if (!menuItems || menuItems.length === 0) return;

    // TODO: Implement proper context menu UI
  }
}
