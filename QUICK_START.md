# ZenGrid - Quick Start Guide

Get up and running with ZenGrid in 5 minutes!

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/zengrid.git
cd zengrid

# Install dependencies
pnpm install

# Build packages
pnpm build
```

## 📦 Available Scripts

### Development

```bash
# Run demo application
pnpm demo

# Watch mode for development
pnpm test:watch

# Type check
pnpm typecheck
```

### Testing

```bash
# Run all tests
pnpm test

# Run core package tests
pnpm test:core

# Run shared package tests
pnpm test:shared

# Run performance benchmarks
pnpm test:perf

# Test with coverage
pnpm test:coverage
```

### Building

```bash
# Build all packages
pnpm build

# Build core package
pnpm build:core

# Build shared package
pnpm build:shared

# Build demo application
pnpm demo:build
```

### Documentation

```bash
# Generate API documentation
pnpm docs:api

# Serve documentation locally
pnpm docs:serve
# Opens at http://localhost:8000
```

### Code Quality

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Check formatting
pnpm format:check

# Clean build artifacts
pnpm clean
```

## 🎯 First Example

### 1. Basic Grid

```typescript
import { Grid } from '@zengrid/core';

// Create container
const container = document.getElementById('grid');

// Initialize grid
const grid = new Grid(container, {
  rowCount: 1000,
  colCount: 10,
  rowHeight: 30,
  colWidth: 100,
});

// Set data
const data = Array.from({ length: 1000 }, (_, row) =>
  Array.from({ length: 10 }, (_, col) => `Cell ${row},${col}`)
);

grid.setData(data);
grid.render();
```

### 2. With Editing

```typescript
import { Grid, EditorManager } from '@zengrid/core';

const grid = new Grid(container, {
  rowCount: 100,
  colCount: 5,
  rowHeight: 30,
  colWidth: 150,
  columns: [
    { field: 'id', header: 'ID', editor: 'number' },
    { field: 'name', header: 'Name', editor: 'text' },
    { field: 'status', header: 'Status', editor: 'select' },
    { field: 'date', header: 'Date', editor: 'date' },
  ],
});

// Create editor manager
const editorManager = new EditorManager({
  container: grid.container,
  getValue: (row, col) => data[row][col],
  setValue: (row, col, value) => { data[row][col] = value; },
  getCellElement: (row, col) => /* get element */,
});

// Start editing on double-click
grid.onCellDoubleClick = (cell) => {
  editorManager.startEdit(cell);
};
```

### 3. With Filtering

```typescript
import { Grid, FilterManager } from '@zengrid/core';

const grid = new Grid(container, options);

const filterManager = new FilterManager({
  colCount: 10,
  getValue: (row, col) => data[row][col],
});

// Filter column 0 for values > 100
filterManager.setColumnFilter(0, [
  { operator: 'greaterThan', value: 100 }
]);

// Get visible rows
const visible = filterManager.getVisibleRows(rowCount);
```

### 4. With Sorting

```typescript
import { Grid, SortManager } from '@zengrid/core';

const grid = new Grid(container, options);

const sortManager = new SortManager({
  rowCount: 1000,
  getValue: (row, col) => data[row][col],
});

// Sort by column 0
sortManager.toggleSort(0);

// Get sorted index map
const indexMap = sortManager.getIndexMap();
const sortedRow = indexMap.getRowAt(0);
```

## 🎨 Theming

### CSS Variables

```css
:root {
  --zg-bg-primary: #ffffff;
  --zg-bg-selected: #e3f2fd;
  --zg-border-color: #e0e0e0;
  --zg-border-active: #2196f3;
  --zg-text-primary: #333333;
}

/* Dark theme */
[data-theme="dark"] {
  --zg-bg-primary: #1e1e1e;
  --zg-bg-selected: #1a3a52;
  --zg-border-color: #404040;
  --zg-text-primary: #e0e0e0;
}
```

## 📱 Mobile Support

```typescript
import { Grid, TouchHandler } from '@zengrid/core';

const grid = new Grid(container, options);

const touchHandler = new TouchHandler({
  container: grid.container,
  getCellAtPoint: (x, y) => hitTester.getCellAtPoint(x, y),
  onTap: (cell) => console.log('Tapped:', cell),
  onDoubleTap: (cell) => startEditing(cell),
  onLongPress: (cell) => showContextMenu(cell),
});
```

## 🌍 RTL Support

```typescript
import { Grid, RTLSupport } from '@zengrid/core';

const grid = new Grid(container, options);

const rtl = new RTLSupport({
  container: grid.container,
  direction: 'rtl', // or 'ltr'
});
```

## ♿ Accessibility

```typescript
import { Grid, ARIAManager, FocusManager, KeyboardNavigator } from '@zengrid/core';

const grid = new Grid(container, options);

// ARIA support
const aria = new ARIAManager({
  container: grid.container,
  rowCount: 1000,
  colCount: 10,
  label: 'Data grid',
});

// Focus management
const focus = new FocusManager({
  container: grid.container,
  getCellElement: (row, col) => getCellElement(row, col),
});

// Keyboard navigation
const keyboard = new KeyboardNavigator({
  container: grid.container,
  focusManager: focus,
  rowCount: 1000,
  colCount: 10,
});
```

## 🎯 Performance Tips

### 1. Choose Right Storage

```typescript
// Sparse data (< 50% cells filled)
const model = new GridDataModel({
  rowCount: 100000,
  colCount: 10,
  storage: 'sparse',
});

// Dense data (> 50% cells filled)
const model = new GridDataModel({
  rowCount: 100000,
  colCount: 3,
  storage: 'columnar',
  columns: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string' },
    { name: 'active', type: 'boolean' },
  ],
});
```

### 2. Batch Updates

```typescript
// Bad
for (let i = 0; i < 1000; i++) {
  grid.updateCells([{ row: i, col: 0 }]);
}

// Good
const cells = Array.from({ length: 1000 }, (_, i) => ({ row: i, col: 0 }));
grid.updateCells(cells);
```

### 3. Virtual Scrolling Config

```typescript
const grid = new Grid(container, {
  // ... other options
  overscanRows: 5,  // Render 5 extra rows above/below viewport
  overscanCols: 2,  // Render 2 extra cols left/right
});
```

## 📚 Next Steps

1. **Explore Examples**: Check `/apps/demo/` for complete examples
2. **Read API Docs**: Run `pnpm docs:api && pnpm docs:serve`
3. **Check Performance**: Run `pnpm test:perf`
4. **Review Architecture**: See `IMPLEMENTATION_PLAN.md`

## 🐛 Troubleshooting

### Build Issues

```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

### Test Failures

```bash
# Run with verbose output
pnpm test --verbose

# Run specific test
pnpm test packages/core/src/events/event-emitter.spec.ts
```

### Performance Issues

```bash
# Run performance benchmarks
pnpm test:perf

# Check for memory leaks
node --expose-gc node_modules/.bin/jest packages/core/test/performance/benchmarks.spec.ts
```

## 💡 Tips

1. **Always call destroy()** when removing grid
2. **Use appropriate data storage** (sparse vs columnar)
3. **Batch updates** for better performance
4. **Enable ARIA** for accessibility (enabled by default)
5. **Test on real devices** for mobile support

## 🔗 Resources

- **Documentation**: `/API_DOCUMENTATION.md`
- **Architecture**: `/IMPLEMENTATION_PLAN.md`
- **Progress**: `/PROGRESS.md`
- **Final Report**: `/FINAL_IMPLEMENTATION_REPORT.md`

## 📞 Support

- **Issues**: Create a GitHub issue
- **Discussions**: Use GitHub Discussions
- **PRs**: Contributions welcome!

---

**Happy Coding with ZenGrid!** 🎉
