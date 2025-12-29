import type { CellEditor, EditorParams } from './cell-editor.interface';

/**
 * Text editor options
 */
export interface TextEditorOptions {
  /**
   * Maximum length
   */
  maxLength?: number;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Input type
   * @default 'text'
   */
  type?: 'text' | 'email' | 'url' | 'tel';

  /**
   * Auto-select text on focus
   * @default true
   */
  autoSelect?: boolean;

  /**
   * Validation pattern (regex)
   */
  pattern?: RegExp;

  /**
   * Custom validator function
   */
  validator?: (value: string) => boolean | { valid: boolean; message?: string };
}

/**
 * TextEditor - Basic text input editor
 *
 * Provides a simple text input for editing cell values.
 * Supports validation, max length, and auto-selection.
 *
 * @example
 * ```typescript
 * const editor = new TextEditor();
 * editor.init(container, 'Hello', {
 *   cell: { row: 0, col: 0 },
 *   options: {
 *     maxLength: 100,
 *     placeholder: 'Enter text...',
 *   },
 * });
 * ```
 */
export class TextEditor implements CellEditor<string> {
  private input: HTMLInputElement | null = null;
  private options: TextEditorOptions = {};
  private boundHandleKeyDown: (event: KeyboardEvent) => void;

  constructor() {
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
  }

  init(container: HTMLElement, value: string, params: EditorParams): void{
    this.options = params.options as TextEditorOptions || {};

    // Create input element
    this.input = document.createElement('input');
    this.input.type = this.options.type || 'text';
    this.input.className = 'zg-editor zg-text-editor';
    this.input.value = value ?? '';

    // Apply options
    if (this.options.maxLength) {
      this.input.maxLength = this.options.maxLength;
    }

    if (this.options.placeholder) {
      this.input.placeholder = this.options.placeholder;
    }

    if (this.options.pattern) {
      this.input.pattern = this.options.pattern.source;
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
      this.input.addEventListener('input', () => {
        params.onChange!(this.getValue());
      });
    }

    // Add to container
    container.appendChild(this.input);

    // Focus and select
    requestAnimationFrame(() => {
      this.focus();
      if (this.options.autoSelect !== false) {
        this.input?.select();
      }
    });
  }

  getValue(): string {
    return this.input?.value ?? '';
  }

  focus(): void {
    this.input?.focus();
  }

  isValid(): boolean | { valid: boolean; message?: string } {
    const value = this.getValue();

    // Custom validator
    if (this.options.validator) {
      return this.options.validator(value);
    }

    // Pattern validation
    if (this.options.pattern) {
      const valid = this.options.pattern.test(value);
      return {
        valid,
        message: valid ? undefined : `Value must match pattern: ${this.options.pattern.source}`,
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
  };
}
