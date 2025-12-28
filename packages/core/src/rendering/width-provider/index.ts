/**
 * WidthProvider - Strategy pattern for column width calculation
 */

export type { WidthProvider, WidthProviderOptions } from './width-provider.interface';
export { UniformWidthProvider } from './uniform-width-provider';
export { VariableWidthProvider } from './variable-width-provider';
