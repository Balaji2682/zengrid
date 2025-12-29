import type { FilterModel, FilterCondition } from '../../types';
import { FilterCompiler, type FilterPredicate } from './filter-compiler';

/**
 * Column filter options
 */
export interface ColumnFilterOptions {
  /**
   * Column index
   */
  column: number;

  /**
   * Initial filter conditions
   */
  conditions?: FilterCondition[];

  /**
   * Logic operator for multiple conditions
   * @default 'AND'
   */
  logic?: 'AND' | 'OR';

  /**
   * Callback when filter changes
   */
  onChange?: (model: FilterModel) => void;
}

/**
 * ColumnFilter - Manages filtering for a single column
 *
 * Handles filter state and predicate compilation for one column.
 *
 * @example
 * ```typescript
 * const filter = new ColumnFilter({
 *   column: 0,
 *   conditions: [
 *     { operator: 'greaterThan', value: 100 },
 *   ],
 * });
 *
 * filter.test(150); // true
 * filter.test(50); // false
 *
 * // Add condition
 * filter.addCondition({ operator: 'lessThan', value: 1000 });
 *
 * // Clear filter
 * filter.clear();
 * ```
 */
export class ColumnFilter {
  private column: number;
  private conditions: FilterCondition[] = [];
  private logic: 'AND' | 'OR';
  private onChange?: (model: FilterModel) => void;
  private compiler: FilterCompiler;
  private predicate: FilterPredicate | null = null;

  constructor(options: ColumnFilterOptions) {
    this.column = options.column;
    this.conditions = options.conditions || [];
    this.logic = options.logic || 'AND';
    this.onChange = options.onChange;
    this.compiler = new FilterCompiler();

    if (this.conditions.length > 0) {
      this.recompile();
    }
  }

  /**
   * Test a value against the filter
   * @param value - Value to test
   * @returns True if value passes filter
   */
  test(value: any): boolean {
    if (!this.predicate) return true;
    return this.predicate(value);
  }

  /**
   * Add a filter condition
   * @param condition - Filter condition to add
   */
  addCondition(condition: FilterCondition): void {
    this.conditions.push(condition);
    this.recompile();
    this.notifyChange();
  }

  /**
   * Remove a condition by index
   * @param index - Index of condition to remove
   */
  removeCondition(index: number): void {
    if (index >= 0 && index < this.conditions.length) {
      this.conditions.splice(index, 1);
      this.recompile();
      this.notifyChange();
    }
  }

  /**
   * Update a condition
   * @param index - Index of condition to update
   * @param condition - New condition
   */
  updateCondition(index: number, condition: FilterCondition): void {
    if (index >= 0 && index < this.conditions.length) {
      this.conditions[index] = condition;
      this.recompile();
      this.notifyChange();
    }
  }

  /**
   * Set all conditions at once
   * @param conditions - Array of conditions
   */
  setConditions(conditions: FilterCondition[]): void {
    this.conditions = [...conditions];
    this.recompile();
    this.notifyChange();
  }

  /**
   * Get current conditions
   */
  getConditions(): FilterCondition[] {
    return [...this.conditions];
  }

  /**
   * Set logic operator
   * @param logic - 'AND' or 'OR'
   */
  setLogic(logic: 'AND' | 'OR'): void {
    this.logic = logic;
    this.recompile();
    this.notifyChange();
  }

  /**
   * Get logic operator
   */
  getLogic(): 'AND' | 'OR' {
    return this.logic;
  }

  /**
   * Clear all conditions
   */
  clear(): void {
    this.conditions = [];
    this.predicate = null;
    this.notifyChange();
  }

  /**
   * Check if filter is active
   */
  isActive(): boolean {
    return this.conditions.length > 0;
  }

  /**
   * Get filter model
   */
  getModel(): FilterModel {
    return {
      column: this.column,
      conditions: [...this.conditions],
      logic: this.logic,
    };
  }

  /**
   * Recompile predicate
   */
  private recompile(): void {
    if (this.conditions.length === 0) {
      this.predicate = null;
    } else if (this.conditions.length === 1) {
      this.predicate = this.compiler.compile(this.conditions[0]);
    } else {
      this.predicate = this.compiler.compileMultiple(this.conditions, this.logic);
    }
  }

  /**
   * Notify change callback
   */
  private notifyChange(): void {
    if (this.onChange) {
      this.onChange(this.getModel());
    }
  }
}
