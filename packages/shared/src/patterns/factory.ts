/**
 * Factory Pattern
 *
 * Provides an interface for creating objects, allowing subclasses
 * to decide which class to instantiate.
 *
 * @example
 * ```typescript
 * interface Renderer {
 *   render(value: any): string;
 * }
 *
 * const rendererFactory = new Factory<Renderer>();
 *
 * // Register factories
 * rendererFactory.register('text', () => ({
 *   render: (v) => String(v)
 * }));
 *
 * rendererFactory.register('number', () => ({
 *   render: (v) => v.toLocaleString()
 * }));
 *
 * // Create instances
 * const textRenderer = rendererFactory.create('text');
 * const numberRenderer = rendererFactory.create('number');
 * ```
 */

export interface IFactory<T, K = string> {
  /** Register a creator function for a key */
  register(key: K, creator: () => T): void;

  /** Create an instance using the registered creator */
  create(key: K): T | undefined;

  /** Check if a creator is registered */
  has(key: K): boolean;

  /** Unregister a creator */
  unregister(key: K): boolean;

  /** Get all registered keys */
  keys(): K[];
}

/**
 * Factory implementation
 *
 * @typeParam T - The type of objects to create
 * @typeParam K - The type of keys (defaults to string)
 */
export class Factory<T, K = string> implements IFactory<T, K> {
  private creators = new Map<K, () => T>();

  /**
   * Register a creator function
   *
   * @param key - Unique identifier for this creator
   * @param creator - Function that creates instances
   */
  register(key: K, creator: () => T): void {
    if (this.creators.has(key)) {
      console.warn(
        `Factory: Overwriting existing creator for key "${String(key)}"`
      );
    }
    this.creators.set(key, creator);
  }

  /**
   * Create an instance
   *
   * @param key - The key of the creator to use
   * @returns A new instance, or undefined if key not found
   */
  create(key: K): T | undefined {
    const creator = this.creators.get(key);
    if (!creator) {
      console.warn(`Factory: No creator registered for key "${String(key)}"`);
      return undefined;
    }

    try {
      return creator();
    } catch (error) {
      console.error(
        `Factory: Error creating instance for key "${String(key)}":`,
        error
      );
      return undefined;
    }
  }

  /**
   * Check if a creator is registered
   */
  has(key: K): boolean {
    return this.creators.has(key);
  }

  /**
   * Unregister a creator
   *
   * @returns true if the creator was removed, false if it didn't exist
   */
  unregister(key: K): boolean {
    return this.creators.delete(key);
  }

  /**
   * Get all registered keys
   */
  keys(): K[] {
    return Array.from(this.creators.keys());
  }

  /**
   * Clear all registered creators
   */
  clear(): void {
    this.creators.clear();
  }

  /**
   * Get the number of registered creators
   */
  get size(): number {
    return this.creators.size;
  }
}

/**
 * Singleton Factory
 *
 * Creates a single instance per key and reuses it on subsequent calls.
 *
 * @example
 * ```typescript
 * const singletonFactory = new SingletonFactory<Renderer>();
 *
 * singletonFactory.register('text', () => new TextRenderer());
 *
 * const r1 = singletonFactory.create('text');
 * const r2 = singletonFactory.create('text');
 * console.log(r1 === r2); // true - same instance
 * ```
 */
export class SingletonFactory<T, K = string> implements IFactory<T, K> {
  private creators = new Map<K, () => T>();
  private instances = new Map<K, T>();

  register(key: K, creator: () => T): void {
    if (this.creators.has(key)) {
      console.warn(
        `SingletonFactory: Overwriting existing creator for key "${String(key)}"`
      );
      // Clear cached instance when creator changes
      this.instances.delete(key);
    }
    this.creators.set(key, creator);
  }

  create(key: K): T | undefined {
    // Return cached instance if it exists
    if (this.instances.has(key)) {
      return this.instances.get(key);
    }

    const creator = this.creators.get(key);
    if (!creator) {
      console.warn(
        `SingletonFactory: No creator registered for key "${String(key)}"`
      );
      return undefined;
    }

    try {
      const instance = creator();
      this.instances.set(key, instance);
      return instance;
    } catch (error) {
      console.error(
        `SingletonFactory: Error creating instance for key "${String(key)}":`,
        error
      );
      return undefined;
    }
  }

  has(key: K): boolean {
    return this.creators.has(key);
  }

  unregister(key: K): boolean {
    this.instances.delete(key);
    return this.creators.delete(key);
  }

  keys(): K[] {
    return Array.from(this.creators.keys());
  }

  /**
   * Clear all instances but keep creators
   */
  clearInstances(): void {
    this.instances.clear();
  }

  /**
   * Clear everything
   */
  clear(): void {
    this.creators.clear();
    this.instances.clear();
  }

  get size(): number {
    return this.creators.size;
  }
}
