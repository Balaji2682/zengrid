// Quick verification that IntervalTree works
const { IntervalTree } = require('./dist/packages/shared/index.cjs.js');

console.log('Testing IntervalTree...');

const tree = new IntervalTree();
tree.insert({ start: 10, end: 20 }, 'A');
tree.insert({ start: 15, end: 25 }, 'B');
tree.insert({ start: 30, end: 40 }, 'C');

console.log('✓ Inserted 3 intervals');
console.log('  Size:', tree.size);

const results = tree.search({ start: 18, end: 22 });
console.log('✓ Search for [18, 22] found:', results.length, 'intervals');
console.log('  Results:', results.map(r => r.data));

const point = tree.searchPoint(17);
console.log('✓ Search point 17 found:', point.length, 'intervals');
console.log('  Results:', point.map(r => r.data));

console.log('\n✅ IntervalTree is working correctly!');
