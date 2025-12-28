import type { CellRenderer, RenderParams } from './renderer.interface';

/**
 * TextRenderer - Default renderer for text content
 *
 * Displays cell values as plain text with automatic string coercion.
 * Handles null/undefined values by displaying empty string.
 *
 * @example
 * ```typescript
 * const renderer = new TextRenderer();
 * renderer.render(element, { value: 'Hello', ...otherParams });
 * ```
 */
export class TextRenderer implements CellRenderer {
  render(element: HTMLElement, params: RenderParams): void {
    element.textContent = this.formatValue(params.value);
    element.classList.add('zg-cell-text');
  }

  update(element: HTMLElement, params: RenderParams): void {
    element.textContent = this.formatValue(params.value);
  }

  destroy(element: HTMLElement): void {
    element.textContent = '';
    element.classList.remove('zg-cell-text');
  }

  private formatValue(value: any): string {
    if (value == null) return '';
    return String(value);
  }
}
