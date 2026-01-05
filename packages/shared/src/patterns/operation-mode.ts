/**
 * Operation Mode Pattern
 *
 * Shared pattern for frontend/backend operation modes across grid features.
 * Used for data loading, sorting, filtering, and other operations that can
 * be executed either in-memory (frontend) or delegated to server (backend).
 */

/**
 * Operation mode type
 * - 'frontend': Execute operation in-memory (fast, suitable for loaded data)
 * - 'backend': Delegate operation to server (ideal for large datasets, pagination)
 * - 'auto': Automatically choose based on callback presence
 */
export type OperationMode = 'frontend' | 'backend' | 'auto';

/**
 * Resolved operation mode (auto is resolved to frontend or backend)
 */
export type ResolvedOperationMode = 'frontend' | 'backend';

/**
 * Operation mode configuration
 */
export interface OperationModeConfig<TCallback = any> {
  /**
   * Operation mode
   * @default 'frontend'
   */
  mode?: OperationMode;

  /**
   * Callback for backend operations
   * If provided with mode='auto', backend mode is used
   */
  callback?: TCallback;

  /**
   * Threshold for auto mode decision (optional)
   * E.g., if rowCount > threshold, use backend mode
   */
  autoThreshold?: number;
}

/**
 * Resolve operation mode from configuration
 *
 * @param config - Operation mode configuration
 * @param context - Optional context for auto mode decisions (e.g., rowCount)
 * @returns Resolved mode ('frontend' or 'backend')
 */
export function resolveOperationMode<TCallback = any>(
  config: OperationModeConfig<TCallback>,
  context?: { rowCount?: number }
): ResolvedOperationMode {
  const mode = config.mode ?? 'frontend';

  if (mode === 'auto') {
    // If callback provided, prefer backend
    if (config.callback) {
      return 'backend';
    }

    // If threshold provided and exceeded, use backend
    if (config.autoThreshold && context?.rowCount && context.rowCount > config.autoThreshold) {
      return 'backend';
    }

    // Default to frontend
    return 'frontend';
  }

  return mode;
}

/**
 * Operation mode manager - Base class for feature-specific managers
 */
export abstract class OperationModeManager<TCallback = any> {
  protected mode: ResolvedOperationMode;
  protected callback?: TCallback;

  constructor(config: OperationModeConfig<TCallback>, context?: { rowCount?: number }) {
    this.mode = resolveOperationMode(config, context);
    this.callback = config.callback;
  }

  /**
   * Get current operation mode
   */
  getMode(): ResolvedOperationMode {
    return this.mode;
  }

  /**
   * Check if in frontend mode
   */
  isFrontendMode(): boolean {
    return this.mode === 'frontend';
  }

  /**
   * Check if in backend mode
   */
  isBackendMode(): boolean {
    return this.mode === 'backend';
  }

  /**
   * Execute operation based on mode
   */
  protected async executeOperation<TResult>(
    frontendOperation: () => TResult | Promise<TResult>,
    backendOperation: () => TResult | Promise<TResult>
  ): Promise<TResult> {
    if (this.isFrontendMode()) {
      return await frontendOperation();
    } else {
      return await backendOperation();
    }
  }
}
