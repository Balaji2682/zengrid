/**
 * Common design patterns
 * @packageDocumentation
 */

// Event Emitter Pattern
export { EventEmitter } from './event-emitter';
export type { IEventEmitter } from './event-emitter';

// Observer Pattern
export { Subject } from './observer';
export type { IObserver, ISubject } from './observer';

// State Machine Pattern
export { StateMachine } from './state-machine';
export type {
  IStateMachine,
  StateMachineOptions,
  TransitionHandler,
} from './state-machine';

// Coordinator Pattern
export { BaseCoordinator } from './coordinator';
export type { ICoordinator } from './coordinator';

// Factory Pattern
export { Factory, SingletonFactory } from './factory';
export type { IFactory } from './factory';

// Mediator Pattern
export { Mediator, MediatedComponent, EventMediator } from './mediator';
export type { IMediator } from './mediator';

// Object Pool Pattern
export { ObjectPool, KeyedObjectPool } from './object-pool';
export type {
  IObjectPool,
  ObjectPoolOptions,
  ObjectPoolStats,
} from './object-pool';

// Operation Mode Pattern
export {
  resolveOperationMode,
  OperationModeManager,
} from './operation-mode';
export type {
  OperationMode,
  ResolvedOperationMode,
  OperationModeConfig,
} from './operation-mode';
