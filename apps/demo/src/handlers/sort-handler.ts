import type {
  ColumnDef,
  DataLoadRequest,
  DataLoadResponse,
  SortDescriptor,
} from '../../../../packages/core/src/types';
import { FilterAstCompiler } from '../../../../packages/core/src/features/filtering/filter-ast-compiler';

export interface DataRequestHandlerContext {
  columns: ColumnDef[];
  getData: () => any[][];
}

function resolveColumnIndex(descriptor: SortDescriptor, columns: ColumnDef[]): number {
  if (typeof descriptor.column === 'number') {
    return descriptor.column;
  }

  if (descriptor.field) {
    return columns.findIndex((column) => column.field === descriptor.field);
  }

  return -1;
}

function compareValues(left: any, right: any): number {
  if (left === right) {
    return 0;
  }

  if (left == null) {
    return -1;
  }

  if (right == null) {
    return 1;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right));
}

function applyBackendFilter(
  rows: any[][],
  request: DataLoadRequest,
  columns: ColumnDef[]
): any[][] {
  if (!request.query.filter?.root) {
    return rows;
  }

  const compiler = new FilterAstCompiler({
    colCount: columns.length || rows[0]?.length || 0,
    columns,
    getValue: (row, col) => rows[row]?.[col],
  });
  const compiled = compiler.compile(request.query.filter);

  if (!compiled.predicate) {
    return rows;
  }

  return rows.filter((_row, index) => compiled.predicate!(index));
}

function applyBackendSort(
  rows: any[][],
  descriptors: SortDescriptor[] | null,
  columns: ColumnDef[]
): any[][] {
  if (!descriptors?.length) {
    return rows;
  }

  const orderedDescriptors = [...descriptors].sort((left, right) => left.sortIndex - right.sortIndex);

  return [...rows].sort((leftRow, rightRow) => {
    for (const descriptor of orderedDescriptors) {
      const column = resolveColumnIndex(descriptor, columns);
      if (column < 0) {
        continue;
      }

      const result = compareValues(leftRow[column], rightRow[column]);
      if (result !== 0) {
        return descriptor.direction === 'asc' ? result : -result;
      }
    }

    return 0;
  });
}

export function createDataRequestHandler(context: DataRequestHandlerContext) {
  return async function handleDataRequest(
    request: DataLoadRequest
  ): Promise<DataLoadResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const filteredRows = applyBackendFilter(context.getData(), request, context.columns);
    const sortedRows = applyBackendSort(filteredRows, request.query.sort, context.columns);
    const offset = request.query.pagination?.offset ?? request.startRow;
    const pageSize = request.query.pagination?.pageSize ?? Math.max(0, request.endRow - request.startRow);
    const data = sortedRows.slice(offset, offset + pageSize);

    return {
      data,
      totalRows: sortedRows.length,
      startRow: offset,
      endRow: offset + data.length,
    };
  };
}
