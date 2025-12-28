/**
 * ZenGrid Core - Community Edition
 * High-performance data grid library
 *
 * @packageDocumentation
 */

// Core types
export * from './types';

// Data structures (re-exported from shared)
export { SparseMatrix } from '@zengrid/shared/data-structures/sparse-matrix';
export type { SparseMatrixOptions, ReadonlySparseMatrix } from '@zengrid/shared/data-structures/sparse-matrix';

export { ColumnStore } from '@zengrid/shared/data-structures/column-store';
export type { ColumnStoreOptions, ColumnDefinition, ColumnType, AggregateOperation, AggregationResult } from '@zengrid/shared/data-structures/column-store';

// Rendering - Height and Width Providers
export type { HeightProvider, HeightProviderOptions } from './rendering/height-provider';
export { UniformHeightProvider, VariableHeightProvider } from './rendering/height-provider';

export type { WidthProvider, WidthProviderOptions } from './rendering/width-provider';
export { UniformWidthProvider, VariableWidthProvider } from './rendering/width-provider';

// Rendering - Virtual Scroller
export type { VirtualScrollerOptions, CellPosition } from './rendering/virtual-scroller';
export { VirtualScroller } from './rendering/virtual-scroller';

// Rendering - CellPool
export type { CellPoolOptions, CellPoolStats } from './rendering/cell-pool';
export { CellPool } from './rendering/cell-pool';

// Rendering - CellPositioner
export type { CellPositionerOptions } from './rendering/cell-positioner';
export { CellPositioner } from './rendering/cell-positioner';

// Rendering - Renderers
export type { CellRenderer, RenderParams } from './rendering/renderers';
export { RendererRegistry, TextRenderer, NumberRenderer, ImageRenderer, AdvancedCellRenderer } from './rendering/renderers';
export type {
  NumberRendererOptions,
  ImageRendererOptions,
  AdvancedCellRendererOptions,
  CompositeElement,
  ConditionalStyle,
} from './rendering/renderers';

// TODO: Implement remaining modules
//
//
// // Selection
// export { SelectionManager } from './selection/selection-manager';
//
// // Editing
// export type { CellEditor } from './editing/cell-editor.interface';
// export { TextEditor } from './editing/text-editor';
// export { EditorManager } from './editing/editor-manager';
//
// // Keyboard
// export { KeyboardNavigator } from './keyboard/keyboard-navigator';
//
// // Accessibility
// export { ARIAManager } from './a11y/aria-manager';
// export { FocusManager } from './a11y/focus-manager';
//
// // Events
// export { EventEmitter } from './events/event-emitter';
// export type { GridEvents } from './events/grid-events';
//
// // Features
// export { SingleColumnSorter } from './features/sorting/single-column-sorter';
// export { BasicFilter } from './features/filtering/basic-filter';
// export { ClipboardManager } from './features/copy-paste/clipboard-manager';
// export { CSVExporter } from './features/export/csv-exporter';
//
// // Utilities
// export { PerformanceMonitor } from './utils/performance-monitor';
//
// // Main Grid class
// export { Grid } from './grid';

// Version
export const VERSION = '0.1.0';
