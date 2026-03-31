/**
 * ZenGrid Core - Community Edition
 * High-performance data grid library
 *
 * @packageDocumentation
 */

// Core types
export * from './types';
export type {
  FilterAst,
  FilterAstNode,
  FilterAstTarget,
  FilterValueType,
  QueryPaginationState,
  QueryState,
} from './types';

// Data structures (re-exported from shared)
export { SparseMatrix } from '@zengrid/shared';
export type { SparseMatrixOptions, ReadonlySparseMatrix } from '@zengrid/shared';

export { ColumnStore } from '@zengrid/shared';
export type {
  ColumnStoreOptions,
  ColumnDefinition,
  ColumnType,
  AggregateOperation,
  AggregationResult,
} from '@zengrid/shared';

// Rendering - Height and Width Providers
export type { HeightProvider, HeightProviderOptions } from './rendering/height-provider';
export { UniformHeightProvider, VariableHeightProvider } from './rendering/height-provider';

export type { WidthProvider, WidthProviderOptions } from './rendering/width-provider';
export {
  UniformWidthProvider,
  VariableWidthProvider,
  ColumnModelWidthProvider,
} from './rendering/width-provider';

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
export {
  RendererRegistry,
  TextRenderer,
  NumberRenderer,
  ImageRenderer,
  AdvancedCellRenderer,
} from './rendering/renderers';
export type {
  NumberRendererOptions,
  ImageRendererOptions,
  AdvancedCellRendererOptions,
  CompositeElement,
  ConditionalStyle,
} from './rendering/renderers';

// Rendering - Headers
export type {
  HeaderRenderer,
  HeaderRenderParams,
} from './rendering/headers/header-renderer.interface';
export type { ResolvedHeaderConfig } from './types/header';
export {
  TextHeaderRenderer,
  SortableHeaderRenderer,
  FilterableHeaderRenderer,
  CheckboxHeaderRenderer,
  IconHeaderRenderer,
} from './rendering/headers/renderers';

// Rendering - Cache
export type { IRendererCache, RendererCacheConfig, CachedRenderContent } from './rendering/cache';
export { RendererCache } from './rendering/cache';

// Data layer
export type { DataAccessor } from './data/data-accessor';
export type { IndexMap, IndexMapOptions } from './data/index-map';
export { createIndexMap, createIdentityIndexMap } from './data/index-map';

// Features - Sorting
export type { RowSorter, SortOptions, NullPosition } from './features/sorting';
export { SingleColumnSorter } from './features/sorting';

// Features - Column Resize
export type {
  ColumnConstraints,
  ColumnResizeOptions,
  ResizeState,
  ResizeZoneResult,
  AutoFitCalculatorOptions,
} from './features/column-resize';
export {
  ColumnResizeManager,
  AutoFitCalculator,
  ResizeHandleRenderer,
  ResizePreview,
} from './features/column-resize';

// Features - Column Drag (Drag-and-drop reordering)
export type {
  DragState,
  DragEvent,
  DropPosition,
  ColumnDragOptions,
  AutoScrollOptions,
  DragStateSnapshot,
  DropZoneResult,
  BeforeDragEvent,
  DuringDragEvent,
  AfterDragEvent,
  ColumnDragEvents,
} from './features/column-drag';
export {
  ColumnDragManager,
  DragVisualFeedback,
  DragKeyboardHandler,
  DragTouchHandler,
  ColumnDragCommand,
} from './features/column-drag';

// Features - Column Model (Reactive column state management)
export { ColumnModel } from './features/columns';
export { ColumnReorderPlugin, ColumnPinPlugin, ColumnVisibilityPlugin } from './features/columns';
export type {
  ColumnState,
  ColumnEvent,
  ColumnEventType,
  ColumnPinPosition,
  ColumnBatchUpdate,
} from './features/columns';

// Features - Viewport (Reactive scroll and viewport state)
export { ScrollModel, ViewportModel } from './features/viewport';
export type {
  ScrollState,
  ViewportState,
  ScrollEvent,
  ScrollEventType,
  ViewportEvent,
  ViewportEventType,
} from './features/viewport';

// Selection utilities
export {
  normalizeRange,
  mergeRanges,
  containsCell,
  rangesIntersect,
} from './selection/range-utils';
export { createHitTester } from './selection/hit-tester';

// Main Grid class
export { Grid } from './grid/index';

// Grid Events
export type { GridEvents } from './events/grid-events';

// Interactive Renderers
export type {
  CheckboxRendererOptions,
  createCheckboxRenderer,
} from './rendering/renderers/checkbox';
export { CheckboxRenderer } from './rendering/renderers/checkbox';

export type {
  ProgressBarRendererOptions,
  createProgressBarRenderer,
} from './rendering/renderers/progress-bar';
export { ProgressBarRenderer } from './rendering/renderers/progress-bar';

export type { LinkRendererOptions, createLinkRenderer } from './rendering/renderers/link';
export { LinkRenderer } from './rendering/renderers/link';

export type { ButtonRendererOptions, createButtonRenderer } from './rendering/renderers/button';
export { ButtonRenderer } from './rendering/renderers/button';

export type { DateRendererOptions } from './rendering/renderers/datetime';
export { DateRenderer, createDateRenderer } from './rendering/renderers/datetime';

export type {
  DateRangeRendererOptions,
  DateRange as RendererDateRange,
  createDateRangeRenderer,
} from './rendering/renderers/date-range';
export { DateRangeRenderer } from './rendering/renderers/date-range';

export type {
  SelectRendererOptions,
  SelectOption,
  createSelectRenderer,
} from './rendering/renderers/select';
export { SelectRenderer } from './rendering/renderers/select';

export type { ChipRendererOptions, Chip, createChipRenderer } from './rendering/renderers/chip';
export { ChipRenderer } from './rendering/renderers/chip';

export type {
  DropdownRendererOptions,
  DropdownOption as DropdownRendererOption,
} from './rendering/renderers/dropdown';
export { DropdownRenderer, createDropdownRenderer } from './rendering/renderers/dropdown';

// DateTime Suite - New infrastructure with reliable click-outside, scroll handling, and theming
export {
  // Renderers
  DatePickerRenderer,
  createDatePickerRenderer,
  TimePickerRenderer,
  createTimePickerRenderer,
  DateTimePickerRenderer,
  createDateTimePickerRenderer,
  // Display renderers
  DateRenderer as DatetimeDateRenderer,
  createDateRenderer as createDatetimeDateRenderer,
  TimeRenderer,
  createTimeRenderer,
  DateTimeRenderer,
  createDateTimeRenderer,
} from './rendering/renderers/datetime';
export type {
  DatePickerRendererOptions,
  TimePickerRendererOptions,
  DateTimePickerRendererOptions,
  DateRendererOptions as DatetimeDateRendererOptions,
  TimeRendererOptions,
  DateTimeRendererOptions,
  TimeValue as RendererTimeValue,
  TimeFormat as RendererTimeFormat,
} from './rendering/renderers/datetime';

// DateTime Core - Theming, parsing, formatting utilities
export {
  ThemeManager as DatetimeThemeManager,
  setDatetimeTheme,
  setDatetimeThemeConfig,
  PopupManager as DatetimePopupManager,
  parseDate,
  parseTime,
  parseDateTime,
  formatDate,
  formatDateForDisplay,
  formatTime,
  formatDateTime,
  formatDateRange,
  isValidDate,
  isDateInRange,
} from './datetime-core';
export type { DatetimeTheme, ThemeConfig as DatetimeThemeConfig } from './datetime-core';

// Cell Editors
export type {
  CellEditor,
  EditorParams,
  ValidationResult as EditorValidationResult,
} from './editing/cell-editor.interface';

export type { TextEditorOptions, createTextEditor } from './editing/text';
export { TextEditor } from './editing/text';

export type { CheckboxEditorOptions, createCheckboxEditor } from './editing/checkbox';
export { CheckboxEditor } from './editing/checkbox';

// DateTime Editors - New infrastructure
export {
  DateEditor,
  createDateEditor,
  TimeEditor,
  createTimeEditor,
  DateTimeEditor,
  createDateTimeEditor,
  DateRangeEditor,
  createDateRangeEditor,
} from './editing/datetime';
export type {
  DateEditorOptions,
  TimeEditorOptions,
  DateTimeEditorOptions,
  DateRangeEditorOptions,
  DateRange as EditorDateRange,
  TimeValue as EditorTimeValue,
  TimeFormat as EditorTimeFormat,
  DateInputType,
} from './editing/datetime';

export type {
  DropdownEditorOptions,
  DropdownOption,
  createDropdownEditor,
} from './editing/dropdown';
export { DropdownEditor } from './editing/dropdown';

export { EditorManager } from './editing/editor-manager';
export type { EditorManagerOptions } from './editing/editor-manager';

// Features - Column Groups
export type {
  ColumnGroup,
  ColumnGroupModelConfig,
  ValidationResult,
  GroupNode,
} from './features/column-groups/types';
export {
  ColumnGroupManager,
  ColumnGroupModel,
  ColumnGroupRenderer,
  createColumnGroupRenderer,
  RendererRegistry as ColumnGroupRendererRegistry,
  globalRendererRegistry as globalColumnGroupRendererRegistry,
  registerRenderer as registerColumnGroupRenderer,
  getRenderer as getColumnGroupRenderer,
  hasRenderer as hasColumnGroupRenderer,
  createRendererRegistry as createColumnGroupRendererRegistry,
} from './features/column-groups';
export type {
  ColumnGroupRenderParams,
  ColumnGroupRendererOptions,
  IRendererRegistry as IColumnGroupRendererRegistry,
  RendererFactory as ColumnGroupRendererFactory,
} from './features/column-groups';

// Features - Multi-Column Sorting
export { MultiColumnSorter, SortStateManager } from './features/sorting';

// Utilities
export { DependencyGraph, EventEmitter } from './utils';

// Keyboard
export { KeyboardNavigator } from './keyboard';
export type { KeyboardNavigatorOptions } from './keyboard';

// Accessibility
export { ARIAManager } from './a11y';
export type { ARIAManagerOptions } from './a11y';
export { FocusManager } from './a11y';
export type { FocusManagerOptions } from './a11y';
export { ClipboardManager } from './features/copy-paste/clipboard-manager';
export { CSVExporter } from './features/export/csv-exporter';

// Reactive Store (Phase 1)
export { GridStore, PipelineRegistry } from './reactive';
export type {
  StoreKeys,
  WrappedSignal,
  WrappedComputed,
  AsyncState,
  AsyncComputedOptions,
} from './reactive';

// Async Utilities (Phase 8)
export { yieldToMain, processInChunks } from './reactive';

// Plugin System (Phase 2)
export type {
  GridPlugin,
  PluginDisposable,
  GridApi as GridApiInterface,
  GridOptionsChange,
  GridOptionsListener,
  GridPluginSetupContext,
} from './reactive';
export { PluginHost } from './grid/plugin-host';
export { GridApiImpl } from './grid/grid-api';

// Plugins
export { createCorePlugin, createSortPlugin, createFilterPlugin } from './plugins';
export type { CorePluginOptions, SortPluginOptions, FilterPluginOptions } from './plugins';
export { createSelectionPlugin, createEditingPlugin, createUndoRedoPlugin } from './plugins';
export type {
  SelectionPluginOptions,
  EditingPluginOptions,
  UndoRedoPluginOptions,
} from './plugins';
export { createDevToolsConnector } from './plugins';
export type { DevToolsConnectorOptions } from './plugins';
export { createAsyncSortPlugin, createAsyncFilterPlugin } from './plugins';
export type { AsyncSortPluginOptions, AsyncFilterPluginOptions } from './plugins';
export { createLifecyclePlugin } from './plugins';
export type { LifecyclePluginOptions } from './plugins';

// Grid Namespaced APIs
export type { SortApi } from './grid/api';
export type { FilterApi } from './grid/api';
export type { PaginationApi } from './grid/api';
export type { ColumnApi } from './grid/api';
export type { ScrollApi } from './grid/api';
export type { StateApi } from './grid/api';
export type { ExportApi } from './grid/api';

// Theming System
export type {
  ZenGridTheme,
  PartialTheme,
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  ThemeBorders,
  ThemeShadows,
  ThemeTransitions,
} from './theming';
export {
  applyTheme,
  removeTheme,
  themeToCSSVariables,
  registerTheme,
  getTheme,
  hasTheme,
  listThemes,
  getAllThemes,
  unregisterTheme,
  ThemeBuilder,
  createTheme,
  lighten,
  darken,
  alpha,
  lightTheme,
  darkTheme,
  materialTheme,
  githubTheme,
  nordTheme,
  draculaTheme,
  oneDarkTheme,
  solarizedTheme,
} from './theming';

// Version
export const VERSION = '0.1.0';
