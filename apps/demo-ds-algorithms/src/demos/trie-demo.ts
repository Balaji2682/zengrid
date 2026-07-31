import type { Zengrid } from '@zengrid/core';
import { ALL_PRODUCTS } from './shared-data';

export function initTrieDemo(grid: Zengrid) {
  const trieInput = document.getElementById('trie-input') as HTMLInputElement;
  const trieSuggestions = document.getElementById('trie-suggestions') as HTMLUListElement;
  const indexColumnBtn = document.getElementById('index-column-btn') as HTMLButtonElement;
  const trieIndexedEl = document.getElementById('trie-indexed') as HTMLDivElement;
  const trieTime = document.getElementById('trie-time') as HTMLDivElement;

  let trieIndexedFlag = false;

  indexColumnBtn.addEventListener('click', () => {
    const start = performance.now();

    grid.filterAutocomplete.indexColumn(0, ALL_PRODUCTS);
    grid.filterOptimizer.indexColumn(0, ALL_PRODUCTS, 0.01);

    const end = performance.now();

    trieIndexedFlag = true;
    trieIndexedEl.textContent = grid.filterAutocomplete.getStats()[0]?.uniqueValues.toString() || '10000';

    indexColumnBtn.textContent = '✓ Indexed!';
    indexColumnBtn.disabled = true;

    trieSuggestions.innerHTML = `<li style="color: #27ae60;">✓ Indexed ${ALL_PRODUCTS.length} products in ${(end - start).toFixed(2)}ms</li>`;

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
}
