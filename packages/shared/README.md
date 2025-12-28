# @zengrid/shared

Shared algorithms and data structures for ZenGrid - reusable primitives for building high-performance grid applications.

## Features

### Data Structures
- **SparseMatrix** - Memory-efficient storage for large grids with empty cells
- **PrefixSumArray** - Fast range queries for cumulative data
- **ColumnStore** - Column-oriented storage with typed arrays
- **IntervalTree** - Efficient range overlap queries
- **R-Tree** - 2D spatial indexing for hit testing
- **Trie** - Prefix-based autocomplete
- **DependencyGraph** - DAG for formula dependencies

### Algorithms
- **Binary Search** - O(log n) search in sorted arrays
- **Topological Sort** - DAG ordering (Kahn's algorithm)
- **Cycle Detection** - Find circular dependencies (DFS)
- **Pattern Detection** - Autofill pattern recognition
- **Predicate Compiler** - Optimize filter expressions

## Installation

```bash
npm install @zengrid/shared
```

## Usage

### Barrel Imports
```typescript
import { SparseMatrix, binarySearch } from '@zengrid/shared';
```

### Deep Imports (Better Tree-Shaking)
```typescript
import { binarySearch } from '@zengrid/shared/algorithms/search';
import { SparseMatrix } from '@zengrid/shared/data-structures/sparse-matrix';
```

## License

MIT
