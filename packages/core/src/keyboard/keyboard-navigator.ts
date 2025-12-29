import type { CellRef } from '../types';
import type { FocusManager } from '../a11y/focus-manager';
import type { EventEmitter } from '../events/event-emitter';
import type { GridEvents } from '../events/grid-events';

/**
 * Keyboard navigator options
 */
export interface KeyboardNavigatorOptions {
  /**
   * Grid container element
   */
  container: HTMLElement;

  /**
   * Focus manager instance
   */
  focusManager: FocusManager;

  /**
   * Event emitter for grid events
   */
  events?: EventEmitter<GridEvents>;

  /**
   * Total row count
   */
  rowCount: number;

  /**
   * Total column count
   */
  colCount: number;

  /**
   * Rows per page (for Page Up/Down)
   * @default 20
   */
  pageSize?: number;

  /**
   * Enable selection with Shift+Arrow
   * @default true
   */
  enableSelection?: boolean;

  /**
   * Enable editing with Enter/F2
   * @default true
   */
  enableEditing?: boolean;

  /**
   * Callback to start editing
   */
  onStartEdit?: (cell: CellRef) => void;

  /**
   * Callback to cancel editing
   */
  onCancelEdit?: () => void;

  /**
   * Callback for copy (Ctrl+C)
   */
  onCopy?: () => void;

  /**
   * Callback for cut (Ctrl+X)
   */
  onCut?: () => void;

  /**
   * Callback for paste (Ctrl+V)
   */
  onPaste?: () => void;

  /**
   * Callback for select all (Ctrl+A)
   */
  onSelectAll?: () => void;
}

/**
 * KeyboardNavigator - Handles all keyboard interactions
 *
 * Implements comprehensive keyboard navigation:
 * - Arrow keys: Cell navigation
 * - Page Up/Down: Page navigation
 * - Home/End: Row navigation
 * - Ctrl+Home/End: Grid navigation
 * - Enter/F2: Start editing
 * - Escape: Cancel editing
 * - Tab/Shift+Tab: Navigate cells
 * - Ctrl+C/V/X: Clipboard
 * - Ctrl+A: Select all
 * - Shift+Arrow: Range selection
 *
 * @example
 * ```typescript
 * const navigator = new KeyboardNavigator({
 *   container: gridElement,
 *   focusManager,
 *   rowCount: 100000,
 *   colCount: 10,
 *   onStartEdit: (cell) => {
 *     console.log('Start editing:', cell);
 *   },
 *   onCopy: () => {
 *     console.log('Copy selected cells');
 *   },
 * });
 *
 * // Keyboard events are automatically handled
 * // Call destroy() when done
 * navigator.destroy();
 * ```
 */
export class KeyboardNavigator {
  private container: HTMLElement;
  private focusManager: FocusManager;
  private events?: EventEmitter<GridEvents>;
  private rowCount: number;
  private colCount: number;
  private pageSize: number;
  private enableSelection: boolean;
  private enableEditing: boolean;

  private onStartEdit?: (cell: CellRef) => void;
  private onCancelEdit?: () => void;
  private onCopy?: () => void;
  private onCut?: () => void;
  private onPaste?: () => void;
  private onSelectAll?: () => void;

  private isSelecting = false;
  private selectionStart: CellRef | null = null;

  constructor(options: KeyboardNavigatorOptions) {
    this.container = options.container;
    this.focusManager = options.focusManager;
    this.events = options.events;
    this.rowCount = options.rowCount;
    this.colCount = options.colCount;
    this.pageSize = options.pageSize ?? 20;
    this.enableSelection = options.enableSelection ?? true;
    this.enableEditing = options.enableEditing ?? true;

    this.onStartEdit = options.onStartEdit;
    this.onCancelEdit = options.onCancelEdit;
    this.onCopy = options.onCopy;
    this.onCut = options.onCut;
    this.onPaste = options.onPaste;
    this.onSelectAll = options.onSelectAll;

    this.attachEventListeners();
  }

  /**
   * Attach keyboard event listeners
   */
  private attachEventListeners(): void {
    this.container.addEventListener('keydown', this.handleKeyDown);
    this.container.addEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    const activeCell = this.focusManager.getActiveCell();
    if (!activeCell) return;

    // Emit key:down event
    let defaultPrevented = false;
    if (this.events) {
      this.events.emit('key:down', {
        cell: activeCell,
        key: event.key,
        nativeEvent: event,
        preventDefault: () => {
          defaultPrevented = true;
        },
      });
    }

    if (defaultPrevented) {
      event.preventDefault();
      return;
    }

    const { key, ctrlKey, metaKey, shiftKey, altKey: _altKey } = event;
    const cmdKey = ctrlKey || metaKey; // Support both Ctrl and Cmd (Mac)

    // Navigation keys
    if (this.handleNavigationKey(key, cmdKey, shiftKey)) {
      event.preventDefault();
      return;
    }

    // Clipboard shortcuts
    if (cmdKey && this.handleClipboardKey(key)) {
      event.preventDefault();
      return;
    }

    // Editing keys
    if (this.enableEditing && this.handleEditingKey(key, event)) {
      event.preventDefault();
      return;
    }

    // Tab navigation
    if (key === 'Tab') {
      this.handleTabNavigation(shiftKey);
      event.preventDefault();
      return;
    }

    // Allow other keys to propagate
  };

  /**
   * Handle navigation keys
   */
  private handleNavigationKey(key: string, ctrlKey: boolean, shiftKey: boolean): boolean {
    let handled = false;

    switch (key) {
      case 'ArrowUp':
        handled = this.focusManager.moveFocus('up', this.rowCount, this.colCount);
        if (handled && shiftKey && this.enableSelection) {
          this.handleSelectionExtend();
        }
        break;

      case 'ArrowDown':
        handled = this.focusManager.moveFocus('down', this.rowCount, this.colCount);
        if (handled && shiftKey && this.enableSelection) {
          this.handleSelectionExtend();
        }
        break;

      case 'ArrowLeft':
        handled = this.focusManager.moveFocus('left', this.rowCount, this.colCount);
        if (handled && shiftKey && this.enableSelection) {
          this.handleSelectionExtend();
        }
        break;

      case 'ArrowRight':
        handled = this.focusManager.moveFocus('right', this.rowCount, this.colCount);
        if (handled && shiftKey && this.enableSelection) {
          this.handleSelectionExtend();
        }
        break;

      case 'PageUp':
        handled = this.focusManager.movePageFocus('up', this.pageSize, this.rowCount);
        break;

      case 'PageDown':
        handled = this.focusManager.movePageFocus('down', this.pageSize, this.rowCount);
        break;

      case 'Home':
        if (ctrlKey) {
          handled = this.focusManager.moveToGridStart();
        } else {
          handled = this.focusManager.moveToRowStart();
        }
        break;

      case 'End':
        if (ctrlKey) {
          handled = this.focusManager.moveToGridEnd(this.rowCount, this.colCount);
        } else {
          handled = this.focusManager.moveToRowEnd(this.colCount);
        }
        break;
    }

    // Start selection on shift press
    if (shiftKey && !this.isSelecting && handled) {
      this.startSelection();
    }

    return handled;
  }

  /**
   * Handle clipboard keys
   */
  private handleClipboardKey(key: string): boolean {
    switch (key.toLowerCase()) {
      case 'c':
        if (this.onCopy) {
          this.onCopy();
          return true;
        }
        break;

      case 'x':
        if (this.onCut) {
          this.onCut();
          return true;
        }
        break;

      case 'v':
        if (this.onPaste) {
          this.onPaste();
          return true;
        }
        break;

      case 'a':
        if (this.onSelectAll) {
          this.onSelectAll();
          return true;
        }
        break;
    }

    return false;
  }

  /**
   * Handle editing keys
   */
  private handleEditingKey(key: string, event: KeyboardEvent): boolean {
    const activeCell = this.focusManager.getActiveCell();
    if (!activeCell) return false;

    switch (key) {
      case 'Enter':
      case 'F2':
        if (this.onStartEdit) {
          this.onStartEdit(activeCell);
          return true;
        }
        break;

      case 'Escape':
        if (this.onCancelEdit) {
          this.onCancelEdit();
          return true;
        }
        break;

      default:
        // Alphanumeric keys start editing
        if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          if (this.onStartEdit) {
            this.onStartEdit(activeCell);
            // Don't prevent default - let the character be typed
            return false;
          }
        }
    }

    return false;
  }

  /**
   * Handle Tab navigation
   */
  private handleTabNavigation(shiftKey: boolean): void {
    const activeCell = this.focusManager.getActiveCell();
    if (!activeCell) return;

    if (shiftKey) {
      // Shift+Tab: Move left, or up and to the end of previous row
      if (activeCell.col > 0) {
        this.focusManager.moveFocus('left', this.rowCount, this.colCount);
      } else if (activeCell.row > 0) {
        this.focusManager.setActiveCell({
          row: activeCell.row - 1,
          col: this.colCount - 1,
        });
      }
    } else {
      // Tab: Move right, or down and to the start of next row
      if (activeCell.col < this.colCount - 1) {
        this.focusManager.moveFocus('right', this.rowCount, this.colCount);
      } else if (activeCell.row < this.rowCount - 1) {
        this.focusManager.setActiveCell({
          row: activeCell.row + 1,
          col: 0,
        });
      }
    }
  }

  /**
   * Start range selection
   */
  private startSelection(): void {
    const activeCell = this.focusManager.getActiveCell();
    if (!activeCell) return;

    this.isSelecting = true;
    this.selectionStart = { ...activeCell };

    if (this.events) {
      this.events.emit('selection:start', { startCell: activeCell });
    }
  }

  /**
   * Extend selection as focus moves
   */
  private handleSelectionExtend(): void {
    if (!this.isSelecting || !this.selectionStart) return;

    const activeCell = this.focusManager.getActiveCell();
    if (!activeCell) return;

    // Emit selection change event
    if (this.events) {
      const range = {
        startRow: Math.min(this.selectionStart.row, activeCell.row),
        startCol: Math.min(this.selectionStart.col, activeCell.col),
        endRow: Math.max(this.selectionStart.row, activeCell.row),
        endCol: Math.max(this.selectionStart.col, activeCell.col),
      };

      this.events.emit('selection:change', {
        ranges: [range],
        previousRanges: [],
      });
    }
  }

  /**
   * Handle keyup events
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    const activeCell = this.focusManager.getActiveCell();
    if (!activeCell) return;

    // End selection when Shift is released
    if (event.key === 'Shift' && this.isSelecting) {
      this.endSelection();
    }

    // Emit key:up event
    if (this.events) {
      this.events.emit('key:up', {
        cell: activeCell,
        key: event.key,
        nativeEvent: event,
      });
    }
  };

  /**
   * End range selection
   */
  private endSelection(): void {
    if (!this.isSelecting) return;

    const activeCell = this.focusManager.getActiveCell();
    if (activeCell && this.selectionStart) {
      const range = {
        startRow: Math.min(this.selectionStart.row, activeCell.row),
        startCol: Math.min(this.selectionStart.col, activeCell.col),
        endRow: Math.max(this.selectionStart.row, activeCell.row),
        endCol: Math.max(this.selectionStart.col, activeCell.col),
      };

      if (this.events) {
        this.events.emit('selection:end', { ranges: [range] });
      }
    }

    this.isSelecting = false;
    this.selectionStart = null;
  }

  /**
   * Update grid size
   */
  updateSize(rowCount: number, colCount: number): void {
    this.rowCount = rowCount;
    this.colCount = colCount;
  }

  /**
   * Destroy keyboard navigator
   */
  destroy(): void {
    this.container.removeEventListener('keydown', this.handleKeyDown);
    this.container.removeEventListener('keyup', this.handleKeyUp);

    this.isSelecting = false;
    this.selectionStart = null;
  }
}
