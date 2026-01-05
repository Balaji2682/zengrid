# ZenGrid Data Structures

A comprehensive collection of high-performance data structures optimized for grid and spreadsheet applications.

## 📦 Overview

This directory contains 14 specialized data structures that power various features in ZenGrid. Each structure is designed for specific use cases in grid-based applications like spreadsheets, data tables, and interactive grids.

## 🎮 Interactive Demo App

Explore all data structures with our **interactive demo app**:

```bash
cd apps/demo-ds-algorithms
pnpm dev
```

The demo app provides:
- **Live visualizations** of each data structure
- **Interactive controls** to test operations
- **Performance benchmarks** with real-time metrics
- **Use case examples** specific to grid applications
- **Stress testing** capabilities

Visit the demo to see how each structure works in action!

---

## 📊 Data Structures

### 1. **SparseMatrix**
Efficient storage for sparse 2D data where most cells are empty.

**Grid Use Cases:**
- Store cell values without allocating memory for empty cells
- Handle large grids (millions of rows/columns) with minimal memory
- Efficient for spreadsheets with sparse data

**Operations:**
- `set(row, col, value)` - O(1) average
- `get(row, col)` - O(1) average
- `delete(row, col)` - O(1) average

**Demo:** Interactive grid with sparse population patterns

---

### 2. **PrefixSumArray**
Fast range sum queries for calculating cumulative heights/widths.

**Grid Use Cases:**
- Calculate visible rows/columns in virtual scrolling
- Compute scroll positions with variable row heights
- Status bar aggregations (SUM of selected cells)

**Operations:**
- `query(start, end)` - O(log n) for range sums
- `update(index, value)` - O(log n)

**Demo:** Variable row height calculations with live updates

---

### 3. **ColumnStore**
Column-oriented storage with typed arrays for high-performance data access.

**Grid Use Cases:**
- Store column data with type safety (numbers, strings, dates)
- Fast column aggregations (SUM, MIN, MAX, AVG)
- Efficient sorting and filtering operations
- Memory-efficient bulk operations

**Operations:**
- `set(row, value)` - O(1)
- `aggregate(operation)` - O(n) but vectorized
- `slice(start, end)` - O(k) where k = slice size

**Demo:** Column-based filtering and aggregation with 100K+ rows

---

### 4. **IndexMap**
Bidirectional mapping between visual and logical indices.

**Grid Use Cases:**
- Map visual row/column positions to data model indices
- Handle hidden rows/columns
- Support row/column reordering
- Maintain sort order mappings

**Operations:**
- `visualToLogical(index)` - O(1)
- `logicalToVisual(index)` - O(1)
- `swap(index1, index2)` - O(1)

**Demo:** Dynamic row reordering and filtering visualization

---

### 5. **IntervalTree**
Efficient querying of overlapping intervals.

**Grid Use Cases:**
- Manage merged cell regions
- Track visible row/column ranges during scrolling
- Handle cell spanning and overlays
- Optimize viewport rendering

**Operations:**
- `insert(interval)` - O(log n)
- `query(point)` - O(log n + k) where k = results
- `queryRange(start, end)` - O(log n + k)

**Demo:** Merged cell detection and viewport queries

---

### 6. **RTree**
Spatial indexing for 2D cell hit testing.

**Grid Use Cases:**
- **Ultra-fast click detection** - O(log n) instead of O(n)
- Mouse hover cell detection
- Drag-and-drop target finding
- Spatial queries for visible cells

**Operations:**
- `insert(bounds, data)` - O(log n)
- `search(point)` - O(log n) for hit testing
- `searchBounds(rectangle)` - O(log n + k)

**Demo:** Interactive grid with instant click detection on 10K+ cells

---

### 7. **Trie**
Prefix tree for fast autocomplete and filtering.

**Grid Use Cases:**
- **Filter autocomplete** with instant suggestions
- Column value indexing for fast lookups
- Type-ahead search in large datasets
- Unique value tracking

**Operations:**
- `insert(word)` - O(m) where m = word length
- `search(prefix)` - O(m + k) where k = results
- `autocomplete(prefix, limit)` - O(m + k)

**Demo:** Real-time autocomplete on 10K product names

---

### 8. **DependencyGraph**
Directed graph for formula dependency tracking.

**Grid Use Cases:**
- **Formula dependencies** (e.g., C1 depends on A1, B1)
- Topological sort for calculation order
- Circular reference detection
- Incremental recalculation

**Operations:**
- `addDependency(from, to)` - O(1)
- `topologicalSort()` - O(V + E)
- `detectCycle()` - O(V + E)

**Demo:** Interactive formula graph with cycle detection

---

### 9. **LRU Cache**
Least Recently Used cache for cell value caching.

**Grid Use Cases:**
- Cache rendered cell content
- Cache formula calculation results
- Cache formatted values
- Bound memory usage with automatic eviction

**Operations:**
- `get(key)` - O(1)
- `set(key, value)` - O(1)
- Auto-eviction on capacity

**Demo:** Cell caching simulation with hit rate metrics

---

### 10. **CommandStack**
Undo/Redo stack with command pattern.

**Grid Use Cases:**
- **Undo/Redo functionality** for all grid operations
- Cell edit history
- Formatting change tracking
- Multi-level undo with bounded memory

**Operations:**
- `execute(command)` - O(1)
- `undo()` - O(1)
- `redo()` - O(1)

**Demo:** Interactive document editing with undo/redo visualization

---

### 11. **SegmentTree**
Range aggregation queries with lazy propagation.

**Grid Use Cases:**
- **Status bar aggregations** (SUM/MIN/MAX of selection)
- Dynamic range queries on sorted data
- Efficient bulk updates
- Column statistics

**Operations:**
- `query(start, end)` - O(log n)
- `update(index, value)` - O(log n)
- `rangeUpdate(start, end, value)` - O(log n) with lazy propagation

**Demo:** Range queries and updates on 100K elements with live visualization

---

### 12. **SkipList**
Probabilistic balanced structure for sorted data.

**Grid Use Cases:**
- Maintain sorted column indices
- Dynamic sorted sets
- Alternative to balanced trees (simpler, better cache locality)
- Range queries on sorted data

**Operations:**
- `set(key, value)` - O(log n) average
- `get(key)` - O(log n) average
- `range(start, end)` - O(log n + k)
- `getKth(k)` - O(k)

**Demo:** Sorted data management with 10K operations benchmark

---

### 13. **DisjointSet (Union-Find)**
Efficient tracking of merged cell regions.

**Grid Use Cases:**
- **Merged cells management** in spreadsheets
- Track connected cell regions
- Near-constant time union and find operations
- Path compression for optimal performance

**Operations:**
- `union(cell1, cell2)` - O(α(n)) ≈ O(1)
- `find(cell)` - O(α(n)) ≈ O(1)
- `connected(cell1, cell2)` - O(α(n)) ≈ O(1)

**Demo:** Interactive grid with visual merged cell regions and 100×100 benchmark

---

### 14. **SuffixArray**
Substring search for advanced filtering.

**Grid Use Cases:**
- **Substring search** (not just prefix matching)
- Advanced text filtering
- Pattern matching in cell values
- Full-text search capabilities

**Operations:**
- `search(pattern)` - O(m log n) where m = pattern length
- Build: O(n log n)

**Demo:** Real-time substring search with performance comparison vs naive scan

---

## 🎯 Use Case Matrix

| Data Structure | Primary Use | Performance | Demo Highlight |
|---------------|-------------|-------------|----------------|
| SparseMatrix | Cell storage | O(1) get/set | Sparse 1M cell grid |
| PrefixSumArray | Row heights | O(log n) query | Variable heights |
| ColumnStore | Column data | O(1) access | 100K row filtering |
| IndexMap | Row mapping | O(1) lookup | Dynamic reordering |
| IntervalTree | Merged regions | O(log n) query | Interval overlaps |
| RTree | Hit testing | O(log n) search | 10K cell clicks |
| Trie | Autocomplete | O(m + k) search | 10K product names |
| DependencyGraph | Formulas | O(V + E) sort | Cycle detection |
| LRU Cache | Cell caching | O(1) get/set | Hit rate tracking |
| CommandStack | Undo/Redo | O(1) ops | Command history |
| SegmentTree | Range queries | O(log n) query | 100K aggregations |
| SkipList | Sorted data | O(log n) ops | Sorted indices |
| DisjointSet | Merged cells | O(α(n)) ≈ O(1) | 100×100 grid |
| SuffixArray | Substring search | O(m log n) | Pattern matching |

---

## 🚀 Performance Characteristics

All data structures include:

✅ **Comprehensive tests** (40-50+ tests each)
✅ **Performance benchmarks** (small/medium/large datasets)
✅ **Edge case handling** (empty, single element, stress tests)
✅ **TypeScript type safety** with generics
✅ **Memory efficiency** tracking and optimization
✅ **Interactive demos** with visualizations

---

## 📖 Documentation

Each data structure folder contains:
- `{name}.interface.ts` - TypeScript interfaces and documentation
- `{name}.ts` - Implementation with inline comments
- `{name}.spec.ts` - Comprehensive unit tests
- `{name}.perf.spec.ts` - Performance benchmarks
- `index.ts` - Public exports

---

## 🔧 Usage Example

```typescript
import {
  SparseMatrix,
  RTree,
  Trie,
  DisjointSet,
  DisjointSetUtils,
  SegmentTree,
  AggregationType,
} from '@zengrid/shared';

// Sparse cell storage
const cells = new SparseMatrix<string>();
cells.set(0, 0, 'A1');
cells.set(1000000, 1000000, 'Far cell');

// Spatial indexing for hit testing
const rtree = new RTree<CellData>();
rtree.insert({ minX: 0, minY: 0, maxX: 100, maxY: 30 }, cellData);
const clickedCells = rtree.search({ x: 50, y: 15 });

// Filter autocomplete
const trie = new Trie();
trie.insert('Apple');
trie.insert('Application');
const suggestions = trie.autocomplete('App'); // ['Apple', 'Application']

// Merged cells
const mergedCells = new DisjointSet<[number, number]>({
  hashFn: DisjointSetUtils.gridHashFn,
  equalityFn: DisjointSetUtils.gridEqualityFn,
});
mergedCells.makeSet([0, 0]);
mergedCells.makeSet([0, 1]);
mergedCells.union([0, 0], [0, 1]); // Merge cells
console.log(mergedCells.connected([0, 0], [0, 1])); // true

// Range aggregations
const segmentTree = new SegmentTree({
  values: [1, 2, 3, 4, 5],
  type: AggregationType.SUM,
});
console.log(segmentTree.query(0, 4)); // 15
```

---

## 🎓 Learning Resources

**Interactive Demos:**
```bash
cd apps/demo-ds-algorithms
pnpm install
pnpm dev
# Open http://localhost:5173
```

**Run Tests:**
```bash
pnpm test shared
```

**Run Performance Benchmarks:**
```bash
pnpm test shared -- .perf.spec.ts
```

---

## 🏗️ Architecture

All data structures follow these principles:

1. **Interface-first design** - Clear contracts for all operations
2. **Generic types** - Reusable with any data type
3. **Immutability where possible** - Predictable behavior
4. **Performance metrics** - Built-in statistics tracking
5. **Comprehensive testing** - High code coverage
6. **Real-world optimized** - Designed for grid use cases

---

## 📊 Benchmarks Summary

Performance on typical grid operations:

| Operation | Data Structure | Time (100K elements) |
|-----------|----------------|---------------------|
| Cell get/set | SparseMatrix | 0.1ms (1K ops) |
| Hit testing | RTree | 0.01ms per click |
| Autocomplete | Trie | 0.5ms (1K matches) |
| Range sum | SegmentTree | 0.02ms per query |
| Merge cells | DisjointSet | 0.001ms per union |
| Undo/Redo | CommandStack | 0.001ms per op |
| Column filter | ColumnStore | 15ms (100K rows) |

*All benchmarks available in the demo app*

---

## 🤝 Contributing

When adding new data structures:

1. Create folder with interface, implementation, tests, and benchmarks
2. Add comprehensive documentation in interface file
3. Include grid-specific use cases
4. Add to demo app with visualization
5. Update this README

---

## 📝 License

Part of the ZenGrid project. See root LICENSE file.

---

**Built with ❤️ for high-performance grid applications**
