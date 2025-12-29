import type {
  ColumnStore as IColumnStore,
  ColumnStoreOptions,
  ColumnDefinition,
  ColumnType,
  AggregateOperation,
  AggregationResult,
} from './column-store.interface';

/**
 * ColumnStore implementation using typed arrays
 *
 * Column-oriented storage for dense grid data.
 * Uses typed arrays for numeric columns for better performance and memory efficiency.
 *
 * @example
 * ```typescript
 * const store = new ColumnStore({
 *   rowCount: 1000,
 *   columns: [
 *     { name: 'id', type: 'int32' },
 *     { name: 'value', type: 'float64' },
 *     { name: 'label', type: 'string' }
 *   ]
 * });
 *
 * store.setValue(0, 'id', 1);
 * store.setValue(0, 'value', 99.5);
 * store.setValue(0, 'label', 'Item 1');
 *
 * const sum = store.aggregate('value', 'sum');
 * ```
 */
export class ColumnStore implements IColumnStore {
  private data: Map<string, Int32Array | Float64Array | any[]>;
  private columnTypes: Map<string, ColumnType>;
  private rows: number;
  private autoGrow: boolean;

  constructor(options: ColumnStoreOptions = {}) {
    this.data = new Map();
    this.columnTypes = new Map();
    this.rows = options.rowCount ?? 0;
    this.autoGrow = options.autoGrow ?? false;

    // Initialize columns if provided
    if (options.columns) {
      for (const col of options.columns) {
        this.addColumn(col);
      }
    }
  }

  addColumn(definition: ColumnDefinition): void {
    if (this.data.has(definition.name)) {
      throw new Error(`Column '${definition.name}' already exists`);
    }

    const column = this.createColumn(definition.type, this.rows);

    // Fill with default value if provided
    if (definition.defaultValue !== undefined) {
      this.fillColumn(column, definition.defaultValue);
    }

    this.data.set(definition.name, column);
    this.columnTypes.set(definition.name, definition.type);
  }

  private createColumn(
    type: ColumnType,
    size: number
  ): Int32Array | Float64Array | any[] {
    switch (type) {
      case 'int32':
        return new Int32Array(size);
      case 'float64':
        return new Float64Array(size);
      case 'string':
      case 'boolean':
        return new Array(size).fill(null);
      default:
        throw new Error(`Unknown column type: ${type}`);
    }
  }

  private fillColumn(
    column: Int32Array | Float64Array | any[],
    value: any
  ): void {
    if (column instanceof Int32Array || column instanceof Float64Array) {
      column.fill(value);
    } else {
      for (let i = 0; i < column.length; i++) {
        column[i] = value;
      }
    }
  }

  removeColumn(columnName: string): boolean {
    const deleted = this.data.delete(columnName);
    if (deleted) {
      this.columnTypes.delete(columnName);
    }
    return deleted;
  }

  hasColumn(columnName: string): boolean {
    return this.data.has(columnName);
  }

  getValue(row: number, columnName: string): any {
    this.ensureRowExists(row);

    const column = this.data.get(columnName);
    if (!column) {
      return undefined;
    }

    return column[row];
  }

  setValue(row: number, columnName: string, value: any): void {
    this.ensureRowExists(row);

    const column = this.data.get(columnName);
    if (!column) {
      throw new Error(`Column '${columnName}' does not exist`);
    }

    const type = this.columnTypes.get(columnName)!;
    column[row] = this.coerceValue(value, type);
  }

  private coerceValue(value: any, type: ColumnType): any {
    // Handle null/undefined specially for all types
    if (value === null || value === undefined) {
      switch (type) {
        case 'int32':
        case 'float64':
          // Use NaN to represent null in numeric columns
          return NaN;
        case 'boolean':
        case 'string':
          return null;
        default:
          return null;
      }
    }

    switch (type) {
      case 'int32':
        return Math.floor(Number(value));
      case 'float64':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'string':
        return String(value);
      default:
        return value;
    }
  }

  getRow(row: number): Record<string, any> {
    this.ensureRowExists(row);

    const result: Record<string, any> = {};
    for (const [name, column] of this.data.entries()) {
      result[name] = column[row];
    }
    return result;
  }

  setRow(row: number, values: Record<string, any>): void {
    this.ensureRowExists(row);

    for (const [columnName, value] of Object.entries(values)) {
      if (this.hasColumn(columnName)) {
        this.setValue(row, columnName, value);
      }
    }
  }

  getColumn(columnName: string): any[] {
    const column = this.data.get(columnName);
    if (!column) {
      throw new Error(`Column '${columnName}' does not exist`);
    }

    return Array.from(column);
  }

  setColumn(columnName: string, values: any[]): void {
    if (values.length !== this.rows) {
      throw new Error(
        `Values length (${values.length}) must match row count (${this.rows})`
      );
    }

    const column = this.data.get(columnName);
    if (!column) {
      throw new Error(`Column '${columnName}' does not exist`);
    }

    const type = this.columnTypes.get(columnName)!;

    for (let i = 0; i < values.length; i++) {
      column[i] = this.coerceValue(values[i], type);
    }
  }

  aggregate(
    columnName: string,
    operation: AggregateOperation
  ): AggregationResult {
    const column = this.data.get(columnName);
    if (!column) {
      throw new Error(`Column '${columnName}' does not exist`);
    }

    const type = this.columnTypes.get(columnName)!;
    if (type !== 'int32' && type !== 'float64') {
      throw new Error(
        `Cannot aggregate non-numeric column '${columnName}' (type: ${type})`
      );
    }

    // Helper to check if value is null/undefined
    const isNull = (val: any): boolean => {
      return val === null || val === undefined || Number.isNaN(val);
    };

    let value = 0;
    let count = 0;

    switch (operation) {
      case 'sum':
        for (let i = 0; i < this.rows; i++) {
          const cellValue = column[i];
          if (!isNull(cellValue)) {
            value += cellValue;
            count++;
          }
        }
        break;

      case 'avg':
        for (let i = 0; i < this.rows; i++) {
          const cellValue = column[i];
          if (!isNull(cellValue)) {
            value += cellValue;
            count++;
          }
        }
        value = count > 0 ? value / count : 0;
        break;

      case 'min':
        value = Infinity;
        for (let i = 0; i < this.rows; i++) {
          const cellValue = column[i];
          if (!isNull(cellValue)) {
            if (cellValue < value) {
              value = cellValue;
            }
            count++;
          }
        }
        // If no non-null values found, return 0
        if (count === 0) value = 0;
        break;

      case 'max':
        value = -Infinity;
        for (let i = 0; i < this.rows; i++) {
          const cellValue = column[i];
          if (!isNull(cellValue)) {
            if (cellValue > value) {
              value = cellValue;
            }
            count++;
          }
        }
        // If no non-null values found, return 0
        if (count === 0) value = 0;
        break;

      case 'count':
        // Count only non-null values
        for (let i = 0; i < this.rows; i++) {
          if (!isNull(column[i])) {
            count++;
          }
        }
        value = count;
        break;

      default:
        throw new Error(`Unknown aggregation operation: ${operation}`);
    }

    return {
      operation,
      column: columnName,
      value,
      count,
    };
  }

  addRows(count: number): void {
    if (count <= 0) return;

    const newRowCount = this.rows + count;

    // Resize each column
    for (const [name, oldColumn] of this.data.entries()) {
      const type = this.columnTypes.get(name)!;
      const newColumn = this.createColumn(type, newRowCount);

      // Copy old data
      if (
        newColumn instanceof Int32Array &&
        oldColumn instanceof Int32Array
      ) {
        newColumn.set(oldColumn);
      } else if (
        newColumn instanceof Float64Array &&
        oldColumn instanceof Float64Array
      ) {
        newColumn.set(oldColumn);
      } else {
        for (let i = 0; i < this.rows; i++) {
          (newColumn as any[])[i] = (oldColumn as any[])[i];
        }
      }

      this.data.set(name, newColumn);
    }

    this.rows = newRowCount;
  }

  clear(): void {
    for (const column of this.data.values()) {
      if (column instanceof Int32Array || column instanceof Float64Array) {
        column.fill(0);
      } else {
        for (let i = 0; i < column.length; i++) {
          column[i] = null;
        }
      }
    }
  }

  private ensureRowExists(row: number): void {
    if (row < 0) {
      throw new RangeError(`Row index ${row} must be non-negative`);
    }

    if (row >= this.rows) {
      if (this.autoGrow) {
        this.addRows(row - this.rows + 1);
      } else {
        throw new RangeError(
          `Row index ${row} out of bounds [0, ${this.rows - 1}]`
        );
      }
    }
  }

  get rowCount(): number {
    return this.rows;
  }

  get columnCount(): number {
    return this.data.size;
  }

  get columns(): ReadonlyArray<string> {
    return Array.from(this.data.keys());
  }
}
