/**
 * HeaderManager - Renderer registry setup
 */

import { HeaderRendererRegistry } from '../../rendering/headers/header-registry';
import {
  TextHeaderRenderer,
  SortableHeaderRenderer,
  FilterableHeaderRenderer,
  CheckboxHeaderRenderer,
  IconHeaderRenderer,
} from '../../rendering/headers/renderers';

/**
 * Register default header renderers
 */
export function registerDefaultRenderers(registry: HeaderRendererRegistry): void {
  registry.setDefaultRenderer(new TextHeaderRenderer());
  registry.register('text', () => new TextHeaderRenderer());
  registry.register('sortable', () => new SortableHeaderRenderer());
  registry.register('filterable', () => new FilterableHeaderRenderer());
  registry.register('checkbox', () => new CheckboxHeaderRenderer());
  registry.register('icon', () => new IconHeaderRenderer());
}
