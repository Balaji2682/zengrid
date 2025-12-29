import type { CellRef, SortDirection } from '../types';

/**
 * ARIA Manager options
 */
export interface ARIAManagerOptions {
  /**
   * Grid container element
   */
  container: HTMLElement;

  /**
   * Total row count
   */
  rowCount: number;

  /**
   * Total column count
   */
  colCount: number;

  /**
   * Label for screen readers
   * @default 'Data grid'
   */
  label?: string;

  /**
   * Description for screen readers
   */
  description?: string;

  /**
   * Enable live region announcements
   * @default true
   */
  enableLiveRegion?: boolean;
}

/**
 * ARIA Manager - Accessibility features for screen readers
 *
 * Implements WCAG 2.1 AA compliance through:
 * - Proper ARIA roles (grid, gridcell, rowheader, columnheader)
 * - Dynamic aria-rowindex and aria-colindex
 * - aria-selected state management
 * - aria-sort for sortable columns
 * - Live region for announcements
 *
 * @example
 * ```typescript
 * const aria = new ARIAManager({
 *   container: gridElement,
 *   rowCount: 100000,
 *   colCount: 10,
 *   label: 'Employee data grid',
 * });
 *
 * // Mark cell as selected
 * aria.setCellSelected(cellElement, 0, 0, true);
 *
 * // Announce to screen reader
 * aria.announce('Data loaded successfully');
 *
 * // Update sort indicator
 * aria.setColumnSort(headerElement, 0, 'asc');
 * ```
 */
export class ARIAManager {
  private container: HTMLElement;
  private rowCount: number;
  private colCount: number;
  private liveRegion: HTMLElement | null = null;
  private announceTimeout: number | null = null;

  constructor(options: ARIAManagerOptions) {
    this.container = options.container;
    this.rowCount = options.rowCount;
    this.colCount = options.colCount;

    // Setup grid role and attributes
    this.setupGridRole(options.label, options.description);

    // Setup live region for announcements
    if (options.enableLiveRegion !== false) {
      this.setupLiveRegion();
    }
  }

  /**
   * Setup grid container ARIA roles and attributes
   */
  private setupGridRole(label?: string, description?: string): void {
    this.container.setAttribute('role', 'grid');
    this.container.setAttribute('aria-rowcount', String(this.rowCount));
    this.container.setAttribute('aria-colcount', String(this.colCount));

    if (label) {
      this.container.setAttribute('aria-label', label);
    }

    if (description) {
      this.container.setAttribute('aria-description', description);
    }

    // Make grid keyboard navigable
    if (!this.container.hasAttribute('tabindex')) {
      this.container.setAttribute('tabindex', '0');
    }
  }

  /**
   * Setup live region for screen reader announcements
   */
  private setupLiveRegion(): void {
    this.liveRegion = document.createElement('div');
    this.liveRegion.className = 'zg-sr-only';
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');

    // Screen reader only styles (already in CSS)
    this.liveRegion.style.position = 'absolute';
    this.liveRegion.style.width = '1px';
    this.liveRegion.style.height = '1px';
    this.liveRegion.style.padding = '0';
    this.liveRegion.style.margin = '-1px';
    this.liveRegion.style.overflow = 'hidden';
    this.liveRegion.style.clip = 'rect(0, 0, 0, 0)';
    this.liveRegion.style.whiteSpace = 'nowrap';
    this.liveRegion.style.border = '0';

    this.container.appendChild(this.liveRegion);
  }

  /**
   * Set cell ARIA attributes
   * @param element - Cell element
   * @param row - Row index (0-based)
   * @param col - Column index (0-based)
   */
  setCellAttributes(element: HTMLElement, row: number, col: number): void {
    element.setAttribute('role', 'gridcell');
    element.setAttribute('aria-rowindex', String(row + 1)); // ARIA uses 1-based indexing
    element.setAttribute('aria-colindex', String(col + 1));

    // Set tabindex for keyboard navigation (will be managed by FocusManager)
    element.setAttribute('tabindex', '-1');
  }

  /**
   * Set cell selected state
   * @param element - Cell element
   * @param row - Row index
   * @param col - Column index
   * @param selected - Selected state
   */
  setCellSelected(element: HTMLElement, row: number, col: number, selected: boolean): void {
    element.setAttribute('aria-selected', String(selected));

    if (selected) {
      // Announce selection
      const announcement = `Cell selected: Row ${row + 1}, Column ${col + 1}`;
      this.announce(announcement);
    }
  }

  /**
   * Set header cell attributes
   * @param element - Header element
   * @param col - Column index
   * @param label - Column label
   */
  setHeaderAttributes(element: HTMLElement, col: number, label: string): void {
    element.setAttribute('role', 'columnheader');
    element.setAttribute('aria-colindex', String(col + 1));
    element.setAttribute('aria-label', label);
    element.setAttribute('tabindex', '-1');
  }

  /**
   * Set row header attributes
   * @param element - Row header element
   * @param row - Row index
   * @param label - Row label
   */
  setRowHeaderAttributes(element: HTMLElement, row: number, label: string): void {
    element.setAttribute('role', 'rowheader');
    element.setAttribute('aria-rowindex', String(row + 1));
    element.setAttribute('aria-label', label);
    element.setAttribute('tabindex', '-1');
  }

  /**
   * Set column sort indicator
   * @param element - Column header element
   * @param col - Column index
   * @param direction - Sort direction ('asc', 'desc', or null)
   */
  setColumnSort(element: HTMLElement, col: number, direction: SortDirection): void {
    if (direction === null) {
      element.removeAttribute('aria-sort');
    } else if (direction === 'asc') {
      element.setAttribute('aria-sort', 'ascending');
      this.announce(`Column ${col + 1} sorted ascending`);
    } else {
      element.setAttribute('aria-sort', 'descending');
      this.announce(`Column ${col + 1} sorted descending`);
    }
  }

  /**
   * Set cell as editable
   * @param element - Cell element
   * @param editable - Whether cell is editable
   */
  setCellEditable(element: HTMLElement, editable: boolean): void {
    if (editable) {
      element.setAttribute('aria-readonly', 'false');
    } else {
      element.setAttribute('aria-readonly', 'true');
    }
  }

  /**
   * Set cell as disabled
   * @param element - Cell element
   * @param disabled - Whether cell is disabled
   */
  setCellDisabled(element: HTMLElement, disabled: boolean): void {
    element.setAttribute('aria-disabled', String(disabled));
  }

  /**
   * Announce message to screen readers
   * @param message - Message to announce
   * @param priority - Announcement priority ('polite' or 'assertive')
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.liveRegion) return;

    // Clear previous announcement timeout
    if (this.announceTimeout !== null) {
      clearTimeout(this.announceTimeout);
    }

    // Update live region
    this.liveRegion.setAttribute('aria-live', priority);
    this.liveRegion.textContent = message;

    // Clear announcement after 1 second
    this.announceTimeout = window.setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = '';
      }
      this.announceTimeout = null;
    }, 1000);
  }

  /**
   * Update grid size
   * @param rowCount - New row count
   * @param colCount - New column count
   */
  updateSize(rowCount: number, colCount: number): void {
    this.rowCount = rowCount;
    this.colCount = colCount;

    this.container.setAttribute('aria-rowcount', String(rowCount));
    this.container.setAttribute('aria-colcount', String(colCount));

    this.announce(`Grid resized: ${rowCount} rows, ${colCount} columns`);
  }

  /**
   * Set active cell (for keyboard navigation)
   * @param element - Cell element
   * @param cell - Cell reference
   */
  setActiveCell(element: HTMLElement, cell: CellRef): void {
    // Set aria-activedescendant on container
    const cellId = `zg-cell-${cell.row}-${cell.col}`;
    element.id = cellId;
    this.container.setAttribute('aria-activedescendant', cellId);

    const announcement = `Active cell: Row ${cell.row + 1}, Column ${cell.col + 1}`;
    this.announce(announcement);
  }

  /**
   * Clear active cell
   */
  clearActiveCell(): void {
    this.container.removeAttribute('aria-activedescendant');
  }

  /**
   * Announce range selection
   * @param startRow - Start row (0-based)
   * @param startCol - Start column (0-based)
   * @param endRow - End row (0-based)
   * @param endCol - End column (0-based)
   */
  announceRangeSelection(startRow: number, startCol: number, endRow: number, endCol: number): void {
    const rowCount = Math.abs(endRow - startRow) + 1;
    const colCount = Math.abs(endCol - startCol) + 1;
    const cellCount = rowCount * colCount;

    const message = `Selected ${cellCount} cells: ${rowCount} rows, ${colCount} columns`;
    this.announce(message);
  }

  /**
   * Announce filter applied
   * @param visibleRows - Number of visible rows
   * @param totalRows - Total rows
   */
  announceFilter(visibleRows: number, totalRows: number): void {
    const hiddenRows = totalRows - visibleRows;
    const message = `Filter applied: ${visibleRows} of ${totalRows} rows visible, ${hiddenRows} hidden`;
    this.announce(message);
  }

  /**
   * Announce data load
   * @param rowCount - Number of rows loaded
   */
  announceDataLoad(rowCount: number): void {
    const message = `Data loaded: ${rowCount} rows`;
    this.announce(message);
  }

  /**
   * Destroy manager and cleanup
   */
  destroy(): void {
    if (this.announceTimeout !== null) {
      clearTimeout(this.announceTimeout);
      this.announceTimeout = null;
    }

    if (this.liveRegion) {
      this.liveRegion.remove();
      this.liveRegion = null;
    }

    // Remove ARIA attributes from container
    this.container.removeAttribute('role');
    this.container.removeAttribute('aria-rowcount');
    this.container.removeAttribute('aria-colcount');
    this.container.removeAttribute('aria-label');
    this.container.removeAttribute('aria-description');
    this.container.removeAttribute('aria-activedescendant');
  }
}
