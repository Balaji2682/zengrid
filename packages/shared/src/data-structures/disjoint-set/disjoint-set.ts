/**
 * Disjoint Set (Union-Find) implementation for ZenGrid
 */

import type {
  IDisjointSet,
  DisjointSetOptions,
  DisjointSetStats,
} from './disjoint-set.interface';

/**
 * Default hash function for elements
 */
function defaultHashFn<T>(element: T): string | number {
  if (typeof element === 'number' || typeof element === 'string') {
    return element;
  }
  return JSON.stringify(element);
}

/**
 * Default equality function
 */
function defaultEqualityFn<T>(a: T, b: T): boolean {
  return a === b;
}

/**
 * Disjoint Set implementation with path compression and union by rank
 */
export class DisjointSet<T> implements IDisjointSet<T> {
  private parent: Map<string | number, T>;
  private rank: Map<string | number, number>;
  private setSize: Map<string | number, number>;
  private elementMap: Map<string | number, T>; // Map hash to original element
  private hashFn: (element: T) => string | number;
  private equalityFn: (a: T, b: T) => boolean;

  constructor(options: DisjointSetOptions<T> = {}) {
    this.parent = new Map();
    this.rank = new Map();
    this.setSize = new Map();
    this.elementMap = new Map(); // Track hash -> element
    this.hashFn = options.hashFn || defaultHashFn;
    this.equalityFn = options.equalityFn || defaultEqualityFn;

    // Initialize with initial elements if provided
    if (options.initialElements) {
      for (const element of options.initialElements) {
        this.makeSet(element);
      }
    }
  }

  /**
   * Create a new set containing only the given element
   */
  makeSet(element: T): void {
    const hash = this.hashFn(element);
    if (this.parent.has(hash)) {
      return; // Element already exists
    }

    this.elementMap.set(hash, element); // Store original element
    this.parent.set(hash, element);
    this.rank.set(hash, 0);
    this.setSize.set(hash, 1);
  }

  /**
   * Find the representative (root) of the set containing the element
   * Uses path compression to optimize future queries
   */
  find(element: T): T | undefined {
    const hash = this.hashFn(element);
    if (!this.parent.has(hash)) {
      return undefined;
    }

    return this._findWithCompression(hash);
  }

  /**
   * Internal find with path compression
   */
  private _findWithCompression(hash: string | number): T {
    const element = this.parent.get(hash)!;
    const parentHash = this.hashFn(element);

    // If element is its own parent, it's the root
    if (this.equalityFn(element, this.parent.get(parentHash)!)) {
      return element;
    }

    // Path compression: make the element point directly to the root
    const root = this._findWithCompression(parentHash);
    this.parent.set(hash, root);
    return root;
  }

  /**
   * Unite the sets containing two elements
   * Uses union by rank to keep trees shallow
   */
  union(element1: T, element2: T): boolean {
    const root1 = this.find(element1);
    const root2 = this.find(element2);

    // Check if elements exist
    if (root1 === undefined || root2 === undefined) {
      return false;
    }

    // Already in the same set
    if (this.equalityFn(root1, root2)) {
      return false;
    }

    const hash1 = this.hashFn(root1);
    const hash2 = this.hashFn(root2);
    const rank1 = this.rank.get(hash1)!;
    const rank2 = this.rank.get(hash2)!;
    const size1 = this.setSize.get(hash1)!;
    const size2 = this.setSize.get(hash2)!;

    // Union by rank: attach smaller rank tree under root of higher rank tree
    if (rank1 < rank2) {
      this.parent.set(hash1, root2);
      this.setSize.set(hash2, size1 + size2);
      this.setSize.delete(hash1);
    } else if (rank1 > rank2) {
      this.parent.set(hash2, root1);
      this.setSize.set(hash1, size1 + size2);
      this.setSize.delete(hash2);
    } else {
      // Same rank: arbitrarily choose root1 as parent and increment its rank
      this.parent.set(hash2, root1);
      this.rank.set(hash1, rank1 + 1);
      this.setSize.set(hash1, size1 + size2);
      this.setSize.delete(hash2);
    }

    return true;
  }

  /**
   * Check if two elements are in the same set
   */
  connected(element1: T, element2: T): boolean {
    const root1 = this.find(element1);
    const root2 = this.find(element2);

    if (root1 === undefined || root2 === undefined) {
      return false;
    }

    return this.equalityFn(root1, root2);
  }

  /**
   * Get the size of the set containing the element
   */
  getSetSize(element: T): number {
    const root = this.find(element);
    if (root === undefined) {
      return 0;
    }

    const rootHash = this.hashFn(root);
    return this.setSize.get(rootHash) || 0;
  }

  /**
   * Get all disjoint sets
   */
  getSets(): Map<T, T[]> {
    const sets = new Map<T, T[]>();

    // Group elements by their root
    for (const [_hash, element] of this.elementMap) {
      const root = this.find(element)!;
      if (!sets.has(root)) {
        sets.set(root, []);
      }
      sets.get(root)!.push(element);
    }

    return sets;
  }

  /**
   * Get all elements in the same set as the given element
   */
  getSet(element: T): T[] {
    const root = this.find(element);
    if (root === undefined) {
      return [];
    }

    const result: T[] = [];
    for (const [_hash, el] of this.elementMap) {
      if (this.equalityFn(this.find(el)!, root)) {
        result.push(el);
      }
    }

    return result;
  }

  /**
   * Check if an element exists in the data structure
   */
  has(element: T): boolean {
    const hash = this.hashFn(element);
    return this.parent.has(hash);
  }

  /**
   * Remove an element from the data structure
   * Note: This is not a standard operation and has O(n) complexity
   */
  remove(element: T): boolean {
    const hash = this.hashFn(element);
    if (!this.elementMap.has(hash)) {
      return false;
    }

    const root = this.find(element)!;
    const rootHash = this.hashFn(root);

    // If removing the root, we need to restructure the set
    if (this.equalityFn(element, root)) {
      // Get all elements in this set except the root
      const setElements = this.getSet(element).filter(
        (el) => !this.equalityFn(el, element)
      );

      // Remove ALL elements in this set from the maps first
      const allElements = this.getSet(element);
      for (const el of allElements) {
        const elHash = this.hashFn(el);
        this.elementMap.delete(elHash);
        this.parent.delete(elHash);
        this.rank.delete(elHash);
      }
      this.setSize.delete(rootHash);

      // Recreate the set with remaining elements (excluding the removed root)
      if (setElements.length > 0) {
        this.makeSet(setElements[0]);
        for (let i = 1; i < setElements.length; i++) {
          this.makeSet(setElements[i]);
          this.union(setElements[0], setElements[i]);
        }
      }
    } else {
      // Not a root, just remove it
      this.elementMap.delete(hash);
      this.parent.delete(hash);
      this.rank.delete(hash);

      // Update set size
      const currentSize = this.setSize.get(rootHash);
      if (currentSize && currentSize > 0) {
        this.setSize.set(rootHash, currentSize - 1);
      }
    }

    return true;
  }

  /**
   * Clear all sets
   */
  clear(): void {
    this.elementMap.clear();
    this.parent.clear();
    this.rank.clear();
    this.setSize.clear();
  }

  /**
   * Get all elements
   */
  elements(): T[] {
    return Array.from(this.elementMap.values());
  }

  /**
   * Get statistics about the disjoint set
   */
  getStats(): DisjointSetStats {
    const sets = this.getSets();
    const setSizes = Array.from(sets.values()).map((s) => s.length);

    return {
      totalElements: this.parent.size,
      numSets: sets.size,
      largestSetSize: setSizes.length > 0 ? Math.max(...setSizes) : 0,
      averageSetSize:
        setSizes.length > 0
          ? setSizes.reduce((a, b) => a + b, 0) / setSizes.length
          : 0,
      memoryBytes: this.parent.size * 32 * 3, // Approximate
    };
  }

  /**
   * Number of elements in the data structure
   */
  get size(): number {
    return this.elementMap.size;
  }

  /**
   * Number of disjoint sets
   */
  get numSets(): number {
    return this.setSize.size;
  }

  /**
   * Whether the data structure is empty
   */
  get isEmpty(): boolean {
    return this.parent.size === 0;
  }
}
