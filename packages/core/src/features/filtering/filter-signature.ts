import type { FilterAst, FilterModel } from '../../types';
import { stableHashValue } from '../../utils/stable-hash';

type FilterExecutionMode = 'none' | 'column' | 'ast' | 'unexecutable';

const filterAstSignatureCache = new WeakMap<FilterAst, string>();

export function getFilterAstSignature(ast: FilterAst | null | undefined): string {
  if (!ast?.root) {
    return '';
  }

  const cached = filterAstSignatureCache.get(ast);
  if (cached) {
    return cached;
  }

  const signature = stableHashValue(ast.root);
  filterAstSignatureCache.set(ast, signature);
  return signature;
}

export function buildFilterStateSignature(
  executionMode: FilterExecutionMode,
  models: readonly FilterModel[],
  ast?: FilterAst | null
): string {
  if (executionMode === 'none' && models.length === 0 && !ast?.root) {
    return '';
  }

  const modelSignature = models.length > 0 ? stableHashValue(models) : '';
  const astSignature =
    executionMode === 'column' || executionMode === 'none' ? '' : getFilterAstSignature(ast);

  return `mode:${executionMode}|models:${modelSignature}|ast:${astSignature}`;
}
