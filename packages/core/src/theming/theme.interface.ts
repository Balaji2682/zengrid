/**
 * ZenGrid Theme System - Type Definitions
 */

export interface ThemeColors {
  background: {
    primary: string;
    secondary: string;
    hover: string;
    selected: string;
    active: string;
    editing: string;
    disabled: string;
  };
  border: {
    default: string;
    active: string;
    selected: string;
    editing: string;
    focus: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: string;
    negative: string;
    link: string;
  };
  state: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  scrollbar: {
    thumb: string;
    thumbHover: string;
  };
}

export interface ThemeTypography {
  fontFamily: string;
  fontSize: string;
  lineHeight: string | number;
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  /**
   * Optional header-specific typography. Any field left undefined falls back to
   * the body typography above (via CSS variable defaults).
   */
  header?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: number | string;
    textTransform?: string;
    letterSpacing?: string;
    color?: string;
  };
}

export interface ThemeSpacing {
  cellPaddingX: string;
  cellPaddingY: string;
  headerPadding: string;
}

export interface ThemeBorders {
  width: string;
  radius: string;
}

export interface ThemeShadows {
  sm: string;
  md: string;
  lg: string;
}

export interface ThemeTransitions {
  fast: string;
  normal: string;
  slow: string;
}

export interface ZenGridTheme {
  name: string;
  id: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borders: ThemeBorders;
  shadows: ThemeShadows;
  transitions: ThemeTransitions;
}

/** Deep partial for theme overrides */
export type PartialTheme = {
  [K in keyof ZenGridTheme]?: K extends 'colors'
    ? { [C in keyof ThemeColors]?: Partial<ThemeColors[C]> }
    : K extends 'typography'
      ? Partial<ThemeTypography> & { fontWeight?: Partial<ThemeTypography['fontWeight']> }
      : K extends keyof ZenGridTheme
        ? Partial<ZenGridTheme[K]>
        : never;
};
