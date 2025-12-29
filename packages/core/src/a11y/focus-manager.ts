import type { CellRef } from '../types';
import type { ARIAManager } from './aria-manager';

/**
 * Focus Manager options
 */
export interface FocusManagerOptions {
  /**
   * Grid container element
   */
  container: HTMLElement;

  /**
   * ARIA manager instance
   */
  ariaManager?: ARIAManager;

  /**
   * Callback to get cell element
   */
  getCellElement: (row: number, col: number) => HTMLElement | null;

  /**
   * Callback when active cell changes
   */
  onActiveCellChange?: (cell: CellRef | null, previousCell: CellRef | null) => void;
}

/**
 * FocusManager - Manages keyboard focus using roving tabindex pattern
 *
 * Implements the roving tabindex pattern for grid navigation:
 * - Only one cell is focusable at a time (tabindex="0")
 * - All other cells have tabindex="-1"
 * - Arrow keys move focus between cells
 * - Tab key exits the grid
 *
 * @example
 * ```typescript
 * const focus = new FocusManager({
 *   container: gridElement,
 *   getCellElement: (row, col) => document.getElementById(`cell-${row}-${col}`),
 *   onActiveCellChange: (cell) => {
 *     console.log('Active cell:', cell);
 *   },
 * });
 *
 * // Set active cell
 * focus.setActiveCell({ row: 0, col: 0 });
 *
 * // Move focus
 * focus.moveFocus('down'); // Moves to row 1
 * focus.moveFocus('right'); // Moves to col 1
 * ```
 */
export class FocusManager {
  private container: HTMLElement;
  private ariaManager?: ARIAManager;
  private getCellElement: (row: number, col: number) => HTMLElement | null;
  private onActiveCellChange?: (cell: CellRef | null, previousCell: CellRef | null) => void;

  private activeCell: CellRef | null = null;
  private focusedElement: HTMLElement | null = null;

  constructor(options: FocusManagerOptions) {
    this.container = options.container;
    this.ariaManager = options.ariaManager;
    this.getCellElement = options.getCellElement;
    this.onActiveCellChange = options.onActiveCellChange;
  }

  /**
   * Get current active cell
   */
  getActiveCell(): CellRef | null {
    return this.activeCell ? { ...this.activeCell } : null;
  }

  /**
   * Set active cell and update focus
   * @param cell - Cell to make active
   * @param focus - Whether to actually focus the element (default true)
   */
  setActiveCell(cell: CellRef | null, focus: boolean = true): void {
    const previousCell = this.activeCell;

    // No change
    if (
      previousCell &&
      cell &&
      previousCell.row === cell.row &&
      previousCell.col === cell.col
    ) {
      return;
    }

    // Remove tabindex from previous cell
    if (previousCell) {
      const prevElement = this.getCellElement(previousCell.row, previousCell.col);
      if (prevElement) {
        prevElement.setAttribute('tabindex', '-1');
      }
    }

    // Update active cell
    this.activeCell = cell;

    if (cell) {
      const element = this.getCellElement(cell.row, cell.col);
      if (element) {
        // Set tabindex to make cell focusable
        element.setAttribute('tabindex', '0');

        // Focus if requested
        if (focus) {
          element.focus();
          this.focusedElement = element;
        }

        // Update ARIA
        if (this.ariaManager) {
          this.ariaManager.setActiveCell(element, cell);
        }
      }
    } else {
      // Clear active cell
      if (this.ariaManager) {
        this.ariaManager.clearActiveCell();
      }
      this.focusedElement = null;
    }

    // Notify callback
    if (this.onActiveCellChange) {
      this.onActiveCellChange(cell, previousCell);
    }
  }

  /**
   * Move focus in a direction
   * @param direction - Direction to move ('up', 'down', 'left', 'right')
   * @param rowCount - Total row count
   * @param colCount - Total column count
   * @returns Whether focus moved successfully
   */
  moveFocus(
    direction: 'up' | 'down' | 'left' | 'right',
    rowCount: number,
    colCount: number
  ): boolean {
    if (!this.activeCell) return false;

    const { row, col } = this.activeCell;
    let newRow = row;
    let newCol = col;

    switch (direction) {
      case 'up':
        newRow = Math.max(0, row - 1);
        break;
      case 'down':
        newRow = Math.min(rowCount - 1, row + 1);
        break;
      case 'left':
        newCol = Math.max(0, col - 1);
        break;
      case 'right':
        newCol = Math.min(colCount - 1, col + 1);
        break;
    }

    // No movement
    if (newRow === row && newCol === col) {
      return false;
    }

    // Update active cell
    this.setActiveCell({ row: newRow, col: newCol });
    return true;
  }

  /**
   * Move focus by page (Page Up/Down)
   * @param direction - 'up' or 'down'
   * @param pageSize - Number of rows per page
   * @param rowCount - Total row count
   */
  movePageFocus(
    direction: 'up' | 'down',
    pageSize: number,
    rowCount: number
  ): boolean {
    if (!this.activeCell) return false;

    const { row, col } = this.activeCell;
    let newRow = row;

    if (direction === 'up') {
      newRow = Math.max(0, row - pageSize);
    } else {
      newRow = Math.min(rowCount - 1, row + pageSize);
    }

    if (newRow === row) return false;

    this.setActiveCell({ row: newRow, col });
    return true;
  }

  /**
   * Move to first cell in row (Home)
   */
  moveToRowStart(): boolean {
    if (!this.activeCell) return false;
    if (this.activeCell.col === 0) return false;

    this.setActiveCell({ row: this.activeCell.row, col: 0 });
    return true;
  }

  /**
   * Move to last cell in row (End)
   * @param colCount - Total column count
   */
  moveToRowEnd(colCount: number): boolean {
    if (!this.activeCell) return false;

    const lastCol = colCount - 1;
    if (this.activeCell.col === lastCol) return false;

    this.setActiveCell({ row: this.activeCell.row, col: lastCol });
    return true;
  }

  /**
   * Move to first cell in grid (Ctrl+Home)
   */
  moveToGridStart(): boolean {
    if (!this.activeCell) return false;
    if (this.activeCell.row === 0 && this.activeCell.col === 0) return false;

    this.setActiveCell({ row: 0, col: 0 });
    return true;
  }

  /**
   * Move to last cell in grid (Ctrl+End)
   * @param rowCount - Total row count
   * @param colCount - Total column count
   */
  moveToGridEnd(rowCount: number, colCount: number): boolean {
    if (!this.activeCell) return false;

    const lastRow = rowCount - 1;
    const lastCol = colCount - 1;

    if (this.activeCell.row === lastRow && this.activeCell.col === lastCol) {
      return false;
    }

    this.setActiveCell({ row: lastRow, col: lastCol });
    return true;
  }

  /**
   * Focus the grid container
   */
  focusGrid(): void {
    this.container.focus();
  }

  /**
   * Check if grid or a cell has focus
   */
  hasFocus(): boolean {
    return (
      document.activeElement === this.container ||
      (this.focusedElement !== null && document.activeElement === this.focusedElement)
    );
  }

  /**
   * Render focus ring on active cell
   */
  renderFocusRing(): void {
    if (!this.activeCell || !this.focusedElement) return;

    // Focus ring is handled by CSS :focus-visible
    // This method can be used for custom rendering if needed
  }

  /**
   * Clear focus
   */
  clearFocus(): void {
    if (this.focusedElement) {
      this.focusedElement.blur();
      this.focusedElement = null;
    }

    if (this.activeCell) {
      const element = this.getCellElement(this.activeCell.row, this.activeCell.col);
      if (element) {
        element.setAttribute('tabindex', '-1');
      }
    }

    this.activeCell = null;

    if (this.ariaManager) {
      this.ariaManager.clearActiveCell();
    }
  }

  /**
   * Destroy focus manager
   */
  destroy(): void {
    this.clearFocus();
    this.activeCell = null;
    this.focusedElement = null;
  }
}
