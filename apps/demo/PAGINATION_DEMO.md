# ZenGrid Pagination Demo

This demo shows how to use ZenGrid with **server-side pagination** using a mock REST API.

## 🚀 Quick Start

### Step 1: Start the Mock Server

In one terminal, run:

```bash
pnpm server
```

This starts a mock API server on **http://localhost:3003** with **10,000 employee records**.

### Step 2: Start the Demo App

In another terminal, run:

```bash
pnpm dev
```

This starts the Vite dev server on **http://localhost:3001**.

### Step 3: Toggle Pagination Mode

1. Open http://localhost:3001 in your browser
2. Click the **📄 Pagination Mode** button
3. The grid will switch from local data (100K rows) to server-side pagination (5K rows)

---

## 🎯 Features Demonstrated

### ✅ Server-Side Pagination
- Load only one page of data at a time
- Navigate between pages (First, Previous, Next, Last)
- Configurable page size (20, 50, 100, 200, 500)
- Jump to specific page

### ✅ Performance Benefits
- **Memory Efficient**: Only loads visible page data
- **Fast Initial Load**: No need to load all 5K records
- **Responsive**: Quick page changes with loading indicators

### ✅ Pagination Controls
- **First/Last**: Jump to first or last page
- **Previous/Next**: Navigate one page at a time
- **Page Size**: Change number of records per page
- **Go to Page**: Jump to specific page number
- **Page Info**: Shows current page and total pages
- **Total Records**: Shows total number of records

---

## 📡 API Endpoints

Base URL: `http://localhost:3003/api`

### GET /api/employees

Query Parameters:
- `page`: Page number (1-based)
- `pageSize`: Number of records per page
- `sortBy`: Column to sort by (optional)
- `sortOrder`: 'asc' or 'desc' (optional)
- `filter`: JSON string with filter conditions (optional)

Example:
```
GET /api/employees?page=1&pageSize=100&sortBy=salary&sortOrder=desc
```

Response:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 100,
    "totalRecords": 5000,
    "totalPages": 50,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## 🧪 Testing Scenarios

### 1. Basic Pagination
1. Enable pagination mode
2. Click "Next ▶️" to go to page 2
3. Click "◀️ Previous" to go back to page 1
4. Click "Last ⏭️" to jump to the last page

### 2. Page Size Changes
1. Select different page sizes (20, 50, 100, etc.)
2. Notice how the total pages change
3. Grid automatically resets to page 1

### 3. Direct Page Navigation
1. Enter a page number in "Go to page" input
2. Click "Go" or press Enter
3. Grid jumps to that page

### 4. Edge Cases
- Try navigating beyond the last page (buttons disabled)
- Try going to page 0 (buttons disabled)
- Change page size on last page (resets to page 1)

---

## 📊 Mock Data

The server generates **10,000 employee records** with:
- ID (1-5000)
- Name
- Department (Engineering, Sales, Marketing, HR, Finance, Operations, Support)
- Salary (50,000 - 150,000)
- Years (1-30)
- Status (Active, On Leave, Remote)
- Email
- Phone
- Score (1-100)
- Notes

---

## 🔧 Implementation Details

### PaginationDemo Class

Located in `src/pagination-demo.ts`, this class:
- Manages pagination state (current page, page size, total records)
- Fetches data from the API
- Updates the grid with paginated data
- Handles UI updates (buttons, page info)
- Shows loading indicators during API calls

### Grid Integration

The grid works seamlessly with pagination:
- Displays only the current page's data
- Virtual scrolling within the page
- Cell pooling for efficient rendering
- Loading indicators during page changes

---

## 🛠️ Customization

### Change API URL

Edit `pagination-demo.ts`:
```typescript
const API_BASE_URL = 'http://your-api.com/api';
```

### Change Default Page Size

Edit `index.html`:
```html
<option value="100" selected>100</option>
```

### Add Sorting/Filtering

The API already supports sorting and filtering:
```typescript
const url = `${API_BASE_URL}/employees?page=${page}&pageSize=${pageSize}&sortBy=salary&sortOrder=desc`;
```

---

## 🚨 Troubleshooting

### Server Not Running

**Error**: "Failed to load data from server"

**Solution**: Make sure the server is running:
```bash
pnpm server
```

### CORS Errors

The server includes CORS headers. If you still see CORS errors, check your browser console and ensure the server is running on http://localhost:3002.

### Data Not Updating

Try:
1. Hard refresh the page (Ctrl+Shift+R)
2. Check browser console for errors
3. Restart both server and dev server

---

## 📚 Next Steps

1. **Add Sorting**: Implement column sorting with API calls
2. **Add Filtering**: Connect filters to API parameters
3. **Add Search**: Implement server-side search
4. **Infinite Scroll**: Replace pagination with infinite scroll
5. **Caching**: Add client-side caching for visited pages

---

## 💡 Tips

- **Pagination + Virtual Scrolling**: The grid uses virtual scrolling WITHIN each page for maximum performance
- **Loading Indicators**: The demo shows loading states during API calls
- **Error Handling**: Try stopping the server to see error messages
- **Network Simulation**: The server adds a 300ms delay to simulate real network conditions

---

**Happy Paginating! 🎉**
