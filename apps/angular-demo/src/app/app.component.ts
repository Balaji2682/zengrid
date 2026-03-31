import { Component, signal, computed, viewChild, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ZenGridComponent } from '@zengrid/angular';
import type { ColumnDef, GridEvents } from '@zengrid/angular';
import {
  CheckboxRenderer,
  ProgressBarRenderer,
  ButtonRenderer,
  ChipRenderer,
  DateRenderer,
  DateRangeRenderer,
  NumberRenderer,
  DropdownRenderer,
  TextEditor,
  DateEditor,
  DateRangeEditor,
  applyTheme,
  getTheme,
  listThemes,
} from '@zengrid/angular';

// --- Data Generation ---

const TASK_NAMES = [
  'Implement user authentication',
  'Fix memory leak in worker',
  'Add dark mode support',
  'Refactor payment service',
  'Write API documentation',
  'Optimize database queries',
  'Build notification system',
  'Fix mobile layout issues',
  'Add CSV export feature',
  'Implement rate limiting',
  'Create onboarding flow',
  'Fix timezone handling',
  'Add WebSocket support',
  'Improve search relevance',
  'Build admin dashboard',
  'Fix file upload timeout',
  'Add two-factor auth',
  'Implement caching layer',
  'Fix race condition in sync',
  'Add audit logging',
  'Build reporting module',
  'Fix CSS overflow bug',
  'Implement SSO integration',
  'Add batch processing',
  'Fix email template rendering',
  'Implement undo/redo',
  'Add real-time collaboration',
  'Fix scroll jank',
  'Build plugin system',
  'Add data validation layer',
  'Fix infinite re-render loop',
  'Implement lazy loading',
  'Add accessibility labels',
  'Fix CORS configuration',
  'Build CI/CD pipeline',
  'Add error boundary',
  'Fix date picker locale',
  'Implement drag and drop',
  'Add keyboard shortcuts',
  'Fix memory allocation issue',
  'Build feature flag system',
  'Add API versioning',
  'Fix broken pagination',
  'Implement tree shaking',
  'Add performance monitoring',
  'Fix flaky test suite',
  'Build migration tool',
  'Add input sanitization',
  'Fix deadlock in queue',
  'Implement code splitting',
];

const STATUSES = ['Todo', 'In Progress', 'Review', 'Done', 'Blocked'] as const;
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
const ASSIGNEES = [
  'Alice Chen',
  'Bob Martinez',
  'Carol Wu',
  'David Kim',
  'Eva Patel',
  'Frank Liu',
  'Grace Obi',
  'Henry Park',
  'Iris Nakamura',
  'Jake Thompson',
  'Karen Singh',
  'Leo Fernandez',
  'Mia Johnson',
  'Noah Garcia',
  'Olivia Brown',
  'Paul Anderson',
  'Quinn Davis',
  'Rachel Lee',
  'Sam Wilson',
  'Tara Moore',
];
const TAGS_POOL = ['Frontend', 'Backend', 'UX', 'Bug', 'Feature', 'DevOps', 'Security', 'Docs'];

const STATUS_CHIP_COLORS: Record<string, { background: string; color: string }> = {
  Todo: { background: '#f5f5f4', color: '#57534e' },
  'In Progress': { background: '#fef3c7', color: '#92400e' },
  Review: { background: '#ede9fe', color: '#6d28d9' },
  Done: { background: '#dcfce7', color: '#166534' },
  Blocked: { background: '#fee2e2', color: '#991b1b' },
};

function randomDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.floor(Math.random() * offsetDays * 2) - offsetDays);
  return d.toISOString().slice(0, 10);
}

function generateProjectData(count: number): any[][] {
  const data: any[][] = [];
  for (let i = 0; i < count; i++) {
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const priority = PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];
    let progress: number;
    if (status === 'Done') progress = 100;
    else if (status === 'Todo') progress = 0;
    else if (status === 'Blocked') progress = Math.floor(Math.random() * 30);
    else progress = Math.floor(Math.random() * 90) + 10;

    const dueDate = randomDate(30);

    const sprintStart = new Date();
    sprintStart.setDate(sprintStart.getDate() + Math.floor(Math.random() * 14) - 7);
    const sprintEnd = new Date(sprintStart);
    sprintEnd.setDate(sprintEnd.getDate() + 14);
    const sprint = {
      start: sprintStart.toISOString().slice(0, 10),
      end: sprintEnd.toISOString().slice(0, 10),
    };

    const tagCount = Math.floor(Math.random() * 3) + 1;
    const shuffled = [...TAGS_POOL].sort(() => Math.random() - 0.5);
    const tags = shuffled.slice(0, tagCount).map((t) => ({ label: t }));

    data.push([
      status === 'Done', // 0: complete
      `TASK-${String(i + 1).padStart(4, '0')}`, // 1: id
      TASK_NAMES[i % TASK_NAMES.length], // 2: taskName
      [
        {
          label: status,
          color: STATUS_CHIP_COLORS[status].background,
          textColor: STATUS_CHIP_COLORS[status].color,
        },
      ], // 3: status (chip array)
      priority, // 4: priority
      ASSIGNEES[i % ASSIGNEES.length], // 5: assignee
      progress, // 6: progress
      dueDate, // 7: dueDate
      sprint, // 8: sprint
      tags, // 9: tags
      Math.floor(Math.random() * 40) + 1, // 10: hours
      'Edit', // 11: actions
    ]);
  }
  return data;
}

// --- Component ---

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ZenGridComponent, FormsModule],
  template: `
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <svg class="logo-mark" width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="7" fill="#d97706" />
          <path
            d="M7 10h14M7 14h10M7 18h14"
            stroke="#fff"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        <span class="logo-text">ZenGrid</span>
      </div>
      <nav class="sidebar-nav">
        <a class="nav-item active">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect width="7" height="7" x="3" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="3" rx="1" />
            <rect width="7" height="7" x="3" y="14" rx="1" />
            <rect width="7" height="7" x="14" y="14" rx="1" />
          </svg>
          <span>Projects</span>
        </a>
        <a class="nav-item">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polygon
              points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
            />
          </svg>
          <span>Favorites</span>
        </a>
        <a class="nav-item">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Team</span>
        </a>
        <a class="nav-item">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Settings</span>
        </a>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-version">Angular Demo</div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Header -->
      <header class="main-header">
        <div>
          <h1 class="main-title">Project Board</h1>
          <p class="main-subtitle">Track and manage all project tasks</p>
        </div>
        <div class="header-right">
          <label class="theme-label">Theme</label>
          <select
            class="theme-select"
            [ngModel]="selectedTheme()"
            (ngModelChange)="onThemeChange($event)"
          >
            @for (t of themeNames; track t) {
              <option [value]="t">{{ t }}</option>
            }
          </select>
        </div>
      </header>

      <!-- Stats Cards -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-accent stat-accent-total"></div>
          <div class="stat-body">
            <div class="stat-label">Total Tasks</div>
            <div class="stat-value">{{ totalTasks() }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-accent stat-accent-progress"></div>
          <div class="stat-body">
            <div class="stat-label">In Progress</div>
            <div class="stat-value">{{ inProgressCount() }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-accent stat-accent-done"></div>
          <div class="stat-body">
            <div class="stat-label">Completed</div>
            <div class="stat-value">{{ completedCount() }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-accent stat-accent-overdue"></div>
          <div class="stat-body">
            <div class="stat-label">Overdue</div>
            <div class="stat-value">{{ overdueCount() }}</div>
          </div>
        </div>
      </div>

      <!-- Controls Row -->
      <div class="controls-row">
        <div class="search-wrapper">
          <svg
            class="search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            class="quick-filter"
            type="text"
            placeholder="Filter tasks..."
            [ngModel]="filterQuery()"
            (ngModelChange)="onFilterChange($event)"
          />
        </div>
        <div class="controls-right">
          <button class="btn btn-primary" (click)="addTasks()">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Tasks
          </button>
          <button class="btn btn-secondary" (click)="exportCSV()">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Export
          </button>
          <span class="row-count-badge">{{ rowCount() }}</span>
        </div>
      </div>

      <!-- Grid -->
      <div class="grid-container" #gridShell>
        <zen-grid
          class="modern-grid"
          #zenGrid
          [rowCount]="rowCount()"
          [colCount]="columns.length"
          [columns]="columns"
          [data]="gridData()"
          [rowHeight]="44"
          [enableSelection]="true"
          [selectionType]="'row'"
          [enableColumnResize]="true"
          [enableColumnDrag]="true"
          [enableKeyboardNavigation]="true"
          [dataMode]="'frontend'"
          [pagination]="paginationConfig"
        />
      </div>
    </main>
  `,
  styles: [
    `
      :host {
        display: flex;
        height: 100vh;
        overflow: hidden;
        font-family: var(--font-family);
      }

      /* --- Sidebar --- */
      .sidebar {
        width: 240px;
        background: var(--sidebar-bg);
        color: var(--sidebar-text);
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        border-right: 1px solid #27272a;
      }
      .sidebar-logo {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 24px 20px 28px;
      }
      .logo-mark {
        flex-shrink: 0;
      }
      .logo-text {
        font-size: 1.15rem;
        font-weight: 600;
        color: #fafafa;
        letter-spacing: -0.3px;
      }
      .sidebar-nav {
        flex: 1;
        padding: 0 8px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        font-size: 0.875rem;
        font-weight: 450;
        color: var(--sidebar-text);
        cursor: pointer;
        transition: all 0.15s ease;
        text-decoration: none;
        border-radius: 8px;
      }
      .nav-item:hover {
        background: #27272a;
        color: var(--sidebar-text-hover);
      }
      .nav-item.active {
        background: #27272a;
        color: #fafafa;
        font-weight: 500;
      }
      .nav-item.active svg {
        color: var(--sidebar-accent);
      }
      .sidebar-footer {
        padding: 16px 20px;
        border-top: 1px solid #27272a;
      }
      .sidebar-version {
        font-size: 0.7rem;
        color: #52525b;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.8px;
      }

      /* --- Main Content --- */
      .main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        background: var(--bg-color);
        padding: 28px 36px;
        gap: 20px;
        overflow: hidden;
      }

      /* --- Header --- */
      .main-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
      }
      .main-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-main);
        margin: 0;
        letter-spacing: -0.5px;
      }
      .main-subtitle {
        font-size: 0.875rem;
        color: var(--text-muted);
        margin: 4px 0 0;
        font-weight: 400;
      }
      .header-right {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .theme-label {
        font-size: 0.8rem;
        color: var(--text-muted);
        font-weight: 500;
      }
      .theme-select {
        padding: 7px 12px;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        font-size: 0.8rem;
        font-family: var(--font-family);
        background: #fff;
        color: var(--text-main);
        cursor: pointer;
        font-weight: 500;
        outline: none;
        transition: border-color 0.15s;
      }
      .theme-select:hover {
        border-color: #a8a29e;
      }
      .theme-select:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.12);
      }

      /* --- Stat Cards --- */
      .stats-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
      }
      .stat-card {
        background: #fff;
        border-radius: var(--radius-md);
        padding: 0;
        display: flex;
        align-items: stretch;
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--border-color);
        overflow: hidden;
        transition:
          box-shadow 0.2s ease,
          border-color 0.2s ease;
      }
      .stat-card:hover {
        box-shadow: var(--shadow-md);
        border-color: #d6d3d1;
      }
      .stat-accent {
        width: 4px;
        flex-shrink: 0;
      }
      .stat-accent-total {
        background: #18181b;
      }
      .stat-accent-progress {
        background: #d97706;
      }
      .stat-accent-done {
        background: #16a34a;
      }
      .stat-accent-overdue {
        background: #dc2626;
      }
      .stat-body {
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .stat-label {
        font-size: 0.75rem;
        color: var(--text-muted);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-main);
        letter-spacing: -0.5px;
        line-height: 1;
      }

      /* --- Controls Row --- */
      .controls-row {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .search-wrapper {
        position: relative;
        flex: 0 1 300px;
      }
      .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #a8a29e;
        pointer-events: none;
      }
      .quick-filter {
        width: 100%;
        padding: 9px 12px 9px 36px;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        font-size: 0.85rem;
        font-family: var(--font-family);
        background: #fff;
        color: var(--text-main);
        outline: none;
        transition: border-color 0.15s;
      }
      .quick-filter::placeholder {
        color: #a8a29e;
      }
      .quick-filter:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.1);
      }
      .controls-right {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: auto;
      }
      .btn {
        padding: 8px 16px;
        border: none;
        border-radius: var(--radius-md);
        font-size: 0.82rem;
        font-weight: 600;
        font-family: var(--font-family);
        cursor: pointer;
        transition: all 0.15s ease;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .btn:active {
        transform: scale(0.97);
      }
      .btn-primary {
        background: var(--text-main);
        color: #fff;
      }
      .btn-primary:hover {
        background: #292524;
      }
      .btn-secondary {
        background: #fff;
        color: var(--text-main);
        border: 1px solid var(--border-color);
      }
      .btn-secondary:hover {
        background: #f5f5f4;
        border-color: #d6d3d1;
      }
      .row-count-badge {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-muted);
        background: #f5f5f4;
        padding: 6px 10px;
        border-radius: 20px;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.2px;
      }

      /* --- Grid Container --- */
      .grid-container {
        flex: 1;
        min-height: 0;
        border-radius: var(--radius-lg);
        overflow: hidden;
        background: #fff;
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
      }

      ::ng-deep .modern-grid {
        border: none !important;
        font-family: var(--font-family) !important;
        border-radius: var(--radius-lg);
      }
      ::ng-deep .modern-grid .zg-header-row {
        background-color: #fafaf9 !important;
        border-bottom: 2px solid #e7e5e4 !important;
        font-weight: 600 !important;
        color: #57534e !important;
        text-transform: uppercase;
        font-size: 0.7rem;
        letter-spacing: 0.6px;
      }
      ::ng-deep .modern-grid .zg-header-cell {
        padding: 14px 12px !important;
        gap: 6px;
      }
      ::ng-deep .modern-grid .zg-cell {
        border-bottom: 1px solid #f5f5f4 !important;
        border-right: 1px solid transparent !important;
      }
      ::ng-deep .modern-grid .zg-row:hover {
        background-color: #fafaf9 !important;
      }
    `,
  ],
})
export class AppComponent {
  readonly zenGrid = viewChild<ZenGridComponent>('zenGrid');
  readonly gridShell = viewChild<any>('gridShell');

  readonly selectedTheme = signal('light');
  readonly filterQuery = signal('');
  readonly themeNames = listThemes();

  private _data = signal(generateProjectData(500));

  readonly rowCount = computed(() => this._data().length);
  readonly gridData = computed(() => this._data());

  readonly totalTasks = computed(() => this._data().length);
  readonly inProgressCount = computed(
    () => this._data().filter((r) => (r[3] as any[])[0]?.label === 'In Progress').length
  );
  readonly completedCount = computed(() => this._data().filter((r) => r[0] === true).length);
  readonly overdueCount = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this._data().filter((r) => r[7] < today && r[0] !== true).length;
  });

  readonly paginationConfig = {
    enabled: true,
    pageSize: 50,
    pageSizeOptions: [25, 50, 100],
  };

  readonly columns: ColumnDef[] = [
    {
      field: 'complete',
      header: { text: '\u2713', type: 'text' },
      width: 50,
      renderer: new CheckboxRenderer({
        onChange: (value, params) => {
          const d = this._data();
          d[params.cell.row][0] = value;
          this._data.set([...d]);
        },
      }),
      sortable: false,
      minWidth: 40,
    },
    {
      field: 'id',
      header: {
        text: '#',
        type: 'sortable',
        sortIndicator: { show: true, position: 'trailing' },
        interactive: true,
      },
      width: 60,
      sortable: true,
    },
    {
      field: 'taskName',
      header: {
        text: 'Task',
        type: 'sortable',
        sortIndicator: { show: true, position: 'trailing' },
        interactive: true,
      },
      width: 320,
      sortable: true,
      editable: true,
      editor: new TextEditor({ maxLength: 200 }),
    },
    {
      field: 'status',
      header: {
        text: 'Status',
        type: 'sortable',
        sortIndicator: { show: true, position: 'trailing' },
        interactive: true,
      },
      width: 130,
      renderer: new ChipRenderer({ overflowMode: 'scroll' }),
      sortable: true,
    },
    {
      field: 'priority',
      header: {
        text: 'Priority',
        type: 'sortable',
        sortIndicator: { show: true, position: 'trailing' },
        interactive: true,
      },
      width: 120,
      renderer: new DropdownRenderer({
        options: [
          { label: 'Critical', value: 'Critical' },
          { label: 'High', value: 'High' },
          { label: 'Medium', value: 'Medium' },
          { label: 'Low', value: 'Low' },
        ],
        onChange: (value, params) => {
          const d = this._data();
          d[params.cell.row][4] = value;
          this._data.set([...d]);
        },
      }),
      sortable: true,
    },
    {
      field: 'assignee',
      header: {
        text: 'Assignee',
        type: 'sortable',
        sortIndicator: { show: true, position: 'trailing' },
        interactive: true,
      },
      width: 140,
      sortable: true,
    },
    {
      field: 'progress',
      header: {
        text: 'Progress',
        type: 'sortable',
        sortIndicator: { show: true, position: 'trailing' },
        interactive: true,
      },
      width: 160,
      renderer: new ProgressBarRenderer({
        min: 0,
        max: 100,
        showValue: true,
        colorThresholds: [
          { value: 30, color: '#ef4444' },
          { value: 70, color: '#d97706' },
          { value: 100, color: '#16a34a' },
        ],
      }),
      sortable: true,
    },
    {
      field: 'dueDate',
      header: {
        text: 'Due Date',
        type: 'sortable',
        sortIndicator: { show: true, position: 'trailing' },
        interactive: true,
      },
      width: 140,
      renderer: new DateRenderer({ format: 'MM/DD/YYYY' }),
      sortable: true,
      editable: true,
      editor: new DateEditor({
        format: 'MM/DD/YYYY',
        minDate: new Date('2024-01-01'),
        maxDate: new Date('2028-12-31'),
        required: true,
        autoFocus: true,
        theme: 'light',
        useCalendarPopup: true,
      }),
    },
    {
      field: 'sprint',
      header: { text: 'Sprint', type: 'text' },
      width: 280,
      renderer: new DateRangeRenderer({
        format: 'MM/DD/YYYY',
        showDuration: true,
        separator: ' \u2192 ',
        chipStyle: false,
      }),
      sortable: false,
      editable: true,
      editor: new DateRangeEditor({
        format: 'MM/DD/YYYY',
        minDate: new Date('2024-01-01'),
        maxDate: new Date('2028-12-31'),
        required: true,
        autoFocus: true,
        theme: 'light',
        allowSameDate: false,
      }),
    },
    {
      field: 'tags',
      header: { text: 'Tags', type: 'text' },
      width: 200,
      renderer: new ChipRenderer({
        overflowMode: 'scroll',
        showOverflowTooltip: true,
      }),
      sortable: false,
      overflow: { mode: 'scroll' },
    },
    {
      field: 'hours',
      header: {
        text: 'Hours',
        type: 'sortable',
        sortIndicator: { show: true, position: 'trailing' },
        interactive: true,
      },
      width: 90,
      renderer: new NumberRenderer({ minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      sortable: true,
    },
    {
      field: 'actions',
      header: { text: '', type: 'text' },
      width: 100,
      renderer: new ButtonRenderer({
        label: 'Edit',
        variant: 'primary',
        size: 'small',
        onClick: (params) => {
          console.log('Edit row', params.cell.row, this._data()[params.cell.row]);
        },
      }),
      sortable: false,
    },
  ];

  onThemeChange(themeName: string): void {
    this.selectedTheme.set(themeName);
    const theme = getTheme(themeName);
    if (!theme) return;
    const shell =
      (this.gridShell() as any)?.nativeElement ?? document.querySelector('.grid-container');
    if (shell) {
      applyTheme(shell, theme);
    }
  }

  onFilterChange(query: string): void {
    this.filterQuery.set(query);
    const grid = this.zenGrid();
    if (grid) {
      grid.setQuickFilter(query);
    }
  }

  addTasks(): void {
    const newTasks = generateProjectData(50);
    const startIdx = this._data().length;
    for (let i = 0; i < newTasks.length; i++) {
      newTasks[i][1] = `TASK-${String(startIdx + i + 1).padStart(4, '0')}`;
    }
    this._data.set([...this._data(), ...newTasks]);
  }

  exportCSV(): void {
    const grid = this.zenGrid();
    if (grid) {
      const csv = grid.exportCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project-tasks.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  }
}
