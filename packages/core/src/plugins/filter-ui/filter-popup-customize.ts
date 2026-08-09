import type { ColumnDef } from '../../types';
import type {
  FilterPopupCustomization,
  FilterPopupPart,
} from './filter-ui-types';

/**
 * Applies an enterprise customization to a single popup part: an optional DOM
 * replacement (`render`), then class and inline-style additions (`parts`). Bound
 * to a column via {@link createPartApplier} so the popup builders stay simple —
 * each wraps its element with `applyPart('title', el)`.
 */
export type PartApplier = (part: FilterPopupPart, defaultElement: HTMLElement) => HTMLElement;

/** Identity applier used when a popup has no customization. */
export const identityApplier: PartApplier = (_part, el) => el;

function toClassList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  const out: string[] = [];
  for (const raw of list) for (const cls of String(raw).split(/\s+/)) if (cls) out.push(cls);
  return out;
}

export function createPartApplier(
  customization: FilterPopupCustomization | undefined,
  ctx: { columnDef: ColumnDef; dataCol: number }
): PartApplier {
  if (!customization) return identityApplier;
  const { parts, render } = customization;
  return (part, defaultElement) => {
    let el = defaultElement;
    const slot = render?.[part];
    if (slot) {
      const replacement = slot({ part, columnDef: ctx.columnDef, dataCol: ctx.dataCol, defaultElement });
      if (replacement instanceof HTMLElement) el = replacement;
    }
    const decoration = parts?.[part];
    if (decoration) {
      const classes = toClassList(decoration.class);
      if (classes.length) el.classList.add(...classes);
      if (decoration.style) {
        for (const [prop, val] of Object.entries(decoration.style)) {
          el.style.setProperty(prop, String(val));
        }
      }
    }
    return el;
  };
}

/** Sets `tokens` as CSS custom properties on the popup root. */
export function applyTokens(
  popup: HTMLElement,
  tokens: Record<string, string> | undefined
): void {
  if (!tokens) return;
  for (const [name, value] of Object.entries(tokens)) {
    const prop = name.startsWith('--') ? name : `--${name}`;
    popup.style.setProperty(prop, String(value));
  }
}
