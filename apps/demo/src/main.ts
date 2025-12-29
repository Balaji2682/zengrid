import { Grid } from '../../../packages/core/src/grid';

/**
 * FPS Monitor - Track frames per second during scrolling
 */
class FPSMonitor {
  private frames = 0;
  private lastTime = performance.now();
  private fps = 60;
  private element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
    this.start();
  }

  private start(): void {
    const tick = () => {
      this.frames++;
      const currentTime = performance.now();
      const delta = currentTime - this.lastTime;

      if (delta >= 1000) {
        this.fps = Math.round((this.frames * 1000) / delta);
        this.frames = 0;
        this.lastTime = currentTime;
        this.updateDisplay();
      }

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private updateDisplay(): void {
    this.element.textContent = `FPS: ${this.fps}`;

    // Color code based on performance
    this.element.classList.remove('low-fps', 'medium-fps');
    if (this.fps < 30) {
      this.element.classList.add('low-fps');
    } else if (this.fps < 50) {
      this.element.classList.add('medium-fps');
    }
  }

  getCurrentFPS(): number {
    return this.fps;
  }
}

/**
 * Generate test data - 100K rows x 10 columns
 */
function generateData(rowCount: number, colCount: number): any[][] {
  console.time('Data Generation');

  const data: any[][] = [];
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'];

  for (let row = 0; row < rowCount; row++) {
    const rowData: any[] = [];
    for (let col = 0; col < colCount; col++) {
      switch (col) {
        case 0: // ID
          rowData.push(row + 1);
          break;
        case 1: // Name
          rowData.push(`${names[row % names.length]} #${row}`);
          break;
        case 2: // Department
          rowData.push(departments[row % departments.length]);
          break;
        case 3: // Salary
          rowData.push(50000 + (row % 100000));
          break;
        case 4: // Years
          rowData.push(1 + (row % 30));
          break;
        case 5: // Status
          rowData.push(row % 3 === 0 ? 'Active' : row % 3 === 1 ? 'On Leave' : 'Remote');
          break;
        case 6: // Email
          rowData.push(`user${row}@company.com`);
          break;
        case 7: // Phone
          rowData.push(`+1-555-${String(row).padStart(4, '0')}`);
          break;
        case 8: // Score
          rowData.push((row % 100) + 1);
          break;
        case 9: // Notes
          rowData.push(`Employee record for ID ${row + 1}`);
          break;
        default:
          rowData.push(`Cell ${row},${col}`);
      }
    }
    data.push(rowData);
  }

  console.timeEnd('Data Generation');
  return data;
}

/**
 * Generate random data
 */
function generateRandomData(rowCount: number, colCount: number): any[][] {
  const data: any[][] = [];
  for (let row = 0; row < rowCount; row++) {
    const rowData: any[] = [];
    for (let col = 0; col < colCount; col++) {
      rowData.push(Math.random() > 0.5 ? Math.floor(Math.random() * 10000) : `Rand ${Math.random().toFixed(4)}`);
    }
    data.push(rowData);
  }
  return data;
}

/**
 * Update statistics display
 */
function updateStats(grid: Grid, renderTime: number) {
  const stats = grid.getStats();

  document.getElementById('stat-rows')!.textContent = stats.rowCount.toLocaleString();
  document.getElementById('stat-visible')!.textContent = stats.visibleCells.toLocaleString();
  document.getElementById('stat-pooled')!.textContent = `${stats.poolStats.active}/${stats.poolStats.total}`;
  document.getElementById('stat-render')!.textContent = `${renderTime.toFixed(2)}ms`;
}

/**
 * Main application
 */
function main() {
  const container = document.getElementById('grid-container');
  if (!container) {
    console.error('Grid container not found');
    return;
  }

  // Configuration
  const ROW_COUNT = 100_000;
  const COL_COUNT = 10;
  const ROW_HEIGHT = 32;
  const COL_WIDTH = 150;

  console.log(`🚀 Initializing ZenGrid with ${ROW_COUNT.toLocaleString()} rows...`);

  // Generate initial data
  const data = generateData(ROW_COUNT, COL_COUNT);
  console.log(`✅ Generated ${(data.length * data[0].length).toLocaleString()} cells`);

  // Define columns
  const columns = [
    { field: 'id', header: 'ID', width: 80, renderer: 'number', sortable: true },
    { field: 'name', header: 'Name', width: 200, renderer: 'text', sortable: true },
    { field: 'department', header: 'Department', width: 150, renderer: 'text', sortable: true },
    { field: 'salary', header: 'Salary', width: 120, renderer: 'number', sortable: true },
    { field: 'years', header: 'Years', width: 80, renderer: 'number', sortable: true },
    { field: 'status', header: 'Status', width: 100, renderer: 'text', sortable: true },
    { field: 'email', header: 'Email', width: 220, renderer: 'text' },
    { field: 'phone', header: 'Phone', width: 140, renderer: 'text' },
    { field: 'score', header: 'Score', width: 80, renderer: 'number', sortable: true },
    { field: 'notes', header: 'Notes', width: 300, renderer: 'text' },
  ];

  // Create grid
  console.time('Grid Initialization');
  const grid = new Grid(container, {
    rowCount: ROW_COUNT,
    colCount: COL_COUNT,
    rowHeight: ROW_HEIGHT,
    colWidth: COL_WIDTH,
    columns,
    enableSelection: true,
    enableMultiSelection: true,
    enableKeyboardNavigation: true,
    overscanRows: 5,
    overscanCols: 2,
  });
  console.timeEnd('Grid Initialization');

  // Set data
  console.time('Set Data');
  grid.setData(data);
  console.timeEnd('Set Data');

  // Initial render
  console.time('Initial Render');
  const renderStart = performance.now();
  grid.render();
  const renderTime = performance.now() - renderStart;
  console.timeEnd('Initial Render');

  console.log(`✅ Initial render took ${renderTime.toFixed(2)}ms`);

  // Update stats
  updateStats(grid, renderTime);

  // Initialize FPS monitor
  const fpsElement = document.getElementById('fps-monitor')!;
  const fpsMonitor = new FPSMonitor(fpsElement);

  // Button handlers
  document.getElementById('btn-refresh')!.addEventListener('click', () => {
    console.log('🔄 Refreshing grid...');
    const start = performance.now();
    grid.refresh();
    const time = performance.now() - start;
    console.log(`✅ Refresh took ${time.toFixed(2)}ms`);
    updateStats(grid, time);
  });

  document.getElementById('btn-random')!.addEventListener('click', () => {
    console.log('🎲 Generating random data...');
    const randomData = generateRandomData(ROW_COUNT, COL_COUNT);
    const start = performance.now();
    grid.setData(randomData);
    grid.refresh();
    const time = performance.now() - start;
    console.log(`✅ Random data set in ${time.toFixed(2)}ms`);
    updateStats(grid, time);
  });

  document.getElementById('btn-scroll-top')!.addEventListener('click', () => {
    grid.scrollToCell(0, 0);
  });

  document.getElementById('btn-scroll-bottom')!.addEventListener('click', () => {
    grid.scrollToCell(ROW_COUNT - 1, 0);
  });

  document.getElementById('btn-scroll-middle')!.addEventListener('click', () => {
    grid.scrollToCell(Math.floor(ROW_COUNT / 2), 0);
  });

  // Periodic stats update
  setInterval(() => {
    const stats = grid.getStats();
    document.getElementById('stat-visible')!.textContent = stats.visibleCells.toLocaleString();
    document.getElementById('stat-pooled')!.textContent = `${stats.poolStats.active}/${stats.poolStats.total}`;
  }, 500);

  // Log performance metrics
  console.log('📊 Performance Metrics:');
  console.log(`   - Total Rows: ${ROW_COUNT.toLocaleString()}`);
  console.log(`   - Total Cells: ${(ROW_COUNT * COL_COUNT).toLocaleString()}`);
  console.log(`   - Initial Render: ${renderTime.toFixed(2)}ms`);
  console.log(`   - Target: < 100ms ✅`);
  console.log(`   - FPS: Monitoring in real-time...`);

  // Memory usage (if available)
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log(`   - Used Memory: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Total Memory: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
  }

  console.log('\n🎉 ZenGrid Demo Ready!');
  console.log('Try scrolling to see the virtual scrolling in action.');
  console.log('Watch the FPS monitor in the top-right corner.');
}

// Start application
main();
