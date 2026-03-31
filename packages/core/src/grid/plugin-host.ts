import type {
  GridStore,
  GridPlugin,
  GridApi,
  PluginDisposable,
  GridPluginSetupContext,
} from '../reactive/types';
import { recordPluginTiming } from '../reactive/debug';
import type { GridOptions } from '../types';

interface PluginEntry {
  plugin: GridPlugin;
  disposable?: PluginDisposable;
}

export class PluginHost {
  private plugins = new Map<string, PluginEntry>();
  private readonly setupContext: GridPluginSetupContext;

  constructor(
    private store: GridStore,
    private api: GridApi,
    setupContext?: GridPluginSetupContext
  ) {
    const options = setupContext?.options ?? ({} as GridOptions);
    this.setupContext = setupContext ?? {
      options,
      getOptions: () => options,
      getOptionsSnapshot: () => ({ ...options }),
      updateOptions: () => null,
      subscribeOptions: () => () => {},
    };
  }

  use(plugin: GridPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" already registered`);
    }

    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin "${plugin.name}" requires "${dep}" but it is not registered`);
        }
      }
    }

    const entry: PluginEntry = { plugin };
    this.plugins.set(plugin.name, entry);

    const start = performance.now();
    const disposable = plugin.setup(this.store, this.api, this.setupContext);
    const duration = performance.now() - start;
    recordPluginTiming(plugin.name, duration);

    if (disposable) {
      entry.disposable = disposable;
    }
  }

  destroy(): void {
    // Run plugin teardowns first (they may read store signals)
    const entries = Array.from(this.plugins.values()).sort(
      (a, b) => b.plugin.phase - a.plugin.phase
    );

    for (const entry of entries) {
      try {
        if (entry.disposable) {
          for (const fn of entry.disposable.teardown) {
            fn();
          }
        }
        entry.plugin.dispose?.();
      } catch (_e) {
        // continue destroying other plugins
      }
    }

    // Dispose store signals/effects/actions after teardowns complete
    this.store.disposeAll();

    this.plugins.clear();
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  getPluginsByPhase(): { name: string; phase: number }[] {
    return Array.from(this.plugins.values())
      .map((e) => ({ name: e.plugin.name, phase: e.plugin.phase }))
      .sort((a, b) => a.phase - b.phase);
  }
}
