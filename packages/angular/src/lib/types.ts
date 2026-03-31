import type { TemplateRef, Type } from '@angular/core';
import type {
  CellRef,
  CellRange,
  CellPosition,
  ColumnDef,
  GridOptions,
  GridEvents,
  GridState,
  GridStateSnapshot,
  ColumnStateSnapshot,
  GridExportOptions,
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
} from '@zengrid/core';

export type {
  CellRef,
  CellRange,
  CellPosition,
  ColumnDef,
  GridOptions,
  GridEvents,
  GridState,
  GridStateSnapshot,
  ColumnStateSnapshot,
  GridExportOptions,
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
};

export interface ZenCellTemplateContext {
  $implicit: any;
  value: any;
  cell: CellRef;
  row: any;
  column: ColumnDef;
  isSelected: boolean;
}

export interface ZenEditorTemplateContext {
  $implicit: any;
  value: any;
  cell: CellRef;
  onComplete: (value: any) => void;
  onChange: (value: any) => void;
}

export interface ZenHeaderTemplateContext {
  $implicit: ColumnDef;
  column: ColumnDef;
  sortState: 'asc' | 'desc' | null;
}

export interface ZenGridConfig {
  [key: string]: any;
}

export type RendererInput = string | CellRenderer | TemplateRef<ZenCellTemplateContext> | Type<any>;
export type EditorInput = string | CellEditor | TemplateRef<ZenEditorTemplateContext> | Type<any>;
export type HeaderRendererInput =
  | string
  | HeaderRenderer
  | TemplateRef<ZenHeaderTemplateContext>
  | Type<any>;
