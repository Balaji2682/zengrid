/**
 * Selection Demo - Demonstrates SelectionManager using IntervalTree
 */

import { Grid } from '@zengrid/core';
import { SelectionManager } from '@zengrid/core/features/selection';
import type { SelectionRange } from '@zengrid/core/features/selection';

// Generate sample data
function generateSampleData(rows: number, cols: number): any[][] {
  const data: any[][] = [];
  for (let i = 0; i < rows; i++) {
    const row: any[] = [];
    for (let j = 0; j < cols; j++) {
      row.push(`Cell ${i},${j}`);
    }
    data.push(row);
  }
  return data;
}

export class SelectionDemo {
  private grid: Grid;
  private selectionManager: SelectionManager;
  private selectedCells: Set<string> = new Set();

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }

    // Initialize grid
    this.grid = new Grid({
      container,
      rowCount: 100,
      colCount: 26,
      rowHeight: 40,
      colWidth: 120,
      overscan: 5,
    });

    // Initialize selection manager
    this.selectionManager = new SelectionManager({
      mode: 'multiple',
      enableRowSelection: true,
      enableColumnSelection: true,
    });

    // Set data
    const data = generateSampleData(100, 26);
    this.grid.setData(data);

    // Setup event listeners
    this.setupEventListeners();

    // Setup UI controls
    this.setupControls();

    // Initial render
    this.grid.refresh();
  }

  private setupEventListeners(): void {
    const container = this.grid.getContainer();

    // Cell click selection
    container.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('zengrid-cell')) {
        const row = parseInt(target.dataset.row || '-1', 10);
        const col = parseInt(target.dataset.col || '-1', 10);

        if (row >= 0 && col >= 0) {
          const additive = e.ctrlKey || e.metaKey;
          this.selectionManager.selectCell(row, col, additive);
          this.updateCellSelection();
          this.updateSelectionInfo();
        }
      }
    });

    // Row header click
    container.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('row-header')) {
        const row = parseInt(target.dataset.row || '-1', 10);
        if (row >= 0) {
          const additive = e.ctrlKey || e.metaKey;
          this.selectionManager.selectRows(row, row, additive);
          this.updateCellSelection();
          this.updateSelectionInfo();
        }
      }
    });

    // Column header click
    container.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('col-header')) {
        const col = parseInt(target.dataset.col || '-1', 10);
        if (col >= 0) {
          const additive = e.ctrlKey || e.metaKey;
          this.selectionManager.selectColumns(col, col, additive);
          this.updateCellSelection();
          this.updateSelectionInfo();
        }
      }
    });
  }

  private setupControls(): void {
    const controlsContainer = document.getElementById('selection-controls');
    if (!controlsContainer) return;

    controlsContainer.innerHTML = `
      <div class="controls-panel">
        <h3>Selection Controls</h3>

        <div class="control-group">
          <label>Selection Mode:</label>
          <select id="selection-mode">
            <option value="single">Single</option>
            <option value="multiple" selected>Multiple</option>
            <option value="range">Range</option>
          </select>
        </div>

        <div class="control-group">
          <button id="select-all-btn">Select All</button>
          <button id="clear-selection-btn">Clear Selection</button>
        </div>

        <div class="control-group">
          <button id="select-first-10-rows">Select First 10 Rows</button>
          <button id="select-first-5-cols">Select First 5 Columns</button>
        </div>

        <div class="control-group">
          <button id="select-range-btn">Select Range (10-20, 5-10)</button>
        </div>

        <div id="selection-info" class="info-panel">
          <strong>Selection Info:</strong>
          <div id="selection-details">No selection</div>
        </div>

        <div class="instructions">
          <strong>Instructions:</strong>
          <ul>
            <li>Click a cell to select it</li>
            <li>Ctrl+Click to add to selection</li>
            <li>Click row/column headers to select entire row/column</li>
            <li>Use buttons to test different selection modes</li>
          </ul>
        </div>
      </div>
    `;

    // Mode selector
    const modeSelect = document.getElementById('selection-mode') as HTMLSelectElement;
    modeSelect?.addEventListener('change', () => {
      this.selectionManager.setMode(
        modeSelect.value as 'single' | 'multiple' | 'range'
      );
    });

    // Select all
    document.getElementById('select-all-btn')?.addEventListener('click', () => {
      this.selectionManager.selectRange(0, 0, 99, 25);
      this.updateCellSelection();
      this.updateSelectionInfo();
    });

    // Clear selection
    document.getElementById('clear-selection-btn')?.addEventListener('click', () => {
      this.selectionManager.clearSelection();
      this.updateCellSelection();
      this.updateSelectionInfo();
    });

    // Select first 10 rows
    document.getElementById('select-first-10-rows')?.addEventListener('click', () => {
      this.selectionManager.selectRows(0, 9);
      this.updateCellSelection();
      this.updateSelectionInfo();
    });

    // Select first 5 columns
    document.getElementById('select-first-5-cols')?.addEventListener('click', () => {
      this.selectionManager.selectColumns(0, 4);
      this.updateCellSelection();
      this.updateSelectionInfo();
    });

    // Select range
    document.getElementById('select-range-btn')?.addEventListener('click', () => {
      this.selectionManager.selectRange(10, 5, 20, 10);
      this.updateCellSelection();
      this.updateSelectionInfo();
    });
  }

  private updateCellSelection(): void {
    const container = this.grid.getContainer();
    const cells = container.querySelectorAll('.zengrid-cell');

    // Clear previous selection styling
    cells.forEach((cell) => {
      cell.classList.remove('selected');
    });

    // Apply new selection styling
    cells.forEach((cell) => {
      const row = parseInt((cell as HTMLElement).dataset.row || '-1', 10);
      const col = parseInt((cell as HTMLElement).dataset.col || '-1', 10);

      if (row >= 0 && col >= 0 && this.selectionManager.isSelected(row, col)) {
        cell.classList.add('selected');
      }
    });
  }

  private updateSelectionInfo(): void {
    const infoElement = document.getElementById('selection-details');
    if (!infoElement) return;

    const ranges = this.selectionManager.getSelectedRanges();

    if (ranges.length === 0) {
      infoElement.innerHTML = 'No selection';
      return;
    }

    let html = `<strong>${ranges.length} range(s) selected:</strong><br>`;
    ranges.forEach((range: SelectionRange, index: number) => {
      html += `${index + 1}. Type: ${range.type}, `;
      html += `Rows: ${range.startRow}-${range.endRow}, `;
      html += `Cols: ${range.startCol}-${range.endCol}<br>`;
    });

    infoElement.innerHTML = html;
  }

  public destroy(): void {
    this.selectionManager.destroy();
    this.grid.destroy();
  }
}
