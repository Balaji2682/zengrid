# ZenGrid Demo

High-performance virtual scrolling grid with 100,000 rows

## Operation Modes

ZenGrid supports **unified frontend/backend pattern** for all data operations:

### 1. **Data Loading Mode** (`dataMode`)
- **Frontend** (default): All data loaded in memory
- **Backend**: Data loaded on-demand via `onDataRequest` callback
- **Auto**: Uses backend if `onDataRequest` provided, else frontend

### 2. **Sort Mode** (`sortMode`)
- **Frontend** (default): Sorts in memory using IndexMap
- **Backend**: Delegates sorting to server via `onSortRequest`
- **Auto**: Uses backend if `onSortRequest` provided, else frontend

### 3. **Filter Mode** (`filterMode`)
- **Frontend** (default): Filters in memory
- **Backend**: Delegates filtering to server via `onFilterRequest`
- **Auto**: Uses backend if `onFilterRequest` provided, else frontend

## Demo Configuration

The demo currently uses:
- **Data Mode**: `frontend` - All 100K rows loaded in memory
- **Sort Mode**: `frontend` - Fast in-memory sorting
- **Filter Mode**: `frontend` - In-memory filtering

## Switching to Backend Mode

To test backend mode, change the following in `src/main.ts`:

```typescript
// Line 163: Change from 'frontend' to 'backend'
let dataMode: 'frontend' | 'backend' = 'backend';
let sortMode: 'frontend' | 'backend' = 'backend';

// Grid configuration will use:
dataMode: dataMode,
sortMode: sortMode,
onDataRequest: dataMode === 'backend' ? handleDataRequest : undefined,
onSortRequest: sortMode === 'backend' ? handleSortRequest : undefined,
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
