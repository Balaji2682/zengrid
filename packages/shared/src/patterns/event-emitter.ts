/**
 * Type-safe event emitter pattern
 *
 * Provides a strongly-typed pub/sub system for events.
 * Supports both synchronous and asynchronous event handlers.
 *
 * @example
 * ```typescript
 * interface MyEvents {
 *   'user:login': { userId: string; timestamp: number };
 *   'user:logout': { userId: string };
 *   'data:update': { id: number; data: any };
 * }
 *
 * const emitter = new EventEmitter<MyEvents>();
 *
 * // Subscribe
 * emitter.on('user:login', (event) => {
 *   console.log(`User ${event.userId} logged in at ${event.timestamp}`);
 * });
 *
 * // Emit
 * emitter.emit('user:login', {
 *   userId: '123',
 *   timestamp: Date.now(),
 * });
 *
 * // Unsubscribe
 * emitter.off('user:login', handler);
 * ```
 */

export interface IEventEmitter<TEvents extends Record<string, any>> {
  on<K extends keyof TEvents>(event: K, handler: (data: TEvents[K]) => void): () => void;
  once<K extends keyof TEvents>(event: K, handler: (data: TEvents[K]) => void): () => void;
  off<K extends keyof TEvents>(event: K, handler: (data: TEvents[K]) => void): void;
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void;
  removeAllListeners<K extends keyof TEvents>(event?: K): void;
  listenerCount<K extends keyof TEvents>(event: K): number;
  eventNames(): Array<keyof TEvents>;
  setMaxListeners(n: number): void;
  getMaxListeners(): number;
}

export class EventEmitter<TEvents extends Record<string, any>> implements IEventEmitter<TEvents> {
  private listeners: Map<keyof TEvents, Set<Function>> = new Map();
  private onceListeners: Map<keyof TEvents, Set<Function>> = new Map();
  private maxListeners = 100;

  /**
   * Subscribe to an event
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  on<K extends keyof TEvents>(
    event: K,
    handler: (data: TEvents[K]) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const handlers = this.listeners.get(event)!;

    if (handlers.size >= this.maxListeners) {
      console.warn(
        `EventEmitter: Max listeners (${this.maxListeners}) reached for event "${String(event)}"`
      );
    }

    handlers.add(handler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event (fires only once)
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  once<K extends keyof TEvents>(
    event: K,
    handler: (data: TEvents[K]) => void
  ): () => void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }

    this.onceListeners.get(event)!.add(handler);

    // Return unsubscribe function
    return () => this.offOnce(event, handler);
  }

  /**
   * Unsubscribe from an event
   * @param event - Event name
   * @param handler - Event handler function to remove
   */
  off<K extends keyof TEvents>(
    event: K,
    handler: (data: TEvents[K]) => void
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Remove a once listener
   * @param event - Event name
   * @param handler - Event handler function to remove
   */
  private offOnce<K extends keyof TEvents>(
    event: K,
    handler: (data: TEvents[K]) => void
  ): void {
    const handlers = this.onceListeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.onceListeners.delete(event);
      }
    }
  }

  /**
   * Emit an event
   * @param event - Event name
   * @param data - Event data
   */
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    // Call regular listeners
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of Array.from(handlers)) {
        try {
          handler(data);
        } catch (error) {
          console.error(`EventEmitter: Error in handler for "${String(event)}":`, error);
        }
      }
    }

    // Call once listeners
    const onceHandlers = this.onceListeners.get(event);
    if (onceHandlers) {
      for (const handler of Array.from(onceHandlers)) {
        try {
          handler(data);
        } catch (error) {
          console.error(`EventEmitter: Error in once handler for "${String(event)}":`, error);
        }
      }
      // Clear once listeners after calling
      this.onceListeners.delete(event);
    }
  }

  /**
   * Remove all listeners for an event (or all events if no event specified)
   * @param event - Optional event name
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   * @param event - Event name
   * @returns Number of listeners
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    const regular = this.listeners.get(event)?.size ?? 0;
    const once = this.onceListeners.get(event)?.size ?? 0;
    return regular + once;
  }

  /**
   * Get all event names that have listeners
   * @returns Array of event names
   */
  eventNames(): Array<keyof TEvents> {
    const names = new Set<keyof TEvents>();
    for (const key of this.listeners.keys()) {
      names.add(key);
    }
    for (const key of this.onceListeners.keys()) {
      names.add(key);
    }
    return Array.from(names);
  }

  /**
   * Set the maximum number of listeners per event
   * @param n - Maximum number of listeners
   */
  setMaxListeners(n: number): void {
    if (n < 0 || !Number.isInteger(n)) {
      throw new RangeError('maxListeners must be a non-negative integer');
    }
    this.maxListeners = n;
  }

  /**
   * Get the maximum number of listeners per event
   * @returns Maximum number of listeners
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }
}
