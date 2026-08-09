import { describe, it, expect } from 'vitest';
import { resolveHeaderConfig } from './header-config-resolver';
import type { ColumnDef } from '../../types';

describe('resolveHeaderConfig — filter dropdownType', () => {
  const base = (extra: Partial<ColumnDef>): ColumnDef =>
    ({ field: 'x', header: 'X', ...extra }) as ColumnDef;

  it('defaults a filterable column to a text filter popup', () => {
    const resolved = resolveHeaderConfig('X', base({ filterable: true }));
    expect(resolved.filterIndicator).toEqual({ show: true, dropdownType: 'text' });
  });

  it('honours filterType for the string-header shorthand', () => {
    const resolved = resolveHeaderConfig(
      'Revenue',
      base({ field: 'revenue', header: 'Revenue', filterable: true, filterType: 'number' })
    );
    expect(resolved.filterIndicator?.dropdownType).toBe('number');
  });

  it('honours filterType for the object-header form', () => {
    const col = base({ header: { text: 'Signed' }, filterable: true, filterType: 'date' });
    const resolved = resolveHeaderConfig(col.header, col);
    expect(resolved.filterIndicator?.dropdownType).toBe('date');
  });

  it('leaves an explicit header.filterIndicator untouched', () => {
    const col = base({
      header: { text: 'Signed', filterIndicator: { show: true, dropdownType: 'number' } },
      filterable: true,
      filterType: 'date',
    });
    const resolved = resolveHeaderConfig(col.header, col);
    expect(resolved.filterIndicator?.dropdownType).toBe('number');
  });
});
