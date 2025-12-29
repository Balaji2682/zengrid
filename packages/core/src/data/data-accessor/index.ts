/**
 * DataAccessor - Unified interface for accessing different data sources
 * @packageDocumentation
 */

export type { DataAccessor } from './data-accessor.interface';
export {
  SparseMatrixAccessor,
  createSparseMatrixAccessor,
} from './sparse-matrix-accessor';
export {
  ColumnStoreAccessor,
  createColumnStoreAccessor,
} from './column-store-accessor';
export { ArrayAccessor, createArrayAccessor } from './array-accessor';
