# ZenGrid Algorithms

A collection of fundamental algorithms optimized for grid and spreadsheet operations.

## 📦 Overview

This directory contains **6 algorithm categories** that power core functionality in ZenGrid. Each algorithm is designed to solve specific computational problems efficiently, particularly for large-scale grid applications.

## 🎮 Interactive Demo App

Experience all algorithms in action with our **interactive demo app**:

```bash
cd apps/demo-ds-algorithms
pnpm dev
```

The demo showcases real-world grid use cases with live performance metrics!

---

## 🔍 Algorithm Categories

### 1. **Search Algorithms** (`search/`)

#### Binary Search
Fast searching in sorted data with O(log n) complexity.

**Grid Use Cases:**
- **Virtual scrolling**: Find row/column index at scroll position
- **Sorted column search**: Locate values in sorted columns
- **Range finding**: Find cells within a value range
- **Index mapping**: Convert logical to visual indices

**Variants:**
- `binarySearch()` - Find exact match or insertion point
- `binarySearchLeft()` - Leftmost occurrence (for duplicates)
- `binarySearchRight()` - Rightmost occurrence (for duplicates)

**Performance:**
- Time: O(log n)
- Space: O(1)

**Example:**
```typescript
import { binarySearch } from '@zengrid/shared';

// Find row at scroll position 5000px with variable heights
const rowHeights = [30, 45, 30, 60, ...]; // cumulative: [30, 75, 105, 165, ...]
const cumulativeHeights = computeCumulativeHeights(rowHeights);
const rowIndex = binarySearch(cumulativeHeights, 5000);
```

**Demo:** Variable row height virtual scrolling with 100K rows

---

### 2. **Sorting Algorithms** (`sorting/`)

#### TimSort
Hybrid merge-insertion sort optimized for real-world data.

**Grid Use Cases:**
- **Column sorting**: Sort by single or multiple columns
- **Custom comparators**: Sort by type (numbers, strings, dates)
- **Stable sorting**: Maintain relative order for tied values
- **Large datasets**: Efficiently sort 100K+ rows

**Features:**
- Adaptive algorithm (faster on partially sorted data)
- Stable sort (preserves order of equal elements)
- O(n log n) worst case, O(n) best case
- Galloping mode for merging runs

**Comparators:**
- `naturalComparator()` - Numbers and strings
- `numericComparator()` - Numbers only
- `stringComparator()` - Case-sensitive strings
- `dateComparator()` - Date objects
- Custom comparators supported

**Performance:**
- Time: O(n log n) average, O(n) best case
- Space: O(n)

**Example:**
```typescript
import { timsort, numericComparator } from '@zengrid/shared';

// Sort column by numeric value
const columnData = [100, 5, 42, 7, 99];
timsort(columnData, numericComparator);
// Result: [5, 7, 42, 99, 100]

// Multi-column sort with custom comparator
timsort(rows, (a, b) => {
  const col1 = numericComparator(a.price, b.price);
  if (col1 !== 0) return col1;
  return stringComparator(a.name, b.name);
});
```

**Demo:** Interactive column sorting with 100K rows

---

### 3. **Graph Algorithms** (`graph/`)

#### Why Graph Algorithms in Grid Software?

**Critical Use Case: Formula Dependencies**

Spreadsheet formulas create a **dependency graph** where:
- **Nodes** = Cells (e.g., A1, B2, C3)
- **Edges** = Dependencies (e.g., C1 depends on A1, B1)

**Example:**
```
A1: 10
B1: 20
C1: =A1+B1    // C1 depends on A1, B1
D1: =C1*2     // D1 depends on C1
E1: =A1+D1    // E1 depends on A1, D1
```

**Dependency Graph:**
```
     A1 ─────┐
     │       │
     ├───────┼──→ C1 ───→ D1 ───┐
     │       │                  │
     └───────┴──────────────────┴──→ E1
    B1
```

---

#### Depth-First Search (DFS)

Explores as far as possible along each branch before backtracking.

**Grid Use Cases:**
1. **Cycle Detection**: Detect circular formula references
   ```typescript
   // =A1 in cell A1 is invalid
   // A1 → B1 → C1 → A1 creates a cycle
   ```

2. **Path Finding**: Trace dependency chains
   ```typescript
   // Find all cells that affect E1
   // Path: A1 → C1 → D1 → E1
   ```

3. **Connected Components**: Find independent formula groups
   ```typescript
   // Group 1: A1, B1, C1, D1, E1 (all connected)
   // Group 2: F1, G1 (independent)
   ```

**Implementations:**
- `dfs()` - Basic DFS traversal with callbacks
- `dfsPath()` - Find path between two nodes
- `hasCycle()` - Detect cycles in directed graph
- `stronglyConnectedComponents()` - Tarjan's algorithm

**Performance:**
- Time: O(V + E) where V = vertices, E = edges
- Space: O(V) for recursion stack

**Example:**
```typescript
import { hasCycle } from '@zengrid/shared/algorithms/graph';

// Build dependency graph
const graph: AdjacencyList<string> = new Map([
  ['C1', new Set(['A1', 'B1'])], // C1 = A1 + B1
  ['D1', new Set(['C1'])],       // D1 = C1 * 2
  ['E1', new Set(['A1', 'D1'])], // E1 = A1 + D1
]);

// Check for circular reference before adding
const wouldCycle = hasCycle(graph); // false

// Try adding A1 depends on E1 (creates cycle)
graph.get('A1')?.add('E1');
const nowHasCycle = hasCycle(graph); // true! (A1 → C1 → D1 → E1 → A1)
```

**See:** `packages/shared/src/data-structures/dependency-graph/` for full implementation

---

#### Breadth-First Search (BFS)

Explores nodes level by level, visiting all neighbors before going deeper.

**Grid Use Cases:**
1. **Dirty Cell Propagation**: Mark all cells affected by a change
   ```typescript
   // User changes A1
   // Level 0: A1
   // Level 1: C1 (depends on A1)
   // Level 2: D1 (depends on C1)
   // Level 3: E1 (depends on D1)
   ```

2. **Incremental Recalculation**: Calculate formulas in dependency order
   ```typescript
   // BFS from changed cell finds all affected cells
   // Ensures A1 is calculated before C1, C1 before D1, etc.
   ```

3. **Shortest Path**: Find minimum dependency chain
   ```typescript
   // Shortest path from A1 to E1: A1 → D1 → E1 (2 hops)
   // vs A1 → C1 → D1 → E1 (3 hops)
   ```

**Implementations:**
- `bfs()` - Basic BFS traversal
- `bfsShortestPath()` - Find shortest path (unweighted)
- `nodesAtDistance()` - Find all nodes at specific distance
- `connectedComponent()` - Find all connected nodes
- `allConnectedComponents()` - Find all separate groups

**Performance:**
- Time: O(V + E)
- Space: O(V) for queue

**Example:**
```typescript
import { bfs, bfsShortestPath } from '@zengrid/shared/algorithms/graph';

// When user changes A1, find all affected cells
const affectedCells = bfs(dependencyGraph, 'A1');
// Result: ['A1', 'C1', 'E1', 'D1'] (breadth-first order)

// Find shortest path to E1
const path = bfsShortestPath(dependencyGraph, 'A1', 'E1');
// path.path: ['A1', 'D1', 'E1']
// path.cost: 2 (2 edges)
```

**See:** `architectural/grid-library-architecture.md` section 3.3-3.4 for architecture

---

#### Topological Sort (Kahn's Algorithm)

**Implemented in:** `DependencyGraph` data structure

Produces a linear ordering of nodes where dependencies come before dependents.

**Grid Use Cases:**
1. **Formula Calculation Order**: Calculate cells in correct order
   ```typescript
   // Topological sort: ['A1', 'B1', 'C1', 'D1', 'E1']
   // Ensures A1 and B1 are calculated before C1
   ```

2. **Incremental Recalculation**: Recalculate only dirty cells
   ```typescript
   // Only cells [A1, C1, D1, E1] are dirty
   // Topological sort ensures correct order
   ```

3. **Cycle Detection**: Sort fails if cycles exist
   ```typescript
   // Circular reference A1 → B1 → A1 cannot be sorted
   // Topological sort detects this and returns error
   ```

**Implementation in DependencyGraph:**
```typescript
const graph = new DependencyGraph();
graph.addDependency('C1', 'A1');
graph.addDependency('C1', 'B1');
graph.addDependency('D1', 'C1');
graph.addDependency('E1', 'A1');
graph.addDependency('E1', 'D1');

const { order, hasCycle } = graph.topologicalSort();
// order: ['A1', 'B1', 'C1', 'D1', 'E1']
// hasCycle: false
```

**Performance:**
- Time: O(V + E)
- Space: O(V)

**See:** `packages/shared/src/data-structures/dependency-graph/dependency-graph.ts:313`

---

### 4. **Filter Algorithms** (`filter/`)

#### Bloom Filter
Probabilistic data structure for fast membership testing.

**Grid Use Cases:**
- **Fast column filtering**: Check if value might exist before expensive scan
- **Autocomplete optimization**: Quick check before full search
- **Duplicate detection**: Approximate check for unique values
- **Memory-efficient indexing**: Compact representation of large value sets

**Characteristics:**
- **False positives possible**: May say "yes" when answer is "no"
- **No false negatives**: Never says "no" when answer is "yes"
- **Space efficient**: Uses bit array, much smaller than hash set
- **Configurable accuracy**: Trade space for accuracy

**Operations:**
- `add(value)` - O(k) where k = number of hash functions
- `mightContain(value)` - O(k)
- False positive rate: ~1% (configurable)

**Example:**
```typescript
import { BloomFilter } from '@zengrid/shared/algorithms/filter';

// Index 10,000 product names with 1% false positive rate
const bloom = new BloomFilter(10000, 0.01);
products.forEach(p => bloom.add(p.name));

// Fast membership check
if (bloom.mightContain("iPhone 14")) {
  // Might exist - do expensive exact search
  const exact = products.find(p => p.name === "iPhone 14");
} else {
  // Definitely doesn't exist - skip expensive search
  return null;
}
```

**Demo:** Real-time filtering comparison (Bloom vs Full Scan) on 10K items

---

### 5. **Pattern Detection** (`pattern/`)

#### Sequence Detector
Detects patterns in sequences for smart autofill.

**Grid Use Cases:**
- **Smart autofill**: Excel-like drag-to-fill behavior
  ```
  Input: [1, 2, 3]      → Pattern: Arithmetic (+1)    → Fill: [4, 5, 6, 7, ...]
  Input: [2, 4, 8]      → Pattern: Geometric (×2)     → Fill: [16, 32, 64, ...]
  Input: [Jan, Feb, Mar] → Pattern: Months            → Fill: [Apr, May, Jun, ...]
  Input: [Item 1, Item 2] → Pattern: Text + Number   → Fill: [Item 3, Item 4, ...]
  ```

**Supported Patterns:**
1. **Constant**: [5, 5, 5] → continues 5, 5, 5...
2. **Arithmetic**: [1, 3, 5] → +2 each → 7, 9, 11...
3. **Geometric**: [3, 9, 27] → ×3 each → 81, 243, 729...
4. **Text + Number**: [Item 1, Item 2] → Item 3, Item 4...
5. **Custom patterns**: Months, days, quarters, etc.

**Features:**
- Confidence scoring (0-1)
- Minimum pattern length configurable
- Handles mixed numeric/text patterns
- Extensible for custom patterns

**Performance:**
- Detection: O(n) where n = sample size
- Generation: O(k) where k = number to generate

**Example:**
```typescript
import { SequenceDetector } from '@zengrid/shared/algorithms/pattern';

const detector = new SequenceDetector();

// Detect arithmetic sequence
const pattern = detector.detect([10, 20, 30]);
// { type: 'arithmetic', step: 10, confidence: 1.0 }

// Generate next values
const next = detector.continue([10, 20, 30], 5);
// [40, 50, 60, 70, 80]

// Detect text pattern
const textPattern = detector.detect(['Q1 2024', 'Q2 2024', 'Q3 2024']);
// { type: 'text_sequence', confidence: 0.9 }
```

**Demo:** Interactive autofill preview with pattern visualization

---

## 📚 How Algorithms Work Together

### Example: Formula Recalculation Pipeline

```typescript
// 1. User changes cell A1
grid.setValue('A1', 100);

// 2. Mark dirty cells using BFS
const dirtySet = markDirtyCells('A1');  // BFS traversal
// Result: ['A1', 'C1', 'D1', 'E1']

// 3. Topological sort for calculation order
const { order } = dependencyGraph.topologicalSort();
// Result: ['A1', 'C1', 'D1', 'E1']

// 4. Check for circular references (DFS)
if (dependencyGraph.wouldCreateCycle('A1', 'E1')) {
  throw new Error('Circular reference detected');
}

// 5. Calculate formulas in sorted order
order.forEach(cellId => {
  const formula = grid.getFormula(cellId);
  const value = formulaEngine.evaluate(formula);
  grid.setValue(cellId, value);
});
```

---

## 🎯 Algorithm Selection Guide

| Need | Algorithm | Time Complexity | Use Case |
|------|-----------|----------------|----------|
| Find in sorted data | Binary Search | O(log n) | Virtual scrolling, value lookup |
| Sort column | TimSort | O(n log n) | Column sorting, multi-column sort |
| Detect circular formulas | DFS (cycle detection) | O(V + E) | Formula validation |
| Calculate formulas | BFS + Topological Sort | O(V + E) | Incremental recalculation |
| Fast membership test | Bloom Filter | O(k) | Filter optimization |
| Autofill pattern | Sequence Detector | O(n) | Smart drag-to-fill |

---

## 🏗️ Architecture Integration

### Dependency Graph Architecture

From `architectural/grid-library-architecture.md`:

```typescript
class CalculationEngine {
  private graph: DependencyGraph;

  markDirty(cell: string): void {
    // BFS to mark all dependents as dirty
    const queue = [cell];
    while (queue.length > 0) {
      const current = queue.shift()!;
      this.dirtySet.add(current);

      for (const dependent of this.graph.getDependents(current)) {
        queue.push(dependent);  // ← BFS traversal
      }
    }
  }

  recalculate(): void {
    // Topological sort for calculation order
    const sorted = this.topologicalSort(this.dirtySet);  // ← Kahn's algorithm

    for (const cell of sorted) {
      this.evaluateCell(cell);
    }
  }
}
```

**Key Points:**
- **BFS**: Propagates changes through dependency graph
- **DFS**: Detects circular references
- **Topological Sort**: Determines calculation order
- **O(V + E)**: Efficient even with thousands of formulas

---

## 📖 Documentation

Each algorithm folder contains:
- `{name}.ts` - Implementation with JSDoc
- `{name}.spec.ts` - Comprehensive tests
- `{name}.perf.spec.ts` - Performance benchmarks (where applicable)
- `{name}.interface.ts` - TypeScript interfaces
- `index.ts` - Public exports

---

## 🔧 Usage Examples

### Binary Search for Virtual Scrolling
```typescript
import { binarySearch } from '@zengrid/shared';

// Find row at scroll position
const rowHeights = [30, 30, 45, 30, 60, ...]; // variable heights
const cumulative = computeCumulative(rowHeights);
const scrollTop = 5000; // pixels

const rowIndex = binarySearch(cumulative, scrollTop);
// Returns index of row at 5000px
```

### TimSort for Column Sorting
```typescript
import { timsort, numericComparator } from '@zengrid/shared';

const columnData = rows.map(r => r.price);
timsort(columnData, numericComparator);
```

### Graph Algorithms for Formulas
```typescript
import { DependencyGraph } from '@zengrid/shared';
import { dfs, bfs } from '@zengrid/shared/algorithms/graph';

const graph = new DependencyGraph();

// Add formula dependencies
graph.addDependency('C1', 'A1');  // C1 = A1 + B1
graph.addDependency('C1', 'B1');

// Check for cycles
if (graph.wouldCreateCycle('A1', 'C1')) {
  console.error('Circular reference!');
}

// Get calculation order
const { order } = graph.topologicalSort();
console.log(order); // ['A1', 'B1', 'C1']
```

### Bloom Filter for Fast Filtering
```typescript
import { BloomFilter } from '@zengrid/shared';

const filter = new BloomFilter(10000, 0.01);
columnValues.forEach(v => filter.add(v));

if (filter.mightContain(searchValue)) {
  // Do expensive exact search
}
```

### Pattern Detection for Autofill
```typescript
import { SequenceDetector } from '@zengrid/shared';

const detector = new SequenceDetector();
const pattern = detector.detect([1, 2, 3]);
const next = detector.continue([1, 2, 3], 10);
// [4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
```

---

## 🚀 Performance Characteristics

| Algorithm | Time | Space | Best For |
|-----------|------|-------|----------|
| Binary Search | O(log n) | O(1) | Sorted data lookup |
| TimSort | O(n log n) | O(n) | General purpose sorting |
| DFS | O(V + E) | O(V) | Cycle detection, path finding |
| BFS | O(V + E) | O(V) | Shortest path, level traversal |
| Topological Sort | O(V + E) | O(V) | Dependency ordering |
| Bloom Filter | O(k) | O(m) bits | Membership testing |
| Sequence Detector | O(n) | O(1) | Pattern recognition |

Where:
- n = number of elements
- V = vertices, E = edges (graphs)
- k = hash functions (Bloom)
- m = bit array size (Bloom)

---

## 🤝 Contributing

When adding new algorithms:

1. Implement with clear time/space complexity documentation
2. Add comprehensive tests (edge cases + performance)
3. Include grid-specific use cases
4. Add to demo app if applicable
5. Update this README with:
   - Algorithm description
   - Grid use cases
   - Code examples
   - Performance characteristics

---

## 📚 Further Reading

**Graph Algorithms:**
- `architectural/grid-library-architecture.md` - Formula engine architecture
- `packages/shared/src/data-structures/dependency-graph/` - Full DependencyGraph implementation

**Data Structures:**
- `packages/shared/src/data-structures/README.md` - Related data structures

**Demo App:**
- `apps/demo-ds-algorithms/` - Interactive demonstrations

---

**Built with ❤️ for high-performance spreadsheet applications**
