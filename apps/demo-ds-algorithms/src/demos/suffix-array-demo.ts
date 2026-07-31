import type { Zengrid } from '@zengrid/core';
import { ALL_PRODUCTS } from './shared-data';

export function initSuffixArrayDemo(grid: Zengrid, trieIndexedFlag: () => boolean) {
  const suffixInput = document.getElementById('suffix-input') as HTMLInputElement;
  const suffixSearchBtn = document.getElementById('suffix-search-btn') as HTMLButtonElement;
  const suffixNaiveBtn = document.getElementById('suffix-naive-btn') as HTMLButtonElement;
  const suffixResult = document.getElementById('suffix-result') as HTMLDivElement;
  const suffixTime = document.getElementById('suffix-time') as HTMLDivElement;
  const naiveTime = document.getElementById('naive-time') as HTMLDivElement;
  const suffixSpeedup = document.getElementById('suffix-speedup') as HTMLDivElement;

  suffixSearchBtn.addEventListener('click', () => {
    if (!trieIndexedFlag()) {
      suffixResult.textContent = 'Please index data first using the Trie demo above.';
      return;
    }

    const query = suffixInput.value.trim();

    if (!query) {
      suffixResult.textContent = 'Please enter a search term.';
      return;
    }

    const start = performance.now();
    grid.substringFilter.indexColumn(0, ALL_PRODUCTS);

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
}
