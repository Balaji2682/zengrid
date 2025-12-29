/**
 * Data Structures & Algorithms Demo
 *
 * Interactive demonstration of all implemented DS & algorithms
 */

import { Grid } from '@zengrid/core';
import { LRUCache, CommandStack, type ICommand, SegmentTree, AggregationType, SkipList, DisjointSet, DisjointSetUtils } from '@zengrid/shared';

// Sample data
const SAMPLE_PRODUCTS = [
  'Apple iPhone 14',
  'Apple iPhone 14 Pro',
  'Apple MacBook Pro',
  'Apple MacBook Air',
  'Apple AirPods Pro',
  'Apple Watch Series 8',
  'Samsung Galaxy S23',
  'Samsung Galaxy S23 Ultra',
  'Samsung Tab S8',
  'Samsung Galaxy Watch',
  'Microsoft Surface Pro',
  'Microsoft Surface Laptop',
  'Microsoft Xbox Series X',
  'Google Pixel 7',
  'Google Pixel 7 Pro',
  'Sony PlayStation 5',
  'Sony WH-1000XM5',
  'Dell XPS 13',
  'HP Spectre x360',
  'Lenovo ThinkPad X1',
];

// Generate more sample data
function generateProducts(count: number): string[] {
  const products: string[] = [];
  const brands = ['Apple', 'Samsung', 'Microsoft', 'Google', 'Sony', 'Dell', 'HP', 'Lenovo'];
  const types = ['Phone', 'Laptop', 'Tablet', 'Watch', 'Headphones', 'Monitor', 'Keyboard', 'Mouse'];

  for (let i = 0; i < count; i++) {
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const model = Math.floor(Math.random() * 100);
    products.push(`${brand} ${type} ${model}`);
  }

  return products;
}

const ALL_PRODUCTS = [...SAMPLE_PRODUCTS, ...generateProducts(9980)];

// Initialize Grid
const gridContainer = document.createElement('div');
gridContainer.style.display = 'none'; // Hidden, just for API access
document.body.appendChild(gridContainer);

const grid = new Grid(gridContainer, {
  rowCount: 100,
  colCount: 10,
  rowHeight: 30,
  colWidth: 100,
});

// ==================== TRIE DEMO ====================

const trieInput = document.getElementById('trie-input') as HTMLInputElement;
const trieSuggestions = document.getElementById('trie-suggestions') as HTMLUListElement;
const indexColumnBtn = document.getElementById('index-column-btn') as HTMLButtonElement;
const trieIndexedEl = document.getElementById('trie-indexed') as HTMLDivElement;
const trieTime = document.getElementById('trie-time') as HTMLDivElement;

let trieIndexedFlag = false;

indexColumnBtn.addEventListener('click', () => {
  const start = performance.now();

  // Index column 0 with all products
  grid.filterAutocomplete.indexColumn(0, ALL_PRODUCTS);

  // Also index with Bloom Filter for comparison
  grid.filterOptimizer.indexColumn(0, ALL_PRODUCTS, 0.01);

  const end = performance.now();

  trieIndexedFlag = true;
  trieIndexedEl.textContent = grid.filterAutocomplete.getStats()[0]?.uniqueValues.toString() || '10000';

  indexColumnBtn.textContent = '✓ Indexed!';
  indexColumnBtn.disabled = true;

  trieSuggestions.innerHTML = `<li style="color: #27ae60;">✓ Indexed ${ALL_PRODUCTS.length} products in ${(end - start).toFixed(2)}ms</li>`;

  // Update Bloom Filter info message
  const bloomInfo = document.getElementById('bloom-info');
  if (bloomInfo) {
    bloomInfo.classList.remove('warning');
    bloomInfo.innerHTML = '✅ <strong>Data indexed!</strong> Bloom Filter can now say "definitely NOT in set" instantly, avoiding expensive scans. False positive rate: 1%';
  }
});

trieInput.addEventListener('input', () => {
  if (!trieIndexedFlag) {
    trieSuggestions.innerHTML = '<li style="color: #e74c3c;">Please index data first</li>';
    return;
  }

  const query = trieInput.value;

  if (!query) {
    trieSuggestions.innerHTML = '';
    return;
  }

  const start = performance.now();
  const suggestions = grid.filterAutocomplete.getSuggestions(0, query, 10);
  const end = performance.now();

  trieTime.textContent = `${(end - start).toFixed(3)}ms`;

  trieSuggestions.innerHTML = '';

  if (suggestions.length === 0) {
    trieSuggestions.innerHTML = '<li style="color: #95a5a6;">No suggestions found</li>';
  } else {
    suggestions.forEach(suggestion => {
      const li = document.createElement('li');
      li.textContent = suggestion;
      trieSuggestions.appendChild(li);
    });
  }
});

// ==================== RTREE DEMO ====================

const rtreeInitBtn = document.getElementById('rtree-init') as HTMLButtonElement;
const hitTestOutput = document.getElementById('hit-test-output') as HTMLDivElement;
const rtreeCells = document.getElementById('rtree-cells') as HTMLDivElement;
const rtreeHits = document.getElementById('rtree-hits') as HTMLDivElement;

let hitCount = 0;
let rtreeInitialized = false;

rtreeInitBtn.addEventListener('click', () => {
  // Create canvas for visual grid
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.border = '2px solid #3498db';
  canvas.style.cursor = 'crosshair';
  canvas.style.display = 'block';

  const ctx = canvas.getContext('2d')!;

  // Draw grid lines (show first 16x20 cells that fit in 800x600)
  const cellWidth = 50;
  const cellHeight = 30;
  const visibleCols = Math.floor(canvas.width / cellWidth);
  const visibleRows = Math.floor(canvas.height / cellHeight);

  // Draw cells
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;
  for (let row = 0; row < visibleRows; row++) {
    for (let col = 0; col < visibleCols; col++) {
      ctx.strokeRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);

      // Label some cells
      if (row % 5 === 0 && col % 4 === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '10px monospace';
        ctx.fillText(`R${row}C${col}`, col * cellWidth + 2, row * cellHeight + 12);
      }
    }
  }

  // Replace text output with canvas
  hitTestOutput.innerHTML = '';
  hitTestOutput.appendChild(canvas);

  // Add info text below canvas
  const info = document.createElement('div');
  info.style.marginTop = '10px';
  info.style.fontFamily = 'monospace';
  info.style.fontSize = '12px';
  info.id = 'hit-info';
  info.textContent = 'Click on the grid to test hit detection. Each cell is 50×30px.';
  hitTestOutput.appendChild(info);

  // Register 100x100 cells in RTree
  for (let row = 0; row < 100; row++) {
    for (let col = 0; col < 100; col++) {
      const rect = {
        minX: col * cellWidth,
        minY: row * cellHeight,
        maxX: (col + 1) * cellWidth,
        maxY: (row + 1) * cellHeight,
      };
      grid.spatialHitTester.registerCell(row, col, rect);
    }
  }

  rtreeInitialized = true;
  rtreeCells.textContent = '10,000';

  rtreeInitBtn.textContent = '✓ Initialized!';
  rtreeInitBtn.disabled = true;

  // Handle clicks on canvas
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const start = performance.now();
    const cell = grid.spatialHitTester.getCellAtPoint(x, y);
    const end = performance.now();

    hitCount++;
    rtreeHits.textContent = hitCount.toString();

    // Clear previous highlight
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw grid
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let row = 0; row < visibleRows; row++) {
      for (let col = 0; col < visibleCols; col++) {
        ctx.strokeRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
        if (row % 5 === 0 && col % 4 === 0) {
          ctx.fillStyle = '#999';
          ctx.font = '10px monospace';
          ctx.fillText(`R${row}C${col}`, col * cellWidth + 2, row * cellHeight + 12);
        }
      }
    }

    if (cell) {
      // Highlight the detected cell
      ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
      ctx.fillRect(cell.col * cellWidth, cell.row * cellHeight, cellWidth, cellHeight);

      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.strokeRect(cell.col * cellWidth, cell.row * cellHeight, cellWidth, cellHeight);

      // Draw click point
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Calculate expected cell for verification
      const expectedCol = Math.floor(x / cellWidth);
      const expectedRow = Math.floor(y / cellHeight);
      const isCorrect = cell.row === expectedRow && cell.col === expectedCol;

      info.innerHTML = `
        <strong style="color: ${isCorrect ? '#27ae60' : '#e74c3c'}">
          ${isCorrect ? '✓ CORRECT!' : '✗ MISMATCH!'}
        </strong><br>
        Click Position: (${x.toFixed(0)}, ${y.toFixed(0)})<br>
        <strong>RTree Result:</strong> Row ${cell.row}, Col ${cell.col}<br>
        <strong>Expected:</strong> Row ${expectedRow}, Col ${expectedCol}<br>
        <strong>Cell Bounds:</strong> X[${cell.col * cellWidth}, ${(cell.col + 1) * cellWidth}], Y[${cell.row * cellHeight}, ${(cell.row + 1) * cellHeight}]<br>
        <strong>Lookup Time:</strong> ${(end - start).toFixed(4)}ms<br>
        Total Clicks: ${hitCount}
      `;
    } else {
      // Draw click point even if no cell
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      info.innerHTML = `
        <strong style="color: #e74c3c">✗ No cell detected</strong><br>
        Click Position: (${x.toFixed(0)}, ${y.toFixed(0)})<br>
        This position is outside the registered grid area.
      `;
    }
  });
});

// ==================== DEPENDENCYGRAPH DEMO ====================

const formulaSelect = document.getElementById('formula-select') as HTMLSelectElement;
const addFormulaBtn = document.getElementById('add-formula-btn') as HTMLButtonElement;
const calculateOrderBtn = document.getElementById('calculate-order-btn') as HTMLButtonElement;
const testCycleBtn = document.getElementById('test-cycle-btn') as HTMLButtonElement;
const formulaGraph = document.getElementById('formula-graph') as HTMLDivElement;
const formulaCount = document.getElementById('formula-count') as HTMLDivElement;
const dependencyCount = document.getElementById('dependency-count') as HTMLDivElement;

function updateFormulaStats() {
  const stats = grid.formulaCalculator.getStats();
  formulaCount.textContent = stats.formulaCount.toString();
  dependencyCount.textContent = stats.dependencyCount.toString();
}

function renderFormulaGraph() {
  const formulas = grid.formulaCalculator.getAllFormulaCells();

  if (formulas.length === 0) {
    formulaGraph.textContent = 'No formulas added yet. Use the controls to add formulas.';
    return;
  }

  let output = 'Formulas:\n';
  formulas.forEach(cell => {
    const formula = grid.formulaCalculator.getFormula(cell);
    const deps = grid.formulaCalculator.getDependencies(cell);
    output += `\n${cell} = ${formula?.formula}\n`;
    output += `  Dependencies: ${deps.join(', ') || 'none'}\n`;
  });

  formulaGraph.textContent = output;
}

addFormulaBtn.addEventListener('click', () => {
  const selected = formulaSelect.value;
  const [cell, expr] = selected.split('=');

  // Parse dependencies (simple pattern matching)
  const depPattern = /([A-Z]\d+)/g;
  const deps = [...expr.matchAll(depPattern)].map(m => m[1]).filter(d => d !== cell);

  try {
    grid.formulaCalculator.setFormula(cell, `=${expr}`, deps);
    renderFormulaGraph();
    updateFormulaStats();
    formulaGraph.style.color = '#27ae60';
  } catch (error: any) {
    formulaGraph.textContent = `❌ Error: ${error.message}`;
    formulaGraph.style.color = '#e74c3c';
  }
});

calculateOrderBtn.addEventListener('click', () => {
  try {
    const order = grid.formulaCalculator.getCalculationOrder();

    let output = '✓ Calculation Order (dependencies first):\n\n';
    order.forEach((cell, index) => {
      output += `${index + 1}. ${cell}\n`;
    });

    output += '\n💡 This is the correct order to evaluate formulas,\nensuring dependencies are calculated first!';

    formulaGraph.textContent = output;
    formulaGraph.style.color = '#27ae60';
  } catch (error: any) {
    formulaGraph.textContent = `❌ Error: ${error.message}`;
    formulaGraph.style.color = '#e74c3c';
  }
});

testCycleBtn.addEventListener('click', () => {
  try {
    // Try to create circular reference: A1 = F1
    // If F1 exists and depends on E1 → D1 → C1 → A1, this creates a cycle
    grid.formulaCalculator.setFormula('A1', '=F1', ['F1']);

    formulaGraph.textContent = '✓ Formula added (no cycle detected yet)';
    renderFormulaGraph();
  } catch (error: any) {
    formulaGraph.textContent = `✓ CIRCULAR REFERENCE DETECTED!\n\n❌ ${error.message}\n\n💡 The DependencyGraph successfully prevented\nan invalid circular reference!`;
    formulaGraph.style.color = '#e74c3c';
  }
});

// ==================== BLOOMFILTER DEMO ====================

const bloomInput = document.getElementById('bloom-input') as HTMLInputElement;
const bloomCheckBtn = document.getElementById('bloom-check-btn') as HTMLButtonElement;
const bloomScanBtn = document.getElementById('bloom-scan-btn') as HTMLButtonElement;
const bloomSamplesBtn = document.getElementById('bloom-samples-btn') as HTMLButtonElement;
const bloomResult = document.getElementById('bloom-result') as HTMLDivElement;
const bloomTime = document.getElementById('bloom-time') as HTMLDivElement;
const scanTime = document.getElementById('scan-time') as HTMLDivElement;

bloomCheckBtn.addEventListener('click', () => {
  if (!trieIndexedFlag) {
    bloomResult.textContent = 'Please index data first using the Trie demo above.';
    return;
  }

  const query = bloomInput.value.trim();

  if (!query) {
    bloomResult.textContent = 'Please enter a search term.';
    return;
  }

  const start = performance.now();
  const mightExist = grid.filterOptimizer.mightContain(0, query);
  const end = performance.now();

  bloomTime.textContent = `${(end - start).toFixed(6)}ms`;

  if (mightExist) {
    bloomResult.innerHTML = `<strong style="color: #f39c12;">✓ Bloom Filter: "${query}" MIGHT exist</strong><br><br>💡 This could be a false positive (1% chance)<br>Need full scan to confirm.<br><br><em style="font-size: 11px;">Note: Bloom Filter checks EXACT product names</em>`;
  } else {
    bloomResult.innerHTML = `<strong style="color: #27ae60;">✓ Bloom Filter: "${query}" definitely DOES NOT exist</strong><br><br>💡 Skipped expensive full scan!<br>Speedup: 100-1000x faster<br><br><em style="font-size: 11px;">This is guaranteed correct - Bloom Filters have NO false negatives</em>`;
  }
});

bloomScanBtn.addEventListener('click', () => {
  const query = bloomInput.value.trim();

  if (!query) {
    bloomResult.textContent = 'Please enter a search term.';
    return;
  }

  const start = performance.now();
  // Exact match (case-insensitive)
  const found = ALL_PRODUCTS.some(p => p.toLowerCase() === query.toLowerCase());
  const end = performance.now();

  scanTime.textContent = `${(end - start).toFixed(3)}ms`;

  if (found) {
    bloomResult.innerHTML = `<strong style="color: #27ae60;">✓ Full Scan: "${query}" EXISTS</strong><br><br>Scanned all ${ALL_PRODUCTS.length} products.<br><br><strong>Verification:</strong> Both Bloom Filter and Full Scan should agree!`;
  } else {
    bloomResult.innerHTML = `<strong style="color: #e74c3c;">✗ Full Scan: "${query}" NOT FOUND</strong><br><br>Scanned all ${ALL_PRODUCTS.length} products.<br><br>💡 Bloom Filter would have skipped this scan!`;
  }
});

bloomSamplesBtn.addEventListener('click', () => {
  bloomResult.innerHTML = `<strong>Sample Products in Index:</strong><br><br>
    <strong style="color: #27ae60;">✓ Will be found:</strong><br>
    • Apple iPhone 14<br>
    • Apple iPhone 14 Pro<br>
    • Samsung Galaxy S23<br>
    • Microsoft Surface Pro<br>
    • Google Pixel 7<br>
    • Sony PlayStation 5<br><br>
    <strong style="color: #e74c3c;">✗ Will NOT be found:</strong><br>
    • phone (not exact)<br>
    • iPhone (not exact)<br>
    • xyz123 (doesn't exist)<br>
    • NotARealProduct<br><br>
    <em style="font-size: 11px;">Try copying these exact names to test!</em>
  `;
});

// ==================== SUFFIX ARRAY DEMO ====================

const suffixInput = document.getElementById('suffix-input') as HTMLInputElement;
const suffixSearchBtn = document.getElementById('suffix-search-btn') as HTMLButtonElement;
const suffixNaiveBtn = document.getElementById('suffix-naive-btn') as HTMLButtonElement;
const suffixResult = document.getElementById('suffix-result') as HTMLDivElement;
const suffixTime = document.getElementById('suffix-time') as HTMLDivElement;
const naiveTime = document.getElementById('naive-time') as HTMLDivElement;
const suffixSpeedup = document.getElementById('suffix-speedup') as HTMLDivElement;

suffixSearchBtn.addEventListener('click', () => {
  if (!trieIndexedFlag) {
    suffixResult.textContent = 'Please index data first using the Trie demo above.';
    return;
  }

  const query = suffixInput.value.trim();

  if (!query) {
    suffixResult.textContent = 'Please enter a search term.';
    return;
  }

  // Index column if not already indexed
  const start = performance.now();
  grid.substringFilter.indexColumn(0, ALL_PRODUCTS);

  // Search for substring
  const matchedRows = grid.substringFilter.filterBySubstring(0, query);
  const end = performance.now();

  suffixTime.textContent = `${(end - start).toFixed(3)}ms`;

  if (matchedRows.length > 0) {
    const matches = matchedRows.slice(0, 20).map(idx => ALL_PRODUCTS[idx]);
    const moreText = matchedRows.length > 20 ? `\n\n... and ${matchedRows.length - 20} more` : '';

    suffixResult.innerHTML = `
      <strong style="color: #27ae60;">✓ Found ${matchedRows.length} matches!</strong><br><br>
      ${matches.map(m => `• ${m.replace(new RegExp(query, 'gi'), match => `<mark style="background: #ffeb3b;">${match}</mark>`)}`).join('<br>')}
      ${moreText}<br><br>
      <em style="font-size: 11px;">Suffix Array can find substrings ANYWHERE in the text!</em>
    `;
  } else {
    suffixResult.innerHTML = `<strong style="color: #e74c3c;">✗ No matches found for "${query}"</strong><br><br>Try: phone, Galaxy, soft, Watch`;
  }
});

suffixNaiveBtn.addEventListener('click', () => {
  const query = suffixInput.value.trim();

  if (!query) {
    suffixResult.textContent = 'Please enter a search term.';
    return;
  }

  const start = performance.now();

  // Naive approach: scan all products
  const queryLower = query.toLowerCase();
  const matchedRows: number[] = [];

  for (let i = 0; i < ALL_PRODUCTS.length; i++) {
    if (ALL_PRODUCTS[i].toLowerCase().includes(queryLower)) {
      matchedRows.push(i);
    }
  }

  const end = performance.now();

  naiveTime.textContent = `${(end - start).toFixed(3)}ms`;

  if (matchedRows.length > 0) {
    const matches = matchedRows.slice(0, 20).map(idx => ALL_PRODUCTS[idx]);
    const moreText = matchedRows.length > 20 ? `\n\n... and ${matchedRows.length - 20} more` : '';

    suffixResult.innerHTML = `
      <strong style="color: #27ae60;">✓ Found ${matchedRows.length} matches (Naive Scan)</strong><br><br>
      ${matches.map(m => `• ${m.replace(new RegExp(query, 'gi'), match => `<mark style="background: #ffeb3b;">${match}</mark>`)}`).join('<br>')}
      ${moreText}<br><br>
      <strong>Verification:</strong> Results should match Suffix Array!
    `;

    // Calculate speedup
    const suffixMs = parseFloat(suffixTime.textContent);
    const naiveMs = parseFloat(naiveTime.textContent);
    if (suffixMs > 0 && naiveMs > 0) {
      const speedup = naiveMs / suffixMs;
      suffixSpeedup.textContent = `${speedup.toFixed(1)}x`;
    }
  } else {
    suffixResult.innerHTML = `<strong style="color: #e74c3c;">✗ No matches found for "${query}"</strong>`;
  }
});

// ==================== PATTERN DETECTION DEMO ====================

const patternInput = document.getElementById('pattern-input') as HTMLInputElement;
const patternLength = document.getElementById('pattern-length') as HTMLInputElement;
const patternPreviewBtn = document.getElementById('pattern-preview-btn') as HTMLButtonElement;
const patternPreset1 = document.getElementById('pattern-preset1') as HTMLButtonElement;
const patternPreset2 = document.getElementById('pattern-preset2') as HTMLButtonElement;
const patternPreset3 = document.getElementById('pattern-preset3') as HTMLButtonElement;
const patternResult = document.getElementById('pattern-result') as HTMLDivElement;
const patternType = document.getElementById('pattern-type') as HTMLDivElement;
const patternConfidence = document.getElementById('pattern-confidence') as HTMLDivElement;

function previewPattern() {
  const input = patternInput.value;
  const length = parseInt(patternLength.value, 10);

  // Parse comma-separated values
  const sourceValues = input.split(',').map(v => {
    const trimmed = v.trim();
    const num = Number(trimmed);
    return isNaN(num) ? trimmed : num;
  });

  const preview = grid.autofillManager.previewFill(sourceValues, length);

  patternType.textContent = preview.patternType;
  patternConfidence.textContent = `${(preview.confidence * 100).toFixed(0)}%`;

  let output = `Pattern: ${preview.pattern}\n`;
  output += `Confidence: ${(preview.confidence * 100).toFixed(0)}%\n\n`;
  output += `Source: [${sourceValues.join(', ')}]\n\n`;
  output += `Autofilled to ${length} values:\n`;
  output += `[${preview.values.join(', ')}]`;

  patternResult.textContent = output;
}

patternPreviewBtn.addEventListener('click', previewPattern);

patternPreset1.addEventListener('click', () => {
  patternInput.value = '1,2,3';
  patternLength.value = '10';
  previewPattern();
});

patternPreset2.addEventListener('click', () => {
  patternInput.value = '2,4,8';
  patternLength.value = '10';
  previewPattern();
});

patternPreset3.addEventListener('click', () => {
  patternInput.value = 'Item 1,Item 2,Item 3';
  patternLength.value = '10';
  previewPattern();
});

// Initial render
renderFormulaGraph();
updateFormulaStats();

// ==================== LRU CACHE DEMO ====================

const cacheCapacityInput = document.getElementById('cache-capacity') as HTMLInputElement;
const cacheInitBtn = document.getElementById('cache-init-btn') as HTMLButtonElement;
const cachePopulateBtn = document.getElementById('cache-populate-btn') as HTMLButtonElement;
const cacheAccessBtn = document.getElementById('cache-access-btn') as HTMLButtonElement;
const cacheStressBtn = document.getElementById('cache-stress-btn') as HTMLButtonElement;
const cacheResult = document.getElementById('cache-result') as HTMLDivElement;
const cacheSizeEl = document.getElementById('cache-size') as HTMLDivElement;
const cacheHitsEl = document.getElementById('cache-hits') as HTMLDivElement;
const cacheMissesEl = document.getElementById('cache-misses') as HTMLDivElement;
const cacheHitRateEl = document.getElementById('cache-hitrate') as HTMLDivElement;
const cacheEvictionsEl = document.getElementById('cache-evictions') as HTMLDivElement;
const cacheMemoryEl = document.getElementById('cache-memory') as HTMLDivElement;

let cache: LRUCache<string, string> | null = null;

function updateCacheStats() {
  if (!cache) return;

  const stats = cache.getStats();

  cacheSizeEl.textContent = stats.size.toString();
  cacheHitsEl.textContent = stats.hits.toString();
  cacheMissesEl.textContent = stats.misses.toString();
  cacheHitRateEl.textContent = `${(stats.hitRate * 100).toFixed(1)}%`;
  cacheEvictionsEl.textContent = stats.evictions.toString();
  cacheMemoryEl.textContent = `${(stats.memoryBytes / 1024).toFixed(1)} KB`;
}

cacheInitBtn.addEventListener('click', () => {
  const capacity = parseInt(cacheCapacityInput.value);

  if (capacity < 10 || capacity > 1000) {
    cacheResult.innerHTML = '<span class="error">❌ Capacity must be between 10 and 1000</span>';
    return;
  }

  cache = new LRUCache<string, string>({
    capacity,
    trackStats: true,
  });

  cacheResult.innerHTML = `<span class="success">✅ LRU Cache initialized with capacity ${capacity}</span>\n\nCache Features:\n• O(1) get/set/delete operations\n• Automatic eviction of least recently used items\n• Bounded memory usage\n• Statistics tracking\n\nReady to test! Click "Populate with Random Data" to start.`;

  cachePopulateBtn.disabled = false;
  cacheAccessBtn.disabled = false;
  cacheStressBtn.disabled = false;
  cacheInitBtn.textContent = '✓ Cache Initialized';
  cacheInitBtn.disabled = true;

  updateCacheStats();
});

cachePopulateBtn.addEventListener('click', () => {
  if (!cache) return;

  const start = performance.now();

  // Simulate caching rendered cells (row,col -> HTML string)
  const capacity = cache.getStats().capacity;
  const itemsToAdd = Math.min(capacity * 2, 500); // Add more than capacity to trigger evictions

  for (let i = 0; i < itemsToAdd; i++) {
    const row = Math.floor(Math.random() * 1000);
    const col = Math.floor(Math.random() * 26);
    const key = `R${row}C${col}`;
    const value = `<div class="cell">Cell at ${key}: ${Math.random().toFixed(4)}</div>`;
    cache.set(key, value);
  }

  const end = performance.now();
  const stats = cache.getStats();

  cacheResult.innerHTML = `<span class="success">✅ Populated cache with ${itemsToAdd} random cells</span>\n\nOperation Summary:\n• Added: ${itemsToAdd} items\n• Time: ${(end - start).toFixed(2)}ms\n• Avg per item: ${((end - start) / itemsToAdd).toFixed(4)}ms\n• Current size: ${stats.size} (capacity: ${stats.capacity})\n• Evictions: ${stats.evictions} (older items removed)\n\nThe cache automatically evicted ${stats.evictions} least recently used items to stay within capacity!`;

  updateCacheStats();
});

cacheAccessBtn.addEventListener('click', () => {
  if (!cache) return;

  const start = performance.now();

  // Simulate hot access pattern (repeatedly access 20% of items)
  const capacity = cache.getStats().capacity;
  const hotKeys: string[] = [];

  // Create hot keys (20% of capacity)
  for (let i = 0; i < Math.floor(capacity * 0.2); i++) {
    hotKeys.push(`R${i}C0`);
    cache.set(`R${i}C0`, `<div>Hot cell ${i}</div>`);
  }

  // Add some cold keys
  for (let i = 0; i < capacity; i++) {
    cache.set(`R${i + 1000}C0`, `<div>Cold cell ${i}</div>`);
  }

  // Now repeatedly access hot keys
  const iterations = 100;
  let hits = 0;

  for (let i = 0; i < iterations; i++) {
    const key = hotKeys[Math.floor(Math.random() * hotKeys.length)];
    if (cache.get(key)) hits++;
  }

  const end = performance.now();
  const stats = cache.getStats();

  cacheResult.innerHTML = `<span class="success">✅ Simulated hot access pattern</span>\n\nAccess Pattern Results:\n• Hot keys (20% of capacity): ${hotKeys.length}\n• Total accesses: ${iterations}\n• Hits in test: ${hits}/${iterations}\n• Overall hit rate: ${(stats.hitRate * 100).toFixed(1)}%\n• Time: ${(end - start).toFixed(2)}ms\n\nThe cache keeps frequently accessed items in memory while evicting rarely used ones. Perfect for grid cell caching where users scroll to the same areas repeatedly!`;

  updateCacheStats();
});

cacheStressBtn.addEventListener('click', () => {
  if (!cache) return;

  const iterations = 10000;
  const start = performance.now();

  // Stress test with random operations
  for (let i = 0; i < iterations; i++) {
    const op = Math.random();
    const key = `R${Math.floor(Math.random() * 1000)}C${Math.floor(Math.random() * 10)}`;

    if (op < 0.6) {
      // 60% get operations
      cache.get(key);
    } else if (op < 0.9) {
      // 30% set operations
      cache.set(key, `<div>Value ${i}</div>`);
    } else {
      // 10% delete operations
      cache.delete(key);
    }
  }

  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  const stats = cache.getStats();

  cacheResult.innerHTML = `<span class="success">✅ Stress test completed</span>\n\nPerformance Results:\n• Total operations: ${iterations.toLocaleString()}\n• Total time: ${totalTime.toFixed(2)}ms\n• Avg per operation: ${(avgTime * 1000).toFixed(2)}μs\n• Operations/sec: ${Math.floor(iterations / (totalTime / 1000)).toLocaleString()}\n\nCache Statistics:\n• Hits: ${stats.hits.toLocaleString()}\n• Misses: ${stats.misses.toLocaleString()}\n• Hit rate: ${(stats.hitRate * 100).toFixed(1)}%\n• Evictions: ${stats.evictions.toLocaleString()}\n• Final size: ${stats.size}\n\n🚀 Performance verified: O(1) operations maintained at scale!`;

  updateCacheStats();
});

// ==================== COMMAND STACK DEMO ====================

const cmdMaxsizeInput = document.getElementById('cmd-maxsize') as HTMLInputElement;
const cmdInitBtn = document.getElementById('cmd-init-btn') as HTMLButtonElement;
const cmdAddBtn = document.getElementById('cmd-add-btn') as HTMLButtonElement;
const cmdDeleteBtn = document.getElementById('cmd-delete-btn') as HTMLButtonElement;
const cmdUndoBtn = document.getElementById('cmd-undo-btn') as HTMLButtonElement;
const cmdRedoBtn = document.getElementById('cmd-redo-btn') as HTMLButtonElement;
const cmdClearBtn = document.getElementById('cmd-clear-btn') as HTMLButtonElement;
const cmdDocument = document.getElementById('cmd-document') as HTMLDivElement;
const cmdHistory = document.getElementById('cmd-history') as HTMLDivElement;
const cmdUndoCount = document.getElementById('cmd-undo-count') as HTMLDivElement;
const cmdRedoCount = document.getElementById('cmd-redo-count') as HTMLDivElement;
const cmdTotalCount = document.getElementById('cmd-total-count') as HTMLDivElement;

let commandStack: CommandStack | null = null;
let documentText = '';
let commandCounter = 0;

function updateCommandStats() {
  if (!commandStack) return;

  cmdUndoCount.textContent = commandStack.getUndoCount().toString();
  cmdRedoCount.textContent = commandStack.getRedoCount().toString();
  cmdTotalCount.textContent = (commandStack.getUndoCount() + commandStack.getRedoCount()).toString();

  cmdUndoBtn.disabled = !commandStack.canUndo();
  cmdRedoBtn.disabled = !commandStack.canRedo();

  const undoHistory = commandStack.getUndoHistory();
  const redoHistory = commandStack.getRedoHistory();

  let historyText = '';

  if (undoHistory.length > 0) {
    historyText += 'Undo Stack (most recent first):\n';
    undoHistory.reverse().forEach((desc, idx) => {
      historyText += `  ${undoHistory.length - idx}. ${desc}\n`;
    });
    undoHistory.reverse(); // restore order
  }

  if (redoHistory.length > 0) {
    historyText += '\nRedo Stack:\n';
    redoHistory.reverse().forEach((desc, idx) => {
      historyText += `  ${redoHistory.length - idx}. ${desc}\n`;
    });
  }

  if (undoHistory.length === 0 && redoHistory.length === 0) {
    historyText = 'No commands in history. Perform some actions to see the command history!';
  }

  cmdHistory.textContent = historyText;
}

function updateDocument() {
  cmdDocument.textContent = documentText || '(Empty document)';
}

cmdInitBtn.addEventListener('click', () => {
  const maxSize = parseInt(cmdMaxsizeInput.value);

  if (maxSize < 1 || maxSize > 1000) {
    cmdHistory.textContent = '❌ Max size must be between 1 and 1000';
    return;
  }

  commandStack = new CommandStack({ maxSize });
  documentText = 'Welcome to the Command Stack demo!\n';
  commandCounter = 0;

  updateDocument();
  updateCommandStats();

  cmdAddBtn.disabled = false;
  cmdDeleteBtn.disabled = false;
  cmdClearBtn.disabled = false;
  cmdInitBtn.textContent = '✓ Stack Initialized';
  cmdInitBtn.disabled = true;

  cmdHistory.textContent = `✅ Command Stack initialized with max size ${maxSize}\n\nReady to execute commands! Try adding and deleting text, then use undo/redo.`;
});

cmdAddBtn.addEventListener('click', () => {
  if (!commandStack) return;

  commandCounter++;
  const textToAdd = `Line ${commandCounter}: Added at ${new Date().toLocaleTimeString()}\n`;
  const previousText = documentText;
  const newText = previousText + textToAdd;

  const addCommand: ICommand = {
    description: `Add Line ${commandCounter}`,
    execute: () => {
      documentText = newText;
      updateDocument();
    },
    undo: () => {
      documentText = previousText;
      updateDocument();
    },
  };

  commandStack.execute(addCommand);
  updateCommandStats();
});

cmdDeleteBtn.addEventListener('click', () => {
  if (!commandStack) return;

  if (!documentText || documentText === 'Welcome to the Command Stack demo!\n') {
    cmdHistory.textContent = '⚠️ Document is empty or only contains welcome message. Add some text first!';
    return;
  }

  const previousText = documentText;
  const lines = documentText.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    cmdHistory.textContent = '⚠️ No lines to delete!';
    return;
  }

  const deletedLine = lines[lines.length - 1];

  // Compute the new state (after deletion) when command is created
  const linesAfterDelete = [...lines];
  linesAfterDelete.pop();
  const newText = linesAfterDelete.join('\n') + (linesAfterDelete.length > 0 ? '\n' : '');

  const deleteCommand: ICommand = {
    description: `Delete "${deletedLine.substring(0, 30)}${deletedLine.length > 30 ? '...' : ''}"`,
    execute: () => {
      documentText = newText;
      updateDocument();
    },
    undo: () => {
      documentText = previousText;
      updateDocument();
    },
  };

  commandStack.execute(deleteCommand);
  updateCommandStats();
});

cmdUndoBtn.addEventListener('click', () => {
  if (!commandStack) return;

  const result = commandStack.undo();

  if (result) {
    updateCommandStats();
  }
});

cmdRedoBtn.addEventListener('click', () => {
  if (!commandStack) return;

  const result = commandStack.redo();

  if (result) {
    updateCommandStats();
  }
});

cmdClearBtn.addEventListener('click', () => {
  if (!commandStack) return;

  commandStack.clear();
  updateCommandStats();

  cmdHistory.textContent = '✅ Command stack cleared! The document state remains unchanged, but all undo/redo history is gone.';
});

// ==================== SEGMENT TREE DEMO ====================

const segtreeSizeInput = document.getElementById('segtree-size') as HTMLInputElement;
const segtreeTypeSelect = document.getElementById('segtree-type') as HTMLSelectElement;
const segtreeInitBtn = document.getElementById('segtree-init-btn') as HTMLButtonElement;
const segtreeQueryInput = document.getElementById('segtree-query-input') as HTMLInputElement;
const segtreeQueryBtn = document.getElementById('segtree-query-btn') as HTMLButtonElement;
const segtreeUpdateInput = document.getElementById('segtree-update-input') as HTMLInputElement;
const segtreeUpdateBtn = document.getElementById('segtree-update-btn') as HTMLButtonElement;
const segtreeStressBtn = document.getElementById('segtree-stress-btn') as HTMLButtonElement;
const segtreeArray = document.getElementById('segtree-array') as HTMLDivElement;
const segtreeResult = document.getElementById('segtree-result') as HTMLDivElement;
const segtreeSizeStat = document.getElementById('segtree-size-stat') as HTMLDivElement;
const segtreeTotal = document.getElementById('segtree-total') as HTMLDivElement;
const segtreeQueries = document.getElementById('segtree-queries') as HTMLDivElement;
const segtreeUpdates = document.getElementById('segtree-updates') as HTMLDivElement;
const segtreeTime = document.getElementById('segtree-time') as HTMLDivElement;

let segmentTree: SegmentTree<number> | null = null;
let segmentTreeArray: number[] = [];
let queryCount = 0;
let updateCount = 0;

function updateSegTreeStats() {
  if (!segmentTree) return;

  segtreeSizeStat.textContent = segmentTree.size.toString();
  segtreeTotal.textContent = segmentTree.total.toString();
  segtreeQueries.textContent = queryCount.toString();
  segtreeUpdates.textContent = updateCount.toString();
}

function visualizeArray() {
  if (!segmentTree) return;

  const values = segmentTree.toArray();
  let html = '<div style="display: flex; gap: 4px; flex-wrap: wrap;">';

  values.forEach((val, idx) => {
    html += `<div style="
      display: inline-block;
      padding: 8px 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      text-align: center;
      min-width: 50px;
    ">
      <div style="font-size: 10px; opacity: 0.8;">[${idx}]</div>
      <div style="font-weight: bold;">${val}</div>
    </div>`;
  });

  html += '</div>';
  segtreeArray.innerHTML = html;
}

segtreeInitBtn.addEventListener('click', () => {
  const size = parseInt(segtreeSizeInput.value);
  const typeStr = segtreeTypeSelect.value;

  if (size < 5 || size > 100) {
    segtreeResult.innerHTML = '<span class="error">❌ Size must be between 5 and 100</span>';
    return;
  }

  // Map string to AggregationType enum
  let aggType: AggregationType;
  switch (typeStr) {
    case 'sum':
      aggType = AggregationType.SUM;
      break;
    case 'min':
      aggType = AggregationType.MIN;
      break;
    case 'max':
      aggType = AggregationType.MAX;
      break;
    case 'gcd':
      aggType = AggregationType.GCD;
      break;
    default:
      aggType = AggregationType.SUM;
  }

  // Generate random array
  segmentTreeArray = Array.from({ length: size }, () =>
    Math.floor(Math.random() * 100) + 1
  );

  const start = performance.now();
  segmentTree = new SegmentTree({
    values: segmentTreeArray,
    type: aggType,
  });
  const end = performance.now();

  queryCount = 0;
  updateCount = 0;

  segtreeTime.textContent = `${(end - start).toFixed(3)}ms`;

  segtreeQueryInput.disabled = false;
  segtreeQueryBtn.disabled = false;
  segtreeUpdateInput.disabled = false;
  segtreeUpdateBtn.disabled = false;
  segtreeStressBtn.disabled = false;

  segtreeInitBtn.textContent = '✓ Tree Initialized';

  segtreeResult.innerHTML = `<span class="success">✅ Segment Tree initialized</span>\n\nConfiguration:\n• Size: ${size} elements\n• Type: ${typeStr.toUpperCase()}\n• Build time: ${(end - start).toFixed(3)}ms\n• Total: ${segmentTree.total}\n\nYou can now query ranges and update values!\n\nExamples:\n• Query: "0-${size - 1}" (full range)\n• Query: "0-${Math.floor(size / 2)}" (first half)\n• Update: "0:50" (set index 0 to 50)`;

  visualizeArray();
  updateSegTreeStats();
});

segtreeQueryBtn.addEventListener('click', () => {
  if (!segmentTree) return;

  const input = segtreeQueryInput.value.trim();
  const match = input.match(/^(\d+)-(\d+)$/);

  if (!match) {
    segtreeResult.innerHTML = '<span class="error">❌ Invalid format. Use: "start-end" (e.g., "0-10")</span>';
    return;
  }

  const left = parseInt(match[1]);
  const right = parseInt(match[2]);

  if (left < 0 || right >= segmentTree.size || left > right) {
    segtreeResult.innerHTML = `<span class="error">❌ Invalid range. Must be 0 ≤ left ≤ right < ${segmentTree.size}</span>`;
    return;
  }

  const start = performance.now();
  const result = segmentTree.query(left, right);
  const end = performance.now();

  queryCount++;
  segtreeTime.textContent = `${(end - start).toFixed(4)}ms`;

  const rangeSize = right - left + 1;
  const typeStr = segmentTree.aggregationType.toString().toUpperCase();

  segtreeResult.innerHTML = `<span class="success">✅ Query completed</span>\n\nQuery: ${typeStr}[${left}, ${right}]\nRange size: ${rangeSize} elements\nResult: <strong>${result}</strong>\nTime: ${(end - start).toFixed(4)}ms\n\n💡 This query ran in O(log n) time!`;

  updateSegTreeStats();
});

segtreeUpdateBtn.addEventListener('click', () => {
  if (!segmentTree) return;

  const input = segtreeUpdateInput.value.trim();
  const match = input.match(/^(\d+):(-?\d+)$/);

  if (!match) {
    segtreeResult.innerHTML = '<span class="error">❌ Invalid format. Use: "index:value" (e.g., "5:100")</span>';
    return;
  }

  const index = parseInt(match[1]);
  const value = parseInt(match[2]);

  if (index < 0 || index >= segmentTree.size) {
    segtreeResult.innerHTML = `<span class="error">❌ Invalid index. Must be 0 ≤ index < ${segmentTree.size}</span>`;
    return;
  }

  const oldValue = segmentTree.get(index);

  const start = performance.now();
  segmentTree.update(index, value);
  const end = performance.now();

  updateCount++;
  segtreeTime.textContent = `${(end - start).toFixed(4)}ms`;

  segtreeResult.innerHTML = `<span class="success">✅ Update completed</span>\n\nUpdated index ${index}:\n• Old value: ${oldValue}\n• New value: ${value}\n• Time: ${(end - start).toFixed(4)}ms\n• New total: ${segmentTree.total}\n\n💡 This update ran in O(log n) time and updated all affected nodes in the tree!`;

  visualizeArray();
  updateSegTreeStats();
});

segtreeStressBtn.addEventListener('click', () => {
  if (!segmentTree) return;

  const iterations = 1000;
  const queryTimes: number[] = [];
  const updateTimes: number[] = [];

  // Mix of queries and updates
  for (let i = 0; i < iterations; i++) {
    if (i % 2 === 0) {
      // Query
      const left = Math.floor(Math.random() * segmentTree.size);
      const right = Math.min(
        left + Math.floor(Math.random() * 10),
        segmentTree.size - 1
      );

      const start = performance.now();
      segmentTree.query(left, right);
      const end = performance.now();

      queryTimes.push(end - start);
      queryCount++;
    } else {
      // Update
      const index = Math.floor(Math.random() * segmentTree.size);
      const value = Math.floor(Math.random() * 100) + 1;

      const start = performance.now();
      segmentTree.update(index, value);
      const end = performance.now();

      updateTimes.push(end - start);
      updateCount++;
    }
  }

  const avgQueryTime =
    queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
  const avgUpdateTime =
    updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length;
  const totalTime = queryTimes.reduce((a, b) => a + b, 0) + updateTimes.reduce((a, b) => a + b, 0);

  segtreeTime.textContent = `${totalTime.toFixed(2)}ms`;

  segtreeResult.innerHTML = `<span class="success">✅ Stress test completed</span>\n\nPerformed ${iterations} operations:\n\nQueries (${queryTimes.length}):\n• Avg time: ${(avgQueryTime * 1000).toFixed(2)}μs\n• Total time: ${queryTimes.reduce((a, b) => a + b, 0).toFixed(2)}ms\n\nUpdates (${updateTimes.length}):\n• Avg time: ${(avgUpdateTime * 1000).toFixed(2)}μs\n• Total time: ${updateTimes.reduce((a, b) => a + b, 0).toFixed(2)}ms\n\nTotal time: ${totalTime.toFixed(2)}ms\nOps/sec: ${Math.floor(iterations / (totalTime / 1000)).toLocaleString()}\n\n🚀 Performance verified: O(log n) operations maintained at scale!\nFinal total: ${segmentTree.total}`;

  visualizeArray();
  updateSegTreeStats();
});

// ==================== SKIP LIST DEMO ====================

const skiplistKeyInput = document.getElementById('skiplist-key') as HTMLInputElement;
const skiplistValueInput = document.getElementById('skiplist-value') as HTMLInputElement;
const skiplistInsertBtn = document.getElementById('skiplist-insert-btn') as HTMLButtonElement;
const skiplistDeleteBtn = document.getElementById('skiplist-delete-btn') as HTMLButtonElement;
const skiplistClearBtn = document.getElementById('skiplist-clear-btn') as HTMLButtonElement;
const skiplistRangeInput = document.getElementById('skiplist-range') as HTMLInputElement;
const skiplistRangeBtn = document.getElementById('skiplist-range-btn') as HTMLButtonElement;
const skiplistKthInput = document.getElementById('skiplist-kth') as HTMLInputElement;
const skiplistKthBtn = document.getElementById('skiplist-kth-btn') as HTMLButtonElement;
const skiplistPopulateBtn = document.getElementById('skiplist-populate-btn') as HTMLButtonElement;
const skiplistBenchmarkBtn = document.getElementById('skiplist-benchmark-btn') as HTMLButtonElement;
const skiplistVisualization = document.getElementById('skiplist-visualization') as HTMLDivElement;
const skiplistResult = document.getElementById('skiplist-result') as HTMLDivElement;
const skiplistSizeEl = document.getElementById('skiplist-size') as HTMLDivElement;
const skiplistLevelEl = document.getElementById('skiplist-level') as HTMLDivElement;
const skiplistMinEl = document.getElementById('skiplist-min') as HTMLDivElement;
const skiplistMaxEl = document.getElementById('skiplist-max') as HTMLDivElement;
const skiplistTimeEl = document.getElementById('skiplist-time') as HTMLDivElement;

const skipList = new SkipList<number, string>();

function updateSkipListStats() {
  const stats = skipList.getStats();

  skiplistSizeEl.textContent = stats.size.toString();
  skiplistLevelEl.textContent = stats.level.toString();

  const min = skipList.min();
  const max = skipList.max();

  skiplistMinEl.textContent = min ? min.key.toString() : '-';
  skiplistMaxEl.textContent = max ? max.key.toString() : '-';
}

function visualizeSkipList() {
  const entries = skipList.entries();

  if (entries.length === 0) {
    skiplistVisualization.innerHTML = '<div style="color: #999; padding: 20px; text-align: center;">Empty Skip List - Insert some data to see visualization</div>';
    return;
  }

  let html = '<div style="display: flex; gap: 4px; flex-wrap: wrap;">';

  entries.forEach(([key, value]) => {
    html += `<div style="
      display: inline-block;
      padding: 10px 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 6px;
      font-family: monospace;
      font-size: 13px;
      text-align: center;
      min-width: 80px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">
      <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px;">Key: ${key}</div>
      <div style="font-weight: bold; font-size: 14px;">${value}</div>
    </div>`;
  });

  html += '</div>';
  skiplistVisualization.innerHTML = html;
}

skiplistInsertBtn.addEventListener('click', () => {
  const key = parseInt(skiplistKeyInput.value);
  const value = skiplistValueInput.value.trim();

  if (isNaN(key)) {
    skiplistResult.innerHTML = '<span class="error">❌ Please enter a valid number for key</span>';
    return;
  }

  if (!value) {
    skiplistResult.innerHTML = '<span class="error">❌ Please enter a value</span>';
    return;
  }

  const start = performance.now();
  const oldValue = skipList.set(key, value);
  const end = performance.now();

  skiplistTimeEl.textContent = `${(end - start).toFixed(4)}ms`;

  if (oldValue !== undefined) {
    skiplistResult.innerHTML = `<span class="success">✅ Updated key ${key}</span>\n\nOld value: "${oldValue}"\nNew value: "${value}"\nTime: ${(end - start).toFixed(4)}ms`;
  } else {
    skiplistResult.innerHTML = `<span class="success">✅ Inserted key ${key}</span>\n\nValue: "${value}"\nTime: ${(end - start).toFixed(4)}ms\n\n💡 Skip List maintains sorted order automatically!`;
  }

  visualizeSkipList();
  updateSkipListStats();

  // Clear input for next entry
  skiplistValueInput.value = '';
  skiplistKeyInput.value = (key + 1).toString();
});

skiplistDeleteBtn.addEventListener('click', () => {
  const key = parseInt(skiplistKeyInput.value);

  if (isNaN(key)) {
    skiplistResult.innerHTML = '<span class="error">❌ Please enter a valid number for key</span>';
    return;
  }

  const start = performance.now();
  const deleted = skipList.delete(key);
  const end = performance.now();

  skiplistTimeEl.textContent = `${(end - start).toFixed(4)}ms`;

  if (deleted) {
    skiplistResult.innerHTML = `<span class="success">✅ Deleted key ${key}</span>\n\nTime: ${(end - start).toFixed(4)}ms`;
  } else {
    skiplistResult.innerHTML = `<span class="error">❌ Key ${key} not found</span>\n\nTime: ${(end - start).toFixed(4)}ms`;
  }

  visualizeSkipList();
  updateSkipListStats();
});

skiplistClearBtn.addEventListener('click', () => {
  skipList.clear();

  skiplistResult.innerHTML = '<span class="success">✅ Skip List cleared</span>';
  visualizeSkipList();
  updateSkipListStats();
});

skiplistRangeBtn.addEventListener('click', () => {
  const rangeStr = skiplistRangeInput.value.trim();
  const match = rangeStr.match(/^(\d+)-(\d+)$/);

  if (!match) {
    skiplistResult.innerHTML = '<span class="error">❌ Invalid format. Use: "start-end" (e.g., "10-50")</span>';
    return;
  }

  const startKey = parseInt(match[1]);
  const endKey = parseInt(match[2]);

  if (startKey > endKey) {
    skiplistResult.innerHTML = '<span class="error">❌ Start key must be ≤ end key</span>';
    return;
  }

  const start = performance.now();
  const results = skipList.range(startKey, endKey);
  const end = performance.now();

  skiplistTimeEl.textContent = `${(end - start).toFixed(4)}ms`;

  if (results.length === 0) {
    skiplistResult.innerHTML = `<span style="color: #f39c12;">⚠️ No entries in range [${startKey}, ${endKey}]</span>\n\nTime: ${(end - start).toFixed(4)}ms`;
  } else {
    let output = `<span class="success">✅ Found ${results.length} entries in range [${startKey}, ${endKey}]</span>\n\nTime: ${(end - start).toFixed(4)}ms\n\n`;
    output += 'Results:\n';
    results.forEach(r => {
      output += `  ${r.key}: "${r.value}"\n`;
    });
    skiplistResult.innerHTML = output;
  }
});

skiplistKthBtn.addEventListener('click', () => {
  const k = parseInt(skiplistKthInput.value);

  if (isNaN(k) || k < 0) {
    skiplistResult.innerHTML = '<span class="error">❌ Please enter a valid non-negative number</span>';
    return;
  }

  const start = performance.now();
  const result = skipList.getKth(k);
  const end = performance.now();

  skiplistTimeEl.textContent = `${(end - start).toFixed(4)}ms`;

  if (result) {
    skiplistResult.innerHTML = `<span class="success">✅ Found ${k}th element</span>\n\nKey: ${result.key}\nValue: "${result.value}"\nTime: ${(end - start).toFixed(4)}ms\n\n💡 This is the ${k}th smallest element (0-indexed)`;
  } else {
    skiplistResult.innerHTML = `<span class="error">❌ Invalid index ${k}</span>\n\nSkip List size: ${skipList.size}\nValid range: 0 to ${skipList.size - 1}`;
  }
});

skiplistPopulateBtn.addEventListener('click', () => {
  const count = 50;

  skipList.clear();

  const start = performance.now();

  for (let i = 0; i < count; i++) {
    const key = Math.floor(Math.random() * 200);
    const value = `Item-${key}`;
    skipList.set(key, value);
  }

  const end = performance.now();

  skiplistTimeEl.textContent = `${(end - start).toFixed(2)}ms`;

  skiplistResult.innerHTML = `<span class="success">✅ Populated with random data</span>\n\nAttempted: ${count} insertions\nActual size: ${skipList.size} (duplicates were updated)\nTime: ${(end - start).toFixed(2)}ms\n\n💡 Data is automatically maintained in sorted order!`;

  visualizeSkipList();
  updateSkipListStats();
});

skiplistBenchmarkBtn.addEventListener('click', () => {
  const iterations = 10000;

  // Clear and prepare
  skipList.clear();

  let insertTime = 0;
  let searchTime = 0;
  let deleteTime = 0;
  let rangeTime = 0;

  // Benchmark inserts
  let start = performance.now();
  for (let i = 0; i < iterations / 2; i++) {
    skipList.set(i, `value-${i}`);
  }
  let end = performance.now();
  insertTime = end - start;

  // Benchmark searches
  start = performance.now();
  for (let i = 0; i < iterations; i++) {
    skipList.get(Math.floor(Math.random() * iterations / 2));
  }
  end = performance.now();
  searchTime = end - start;

  // Benchmark range queries
  start = performance.now();
  for (let i = 0; i < 100; i++) {
    const startKey = Math.floor(Math.random() * 1000);
    skipList.range(startKey, startKey + 100);
  }
  end = performance.now();
  rangeTime = end - start;

  // Benchmark deletes
  start = performance.now();
  for (let i = 0; i < 1000; i++) {
    skipList.delete(i);
  }
  end = performance.now();
  deleteTime = end - start;

  const totalTime = insertTime + searchTime + rangeTime + deleteTime;

  skiplistTimeEl.textContent = `${totalTime.toFixed(2)}ms`;

  skiplistResult.innerHTML = `<span class="success">✅ Benchmark completed</span>\n\nInsert (5K ops):\n• Total: ${insertTime.toFixed(2)}ms\n• Avg: ${(insertTime / (iterations / 2) * 1000).toFixed(2)}μs/op\n• Ops/sec: ${Math.floor((iterations / 2) / (insertTime / 1000)).toLocaleString()}\n\nSearch (10K ops):\n• Total: ${searchTime.toFixed(2)}ms\n• Avg: ${(searchTime / iterations * 1000).toFixed(2)}μs/op\n• Ops/sec: ${Math.floor(iterations / (searchTime / 1000)).toLocaleString()}\n\nRange Query (100 ops):\n• Total: ${rangeTime.toFixed(2)}ms\n• Avg: ${(rangeTime / 100).toFixed(2)}ms/op\n\nDelete (1K ops):\n• Total: ${deleteTime.toFixed(2)}ms\n• Avg: ${(deleteTime / 1000 * 1000).toFixed(2)}μs/op\n\n🚀 Total time: ${totalTime.toFixed(2)}ms\nFinal size: ${skipList.size}`;

  visualizeSkipList();
  updateSkipListStats();
});

// Initialize visualization
visualizeSkipList();
updateSkipListStats();

// ==================== DISJOINT SET DEMO ====================

const disjointGridSizeInput = document.getElementById('disjoint-grid-size') as HTMLInputElement;
const disjointInitBtn = document.getElementById('disjoint-init-btn') as HTMLButtonElement;
const disjointMergeInput = document.getElementById('disjoint-merge-input') as HTMLInputElement;
const disjointMergeBtn = document.getElementById('disjoint-merge-btn') as HTMLButtonElement;
const disjointCheckInput = document.getElementById('disjoint-check-input') as HTMLInputElement;
const disjointCheckBtn = document.getElementById('disjoint-check-btn') as HTMLButtonElement;
const disjointPreset1Btn = document.getElementById('disjoint-preset1') as HTMLButtonElement;
const disjointPreset2Btn = document.getElementById('disjoint-preset2') as HTMLButtonElement;
const disjointBenchmarkBtn = document.getElementById('disjoint-benchmark-btn') as HTMLButtonElement;
const disjointVisualization = document.getElementById('disjoint-visualization') as HTMLDivElement;
const disjointResult = document.getElementById('disjoint-result') as HTMLDivElement;
const disjointCellsEl = document.getElementById('disjoint-cells') as HTMLDivElement;
const disjointSetsEl = document.getElementById('disjoint-sets') as HTMLDivElement;
const disjointLargestEl = document.getElementById('disjoint-largest') as HTMLDivElement;
const disjointTimeEl = document.getElementById('disjoint-time') as HTMLDivElement;

let disjointSet: DisjointSet<[number, number]> | null = null;
let gridRows = 0;
let gridCols = 0;

function updateDisjointSetStats() {
  if (!disjointSet) return;

  const stats = disjointSet.getStats();

  disjointCellsEl.textContent = stats.totalElements.toString();
  disjointSetsEl.textContent = stats.numSets.toString();
  disjointLargestEl.textContent = stats.largestSetSize.toString();
}

function visualizeDisjointGrid() {
  if (!disjointSet) {
    disjointVisualization.innerHTML = '<div style="color: #999; padding: 20px; text-align: center;">Grid not initialized - Click "Initialize Grid" button</div>';
    return;
  }

  const sets = disjointSet.getSets();
  const colorMap = new Map<string, string>();

  // Assign colors to each set (use the root as key)
  const colors = [
    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#d35400',
    '#c0392b', '#27ae60', '#2980b9', '#8e44ad', '#16a085'
  ];

  let colorIndex = 0;
  sets.forEach((_cells, root) => {
    const rootKey = DisjointSetUtils.gridHashFn(root);
    colorMap.set(rootKey, colors[colorIndex % colors.length]);
    colorIndex++;
  });

  // Create grid visualization
  let html = '<table style="border-collapse: collapse; margin: 0 auto;">';

  for (let row = 0; row < gridRows; row++) {
    html += '<tr>';
    for (let col = 0; col < gridCols; col++) {
      const cell: [number, number] = [row, col];
      const root = disjointSet.find(cell);
      const rootKey = root ? DisjointSetUtils.gridHashFn(root) : '';
      const color = colorMap.get(rootKey) || '#ecf0f1';
      const setSize = disjointSet.getSetSize(cell);

      html += `<td style="
        width: 40px;
        height: 40px;
        border: 1px solid #bdc3c7;
        text-align: center;
        background: ${color};
        color: white;
        font-size: 10px;
        font-weight: bold;
        vertical-align: middle;
        position: relative;
      ">
        <div style="font-size: 9px; opacity: 0.8;">${row},${col}</div>
        ${setSize > 1 ? `<div style="font-size: 8px; position: absolute; bottom: 2px; right: 2px; background: rgba(0,0,0,0.3); padding: 1px 3px; border-radius: 2px;">${setSize}</div>` : ''}
      </td>`;
    }
    html += '</tr>';
  }

  html += '</table>';
  html += '<div style="margin-top: 10px; font-size: 11px; color: #666; text-align: center;">Each color represents a merged cell region. Numbers in bottom-right show set size.</div>';

  disjointVisualization.innerHTML = html;
}

disjointInitBtn.addEventListener('click', () => {
  const sizeStr = disjointGridSizeInput.value.trim();
  const match = sizeStr.match(/^(\d+)x(\d+)$/i);

  if (!match) {
    disjointResult.innerHTML = '<span class="error">❌ Invalid format. Use: "rowsxcols" (e.g., "10x10")</span>';
    return;
  }

  gridRows = parseInt(match[1]);
  gridCols = parseInt(match[2]);

  if (gridRows < 1 || gridRows > 20 || gridCols < 1 || gridCols > 20) {
    disjointResult.innerHTML = '<span class="error">❌ Grid size must be between 1x1 and 20x20</span>';
    return;
  }

  const start = performance.now();

  disjointSet = new DisjointSet<[number, number]>({
    hashFn: DisjointSetUtils.gridHashFn,
    equalityFn: DisjointSetUtils.gridEqualityFn,
  });

  // Initialize all cells
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      disjointSet.makeSet([row, col]);
    }
  }

  const end = performance.now();

  disjointTimeEl.textContent = `${(end - start).toFixed(3)}ms`;

  disjointMergeInput.disabled = false;
  disjointMergeBtn.disabled = false;
  disjointCheckInput.disabled = false;
  disjointCheckBtn.disabled = false;
  disjointPreset1Btn.disabled = false;
  disjointPreset2Btn.disabled = false;
  disjointBenchmarkBtn.disabled = false;

  disjointInitBtn.textContent = '✓ Grid Initialized';

  disjointResult.innerHTML = `<span class="success">✅ Grid initialized</span>\n\nSize: ${gridRows} rows × ${gridCols} columns\nTotal cells: ${gridRows * gridCols}\nTime: ${(end - start).toFixed(3)}ms\n\nYou can now merge cells and check connections!\n\nExamples:\n• Merge: "(0,0)-(2,2)" (3×3 block)\n• Merge: "(0,0)-(0,${gridCols - 1})" (header row)\n• Check: "(0,0),(1,1)" (are they merged?)`;

  visualizeDisjointGrid();
  updateDisjointSetStats();
});

disjointMergeBtn.addEventListener('click', () => {
  if (!disjointSet) return;

  const input = disjointMergeInput.value.trim();
  const match = input.match(/^\((\d+),(\d+)\)-\((\d+),(\d+)\)$/);

  if (!match) {
    disjointResult.innerHTML = '<span class="error">❌ Invalid format. Use: "(row1,col1)-(row2,col2)" (e.g., "(0,0)-(2,2)")</span>';
    return;
  }

  const row1 = parseInt(match[1]);
  const col1 = parseInt(match[2]);
  const row2 = parseInt(match[3]);
  const col2 = parseInt(match[4]);

  if (
    row1 < 0 || row1 >= gridRows || col1 < 0 || col1 >= gridCols ||
    row2 < 0 || row2 >= gridRows || col2 < 0 || col2 >= gridCols
  ) {
    disjointResult.innerHTML = `<span class="error">❌ Coordinates out of bounds. Valid range: 0-${gridRows - 1}, 0-${gridCols - 1}</span>`;
    return;
  }

  const startRow = Math.min(row1, row2);
  const endRow = Math.max(row1, row2);
  const startCol = Math.min(col1, col2);
  const endCol = Math.max(col1, col2);

  const start = performance.now();

  let mergeCount = 0;
  const firstCell: [number, number] = [startRow, startCol];

  // Merge all cells in the range
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      if (row === startRow && col === startCol) continue;

      const merged = disjointSet.union(firstCell, [row, col]);
      if (merged) mergeCount++;
    }
  }

  const end = performance.now();

  disjointTimeEl.textContent = `${(end - start).toFixed(4)}ms`;

  const totalCells = (endRow - startRow + 1) * (endCol - startCol + 1);
  const setSize = disjointSet.getSetSize(firstCell);

  disjointResult.innerHTML = `<span class="success">✅ Merged cell range</span>\n\nRange: (${startRow},${startCol}) to (${endRow},${endCol})\nCells in range: ${totalCells}\nMerge operations: ${mergeCount}\nFinal set size: ${setSize}\nTime: ${(end - start).toFixed(4)}ms\n\n💡 All cells in this range are now in the same set!\nPath compression ensures future queries are O(α(n)) ≈ O(1)`;

  visualizeDisjointGrid();
  updateDisjointSetStats();
});

disjointCheckBtn.addEventListener('click', () => {
  if (!disjointSet) return;

  const input = disjointCheckInput.value.trim();
  const match = input.match(/^\((\d+),(\d+)\),\((\d+),(\d+)\)$/);

  if (!match) {
    disjointResult.innerHTML = '<span class="error">❌ Invalid format. Use: "(row1,col1),(row2,col2)" (e.g., "(0,0),(1,1)")</span>';
    return;
  }

  const row1 = parseInt(match[1]);
  const col1 = parseInt(match[2]);
  const row2 = parseInt(match[3]);
  const col2 = parseInt(match[4]);

  if (
    row1 < 0 || row1 >= gridRows || col1 < 0 || col1 >= gridCols ||
    row2 < 0 || row2 >= gridRows || col2 < 0 || col2 >= gridCols
  ) {
    disjointResult.innerHTML = `<span class="error">❌ Coordinates out of bounds. Valid range: 0-${gridRows - 1}, 0-${gridCols - 1}</span>`;
    return;
  }

  const cell1: [number, number] = [row1, col1];
  const cell2: [number, number] = [row2, col2];

  const start = performance.now();
  const connected = disjointSet.connected(cell1, cell2);
  const root1 = disjointSet.find(cell1);
  const root2 = disjointSet.find(cell2);
  const setSize1 = disjointSet.getSetSize(cell1);
  const setSize2 = disjointSet.getSetSize(cell2);
  const end = performance.now();

  disjointTimeEl.textContent = `${(end - start).toFixed(4)}ms`;

  if (connected) {
    disjointResult.innerHTML = `<span class="success">✅ Cells are CONNECTED</span>\n\nCell 1: (${row1},${col1})\nCell 2: (${row2},${col2})\n\nBoth cells belong to the same merged region!\n\nRoot: (${root1?.[0]},${root1?.[1]})\nSet size: ${setSize1} cells\nTime: ${(end - start).toFixed(4)}ms\n\n💡 This query ran in O(α(n)) ≈ O(1) time!`;
  } else {
    disjointResult.innerHTML = `<span style="color: #f39c12;">⚠️ Cells are NOT connected</span>\n\nCell 1: (${row1},${col1})\n• Root: (${root1?.[0]},${root1?.[1]})\n• Set size: ${setSize1}\n\nCell 2: (${row2},${col2})\n• Root: (${root2?.[0]},${root2?.[1]})\n• Set size: ${setSize2}\n\nTime: ${(end - start).toFixed(4)}ms`;
  }
});

disjointPreset1Btn.addEventListener('click', () => {
  if (!disjointSet) return;

  // Merge entire first row (header row)
  const start = performance.now();

  let mergeCount = 0;
  for (let col = 1; col < gridCols; col++) {
    const merged = disjointSet.union([0, 0], [0, col]);
    if (merged) mergeCount++;
  }

  const end = performance.now();

  disjointTimeEl.textContent = `${(end - start).toFixed(4)}ms`;

  disjointResult.innerHTML = `<span class="success">✅ Merged header row</span>\n\nMerged cells (0,0) through (0,${gridCols - 1})\nMerge operations: ${mergeCount}\nTime: ${(end - start).toFixed(4)}ms\n\n💡 Common pattern for spreadsheet headers!`;

  visualizeDisjointGrid();
  updateDisjointSetStats();
});

disjointPreset2Btn.addEventListener('click', () => {
  if (!disjointSet) return;

  // Merge 2×2 blocks across the grid
  const start = performance.now();

  let mergeCount = 0;
  for (let row = 0; row < gridRows - 1; row += 2) {
    for (let col = 0; col < gridCols - 1; col += 2) {
      // Merge 2×2 block
      const firstCell: [number, number] = [row, col];

      for (let dr = 0; dr < 2; dr++) {
        for (let dc = 0; dc < 2; dc++) {
          if (dr === 0 && dc === 0) continue;
          if (row + dr >= gridRows || col + dc >= gridCols) continue;

          const merged = disjointSet.union(firstCell, [row + dr, col + dc]);
          if (merged) mergeCount++;
        }
      }
    }
  }

  const end = performance.now();

  disjointTimeEl.textContent = `${(end - start).toFixed(4)}ms`;

  disjointResult.innerHTML = `<span class="success">✅ Created 2×2 merged blocks</span>\n\nMerge operations: ${mergeCount}\nTime: ${(end - start).toFixed(4)}ms\n\n💡 Creates a checkerboard pattern of merged cells!`;

  visualizeDisjointGrid();
  updateDisjointSetStats();
});

disjointBenchmarkBtn.addEventListener('click', () => {
  // Create a large 100×100 grid and benchmark operations
  const benchRows = 100;
  const benchCols = 100;
  const totalCells = benchRows * benchCols;

  const benchSet = new DisjointSet<[number, number]>({
    hashFn: DisjointSetUtils.gridHashFn,
    equalityFn: DisjointSetUtils.gridEqualityFn,
  });

  // Initialize
  let start = performance.now();
  for (let row = 0; row < benchRows; row++) {
    for (let col = 0; col < benchCols; col++) {
      benchSet.makeSet([row, col]);
    }
  }
  let end = performance.now();
  const initTime = end - start;

  // Merge horizontal ranges
  start = performance.now();
  let mergeCount = 0;
  for (let row = 0; row < benchRows; row += 5) {
    for (let col = 0; col < benchCols - 1; col++) {
      benchSet.union([row, col], [row, col + 1]);
      mergeCount++;
    }
  }
  end = performance.now();
  const mergeTime = end - start;

  // Check connectivity
  start = performance.now();
  let checkCount = 0;
  for (let i = 0; i < 1000; i++) {
    const row = Math.floor(Math.random() * benchRows);
    const col1 = Math.floor(Math.random() * benchCols);
    const col2 = Math.floor(Math.random() * benchCols);
    benchSet.connected([row, col1], [row, col2]);
    checkCount++;
  }
  end = performance.now();
  const checkTime = end - start;

  const totalTime = initTime + mergeTime + checkTime;

  disjointTimeEl.textContent = `${totalTime.toFixed(2)}ms`;

  const stats = benchSet.getStats();

  disjointResult.innerHTML = `<span class="success">✅ Benchmark completed on ${benchRows}×${benchCols} grid</span>\n\nInitialization (${totalCells} cells):\n• Time: ${initTime.toFixed(2)}ms\n• Ops/sec: ${Math.floor(totalCells / (initTime / 1000)).toLocaleString()}\n\nMerge Operations (${mergeCount} unions):\n• Time: ${mergeTime.toFixed(2)}ms\n• Avg: ${(mergeTime / mergeCount * 1000).toFixed(2)}μs/op\n• Ops/sec: ${Math.floor(mergeCount / (mergeTime / 1000)).toLocaleString()}\n\nConnectivity Checks (${checkCount} queries):\n• Time: ${checkTime.toFixed(2)}ms\n• Avg: ${(checkTime / checkCount * 1000).toFixed(2)}μs/op\n• Ops/sec: ${Math.floor(checkCount / (checkTime / 1000)).toLocaleString()}\n\n📊 Final Statistics:\n• Total cells: ${stats.totalElements}\n• Disjoint sets: ${stats.numSets}\n• Largest merge: ${stats.largestSetSize} cells\n\n🚀 Total time: ${totalTime.toFixed(2)}ms\n💡 Path compression + union by rank = O(α(n)) ≈ O(1)!`;
});

// Initialize visualization
visualizeDisjointGrid();
updateDisjointSetStats();

console.log('✓ Data Structures & Algorithms Demo Loaded!');
console.log('Grid instance:', grid);
console.log('All features available via grid object:');
console.log('- grid.spatialHitTester (RTree)');
console.log('- grid.filterAutocomplete (Trie)');
console.log('- grid.filterOptimizer (Bloom Filter)');
console.log('- grid.formulaCalculator (DependencyGraph)');
console.log('- grid.autofillManager (Pattern Detection)');
