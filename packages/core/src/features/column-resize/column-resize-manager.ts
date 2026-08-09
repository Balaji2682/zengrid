import type { ColumnResizeOptions, ColumnConstraints } from './column-resize-manager.interface';
import { initializeComponents } from './initialization';
import { HandleCoordinator } from './handle-coordinator';
import { WidthNotifier } from './width-notifier';
import { ProgrammaticOperations } from './programmatic-operations';
import { LifecycleManager } from './lifecycle-manager';
import type { ResizeConstraintManager } from './resize-constraint-manager';
import type { ResizeStateManager } from './resize-state-manager';

/**
 * ColumnResizeManager - Refactored with Strategy Pattern and Sub-managers
 *
 * Architecture:
 * - Delegates to specialized sub-managers
 * - Uses Strategy Pattern for resize behaviors
 * - Implements lifecycle hooks for extensibility
 * - Loosely coupled through ResizableDataSource interface
 */
export class ColumnResizeManager {
  private constraintManager: ResizeConstraintManager;
  private stateManager: ResizeStateManager;

  private handleCoordinator: HandleCoordinator;
  private widthNotifier: WidthNotifier;
  private operations: ProgrammaticOperations;
  private lifecycle: LifecycleManager;

  constructor(options: ColumnResizeOptions) {
    const components = initializeComponents(options);

    this.constraintManager = components.constraintManager;
    this.stateManager = components.stateManager;

    this.handleCoordinator = new HandleCoordinator(
      components.dataSource,
      components.stateManager,
      () => options.getHeaderHeight?.() ?? 40
    );

    this.widthNotifier = new WidthNotifier(components.dataSource, components.stateManager);

    this.operations = new ProgrammaticOperations({
      dataSource: components.dataSource,
      constraintManager: components.constraintManager,
      stateManager: components.stateManager,
      autoFitCalculator: components.autoFitCalculator,
      events: options.events,
      onWidthChange: () => this.widthNotifier.notifyWidthChange(),
      onUpdateHandles: () => this.updateHandles(),
    });

    this.lifecycle = new LifecycleManager({
      enabled: options.enabled ?? true,
      showHandles: options.showHandles ?? true,
      showPreview: options.showPreview ?? true,
      events: options.events,
      dataSource: components.dataSource,
      strategy: components.strategy,
      constraintManager: components.constraintManager,
      zoneDetector: components.zoneDetector,
      stateManager: components.stateManager,
      autoFitCalculator: components.autoFitCalculator,
      options,
      getScrollLeft: () => options.getScrollLeft?.() ?? 0,
      getViewportHeight: () => options.getViewportHeight?.() ?? 0,
      onWidthChange: () => this.widthNotifier.notifyWidthChange(),
      onUpdateHandles: () => this.updateHandles(),
    });
  }

  /**
   * Attach event listeners to container
   */
  attach(container: HTMLElement): void {
    this.lifecycle.attach(container);
  }

  /**
   * Detach event listeners from container
   */
  detach(): void {
    this.lifecycle.detach();
  }

  /**
   * Update handle positions (call after scroll or column changes)
   */
  updateHandles(): void {
    const state = this.lifecycle.getState();
    this.handleCoordinator.updateHandles(state.handleRenderer, state.container);
  }

  /**
   * Auto-fit a single column
   */
  autoFitColumn(column: number): void {
    this.operations.autoFitColumn(column);
  }

  /**
   * Auto-fit all columns
   */
  autoFitAllColumns(): void {
    this.operations.autoFitAllColumns();
  }

  /**
   * Resize a column programmatically
   */
  resizeColumn(column: number, width: number): void {
    this.operations.resizeColumn(column, width);
  }

  /**
   * Set constraints for a column
   */
  setColumnConstraints(column: number, constraints: ColumnConstraints): void {
    this.constraintManager.setConstraints(column, constraints);
  }

  /**
   * Check if resize is currently active
   */
  isResizing(): boolean {
    return this.stateManager.isActive();
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.lifecycle.destroy();
  }
}
