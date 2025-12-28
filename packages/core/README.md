# @zengrid/core

High-performance data grid library for web applications.

## Features

- 🚀 **Virtual Scrolling** - Handle millions of rows with 60 FPS performance
- ⌨️ **Full Keyboard Navigation** - Excel-like keyboard shortcuts
- 📱 **Touch Support** - Mobile-friendly gestures
- ♿ **Accessibility** - WCAG 2.1 AA compliant
- 🌍 **i18n & RTL** - Full internationalization support
- 📋 **Copy/Paste** - Native clipboard integration
- 🎨 **Customizable** - Flexible styling and theming

## Installation

```bash
npm install @zengrid/core
```

## Quick Start

```typescript
import { Grid } from '@zengrid/core';
import '@zengrid/core/styles.css';

const container = document.getElementById('grid-container')!;

const grid = new Grid(container, {
  rowCount: 100000,
  colCount: 10,
  rowHeight: 30,
  colWidth: 100
});

// Set data
grid.setData([
  ['Cell 0,0', 'Cell 0,1', ...],
  ['Cell 1,0', 'Cell 1,1', ...],
  ...
]);

// Render
grid.render();
```

## License

MIT License - Free for commercial and non-commercial use.

## Links

- [Documentation](https://zengrid.dev/docs)
- [Examples](https://zengrid.dev/examples)
- [GitHub](https://github.com/yourusername/zengrid)
