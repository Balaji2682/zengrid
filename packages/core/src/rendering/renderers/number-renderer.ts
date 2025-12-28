import type { CellRenderer, RenderParams } from './renderer.interface';

/**
 * Options for NumberRenderer
 */
export interface NumberRendererOptions {
  /**
   * Locale for number formatting (e.g., 'en-US', 'de-DE')
   * @default undefined (uses browser default)
   */
  locale?: string;

  /**
   * Minimum fraction digits
   * @default 0
   */
  minimumFractionDigits?: number;

  /**
   * Maximum fraction digits
   * @default 2
   */
  maximumFractionDigits?: number;

  /**
   * Number formatting style
   * @default 'decimal'
   */
  style?: 'decimal' | 'currency' | 'percent';

  /**
   * Currency code (required if style is 'currency')
   */
  currency?: string;

  /**
   * CSS class for negative numbers
   * @default 'zg-cell-negative'
   */
  negativeClass?: string;
}

/**
 * NumberRenderer - Formatted number display
 *
 * Renders numbers with locale-aware formatting using Intl.NumberFormat.
 * Supports decimal, currency, and percentage formats.
 * Applies conditional styling for negative numbers.
 *
 * @example
 * ```typescript
 * const renderer = new NumberRenderer({
 *   minimumFractionDigits: 2,
 *   maximumFractionDigits: 2,
 * });
 * renderer.render(element, { value: 1234.5, ...otherParams });
 * // Displays: "1,234.50"
 * ```
 *
 * @example
 * ```typescript
 * const currencyRenderer = new NumberRenderer({
 *   style: 'currency',
 *   currency: 'USD',
 * });
 * renderer.render(element, { value: 1234.5, ...otherParams });
 * // Displays: "$1,234.50"
 * ```
 */
export class NumberRenderer implements CellRenderer {
  private formatter: Intl.NumberFormat;
  private negativeClass: string;

  constructor(options: NumberRendererOptions = {}) {
    this.formatter = new Intl.NumberFormat(options.locale, {
      minimumFractionDigits: options.minimumFractionDigits ?? 0,
      maximumFractionDigits: options.maximumFractionDigits ?? 2,
      style: options.style ?? 'decimal',
      currency: options.currency,
    });
    this.negativeClass = options.negativeClass ?? 'zg-cell-negative';
  }

  render(element: HTMLElement, params: RenderParams): void {
    element.classList.add('zg-cell-number');
    this.update(element, params);
  }

  update(element: HTMLElement, params: RenderParams): void {
    const value = Number(params.value);

    if (isNaN(value)) {
      element.textContent = '';
      element.classList.remove(this.negativeClass);
    } else {
      element.textContent = this.formatter.format(value);
      element.classList.toggle(this.negativeClass, value < 0);
    }
  }

  destroy(element: HTMLElement): void {
    element.textContent = '';
    element.classList.remove('zg-cell-number', this.negativeClass);
  }
}
