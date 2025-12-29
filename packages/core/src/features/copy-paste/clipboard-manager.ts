import type { CellRange } from '../../types';
import type { EventEmitter } from '../../events/event-emitter';
import type { GridEvents } from '../../events/grid-events';

/**
 * Clipboard manager options
 */
export interface ClipboardManagerOptions {
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
   * Callback to delete cell value
   */
  deleteValue?: (row: number, col: number) => void;

  /**
   * Include headers in copy
   * @default false
   */
  includeHeaders?: boolean;

  /**
   * Callback to get column header
   */
  getColumnHeader?: (col: number) => string;
}

/**
 * ClipboardManager - Handles copy/cut/paste operations
 *
 * Supports multiple formats:
 * - text/plain: TSV (tab-separated values)
 * - text/html: HTML table format
 *
 * Compatible with Excel and Google Sheets.
 *
 * @example
 * ```typescript
 * const clipboard = new ClipboardManager({
 *   getValue: (row, col) => data[row][col],
 *   setValue: (row, col, value) => { data[row][col] = value; },
 * });
 *
 * // Copy selection
 * await clipboard.copy([
 *   { startRow: 0, startCol: 0, endRow: 2, endCol: 2 },
 * ]);
 *
 * // Paste at location
 * await clipboard.paste(5, 0);
 * ```
 */
export class ClipboardManager {
  private events?: EventEmitter<GridEvents>;
  private getValue: (row: number, col: number) => any;
  private setValue: (row: number, col: number, value: any) => void;
  private deleteValue?: (row: number, col: number) => void;
  private includeHeaders: boolean;
  private getColumnHeader?: (col: number) => string;

  constructor(options: ClipboardManagerOptions) {
    this.events = options.events;
    this.getValue = options.getValue;
    this.setValue = options.setValue;
    this.deleteValue = options.deleteValue;
    this.includeHeaders = options.includeHeaders ?? false;
    this.getColumnHeader = options.getColumnHeader;
  }

  /**
   * Copy selected ranges to clipboard
   * @param ranges - Ranges to copy
   */
  async copy(ranges: CellRange[]): Promise<void> {
    if (ranges.length === 0) return;

    // For simplicity, copy only the first range
    // TODO: Support multiple ranges
    const range = ranges[0];

    const data = this.extractRangeData(range);
    const tsvText = this.toTSV(data);
    const htmlText = this.toHTML(data);

    try {
      // Write to clipboard with multiple formats
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([tsvText], { type: 'text/plain' }),
          'text/html': new Blob([htmlText], { type: 'text/html' }),
        }),
      ]);

      // Emit event
      if (this.events) {
        this.events.emit('copy', {
          ranges,
          data: tsvText,
        });
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);

      // Fallback to older API
      try {
        await navigator.clipboard.writeText(tsvText);
      } catch (fallbackError) {
        console.error('Fallback copy also failed:', fallbackError);
      }
    }
  }

  /**
   * Cut selected ranges to clipboard (copy + delete)
   * @param ranges - Ranges to cut
   */
  async cut(ranges: CellRange[]): Promise<void> {
    if (ranges.length === 0) return;

    // Copy first
    await this.copy(ranges);

    // Then delete values
    for (const range of ranges) {
      for (let row = range.startRow; row <= range.endRow; row++) {
        for (let col = range.startCol; col <= range.endCol; col++) {
          if (this.deleteValue) {
            this.deleteValue(row, col);
          } else {
            this.setValue(row, col, null);
          }
        }
      }
    }

    // Emit event
    if (this.events) {
      this.events.emit('cut', {
        ranges,
        data: '', // Already emitted in copy
      });
    }
  }

  /**
   * Paste from clipboard at target location
   * @param targetRow - Target row
   * @param targetCol - Target column
   */
  async paste(targetRow: number, targetCol: number): Promise<void> {
    try {
      // Try to read multiple formats
      const items = await navigator.clipboard.read();

      for (const item of items) {
        // Prefer HTML format (preserves formatting)
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          const html = await blob.text();
          const data = this.parseHTML(html);
          this.pasteData(data, targetRow, targetCol);
          return;
        }

        // Fallback to plain text
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          const text = await blob.text();
          const data = this.parseTSV(text);
          this.pasteData(data, targetRow, targetCol);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);

      // Fallback to text API
      try {
        const text = await navigator.clipboard.readText();
        const data = this.parseTSV(text);
        this.pasteData(data, targetRow, targetCol);
      } catch (fallbackError) {
        console.error('Fallback paste also failed:', fallbackError);
      }
    }
  }

  /**
   * Extract data from a range
   */
  private extractRangeData(range: CellRange): any[][] {
    const data: any[][] = [];

    // Include headers if requested
    if (this.includeHeaders && this.getColumnHeader) {
      const headers: any[] = [];
      for (let col = range.startCol; col <= range.endCol; col++) {
        headers.push(this.getColumnHeader(col));
      }
      data.push(headers);
    }

    // Extract cell values
    for (let row = range.startRow; row <= range.endRow; row++) {
      const rowData: any[] = [];
      for (let col = range.startCol; col <= range.endCol; col++) {
        rowData.push(this.getValue(row, col));
      }
      data.push(rowData);
    }

    return data;
  }

  /**
   * Convert data to TSV format
   */
  private toTSV(data: any[][]): string {
    return data
      .map(row => row.map(cell => this.formatCellForTSV(cell)).join('\t'))
      .join('\n');
  }

  /**
   * Format cell value for TSV
   */
  private formatCellForTSV(value: any): string {
    if (value == null) return '';

    const str = String(value);

    // Escape tabs and newlines
    return str.replace(/\t/g, ' ').replace(/\n/g, ' ');
  }

  /**
   * Convert data to HTML table format
   */
  private toHTML(data: any[][]): string {
    let html = '<table>';

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const tag = i === 0 && this.includeHeaders ? 'th' : 'td';

      html += '<tr>';
      for (const cell of row) {
        html += `<${tag}>${this.escapeHTML(String(cell ?? ''))}</${tag}>`;
      }
      html += '</tr>';
    }

    html += '</table>';
    return html;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Parse TSV text to 2D array
   */
  private parseTSV(text: string): any[][] {
    const lines = text.split(/\r?\n/);
    return lines.map(line => line.split('\t'));
  }

  /**
   * Parse HTML table to 2D array
   */
  private parseHTML(html: string): any[][] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');

    if (!table) {
      // No table found, treat as plain text
      return this.parseTSV(doc.body.textContent || '');
    }

    const data: any[][] = [];
    const rows = Array.from(table.querySelectorAll('tr'));

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td, th'));
      const rowData: any[] = [];

      for (const cell of cells) {
        rowData.push(cell.textContent || '');
      }

      if (rowData.length > 0) {
        data.push(rowData);
      }
    }

    return data;
  }

  /**
   * Paste data at target location
   */
  private pasteData(data: any[][], targetRow: number, targetCol: number): void {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      for (let j = 0; j < row.length; j++) {
        const value = row[j];
        this.setValue(targetRow + i, targetCol + j, value);
      }
    }

    // Emit event
    if (this.events) {
      this.events.emit('paste', {
        cell: { row: targetRow, col: targetCol },
        data: this.toTSV(data),
      });
    }
  }
}
