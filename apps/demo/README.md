# ZenGrid Demo

High-performance virtual scrolling grid with 100,000 rows

## Operation Modes

ZenGrid uses the unified `dataMode` + `onDataRequest` contract for backend data loading and explicit backend query execution.

### 1. **Data Loading Mode** (`dataMode`)
- **Frontend** (default): All data loaded in memory
- **Backend**: Data windows plus query state are delegated via `onDataRequest`
- **Auto**: Uses backend loading when `onDataRequest` is present, while sort/filter stay frontend

## Demo Configuration

The demo currently uses:
- **Data Mode**: `frontend` - All 100K rows loaded in memory
- **Sort Mode**: `frontend` - Fast in-memory sorting
- **Filter Mode**: `frontend` - In-memory filtering

## Switching to Backend Mode

To test backend mode, change the following in `src/main.ts`:

```typescript
let dataMode: 'frontend' | 'backend' | 'auto' = 'backend';

// Grid configuration will use:
dataMode: dataMode,
onDataRequest: dataMode === 'backend' ? handleDataRequest : undefined,
```

## Backend Mode Benefits

- **Large datasets**: Handle millions of rows without loading all in memory
- **Server-side operations**: Leverage database indexing and query optimization
- **Reduced memory**: Only visible data loaded
- **Real-time data**: Fetch fresh data on each operation

## Frontend Mode Benefits

- **Speed**: Instant operations, no network latency
- **Offline capable**: Works without server connection
- **Simpler setup**: No backend API needed
- **Full client-side control**: All operations predictable
