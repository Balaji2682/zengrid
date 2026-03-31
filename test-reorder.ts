import { ColumnModel } from './packages/core/src/features/columns/column-model';
import { ColumnReorderPlugin } from './packages/core/src/features/columns/plugins/column-reorder';

const columns = [
  { field: 'A', header: 'A' },
  { field: 'B', header: 'B' },
  { field: 'C', header: 'C' },
];

const model = new ColumnModel(columns);
const reorder = new ColumnReorderPlugin(model);

console.log('Before:', model.getColumns().sort((a, b) => a.order - b.order).map(c => c.field + '=' + c.order));

reorder.move('col-0', 2);

console.log('After:', model.getColumns().sort((a, b) => a.order - b.order).map(c => c.field + '=' + c.order));
