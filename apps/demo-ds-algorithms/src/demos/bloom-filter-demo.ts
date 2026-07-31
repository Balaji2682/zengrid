import type { Zengrid } from '@zengrid/core';
import { ALL_PRODUCTS } from './shared-data';

export function initBloomFilterDemo(grid: Zengrid, trieIndexedFlag: () => boolean) {
  const bloomInput = document.getElementById('bloom-input') as HTMLInputElement;
  const bloomCheckBtn = document.getElementById('bloom-check-btn') as HTMLButtonElement;
  const bloomScanBtn = document.getElementById('bloom-scan-btn') as HTMLButtonElement;
  const bloomSamplesBtn = document.getElementById('bloom-samples-btn') as HTMLButtonElement;
  const bloomResult = document.getElementById('bloom-result') as HTMLDivElement;
  const bloomTime = document.getElementById('bloom-time') as HTMLDivElement;
  const scanTime = document.getElementById('scan-time') as HTMLDivElement;

  bloomCheckBtn.addEventListener('click', () => {
    if (!trieIndexedFlag()) {
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
}
