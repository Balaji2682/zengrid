import type { ColumnDef } from '../../types';
import { applyTokens, createPartApplier } from './filter-popup-customize';

const columnDef = { field: 'name' } as ColumnDef;
const ctx = { columnDef, dataCol: 0 };

describe('createPartApplier', () => {
  it('returns the element untouched with no customization', () => {
    const apply = createPartApplier(undefined, ctx);
    const el = document.createElement('div');
    expect(apply('title', el)).toBe(el);
    expect(el.className).toBe('');
  });

  it('adds classes and inline styles to a part', () => {
    const apply = createPartApplier(
      { parts: { applyBtn: { class: 'a b', style: { 'font-weight': '600' } } } },
      ctx
    );
    const el = document.createElement('button');
    apply('applyBtn', el);
    expect(el.classList.contains('a')).toBe(true);
    expect(el.classList.contains('b')).toBe(true);
    expect(el.style.getPropertyValue('font-weight')).toBe('600');
  });

  it('replaces a part with a render slot and still decorates the replacement', () => {
    const custom = document.createElement('section');
    const apply = createPartApplier(
      { render: { title: () => custom }, parts: { title: { class: 'themed' } } },
      ctx
    );
    const result = apply('title', document.createElement('div'));
    expect(result).toBe(custom);
    expect(custom.classList.contains('themed')).toBe(true);
  });

  it('keeps the default when a render slot returns nothing', () => {
    const apply = createPartApplier({ render: { title: () => undefined } }, ctx);
    const el = document.createElement('div');
    expect(apply('title', el)).toBe(el);
  });

  it('passes column context to a render slot', () => {
    const seen: unknown[] = [];
    const apply = createPartApplier(
      { render: { title: (c) => void seen.push(c) } },
      ctx
    );
    apply('title', document.createElement('div'));
    expect(seen[0]).toMatchObject({ part: 'title', dataCol: 0, columnDef });
  });
});

describe('applyTokens', () => {
  it('sets custom properties, normalizing a missing -- prefix', () => {
    const popup = document.createElement('div');
    applyTokens(popup, { '--zg-filter-radius': '12px', 'zg-filter-accent': 'red' });
    expect(popup.style.getPropertyValue('--zg-filter-radius')).toBe('12px');
    expect(popup.style.getPropertyValue('--zg-filter-accent')).toBe('red');
  });

  it('no-ops without tokens', () => {
    const popup = document.createElement('div');
    applyTokens(popup, undefined);
    expect(popup.getAttribute('style')).toBeNull();
  });
});
