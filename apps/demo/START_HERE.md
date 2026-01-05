# 🚀 ZenGrid Demo - Quick Start

## ✅ Start Everything

Run this single command:

```bash
pnpm dev:all
```

You'll see:
```
[SERVER] 🚀 Mock Server Running
[SERVER]    URL: http://localhost:3003
[SERVER]    Total Records: 10,000

[VITE]   ➜  Local:   http://localhost:3000/
```

## 🌐 Open the Demo

**Browser:** http://localhost:3000

## 📄 Test Pagination

1. Click the **📄 Pagination Mode** button (orange button in top controls)
2. Pagination controls appear at the bottom of the grid
3. Navigate pages using the buttons:
   - **⏮️ First** - Jump to page 1
   - **◀️ Previous** - Go back one page
   - **Next ▶️** - Go forward one page
   - **Last ⏭️** - Jump to last page
4. Change page size: Select 20, 50, 100, 200, or 500 records per page
5. Jump to page: Type a page number and click **Go**

## 🎯 What You'll See

- **Local Mode** (default): 100,000 rows loaded in memory
- **Pagination Mode**: 10,000 rows from server, loaded 100 at a time
- Pagination controls at bottom showing:
  - Current page / Total pages
  - Total record count
  - Page navigation buttons

## 🧪 Test Advanced Filtering

1. Click **🔍 Filters** button
2. Add multiple filter conditions
3. Use AND/OR toggles between conditions
4. Click **Apply Filters**
5. See smart warnings for impossible filters (like ID=2 AND ID=10)

## 🛑 Stop Servers

Press `Ctrl+C` in the terminal where `pnpm dev:all` is running.

## 📚 More Info

- **Full Pagination Guide**: See `PAGINATION_DEMO.md`
- **API Documentation**: Server runs on http://localhost:3003
- **Mock Data**: 10,000 employee records with realistic data

---

**Enjoy testing ZenGrid with pagination!** 🎉
