# ZenGrid - Data Structures & Algorithms Demo

Interactive demonstration of all implemented data structures and algorithms.

## Features Demonstrated

### 1. 🌲 Trie - Filter Autocomplete
- **What**: Prefix tree for fast autocomplete
- **Complexity**: O(m + k) where m = prefix length, k = results
- **Demo**: Type to get instant suggestions from 10,000 products
- **Speedup**: 100-1000x faster than linear search

### 2. 📍 RTree - Spatial Hit Testing
- **What**: 2D spatial index for geometric queries
- **Complexity**: O(log n) for point queries
- **Demo**: Click on virtual grid to find cell instantly
- **Speedup**: 10-100x faster than linear scan

### 3. 🔗 DependencyGraph - Formula Dependencies
- **What**: DAG for tracking formula relationships
- **Complexity**: O(V + E) topological sort
- **Demo**: Add formulas, detect circular references
- **Feature**: Correct calculation order, cycle detection

### 4. 🔍 Bloom Filter - Fast Membership Test
- **What**: Probabilistic data structure for set membership
- **Complexity**: O(k) where k = hash functions
- **Demo**: Quick "definitely not in set" checks
- **Speedup**: 100-1000x faster for negative cases

### 5. 🎯 Pattern Detection - Smart Autofill
- **What**: Sequence pattern recognition
- **Patterns**: Arithmetic, geometric, text, constant
- **Demo**: Excel-like autofill with pattern detection
- **Feature**: Detects 1,2,3... or "Item 1", "Item 2"...

## Running the Demo

```bash
# From the root of the monorepo
pnpm install

# Start the demo
cd apps/demo-ds-algorithms
pnpm dev
```

The demo will open at http://localhost:3001

## What to Try

### Trie Demo
1. Click "Index Sample Data" to load 10,000 products
2. Type "app" → See Apple products instantly
3. Type "sam" → See Samsung products
4. Type "mic" → See Microsoft products
5. Notice the sub-millisecond query times!

### RTree Demo
1. Click "Initialize Grid" to create 10,000 virtual cells
2. Click anywhere in the output box
3. See which cell was hit in microseconds
4. Try clicking different positions
5. Notice O(log n) performance vs O(n) linear scan

### DependencyGraph Demo
1. Add formula: "C1 = A1 + B1"
2. Add formula: "D1 = C1 * 2"
3. Add formula: "E1 = D1 + 10"
4. Click "Get Calculation Order" → See correct order
5. Click "Test Circular Reference" → See cycle detection!

### Bloom Filter Demo
1. Make sure Trie demo is indexed first
2. Search for "iPhone" → Bloom filter says "might exist"
3. Search for "xyz123" → Bloom filter says "definitely NOT"
4. Compare Bloom filter time vs full scan time
5. Notice 100-1000x speedup for negative cases

### Pattern Detection Demo
1. Try preset "1,2,3" → Arithmetic sequence detected
2. Try preset "2,4,8" → Geometric sequence detected
3. Try preset "Item 1, Item 2" → Text pattern detected
4. Create your own pattern!
5. Notice confidence scores

## Architecture

All demos use the actual Grid class from `@zengrid/core`:

```typescript
import { Grid } from '@zengrid/core';

const grid = new Grid(container, options);

// Access all DS & algorithms via public API
grid.spatialHitTester      // RTree
grid.filterAutocomplete    // Trie
grid.filterOptimizer       // Bloom Filter
grid.formulaCalculator     // DependencyGraph
grid.autofillManager       // Pattern Detection
```

## Performance Metrics

| Feature | Before | After | Improvement |
|---------|--------|-------|-------------|
| Autocomplete | O(n) scan | O(m+k) trie | 100-1000x |
| Hit Testing | O(n) loop | O(log n) rtree | 10-100x |
| Formula Recalc | Recalc all | Recalc affected | 10-100x |
| Filter Check | Full scan | Bloom filter | 100-1000x |

## Technology Stack

- **Frontend**: Vanilla HTML/CSS/TypeScript
- **Build**: Vite
- **Grid**: @zengrid/core
- **DS/Algorithms**: @zengrid/shared

## Files

```
apps/demo-ds-algorithms/
├── index.html           # Main UI
├── src/
│   └── main.ts         # Demo logic
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md           # This file
```

## Browser Support

- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

## License

MIT
