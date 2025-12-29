import type { IndexMap } from './index-map.interface';

/**
 * Default implementation of IndexMap
 *
 * Stores an array of data indices in visual order.
 * For example, [5, 2, 8] means:
 * - Visual row 0 → Data row 5
 * - Visual row 1 → Data row 2
 * - Visual row 2 → Data row 8
 */
class DefaultIndexMap implements IndexMap {
  private _indices: ReadonlyArray<number>;
  private reverseMap: Map<number, number> | null = null;

  constructor(indices: ReadonlyArray<number>) {
    this._indices = indices;
  }

  toDataIndex(visualIndex: number): number {
    if (visualIndex < 0 || visualIndex >= this._indices.length) {
      return -1;
    }
    return this._indices[visualIndex];
  }

  toVisualIndex(dataIndex: number): number {
    // Build reverse map lazily (only when needed)
    if (!this.reverseMap) {
      this.reverseMap = new Map();
      for (let visualIndex = 0; visualIndex < this._indices.length; visualIndex++) {
        this.reverseMap.set(this._indices[visualIndex], visualIndex);
      }
    }

    return this.reverseMap.get(dataIndex) ?? -1;
  }

  get length(): number {
    return this._indices.length;
  }

  get indices(): ReadonlyArray<number> {
    return this._indices;
  }

  *[Symbol.iterator](): IterableIterator<[number, number]> {
    for (let visualIndex = 0; visualIndex < this._indices.length; visualIndex++) {
      yield [visualIndex, this._indices[visualIndex]];
    }
  }
}

/**
 * Identity IndexMap that maps each visual index to itself
 *
 * Used when no filtering or sorting is applied.
 * Optimized to avoid allocating large arrays.
 */
class IdentityIndexMap implements IndexMap {
  private _length: number;

  constructor(rowCount: number) {
    this._length = rowCount;
  }

  toDataIndex(visualIndex: number): number {
    if (visualIndex < 0 || visualIndex >= this._length) {
      return -1;
    }
    return visualIndex;
  }

  toVisualIndex(dataIndex: number): number {
    if (dataIndex < 0 || dataIndex >= this._length) {
      return -1;
    }
    return dataIndex;
  }

  get length(): number {
    return this._length;
  }

  get indices(): ReadonlyArray<number> {
    // Lazily create array only when needed
    return Array.from({ length: this._length }, (_, i) => i);
  }

  *[Symbol.iterator](): IterableIterator<[number, number]> {
    for (let i = 0; i < this._length; i++) {
      yield [i, i];
    }
  }
}

/**
 * Create an IndexMap from an array of data indices
 *
 * @param indices - Array of data indices in visual order
 * @returns IndexMap instance
 *
 * @example
 * ```typescript
 * // After sorting by column values
 * const indexMap = createIndexMap([3, 1, 4, 0, 2]);
 * indexMap.toDataIndex(0); // 3 (visual row 0 is data row 3)
 * ```
 */
export function createIndexMap(indices: number[]): IndexMap {
  return new DefaultIndexMap(indices);
}

/**
 * Create an identity IndexMap where visual index equals data index
 *
 * @param rowCount - Total number of rows
 * @returns Identity IndexMap
 *
 * @example
 * ```typescript
 * const indexMap = createIdentityIndexMap(100);
 * indexMap.toDataIndex(5); // 5
 * indexMap.toDataIndex(99); // 99
 * ```
 */
export function createIdentityIndexMap(rowCount: number): IndexMap {
  if (rowCount < 0) {
    throw new RangeError(`Row count must be non-negative, got ${rowCount}`);
  }
  return new IdentityIndexMap(rowCount);
}
