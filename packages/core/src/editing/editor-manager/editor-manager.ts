import type { CellEditor, EditorParams } from '../cell-editor.interface';
import type { CellRef, InvalidEditMode } from '../../types';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';
import { TextEditor } from '../text';
import { NumberEditor } from '../number';
import { SelectEditor } from '../select';
import { DateEditor } from '../datetime';
import { CheckboxEditor } from '../checkbox';

/**
 * Editor manager options
 */
export interface EditorManagerOptions {
  /**
   * Container element for editors
   */
  container: HTMLElement;

  /**
   * Scroll container element for viewport visibility checks
   */
  scrollContainer?: HTMLElement;

  /**
   * Header height in pixels (default: 40)
   */
  headerHeight?: number;

  /**
   * Event emitter for grid events
   */
  events?: EventEmitter<GridEvents>;

  /**
   * Callback to get cell value
   */
  getValue: (row: number, col: number) => any;

  /**
   * Callback to set cell value
   */
  setValue: (row: number, col: number, value: any) => void;

  /**
   * Callback to get column definition
   */
  getColumn?: (col: number) => any;

  /**
   * Callback to get row data
   */
  getRowData?: (row: number) => any;

  /**
   * Callback to get cell element
   */
  getCellElement: (row: number, col: number) => HTMLElement | null;

  /**
   * Callback when editing starts
   */
  onEditStart?: (cell: CellRef) => void;

  /**
   * Callback when editing ends
   */
  onEditEnd?: (cell: CellRef, cancelled: boolean) => void;

  /**
   * Callback when an edit is committed with a changed value
   */
  onCommit?: (cell: CellRef, oldValue: any, newValue: any) => void;

  /**
   * Behavior when an edit fails validation (default: 'block')
   */
  invalidEditMode?: InvalidEditMode;
}

/**
 * EditorManager - Manages cell editing lifecycle
 *
 * Coordinates the editing process:
 * - Creates and destroys editor instances
 * - Handles edit start/end events
 * - Validates and commits changes
 * - Manages keyboard shortcuts (Enter, Escape)
 *
 * @example
 * ```typescript
 * const editorManager = new EditorManager({
 *   container: gridElement,
 *   getValue: (row, col) => data[row][col],
 *   setValue: (row, col, value) => { data[row][col] = value; },
 *   getCellElement: (row, col) => document.getElementById(`cell-${row}-${col}`),
 * });
 *
 * // Start editing
 * editorManager.startEdit({ row: 0, col: 0 });
 *
 * // Cancel editing
 * editorManager.cancelEdit();
 * ```
 */
export class EditorManager {
  private container: HTMLElement;
  private scrollContainer?: HTMLElement;
  private headerHeight: number;
  private events?: EventEmitter<GridEvents>;
  private getValue: (row: number, col: number) => any;
  private setValue: (row: number, col: number, value: any) => void;
  private getColumn?: (col: number) => any;
  private getRowData?: (row: number) => any;
  private getCellElement: (row: number, col: number) => HTMLElement | null;
  private onEditStart?: (cell: CellRef) => void;
  private onEditEnd?: (cell: CellRef, cancelled: boolean) => void;
  private onCommit?: (cell: CellRef, oldValue: any, newValue: any) => void;
  private invalidEditMode: InvalidEditMode;

  private currentEditor: CellEditor | null = null;
  private editingCell: CellRef | null = null;
  private originalValue: any = null;
  private editorContainer: HTMLElement | null = null;
  private boundHandleEditorKeyDown: (event: KeyboardEvent) => void;
  private boundHandleClickOutside: (event: MouseEvent) => void;
  private positionRafId: number | null = null;

  /** Registry of popup elements that should not trigger click-outside close */
  private editorPopups: Set<HTMLElement> = new Set();

  private editors: Map<string, new () => CellEditor> = new Map();

  constructor(options: EditorManagerOptions) {
    this.container = options.container;
    this.scrollContainer = options.scrollContainer;
    this.headerHeight = options.headerHeight ?? 40;
    this.events = options.events;
    this.getValue = options.getValue;
    this.setValue = options.setValue;
    this.getColumn = options.getColumn;
    this.getRowData = options.getRowData;
    this.getCellElement = options.getCellElement;
    this.onEditStart = options.onEditStart;
    this.onEditEnd = options.onEditEnd;
    this.onCommit = options.onCommit;
    this.invalidEditMode = options.invalidEditMode ?? 'block';
    this.boundHandleEditorKeyDown = this.handleEditorKeyDown.bind(this);
    this.boundHandleClickOutside = this.handleClickOutside.bind(this);

    // Register default editors
    this.registerEditor('text', TextEditor);
    this.registerEditor('number', NumberEditor);
    this.registerEditor('select', SelectEditor);
    this.registerEditor('date', DateEditor);
    this.registerEditor('checkbox', CheckboxEditor);
    // Note: DropdownEditor requires options array and should be registered
    // manually with: editorManager.registerEditor('dropdown', DropdownEditor)
  }

  /**
   * Register a custom editor
   * @param type - Editor type name
   * @param editorClass - Editor class constructor
   */
  registerEditor(type: string, editorClass: new () => CellEditor): void {
    this.editors.set(type, editorClass);
  }

  /**
   * Start editing a cell
   * @param cell - Cell to edit
   * @param initialValue - Optional initial value (for typing to start edit)
   */
  startEdit(cell: CellRef, initialValue?: any): void {
    // Already editing this cell
    if (
      this.editingCell &&
      this.editingCell.row === cell.row &&
      this.editingCell.col === cell.col
    ) {
      return;
    }

    // Cancel any existing edit
    if (this.editingCell) {
      this.cancelEdit();
    }

    // Get column definition
    const column = this.getColumn?.(cell.col);

    // Check if editable
    if (column?.editable === false) {
      return;
    }

    // Get cell element
    const cellElement = this.getCellElement(cell.row, cell.col);
    if (!cellElement) return;

    // Get current value
    const currentValue = this.getValue(cell.row, cell.col);
    this.originalValue = currentValue;
    this.editingCell = cell;

    // Create editor container with correct positioning
    this.editorContainer = document.createElement('div');
    this.editorContainer.className = 'zg-editor-container';

    this.editorContainer.style.cssText = `
      position: absolute;
      z-index: 10002;
      overflow: visible;
    `;
    this.positionEditorContainer(cellElement);

    // Determine editor - supports both instance and string type
    if (
      column?.editor &&
      typeof column.editor === 'object' &&
      typeof column.editor.init === 'function'
    ) {
      // Editor is already an instance - use it directly
      this.currentEditor = column.editor;
    } else {
      // Editor is a string type name - look up in registry
      const editorType = (column?.editor as string) || this.getDefaultEditor(currentValue);
      const EditorClass = this.editors.get(editorType);

      if (!EditorClass) {
        console.warn(`Editor type "${editorType}" not found, using text editor`);
        this.currentEditor = new TextEditor();
      } else {
        this.currentEditor = new EditorClass();
      }
    }

    // Initialize editor
    const params: EditorParams = {
      cell,
      column,
      rowData: this.getRowData?.(cell.row),
      onComplete: (_value: any, cancelled: boolean) => {
        if (cancelled) {
          this.cancelEdit();
        } else {
          this.commitEdit();
        }
      },
      onChange: (_value: any) => {
        // Optional: emit change event
      },
      options: column?.editorOptions || {},
      registerPopup: this.registerEditorPopup.bind(this),
      unregisterPopup: this.unregisterEditorPopup.bind(this),
      scrollContainer: this.scrollContainer,
    };

    const valueToEdit = initialValue !== undefined ? initialValue : currentValue;

    if (!this.editorContainer || !this.currentEditor) {
      console.error('Editor container or editor is null');
      return;
    }

    this.currentEditor.init(this.editorContainer, valueToEdit, params);

    // Add to DOM
    this.container.appendChild(this.editorContainer);

    // Setup keyboard handlers
    this.setupKeyboardHandlers();

    // Setup click outside handler
    this.setupClickOutsideHandler();

    // Emit events
    if (this.events) {
      this.events.emit('edit:start', {
        cell,
        value: currentValue,
      });
    }

    if (this.onEditStart) {
      this.onEditStart(cell);
    }
  }

  /**
   * Commit the current edit
   */
  commitEdit(): void {
    if (!this.currentEditor || !this.editingCell) return;

    // Validate
    const validation = this.currentEditor.isValid?.();
    const isValid =
      validation === undefined ||
      validation === true ||
      (typeof validation === 'object' && validation.valid);

    if (!isValid && this.invalidEditMode !== 'commit') {
      const message =
        (typeof validation === 'object' && validation.message) || 'Invalid value';

      if (this.invalidEditMode === 'revert') {
        // Discard the invalid input and restore the original value so focus can
        // move on. cancelEdit() emits cancel/end and cleans up.
        this.cancelEdit();
      } else {
        // 'block': keep the editor open and flag it invalid (never blocks with a
        // native alert(), which spammed on every blur and trapped the user).
        // Escape cancels; fixing the value lets the commit through.
        this.markInvalid(message);
      }
      return;
    }

    // Get new value
    const newValue = this.currentEditor.getValue();
    const cell = this.editingCell;

    const oldValue = this.originalValue;

    // Set value
    this.setValue(cell.row, cell.col, newValue);

    // 'commit' mode: the value failed validation but the caller opted to accept
    // it. Tag the cell (after the re-render from setValue) so the error stays
    // visible after the editor closes.
    if (!isValid) {
      this.flagInvalidCell(cell);
    }

    // Record the change for undo/redo (only when the value actually changed)
    if (this.onCommit && oldValue !== newValue) {
      this.onCommit(cell, oldValue, newValue);
    }

    // Emit events
    if (this.events) {
      this.events.emit('edit:commit', {
        cell,
        oldValue: this.originalValue,
        newValue,
      });

      this.events.emit('edit:end', {
        cell,
        value: newValue,
        cancelled: false,
      });
    }

    if (this.onEditEnd) {
      this.onEditEnd(cell, false);
    }

    // Cleanup
    this.endEdit();
  }

  /**
   * Cancel the current edit
   */
  cancelEdit(): void {
    if (!this.editingCell) return;

    const cell = this.editingCell;

    // Emit events
    if (this.events) {
      this.events.emit('edit:cancel', {
        cell,
        value: this.originalValue,
      });

      this.events.emit('edit:end', {
        cell,
        value: this.originalValue,
        cancelled: true,
      });
    }

    if (this.onEditEnd) {
      this.onEditEnd(cell, true);
    }

    // Cleanup
    this.endEdit();
  }

  /**
   * End editing and cleanup
   */
  private endEdit(): void {
    if (this.positionRafId !== null) {
      cancelAnimationFrame(this.positionRafId);
      this.positionRafId = null;
    }

    // Destroy editor
    if (this.currentEditor) {
      this.currentEditor.destroy();
      this.currentEditor = null;
    }

    // Remove container
    if (this.editorContainer) {
      this.editorContainer.remove();
      this.editorContainer = null;
    }

    // Cleanup handlers
    this.cleanupKeyboardHandlers();
    this.cleanupClickOutsideHandler();

    // Reset state
    this.editingCell = null;
    this.originalValue = null;
    this.editorPopups.clear();
  }

  /**
   * Flag the current editor as invalid without blocking the UI.
   * Highlights the input in red and shows a visible inline message below it
   * (plus a tooltip); the editor stays open so the user can fix the value or
   * press Escape.
   */
  private markInvalid(message: string): void {
    if (!this.editorContainer) return;
    const field = this.editorContainer.querySelector(
      'input, select, textarea'
    ) as HTMLElement | null;
    if (field) {
      field.style.borderColor = '#d32f2f';
      field.title = message;
    }

    let hint = this.editorContainer.querySelector(
      '.zg-editor-error'
    ) as HTMLElement | null;
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'zg-editor-error';
      this.editorContainer.appendChild(hint);
    }
    hint.textContent = message;
  }

  /**
   * Mark a committed cell as holding an invalid value (used by 'commit' mode).
   * Adds `.zg-cell-invalid` so the error stays visible after the editor closes.
   */
  private flagInvalidCell(cell: CellRef): void {
    const cellElement = this.getCellElement(cell.row, cell.col);
    cellElement?.classList.add('zg-cell-invalid');
  }

  /**
   * Get currently editing cell
   */
  getEditingCell(): CellRef | null {
    return this.editingCell ? { ...this.editingCell } : null;
  }

  /**
   * Check if currently editing
   */
  isEditing(): boolean {
    return this.editingCell !== null;
  }

  /**
   * Update editor position to follow the edited cell (used during scroll)
   */
  updateEditorPosition(): void {
    if (!this.editingCell || !this.editorContainer) return;
    if (this.positionRafId !== null) return;

    this.positionRafId = requestAnimationFrame(() => {
      this.positionRafId = null;

      if (!this.editingCell || !this.editorContainer) return;
      const cellElement = this.getCellElement(this.editingCell.row, this.editingCell.col);
      if (!cellElement) {
        this.cancelEdit();
        return;
      }

      // Check if cell is still within visible viewport
      if (!this.isCellInVisibleViewport(cellElement)) {
        this.cancelEdit();
        return;
      }

      this.positionEditorContainer(cellElement);
    });
  }

  /**
   * Check if the cell is within the visible viewport area
   * Close only when the cell is completely out of view (not partially visible)
   */
  private isCellInVisibleViewport(cellElement: HTMLElement): boolean {
    if (!this.scrollContainer) return true;

    const cellRect = cellElement.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    const scrollRect = this.scrollContainer.getBoundingClientRect();

    // Cell is completely above the container (including header area)
    const isAboveContainer = cellRect.bottom < containerRect.top;
    // Cell is completely below the scroll viewport
    const isBelowViewport = cellRect.top > scrollRect.bottom;

    return !isAboveContainer && !isBelowViewport;
  }

  private positionEditorContainer(cellElement: HTMLElement): void {
    if (!this.editorContainer) return;

    const cellRect = cellElement.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    let top = cellRect.top - containerRect.top;
    const left = cellRect.left - containerRect.left;

    // Clamp top to not overlap with header
    if (top < this.headerHeight) {
      top = this.headerHeight;
    }

    this.editorContainer.style.top = `${top}px`;
    this.editorContainer.style.left = `${left}px`;
    this.editorContainer.style.width = `${cellRect.width}px`;
    this.editorContainer.style.height = `${cellRect.height}px`;
  }

  /**
   * Setup keyboard event handlers
   */
  private setupKeyboardHandlers(): void {
    this.editorContainer?.addEventListener('keydown', this.boundHandleEditorKeyDown);
  }

  /**
   * Cleanup keyboard event handlers
   */
  private cleanupKeyboardHandlers(): void {
    this.editorContainer?.removeEventListener('keydown', this.boundHandleEditorKeyDown);
  }

  /**
   * Setup click outside handler to close editor
   */
  private setupClickOutsideHandler(): void {
    // Delay to avoid closing immediately from the click that opened it
    setTimeout(() => {
      document.addEventListener('mousedown', this.boundHandleClickOutside);
    }, 100);
  }

  /**
   * Cleanup click outside handler
   */
  private cleanupClickOutsideHandler(): void {
    document.removeEventListener('mousedown', this.boundHandleClickOutside);
  }

  /**
   * Handle click outside editor container
   */
  private handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Check if click is inside editor container
    if (this.editorContainer?.contains(target)) {
      return;
    }

    // Check if click is inside any registered popup (e.g., calendar)
    for (const popup of this.editorPopups) {
      if (popup.contains(target)) {
        return;
      }
    }

    // Fallback: Check for known calendar classes (handles edge cases)
    if (
      target.closest('.vanilla-calendar-wrapper') ||
      target.closest('.date-range-calendar-wrapper') ||
      target.closest('.vanilla-calendar')
    ) {
      return;
    }

    // Click is truly outside - commit the edit
    this.commitEdit();
  }

  /**
   * Register a popup element (e.g., calendar) that belongs to the current editor.
   * Clicks on registered popups will not trigger click-outside close.
   */
  public registerEditorPopup(element: HTMLElement): void {
    this.editorPopups.add(element);
  }

  /**
   * Unregister a popup element.
   */
  public unregisterEditorPopup(element: HTMLElement): void {
    this.editorPopups.delete(element);
  }

  /**
   * Handle keyboard events during editing
   */
  private handleEditorKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
        if (!event.shiftKey) {
          event.preventDefault();
          this.commitEdit();
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.cancelEdit();
        break;

      case 'Tab':
        event.preventDefault();
        this.commitEdit();
        // TODO: Move to next editable cell
        break;
    }
  }

  /**
   * Get default editor type based on value
   */
  private getDefaultEditor(value: any): string {
    if (typeof value === 'number') return 'number';
    if (value instanceof Date) return 'date';
    return 'text';
  }

  /**
   * Destroy editor manager
   */
  destroy(): void {
    if (this.isEditing()) {
      this.cancelEdit();
    }

    this.editors.clear();
  }
}
