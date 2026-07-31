/**
 * ThemeManager - Applies themes as CSS custom properties on grid containers
 */

import type { ZenGridTheme } from './theme.interface';

/** Flatten a ZenGridTheme into a Record of CSS custom property name → value */
export function themeToCSSVariables(theme: ZenGridTheme): Record<string, string> {
  const vars: Record<string, string> = {};

  // Colors - background
  const bg = theme.colors.background;
  vars['--zg-bg-primary'] = bg.primary;
  vars['--zg-bg-secondary'] = bg.secondary;
  vars['--zg-bg-hover'] = bg.hover;
  vars['--zg-bg-selected'] = bg.selected;
  vars['--zg-bg-active'] = bg.active;
  vars['--zg-bg-editing'] = bg.editing;
  vars['--zg-bg-disabled'] = bg.disabled;

  // Colors - border
  const border = theme.colors.border;
  vars['--zg-border-color'] = border.default;
  vars['--zg-border-active'] = border.active;
  vars['--zg-border-selected'] = border.selected;
  vars['--zg-border-editing'] = border.editing;
  vars['--zg-border-focus'] = border.focus;

  // Colors - text
  const text = theme.colors.text;
  vars['--zg-text-primary'] = text.primary;
  vars['--zg-text-secondary'] = text.secondary;
  vars['--zg-text-disabled'] = text.disabled;
  vars['--zg-text-negative'] = text.negative;
  vars['--zg-text-link'] = text.link;

  // Colors - state
  const state = theme.colors.state;
  vars['--zg-state-success'] = state.success;
  vars['--zg-state-warning'] = state.warning;
  vars['--zg-state-error'] = state.error;
  vars['--zg-state-info'] = state.info;

  // Colors - scrollbar
  const scrollbar = theme.colors.scrollbar;
  vars['--zg-scrollbar-thumb'] = scrollbar.thumb;
  vars['--zg-scrollbar-thumb-hover'] = scrollbar.thumbHover;

  // Typography
  vars['--zg-font-family'] = theme.typography.fontFamily;
  vars['--zg-font-size'] = theme.typography.fontSize;
  vars['--zg-line-height'] = String(theme.typography.lineHeight);
  vars['--zg-font-weight-normal'] = String(theme.typography.fontWeight.normal);
  vars['--zg-font-weight-medium'] = String(theme.typography.fontWeight.medium);
  vars['--zg-font-weight-semibold'] = String(theme.typography.fontWeight.semibold);
  vars['--zg-font-weight-bold'] = String(theme.typography.fontWeight.bold);

  // Typography - header (optional; only emit provided fields so CSS defaults
  // fall back to the body typography above)
  const header = theme.typography.header;
  if (header) {
    if (header.fontFamily) vars['--zg-header-font-family'] = header.fontFamily;
    if (header.fontSize) vars['--zg-header-font-size'] = header.fontSize;
    if (header.fontWeight != null) vars['--zg-header-font-weight'] = String(header.fontWeight);
    if (header.textTransform) vars['--zg-header-text-transform'] = header.textTransform;
    if (header.letterSpacing) vars['--zg-header-letter-spacing'] = header.letterSpacing;
    if (header.color) vars['--zg-header-color'] = header.color;
  }

  // Spacing
  vars['--zg-cell-padding-x'] = theme.spacing.cellPaddingX;
  vars['--zg-cell-padding-y'] = theme.spacing.cellPaddingY;
  vars['--zg-header-padding'] = theme.spacing.headerPadding;

  // Borders
  vars['--zg-border-width'] = theme.borders.width;
  vars['--zg-border-radius'] = theme.borders.radius;

  // Shadows
  vars['--zg-shadow-sm'] = theme.shadows.sm;
  vars['--zg-shadow-md'] = theme.shadows.md;
  vars['--zg-shadow-lg'] = theme.shadows.lg;

  // Transitions
  vars['--zg-transition-fast'] = theme.transitions.fast;
  vars['--zg-transition-normal'] = theme.transitions.normal;
  vars['--zg-transition-slow'] = theme.transitions.slow;

  // Legacy aliases for backwards compat with styles.css
  vars['--zg-bg-color'] = bg.primary;
  vars['--zg-text-color'] = text.primary;
  vars['--zg-header-bg'] = bg.secondary;
  vars['--zg-header-text'] = text.primary;
  vars['--zg-selected-bg'] = bg.selected;
  vars['--zg-selected-border'] = border.selected;
  vars['--zg-hover-bg'] = bg.hover;
  vars['--zg-focus-ring'] = border.focus;

  // Calendar aliases
  vars['--zg-calendar-bg'] = bg.primary;
  vars['--zg-calendar-text'] = text.primary;
  vars['--zg-calendar-border'] = border.default;
  vars['--zg-calendar-header-bg'] = bg.secondary;
  vars['--zg-calendar-selected-bg'] = bg.selected;
  vars['--zg-calendar-selected-text'] = text.primary;
  vars['--zg-calendar-today-border'] = border.focus;
  vars['--zg-calendar-hover-bg'] = bg.hover;
  vars['--zg-calendar-disabled-text'] = text.disabled;

  return vars;
}

/** Options for {@link applyTheme} */
export interface ApplyThemeOptions {
  /**
   * Emit the legacy bare `data-theme="light|dark"` attribute. Disable to avoid
   * colliding with host apps that theme off a plain `[data-theme]` selector.
   * @default true
   */
  legacyThemeAttribute?: boolean;
}

/** Apply a theme to a grid container element */
export function applyTheme(
  container: HTMLElement,
  theme: ZenGridTheme,
  options?: ApplyThemeOptions
): void {
  const vars = themeToCSSVariables(theme);

  // Batch-set all CSS variables on the container (scoped, no :root pollution)
  for (const [prop, value] of Object.entries(vars)) {
    container.style.setProperty(prop, value);
  }

  // Set data attribute for CSS selectors
  container.setAttribute('data-zg-theme', theme.id);

  // Legacy compat attribute (opt-out to avoid colliding with host [data-theme])
  if (options?.legacyThemeAttribute !== false) {
    container.setAttribute('data-theme', theme.mode);
  } else {
    container.removeAttribute('data-theme');
  }
  if (theme.mode === 'dark') {
    container.classList.add('zg-theme-dark');
  } else {
    container.classList.remove('zg-theme-dark');
  }

  // Dispatch theme change event
  container.dispatchEvent(
    new CustomEvent('zg:themechange', {
      detail: { theme, themeId: theme.id },
      bubbles: true,
    })
  );
}

/** Remove all theme CSS variables from a container */
export function removeTheme(container: HTMLElement): void {
  const vars = [
    '--zg-bg-primary', '--zg-bg-secondary', '--zg-bg-hover', '--zg-bg-selected',
    '--zg-bg-active', '--zg-bg-editing', '--zg-bg-disabled',
    '--zg-border-color', '--zg-border-active', '--zg-border-selected',
    '--zg-border-editing', '--zg-border-focus',
    '--zg-text-primary', '--zg-text-secondary', '--zg-text-disabled',
    '--zg-text-negative', '--zg-text-link',
    '--zg-state-success', '--zg-state-warning', '--zg-state-error', '--zg-state-info',
    '--zg-scrollbar-thumb', '--zg-scrollbar-thumb-hover',
    '--zg-font-family', '--zg-font-size', '--zg-line-height',
    '--zg-font-weight-normal', '--zg-font-weight-medium',
    '--zg-font-weight-semibold', '--zg-font-weight-bold',
    '--zg-header-font-family', '--zg-header-font-size', '--zg-header-font-weight',
    '--zg-header-text-transform', '--zg-header-letter-spacing', '--zg-header-color',
    '--zg-cell-padding-x', '--zg-cell-padding-y', '--zg-header-padding',
    '--zg-border-width', '--zg-border-radius',
    '--zg-shadow-sm', '--zg-shadow-md', '--zg-shadow-lg',
    '--zg-transition-fast', '--zg-transition-normal', '--zg-transition-slow',
    // Legacy aliases
    '--zg-bg-color', '--zg-text-color', '--zg-header-bg', '--zg-header-text',
    '--zg-selected-bg', '--zg-selected-border', '--zg-hover-bg', '--zg-focus-ring',
    // Calendar aliases
    '--zg-calendar-bg', '--zg-calendar-text', '--zg-calendar-border',
    '--zg-calendar-header-bg', '--zg-calendar-selected-bg', '--zg-calendar-selected-text',
    '--zg-calendar-today-border', '--zg-calendar-hover-bg', '--zg-calendar-disabled-text',
  ];

  for (const prop of vars) {
    container.style.removeProperty(prop);
  }

  container.removeAttribute('data-zg-theme');
  container.removeAttribute('data-theme');
  container.classList.remove('zg-theme-dark');
}
