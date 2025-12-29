import type { CellEditor, EditorParams } from './cell-editor.interface';

/**
 * Date editor options
 */
export interface DateEditorOptions {
  /**
   * Minimum date (ISO string or Date)
   */
  min?: string | Date;

  /**
   * Maximum date (ISO string or Date)
   */
  max?: string | Date;

  /**
   * Input type
   * @default 'date'
   */
  type?: 'date' | 'datetime-local' | 'time';

  /**
   * Date format for display
   * @default 'YYYY-MM-DD'
   */
  format?: string;
}

/**
 * DateEditor - Date/time input editor
 *
 * Provides a date picker for editing date values.
 * Supports date, datetime, and time inputs with min/max validation.
 *
 * @example
 * ```typescript
 * const editor = new DateEditor();
 * editor.init(container, new Date(), {
 *   cell: { row: 0, col: 0 },
 *   options: {
 *     type: 'date',
 *     min: '2024-01-01',
 *     max: '2024-12-31',
 *   },
 * });
 * ```
 */
export class DateEditor implements CellEditor<Date | string> {
  private input: HTMLInputElement | null = null;
  private options: DateEditorOptions = {};
  private boundHandleKeyDown: (event: KeyboardEvent) => void;

  constructor() {
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
  }

  init(container: HTMLElement, value: Date | string, params: EditorParams): void {
    this.options = params.options as DateEditorOptions || {};

    // Create input element
    this.input = document.createElement('input');
    this.input.type = this.options.type || 'date';
    this.input.className = 'zg-editor zg-date-editor';

    // Convert value to input format
    if (value) {
      this.input.value = this.toInputValue(value);
    }

    // Apply min/max
    if (this.options.min) {
      this.input.min = this.toInputValue(this.options.min);
    }

    if (this.options.max) {
      this.input.max = this.toInputValue(this.options.max);
    }

    // Styling
    this.input.style.cssText = `
      width: 100%;
      height: 100%;
      border: 2px solid #4caf50;
      padding: 0 8px;
      font-family: inherit;
      font-size: inherit;
      outline: none;
      box-sizing: border-box;
    `;

    // Event handlers
    this.input.addEventListener('keydown', this.boundHandleKeyDown);

    if (params.onChange) {
      this.input.addEventListener('change', () => {
        params.onChange!(this.getValue());
      });
    }

    // Add to container
    container.appendChild(this.input);

    // Focus
    requestAnimationFrame(() => {
      this.focus();
    });
  }

  getValue(): Date | string {
    const value = this.input?.value ?? '';
    if (!value) return '';

    // Return as Date object
    return new Date(value);
  }

  focus(): void {
    this.input?.focus();
  }

  isValid(): boolean | { valid: boolean; message?: string } {
    const value = this.input?.value ?? '';

    if (!value) {
      return true; // Empty is valid
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return {
        valid: false,
        message: 'Invalid date',
      };
    }

    // Check min
    if (this.options.min) {
      const minDate = new Date(this.toInputValue(this.options.min));
      if (date < minDate) {
        return {
          valid: false,
          message: `Date must be after ${this.formatDate(minDate)}`,
        };
      }
    }

    // Check max
    if (this.options.max) {
      const maxDate = new Date(this.toInputValue(this.options.max));
      if (date > maxDate) {
        return {
          valid: false,
          message: `Date must be before ${this.formatDate(maxDate)}`,
        };
      }
    }

    return true;
  }

  destroy(): void {
    if (this.input) {
      this.input.removeEventListener('keydown', this.boundHandleKeyDown);
      this.input.remove();
      this.input = null;
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Stop propagation to prevent grid navigation
    event.stopPropagation();
  }

  /**
   * Convert Date or string to input value format
   */
  private toInputValue(value: Date | string): string {
    if (value instanceof Date) {
      const type = this.options.type || 'date';

      if (type === 'date') {
        return value.toISOString().split('T')[0];
      } else if (type === 'datetime-local') {
        return value.toISOString().slice(0, 16);
      } else if (type === 'time') {
        return value.toISOString().slice(11, 16);
      }
    }

    return String(value);
  }

  /**
   * Format date for display in error messages
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString();
  }
}
