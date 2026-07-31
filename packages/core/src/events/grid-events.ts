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
    isSelected?: (row: number, col: number) => boolean;
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
  scroll: {
    scrollTop: number;
    scrollLeft: number;
    /** Rendered cell range (overscan-inclusive, `endRow`/`endCol` exclusive). */
    visibleRange: {
      startRow: number;
      endRow: number;
      startCol: number;
      endCol: number;
    };
    /** First rendered row index (inclusive). Equals `visibleRange.startRow`. */
    firstRow: number;
    /**
     * Last rendered row index (inclusive). Equals `visibleRange.endRow - 1`, so
     * rendered rows = `lastRow - firstRow + 1` with no divide-by-column-count.
     */
    lastRow: number;
    /** Literal count of rendered cell DOM nodes (active pool size). */
    renderedNodes: number;
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

  /**
   * Emitted when filters are exported to backend-friendly formats
   * Contains all export formats (REST, GraphQL, SQL) from a single filter state
   *
   * @example
   * ```typescript
   * grid.on('filter:export', (event) => {
   *   // REST
   *   fetch(`/api/users?${event.rest.queryString}`);
   *
   *   // GraphQL
   *   graphqlClient.query({
   *     query: GET_USERS,
   *     variables: { where: event.graphql.where }
   *   });
   *
   *   // SQL
   *   db.query(
   *     `SELECT * FROM users WHERE ${event.sql.whereClause}`,
   *     event.sql.positionalParams
   *   );
   * });
   * ```
   */
  'filter:export': {
    /** Field-based filter state */
    state: import('../features/filtering/types').FieldFilterState;
    /** REST export (query strings, params) */
    rest: import('../features/filtering/adapters/types').RESTFilterExport;
    /** GraphQL export (where clause, variables) */
    graphql: import('../features/filtering/adapters/types').GraphQLFilterExport;
    /** SQL export (WHERE clause, params) */
    sql: import('../features/filtering/adapters/types').SQLFilterExport;
    /** Previous filter state */
    previousState: import('../features/filtering/types').FieldFilterState;
  };

  'filter:start': {
    timestamp: number;
    filter: import('../types').FilterExpression;
  };

  'filter:end': {
    timestamp: number;
    resultCount: number;
  };

  'filter:error': {
    timestamp: number;
    error: Error;
  };

  'filter:clear': {
    timestamp: number;
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
  copy: {
    ranges: CellRange[];
    data: string;
  };

  cut: {
    ranges: CellRange[];
    data: string;
  };

  paste: {
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

  // Loading events
  'loading:start': {
    timestamp: number;
    message?: string;
  };

  'loading:end': {
    timestamp: number;
    duration: number;
  };

  'loading:progress': {
    progress: number; // 0-100
    message?: string;
  };

  // Undo/Redo events
  'undo-redo:change': {
    canUndo: boolean;
    canRedo: boolean;
    undoCount: number;
    redoCount: number;
  };

  destroy: {
    timestamp: number;
  };

  // Error events
  error: {
    message: string;
    error: Error;
    context?: any;
  };

  warning: {
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

  // Column drag events
  'column:dragStart': {
    columnId: string;
    columnIndex: number;
    column: import('../types').ColumnDef;
    nativeEvent: MouseEvent | TouchEvent;
  };

  'column:drag': {
    columnId: string;
    currentX: number;
    currentY: number;
    targetColumnId: string | null;
    targetIndex: number;
    dropPosition: 'before' | 'after' | null;
  };

  'column:dragEnd': {
    columnId: string;
    fromIndex: number;
    toIndex: number;
    cancelled: boolean;
  };

  'column:dragCancel': {
    columnId: string;
    columnIndex: number;
    reason: 'escape' | 'invalid-drop' | 'programmatic';
  };

  // Header events
  'header:click': {
    columnIndex: number;
    column: import('../types').ColumnDef;
    nativeEvent: MouseEvent;
  };

  'header:doubleClick': {
    columnIndex: number;
    column: import('../types').ColumnDef;
    nativeEvent: MouseEvent;
  };

  'header:contextMenu': {
    columnIndex: number;
    column: import('../types').ColumnDef;
    nativeEvent: MouseEvent;
  };

  'header:hover': {
    columnIndex: number;
    column: import('../types').ColumnDef;
    isHovering: boolean;
  };

  'header:sort:click': {
    columnIndex: number;
    column: import('../types').ColumnDef;
    currentDirection?: 'asc' | 'desc';
    nextDirection: 'asc' | 'desc' | null;
    additive?: boolean;
    trigger?: 'click' | 'keyboard';
    nativeEvent?: MouseEvent | KeyboardEvent;
  };

  'header:filter:click': {
    columnIndex: number;
    column: import('../types').ColumnDef;
    hasActiveFilter: boolean;
    dropdownType?: string;
    anchorElement?: HTMLElement;
  };

  'header:checkbox:change': {
    columnIndex: number;
    checked: boolean;
    action: 'select-all' | 'deselect-all';
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
