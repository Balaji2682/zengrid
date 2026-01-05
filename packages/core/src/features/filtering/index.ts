/**
 * Filtering system for ZenGrid
 */

export { FilterCompiler } from './filter-compiler';
export type { FilterPredicate } from './filter-compiler';

export { ColumnFilter } from './column-filter';
export type { ColumnFilterOptions } from './column-filter';

export { FilterManager } from './filter-manager';
export type { FilterManagerOptions } from './filter-manager';

export { FilterAutocomplete } from './filter-autocomplete';
export { FilterOptimizer } from './filter-optimizer';
export { SubstringFilter } from './substring-filter';

// Performance Optimizations (NEW)
export { FilterCache } from './filter-cache';
export { FilterIndexManager } from './filter-index-manager';
export { RangeFilterOptimizer } from './range-filter-optimizer';

// Field-based filtering (NEW)
export type {
  StandardFilterOperator,
  CustomOperator,
  FieldFilterCondition,
  FieldFilterGroup,
  FieldFilterState,
} from './types';

// Filter Export Manager (NEW)
export { FilterExportManager } from './filter-export-manager';
export type { FilterExportManagerOptions } from './filter-export-manager';

// Export all adapters and types
export * from './adapters';
