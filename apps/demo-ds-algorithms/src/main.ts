/**
 * Data Structures & Algorithms Demo
 *
 * Interactive demonstration of all implemented DS & algorithms
 */

import { Zengrid } from '@zengrid/core';
import { initTrieDemo } from './demos/trie-demo';
import { initRTreeDemo } from './demos/rtree-demo';
import { initDependencyGraphDemo } from './demos/dependency-graph-demo';
import { initBloomFilterDemo } from './demos/bloom-filter-demo';
import { initSuffixArrayDemo } from './demos/suffix-array-demo';
import { initPatternDetectionDemo } from './demos/pattern-detection-demo';
import { initLRUCacheDemo } from './demos/lru-cache-demo';
import { initCommandStackDemo } from './demos/command-stack-demo';
import { initSegmentTreeDemo } from './demos/segment-tree-demo';
import { initSkipListDemo } from './demos/skip-list-demo';
import { initDisjointSetDemo } from './demos/disjoint-set-demo';

const gridContainer = document.createElement('div');
gridContainer.style.display = 'none';
document.body.appendChild(gridContainer);

const grid = new Zengrid(gridContainer, {
  rowCount: 100,
  colCount: 10,
  rowHeight: 30,
  colWidth: 100,
});

let trieIndexedFlag = false;

initTrieDemo(grid);
initRTreeDemo(grid);
initDependencyGraphDemo(grid);
initBloomFilterDemo(grid, () => trieIndexedFlag);
initSuffixArrayDemo(grid, () => trieIndexedFlag);
initPatternDetectionDemo(grid);
initLRUCacheDemo();
initCommandStackDemo();
initSegmentTreeDemo();
initSkipListDemo();
initDisjointSetDemo();

const indexColumnBtn = document.getElementById('index-column-btn') as HTMLButtonElement;
indexColumnBtn.addEventListener('click', () => {
  trieIndexedFlag = true;
});

console.log('✓ Data Structures & Algorithms Demo Loaded!');
console.log('Grid instance:', grid);
console.log('All features available via grid object:');
console.log('- grid.spatialHitTester (RTree)');
console.log('- grid.filterAutocomplete (Trie)');
console.log('- grid.filterOptimizer (Bloom Filter)');
console.log('- grid.formulaCalculator (DependencyGraph)');
console.log('- grid.autofillManager (Pattern Detection)');
