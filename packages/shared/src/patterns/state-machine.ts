/**
 * State Machine Pattern
 *
 * Manages state transitions in a predictable way, ensuring
 * only valid state transitions occur.
 *
 * @example
 * ```typescript
 * type GridState = 'idle' | 'loading' | 'scrolling' | 'editing';
 * type GridEvent = 'load' | 'scroll' | 'edit' | 'done';
 *
 * const machine = new StateMachine<GridState, GridEvent>('idle');
 *
 * // Define valid transitions
 * machine.addTransition('idle', 'load', 'loading');
 * machine.addTransition('loading', 'done', 'idle');
 * machine.addTransition('idle', 'scroll', 'scrolling');
 * machine.addTransition('scrolling', 'done', 'idle');
 * machine.addTransition('idle', 'edit', 'editing');
 * machine.addTransition('editing', 'done', 'idle');
 *
 * // Listen to state changes
 * machine.onTransition((from, event, to) => {
 *   console.log(`${from} --[${event}]--> ${to}`);
 * });
 *
 * // Trigger transitions
 * machine.transition('load');    // idle -> loading
 * machine.transition('done');    // loading -> idle
 * machine.transition('invalid'); // Error: no valid transition
 * ```
 */

export interface StateMachineOptions {
  /** Enable strict mode (throw errors on invalid transitions) */
  strict?: boolean;
}

export interface TransitionHandler<S, E> {
  (from: S, event: E, to: S): void;
}

export interface IStateMachine<S, E> {
  /** Get the current state */
  readonly state: S;

  /** Attempt a state transition */
  transition(event: E): boolean;

  /** Check if a state is the current state */
  is(state: S): boolean;

  /** Check if a transition is valid from the current state */
  can(event: E): boolean;

  /** Add a valid transition */
  addTransition(from: S, event: E, to: S): void;

  /** Remove a transition */
  removeTransition(from: S, event: E): void;

  /** Register a transition handler */
  onTransition(handler: TransitionHandler<S, E>): () => void;

  /** Reset to initial state */
  reset(): void;
}

/**
 * State machine implementation
 *
 * @typeParam S - State type (string literal union recommended)
 * @typeParam E - Event type (string literal union recommended)
 */
export class StateMachine<S extends string = string, E extends string = string>
  implements IStateMachine<S, E> {
  private currentState: S;
  private readonly initialState: S;
  private transitions = new Map<S, Map<E, S>>();
  private handlers: Set<TransitionHandler<S, E>> = new Set();
  private readonly strict: boolean;

  constructor(initialState: S, options: StateMachineOptions = {}) {
    this.currentState = initialState;
    this.initialState = initialState;
    this.strict = options.strict ?? false;
  }

  /**
   * Get the current state
   */
  get state(): S {
    return this.currentState;
  }

  /**
   * Add a valid transition
   *
   * @param from - The state to transition from
   * @param event - The event that triggers the transition
   * @param to - The state to transition to
   */
  addTransition(from: S, event: E, to: S): void {
    if (!this.transitions.has(from)) {
      this.transitions.set(from, new Map());
    }
    this.transitions.get(from)!.set(event, to);
  }

  /**
   * Remove a transition
   */
  removeTransition(from: S, event: E): void {
    this.transitions.get(from)?.delete(event);
  }

  /**
   * Attempt a state transition
   *
   * @param event - The event to trigger
   * @returns true if the transition was successful, false otherwise
   */
  transition(event: E): boolean {
    const nextState = this.transitions.get(this.currentState)?.get(event);

    if (!nextState) {
      const message = `Invalid transition: ${this.currentState} --[${event}]--> ?`;
      if (this.strict) {
        throw new Error(message);
      }
      console.warn(`StateMachine: ${message}`);
      return false;
    }

    const previousState = this.currentState;
    this.currentState = nextState;

    // Notify handlers
    for (const handler of this.handlers) {
      try {
        handler(previousState, event, nextState);
      } catch (error) {
        console.error('StateMachine: Error in transition handler:', error);
      }
    }

    return true;
  }

  /**
   * Check if the current state matches
   */
  is(state: S): boolean {
    return this.currentState === state;
  }

  /**
   * Check if a transition is valid from the current state
   */
  can(event: E): boolean {
    return this.transitions.get(this.currentState)?.has(event) ?? false;
  }

  /**
   * Register a transition handler
   *
   * @param handler - Function called on each transition
   * @returns Unsubscribe function
   */
  onTransition(handler: TransitionHandler<S, E>): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.currentState = this.initialState;
  }

  /**
   * Get all possible transitions from the current state
   */
  getAvailableTransitions(): E[] {
    const transitions = this.transitions.get(this.currentState);
    return transitions ? Array.from(transitions.keys()) : [];
  }

  /**
   * Get a visual representation of the state machine
   */
  toGraphviz(): string {
    const lines: string[] = ['digraph StateMachine {'];

    for (const [from, events] of this.transitions) {
      for (const [event, to] of events) {
        lines.push(`  "${from}" -> "${to}" [label="${event}"];`);
      }
    }

    lines.push('}');
    return lines.join('\n');
  }
}
