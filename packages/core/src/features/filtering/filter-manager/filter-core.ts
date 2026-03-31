import type {
  ColumnDef,
  FilterAst,
  FilterAstNode,
  FilterCondition,
  FilterModel,
} from '../../../types';
import type { EventEmitter } from '../../../events/event-emitter';
import type { GridEvents } from '../../../events/grid-events';
import { ColumnFilter } from '../column-filter';
import { buildUnexecutableFilterError } from '../filter-execution-error';
import {
  buildFilterAstFromModels,
  buildFilterAstFromNodes,
  buildFilterAstNodeFromModel,
  projectFilterAstToModels,
} from '../filter-ast';
import { FilterAstCompiler, type FilterAstRowPredicate } from '../filter-ast-compiler';
import { buildFilterStateSignature } from '../filter-signature';

/**
 * FilterCore - Core filter state management
 *
 * Keeps a canonical AST while maintaining the current column-filter engine as a
 * derived projection for frontend execution.
 */
export class FilterCore {
  private colCount: number;
  private columns?: ColumnDef[];
  private events?: EventEmitter<GridEvents>;
  private getValue: (row: number, col: number) => any;
  private columnFilters: Map<number, ColumnFilter> = new Map();
  private columnAstNodes: Map<number, FilterAstNode> = new Map();
  private filterState: FilterModel[] = [];
  private filterStateSnapshot: FilterModel[] = [];
  private filterStateHash = '';
  private filterAst: FilterAst | null = null;
  private astProjectionWarnings: string[] = [];
  private astExecutionWarnings: string[] = [];
  private compiledAstPredicate: FilterAstRowPredicate | null = null;
  private executionMode: 'none' | 'column' | 'ast' | 'unexecutable' = 'none';
  private astCompiler: FilterAstCompiler;

  // Callbacks for cache invalidation and optimization
  private onFilterStateChange?: () => void;

  constructor(
    colCount: number,
    getValue: (row: number, col: number) => any,
    columns?: ColumnDef[],
    events?: EventEmitter<GridEvents>,
    onFilterStateChange?: () => void
  ) {
    this.colCount = colCount;
    this.getValue = getValue;
    this.columns = columns;
    this.events = events;
    this.onFilterStateChange = onFilterStateChange;
    this.astCompiler = this.createAstCompiler();
  }

  /**
   * Initialize with filter models
   */
  initializeFilters(initialFilters: FilterModel[]): void {
    this.setFilterModels(initialFilters);
  }

  /**
   * Set filter for a column
   * @param column - Column index
   * @param conditions - Filter conditions
   * @param logic - Logic operator ('AND' or 'OR')
   */
  setColumnFilter(
    column: number,
    conditions: FilterCondition[],
    logic: 'AND' | 'OR' = 'AND'
  ): void {
    this.assertColumnInBounds(column);

    if (conditions.length === 0) {
      this.clearColumnFilter(column);
      return;
    }

    const filter = this.createColumnFilter(column, conditions, logic);
    this.columnFilters.set(column, filter);
    this.syncStateFromColumnModel(filter.getModel());
    this.emitFilterChange();
  }

  /**
   * Replace the derived FilterModel state and optionally pin a canonical AST.
   */
  setFilterModels(
    models: FilterModel[],
    options: {
      ast?: FilterAst | null;
      projectionWarnings?: string[];
    } = {}
  ): void {
    this.columnFilters.clear();
    this.columnAstNodes.clear();

    const nextState: FilterModel[] = [];

    for (const model of models) {
      if (!model.conditions || model.conditions.length === 0) {
        continue;
      }

      this.assertColumnInBounds(model.column);

      const filter = this.createColumnFilter(model.column, model.conditions, model.logic ?? 'AND');
      const nextModel = filter.getModel();

      this.columnFilters.set(nextModel.column, filter);
      this.upsertFilterState(nextModel, nextState);
      this.upsertColumnAstNode(nextModel);
    }

    this.filterState = nextState;
    this.refreshFilterStateSnapshot();
    this.filterAst =
      options.ast !== undefined
        ? options.ast
        : buildFilterAstFromNodes(Array.from(this.columnAstNodes.values()), { source: 'model' });
    this.astProjectionWarnings = dedupeWarnings(options.projectionWarnings ?? []);
    this.syncExecutionState();
    this.filterStateHash = this.buildFilterStateHash();

    this.notifyFilterStateChange();
  }

  /**
   * Set canonical AST state and derive the current frontend-compatible model state from it.
   */
  setFilterAst(ast: FilterAst | null): void {
    const projection = projectFilterAstToModels(ast, { columns: this.columns });
    const canonicalAst =
      projection.complete && projection.models.length > 0
        ? buildFilterAstFromModels(projection.models, { columns: this.columns })
        : ast;

    this.setFilterModels(projection.models, {
      ast: canonicalAst,
      projectionWarnings: projection.warnings,
    });
  }

  /**
   * Update column metadata used for model/AST projections.
   */
  setColumns(columns: ColumnDef[]): void {
    this.columns = columns;
    this.astCompiler = this.createAstCompiler();

    if (this.filterAst) {
      if (this.executionMode === 'column' && this.filterState.length > 0) {
        this.rebuildColumnAstNodes();
        this.filterAst = buildFilterAstFromNodes(Array.from(this.columnAstNodes.values()), {
          source: 'model',
        });
        this.filterStateHash = this.buildFilterStateHash();
        return;
      }

      this.setFilterAst(this.filterAst);
      return;
    }

    if (this.filterState.length > 0) {
      this.rebuildColumnAstNodes();
      this.filterAst = buildFilterAstFromNodes(Array.from(this.columnAstNodes.values()), {
        source: 'model',
      });
      this.filterStateHash = this.buildFilterStateHash();
    }
  }

  setColCount(colCount: number): void {
    this.colCount = colCount;
    this.astCompiler = this.createAstCompiler();

    if (!this.filterAst) {
      return;
    }

    if (this.executionMode === 'column') {
      this.filterStateHash = this.buildFilterStateHash();
      return;
    }

    this.syncExecutionState();
    this.filterStateHash = this.buildFilterStateHash();
  }

  /**
   * Clear filter for a column
   * @param column - Column index
   */
  clearColumnFilter(column: number): void {
    if (this.columnFilters.has(column)) {
      this.columnFilters.delete(column);
      this.removeColumnState(column);
      this.emitFilterChange();
    }
  }

  /**
   * Clear all filters
   */
  clearAll(): void {
    this.columnFilters.clear();
    this.columnAstNodes.clear();
    this.filterState = [];
    this.refreshFilterStateSnapshot();
    this.filterStateHash = '';
    this.filterAst = null;
    this.astProjectionWarnings = [];
    this.astExecutionWarnings = [];
    this.compiledAstPredicate = null;
    this.executionMode = 'none';
    this.emitFilterChange();
    this.notifyFilterStateChange();
  }

  /**
   * Test if a row passes all filters
   * @param row - Row index
   * @returns True if row passes filter
   */
  testRow(row: number): boolean {
    if (this.executionMode === 'none') {
      return true;
    }

    if (this.executionMode === 'unexecutable') {
      throw buildUnexecutableFilterError(this.astExecutionWarnings);
    }

    if (this.executionMode === 'ast') {
      return this.compiledAstPredicate ? this.compiledAstPredicate(row) : true;
    }

    for (const [column, filter] of this.columnFilters) {
      const value = this.getValue(row, column);
      if (!filter.test(value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all visible row indices (basic version without optimization)
   * @param rowCount - Total row count
   * @returns Array of visible row indices
   */
  getVisibleRowsBasic(rowCount: number): number[] {
    if (this.executionMode === 'unexecutable') {
      throw buildUnexecutableFilterError(this.astExecutionWarnings);
    }

    const visible: number[] = [];
    for (let row = 0; row < rowCount; row++) {
      if (this.testRow(row)) {
        visible.push(row);
      }
    }
    return visible;
  }

  /**
   * Get current legacy FilterModel state
   */
  getFilterState(): FilterModel[] {
    return this.filterStateSnapshot;
  }

  /**
   * Get the canonical filter AST state
   */
  getFilterAst(): FilterAst | null {
    return this.filterAst;
  }

  /**
   * Get warnings from the last AST -> FilterModel projection.
   */
  getAstProjectionWarnings(): string[] {
    return [...this.astProjectionWarnings];
  }

  /**
   * Get warnings from the last AST -> frontend predicate compilation.
   */
  getAstExecutionWarnings(): string[] {
    return [...this.astExecutionWarnings];
  }

  /**
   * Get filter state hash for caching
   */
  getFilterStateHash(): string {
    return this.filterStateHash;
  }

  /**
   * Check if any frontend-evaluable filters are active
   */
  hasActiveFilters(): boolean {
    return this.executionMode !== 'none';
  }

  /**
   * Check if any canonical filters are active, even if the current frontend evaluator
   * cannot execute them yet.
   */
  hasStructuredFilters(): boolean {
    return this.filterAst?.root != null;
  }

  /**
   * Check if frontend execution is currently using the AST predicate compiler.
   */
  isUsingAstExecution(): boolean {
    return this.executionMode === 'ast';
  }

  /**
   * Check if canonical filters exist but frontend execution cannot evaluate them.
   */
  hasUnexecutableFilters(): boolean {
    return this.executionMode === 'unexecutable';
  }

  /**
   * Check whether optimization can safely use the current column-filter projection.
   */
  canOptimizeWithColumnFilters(): boolean {
    return this.executionMode === 'column';
  }

  /**
   * Get filter for specific column
   * @param column - Column index
   */
  getColumnFilter(column: number): ColumnFilter | undefined {
    return this.columnFilters.get(column);
  }

  /**
   * Get all column filters
   */
  getColumnFilters(): Map<number, ColumnFilter> {
    return this.columnFilters;
  }

  /**
   * Emit filter change event
   */
  private emitFilterChange(): void {
    if (!this.events) return;

    this.events.emit('filter:change', {
      filterState: this.filterState,
      previousFilterState: [],
    });
  }

  private createColumnFilter(
    column: number,
    conditions: FilterCondition[],
    logic: 'AND' | 'OR'
  ): ColumnFilter {
    return new ColumnFilter({
      column,
      conditions,
      logic,
      onChange: (model) => this.syncStateFromColumnModel(model),
    });
  }

  private syncExecutionState(): void {
    this.astExecutionWarnings = [];
    this.compiledAstPredicate = null;

    if (!this.filterAst?.root) {
      this.executionMode = 'none';
      return;
    }

    if (this.astProjectionWarnings.length === 0 && this.columnFilters.size > 0) {
      this.executionMode = 'column';
      return;
    }

    const compiled = this.astCompiler.compile(this.filterAst);

    this.astExecutionWarnings = compiled.warnings;

    if (compiled.predicate) {
      this.compiledAstPredicate = compiled.predicate;
      this.executionMode = 'ast';
      return;
    }

    this.executionMode = 'unexecutable';
  }

  private buildFilterStateHash(): string {
    return buildFilterStateSignature(this.executionMode, this.filterState, this.filterAst);
  }

  private assertColumnInBounds(column: number): void {
    if (column < 0 || column >= this.colCount) {
      throw new RangeError(`Column ${column} out of bounds`);
    }
  }

  private notifyFilterStateChange(): void {
    if (this.onFilterStateChange) {
      this.onFilterStateChange();
    }
  }

  private syncStateFromColumnModel(model: FilterModel): void {
    this.upsertFilterState(model);
    this.upsertColumnAstNode(model);
    this.syncColumnDerivedState();
  }

  private removeColumnState(column: number): void {
    const index = this.filterState.findIndex((model) => model.column === column);
    if (index >= 0) {
      this.filterState.splice(index, 1);
    }

    this.columnAstNodes.delete(column);
    this.syncColumnDerivedState();
  }

  private syncColumnDerivedState(): void {
    this.filterAst = buildFilterAstFromNodes(Array.from(this.columnAstNodes.values()), {
      source: 'model',
    });
    this.astProjectionWarnings = [];
    this.astExecutionWarnings = [];
    this.compiledAstPredicate = null;
    this.executionMode = this.filterState.length === 0 ? 'none' : 'column';
    this.refreshFilterStateSnapshot();
    this.filterStateHash = this.buildFilterStateHash();
    this.notifyFilterStateChange();
  }

  private upsertFilterState(model: FilterModel, target = this.filterState): void {
    const index = target.findIndex((candidate) => candidate.column === model.column);
    if (index >= 0) {
      target[index] = model;
      return;
    }

    target.push(model);
  }

  private upsertColumnAstNode(model: FilterModel): void {
    const astNode = buildFilterAstNodeFromModel(model, { columns: this.columns });
    if (astNode) {
      this.columnAstNodes.set(model.column, astNode);
    } else {
      this.columnAstNodes.delete(model.column);
    }
  }

  private rebuildColumnAstNodes(): void {
    this.columnAstNodes.clear();
    for (const model of this.filterState) {
      this.upsertColumnAstNode(model);
    }
  }

  private refreshFilterStateSnapshot(): void {
    this.filterStateSnapshot = Object.freeze([...this.filterState]) as FilterModel[];
  }

  private createAstCompiler(): FilterAstCompiler {
    return new FilterAstCompiler({
      colCount: this.colCount,
      getValue: this.getValue,
      columns: this.columns,
    });
  }
}

function dedupeWarnings(warnings: string[]): string[] {
  return Array.from(new Set(warnings));
}
