/**
 * ZenGrid Shared Package
 * Reusable algorithms and data structures
 *
 * @packageDocumentation
 */

// Data Structures
export { SparseMatrix } from './data-structures/sparse-matrix';
export type {
  ReadonlySparseMatrix,
  ISparseMatrix,
  SparseMatrixOptions,
} from './data-structures/sparse-matrix';

export { PrefixSumArray } from './data-structures/prefix-sum-array';
export type {
  IPrefixSumArray,
  PrefixSumArrayOptions,
} from './data-structures/prefix-sum-array';

export { ColumnStore } from './data-structures/column-store';
export type {
  IColumnStore,
  ColumnStoreOptions,
  ColumnDefinition,
  ColumnType,
  AggregateOperation,
  AggregationResult,
} from './data-structures/column-store';

// Algorithms
export {
  binarySearch,
  binarySearchLeft,
  binarySearchRight,
} from './algorithms/search';
export type {
  BinarySearchOptions,
  BinarySearchResult,
} from './algorithms/search';

// Types
export type {
  Comparator,
  Predicate,
  EqualityFn,
  HashFn,
  Range,
  Rectangle,
  Point,
  BoundingBox,
} from './types';

// Version
export const VERSION = '0.1.0';
