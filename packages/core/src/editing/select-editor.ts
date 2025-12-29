import type { CellEditor, EditorParams } from './cell-editor.interface';

/**
 * Select editor options
 */
export interface SelectEditorOptions {
  /**
   * Available options
   */
  options: Array<{ value: any; label: string }> | string[];

  /**
   * Allow empty selection
   * @default false
   */
  allowEmpty?: boolean;

  /**
   * Placeholder for empty selection
   */
  placeholder?: string;
}

/**
 * SelectEditor - Dropdown selection editor
 *
 * Provides a dropdown select for choosing from predefined options.
 *
 * @example
 * ```typescript
 * const editor = new SelectEditor();
 * editor.init(container, 'active', {
 *   cell: { row: 0, col: 0 },
 *   options: {
 *     options: ['active', 'inactive', 'pending'],
 *     allowEmpty: true,
 *     placeholder: 'Select status...',
 *   },
 * });
 * ```
 */
export class SelectEditor implements CellEditor<any> {
  private select: HTMLSelectElement | null = null;
  private options: SelectEditorOptions | null = null;
  private boundHandleKeyDown: (event: KeyboardEvent) => void;

  constructor() {
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
  }

  init(container: HTMLElement, value: any, params: EditorParams): void {
    this.options = params.options as SelectEditorOptions;

    if (!this.options?.options) {
      throw new Error('SelectEditor requires options array');
    }

    // Create select element
    this.select = document.createElement('select');
    this.select.className = 'zg-editor zg-select-editor';

    // Styling
    this.select.style.cssText = `
      width: 100%;
      height: 100%;
      border: 2px solid #4caf50;
      padding: 0 8px;
      font-family: inherit;
      font-size: inherit;
      outline: none;
      box-sizing: border-box;
      background: white;
    `;

    // Add empty option if allowed
    if (this.options.allowEmpty) {
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = this.options.placeholder || '(Empty)';
      this.select.appendChild(emptyOption);
    }

    // Add options
    const optionsArray = this.options.options;
    for (const option of optionsArray) {
      const optElement = document.createElement('option');

      if (typeof option === 'string') {
        optElement.value = option;
        optElement.textContent = option;
      } else {
        optElement.value = String(option.value);
        optElement.textContent = option.label;
      }

      this.select.appendChild(optElement);
    }

    // Set current value
    this.select.value = value != null ? String(value) : '';

    // Event handlers
    this.select.addEventListener('keydown', this.boundHandleKeyDown);

    if (params.onChange) {
      this.select.addEventListener('change', () => {
        params.onChange!(this.getValue());
      });
    }

    // Add to container
    container.appendChild(this.select);

    // Focus
    requestAnimationFrame(() => {
      this.focus();
    });
  }

  getValue(): any {
    const value = this.select?.value ?? '';

    if (value === '' && this.options?.allowEmpty) {
      return null;
    }

    // Try to match original option type
    const optionsArray = this.options?.options ?? [];
    for (const option of optionsArray) {
      if (typeof option === 'object') {
        if (String(option.value) === value) {
          return option.value;
        }
      }
    }

    return value;
  }

  focus(): void {
    this.select?.focus();
  }

  isValid(): boolean {
    // Select always has valid value (from dropdown)
    return true;
  }

  destroy(): void {
    if (this.select) {
      this.select.removeEventListener('keydown', this.boundHandleKeyDown);
      this.select.remove();
      this.select = null;
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Stop propagation to prevent grid navigation
    event.stopPropagation();
  };
}
