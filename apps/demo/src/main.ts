import { Grid } from '../../../packages/core/src/grid/index';
import '../../../packages/core/src/styles.css';
import '../../../packages/core/src/features/loading/loading.styles.css';
import '../../../packages/core/src/features/column-resize/column-resize.styles.css';
import '../../../packages/core/src/features/column-drag/column-drag.styles.css';
import 'vanilla-calendar-pro/styles/index.css';
import '../../../packages/core/src/datetime-core/theming/datetime.css';
import { PaginationDemo } from './pagination-demo';

// Import configurations
import { ROW_COUNT, COL_COUNT, ROW_HEIGHT, dataMode, loadingTemplate } from './config/constants';
import { getColumns } from './config/columns';
import { createGridConfig } from './config/grid-config';

// Import data generators
import { generateData } from './data/generators';

// Import utilities
import { FPSMonitor } from './utils/fps-monitor';

// Import UI
import { updateStats, startPeriodicStatsUpdate } from './ui/stats-updater';
import { setupSidebarMenu } from './ui/sidebar';

// Import handlers
import { createDataRequestHandler } from './handlers/sort-handler';
import { setupButtonHandlers } from './handlers/button-handlers';

// Import features
import { InfiniteScrollManager } from './features/infinite-scroll';
import { setupFilterUI } from './features/filter-ui';

function main() {
  const debugLog = (...args: any[]) => {
    console.debug('[ZenGrid][Demo]', ...args);
  };

  const container = document.getElementById('grid-container');
  if (!container) {
    console.error('Grid container not found');
    return;
  }

  // 1. Generate initial data
  let data = generateData(ROW_COUNT, COL_COUNT);

  // 2. Get columns & extract widths
  const columns = getColumns(data);
  const columnWidths = columns.map(col => col.width);

  // 3. Create backend data handler
  const handleDataRequest = createDataRequestHandler({
    columns,
    getData: () => data,
  });

  // 4. Track loading template state
  let currentLoadingTemplate = loadingTemplate;

  // 5. Initialize grid
  let gridRef: Grid | null = null;

  const gridConfig = createGridConfig({
    rowCount: ROW_COUNT,
    colCount: COL_COUNT,
    columnWidths,
    columns,
    dataMode,
    loadingTemplate: currentLoadingTemplate,
    onDataRequest: dataMode !== 'frontend' ? handleDataRequest : undefined,
    onScroll: (scrollTop, scrollLeft) => {
      if (gridRef) {
        gridRef.updateColumnResizeHandles();
      }
    },
    onColumnWidthsChange: (widths) => {
      localStorage.setItem('zengrid-column-widths', JSON.stringify(widths));
    },
  });

  let grid = new Grid(container, gridConfig);
  gridRef = grid;
  (window as any).__grid = grid;

  // 6. Set data
  grid.setData(data);

  // 7. Initial render
  const renderStart = performance.now();
  grid.render();
  const renderTime = performance.now() - renderStart;

  // 8. Update stats
  updateStats(grid, renderTime);

  // 9. Update mode indicator
  const modeIndicator = document.getElementById('mode-indicator')!;
  const actualDataMode = grid.getDataMode();
  const actualSortMode = grid.getSortMode();
  const actualFilterMode = grid.getFilterMode();
  modeIndicator.textContent = `Data: ${actualDataMode.toUpperCase()}, Sort: ${actualSortMode.toUpperCase()}, Filter: ${actualFilterMode.toUpperCase()}`;

  // 10. Initialize FPS monitor
  const fpsElement = document.getElementById('fps-monitor')!;
  new FPSMonitor(fpsElement);

  // 11. Setup sidebar menu
  setupSidebarMenu();

  // 12. Setup features
  const infiniteScrollManager = new InfiniteScrollManager({
    container,
    columns,
    columnWidths,
    dataMode,
    loadingTemplate: currentLoadingTemplate,
    getData: () => data,
    setData: (newData) => { data = newData; },
  });

  const filterPanel = setupFilterUI(grid, columns);

  // 13. Setup button handlers
  setupButtonHandlers({
    grid,
    data,
    columns,
    columnWidths,
    actualDataMode,
    actualSortMode,
    actualFilterMode,
    loadingTemplate: currentLoadingTemplate,
    setLoadingTemplate: (template) => { currentLoadingTemplate = template; },
  });

  // 14. Column resize event listeners
  grid.on('column:resize', (event) => {
    // resize event available for external consumers
  });

  // 15. Header event listeners
  grid.on('header:sort:click', (event) => {
    // sort click handled internally
  });

  // Debug editing lifecycle
  grid.on('edit:start', (event) => {
    debugLog('edit:start', event);
  });
  grid.on('edit:commit', (event) => {
    debugLog('edit:commit', event);
  });
  grid.on('edit:cancel', (event) => {
    debugLog('edit:cancel', event);
  });
  grid.on('edit:end', (event) => {
    debugLog('edit:end', event);
  });

  // 15.1 Single-click edit for Project Duration column
  // Note: demo disables selection, so 'cell:click' event is not emitted.
  // Use direct DOM click handling instead.
  const scrollContainer = grid.getStore().get('dom.scrollContainer') as HTMLElement | null;
  debugLog('scrollContainer available', !!scrollContainer);
  if (scrollContainer) {
    const win = window as any;
    const existingDateRangeClickBinding = win.__zenGridDateRangeClickBinding as
      | { container: HTMLElement; handler: (event: MouseEvent) => void }
      | undefined;
    if (existingDateRangeClickBinding) {
      existingDateRangeClickBinding.container.removeEventListener(
        'click',
        existingDateRangeClickBinding.handler,
        true
      );
    }

    const dateRangeClickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const cell = target.closest('.zg-cell[data-row][data-col]') as HTMLElement | null;
      if (!cell) {
        debugLog('click ignored - no cell', { tag: target.tagName, className: target.className });
        return;
      }

      const row = parseInt(cell.dataset['row'] ?? '-1', 10);
      const col = parseInt(cell.dataset['col'] ?? '-1', 10);
      if (Number.isNaN(row) || Number.isNaN(col) || row < 0 || col < 0) {
        debugLog('click ignored - invalid coordinates', { row, col, dataset: cell.dataset });
        return;
      }

      const column = columns[col];
      if (!column || column.field !== 'dateRange') {
        debugLog('click ignored - non-dateRange column', { row, col, field: column?.field });
        return;
      }

      const editingActive = grid.getStore().get('editing.active');
      if (editingActive) {
        debugLog('click ignored - editor already active', editingActive);
        return;
      }

      debugLog('starting edit from click', { row, col, field: column.field });
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      grid.getStore().exec('editing:startEdit', { row, col });
    };

    scrollContainer.addEventListener('click', dateRangeClickHandler, true);
    win.__zenGridDateRangeClickBinding = {
      container: scrollContainer,
      handler: dateRangeClickHandler,
    };
  }

  // 16. Initialize Pagination Demo
  const paginationDemo = new PaginationDemo(grid);

  // 17. Pagination toggle button
  document.getElementById('btn-toggle-pagination')!.addEventListener('click', async () => {
    if (paginationDemo.isEnabled()) {
      paginationDemo.disable();
      data = generateData(ROW_COUNT, COL_COUNT);
      grid.setData(data);
      grid.refresh();
      alert('Pagination Mode: OFF\n\nSwitched back to local 100K rows in memory.');
    } else {
      await paginationDemo.enable();
      alert('Pagination Mode: ON\n\nNow loading data from mock server (http://localhost:3003)\n\nMake sure the server is running:\npnpm server\n\nTotal records: 10,000');
    }
  });

  // Theme selector
  const themeSelect = document.getElementById('theme-select') as HTMLSelectElement | null;
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      grid.setTheme(themeSelect.value);
    });
  }

  // Quick filter input
  const quickFilterInput = document.getElementById('quick-filter-input') as HTMLInputElement | null;
  if (quickFilterInput) {
    let quickFilterTimer: number | null = null;
    quickFilterInput.addEventListener('input', () => {
      if (quickFilterTimer) {
        window.clearTimeout(quickFilterTimer);
      }
      quickFilterTimer = window.setTimeout(() => {
        grid.setQuickFilter(quickFilterInput.value);
      }, 200);
    });
  }

  // Export CSV button
  const exportBtn = document.getElementById('btn-export-csv');
  exportBtn?.addEventListener('click', () => {
    const csv = grid.exportCSV({
      rows: 'filtered',
      columns: 'visible',
      includeHeaders: true,
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'zengrid-export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  // 18. Infinite scroll toggle button
  document.getElementById('btn-toggle-infinite-scroll')!.addEventListener('click', async () => {
    if (infiniteScrollManager.isEnabled()) {
      grid = await infiniteScrollManager.disable(grid);
      gridRef = grid;
    } else {
      grid = await infiniteScrollManager.enable(grid);
      gridRef = grid;
    }
  });

  // 19. Sliding window toggle button
  document.getElementById('btn-toggle-sliding-window')!.addEventListener('click', () => {
    infiniteScrollManager.toggleSlidingWindow();
  });

  // 20. Start periodic stats update
  startPeriodicStatsUpdate(grid);
}

// Start application
main();
