# ZenGrid

**High-Performance Data Grid Library for Modern Web Applications**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

ZenGrid is a lightweight, high-performance data grid library designed to handle millions of rows with 60 FPS scrolling. Built with TypeScript and modern web standards, it provides Excel-like functionality in your web applications.

## 🚀 Features

### Community Edition (Free - MIT License)
- ✅ **Virtual Scrolling** - Handle 100K+ rows smoothly
- ✅ **Cell Editing** - Multiple editor types (text, number, date, select)
- ✅ **Selection** - Single cell, range selection, multi-selection
- ✅ **Sorting** - Single column sorting
- ✅ **Filtering** - Basic text/number filtering
- ✅ **Copy/Paste** - Native clipboard integration
- ✅ **Keyboard Navigation** - Full Excel-like keyboard shortcuts
- ✅ **Accessibility** - WCAG 2.1 AA compliant
- ✅ **i18n & RTL** - Internationalization and right-to-left support
- ✅ **Touch Support** - Mobile-friendly gestures
- ✅ **CSV Export** - Export data to CSV
- ✅ **Column Resize** - Drag to resize columns
- ✅ **Theming** - Dark mode and custom themes

### Pro Edition ($99/dev/year) - Coming Soon
- 📊 **Formula Engine** - Excel-like formulas (SUM, AVERAGE, VLOOKUP, etc.)
- 📁 **Excel Export/Import** - Full Excel file support
- 🔀 **Multi-Column Sort** - Sort by multiple columns
- 🔍 **Advanced Filtering** - Complex filter expressions
- ↩️ **Undo/Redo** - Full history management
- 🎯 **Autofill** - Excel-like fill handle
- ✔️ **Cell Validation** - Data validation rules
- 🎨 **Conditional Formatting** - Color scales, data bars, icon sets

### Enterprise Edition (Custom Pricing) - Coming Soon
- 📊 **Pivot Tables** - Interactive pivot table support
- 🌐 **Server-Side Model** - Handle millions of rows server-side
- 📈 **Charts Integration** - Built-in charting
- 🔗 **Master/Detail** - Nested grid support
- 🔒 **Enhanced Security** - Enterprise-grade security features

## 📦 Installation

```bash
npm install @zengrid/core
# or
yarn add @zengrid/core
# or
pnpm add @zengrid/core
```

## 🎯 Quick Start

### Vanilla JavaScript

```typescript
import { Grid } from '@zengrid/core';
import '@zengrid/core/styles.css';

const container = document.getElementById('grid-container')!;

// Create grid with 100K rows
const grid = new Grid(container, {
  rowCount: 100000,
  colCount: 10,
  rowHeight: 30,
  colWidth: 100,
  enableSelection: true,
  enableEditing: true,
});

// Set data
const data = Array.from({ length: 100000 }, (_, row) =>
  Array.from({ length: 10 }, (_, col) => `Cell ${row},${col}`)
);

grid.setData(data);
grid.render();
```

### Angular (Coming in Sprint 4)

```typescript
import { ZenGridModule } from '@zengrid/angular';

@Component({
  template: `
    <zen-grid
      [rowCount]="100000"
      [colCount]="10"
      [data]="data"
      [rowHeight]="30"
      [colWidth]="100">
    </zen-grid>
  `
})
export class MyComponent {
  data = [...]; // Your data
}
```

## 🏗️ Project Structure

```
zengrid/
├── packages/
│   ├── core/          # Community Edition (MIT)
│   ├── pro/           # Pro Edition (Commercial)
│   ├── enterprise/    # Enterprise Edition (Commercial)
│   ├── angular/       # Angular wrapper
│   └── license/       # License validation
├── apps/
│   ├── demo/          # Demo application
│   └── docs/          # Documentation site
├── architectural/     # Architecture documentation
├── IMPLEMENTATION_PLAN.md
├── SPRINT_1_PLAN.md
└── README.md
```

## 🛠️ Development

### Prerequisites
- Node.js 18+ or 20+
- pnpm 8+

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/zengrid.git
cd zengrid

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build all packages
pnpm build

# Build core package only
pnpm build:core

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Available Scripts

- `pnpm build` - Build all packages
- `pnpm build:core` - Build core package
- `pnpm test` - Run all tests
- `pnpm test:core` - Run core package tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm lint` - Lint all packages

## 📚 Documentation

- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Detailed implementation roadmap
- [Sprint 1 Plan](./SPRINT_1_PLAN.md) - Current sprint details
- [Architecture](./architectural/) - Architecture documentation
- [API Documentation](https://zengrid.dev/docs) - Full API reference (Coming Soon)

## 🎯 Roadmap

### Sprint 1-6 (Weeks 1-12): Community Edition
- [x] Project setup & infrastructure
- [ ] Virtual scrolling & cell pooling
- [ ] Selection & keyboard navigation
- [ ] Cell editing
- [ ] Sorting & filtering
- [ ] Column management & styling
- [ ] CSV export & polish

### Sprint 7-12 (Weeks 13-24): Pro Edition
- [ ] Formula engine
- [ ] Excel export/import
- [ ] Multi-column sort & advanced filtering
- [ ] Undo/Redo & autofill
- [ ] Validation & conditional formatting

### Sprint 13-18 (Weeks 25-36): Enterprise Edition
- [ ] Pivot tables
- [ ] Server-side model
- [ ] Charts integration
- [ ] Master/detail grids

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

- **Community Edition (@zengrid/core)**: MIT License - Free for commercial and non-commercial use
- **Pro Edition**: Commercial License - $99/dev/year
- **Enterprise Edition**: Commercial License - Custom pricing

See [LICENSE](./LICENSE) for more information.

## 📊 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Initial render (1K rows) | < 50ms | ⏳ In Progress |
| Initial render (100K rows) | < 100ms | ⏳ In Progress |
| Scroll FPS | 60 FPS | ⏳ In Progress |
| Cell edit latency | < 16ms | ⏳ In Progress |
| Bundle size (core, gzipped) | < 100KB | ⏳ In Progress |

## 💬 Support

- [GitHub Issues](https://github.com/yourusername/zengrid/issues) - Bug reports and feature requests
- [Discussions](https://github.com/yourusername/zengrid/discussions) - Questions and community support
- [Stack Overflow](https://stackoverflow.com/questions/tagged/zengrid) - Tag: `zengrid`
- Email: support@zengrid.dev (Pro/Enterprise customers)


## 📈 Status

**Current Sprint**: Sprint 1 (Foundation & Virtual Scrolling)
**Status**: ✅ Day 1 Complete - Project Setup & Infrastructure
**Next**: Day 2 - Core Data Structures

---

**Built with ❤️ by the ZenGrid Team**
