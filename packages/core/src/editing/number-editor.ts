import type { CellEditor, EditorParams } from './cell-editor.interface';

/**
 * Number editor options
 */
export interface NumberEditorOptions {
  /**
   * Minimum value
   */
  min?: number;

  /**
   * Maximum value
   */
  max?: number;

  /**
   * Step increment
   * @default 1
   */
  step?: number;

  /**
   * Number of decimal places
   */
  precision?: number;

  /**
   * Allow negative numbers
   * @default true
   */
  allowNegative?: boolean;

  /**
   * Placeholder text
   */
  placeholder?: string;
}

/**
 * NumberEditor - Numeric input editor
 *
 * Provides a number input with validation and formatting.
 * Supports min/max, step, precision, and negative numbers.
 *
 * @example
 * ```typescript
 * const editor = new NumberEditor();
 * editor.init(container, 42, {
 *   cell: { row: 0, col: 0 },
 *   options: {
 *     min: 0,
 *     max: 100,
 *     step: 0.1,
 *     precision: 2,
 *   },
 * });
 * ```
 */
export class NumberEditor implements CellEditor<number> {
  private input: HTMLInputElement | null = null;
  private options: NumberEditorOptions = {};
  private boundHandleKeyDown: (event: KeyboardEvent) => void;

  constructor() {
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
  }

  init(container: HTMLElement, value: number, params: EditorParams): void {
    this.options = params.options as NumberEditorOptions || {};

    // Create input element
    this.input = document.createElement('input');
    this.input.type = 'number';
    this.input.className = 'zg-editor zg-number-editor';
    this.input.value = value != null ? String(value) : '';

    // Apply options
    if (this.options.min !== undefined) {
      this.input.min = String(this.options.min);
    }

    if (this.options.max !== undefined) {
      this.input.max = String(this.options.max);
    }

    if (this.options.step !== undefined) {
      this.input.step = String(this.options.step);
    }

    if (this.options.placeholder) {
      this.input.placeholder = this.options.placeholder;
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
      text-align: right;
    `;

    // Event handlers
    this.input.addEventListener('keydown', this.boundHandleKeyDown);

    if (params.onChange) {
      this.input.addEventListener('input', () => {
        const numValue = this.getValue();
        if (!isNaN(numValue)) {
          params.onChange!(numValue);
        }
      });
    }

    // Add to container
    container.appendChild(this.input);

    // Focus and select
    requestAnimationFrame(() => {
      this.focus();
      this.input?.select();
    });
  }

  getValue(): number {
    const value = this.input?.value ?? '';
    if (value === '') return NaN;

    let num = parseFloat(value);

    // Apply precision
    if (this.options.precision !== undefined && !isNaN(num)) {
      num = parseFloat(num.toFixed(this.options.precision));
    }

    return num;
  }

  focus(): void {
    this.input?.focus();
  }

  isValid(): boolean | { valid: boolean; message?: string } {
    const value = this.getValue();

    // Check if valid number
    if (isNaN(value)) {
      return {
        valid: false,
        message: 'Invalid number',
      };
    }

    // Check negative
    if (this.options.allowNegative === false && value < 0) {
      return {
        valid: false,
        message: 'Negative numbers not allowed',
      };
    }

    // Check min
    if (this.options.min !== undefined && value < this.options.min) {
      return {
        valid: false,
        message: `Value must be at least ${this.options.min}`,
      };
    }

    // Check max
    if (this.options.max !== undefined && value > this.options.max) {
      return {
        valid: false,
        message: `Value must be at most ${this.options.max}`,
      };
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

    // Allow arrow up/down to increment/decrement
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.stopPropagation();
      // Let default behavior handle increment/decrement
    }
  };
}
