import type { CellRenderer, RenderParams } from './renderer.interface';

/**
 * Composite element configuration
 */
export interface CompositeElement {
  /**
   * Element type
   */
  type: 'icon' | 'text' | 'badge' | 'custom';

  /**
   * Function to extract value from render params
   */
  getValue: (params: RenderParams) => any;

  /**
   * Additional CSS class
   */
  className?: string;

  /**
   * Custom renderer (for 'custom' type only)
   */
  renderer?: CellRenderer;
}

/**
 * Conditional styling rule
 */
export interface ConditionalStyle {
  /**
   * Condition function
   */
  condition: (params: RenderParams) => boolean;

  /**
   * CSS class to apply when condition is true
   */
  className?: string;

  /**
   * Inline styles to apply when condition is true
   */
  style?: Partial<CSSStyleDeclaration>;
}

/**
 * Options for AdvancedCellRenderer
 */
export interface AdvancedCellRendererOptions {
  /**
   * Composite elements to render
   */
  elements: CompositeElement[];

  /**
   * Conditional styling rules
   */
  conditions?: ConditionalStyle[];

  /**
   * Layout direction
   * @default 'horizontal'
   */
  layout?: 'horizontal' | 'vertical';

  /**
   * Gap between elements in pixels
   * @default 4
   */
  gap?: number;
}

/**
 * AdvancedCellRenderer - Composite elements with conditional styling
 *
 * Supports rendering multiple elements in a single cell (icon + text + badge)
 * and applying conditional styles based on cell value or state.
 *
 * @example
 * ```typescript
 * const renderer = new AdvancedCellRenderer({
 *   elements: [
 *     {
 *       type: 'icon',
 *       getValue: (params) => params.rowData?.status === 'active' ? '✓' : '✗',
 *     },
 *     {
 *       type: 'text',
 *       getValue: (params) => params.value,
 *     },
 *     {
 *       type: 'badge',
 *       getValue: (params) => params.rowData?.count,
 *     },
 *   ],
 *   conditions: [
 *     {
 *       condition: (params) => params.value < 0,
 *       className: 'negative-value',
 *     },
 *   ],
 * });
 * ```
 */
export class AdvancedCellRenderer implements CellRenderer {
  private options: AdvancedCellRendererOptions;

  constructor(options: AdvancedCellRendererOptions) {
    this.options = {
      layout: 'horizontal',
      gap: 4,
      ...options,
    };
  }

  render(element: HTMLElement, params: RenderParams): void {
    element.classList.add('zg-cell-advanced');
    element.style.display = 'flex';
    element.style.flexDirection =
      this.options.layout === 'vertical' ? 'column' : 'row';
    element.style.gap = `${this.options.gap}px`;
    element.style.alignItems = 'center';

    // Create elements for each composite part
    for (const config of this.options.elements) {
      const el = this.createCompositeElement(config, params);
      element.appendChild(el);
    }

    // Apply conditional styles
    this.applyConditions(element, params);
  }

  update(element: HTMLElement, params: RenderParams): void {
    const children = Array.from(element.children) as HTMLElement[];

    for (let i = 0; i < this.options.elements.length; i++) {
      const config = this.options.elements[i];
      const el = children[i];
      if (el) {
        this.updateCompositeElement(el, config, params);
      }
    }

    // Reapply conditional styles
    this.applyConditions(element, params);
  }

  destroy(element: HTMLElement): void {
    element.innerHTML = '';
    element.classList.remove('zg-cell-advanced');
    element.style.cssText = 'position: absolute;';
  }

  private createCompositeElement(
    config: CompositeElement,
    params: RenderParams
  ): HTMLElement {
    const el = document.createElement('span');
    el.className = `zg-cell-advanced__${config.type}`;
    if (config.className) {
      el.classList.add(config.className);
    }

    this.updateCompositeElement(el, config, params);
    return el;
  }

  private updateCompositeElement(
    el: HTMLElement,
    config: CompositeElement,
    params: RenderParams
  ): void {
    const value = config.getValue(params);

    switch (config.type) {
      case 'icon':
        el.innerHTML = value || '';
        break;
      case 'text':
        el.textContent = value ?? '';
        break;
      case 'badge':
        el.textContent = value ?? '';
        if (!el.classList.contains('zg-badge')) {
          el.classList.add('zg-badge');
        }
        break;
      case 'custom':
        if (config.renderer) {
          const customParams = { ...params, value };
          config.renderer.render(el, customParams);
        }
        break;
    }
  }

  private applyConditions(element: HTMLElement, params: RenderParams): void {
    if (!this.options.conditions) return;

    for (const condition of this.options.conditions) {
      const matches = condition.condition(params);

      if (condition.className) {
        element.classList.toggle(condition.className, matches);
      }

      if (condition.style) {
        if (matches) {
          Object.assign(element.style, condition.style);
        }
        // Note: We don't remove styles when condition becomes false
        // to avoid complex state tracking
      }
    }
  }
}
