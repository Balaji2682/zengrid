import type { OperationMode } from '@zengrid/shared';

export function resolveQueryExecutionMode(mode: OperationMode | undefined): 'frontend' | 'backend' {
  return mode === 'backend' ? 'backend' : 'frontend';
}

export function shouldDelegateQueryState(mode: OperationMode | undefined): boolean {
  return resolveQueryExecutionMode(mode) === 'backend';
}
