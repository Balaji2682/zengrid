import type { FilterCondition } from '../../types';

/**
 * Compiled filter predicate
 */
export type FilterPredicate<T = any> = (value: T) => boolean;

/**
 * FilterCompiler - Compiles filter conditions to optimized predicates
 *
 * Converts declarative filter conditions into efficient predicate functions.
 * Supports caching for performance.
 *
 * @example
 * ```typescript
 * const compiler = new FilterCompiler();
 *
 * // Compile single condition
 * const predicate = compiler.compile({
 *   operator: 'contains',
 *   value: 'search',
 * });
 *
 * predicate('test search string'); // true
 * predicate('no match'); // false
 *
 * // Compile multiple conditions (AND)
 * const multiPredicate = compiler.compileMultiple(
 *   [
 *     { operator: 'greaterThan', value: 10 },
 *     { operator: 'lessThan', value: 100 },
 *   ],
 *   'AND'
 * );
 *
 * multiPredicate(50); // true
 * multiPredicate(5); // false
 * ```
 */
export class FilterCompiler {
  private cache: Map<string, FilterPredicate> = new Map();

  /**
   * Compile a filter condition to a predicate function
   * @param condition - Filter condition
   * @returns Compiled predicate function
   */
  compile<T = any>(condition: FilterCondition): FilterPredicate<T> {
    const cacheKey = this.getCacheKey(condition);

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Compile predicate
    const predicate = this.compilePredicate(condition);

    // Cache it
    this.cache.set(cacheKey, predicate);

    return predicate;
  }

  /**
   * Compile multiple conditions with logic operator
   * @param conditions - Array of filter conditions
   * @param logic - Logic operator ('AND' or 'OR')
   * @returns Combined predicate function
   */
  compileMultiple<T = any>(
    conditions: FilterCondition[],
    logic: 'AND' | 'OR' = 'AND'
  ): FilterPredicate<T> {
    const predicates = conditions.map(c => this.compile(c));

    if (logic === 'AND') {
      return (value: T) => predicates.every(p => p(value));
    } else {
      return (value: T) => predicates.some(p => p(value));
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Compile a single predicate
   */
  private compilePredicate(condition: FilterCondition): FilterPredicate {
    const { operator, value } = condition;

    switch (operator) {
      case 'equals':
        return (val: any) => val === value;

      case 'notEquals':
        return (val: any) => val !== value;

      case 'contains':
        return (val: any) => {
          if (val == null) return false;
          return String(val).toLowerCase().includes(String(value).toLowerCase());
        };

      case 'notContains':
        return (val: any) => {
          if (val == null) return true;
          return !String(val).toLowerCase().includes(String(value).toLowerCase());
        };

      case 'startsWith':
        return (val: any) => {
          if (val == null) return false;
          return String(val).toLowerCase().startsWith(String(value).toLowerCase());
        };

      case 'endsWith':
        return (val: any) => {
          if (val == null) return false;
          return String(val).toLowerCase().endsWith(String(value).toLowerCase());
        };

      case 'greaterThan':
        return (val: any) => {
          if (val == null) return false;
          return Number(val) > Number(value);
        };

      case 'lessThan':
        return (val: any) => {
          if (val == null) return false;
          return Number(val) < Number(value);
        };

      case 'greaterThanOrEqual':
        return (val: any) => {
          if (val == null) return false;
          return Number(val) >= Number(value);
        };

      case 'lessThanOrEqual':
        return (val: any) => {
          if (val == null) return false;
          return Number(val) <= Number(value);
        };

      case 'blank':
        return (val: any) => val == null || String(val).trim() === '';

      case 'notBlank':
        return (val: any) => val != null && String(val).trim() !== '';

      default:
        console.warn(`Unknown filter operator: ${operator}`);
        return () => true;
    }
  }

  /**
   * Generate cache key for condition
   */
  private getCacheKey(condition: FilterCondition): string {
    return `${condition.operator}:${JSON.stringify(condition.value)}`;
  }
}
