import { Grid } from '../../../packages/core/src/grid';
import '../../../packages/core/src/features/loading/loading.styles.css';
import '../../../packages/core/src/features/column-resize/column-resize.styles.css';
import { PaginationDemo } from './pagination-demo';

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

  // Update cache stats if available
  if (stats.cacheStats) {
    const cacheHitRate = (stats.cacheStats.hitRate * 100).toFixed(1);
    const cacheSize = `${stats.cacheStats.size}/${stats.cacheStats.capacity}`;
    document.getElementById('stat-cache')!.textContent = `${cacheHitRate}% (${cacheSize})`;
  }
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

  console.log(`🚀 Initializing ZenGrid with ${ROW_COUNT.toLocaleString()} rows...`);

  // Generate initial data
  let data = generateData(ROW_COUNT, COL_COUNT);
  console.log(`✅ Generated ${(data.length * data[0].length).toLocaleString()} cells`);

  // Operation mode state - configure frontend/backend for each operation
  let dataMode: 'frontend' | 'backend' = 'frontend';  // Data loading mode
  let sortMode: 'frontend' | 'backend' = 'frontend';  // Sort mode
  let filterMode: 'frontend' | 'backend' = 'frontend'; // Filter mode

  // Loading template state
  let loadingTemplate: 'simple' | 'animated' | 'modern' | 'skeleton' | 'overlay' = 'modern';

  // Define columns with configurable widths and resize constraints
  const columns = [
    { field: 'id', header: 'ID', width: 80, renderer: 'number', sortable: true, minWidth: 50, maxWidth: 150 },
    { field: 'name', header: 'Name', width: 200, renderer: 'text', sortable: true, minWidth: 100, maxWidth: 400 },
    { field: 'department', header: 'Department', width: 150, renderer: 'text', sortable: true, minWidth: 100 },
    { field: 'salary', header: 'Salary', width: 120, renderer: 'number', sortable: true, minWidth: 80, maxWidth: 200 },
    { field: 'years', header: 'Years', width: 80, renderer: 'number', sortable: true, minWidth: 60 },
    { field: 'status', header: 'Status', width: 100, renderer: 'text', sortable: true, minWidth: 80 },
    { field: 'email', header: 'Email', width: 220, renderer: 'text', sortable: true, minWidth: 150, maxWidth: 350 },
    { field: 'phone', header: 'Phone', width: 140, renderer: 'text', sortable: true, minWidth: 100 },
    { field: 'score', header: 'Score', width: 80, renderer: 'number', sortable: true, minWidth: 60 },
    { field: 'notes', header: 'Notes', width: 300, renderer: 'text', sortable: true, minWidth: 150, maxWidth: 500 },
  ];

  // Extract column widths for variable width provider
  const columnWidths = columns.map(col => col.width);

  // Render headers (application level)
  const headerCanvas = document.getElementById('grid-header-canvas');
  const headerCells: HTMLElement[] = [];

  if (headerCanvas) {
    let xOffset = 0;
    columns.forEach((col, idx) => {
      const headerCell = document.createElement('div');
      headerCell.className = 'grid-header-cell';
      headerCell.style.left = `${xOffset}px`;
      headerCell.style.width = `${col.width}px`;
      headerCell.style.height = `${ROW_HEIGHT}px`;

      // Create header content with sort indicator
      const headerContent = document.createElement('span');
      headerContent.textContent = col.header;
      headerCell.appendChild(headerContent);

      const sortIndicator = document.createElement('span');
      sortIndicator.className = 'sort-indicator';
      sortIndicator.textContent = '';
      headerCell.appendChild(sortIndicator);

      if (col.sortable) {
        headerCell.classList.add('sortable');
        headerCell.addEventListener('click', () => {
          console.log(`🔄 Sorting by column: ${col.field} (index: ${idx})`);
          const start = performance.now();

          // Toggle sort on the grid
          grid.toggleSort(idx);

          // Update header indicators
          updateHeaderSortIndicators();

          const time = performance.now() - start;
          console.log(`✅ Sort completed in ${time.toFixed(2)}ms`);
          updateStats(grid, time);
        });
      }

      headerCanvas.appendChild(headerCell);
      headerCells.push(headerCell);
      xOffset += col.width;
    });
    headerCanvas.style.width = `${xOffset}px`;
  }

  // Function to update header sort indicators
  function updateHeaderSortIndicators() {
    const sortIcons = grid.getSortIcons();

    headerCells.forEach((headerCell, idx) => {
      const sortIndicator = headerCell.querySelector('.sort-indicator');
      if (!sortIndicator) return;

      const sortDirection = grid.getColumnSort(idx);

      // Remove all sort classes
      headerCell.classList.remove('sorted-asc', 'sorted-desc');

      // Update indicator using configured icons
      if (sortDirection === 'asc') {
        sortIndicator.textContent = ` ${sortIcons.asc}`;
        headerCell.classList.add('sorted-asc');
      } else if (sortDirection === 'desc') {
        sortIndicator.textContent = ` ${sortIcons.desc}`;
        headerCell.classList.add('sorted-desc');
      } else {
        sortIndicator.textContent = '';
      }
    });
  }

  // Function to update header widths after column resize
  function updateHeaderWidths(widths: number[]) {
    if (!headerCanvas) return;

    let xOffset = 0;
    headerCells.forEach((headerCell, idx) => {
      const newWidth = widths[idx];
      headerCell.style.left = `${xOffset}px`;
      headerCell.style.width = `${newWidth}px`;
      xOffset += newWidth;
    });
    headerCanvas.style.width = `${xOffset}px`;

    console.log(`📏 Header widths updated:`, widths);
  }

  // Conditional sort handler - delegates based on current sortMode
  async function handleSortRequest(sortState: any[]): Promise<void> {
    // In frontend mode, this handler won't be called (auto mode detects undefined handler)
    // In backend mode, perform server-side sorting
    if (sortMode !== 'backend') return;

    console.log('🔄 Backend sort requested:', sortState);

    if (sortState.length === 0) {
      // No sort - restore original order
      data = generateData(ROW_COUNT, COL_COUNT);
      grid.setData(data);
      grid.refresh();
      return;
    }

    const { column, direction } = sortState[0];

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Perform sorting on the data
    const sortedData = [...data].sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];

      if (aVal === bVal) return 0;

      let result = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        result = aVal - bVal;
      } else {
        result = String(aVal).localeCompare(String(bVal));
      }

      return direction === 'asc' ? result : -result;
    });

    // Update data and refresh grid
    data = sortedData;
    grid.setData(data);
    grid.refresh();

    console.log('✅ Backend sort completed');
  }

  // Create grid with variable column widths
  console.time('Grid Initialization');
  let gridRef: Grid | null = null; // Forward reference for scroll handler
  const grid = new Grid(container, {
    rowCount: ROW_COUNT,
    colCount: COL_COUNT,
    rowHeight: ROW_HEIGHT,
    colWidth: columnWidths, // Use array for variable widths
    columns,
    enableSelection: true,
    enableMultiSelection: true,
    enableKeyboardNavigation: true,
    overscanRows: 5,
    overscanCols: 2,
    // Enable renderer cache for performance
    rendererCache: {
      enabled: true,
      capacity: 1000,
      trackStats: true,
    },
    // Configurable sort icons (defaults: asc='▲', desc='▼')
    // Uncomment to customize:
    // sortIcons: {
    //   asc: '↑',
    //   desc: '↓',
    // },
    // Operation Modes - unified pattern for frontend/backend operations
    dataMode: dataMode,
    sortMode: sortMode,
    filterMode: filterMode,
    // Backend handlers (only used when respective mode is 'backend' or 'auto')
    onSortRequest: sortMode === 'backend' ? handleSortRequest : undefined,
    // Loading indicator configuration
    loading: {
      enabled: true,
      template: loadingTemplate,
      message: 'Loading data...',
      minDisplayTime: 500, // Show for at least 500ms to prevent flashing
      position: 'center',
      showOverlay: true,
      overlayOpacity: 0.5,
    },
    // Column Resize Configuration
    enableColumnResize: true,
    columnResize: {
      resizeZoneWidth: 6,        // Detection zone width
      defaultMinWidth: 30,        // Global minimum
      defaultMaxWidth: 600,       // Global maximum
      autoFitSampleSize: 100,     // Sample 100 rows for auto-fit
      autoFitPadding: 16,         // Add 16px padding to auto-fit
      showHandles: true,          // Show visual resize handles
      showPreview: true,          // Show preview line during drag
    },
    // Sync header scrolling
    onScroll: (scrollTop, scrollLeft) => {
      if (headerCanvas) {
        headerCanvas.style.transform = `translateX(-${scrollLeft}px)`;
      }
      // Update resize handle positions on scroll
      if (gridRef) {
        gridRef.updateColumnResizeHandles();
      }
    },
    // Column width persistence
    onColumnWidthsChange: (widths) => {
      console.log('💾 Column widths changed:', widths);
      localStorage.setItem('zengrid-column-widths', JSON.stringify(widths));
      updateHeaderWidths(widths);
    },
  });
  gridRef = grid; // Set the reference for the scroll handler
  console.timeEnd('Grid Initialization');

  // Set data
  console.time('Set Data');
  grid.setData(data);
  console.timeEnd('Set Data');

  // Initial render (this initializes the resize manager)
  console.time('Initial Render');
  const renderStart = performance.now();
  grid.render();
  const renderTime = performance.now() - renderStart;
  console.timeEnd('Initial Render');

  // Attach column resize to header (IMPORTANT: do this AFTER render)
  if (headerCanvas) {
    grid.attachColumnResize(headerCanvas);
    console.log('✅ Column resize attached to header');
  }

  console.log(`✅ Initial render took ${renderTime.toFixed(2)}ms`);

  // Update stats
  updateStats(grid, renderTime);

  // Update mode indicator
  const modeIndicator = document.getElementById('mode-indicator')!;
  const actualDataMode = grid.getDataMode();
  const actualSortMode = grid.getSortMode();
  modeIndicator.textContent = `Data: ${actualDataMode.toUpperCase()}, Sort: ${actualSortMode.toUpperCase()}, Filter: ${filterMode.toUpperCase()}`;
  console.log(`📋 Operation Modes - Data: ${actualDataMode}, Sort: ${actualSortMode}, Filter: ${filterMode}`);

  // Initialize FPS monitor
  const fpsElement = document.getElementById('fps-monitor')!;
  const fpsMonitor = new FPSMonitor(fpsElement);

  // Column resize event listeners
  grid.on('column:resize', (event) => {
    console.log(`📏 Column ${event.column} resized: ${event.oldWidth}px → ${event.newWidth}px`);
  });

  // Initialize Pagination Demo
  const paginationDemo = new PaginationDemo(grid);

  // Pagination toggle button
  document.getElementById('btn-toggle-pagination')!.addEventListener('click', async () => {
    if (paginationDemo.isEnabled()) {
      paginationDemo.disable();
      // Reload local data
      data = generateData(ROW_COUNT, COL_COUNT);
      grid.setData(data);
      grid.refresh();
      alert('Pagination Mode: OFF\n\nSwitched back to local 100K rows in memory.');
    } else {
      await paginationDemo.enable();
      alert('Pagination Mode: ON\n\nNow loading data from mock server (http://localhost:3003)\n\nMake sure the server is running:\npnpm server\n\nTotal records: 10,000');
    }
  });

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

  // Column resize buttons
  document.getElementById('btn-auto-fit-all')!.addEventListener('click', () => {
    console.log('↔️ Auto-fitting all columns...');
    const start = performance.now();
    grid.autoFitAllColumns();
    const time = performance.now() - start;
    console.log(`✅ Auto-fit completed in ${time.toFixed(2)}ms`);
  });

  document.getElementById('btn-reset-widths')!.addEventListener('click', () => {
    console.log('⟲ Resetting column widths to defaults...');
    const defaultWidths = columns.map(col => col.width);
    defaultWidths.forEach((width, col) => {
      grid.resizeColumn(col, width);
    });
    localStorage.removeItem('zengrid-column-widths');
    console.log('✅ Column widths reset to defaults');
  });

  // Mode toggle button - shows current modes and explains how to change
  const modeBtnElement = document.getElementById('btn-toggle-sort-mode')!;
  modeBtnElement.textContent = `Modes: ${actualDataMode.charAt(0).toUpperCase() + actualDataMode.slice(1)}`;
  modeBtnElement.addEventListener('click', () => {
    const modes = `
📋 Current Operation Modes:
━━━━━━━━━━━━━━━━━━━━━━━
Data:   ${actualDataMode.toUpperCase()}
Sort:   ${actualSortMode.toUpperCase()}
Filter: ${filterMode.toUpperCase()}

ℹ️  To change modes:
1. Edit src/main.ts (lines 163-165)
2. Change variable values:
   - dataMode: 'frontend' | 'backend'
   - sortMode: 'frontend' | 'backend'
   - filterMode: 'frontend' | 'backend'
3. Refresh the page

📖 Mode Descriptions:

FRONTEND MODE:
• Data: All loaded in memory
• Sort: Fast in-memory using IndexMap
• Filter: In-memory filtering
• Best for: Datasets that fit in memory

BACKEND MODE:
• Data: Loaded on-demand
• Sort: Server-side sorting
• Filter: Server-side filtering
• Best for: Large datasets, pagination
    `.trim();

    console.log(modes);
    alert(modes);
  });

  // Loading template selector
  const loadingTemplateSelect = document.getElementById('loading-template-select') as HTMLSelectElement;
  loadingTemplateSelect.addEventListener('change', (e) => {
    loadingTemplate = (e.target as HTMLSelectElement).value as any;
    console.log(`🎨 Loading template changed to: ${loadingTemplate}`);

    // Update the loading indicator template immediately
    if ((grid as any).loadingIndicator) {
      (grid as any).loadingIndicator.updateConfig({
        template: loadingTemplate,
      });
    }
  });

  // Simulate load button - demonstrates loading indicator
  document.getElementById('btn-simulate-load')!.addEventListener('click', async () => {
    console.log('🔄 Simulating data load...');

    // Step 1: Clear the grid
    grid.setData([]);
    grid.refresh();
    console.log('📭 Grid cleared');

    // Step 2: Show loading indicator
    (grid as any).events.emit('loading:start', {
      timestamp: Date.now(),
      message: `Loading with ${loadingTemplate} template...`,
    });

    // Step 3: Simulate async operation (e.g., API call)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Reload the data
    console.log('📥 Reloading data...');
    grid.setData(data);
    grid.refresh();

    // Step 5: Complete the load
    (grid as any).events.emit('loading:end', {
      timestamp: Date.now(),
      duration: 2000,
    });

    // Update stats
    const renderTime = performance.now();
    updateStats(grid, renderTime);

    console.log('✅ Simulated load complete - data restored');
  });

  // Periodic stats update
  setInterval(() => {
    const stats = grid.getStats();
    document.getElementById('stat-visible')!.textContent = stats.visibleCells.toLocaleString();
    document.getElementById('stat-pooled')!.textContent = `${stats.poolStats.active}/${stats.poolStats.total}`;

    // Update cache stats
    if (stats.cacheStats) {
      const cacheHitRate = (stats.cacheStats.hitRate * 100).toFixed(1);
      const cacheSize = `${stats.cacheStats.size}/${stats.cacheStats.capacity}`;
      document.getElementById('stat-cache')!.textContent = `${cacheHitRate}% (${cacheSize})`;
    }
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
  console.log('\n📏 Column Resize Features:');
  console.log('   - Drag column borders to resize');
  console.log('   - Double-click column border to auto-fit to content');
  console.log('   - Click "Auto-Fit All" to auto-fit all columns');
  console.log('   - Click "Reset Widths" to restore default widths');
  console.log('   - Column widths are persisted to localStorage');

  // ==================== FILTER UI ====================
  setupFilterUI(grid, columns);
}

/**
 * Setup Filter UI
 */
function setupFilterUI(grid: Grid, columns: any[]) {
  const filterPanel = document.getElementById('filter-panel')!;
  const filterRowsContainer = document.getElementById('filter-rows')!;
  const btnToggleFilter = document.getElementById('btn-toggle-filter')!;
  const btnAddFilter = document.getElementById('btn-add-filter')!;
  const btnApplyFilters = document.getElementById('btn-apply-filters')!;
  const btnClearFilters = document.getElementById('btn-clear-filters')!;
  const filterPreview = document.getElementById('filter-preview')!;
  const filterPreviewContent = document.getElementById('filter-preview-content')!;
  const filterWarning = document.getElementById('filter-warning')!;
  const filterWarningContent = document.getElementById('filter-warning-content')!;

  // Operator definitions
  const operators = [
    { value: 'equals', label: 'Equals (=)', requiresValue: true },
    { value: 'notEquals', label: 'Not Equals (≠)', requiresValue: true },
    { value: 'greaterThan', label: 'Greater Than (>)', requiresValue: true },
    { value: 'greaterThanOrEqual', label: 'Greater Than Or Equal (≥)', requiresValue: true },
    { value: 'lessThan', label: 'Less Than (<)', requiresValue: true },
    { value: 'lessThanOrEqual', label: 'Less Than Or Equal (≤)', requiresValue: true },
    { value: 'contains', label: 'Contains', requiresValue: true },
    { value: 'notContains', label: 'Does Not Contain', requiresValue: true },
    { value: 'startsWith', label: 'Starts With', requiresValue: true },
    { value: 'endsWith', label: 'Ends With', requiresValue: true },
    { value: 'blank', label: 'Is Empty', requiresValue: false },
    { value: 'notBlank', label: 'Is Not Empty', requiresValue: false },
  ];

  let filterCounter = 0;
  const activeFilters: Map<number, { column: number; operator: string; value: any; logicToNext?: 'AND' | 'OR' }> = new Map();

  // Toggle filter panel
  btnToggleFilter.addEventListener('click', () => {
    filterPanel.classList.toggle('expanded');
    const isExpanded = filterPanel.classList.contains('expanded');
    btnToggleFilter.textContent = isExpanded ? '🔽 Hide Filters' : '🔍 Filters';

    // Update grid viewport after panel animation completes
    setTimeout(() => {
      grid.updateViewport();
    }, 350); // Wait for CSS transition (300ms + 50ms buffer)
  });

  // Add logic connector between filters
  function addLogicConnector(filterId: number) {
    const connector = document.createElement('div');
    connector.className = 'logic-connector';
    connector.dataset.connectorId = String(filterId);

    const line1 = document.createElement('div');
    line1.className = 'logic-line';

    const toggle = document.createElement('div');
    toggle.className = 'logic-toggle';
    toggle.innerHTML = `
      <input type="radio" id="logic-and-${filterId}" name="logic-${filterId}" value="AND" checked>
      <label for="logic-and-${filterId}">AND</label>
      <input type="radio" id="logic-or-${filterId}" name="logic-${filterId}" value="OR">
      <label for="logic-or-${filterId}">OR</label>
    `;

    const line2 = document.createElement('div');
    line2.className = 'logic-line';

    connector.appendChild(line1);
    connector.appendChild(toggle);
    connector.appendChild(line2);

    // Add event listener to update filter logic
    toggle.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const logic = (radio as HTMLInputElement).value as 'AND' | 'OR';
        const filter = activeFilters.get(filterId);
        if (filter) {
          filter.logicToNext = logic;
        }
      });
    });

    return connector;
  }

  // Add filter row
  function addFilterRow() {
    const filterId = filterCounter++;

    // Add logic connector before this row (except for first row)
    if (filterId > 0) {
      const prevFilterId = filterId - 1;
      const connector = addLogicConnector(prevFilterId);
      filterRowsContainer.appendChild(connector);
    }

    const filterRow = document.createElement('div');
    filterRow.className = 'filter-row';
    filterRow.dataset.filterId = String(filterId);

    // Add filter row index badge
    const indexBadge = document.createElement('div');
    indexBadge.className = 'filter-row-index';
    indexBadge.textContent = String(filterId + 1);
    filterRow.appendChild(indexBadge);

    // Column select
    const columnSelect = document.createElement('select');
    columnSelect.innerHTML = columns.map((col, idx) =>
      `<option value="${idx}">${col.header}</option>`
    ).join('');

    // Operator select
    const operatorSelect = document.createElement('select');
    operatorSelect.innerHTML = operators.map(op =>
      `<option value="${op.value}">${op.label}</option>`
    ).join('');

    // Value input
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = 'Enter value...';

    // Update value input visibility based on operator
    const updateValueInput = () => {
      const selectedOp = operators.find(op => op.value === operatorSelect.value);
      if (selectedOp && !selectedOp.requiresValue) {
        valueInput.disabled = true;
        valueInput.placeholder = 'No value needed';
        valueInput.value = '';
      } else {
        valueInput.disabled = false;
        valueInput.placeholder = 'Enter value...';
      }
    };

    operatorSelect.addEventListener('change', updateValueInput);
    updateValueInput();

    // Remove button
    const removeButton = document.createElement('button');
    removeButton.textContent = '✕';
    removeButton.addEventListener('click', () => {
      // Remove the logic connector before this row if it exists
      const connector = filterRowsContainer.querySelector(`[data-connector-id="${filterId - 1}"]`);
      if (connector) {
        connector.remove();
      }
      // Remove the logic connector after this row if it exists
      const nextConnector = filterRowsContainer.querySelector(`[data-connector-id="${filterId}"]`);
      if (nextConnector) {
        nextConnector.remove();
      }
      filterRow.remove();
      activeFilters.delete(filterId);
    });

    // Store filter data
    const storeFilter = () => {
      const selectedOp = operators.find(op => op.value === operatorSelect.value);
      let value = valueInput.value;

      // Type conversion based on column
      const colIndex = parseInt(columnSelect.value);
      const column = columns[colIndex];

      // Auto-convert numbers for number columns
      if (column.renderer === 'number' && value && !isNaN(Number(value))) {
        value = Number(value);
      }

      activeFilters.set(filterId, {
        column: colIndex,
        operator: operatorSelect.value,
        value: selectedOp && selectedOp.requiresValue ? value : undefined,
        logicToNext: 'AND', // Default to AND
      });
    };

    columnSelect.addEventListener('change', storeFilter);
    operatorSelect.addEventListener('change', storeFilter);
    valueInput.addEventListener('input', storeFilter);

    // Initial store
    storeFilter();

    filterRow.appendChild(columnSelect);
    filterRow.appendChild(operatorSelect);
    filterRow.appendChild(valueInput);
    filterRow.appendChild(removeButton);

    filterRowsContainer.appendChild(filterRow);
  }

  // Add initial filter row
  addFilterRow();

  btnAddFilter.addEventListener('click', () => {
    addFilterRow();
  });

  // Apply filters with advanced per-condition logic
  btnApplyFilters.addEventListener('click', () => {
    console.log('🔍 Applying filters with advanced logic...');

    // Clear existing filters
    grid.clearFilters();

    // Convert activeFilters to array and sort by ID to maintain order
    const filterArray = Array.from(activeFilters.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([id, filter]) => ({ id, ...filter }));

    if (filterArray.length === 0) {
      console.log('   No filters to apply');
      filterPreview.style.display = 'none';
      return;
    }

    // Group consecutive conditions by column with their logic
    const columnGroups = new Map<number, Array<{ operator: string; value: any; logic?: 'AND' | 'OR' }>>();

    for (let i = 0; i < filterArray.length; i++) {
      const filter = filterArray[i];
      const column = filter.column;

      if (!columnGroups.has(column)) {
        columnGroups.set(column, []);
      }

      columnGroups.get(column)!.push({
        operator: filter.operator,
        value: filter.value,
        logic: filter.logicToNext,
      });
    }

    // Detect impossible filter combinations
    const warnings: string[] = [];

    for (let i = 0; i < filterArray.length - 1; i++) {
      const current = filterArray[i];
      const next = filterArray[i + 1];
      const logic = current.logicToNext || 'AND';

      // Check for same column
      if (current.column === next.column) {
        const columnName = columns[current.column]?.header || `Column ${current.column}`;

        // Case 1: Same column, equals operator, different values, AND logic
        if (
          current.operator === 'equals' &&
          next.operator === 'equals' &&
          current.value !== next.value &&
          logic === 'AND'
        ) {
          warnings.push(
            `<strong>${columnName}</strong> cannot equal both <strong>${current.value}</strong> AND <strong>${next.value}</strong>. ` +
            `<br/>💡 <strong>Suggestion:</strong> Change the logic between these conditions to <strong>OR</strong> to show rows where ${columnName} is either value.`
          );
        }

        // Case 2: Contradictory range (e.g., > 100 AND < 50)
        if (
          (current.operator === 'greaterThan' || current.operator === 'greaterThanOrEqual') &&
          (next.operator === 'lessThan' || next.operator === 'lessThanOrEqual') &&
          logic === 'AND' &&
          Number(current.value) > Number(next.value)
        ) {
          warnings.push(
            `<strong>${columnName}</strong> cannot be greater than <strong>${current.value}</strong> AND less than <strong>${next.value}</strong>. ` +
            `<br/>💡 <strong>Suggestion:</strong> Check your values - the range is inverted.`
          );
        }

        // Case 3: Same condition repeated with AND (redundant)
        if (
          current.operator === next.operator &&
          current.value === next.value &&
          logic === 'AND'
        ) {
          warnings.push(
            `<strong>${columnName}</strong> has duplicate condition: <strong>${current.operator} ${current.value}</strong>. ` +
            `<br/>💡 <strong>Suggestion:</strong> Remove one of the duplicate filters.`
          );
        }
      }
    }

    // Show warnings if any
    if (warnings.length > 0) {
      filterWarningContent.innerHTML = warnings.map(w => `<div style="margin-bottom: 0.75rem;">${w}</div>`).join('');
      filterWarning.style.display = 'block';
      console.warn('⚠️ Impossible filter combinations detected:');
      warnings.forEach((w, i) => console.warn(`   ${i + 1}. ${w.replace(/<[^>]*>/g, '')}`));
    } else {
      filterWarning.style.display = 'none';
    }

    // Build preview showing the actual filter chain
    console.log('📊 Filter Chain:');
    let previewHTML = '<div style="margin-bottom: 0.5rem;"><strong>Filter Chain:</strong></div>';
    let previewText = '';

    for (let i = 0; i < filterArray.length; i++) {
      const filter = filterArray[i];
      const columnName = columns[filter.column]?.header || `Column ${filter.column}`;
      const operatorLabel = operators.find(op => op.value === filter.operator)?.label || filter.operator;
      const valueStr = filter.value !== undefined ? String(filter.value) : '';

      const conditionText = `${columnName} ${operatorLabel} ${valueStr}`;
      console.log(`   ${i + 1}. ${conditionText}`);

      previewText += conditionText;
      previewHTML += `<div style="margin-left: 1rem;">${conditionText}</div>`;

      if (i < filterArray.length - 1) {
        const logic = filter.logicToNext || 'AND';
        console.log(`      ${logic}`);
        previewHTML += `<div style="margin-left: 2rem; font-weight: 600; color: #0c5460;">${logic}</div>`;
        previewText += ` ${logic} `;
      }
    }

    filterPreviewContent.innerHTML = previewHTML;
    filterPreview.style.display = 'block';

    // Apply filters: group consecutive same-column conditions with consistent logic
    const appliedColumns = new Set<number>();

    for (const [column, conditions] of columnGroups) {
      if (appliedColumns.has(column)) continue;

      // Determine the dominant logic for this column (use first logic found)
      const logic = conditions.find(c => c.logic)?.logic || 'AND';

      console.log(`   Applying ${conditions.length} condition(s) on column ${column} with ${logic} logic`);

      // Remove logic property before passing to setColumnFilter
      const cleanConditions = conditions.map(({ logic, ...rest }) => rest);

      (grid as any).filterManager.setColumnFilter(column, cleanConditions, logic);
      appliedColumns.add(column);
    }

    // Trigger the same refresh logic as setFilter
    if ((grid as any).filterManager) {
      (grid as any).state.filterState = (grid as any).filterManager.getFilterState();

      // Get visible rows and update cache
      (grid as any).cachedVisibleRows = (grid as any).filterManager.getVisibleRows((grid as any).options.rowCount);
      console.log(`🔍 Filter applied: ${(grid as any).cachedVisibleRows.length} of ${(grid as any).options.rowCount} rows visible`);

      // Re-apply sort if active
      if ((grid as any).sortManager && (grid as any).state.sortState.length > 0) {
        console.log('🔄 Re-applying sort to filtered rows...');
        const currentSort = (grid as any).state.sortState;
        const SortManager = (grid as any).sortManager.constructor;
        (grid as any).sortManager = new SortManager({
          rowCount: (grid as any).cachedVisibleRows.length,
          getValue: (row: number, col: number) => {
            const dataRow = (grid as any).cachedVisibleRows[row];
            return (grid as any).dataAccessor?.getValue(dataRow, col);
          },
          sortMode: (grid as any).options.sortMode,
          onSortRequest: (grid as any).options.onSortRequest,
          events: (grid as any).events,
        });
        (grid as any).sortManager.setSortState(currentSort);
      }

      // Refresh the grid
      grid.refresh();

      // Emit filter:export event
      const fieldState = (grid as any).filterManager.getFieldFilterState();
      if (fieldState) {
        const exports = (grid as any).filterManager.getFilterExport();
        if (exports) {
          (grid as any).events.emit('filter:export', exports);
        }
      }
    }

    console.log(`✅ Applied filters on ${filtersByColumn.size} column(s)`);
  });

  // Clear all filters
  btnClearFilters.addEventListener('click', () => {
    console.log('🗑️ Clearing all filters...');
    grid.clearFilters();
    filterRowsContainer.innerHTML = '';
    activeFilters.clear();
    filterCounter = 0;
    addFilterRow();
    updateFilterExports(null);
    filterPreview.style.display = 'none';
    filterWarning.style.display = 'none';
    console.log('✅ All filters cleared');
  });

  // Listen to filter:export event
  grid.on('filter:export', (event) => {
    console.log('📤 Filter Export Event:', event);
    updateFilterExports(event);
  });

  // Update export displays
  function updateFilterExports(event: any) {
    const exportRest = document.getElementById('export-rest')!;
    const exportGraphQL = document.getElementById('export-graphql')!;
    const exportSQL = document.getElementById('export-sql')!;

    if (!event || !event.rest || !event.graphql || !event.sql) {
      exportRest.textContent = 'No filters applied';
      exportGraphQL.textContent = 'No filters applied';
      exportSQL.textContent = 'No filters applied';
      return;
    }

    // REST
    const restQuery = event.rest.queryString || 'No filters';
    exportRest.textContent = restQuery.startsWith('?')
      ? `/api/users${restQuery}`
      : restQuery;

    // GraphQL
    exportGraphQL.textContent = JSON.stringify(event.graphql.where, null, 2);

    // SQL
    const sqlText = event.sql.whereClause
      ? `SELECT * FROM users WHERE ${event.sql.whereClause}\n\nParams: ${JSON.stringify(event.sql.positionalParams)}`
      : 'No filters';
    exportSQL.textContent = sqlText;
  }
}

// Start application
main();
