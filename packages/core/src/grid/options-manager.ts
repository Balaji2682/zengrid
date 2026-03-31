import type {
  GridOptionsChange,
  GridOptionsListener,
  GridPluginSetupContext,
} from '../reactive/types';
import type { GridOptions } from '../types';

export class GridOptionsManager {
  private readonly listeners = new Set<GridOptionsListener>();

  constructor(private readonly options: GridOptions) {}

  getOptions(): GridOptions {
    return this.options;
  }

  getOptionsSnapshot(): GridOptions {
    return { ...this.options };
  }

  update(patch: Partial<GridOptions>): GridOptionsChange | null {
    const changedKeys = Object.keys(patch).filter((key) => {
      const optionKey = key as keyof GridOptions;
      return !Object.is(this.options[optionKey], patch[optionKey]);
    }) as Array<keyof GridOptions>;

    if (changedKeys.length === 0) {
      return null;
    }

    const previousOptions = this.getOptionsSnapshot();
    const changedPatch = {} as Partial<GridOptions>;
    const mutableOptions = this.options as unknown as Record<string, unknown>;
    const mutablePatch = changedPatch as Record<string, unknown>;

    for (const key of changedKeys) {
      const value = patch[key];
      mutableOptions[key as string] = value;
      mutablePatch[key as string] = value;
    }

    const change: GridOptionsChange = {
      currentOptions: this.options,
      previousOptions,
      changedKeys,
      patch: changedPatch,
    };

    for (const listener of this.listeners) {
      listener(change);
    }

    return change;
  }

  subscribe(listener: GridOptionsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  createPluginSetupContext(): GridPluginSetupContext {
    return {
      options: this.options,
      getOptions: () => this.getOptions(),
      getOptionsSnapshot: () => this.getOptionsSnapshot(),
      updateOptions: (patch) => this.update(patch),
      subscribeOptions: (listener) => this.subscribe(listener),
    };
  }

  destroy(): void {
    this.listeners.clear();
  }
}
