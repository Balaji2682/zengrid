// Components
export { ZenGridComponent } from './lib/components/zen-grid.component';
export { ZenColumnComponent } from './lib/components/zen-column.component';

// Directives
export { ZenCellTemplateDirective } from './lib/directives/zen-cell-template.directive';
export { ZenEditorTemplateDirective } from './lib/directives/zen-editor-template.directive';
export { ZenHeaderTemplateDirective } from './lib/directives/zen-header-template.directive';
export { ZenGridValueAccessorDirective } from './lib/directives/zen-grid-value-accessor.directive';

// Services
export { TemplateBridgeService } from './lib/services/template-bridge.service';
export { ZEN_GRID_CONFIG, provideZenGrid } from './lib/services/zen-grid-config.token';

// Angular Plugins
export { AngularPluginWrapper, createAngularPlugin } from './lib/plugins/angular-plugin-wrapper';

// Utils
export { EVENT_MAP } from './lib/utils/event-map';
export { bridgeStoreSignal } from './lib/utils/signal-bridge';

// Angular-specific Types
export type {
  ZenCellTemplateContext,
  ZenEditorTemplateContext,
  ZenHeaderTemplateContext,
  ZenGridConfig,
  RendererInput,
  EditorInput,
  HeaderRendererInput,
} from './lib/types';

// ─── Re-export Core Types ───────────────────────────────────────────────────

export type {
  CellRef,
  CellRange,
  CellPosition,
  ColumnDef,
  GridOptions,
  GridState,
  GridStateSnapshot,
  ColumnStateSnapshot,
  GridExportOptions,
  GridEvents,
  SortState,
  SortDescriptor,
  FilterModel,
  FilterAst,
  FilterAstNode,
  FilterAstTarget,
  FilterValueType,
  QueryState,
  QueryPaginationState,
  DataLoadRequest,
  DataLoadResponse,
  RenderParams,
  EditorParams,
  HeaderRenderParams,
  GridPlugin,
  GridStore,
  GridApiInterface,
  GridPluginSetupContext,
  GridOptionsChange,
  GridOptionsListener,
  CellRenderer,
  CellEditor,
  HeaderRenderer,
} from './lib/types';

// ─── Re-export Core Renderers ───────────────────────────────────────────────

export {
  // Standard renderers
  TextRenderer,
  NumberRenderer,
  ImageRenderer,
  AdvancedCellRenderer,
  // Interactive renderers
  CheckboxRenderer,
  ProgressBarRenderer,
  ButtonRenderer,
  LinkRenderer,
  ChipRenderer,
  SelectRenderer,
  DropdownRenderer,
  // Date renderers
  DateRenderer,
  DateRangeRenderer,
  // DateTime suite renderers
  DatePickerRenderer,
  createDatePickerRenderer,
  TimePickerRenderer,
  createTimePickerRenderer,
  DateTimePickerRenderer,
  createDateTimePickerRenderer,
  TimeRenderer,
  createTimeRenderer,
  DateTimeRenderer,
  createDateTimeRenderer,
  // Renderer infrastructure
  RendererRegistry,
} from '@zengrid/core';

export type {
  NumberRendererOptions,
  ImageRendererOptions,
  AdvancedCellRendererOptions,
  CompositeElement,
  ConditionalStyle,
  CheckboxRendererOptions,
  ProgressBarRendererOptions,
  LinkRendererOptions,
  ButtonRendererOptions,
  ChipRendererOptions,
  Chip,
  SelectRendererOptions,
  SelectOption,
  DropdownRendererOptions,
  DateRendererOptions,
  DateRangeRendererOptions,
  DatePickerRendererOptions,
  TimePickerRendererOptions,
  DateTimePickerRendererOptions,
  TimeRendererOptions,
  DateTimeRendererOptions,
} from '@zengrid/core';

// ─── Re-export Core Header Renderers ────────────────────────────────────────

export {
  TextHeaderRenderer,
  SortableHeaderRenderer,
  FilterableHeaderRenderer,
  CheckboxHeaderRenderer,
  IconHeaderRenderer,
} from '@zengrid/core';

export type { ResolvedHeaderConfig } from '@zengrid/core';

// ─── Re-export Core Editors ─────────────────────────────────────────────────

export {
  TextEditor,
  CheckboxEditor,
  DropdownEditor,
  DateEditor,
  DateRangeEditor,
  TimeEditor,
  DateTimeEditor,
  EditorManager,
} from '@zengrid/core';

export type {
  TextEditorOptions,
  CheckboxEditorOptions,
  DropdownEditorOptions,
  DropdownOption,
  DateEditorOptions,
  DateRangeEditorOptions,
  TimeEditorOptions,
  DateTimeEditorOptions,
  EditorManagerOptions,
} from '@zengrid/core';

// ─── Re-export Core Plugins ─────────────────────────────────────────────────

export {
  createCorePlugin,
  createSortPlugin,
  createFilterPlugin,
  createSelectionPlugin,
  createEditingPlugin,
  createUndoRedoPlugin,
  createDevToolsConnector,
  createAsyncSortPlugin,
  createAsyncFilterPlugin,
  createLifecyclePlugin,
  PluginHost,
  GridApiImpl,
} from '@zengrid/core';

export type {
  CorePluginOptions,
  SortPluginOptions,
  FilterPluginOptions,
  SelectionPluginOptions,
  EditingPluginOptions,
  UndoRedoPluginOptions,
  DevToolsConnectorOptions,
  AsyncSortPluginOptions,
  AsyncFilterPluginOptions,
  LifecyclePluginOptions,
} from '@zengrid/core';

// ─── Re-export Theming ──────────────────────────────────────────────────────

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
  // Theme presets
  lightTheme,
  darkTheme,
  materialTheme,
  githubTheme,
  nordTheme,
  draculaTheme,
  oneDarkTheme,
  solarizedTheme,
} from '@zengrid/core';

export type {
  ZenGridTheme,
  PartialTheme,
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  ThemeBorders,
  ThemeShadows,
  ThemeTransitions,
} from '@zengrid/core';

// ─── Re-export Sorting ──────────────────────────────────────────────────────

export { SingleColumnSorter, MultiColumnSorter, SortStateManager } from '@zengrid/core';

export type { SortOptions, NullPosition } from '@zengrid/core';

// ─── Re-export Column Features ──────────────────────────────────────────────

export {
  ColumnModel,
  ColumnReorderPlugin,
  ColumnPinPlugin,
  ColumnVisibilityPlugin,
  ColumnResizeManager,
  AutoFitCalculator,
  ResizeHandleRenderer,
  ResizePreview,
  ColumnDragManager,
  DragVisualFeedback,
  DragKeyboardHandler,
  DragTouchHandler,
  ColumnDragCommand,
  ColumnGroupManager,
  ColumnGroupModel,
  ColumnGroupRenderer,
  createColumnGroupRenderer,
} from '@zengrid/core';

export type {
  ColumnState,
  ColumnEvent,
  ColumnEventType,
  ColumnPinPosition,
  ColumnBatchUpdate,
  ColumnConstraints,
  ColumnResizeOptions,
  ResizeState,
  ResizeZoneResult,
  AutoFitCalculatorOptions,
  DragState,
  DragEvent,
  DropPosition,
  ColumnDragOptions,
  AutoScrollOptions,
  DragStateSnapshot,
  DropZoneResult,
  ColumnDragEvents,
  ColumnGroup,
  ColumnGroupModelConfig,
  ColumnGroupRenderParams,
  ColumnGroupRendererOptions,
} from '@zengrid/core';

// ─── Re-export Viewport & Scroll ────────────────────────────────────────────

export { ScrollModel, ViewportModel } from '@zengrid/core';

export type {
  ScrollState,
  ViewportState,
  ScrollEvent,
  ScrollEventType,
  ViewportEvent,
  ViewportEventType,
} from '@zengrid/core';

// ─── Re-export Selection Utilities ──────────────────────────────────────────

export {
  normalizeRange,
  mergeRanges,
  containsCell,
  rangesIntersect,
  createHitTester,
} from '@zengrid/core';

// ─── Re-export DateTime Utilities ───────────────────────────────────────────

export {
  setDatetimeTheme,
  setDatetimeThemeConfig,
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
} from '@zengrid/core';

export type { DatetimeTheme } from '@zengrid/core';

// ─── Re-export Keyboard & Accessibility ─────────────────────────────────────

export { KeyboardNavigator, ARIAManager, FocusManager } from '@zengrid/core';

export type {
  KeyboardNavigatorOptions,
  ARIAManagerOptions,
  FocusManagerOptions,
} from '@zengrid/core';

// ─── Re-export Data & Utilities ─────────────────────────────────────────────

export {
  SparseMatrix,
  ColumnStore,
  createIndexMap,
  createIdentityIndexMap,
  ClipboardManager,
  CSVExporter,
  DependencyGraph,
  EventEmitter,
  GridStore as CoreGridStore,
  PipelineRegistry,
} from '@zengrid/core';

export type {
  SparseMatrixOptions,
  ReadonlySparseMatrix,
  ColumnStoreOptions,
  ColumnDefinition,
  ColumnType,
  AggregateOperation,
  AggregationResult,
  IndexMap,
  IndexMapOptions,
  DataAccessor,
  StoreKeys,
  WrappedSignal,
  WrappedComputed,
  AsyncState,
  AsyncComputedOptions,
} from '@zengrid/core';

// ─── Re-export Grid API Types ───────────────────────────────────────────────

export type {
  SortApi,
  FilterApi,
  PaginationApi,
  ColumnApi,
  ScrollApi,
  StateApi,
  ExportApi,
} from '@zengrid/core';
