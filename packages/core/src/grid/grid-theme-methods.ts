/**
 * Grid theme methods - delegates to theming module
 */

import type { SlimGridContext } from './grid-context';
import type { ZenGridTheme, PartialTheme } from '../theming/theme.interface';
import { applyTheme, removeTheme } from '../theming/theme-manager';
import { getTheme, listThemes } from '../theming/theme-registry';
import { lightTheme } from '../theming/themes/light';

// Ensure built-in themes are registered
import '../theming/themes';

export interface ThemeMethods {
  setTheme(nameOrObject: string | ZenGridTheme): void;
  getTheme(): ZenGridTheme;
  getThemeName(): string;
  updateTheme(partial: PartialTheme): void;
  resetTheme(): void;
  setupAutoTheme(): void;
  destroyAutoTheme(): void;
}

export function createThemeMethods(ctx: SlimGridContext): ThemeMethods {
  let currentTheme: ZenGridTheme = lightTheme;
  let mediaQuery: MediaQueryList | null = null;
  let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null;

  const applyOptions = { legacyThemeAttribute: ctx.options.legacyThemeAttribute !== false };

  function resolveTheme(nameOrObject: string | ZenGridTheme): ZenGridTheme {
    if (typeof nameOrObject === 'string') {
      const theme = getTheme(nameOrObject);
      if (!theme) throw new Error(`Theme "${nameOrObject}" not found. Available: ${listThemes().join(', ')}`);
      return theme;
    }
    return nameOrObject;
  }

  const methods: ThemeMethods = {
    setTheme(nameOrObject: string | ZenGridTheme): void {
      currentTheme = resolveTheme(nameOrObject);
      applyTheme(ctx.container, currentTheme, applyOptions);
    },

    getTheme(): ZenGridTheme {
      return currentTheme;
    },

    getThemeName(): string {
      return currentTheme.id;
    },

    updateTheme(partial: PartialTheme): void {
      currentTheme = mergeTheme(currentTheme, partial);
      applyTheme(ctx.container, currentTheme, applyOptions);
    },

    resetTheme(): void {
      currentTheme = lightTheme;
      removeTheme(ctx.container);
      applyTheme(ctx.container, currentTheme, applyOptions);
    },

    setupAutoTheme(): void {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaHandler = (e: MediaQueryListEvent) => {
        methods.setTheme(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', mediaHandler);
      // Apply initial theme based on current preference
      methods.setTheme(mediaQuery.matches ? 'dark' : 'light');
    },

    destroyAutoTheme(): void {
      if (mediaQuery && mediaHandler) {
        mediaQuery.removeEventListener('change', mediaHandler);
        mediaQuery = null;
        mediaHandler = null;
      }
    },
  };

  // Apply initial theme from options
  if (ctx.options.autoTheme) {
    methods.setupAutoTheme();
  } else if (ctx.options.theme) {
    const themeOption = ctx.options.theme;
    if (typeof themeOption === 'object' && 'base' in themeOption && 'override' in themeOption) {
      // { base, override }: start from a base theme and layer a PartialTheme on top
      currentTheme = mergeTheme(resolveTheme(themeOption.base), themeOption.override);
      applyTheme(ctx.container, currentTheme, applyOptions);
    } else {
      methods.setTheme(themeOption as string | ZenGridTheme);
    }
  }

  return methods;
}

/** Deep-merge a PartialTheme onto a base theme, returning a new theme. */
function mergeTheme(base: ZenGridTheme, partial: PartialTheme): ZenGridTheme {
  const merged = JSON.parse(JSON.stringify(base));
  deepMergeInto(merged, partial as any);
  return merged;
}

/** Deep merge source into target, mutating target */
function deepMergeInto(target: any, source: any): void {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object'
    ) {
      deepMergeInto(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}
