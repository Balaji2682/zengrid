import type {
  WrappedSignal,
  WrappedComputed,
  ActionHandler,
  ActionRegistration,
  EffectDispose,
  AsyncComputedOptions,
  GridStore as IGridStore,
} from './types';
import { createSignal, createComputed } from './signal';
import { createEffect } from './effect-scheduler';
import { createAsyncComputed } from './async-computed';
import {
  signalRegistry,
  computedRegistry,
  checkPhase,
  getOrCreatePlaceholder,
  activatePhantom,
  hasPlaceholder,
  registerOwnership,
  getOwnedNames,
  removeOwnership,
  resetTracking,
} from './tracking';
import {
  recordActionExec,
  debugGraph as debugGraphFn,
  setCurrentParentAction,
  getCurrentParentAction,
  IS_DEV,
} from './debug';

export class GridStoreImpl implements IGridStore {
  private signals = new Map<string, WrappedSignal>();
  private computeds = new Map<string, WrappedComputed>();
  private effects = new Map<string, EffectDispose>();
  private actions = new Map<string, ActionRegistration>();
  private disposables = new Map<string, Array<() => void>>();
  private asyncComputeds = new Map<string, { dispose: () => void; owner: string }>();
  private executingActions = new Set<string>();

  extend(key: string, initial: unknown, owner: string, phase = 0): void {
    if (this.signals.has(key) || this.computeds.has(key)) {
      throw new Error(`Store key "${key}" already exists`);
    }

    const wrapped = createSignal(key, initial, owner, phase);
    this.signals.set(key, wrapped);

    // Activate phantom deps — any computed that previously read this
    // key got a placeholder; write the real value to trigger recompute.
    activatePhantom(key, initial);
  }

  computed(key: string, fn: () => unknown, owner: string, phase = 0): void {
    if (this.signals.has(key) || this.computeds.has(key)) {
      throw new Error(`Store key "${key}" already exists`);
    }

    const wrapped = createComputed(key, fn, owner, phase);
    this.computeds.set(key, wrapped);

    // If something read this key before it existed, it subscribed to a phantom
    // placeholder. Activate it so those dependents re-run and re-subscribe to
    // the real computed — otherwise effects that read a computed key early
    // (e.g. the rendering sync effect reading rows.viewIndices before
    // setupCoreComputeds) stay bound to a dead placeholder and never fire.
    if (hasPlaceholder(key)) {
      activatePhantom(key, wrapped.value);
    }
  }

  effect(name: string, fn: () => void | (() => void), owner: string, phase = 0): void {
    if (this.effects.has(name)) {
      throw new Error(`Effect "${name}" already registered`);
    }

    const dispose = createEffect(name, fn, owner, phase);
    this.effects.set(name, dispose);
    registerOwnership(owner, name);
  }

  asyncComputed(
    key: string,
    fn: () => () => Promise<unknown>,
    owner: string,
    phase = 0,
    options?: AsyncComputedOptions
  ): void {
    if (this.signals.has(key) || this.computeds.has(key)) {
      throw new Error(`Store key "${key}" already exists`);
    }

    const { valueSignal, metaSignal, dispose } = createAsyncComputed(
      key,
      fn,
      owner,
      phase,
      options
    );

    this.signals.set(key, valueSignal);
    this.signals.set(`${key}.__async`, metaSignal);
    this.asyncComputeds.set(key, { dispose, owner });
  }

  get(key: string): unknown {
    // Check signals first
    const sig = this.signals.get(key);
    if (sig) {
      checkPhase(sig.metadata.phase);
      return sig.value;
    }

    // Check computeds
    const comp = this.computeds.get(key);
    if (comp) {
      checkPhase(comp.metadata.phase);
      return comp.value;
    }

    // Phantom dep: key doesn't exist yet.
    // Return placeholder's value (undefined), which establishes
    // a preact dependency that will fire when extend() is called.
    const placeholder = getOrCreatePlaceholder(key);
    return placeholder.value;
  }

  set(key: string, value: unknown): void {
    const sig = this.signals.get(key);
    if (!sig) {
      throw new Error(`Store key "${key}" does not exist. Use extend() to create it first.`);
    }
    sig.value = value;
  }

  getUnphased(key: string): unknown {
    const sig = this.signals.get(key);
    if (sig) return sig.value;

    const comp = this.computeds.get(key);
    if (comp) return comp.value;

    const placeholder = getOrCreatePlaceholder(key);
    return placeholder.value;
  }

  getRow(dataIndex: number): unknown {
    const rows = this.get('rows.raw') as unknown[];
    return rows?.[dataIndex];
  }

  action(name: string, handler: ActionHandler, owner: string, meta?: { invalidates?: string[] }): void {
    if (this.actions.has(name)) {
      throw new Error(`Action "${name}" already registered`);
    }
    this.actions.set(name, { handler, owner, invalidates: meta?.invalidates });
    registerOwnership(owner, name);
  }

  hasAction(name: string): boolean {
    return this.actions.has(name);
  }

  exec(name: string, ...args: unknown[]): void | { undo: () => void } {
    const reg = this.actions.get(name);
    if (!reg) {
      throw new Error(`Action "${name}" not found`);
    }

    if (this.executingActions.has(name)) {
      throw new Error(`Re-entrant action "${name}" — already executing`);
    }

    // Track parent-child action chain for dev-mode tracing
    const previousParent = getCurrentParentAction();
    // The parent is whichever action is currently executing (if any)
    const executing = Array.from(this.executingActions);
    const parentAction = executing.length > 0
      ? executing[executing.length - 1]
      : undefined;
    setCurrentParentAction(parentAction);

    this.executingActions.add(name);
    try {
      recordActionExec(name, args);

      // Dev-mode: warn if this action was invalidated by a parent
      if (IS_DEV && reg.invalidates) {
        for (const invalidated of reg.invalidates) {
          if (IS_DEV) {
            console.debug(`[store] Action "${name}" invalidates "${invalidated}"`);
          }
        }
      }

      return reg.handler(...args);
    } finally {
      this.executingActions.delete(name);
      setCurrentParentAction(previousParent);
    }
  }

  addDisposable(owner: string, dispose: () => void): void {
    let list = this.disposables.get(owner);
    if (!list) {
      list = [];
      this.disposables.set(owner, list);
    }
    list.push(dispose);
  }

  disposePlugin(owner: string): void {
    // Dispose async computeds owned by this plugin
    for (const [key, entry] of this.asyncComputeds) {
      if (entry.owner === owner) {
        entry.dispose();
        this.asyncComputeds.delete(key);
      }
    }

    // Dispose effects owned by this plugin
    const owned = getOwnedNames(owner);
    for (const name of owned) {
      const effectDispose = this.effects.get(name);
      if (effectDispose) {
        effectDispose();
        this.effects.delete(name);
      }
      this.signals.delete(name);
      this.computeds.delete(name);
      signalRegistry.delete(name);
      computedRegistry.delete(name);
      this.actions.delete(name);
    }

    // Dispose arbitrary disposables
    const list = this.disposables.get(owner);
    if (list) {
      for (const dispose of list) {
        dispose();
      }
      this.disposables.delete(owner);
    }

    removeOwnership(owner);
  }

  disposeAll(): void {
    // Dispose all async computeds
    for (const entry of this.asyncComputeds.values()) {
      entry.dispose();
    }
    this.asyncComputeds.clear();

    // Dispose all effects
    for (const dispose of this.effects.values()) {
      dispose();
    }
    this.effects.clear();

    // Dispose all disposables
    for (const list of this.disposables.values()) {
      for (const dispose of list) {
        dispose();
      }
    }
    this.disposables.clear();

    this.signals.clear();
    this.computeds.clear();
    this.actions.clear();
    this.executingActions.clear();

    resetTracking();
  }

  debugGraph(): Record<string, string[]> {
    return debugGraphFn();
  }
}
