import type {
  ColumnDef,
  FilterAst,
  FilterExpression,
  FilterModel,
  FilterQuickState,
} from '../../types';
import type { FilterExportResult } from './adapters/types';
import { buildFilterAst } from './filter-ast';
import type { FieldFilterState } from './types';

interface BuildModelFilterExpressionOptions {
  models: FilterModel[];
  quickFilter?: FilterQuickState | null;
  fieldState?: FieldFilterState | null;
  filterExport?: FilterExportResult | null;
  ast?: FilterAst | null;
  columns?: ColumnDef[];
}

export function buildModelFilterExpression(
  options: BuildModelFilterExpressionOptions
): FilterExpression {
  const quickFilter = options.quickFilter ?? { query: '', columns: null };
  const ast = buildFilterAst({
    ast: options.ast ?? null,
    models: options.models,
    fieldState: options.fieldState ?? null,
    quickFilter,
    columns: options.columns,
  });

  return {
    type: 'model',
    ast,
    models: options.models,
    quickFilter,
    fieldState: options.fieldState ?? null,
    filterExport: options.filterExport ?? null,
  };
}

export function hasActiveFilterExpression(
  expression: FilterExpression | null | undefined
): boolean {
  if (!expression) {
    return false;
  }

  const hasAst = expression.ast?.root != null;
  const hasModels = Array.isArray(expression.models) && expression.models.length > 0;
  const hasQuickFilter = (expression.quickFilter?.query ?? '').trim().length > 0;

  return hasAst || hasModels || hasQuickFilter;
}
