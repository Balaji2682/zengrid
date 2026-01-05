// Main manager
export { ColumnResizeManager } from './column-resize-manager';

// Sub-managers
export { ResizeConstraintManager } from './resize-constraint-manager';
export { ResizeZoneDetector } from './resize-zone-detector';
export { ResizeStateManager } from './resize-state-manager';

// Renderers
export { AutoFitCalculator } from './auto-fit-calculator';
export { ResizeHandleRenderer } from './resize-handle-renderer';
export { ResizePreview } from './resize-preview';

// Strategies
export {
  SingleColumnResizeStrategy,
  ProportionalResizeStrategy,
  SymmetricResizeStrategy,
} from './resize-strategies';

// Test utilities
export {
  ResizeTestHelper,
  MockResizableDataSource,
} from './resize-test-helper';

// Types
export type {
  ColumnConstraints,
  ColumnResizeOptions,
  ResizeState,
  ResizeZoneResult,
  ResizableDataSource,
  ResizeStrategy,
  BeforeResizeEvent,
  DuringResizeEvent,
  ResizeValidationResult,
} from './column-resize-manager.interface';

export type { AutoFitCalculatorOptions } from './auto-fit-calculator';
export type { ConstraintManagerOptions } from './resize-constraint-manager';
export type { ZoneDetectorOptions } from './resize-zone-detector';
export type { StateManagerOptions, ResizeHistoryEntry } from './resize-state-manager';
