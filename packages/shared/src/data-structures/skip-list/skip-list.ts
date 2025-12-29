/**
 * Skip List implementation
 * Probabilistic sorted data structure
 */

import type {
  ISkipList,
  SkipListNode,
  SkipListOptions,
  RangeResult,
  SkipListStats,
} from './skip-list.interface';
import { defaultComparator } from './skip-list.interface';
import type { Comparator } from '../../types';

/**
 * Skip List - Probabilistic sorted data structure
 *
 * Implementation:
 * - Multiple levels of linked lists
 * - Each level is a subset of the level below
 * - Levels are determined probabilistically
 * - Search starts at highest level and descends
 *
 * @example
 * ```typescript
 * const skipList = new SkipList<number, string>();
 * skipList.set(10, 'ten');
 * skipList.set(5, 'five');
 * skipList.set(20, 'twenty');
 *
 * skipList.get(10); // 'ten'
 * skipList.range(5, 15); // [{key: 5, value: 'five'}, {key: 10, value: 'ten'}]
 * skipList.keys(); // [5, 10, 20]
 * ```
 */
export class SkipList<K, V> implements ISkipList<K, V> {
  private head: SkipListNode<K, V>;
  private maxLevel: number;
  private probability: number;
  private compare: Comparator<K>;
  private currentLevel: number;
  private count: number;

  constructor(options: SkipListOptions<K> = {}) {
    this.maxLevel = options.maxLevel ?? 32;
    this.probability = options.probability ?? 0.5;
    this.compare = options.comparator ?? (defaultComparator as Comparator<K>);
    this.currentLevel = 0;
    this.count = 0;

    // Create sentinel head node with minimal key
    this.head = this.createNode(null as any, null as any, this.maxLevel);
  }

  /**
   * Create a new node with random level
   */
  private createNode(key: K, value: V, level: number): SkipListNode<K, V> {
    return {
      key,
      value,
      forward: new Array(level + 1).fill(null),
    };
  }

  /**
   * Generate random level for new node
   */
  private randomLevel(): number {
    let level = 0;
    while (Math.random() < this.probability && level < this.maxLevel) {
      level++;
    }
    return level;
  }

  /**
   * Find the position where key should be or is located
   * Returns update array with predecessors at each level
   */
  private findUpdatePath(key: K): Array<SkipListNode<K, V>> {
    const update: Array<SkipListNode<K, V>> = new Array(this.maxLevel + 1);
    let current = this.head;

    // Start from highest level and go down
    for (let i = this.currentLevel; i >= 0; i--) {
      while (
        current.forward[i] !== null &&
        this.compare(current.forward[i]!.key, key) < 0
      ) {
        current = current.forward[i]!;
      }
      update[i] = current;
    }

    return update;
  }

  /**
   * Insert or update a key-value pair
   */
  set(key: K, value: V): V | undefined {
    const update = this.findUpdatePath(key);
    let current = update[0].forward[0];

    // Check if key already exists
    if (current !== null && this.compare(current.key, key) === 0) {
      const oldValue = current.value;
      current.value = value;
      return oldValue;
    }

    // Generate random level for new node
    const newLevel = this.randomLevel();

    // Update current level if necessary
    if (newLevel > this.currentLevel) {
      for (let i = this.currentLevel + 1; i <= newLevel; i++) {
        update[i] = this.head;
      }
      this.currentLevel = newLevel;
    }

    // Create new node
    const newNode = this.createNode(key, value, newLevel);

    // Insert node by updating forward pointers
    for (let i = 0; i <= newLevel; i++) {
      newNode.forward[i] = update[i].forward[i];
      update[i].forward[i] = newNode;
    }

    this.count++;
    return undefined;
  }

  /**
   * Get value by key
   */
  get(key: K): V | undefined {
    let current = this.head;

    // Start from highest level
    for (let i = this.currentLevel; i >= 0; i--) {
      while (
        current.forward[i] !== null &&
        this.compare(current.forward[i]!.key, key) < 0
      ) {
        current = current.forward[i]!;
      }
    }

    // Move to next node at level 0
    current = current.forward[0]!;

    if (current !== null && this.compare(current.key, key) === 0) {
      return current.value;
    }

    return undefined;
  }

  /**
   * Check if key exists
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a key
   */
  delete(key: K): boolean {
    const update = this.findUpdatePath(key);
    let current = update[0].forward[0];

    // Check if key exists
    if (current === null || this.compare(current.key, key) !== 0) {
      return false;
    }

    // Remove node from all levels
    for (let i = 0; i <= this.currentLevel; i++) {
      if (update[i].forward[i] !== current) {
        break;
      }
      update[i].forward[i] = current.forward[i];
    }

    // Update current level if necessary
    while (
      this.currentLevel > 0 &&
      this.head.forward[this.currentLevel] === null
    ) {
      this.currentLevel--;
    }

    this.count--;
    return true;
  }

  /**
   * Get all entries in sorted order
   */
  entries(): Array<[K, V]> {
    const result: Array<[K, V]> = [];
    let current = this.head.forward[0];

    while (current !== null) {
      result.push([current.key, current.value]);
      current = current.forward[0];
    }

    return result;
  }

  /**
   * Get all keys in sorted order
   */
  keys(): K[] {
    const result: K[] = [];
    let current = this.head.forward[0];

    while (current !== null) {
      result.push(current.key);
      current = current.forward[0];
    }

    return result;
  }

  /**
   * Get all values in sorted order by key
   */
  values(): V[] {
    const result: V[] = [];
    let current = this.head.forward[0];

    while (current !== null) {
      result.push(current.value);
      current = current.forward[0];
    }

    return result;
  }

  /**
   * Get range of entries
   */
  range(startKey: K, endKey: K): RangeResult<K, V>[] {
    const result: RangeResult<K, V>[] = [];
    let current = this.head;

    // Find starting position
    for (let i = this.currentLevel; i >= 0; i--) {
      while (
        current.forward[i] !== null &&
        this.compare(current.forward[i]!.key, startKey) < 0
      ) {
        current = current.forward[i]!;
      }
    }

    // Move to first node in range
    current = current.forward[0]!;

    // Collect all nodes in range
    while (current !== null && this.compare(current.key, endKey) <= 0) {
      result.push({ key: current.key, value: current.value });
      current = current.forward[0]!;
    }

    return result;
  }

  /**
   * Get minimum entry
   */
  min(): RangeResult<K, V> | undefined {
    const first = this.head.forward[0];
    if (first === null) {
      return undefined;
    }
    return { key: first.key, value: first.value };
  }

  /**
   * Get maximum entry
   */
  max(): RangeResult<K, V> | undefined {
    if (this.count === 0) {
      return undefined;
    }

    let current: SkipListNode<K, V> = this.head;

    // Traverse to the last node
    for (let i = this.currentLevel; i >= 0; i--) {
      while (current.forward[i] !== null) {
        current = current.forward[i]!;
      }
    }

    // If current is still head, list is empty
    if (current === this.head) {
      return undefined;
    }

    return { key: current.key, value: current.value };
  }

  /**
   * Get kth smallest entry (0-indexed)
   */
  getKth(k: number): RangeResult<K, V> | undefined {
    if (k < 0 || k >= this.count) {
      return undefined;
    }

    let current = this.head.forward[0];
    let index = 0;

    while (current !== null && index < k) {
      current = current.forward[0];
      index++;
    }

    if (current === null) {
      return undefined;
    }

    return { key: current.key, value: current.value };
  }

  /**
   * Count entries in range
   */
  countRange(startKey: K, endKey: K): number {
    return this.range(startKey, endKey).length;
  }

  /**
   * Find floor (largest key <= given key)
   */
  floor(key: K): RangeResult<K, V> | undefined {
    let current = this.head;
    let floor: SkipListNode<K, V> | null = null;

    for (let i = this.currentLevel; i >= 0; i--) {
      while (
        current.forward[i] !== null &&
        this.compare(current.forward[i]!.key, key) <= 0
      ) {
        current = current.forward[i]!;
        floor = current;
      }
    }

    if (floor === null || floor === this.head) {
      return undefined;
    }

    return { key: floor.key, value: floor.value };
  }

  /**
   * Find ceiling (smallest key >= given key)
   */
  ceiling(key: K): RangeResult<K, V> | undefined {
    let current = this.head;

    for (let i = this.currentLevel; i >= 0; i--) {
      while (
        current.forward[i] !== null &&
        this.compare(current.forward[i]!.key, key) < 0
      ) {
        current = current.forward[i]!;
      }
    }

    const ceiling = current.forward[0];

    if (ceiling === null) {
      return undefined;
    }

    return { key: ceiling.key, value: ceiling.value };
  }

  /**
   * Iterate over all entries
   */
  forEach(callback: (value: V, key: K) => void): void {
    let current = this.head.forward[0];

    while (current !== null) {
      callback(current.value, current.key);
      current = current.forward[0];
    }
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.head = this.createNode(null as any, null as any, this.maxLevel);
    this.currentLevel = 0;
    this.count = 0;
  }

  /**
   * Get statistics
   */
  getStats(): SkipListStats {
    let totalLevels = 0;
    let current = this.head.forward[0];

    while (current !== null) {
      totalLevels += current.forward.length;
      current = current.forward[0];
    }

    const avgLevel = this.count > 0 ? totalLevels / this.count : 0;

    // Estimate memory: node overhead + pointers
    const bytesPerPointer = 8;
    const bytesPerNode = 32; // key, value, metadata
    const memoryBytes =
      this.count * bytesPerNode + totalLevels * bytesPerPointer;

    return {
      size: this.count,
      level: this.currentLevel,
      maxLevel: this.maxLevel,
      averageLevel: avgLevel,
      memoryBytes,
    };
  }

  /**
   * Get size
   */
  get size(): number {
    return this.count;
  }

  /**
   * Check if empty
   */
  get isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Create skip list from entries
   */
  static from<K, V>(
    entries: Array<[K, V]>,
    options?: SkipListOptions<K>
  ): SkipList<K, V> {
    const skipList = new SkipList<K, V>(options);
    for (const [key, value] of entries) {
      skipList.set(key, value);
    }
    return skipList;
  }

  /**
   * Debug: Print structure
   */
  toString(): string {
    return `SkipList(size: ${this.size}, level: ${this.currentLevel}, maxLevel: ${this.maxLevel})`;
  }

  /**
   * Debug: Validate structure
   */
  validate(): boolean {
    // Check that all levels are properly sorted
    for (let level = 0; level <= this.currentLevel; level++) {
      let current = this.head.forward[level];
      let prev: K | null = null;

      while (current !== null) {
        if (prev !== null && this.compare(prev, current.key) >= 0) {
          return false;
        }
        prev = current.key;
        current = current.forward[level];
      }
    }

    // Check that size matches actual count
    let actualCount = 0;
    let current = this.head.forward[0];
    while (current !== null) {
      actualCount++;
      current = current.forward[0];
    }

    return actualCount === this.count;
  }
}
