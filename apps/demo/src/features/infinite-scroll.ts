import { Grid } from '../../../../packages/core/src/grid/index';
import { ROW_COUNT, COL_COUNT } from '../config/constants';
import { generateData } from '../data/generators';
import { createGridConfig } from '../config/grid-config';

export interface InfiniteScrollContext {
  container: HTMLElement;
  columns: any[];
  columnWidths: number[];
  dataMode: 'frontend' | 'backend' | 'auto';
  loadingTemplate: 'simple' | 'animated' | 'modern' | 'skeleton' | 'overlay';
  getData: () => any[][];
  setData: (newData: any[][]) => void;
}

export class InfiniteScrollManager {
  private context: InfiniteScrollContext;
  private infiniteScrollEnabled = false;
  private slidingWindowEnabled = false;
  private totalRowsLoaded = 0;

  constructor(context: InfiniteScrollContext) {
    this.context = context;
  }

  isEnabled(): boolean {
    return this.infiniteScrollEnabled;
  }

  isSlidingWindowEnabled(): boolean {
    return this.slidingWindowEnabled;
  }

  toggleSlidingWindow(): void {
    this.slidingWindowEnabled = !this.slidingWindowEnabled;
    const btn = document.getElementById('btn-toggle-sliding-window')!;
    btn.textContent = this.slidingWindowEnabled ? 'Sliding Window: ON' : 'Sliding Window: OFF';
    btn.style.background = this.slidingWindowEnabled ? '#27ae60' : '#16a085';

    if (this.slidingWindowEnabled) {
      alert(
        'Sliding Window: ON\n\n' +
        'Memory-efficient mode enabled!\n\n' +
        'Configuration:\n' +
        '- Max rows in memory: 500\n' +
        '- Prune threshold: 600 rows\n' +
        '- Old rows are automatically removed\n\n' +
        'Enable infinite scrolling to see pruning in action.'
      );
    } else {
      alert(
        'Sliding Window: OFF\n\n' +
        'Memory will grow indefinitely.\n\n' +
        'All loaded rows stay in memory.\n' +
        'Good for: Small datasets or when you need to scroll back to the beginning.'
      );
    }
  }

  async disable(currentGrid: Grid): Promise<Grid> {
    this.infiniteScrollEnabled = false;
    const newData = generateData(ROW_COUNT, COL_COUNT);
    this.context.setData(newData);

    // Destroy current grid
    currentGrid.destroy();
    this.context.container.innerHTML = '';

    // Create new grid
    const gridConfig = createGridConfig({
      rowCount: ROW_COUNT,
      colCount: COL_COUNT,
      columnWidths: this.context.columnWidths,
      columns: this.context.columns,
      dataMode: this.context.dataMode,
      loadingTemplate: this.context.loadingTemplate,
      onScroll: (scrollTop, scrollLeft) => {
        const grid = newGrid;
        if (grid) {
          grid.updateColumnResizeHandles();
        }
      },
      onColumnWidthsChange: (widths) => {
        localStorage.setItem('zengrid-column-widths', JSON.stringify(widths));
      },
    });

    const newGrid = new Grid(this.context.container, gridConfig);
    newGrid.setData(newData);
    newGrid.render();

    this.totalRowsLoaded = ROW_COUNT;

    alert('Infinite Scrolling: OFF\n\nSwitched back to standard mode with 100K rows.');

    return newGrid;
  }

  async enable(currentGrid: Grid): Promise<Grid> {
    this.infiniteScrollEnabled = true;

    const INITIAL_ROWS = 100;
    let data: any[][];

    // Fetch initial data from server
    try {
      const response = await fetch(
        `http://localhost:3003/api/employees?page=1&pageSize=${INITIAL_ROWS}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Convert server data to grid format
      data = result.data.map((emp: any) => [
        emp.id,
        emp.name,
        emp.department,
        emp.salary,
        emp.years,
        emp.status,
        emp.email,
        emp.phone,
        emp.score,
        emp.notes,
      ]);

      this.totalRowsLoaded = data.length;
    } catch (error) {
      console.error('Failed to fetch initial data from server:', error);
      alert('Failed to fetch data from server.\n\nMake sure the server is running:\nnpm run server\n\nFalling back to local data generation...');

      // Fallback to local data
      data = generateData(INITIAL_ROWS, COL_COUNT);
      this.totalRowsLoaded = INITIAL_ROWS;
    }

    this.context.setData(data);

    // Destroy current grid
    currentGrid.destroy();
    this.context.container.innerHTML = '';

    // Create new grid with infinite scrolling
    const self = this;
    const gridConfig = createGridConfig({
      rowCount: INITIAL_ROWS,
      colCount: COL_COUNT,
      columnWidths: this.context.columnWidths,
      columns: this.context.columns,
      dataMode: this.context.dataMode,
      loadingTemplate: this.context.loadingTemplate,
      onScroll: (scrollTop, scrollLeft) => {
        const grid = newGrid;
        if (grid) {
          grid.updateColumnResizeHandles();
        }
      },
      onColumnWidthsChange: (widths) => {
        localStorage.setItem('zengrid-column-widths', JSON.stringify(widths));
      },
      infiniteScrolling: {
        enabled: true,
        threshold: 20,
        initialRowCount: INITIAL_ROWS,
        enableSlidingWindow: this.slidingWindowEnabled,
        windowSize: 500,
        pruneThreshold: 600,
        onDataPruned: (prunedRowCount: number, virtualOffset: number) => {
          // Pruning handled silently
        },
      },
      onLoadMoreRows: async (currentRowCount: number) => {
        try {
          const BATCH_SIZE = 100;
          const page = Math.floor(currentRowCount / BATCH_SIZE) + 1;

          const response = await fetch(
            `http://localhost:3003/api/employees?page=${page}&pageSize=${BATCH_SIZE}`
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (!result.pagination.hasNextPage || result.data.length === 0) {
            self.totalRowsLoaded += result.data.length;

            const newRows = result.data.map((emp: any) => [
              emp.id,
              emp.name,
              emp.department,
              emp.salary,
              emp.years,
              emp.status,
              emp.email,
              emp.phone,
              emp.score,
              emp.notes,
            ]);

            return newRows;
          }

          self.totalRowsLoaded += result.data.length;

          const newRows = result.data.map((emp: any) => [
            emp.id,
            emp.name,
            emp.department,
            emp.salary,
            emp.years,
            emp.status,
            emp.email,
            emp.phone,
            emp.score,
            emp.notes,
          ]);

          return newRows;
        } catch (error) {
          console.error('Failed to load data from server:', error);
          alert('Failed to load data from server.\n\nMake sure the server is running:\nnpm run server\n\nOr use the local data mode instead.');
          return [];
        }
      },
    });

    const newGrid = new Grid(this.context.container, gridConfig);
    newGrid.setData(data);
    newGrid.render();

    alert('Infinite Scrolling: ON\n\nFetching data from server (http://localhost:3003)\n\nStarting with 100 rows.\nScroll to bottom to load more data (100 rows at a time).\n\nTotal available: 10,000 rows from server.\n\nMake sure server is running: npm run server');

    return newGrid;
  }
}
