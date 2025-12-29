import type { CellRef, CellRange, SortState, FilterModel } from '../types';

/**
 * Grid event types
 *
 * Defines all events emitted by the grid component.
 */
export interface GridEvents {
  // Cell events
  'cell:click': {
    cell: CellRef;
    value: any;
    nativeEvent: MouseEvent;
  };

  'cell:doubleClick': {
    cell: CellRef;
    value: any;
    nativeEvent: MouseEvent;
  };

  'cell:contextMenu': {
    cell: CellRef;
    value: any;
    nativeEvent: MouseEvent;
  };

  'cell:change': {
    cell: CellRef;
    oldValue: any;
    newValue: any;
  };

  'cell:beforeChange': {
    cell: CellRef;
    oldValue: any;
    newValue: any;
    cancel: () => void;
  };

  'cell:afterChange': {
    cell: CellRef;
    oldValue: any;
    newValue: any;
  };

  // Selection events
  'selection:change': {
    ranges: CellRange[];
    previousRanges: CellRange[];
  };

  'selection:start': {
    startCell: CellRef;
  };

  'selection:end': {
    ranges: CellRange[];
  };

  // Editing events
  'edit:start': {
    cell: CellRef;
    value: any;
  };

  'edit:end': {
    cell: CellRef;
    value: any;
    cancelled: boolean;
  };

  'edit:commit': {
    cell: CellRef;
    oldValue: any;
    newValue: any;
  };

  'edit:cancel': {
    cell: CellRef;
    value: any;
  };

  // Scroll events
  'scroll': {
    scrollTop: number;
    scrollLeft: number;
    visibleRange: {
      startRow: number;
      endRow: number;
      startCol: number;
      endCol: number;
    };
  };

  'scroll:start': {
    scrollTop: number;
    scrollLeft: number;
  };

  'scroll:end': {
    scrollTop: number;
    scrollLeft: number;
  };

  // Sort events
  'sort:change': {
    sortState: SortState[];
    previousSortState: SortState[];
  };

  'sort:beforeSort': {
    sortState: SortState[];
    cancel: () => void;
  };

  'sort:afterSort': {
    sortState: SortState[];
    rowsAffected: number;
  };

  // Filter events
  'filter:change': {
    filterState: FilterModel[];
    previousFilterState: FilterModel[];
  };

  'filter:beforeFilter': {
    filterState: FilterModel[];
    cancel: () => void;
  };

  'filter:afterFilter': {
    filterState: FilterModel[];
    rowsVisible: number;
    rowsHidden: number;
  };

  // Focus events
  'focus:change': {
    cell: CellRef | null;
    previousCell: CellRef | null;
  };

  'focus:in': {
    cell: CellRef;
  };

  'focus:out': {
    cell: CellRef;
  };

  // Keyboard events
  'key:down': {
    cell: CellRef;
    key: string;
    nativeEvent: KeyboardEvent;
    preventDefault: () => void;
  };

  'key:up': {
    cell: CellRef;
    key: string;
    nativeEvent: KeyboardEvent;
  };

  'key:press': {
    cell: CellRef;
    key: string;
    nativeEvent: KeyboardEvent;
  };

  // Clipboard events
  'copy': {
    ranges: CellRange[];
    data: string;
  };

  'cut': {
    ranges: CellRange[];
    data: string;
  };

  'paste': {
    cell: CellRef;
    data: string;
  };

  // Lifecycle events
  'render:start': {
    timestamp: number;
  };

  'render:end': {
    timestamp: number;
    duration: number;
  };

  'data:load': {
    rowCount: number;
    colCount: number;
  };

  'data:change': {
    changes: Array<{
      cell: CellRef;
      oldValue: any;
      newValue: any;
    }>;
  };

  'destroy': {
    timestamp: number;
  };

  // Error events
  'error': {
    message: string;
    error: Error;
    context?: any;
  };

  'warning': {
    message: string;
    context?: any;
  };

  // Column events
  'column:resize': {
    column: number;
    oldWidth: number;
    newWidth: number;
  };

  'column:move': {
    column: number;
    oldIndex: number;
    newIndex: number;
  };

  'column:hide': {
    column: number;
  };

  'column:show': {
    column: number;
  };

  // Row events
  'row:insert': {
    index: number;
    count: number;
  };

  'row:delete': {
    index: number;
    count: number;
  };

  'row:move': {
    oldIndex: number;
    newIndex: number;
    count: number;
  };
}
