/**
 * Pagination Demo with Backend Integration
 * Shows how to use ZenGrid with server-side pagination
 */

import type { Grid } from '../../../packages/core/src/grid';

const API_BASE_URL = 'http://localhost:3003/api';

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class PaginationDemo {
  private grid: Grid;
  private state: PaginationState = {
    currentPage: 1,
    pageSize: 100,
    totalRecords: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  private enabled = false;
  private loading = false;

  // UI Elements
  private paginationControls: HTMLElement;
  private btnFirstPage: HTMLButtonElement;
  private btnPrevPage: HTMLButtonElement;
  private btnNextPage: HTMLButtonElement;
  private btnLastPage: HTMLButtonElement;
  private btnGotoPage: HTMLButtonElement;
  private pageSizeSelect: HTMLSelectElement;
  private gotoPageInput: HTMLInputElement;
  private pageInfo: HTMLElement;
  private totalRecords: HTMLElement;

  constructor(grid: Grid) {
    this.grid = grid;

    // Get UI elements
    this.paginationControls = document.getElementById('pagination-controls')!;
    this.btnFirstPage = document.getElementById('btn-first-page') as HTMLButtonElement;
    this.btnPrevPage = document.getElementById('btn-prev-page') as HTMLButtonElement;
    this.btnNextPage = document.getElementById('btn-next-page') as HTMLButtonElement;
    this.btnLastPage = document.getElementById('btn-last-page') as HTMLButtonElement;
    this.btnGotoPage = document.getElementById('btn-goto-page') as HTMLButtonElement;
    this.pageSizeSelect = document.getElementById('page-size-select') as HTMLSelectElement;
    this.gotoPageInput = document.getElementById('goto-page-input') as HTMLInputElement;
    this.pageInfo = document.getElementById('page-info')!;
    this.totalRecords = document.getElementById('total-records')!;

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.btnFirstPage.addEventListener('click', () => this.goToPage(1));
    this.btnPrevPage.addEventListener('click', () => this.goToPage(this.state.currentPage - 1));
    this.btnNextPage.addEventListener('click', () => this.goToPage(this.state.currentPage + 1));
    this.btnLastPage.addEventListener('click', () => this.goToPage(this.state.totalPages));
    this.btnGotoPage.addEventListener('click', () => {
      const page = parseInt(this.gotoPageInput.value);
      if (page >= 1 && page <= this.state.totalPages) {
        this.goToPage(page);
      }
    });

    this.pageSizeSelect.addEventListener('change', () => {
      this.state.pageSize = parseInt(this.pageSizeSelect.value);
      this.goToPage(1); // Reset to first page when page size changes
    });

    this.gotoPageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.btnGotoPage.click();
      }
    });
  }

  async enable() {
    this.enabled = true;
    this.paginationControls.style.display = 'block';

    console.log('📄 Pagination Mode: ENABLED');
    console.log('   Loading data from server...');

    await this.loadPage(1);
  }

  disable() {
    this.enabled = false;
    this.paginationControls.style.display = 'none';

    console.log('📄 Pagination Mode: DISABLED');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async goToPage(page: number) {
    if (page < 1 || page > this.state.totalPages || this.loading) return;

    await this.loadPage(page);
  }

  private async loadPage(page: number) {
    if (this.loading) {
      console.warn('⏳ Already loading, please wait...');
      return;
    }

    this.loading = true;
    this.updateButtonStates(true);

    try {
      const url = `${API_BASE_URL}/employees?page=${page}&pageSize=${this.state.pageSize}`;

      console.log(`\n📊 Loading Page ${page}:`);
      console.log(`   URL: ${url}`);

      // Show loading indicator
      (this.grid as any).events.emit('loading:start', {
        timestamp: Date.now(),
        message: `Loading page ${page}...`,
      });

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      console.log(`   ✅ Received ${result.data.length} records`);
      console.log(`   Total: ${result.pagination.totalRecords.toLocaleString()}`);
      console.log(`   Pages: ${result.pagination.totalPages}`);

      // Update state
      this.state = {
        currentPage: result.pagination.page,
        pageSize: result.pagination.pageSize,
        totalRecords: result.pagination.totalRecords,
        totalPages: result.pagination.totalPages,
        hasNextPage: result.pagination.hasNextPage,
        hasPreviousPage: result.pagination.hasPreviousPage,
      };

      // Convert to 2D array format for grid
      const gridData = result.data.map((row: any) => [
        row.id,
        row.name,
        row.department,
        row.salary,
        row.years,
        row.status,
        row.email,
        row.phone,
        row.score,
        row.notes,
      ]);

      // Update grid with page data
      // The library now handles scroller/positioner recreation automatically
      this.grid.setData(gridData);
      this.grid.refresh();

      console.log(`✅ Page ${result.pagination.page} loaded: ${gridData.length} rows`);

      // Update UI
      this.updatePaginationUI();

      // Complete loading
      (this.grid as any).events.emit('loading:end', {
        timestamp: Date.now(),
        duration: 300,
      });
    } catch (error) {
      console.error('❌ Failed to load page:', error);

      (this.grid as any).events.emit('loading:end', {
        timestamp: Date.now(),
        duration: 0,
      });

      alert(`Failed to load data from server.\n\nMake sure the server is running:\npnpm server\n\nServer URL: http://localhost:3003\n\nError: ${(error as Error).message}`);
    } finally {
      this.loading = false;
      this.updateButtonStates(false);
    }
  }

  private updatePaginationUI() {
    this.pageInfo.textContent = `Page ${this.state.currentPage} of ${this.state.totalPages}`;
    this.totalRecords.textContent = `Total: ${this.state.totalRecords.toLocaleString()} records`;
    this.gotoPageInput.max = String(this.state.totalPages);
  }

  private updateButtonStates(loading: boolean) {
    const disableFirst = loading || this.state.currentPage === 1;
    const disablePrev = loading || !this.state.hasPreviousPage;
    const disableNext = loading || !this.state.hasNextPage;
    const disableLast = loading || this.state.currentPage === this.state.totalPages;

    this.btnFirstPage.disabled = disableFirst;
    this.btnPrevPage.disabled = disablePrev;
    this.btnNextPage.disabled = disableNext;
    this.btnLastPage.disabled = disableLast;
    this.btnGotoPage.disabled = loading;
    this.pageSizeSelect.disabled = loading;

    // Visual feedback
    [this.btnFirstPage, this.btnPrevPage, this.btnNextPage, this.btnLastPage].forEach(btn => {
      if (btn.disabled) {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }
    });
  }

  getCurrentState(): PaginationState {
    return { ...this.state };
  }
}
