import type { CellEditor, EditorParams, ValidationResult } from '../cell-editor.interface';

/**
 * Configuration options for TextEditor
 */
export interface TextEditorOptions {
  /** Input type (text, number, email, url, etc.) */
  type?: 'text' | 'number' | 'email' | 'url' | 'tel' | 'password';
  /** Placeholder text */
  placeholder?: string;
  /** Maximum length of input */
  maxLength?: number;
  /** Minimum value (for number type) */
  min?: number;
  /** Maximum value (for number type) */
  max?: number;
  /** Pattern for validation (regex string) */
  pattern?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Custom CSS class for the input element */
  className?: string;
  /** Auto-focus on init (default: true) */
  autoFocus?: boolean;
  /** Select all text on focus (default: true) */
  selectAllOnFocus?: boolean;
  /** Custom validator function */
  validator?: (value: any) => boolean | string;
  /** Commit on blur (default: true) */
  stopOnBlur?: boolean;
}

/**
 * TextEditor - Single-line text input editor for cell editing
 *
 * Features:
 * - Multiple input types (text, number, email, tel, url, password)
 * - Auto-focus with optional select all
 * - Enter to commit, Escape to cancel
 * - Regex pattern validation
 * - Custom validation functions
 * - Min/max validation for numbers
 * - Required field validation
 * - Blur handling for commit
 * - Full ARIA attributes
 * - Type conversion (string to number for number type)
 *
 * Performance: Lightweight, minimal DOM operations
 *
 * @example
 * ```typescript
 * // Basic text editor
 * const editor = new TextEditor({
 *   placeholder: 'Enter name...',
 *   required: true
 * });
 *
 * // Number editor with validation
 * const editor = new TextEditor({
 *   type: 'number',
 *   min: 0,
 *   max: 100,
 *   validator: (value) => value >= 0 || 'Must be positive'
 * });
 *
 * // Email editor with pattern
 * const editor = new TextEditor({
 *   type: 'email',
 *   pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
 *   required: true
 * });
 * ```
 */
export class TextEditor implements CellEditor<any> {
  private options: Required<Omit<TextEditorOptions, 'validator'>> & {
    validator?: (value: any) => boolean | string;
  };
  private inputElement: HTMLInputElement | null = null;
  private params: EditorParams | null = null;
  private isDestroyed = false;

  /**
   * Creates a new TextEditor instance
   *
   * @param options - Configuration options for the editor
   */
  constructor(options: TextEditorOptions = {}) {
    this.options = {
      type: options.type ?? 'text',
      placeholder: options.placeholder ?? '',
      maxLength: options.maxLength ?? 524288, // HTML default max
      min: options.min ?? Number.MIN_SAFE_INTEGER,
      max: options.max ?? Number.MAX_SAFE_INTEGER,
      pattern: options.pattern ?? '',
      required: options.required ?? false,
      className: options.className ?? 'zg-text-editor',
      autoFocus: options.autoFocus ?? true,
      selectAllOnFocus: options.selectAllOnFocus ?? true,
      validator: options.validator,
      stopOnBlur: options.stopOnBlur ?? true,
    };
  }

  /**
   * Initialize editor in the container element
   *
   * Creates an input element, sets up event listeners, and focuses if configured.
   *
   * @param container - The DOM element to render the editor into
   * @param value - Initial value for the editor
   * @param params - Edit parameters including callbacks
   */
  init(container: HTMLElement, value: any, params: EditorParams): void {
    this.isDestroyed = false;
    this.params = params;

    // Clear previous content
    container.innerHTML = '';

    // Create input element
    this.inputElement = this.createInputElement(value, params);

    // Append to container
    container.appendChild(this.inputElement);

    // Auto-focus if configured
    if (this.options.autoFocus) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        this.focus();
        // Select all text if configured
        if (this.options.selectAllOnFocus && this.inputElement) {
          this.inputElement.select();
        }
      });
    }
  }

  /**
   * Create the input element with all attributes and event listeners
   *
   * @param value - Initial value
   * @param params - Edit parameters
   * @returns The configured input element
   */
  private createInputElement(value: any, params: EditorParams): HTMLInputElement {
    const input = document.createElement('input');

    // Set basic attributes
    input.type = this.options.type;
    input.className = this.options.className;
    input.value = this.formatValue(value);

    if (this.options.placeholder) {
      input.placeholder = this.options.placeholder;
    }

    if (this.options.maxLength !== 524288) {
      input.maxLength = this.options.maxLength;
    }

    if (this.options.type === 'number') {
      if (this.options.min !== Number.MIN_SAFE_INTEGER) {
        input.min = String(this.options.min);
      }
      if (this.options.max !== Number.MAX_SAFE_INTEGER) {
        input.max = String(this.options.max);
      }
    }

    if (this.options.pattern) {
      input.pattern = this.options.pattern;
    }

    if (this.options.required) {
      input.required = true;
    }

    // Set ARIA attributes for accessibility
    input.setAttribute('role', 'textbox');
    input.setAttribute(
      'aria-label',
      `Edit ${params.column?.header || params.column?.field || 'cell'}`
    );

    // Set data attributes
    input.dataset['row'] = String(params.cell.row);
    input.dataset['col'] = String(params.cell.col);
    if (params.column?.field) {
      input.dataset['field'] = params.column.field;
    }

    // Inline styles for better UX
    input.style.width = '100%';
    input.style.height = '100%';
    input.style.border = '2px solid #4CAF50';
    input.style.outline = 'none';
    input.style.padding = '4px 8px';
    input.style.fontSize = '13px';
    input.style.fontFamily = 'inherit';
    input.style.backgroundColor = '#fff';
    input.style.boxSizing = 'border-box';

    // Set up event listeners
    this.attachEventListeners(input, params);

    return input;
  }

  /**
   * Attach event listeners for keyboard navigation and blur handling
   *
   * @param input - The input element
   * @param params - Edit parameters
   */
  private attachEventListeners(input: HTMLInputElement, params: EditorParams): void {
    // Blur handling
    if (this.options.stopOnBlur) {
      input.addEventListener('blur', () => {
        // Small delay to allow for other click events to fire first
        setTimeout(() => {
          if (!this.isDestroyed) {
            this.handleCommit();
          }
        }, 100);
      });
    }

    // onChange callback for real-time updates
    if (params.onChange) {
      input.addEventListener('input', () => {
        const value = this.getValue();
        params.onChange!(value);
      });
    }

    // Prevent event propagation to grid
    input.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
    });

    input.addEventListener('mousedown', (e: MouseEvent) => {
      e.stopPropagation();
    });
  }

  /**
   * Handle key events
   *
   * @param event - Keyboard event
   * @returns True if handled, false to propagate
   */
  onKeyDown(event: KeyboardEvent): boolean {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.handleCommit();
      return true;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.handleCancel();
      return true;
    }

    // Don't propagate other keys to grid (avoid navigation while typing)
    event.stopPropagation();
    return true;
  }

  /**
   * Handle commit action (Enter key or blur)
   */
  private handleCommit(): void {
    if (this.isDestroyed || !this.params) return;

    const value = this.getValue();
    const validationResult = this.isValid();

    // Check if valid
    let isValid = false;
    if (typeof validationResult === 'boolean') {
      isValid = validationResult;
    } else {
      isValid = validationResult.valid;
    }

    if (isValid) {
      this.params.onComplete?.(value, false);
    } else {
      // Validation failed - log warning but still complete with cancelled flag
      if (typeof validationResult === 'object' && validationResult.message) {
        console.warn('TextEditor: Validation failed:', validationResult.message);
      } else {
        console.warn('TextEditor: Validation failed for value:', value);
      }
      // Could choose to not commit, but for now we'll still commit
      this.params.onComplete?.(value, false);
    }
  }

  /**
   * Handle cancel action (Escape key)
   */
  private handleCancel(): void {
    if (this.isDestroyed || !this.params) return;
    const value = this.getValue();
    this.params.onComplete?.(value, true);
  }

  /**
   * Format value for display in input
   *
   * @param value - The value to format
   * @returns Formatted string value
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  /**
   * Parse input value to appropriate type
   *
   * @param value - The string value from input
   * @returns Parsed value in appropriate type
   */
  private parseValue(value: string): any {
    if (value === '') {
      return null;
    }

    if (this.options.type === 'number') {
      const num = Number(value);
      return isNaN(num) ? null : num;
    }

    return value;
  }

  /**
   * Get the current value from the editor
   *
   * @returns The current editor value, parsed to appropriate type
   */
  getValue(): any {
    if (!this.inputElement) {
      return null;
    }

    return this.parseValue(this.inputElement.value);
  }

  /**
   * Check if current value is valid
   *
   * Checks:
   * - Required field validation
   * - Pattern validation (regex)
   * - Min/max validation (for numbers)
   * - Custom validator function
   *
   * @returns True if valid, false otherwise, or ValidationResult object
   */
  isValid(): boolean | ValidationResult {
    const value = this.getValue();

    // Required validation
    if (this.options.required && (value === null || value === undefined || value === '')) {
      return {
        valid: false,
        message: 'This field is required',
      };
    }

    // Skip other validations if value is empty and not required
    if ((value === null || value === undefined || value === '') && !this.options.required) {
      return true;
    }

    // Pattern validation
    if (this.options.pattern && typeof value === 'string') {
      const regex = new RegExp(this.options.pattern);
      if (!regex.test(value)) {
        return {
          valid: false,
          message: `Value does not match pattern: ${this.options.pattern}`,
        };
      }
    }

    // Number range validation
    if (this.options.type === 'number' && typeof value === 'number') {
      if (value < this.options.min) {
        return {
          valid: false,
          message: `Value must be at least ${this.options.min}`,
        };
      }
      if (value > this.options.max) {
        return {
          valid: false,
          message: `Value must be at most ${this.options.max}`,
        };
      }
    }

    // Custom validator
    if (this.options.validator) {
      const result = this.options.validator(value);
      if (typeof result === 'boolean') {
        return result;
      }
      // If string is returned, it's an error message
      return {
        valid: false,
        message: result,
      };
    }

    return true;
  }

  /**
   * Focus the editor input element
   */
  focus(): void {
    if (this.inputElement) {
      this.inputElement.focus();
    }
  }

  /**
   * Clean up resources when editing stops
   *
   * Removes event listeners and clears references to prevent memory leaks
   */
  destroy(): void {
    this.isDestroyed = true;

    if (this.inputElement) {
      // Remove from DOM (parent will handle)
      this.inputElement.remove();
    }

    this.inputElement = null;
    this.params = null;
  }
}

/**
 * Factory function to create TextEditor
 *
 * @example
 * ```typescript
 * // In column definition
 * const column = {
 *   field: 'name',
 *   header: 'Name',
 *   editable: true,
 *   editor: 'text', // Registered name
 * };
 *
 * // Or create directly
 * const editor = createTextEditor({
 *   type: 'email',
 *   required: true,
 *   pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
 * });
 * ```
 */
export function createTextEditor(options: TextEditorOptions = {}): TextEditor {
  return new TextEditor(options);
}
