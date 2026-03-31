import type { GridOptions, GridState } from '../types';
import type { EventEmitter } from '../events/event-emitter';
import type { GridEvents } from '../events/grid-events';
import type { GridStoreImpl } from '../reactive/store';
import type { GridApiImpl } from './grid-api';
import type { PluginHost } from './plugin-host';
import type { PipelineRegistry } from '../reactive/pipeline';
import type { GridOptionsManager } from './options-manager';

/**
 * GridContext used by the plugin-based Grid class.
 * Only contains plugin infrastructure and essential state.
 */
export interface SlimGridContext {
  container: HTMLElement;
  options: GridOptions;
  optionsManager: GridOptionsManager;
  state: GridState;
  events: EventEmitter<GridEvents>;
  store: GridStoreImpl;
  gridApi: GridApiImpl;
  pluginHost: PluginHost;
  pipelineRegistry: PipelineRegistry;
  isDestroyed: boolean;
}
