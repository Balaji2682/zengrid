# ZenGrid

High-performance TypeScript data grid for modern web applications.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)](https://www.typescriptlang.org/)
[![Nx](https://img.shields.io/badge/Nx-Monorepo-143055.svg)](https://nx.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-Workspace-F69220.svg)](https://pnpm.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

ZenGrid is designed for spreadsheet-like UX at scale, with a focus on fast rendering, predictable behavior, and clean extension points.

## Why ZenGrid

- Virtual scrolling and cell pooling tuned for large datasets
- Frontend and backend operation modes for data loading, sorting, and filtering
- Typed APIs for renderers, editors, plugins, and theming
- Built-in support for keyboard navigation, selection, copy/paste, and CSV export
- Modular monorepo architecture with reusable algorithms and data structures

## Package Overview

| Package | Description |
| --- | --- |
| `@zengrid/core` | Main data grid engine, rendering pipeline, plugins, theming |
| `@zengrid/shared` | Shared algorithms and data structures used by the grid |
| `@zengrid/angular` | Angular wrapper and integration utilities |

## Install `@zengrid/core`

```bash
npm install @zengrid/core
# or
pnpm add @zengrid/core
```

## Quick Start

```ts
import { Zengrid } from '@zengrid/core';
import '@zengrid/core/dist/styles.css';

const container = document.getElementById('grid-container');
if (!container) throw new Error('Missing #grid-container');

const rowCount = 1000;
const colCount = 10;

const data = Array.from({ length: rowCount }, (_, row) =>
  Array.from({ length: colCount }, (_, col) => `Cell ${row},${col}`)
);

const grid = new Zengrid(container, {
  rowCount,
  colCount,
  rowHeight: 32,
  colWidth: 120,
  enableSelection: true,
  enableKeyboardNavigation: true,
  enableColumnResize: true,
  enableColumnDrag: true,
});

grid.setData(data);
grid.render();
```

## Monorepo Setup

### Prerequisites

- Node.js 20+
- pnpm 10+

### Local Development

```bash
git clone https://github.com/zengrid-dev/zengrid.git
cd zengrid
pnpm install
```

### Common Commands

```bash
# Build all projects
pnpm build

# Run tests
pnpm test

# Lint + typecheck
pnpm lint
pnpm typecheck

# Run main demo app (Vite)
pnpm demo

# Run Angular demo
pnpm demo:angular
```

### Demo with Mock Backend

```bash
pnpm --dir apps/demo dev:all
```

- Grid UI: `http://localhost:5173`
- Mock API: `http://localhost:3003`

## Repository Structure

```text
zengrid/
├── apps/
│   ├── demo/                # Main demo app (Vite)
│   ├── angular-demo/        # Angular demo application
│   └── demo-ds-algorithms/  # Algorithms/data-structure demos
├── packages/
│   ├── core/                # @zengrid/core
│   ├── shared/              # @zengrid/shared
│   └── angular/             # @zengrid/angular
├── docs/                    # Generated docs, reports, decisions
├── QUICK_START.md
└── ARCHITECTURE_ROADMAP.md
```

## Documentation

- [Quick Start Guide](./QUICK_START.md)
- [Architecture Roadmap](./ARCHITECTURE_ROADMAP.md)
- [Core Package README](./packages/core/README.md)
- [Shared Package README](./packages/shared/README.md)
- [Demo Walkthrough](./apps/demo/START_HERE.md)

To generate API docs locally:

```bash
pnpm docs:api
pnpm docs:serve
```

## Status

ZenGrid is under active development. Core functionality is usable and continuously expanded through tests, demos, and architecture iterations.

## Support

- Issues: https://github.com/zengrid-dev/zengrid/issues
- Repository: https://github.com/zengrid-dev/zengrid

## License

MIT (as declared in package manifests).
