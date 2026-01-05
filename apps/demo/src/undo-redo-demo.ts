/**
 * Undo/Redo Demo - Demonstrates UndoRedoManager using CommandStack
 */

import { Grid } from '@zengrid/core';
import { UndoRedoManager } from '@zengrid/core/features/undo-redo';

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

export class UndoRedoDemo {
  private grid: Grid;
  private undoRedoManager: UndoRedoManager;
  private data: any[][];

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }

    // Initialize grid
    this.grid = new Grid({
      container,
      rowCount: 50,
      colCount: 10,
      rowHeight: 40,
      colWidth: 120,
      overscan: 5,
    });

    // Initialize undo/redo manager
    this.undoRedoManager = new UndoRedoManager({
      maxHistorySize: 50,
      enableCommandGrouping: true,
      groupingTimeWindow: 500,
    });

    // Generate and set data
    this.data = generateSampleData(50, 10);
    this.grid.setData(this.data);

    // Setup event listeners
    this.setupEventListeners();

    // Setup UI controls
    this.setupControls();

    // Initial render
    this.grid.refresh();
  }

  private setupEventListeners(): void {
    const container = this.grid.getContainer();

    // Double-click to edit cell
    container.addEventListener('dblclick', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('zengrid-cell')) {
        const row = parseInt(target.dataset.row || '-1', 10);
        const col = parseInt(target.dataset.col || '-1', 10);

        if (row >= 0 && col >= 0) {
          this.editCell(row, col, target);
        }
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        this.redo();
      }
    });
  }

  private editCell(row: number, col: number, cellElement: HTMLElement): void {
    const oldValue = this.data[row][col];
    const newValue = prompt('Enter new value:', oldValue);

    if (newValue !== null && newValue !== oldValue) {
      // Record the change in undo/redo manager
      this.undoRedoManager.recordCellEdit(
        row,
        col,
        oldValue,
        newValue,
        (r, c, value) => {
          this.data[r][c] = value;
          this.grid.setData([...this.data]); // Trigger grid update
          this.grid.refresh();
        }
      );

      this.updateHistoryDisplay();
    }
  }

  private undo(): void {
    if (this.undoRedoManager.undo()) {
      this.updateHistoryDisplay();
      console.log('Undo successful');
    } else {
      console.log('Nothing to undo');
    }
  }

  private redo(): void {
    if (this.undoRedoManager.redo()) {
      this.updateHistoryDisplay();
      console.log('Redo successful');
    } else {
      console.log('Nothing to redo');
    }
  }

  private setupControls(): void {
    const controlsContainer = document.getElementById('undo-redo-controls');
    if (!controlsContainer) return;

    controlsContainer.innerHTML = `
      <div class="controls-panel">
        <h3>Undo/Redo Controls</h3>

        <div class="control-group">
          <button id="undo-btn" disabled>⟲ Undo (Ctrl+Z)</button>
          <button id="redo-btn" disabled>⟳ Redo (Ctrl+Y)</button>
          <button id="clear-history-btn">Clear History</button>
        </div>

        <div class="control-group">
          <button id="batch-edit-btn">Batch Edit (5 cells)</button>
          <button id="random-edit-btn">Random Edit</button>
        </div>

        <div id="history-info" class="info-panel">
          <div class="history-section">
            <strong>Undo History (0):</strong>
            <div id="undo-history" class="history-list">Empty</div>
          </div>
          <div class="history-section">
            <strong>Redo History (0):</strong>
            <div id="redo-history" class="history-list">Empty</div>
          </div>
        </div>

        <div class="instructions">
          <strong>Instructions:</strong>
          <ul>
            <li>Double-click any cell to edit it</li>
            <li>Use Ctrl+Z to undo, Ctrl+Shift+Z or Ctrl+Y to redo</li>
            <li>Click "Batch Edit" to edit multiple cells at once</li>
            <li>Changes are grouped within 500ms window</li>
          </ul>
        </div>
      </div>
    `;

    // Undo button
    document.getElementById('undo-btn')?.addEventListener('click', () => {
      this.undo();
    });

    // Redo button
    document.getElementById('redo-btn')?.addEventListener('click', () => {
      this.redo();
    });

    // Clear history
    document.getElementById('clear-history-btn')?.addEventListener('click', () => {
      this.undoRedoManager.clear();
      this.updateHistoryDisplay();
    });

    // Batch edit
    document.getElementById('batch-edit-btn')?.addEventListener('click', () => {
      this.batchEdit();
    });

    // Random edit
    document.getElementById('random-edit-btn')?.addEventListener('click', () => {
      this.randomEdit();
    });

    this.updateHistoryDisplay();
  }

  private batchEdit(): void {
    const edits = [];
    for (let i = 0; i < 5; i++) {
      const row = Math.floor(Math.random() * 50);
      const col = Math.floor(Math.random() * 10);
      const oldValue = this.data[row][col];
      const newValue = `Edited ${Date.now()}`;
      edits.push({ row, col, oldValue, newValue });
    }

    // Create a batch command
    this.undoRedoManager.recordCustomCommand(
      `Batch edit ${edits.length} cells`,
      () => {
        edits.forEach(({ row, col, newValue }) => {
          this.data[row][col] = newValue;
        });
        this.grid.setData([...this.data]);
        this.grid.refresh();
      },
      () => {
        edits.forEach(({ row, col, oldValue }) => {
          this.data[row][col] = oldValue;
        });
        this.grid.setData([...this.data]);
        this.grid.refresh();
      }
    );

    this.updateHistoryDisplay();
  }

  private randomEdit(): void {
    const row = Math.floor(Math.random() * 50);
    const col = Math.floor(Math.random() * 10);
    const oldValue = this.data[row][col];
    const newValue = `Random ${Math.floor(Math.random() * 1000)}`;

    this.undoRedoManager.recordCellEdit(
      row,
      col,
      oldValue,
      newValue,
      (r, c, value) => {
        this.data[r][c] = value;
        this.grid.setData([...this.data]);
        this.grid.refresh();
      }
    );

    this.updateHistoryDisplay();
  }

  private updateHistoryDisplay(): void {
    // Update button states
    const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
    const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;

    if (undoBtn) {
      undoBtn.disabled = !this.undoRedoManager.canUndo();
    }
    if (redoBtn) {
      redoBtn.disabled = !this.undoRedoManager.canRedo();
    }

    // Update history lists
    const undoHistory = this.undoRedoManager.getUndoHistory();
    const redoHistory = this.undoRedoManager.getRedoHistory();

    const undoHistoryElement = document.getElementById('undo-history');
    if (undoHistoryElement) {
      if (undoHistory.length === 0) {
        undoHistoryElement.innerHTML = 'Empty';
      } else {
        undoHistoryElement.innerHTML = undoHistory
          .reverse()
          .map((cmd, idx) => `<div>${idx + 1}. ${cmd}</div>`)
          .join('');
      }
    }

    const redoHistoryElement = document.getElementById('redo-history');
    if (redoHistoryElement) {
      if (redoHistory.length === 0) {
        redoHistoryElement.innerHTML = 'Empty';
      } else {
        redoHistoryElement.innerHTML = redoHistory
          .reverse()
          .map((cmd, idx) => `<div>${idx + 1}. ${cmd}</div>`)
          .join('');
      }
    }

    // Update section headers with counts
    const undoSection = document.querySelector('.history-section:nth-child(1) strong');
    const redoSection = document.querySelector('.history-section:nth-child(2) strong');

    if (undoSection) {
      undoSection.textContent = `Undo History (${undoHistory.length}):`;
    }
    if (redoSection) {
      redoSection.textContent = `Redo History (${redoHistory.length}):`;
    }
  }

  public destroy(): void {
    this.undoRedoManager.destroy();
    this.grid.destroy();
  }
}
