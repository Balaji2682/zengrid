import type { CellRef } from '../types';

/**
 * Cell editor interface
 *
 * Defines the contract for all cell editors.
 * Editors handle the lifecycle of editing a cell value.
 */
export interface CellEditor<T = any> {
  /**
   * Initialize the editor
   * @param container - Container element for the editor
   * @param value - Initial value
   * @param params - Edit parameters
   */
  init(container: HTMLElement, value: T, params: EditorParams): void;

  /**
   * Get the current value from the editor
   * @returns Current editor value
   */
  getValue(): T;

  /**
   * Set focus on the editor input
   */
  focus(): void;

  /**
   * Destroy the editor and cleanup
   */
  destroy(): void;

  /**
   * Check if current value is valid
   * @returns Validation result
   */
  isValid?(): boolean | ValidationResult;

  /**
   * Handle key events (optional)
   * @param event - Keyboard event
   * @returns True if handled, false to propagate
   */
  onKeyDown?(event: KeyboardEvent): boolean;
}

/**
 * Parameters passed to editor initialization
 */
export interface EditorParams {
  /**
   * Cell being edited
   */
  cell: CellRef;

  /**
   * Column definition
   */
  column?: any;

  /**
   * Row data
   */
  rowData?: any;

  /**
   * Callback when editing is complete
   */
  onComplete?: (value: any, cancelled: boolean) => void;

  /**
   * Callback when value changes
   */
  onChange?: (value: any) => void;

  /**
   * Custom editor options
   */
  options?: Record<string, any>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /**
   * Whether value is valid
   */
  valid: boolean;

  /**
   * Error message if invalid
   */
  message?: string;
}

/**
 * Editor factory function type
 */
export type EditorFactory<T = any> = (params: EditorParams) => CellEditor<T>;
