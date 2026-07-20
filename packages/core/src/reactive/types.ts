import type { Signal, ReadonlySignal } from '@preact/signals-core';
import type { GridOptions } from '../types';

export interface SignalMetadata {
  name: string;
  owner: string;
  phase: number;
  createdAt: number;
}

export interface WrappedSignal<T = unknown> {
  value: T;
  peek(): T;
  metadata: SignalMetadata;
  readonly __signal: Signal<T>;
}

export interface WrappedComputed<T = unknown> {
  readonly value: T;
  metadata: SignalMetadata;
  readonly __computed: ReadonlySignal<T>;
}

export type EffectDispose = () => void;

export interface AsyncState {
  pending: boolean;
  stale: boolean;
  error: Error | null;
  version: number;
}

export interface AsyncComputedOptions {
  debounceMs?: number;
  onError?: (error: Error) => void;
}

export interface GridOptionsChange {
  currentOptions: GridOptions;
  previousOptions: GridOptions;
  changedKeys: Array<keyof GridOptions>;
  patch: Partial<GridOptions>;
}

export type GridOptionsListener = (change: GridOptionsChange) => void;

export type ActionHandler = (...args: any[]) => void | { undo: () => void };

export interface ActionRegistration {
  handler: ActionHandler;
  owner: string;
  invalidates?: string[];
}

export interface PipelinePhase {
  name: string;
  phase: number;
  key: string;
}

export interface DebugEvent {
  traceId: number;
  timestamp: number;
  type: 'signal-write' | 'computed-run' | 'effect-run' | 'action-exec';
  name: string;
  oldValue?: unknown;
  newValue?: unknown;
  trigger?: string;
  parentAction?: string;
}

// Declaration-merged interface for store keys
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StoreKeys {
  'rows.raw': unknown[];
  'rows.indices': number[];
  'rows.viewIndices': number[];
  'rows.viewCount': number;

  // Phase 5: Scroll
  'scroll.top': number;
  'scroll.left': number;

  // Phase 5: Viewport
  'viewport.width': number;
  'viewport.height': number;
  'viewport.visibleRows': { start: number; end: number };
  'viewport.visibleCols': { start: number; end: number };

  // Phase 6: Selection
  'selection.ranges': import('../types').CellRange[];
  'selection.active': import('../types').CellRef | null;

  // Phase 6: Editing
  'editing.active': import('../types').CellRef | null;

  // Phase 6: Undo/Redo
  'undoRedo.canUndo': boolean;
  'undoRedo.canRedo': boolean;

  // Phase 8: Async pipeline metadata
  'pipeline.sort.__async': AsyncState;
  'pipeline.filter.__async': AsyncState;
}

export interface GridStore {
  extend(key: string, initial: unknown, owner: string, phase?: number): void;
  computed(key: string, fn: () => unknown, owner: string, phase?: number): void;
  effect(name: string, fn: () => void | (() => void), owner: string, phase?: number): void;
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  getUnphased(key: string): unknown;
  getRow(dataIndex: number): unknown;
  action(
    name: string,
    handler: ActionHandler,
    owner: string,
    meta?: { invalidates?: string[] }
  ): void;
  exec(name: string, ...args: unknown[]): void | { undo: () => void };
  hasAction(name: string): boolean;
  asyncComputed(
    key: string,
    fn: () => () => Promise<unknown>,
    owner: string,
    phase?: number,
    options?: AsyncComputedOptions
  ): void;
  addDisposable(owner: string, dispose: () => void): void;
  disposePlugin(owner: string): void;
  disposeAll(): void;
  debugGraph(): Record<string, string[]>;
}

export interface PluginDisposable {
  teardown: Array<() => void>;
}

export interface GridPluginSetupContext {
  options: GridOptions;
  getOptions(): GridOptions;
  getOptionsSnapshot(): GridOptions;
  updateOptions(patch: Partial<GridOptions>): GridOptionsChange | null;
  subscribeOptions(listener: GridOptionsListener): () => void;
}

export interface GridPlugin {
  name: string;
  phase: number;
  dependencies?: string[];
  setup(store: GridStore, api: GridApi, context: GridPluginSetupContext): PluginDisposable | void;
  dispose?(): void;
}

export interface GridApi {
  register(namespace: string, methods: Record<string, Function>): void;
  exec(action: string, ...args: unknown[]): void | { undo: () => void };
  fireEvent(name: string, data: unknown): void;
  getMethod(namespace: string, method: string): Function | undefined;
}
