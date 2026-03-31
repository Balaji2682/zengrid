/**
 * Data loading request/response types
 */

import type { QueryState } from './query';

/**
 * Data loading request parameters.
 */
export interface DataLoadRequest {
  /**
   * Start row index of the requested window.
   */
  startRow: number;

  /**
   * End row index of the requested window.
   */
  endRow: number;

  /**
   * Monotonic identifier for this request lifecycle.
   */
  requestId?: number;

  /**
   * Abort signal for cancellation-aware backends.
   */
  signal?: AbortSignal;

  /**
   * Canonical query envelope for filter, sort, and pagination state.
   * Auto data mode only populates pagination/range slices.
   */
  query: QueryState;
}

/**
 * Data loading response
 */
export interface DataLoadResponse {
  /**
   * Loaded data rows
   */
  data: any[][];

  /**
   * Total row count (for pagination)
   */
  totalRows: number;

  /**
   * Start row of loaded data
   */
  startRow: number;

  /**
   * End row of loaded data
   */
  endRow: number;
}

/**
 * Backend data request lifecycle state
 */
export interface DataRequestState {
  /** Resolved data mode */
  mode: 'frontend' | 'backend';

  /** Current request status */
  status: 'idle' | 'loading' | 'success' | 'empty' | 'error';

  /** Whether a backend request is currently in flight */
  isLoading: boolean;

  /** Last request error, if any */
  error: Error | null;

  /** Last request sent to the backend */
  lastRequest: DataLoadRequest | null;

  /** Last successfully loaded row window */
  lastLoadedRange: {
    startRow: number;
    endRow: number;
  } | null;

  /** Latest known total row count */
  totalRows: number;

  /** Whether retry is currently possible */
  canRetry: boolean;
}
