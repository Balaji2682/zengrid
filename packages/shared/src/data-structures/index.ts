/**
 * Data Structures for ZenGrid
 */

// Sparse Matrix
export { SparseMatrix } from './sparse-matrix';
export type {
  ReadonlySparseMatrix,
  ISparseMatrix,
  SparseMatrixOptions,
} from './sparse-matrix';

// Prefix Sum Array
export { PrefixSumArray } from './prefix-sum-array';
export type {
  IPrefixSumArray,
  PrefixSumArrayOptions,
} from './prefix-sum-array';

// Column Store
export { ColumnStore } from './column-store';
export type {
  IColumnStore,
  ColumnStoreOptions,
  ColumnDefinition,
  ColumnType,
  AggregateOperation,
  AggregationResult,
} from './column-store';

// Index Map
export { IndexMap } from './index-map';
export type {
  IIndexMap,
  IndexMapEntry,
  IndexMapOptions,
} from './index-map';

// Interval Tree
export { IntervalTree } from './interval-tree';
export type {
  IIntervalTree,
  Interval,
  IntervalData,
  IntervalTreeOptions,
} from './interval-tree';
export { IntervalUtils } from './interval-tree';

// Trie
export { Trie } from './trie';
export type {
  ITrie,
  ITrieNode,
  TrieOptions,
  TrieSearchResult,
} from './trie';

// RTree
export { RTree } from './rtree';
export type {
  IRTree,
  Rectangle,
  RTreeData,
  RTreeOptions,
  RTreeSearchResult,
  RTreeStats,
} from './rtree';

// Dependency Graph
export { DependencyGraph } from './dependency-graph';
export type {
  IDependencyGraph,
  NodeId,
  Dependency,
  DependencyGraphOptions,
  TopologicalSortResult,
  GraphStats,
} from './dependency-graph';

// Suffix Array
export { SuffixArray } from './suffix-array';
export type {
  ISuffixArray,
  SuffixArrayOptions,
  SuffixSearchResult,
  SuffixArrayStats,
} from './suffix-array';

// LRU Cache
export { LRUCache } from './lru-cache';
export type {
  ILRUCache,
  LRUCacheOptions,
  CacheEntry,
  CacheStats,
} from './lru-cache';

// Command Stack
export { CommandStack } from './command-stack';
export type {
  ICommandStack,
  ICommand,
  ICommandStackOptions,
} from './command-stack';

// Segment Tree
export { SegmentTree } from './segment-tree';
export type {
  ISegmentTree,
  SegmentTreeOptions,
  AggregateFunction,
  AggregationType,
} from './segment-tree';
export { Aggregations, SegmentTreeUtils } from './segment-tree';

// Skip List
export { SkipList } from './skip-list';
export type {
  ISkipList,
  SkipListNode,
  SkipListOptions,
  RangeResult,
  SkipListStats,
} from './skip-list';
export { defaultComparator, SkipListUtils } from './skip-list';

// Disjoint Set
export { DisjointSet } from './disjoint-set';
export type {
  IDisjointSet,
  DisjointSetOptions,
  DisjointSetStats,
} from './disjoint-set';
export { DisjointSetUtils } from './disjoint-set';
