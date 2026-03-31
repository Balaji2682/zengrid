import type { GridOptions } from '../../../../packages/core/src/types';
import { ROW_HEIGHT } from './constants';

export interface GridConfigOptions {
  rowCount: number;
  colCount: number;
  columnWidths: number[];
  columns: any[];
  dataMode: 'frontend' | 'backend' | 'auto';
  loadingTemplate: 'simple' | 'animated' | 'modern' | 'skeleton' | 'overlay';
  onDataRequest?: GridOptions['onDataRequest'];
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  onColumnWidthsChange?: (widths: number[]) => void;
  infiniteScrolling?: any;
  onLoadMoreRows?: (currentRowCount: number) => Promise<any[][]>;
}

export function createGridConfig(options: GridConfigOptions) {
  const {
    rowCount,
    colCount,
    columnWidths,
    columns,
    dataMode,
    loadingTemplate,
    onDataRequest,
    onScroll,
    onColumnWidthsChange,
    infiniteScrolling,
    onLoadMoreRows,
  } = options;

  return {
    rowCount,
    colCount,
    rowHeight: ROW_HEIGHT,
    colWidth: columnWidths,
    columns,
    enableSelection: false,
    enableKeyboardNavigation: true,
    overscanRows: 5,
    overscanCols: 2,
    // Enable content-aware row height mode - only columns marked with autoHeight will be measured
    rowHeightMode: 'content-aware' as const,
    rowHeightConfig: {
      defaultHeight: ROW_HEIGHT,
      minHeight: 30,
      maxHeight: 150,
      debounceMs: 16,
    },
    // Enable renderer cache for performance
    rendererCache: {
      enabled: true,
      capacity: 1000,
      trackStats: true,
    },
    // Operation Modes - unified pattern for frontend/backend operations
    dataMode,
    onDataRequest,
    // Loading indicator configuration
    loading: {
      enabled: true,
      template: loadingTemplate,
      message: 'Loading data...',
      minDisplayTime: 500,
      position: 'center' as const,
      showOverlay: true,
      overlayOpacity: 0.5,
    },
    // Column Resize Configuration
    enableColumnResize: true,
    columnResize: {
      resizeZoneWidth: 6,
      defaultMinWidth: 30,
      defaultMaxWidth: 600,
      autoFitSampleSize: 100,
      autoFitPadding: 16,
      showHandles: true,
      showPreview: true,
      autoFitOnLoad: true,
    },
    // Sync scroll - update resize handle positions
    onScroll,
    // Column width persistence
    onColumnWidthsChange,
    // Infinite scrolling configuration (optional)
    infiniteScrolling,
    // Data loading callback (optional)
    onLoadMoreRows,
  };
}
