/**
 * Coordinator Pattern
 *
 * Base class for coordinators that manage lifecycle and integration
 * of components within a larger system.
 *
 * @example
 * ```typescript
 * class SortCoordinator extends BaseCoordinator {
 *   constructor(
 *     private grid: Grid,
 *     private sortManager: SortManager
 *   ) {
 *     super();
 *   }
 *
 *   protected onInitialize(): void {
 *     // Setup event listeners
 *     this.sortManager.on('sort:change', this.handleSortChange);
 *   }
 *
 *   protected onCleanup(): void {
 *     // Remove event listeners
 *     this.sortManager.off('sort:change', this.handleSortChange);
 *   }
 *
 *   private handleSortChange = () => {
 *     this.grid.refresh();
 *   };
 * }
 *
 * const coordinator = new SortCoordinator(grid, sortManager);
 * coordinator.initialize(); // Setup
 * // ... use ...
 * coordinator.cleanup(); // Teardown
 * ```
 */

export interface ICoordinator {
  /** Initialize the coordinator */
  initialize(): void;

  /** Cleanup and tear down the coordinator */
  cleanup(): void;

  /** Check if the coordinator is initialized */
  readonly isInitialized: boolean;
}

/**
 * Base coordinator implementation
 *
 * Provides lifecycle management with initialization and cleanup hooks.
 */
export abstract class BaseCoordinator implements ICoordinator {
  private _initialized = false;

  /**
   * Initialize the coordinator
   *
   * This can be called multiple times safely - it will only
   * initialize once until cleanup() is called.
   */
  initialize(): void {
    if (this._initialized) {
      console.warn(
        `${this.constructor.name}: Already initialized, skipping`
      );
      return;
    }

    try {
      this.onInitialize();
      this._initialized = true;
    } catch (error) {
      console.error(
        `${this.constructor.name}: Initialization failed:`,
        error
      );
      throw error;
    }
  }

  /**
   * Cleanup the coordinator
   *
   * This can be called multiple times safely - cleanup will only
   * occur if the coordinator is initialized.
   */
  cleanup(): void {
    if (!this._initialized) {
      return;
    }

    try {
      this.onCleanup();
      this._initialized = false;
    } catch (error) {
      console.error(
        `${this.constructor.name}: Cleanup failed:`,
        error
      );
      throw error;
    }
  }

  /**
   * Check if the coordinator is initialized
   */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Hook called during initialization
   *
   * Subclasses should override this to perform their setup.
   */
  protected abstract onInitialize(): void;

  /**
   * Hook called during cleanup
   *
   * Subclasses should override this to perform their teardown.
   */
  protected abstract onCleanup(): void;

  /**
   * Assert that the coordinator is initialized
   *
   * Throws an error if not initialized.
   */
  protected assertInitialized(): void {
    if (!this._initialized) {
      throw new Error(
        `${this.constructor.name}: Not initialized. Call initialize() first.`
      );
    }
  }
}
