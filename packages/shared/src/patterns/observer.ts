/**
 * Observer Pattern
 *
 * Defines a one-to-many dependency between objects so that when one object changes state,
 * all its dependents are notified and updated automatically.
 *
 * @example
 * ```typescript
 * interface DataUpdate {
 *   type: 'add' | 'update' | 'delete';
 *   data: any;
 * }
 *
 * // Create a subject
 * class DataModel extends Subject<DataUpdate> {
 *   updateData(data: any): void {
 *     // Update internal state
 *     // Notify observers
 *     this.notify({ type: 'update', data });
 *   }
 * }
 *
 * // Create an observer
 * class DataView implements IObserver<DataUpdate> {
 *   update(data: DataUpdate): void {
 *     console.log('Data changed:', data);
 *     // Update UI
 *   }
 * }
 *
 * // Use it
 * const model = new DataModel();
 * const view = new DataView();
 *
 * model.attach(view);
 * model.updateData({ id: 1, name: 'Test' }); // view.update() is called
 * ```
 */

export interface IObserver<T> {
  /**
   * Called when the subject's state changes
   * @param data - The data from the subject
   */
  update(data: T): void;
}

export interface ISubject<T> {
  /**
   * Attach an observer to this subject
   * @param observer - The observer to attach
   */
  attach(observer: IObserver<T>): void;

  /**
   * Detach an observer from this subject
   * @param observer - The observer to detach
   */
  detach(observer: IObserver<T>): void;

  /**
   * Notify all attached observers
   * @param data - The data to send to observers
   */
  notify(data: T): void;
}

/**
 * Base implementation of the Subject interface
 */
export class Subject<T> implements ISubject<T> {
  private observers = new Set<IObserver<T>>();

  /**
   * Attach an observer to this subject
   */
  attach(observer: IObserver<T>): void {
    this.observers.add(observer);
  }

  /**
   * Detach an observer from this subject
   */
  detach(observer: IObserver<T>): void {
    this.observers.delete(observer);
  }

  /**
   * Notify all attached observers
   */
  notify(data: T): void {
    for (const observer of this.observers) {
      try {
        observer.update(data);
      } catch (error) {
        console.error('Observer update error:', error);
      }
    }
  }

  /**
   * Get the number of attached observers
   */
  protected getObserverCount(): number {
    return this.observers.size;
  }

  /**
   * Clear all observers
   */
  protected clearObservers(): void {
    this.observers.clear();
  }
}
