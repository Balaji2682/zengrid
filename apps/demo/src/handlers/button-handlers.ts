import { Grid } from '../../../../packages/core/src/grid/index';
import { ROW_COUNT, COL_COUNT } from '../config/constants';
import { generateRandomData } from '../data/generators';
import { updateStats } from '../ui/stats-updater';

export interface ButtonHandlersContext {
  grid: Grid;
  data: any[][];
  columns: any[];
  columnWidths: number[];
  actualDataMode: 'frontend' | 'backend';
  actualSortMode: 'frontend' | 'backend';
  actualFilterMode: 'frontend' | 'backend';
  loadingTemplate: 'simple' | 'animated' | 'modern' | 'skeleton' | 'overlay';
  setLoadingTemplate: (template: any) => void;
}

export function setupButtonHandlers(context: ButtonHandlersContext) {
  const { grid, columns } = context;

  // Refresh button
  document.getElementById('btn-refresh')!.addEventListener('click', () => {
    const start = performance.now();
    grid.refresh();
    const time = performance.now() - start;
    updateStats(grid, time);
  });

  // Random data button
  document.getElementById('btn-random')!.addEventListener('click', () => {
    const randomData = generateRandomData(ROW_COUNT, COL_COUNT);
    const start = performance.now();
    grid.setData(randomData);
    grid.refresh();
    const time = performance.now() - start;
    updateStats(grid, time);
  });

  // Scroll buttons
  document.getElementById('btn-scroll-top')!.addEventListener('click', () => {
    grid.scrollToCell(0, 0);
  });

  document.getElementById('btn-scroll-bottom')!.addEventListener('click', () => {
    grid.scrollToCell(ROW_COUNT - 1, 0);
  });

  document.getElementById('btn-scroll-middle')!.addEventListener('click', () => {
    grid.scrollToCell(Math.floor(ROW_COUNT / 2), 0);
  });

  // Auto-height demo button
  document.getElementById('btn-demo-autoheight')!.addEventListener('click', async () => {
    const message = `
TWO OVERFLOW MODES DEMO

Compare TWO ways to handle overflow content:

MODE 1: Auto-Height (WRAP)
Column: "Tags (Auto-Height)"
- Row EXPANDS to fit all content
- Content wraps to multiple lines
- autoHeight: true
- overflowMode: 'wrap'

MODE 2: Fixed + Scroll
Column: "Tags (Fixed + Scroll)"
- Row stays FIXED at 32px
- Scroll HORIZONTALLY within cell to see all
- autoHeight: false
- overflowMode: 'scroll'

Using scrollThroughCells() API...
    `.trim();

    alert(message);

    const demoRows = [0, 5, 10, 15, 20, 25, 30, 35, 40];
    const cells = demoRows.map(row => ({ row, col: 9 }));

    const { promise } = grid.scrollThroughCells(cells, {
      delayMs: 1500,
      smooth: true,
    });

    await promise;
  });

  // Column resize buttons
  document.getElementById('btn-auto-fit-all')!.addEventListener('click', () => {
    grid.autoFitAllColumns();
  });

  document.getElementById('btn-reset-widths')!.addEventListener('click', () => {
    const defaultWidths = columns.map(col => col.width);
    defaultWidths.forEach((width, col) => {
      grid.resizeColumn(col, width);
    });
    localStorage.removeItem('zengrid-column-widths');
  });

  // Mode toggle button
  const modeBtnElement = document.getElementById('btn-toggle-sort-mode')!;
  modeBtnElement.textContent = `Modes: ${context.actualDataMode.charAt(0).toUpperCase() + context.actualDataMode.slice(1)}`;
  modeBtnElement.addEventListener('click', () => {
    const modes = `
Current Operation Modes:
Data:   ${context.actualDataMode.toUpperCase()}
Sort:   ${context.actualSortMode.toUpperCase()}
Filter: ${context.actualFilterMode.toUpperCase()}

To change modes:
1. Edit src/main.ts
2. Change variable values:
   - dataMode: 'frontend' | 'backend' | 'auto'
3. Refresh the page
    `.trim();

    alert(modes);
  });

  // Loading template selector
  const loadingTemplateSelect = document.getElementById('loading-template-select') as HTMLSelectElement;
  loadingTemplateSelect.addEventListener('change', (e) => {
    const newTemplate = (e.target as HTMLSelectElement).value as any;
    context.setLoadingTemplate(newTemplate);

    if ((grid as any).loadingIndicator) {
      (grid as any).loadingIndicator.updateConfig({
        template: newTemplate,
      });
    }
  });

  // Simulate load button
  document.getElementById('btn-simulate-load')!.addEventListener('click', async () => {
    // Step 1: Clear the grid
    grid.setData([]);
    grid.refresh();

    // Step 2: Show loading indicator
    (grid as any).events.emit('loading:start', {
      timestamp: Date.now(),
      message: `Loading with ${context.loadingTemplate} template...`,
    });

    // Step 3: Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Reload the data
    grid.setData(context.data);
    grid.refresh();

    // Step 5: Complete the load
    (grid as any).events.emit('loading:end', {
      timestamp: Date.now(),
      duration: 2000,
    });

    // Update stats
    const renderTime = performance.now();
    updateStats(grid, renderTime);
  });
}
