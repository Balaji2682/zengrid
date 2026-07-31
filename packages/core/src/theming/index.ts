/**
 * ZenGrid Theming System - Public API
 */

// Types
export type {
  ZenGridTheme,
  PartialTheme,
  ThemeColors,
  ThemeTypography,
  ThemeSpacing,
  ThemeBorders,
  ThemeShadows,
  ThemeTransitions,
} from './theme.interface';

// Theme Manager
export { applyTheme, removeTheme, themeToCSSVariables } from './theme-manager';
export type { ApplyThemeOptions } from './theme-manager';

// Theme Registry
export {
  registerTheme,
  getTheme,
  hasTheme,
  listThemes,
  getAllThemes,
  unregisterTheme,
} from './theme-registry';

// Theme Builder
export { ThemeBuilder, createTheme } from './theme-builder';

// Color utilities
export { lighten, darken, alpha } from './color-utils';

// Built-in themes (auto-registers on import)
export {
  lightTheme,
  darkTheme,
  materialTheme,
  githubTheme,
  nordTheme,
  draculaTheme,
  oneDarkTheme,
  solarizedTheme,
} from './themes';
