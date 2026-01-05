/**
 * Mediator Pattern
 *
 * Defines an object that encapsulates how a set of objects interact.
 * Promotes loose coupling by keeping objects from referring to each other explicitly.
 *
 * @example
 * ```typescript
 * class GridMediator extends Mediator {
 *   constructor(
 *     private viewport: ViewportManager,
 *     private renderer: RenderCoordinator,
 *     private sortManager: SortManager
 *   ) {
 *     super();
 *   }
 *
 *   notify(sender: any, event: string, data?: any): void {
 *     if (sender === this.viewport && event === 'scroll') {
 *       // Viewport scrolled -> update renderer
 *       this.renderer.update(data);
 *     }
 *
 *     if (sender === this.sortManager && event === 'sorted') {
 *       // Data sorted -> refresh renderer
 *       this.renderer.refresh();
 *     }
 *   }
 * }
 *
 * // Components notify mediator instead of each other
 * viewport.setMediator(mediator);
 * sortManager.setMediator(mediator);
 * ```
 */

export interface IMediator {
  /**
   * Handle notifications from components
   *
   * @param sender - The component sending the notification
   * @param event - The event name
   * @param data - Optional event data
   */
  notify(sender: any, event: string, data?: any): void;
}

/**
 * Base mediator class
 */
export abstract class Mediator implements IMediator {
  /**
   * Handle component notifications
   *
   * Subclasses should override this to implement mediation logic.
   */
  abstract notify(sender: any, event: string, data?: any): void;
}

/**
 * Component that can interact with a mediator
 */
export abstract class MediatedComponent {
  protected mediator?: IMediator;

  /**
   * Set the mediator for this component
   */
  setMediator(mediator: IMediator | undefined): void {
    this.mediator = mediator;
  }

  /**
   * Notify the mediator of an event
   */
  protected notifyMediator(event: string, data?: any): void {
    this.mediator?.notify(this, event, data);
  }
}

/**
 * Event-based mediator
 *
 * Routes events between components without them knowing about each other.
 *
 * @example
 * ```typescript
 * const mediator = new EventMediator();
 *
 * // Register handlers
 * mediator.on('scroll', (data) => {
 *   console.log('Scroll event:', data);
 * });
 *
 * // Send events
 * mediator.notify(viewport, 'scroll', { top: 100 });
 * ```
 */
export class EventMediator extends Mediator {
  private handlers = new Map<string, Set<(data?: any) => void>>();

  /**
   * Register an event handler
   *
   * @param event - Event name to listen for
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  on(event: string, handler: (data?: any) => void): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    this.handlers.get(event)!.add(handler);

    return () => this.off(event, handler);
  }

  /**
   * Unregister an event handler
   */
  off(event: string, handler: (data?: any) => void): void {
    this.handlers.get(event)?.delete(handler);
  }

  /**
   * Notify all handlers for an event
   */
  notify(sender: any, event: string, data?: any): void {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers) return;

    for (const handler of eventHandlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`EventMediator: Error in handler for "${event}":`, error);
      }
    }
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Clear handlers for a specific event
   */
  clearEvent(event: string): void {
    this.handlers.delete(event);
  }
}
