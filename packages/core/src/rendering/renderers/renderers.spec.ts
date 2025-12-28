import { TextRenderer } from './text-renderer';
import { NumberRenderer } from './number-renderer';
import { ImageRenderer } from './image-renderer';
import { AdvancedCellRenderer } from './advanced-cell-renderer';
import { RendererRegistry } from './renderer-registry';
import type { RenderParams } from './renderer.interface';

const createMockParams = (overrides: Partial<RenderParams> = {}): RenderParams => ({
  cell: { row: 0, col: 0 },
  position: { x: 0, y: 0, width: 100, height: 30 },
  value: null,
  isSelected: false,
  isActive: false,
  isEditing: false,
  ...overrides,
});

describe('TextRenderer', () => {
  let renderer: TextRenderer;
  let element: HTMLElement;

  beforeEach(() => {
    renderer = new TextRenderer();
    element = document.createElement('div');
  });

  it('should render text value', () => {
    const params = createMockParams({ value: 'Hello' });
    renderer.render(element, params);
    expect(element.textContent).toBe('Hello');
    expect(element.classList.contains('zg-cell-text')).toBe(true);
  });

  it('should render empty string for null', () => {
    const params = createMockParams({ value: null });
    renderer.render(element, params);
    expect(element.textContent).toBe('');
  });

  it('should render empty string for undefined', () => {
    const params = createMockParams({ value: undefined });
    renderer.render(element, params);
    expect(element.textContent).toBe('');
  });

  it('should coerce numbers to string', () => {
    const params = createMockParams({ value: 123 });
    renderer.render(element, params);
    expect(element.textContent).toBe('123');
  });

  it('should update text content', () => {
    const params1 = createMockParams({ value: 'Hello' });
    renderer.render(element, params1);

    const params2 = createMockParams({ value: 'World' });
    renderer.update(element, params2);

    expect(element.textContent).toBe('World');
  });

  it('should cleanup on destroy', () => {
    const params = createMockParams({ value: 'Hello' });
    renderer.render(element, params);
    renderer.destroy(element);

    expect(element.textContent).toBe('');
    expect(element.classList.contains('zg-cell-text')).toBe(false);
  });
});

describe('NumberRenderer', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
  });

  it('should render formatted number', () => {
    const renderer = new NumberRenderer({
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const params = createMockParams({ value: 1234.5 });
    renderer.render(element, params);

    expect(element.textContent).toContain('1,234.50');
    expect(element.classList.contains('zg-cell-number')).toBe(true);
  });

  it('should apply negative class for negative numbers', () => {
    const renderer = new NumberRenderer();
    const params = createMockParams({ value: -100 });
    renderer.render(element, params);

    expect(element.classList.contains('zg-cell-negative')).toBe(true);
  });

  it('should not apply negative class for positive numbers', () => {
    const renderer = new NumberRenderer();
    const params = createMockParams({ value: 100 });
    renderer.render(element, params);

    expect(element.classList.contains('zg-cell-negative')).toBe(false);
  });

  it('should render empty string for NaN', () => {
    const renderer = new NumberRenderer();
    const params = createMockParams({ value: 'not a number' });
    renderer.render(element, params);

    expect(element.textContent).toBe('');
  });

  it('should format currency', () => {
    const renderer = new NumberRenderer({
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    });
    const params = createMockParams({ value: 1234.5 });
    renderer.render(element, params);

    expect(element.textContent).toContain('1,234.50');
    expect(element.textContent).toContain('$');
  });

  it('should format percentage', () => {
    const renderer = new NumberRenderer({
      style: 'percent',
    });
    const params = createMockParams({ value: 0.5 });
    renderer.render(element, params);

    expect(element.textContent).toContain('50');
    expect(element.textContent).toContain('%');
  });

  it('should update on value change', () => {
    const renderer = new NumberRenderer();
    const params1 = createMockParams({ value: 100 });
    renderer.render(element, params1);

    const params2 = createMockParams({ value: -200 });
    renderer.update(element, params2);

    expect(element.classList.contains('zg-cell-negative')).toBe(true);
  });

  it('should cleanup on destroy', () => {
    const renderer = new NumberRenderer();
    const params = createMockParams({ value: -100 });
    renderer.render(element, params);
    renderer.destroy(element);

    expect(element.textContent).toBe('');
    expect(element.classList.contains('zg-cell-number')).toBe(false);
    expect(element.classList.contains('zg-cell-negative')).toBe(false);
  });
});

describe('ImageRenderer', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
  });

  it('should render image from string URL', () => {
    const renderer = new ImageRenderer();
    const params = createMockParams({ value: 'https://example.com/image.jpg' });
    renderer.render(element, params);

    const img = element.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.src).toBe('https://example.com/image.jpg');
    expect(element.classList.contains('zg-cell-image')).toBe(true);
  });

  it('should render image from object with src', () => {
    const renderer = new ImageRenderer();
    const params = createMockParams({
      value: { src: 'https://example.com/image.jpg', alt: 'Test image' },
    });
    renderer.render(element, params);

    const img = element.querySelector('img');
    expect(img?.src).toBe('https://example.com/image.jpg');
    expect(img?.alt).toBe('Test image');
  });

  it('should apply object-fit style', () => {
    const renderer = new ImageRenderer({ fit: 'cover' });
    const params = createMockParams({ value: 'https://example.com/image.jpg' });
    renderer.render(element, params);

    const img = element.querySelector('img');
    expect(img?.style.objectFit).toBe('cover');
  });

  it('should have lazy loading', () => {
    const renderer = new ImageRenderer();
    const params = createMockParams({ value: 'https://example.com/image.jpg' });
    renderer.render(element, params);

    const img = element.querySelector('img');
    expect(img?.loading).toBe('lazy');
  });

  it('should update image src', () => {
    const renderer = new ImageRenderer();
    const params1 = createMockParams({ value: 'https://example.com/image1.jpg' });
    renderer.render(element, params1);

    const params2 = createMockParams({ value: 'https://example.com/image2.jpg' });
    renderer.update(element, params2);

    const img = element.querySelector('img');
    expect(img?.src).toBe('https://example.com/image2.jpg');
  });

  it('should handle null value', () => {
    const renderer = new ImageRenderer();
    const params = createMockParams({ value: null });
    renderer.render(element, params);

    const img = element.querySelector('img');
    expect(img?.style.display).toBe('none');
  });

  it('should cleanup on destroy', () => {
    const renderer = new ImageRenderer();
    const params = createMockParams({ value: 'https://example.com/image.jpg' });
    renderer.render(element, params);
    renderer.destroy(element);

    expect(element.innerHTML).toBe('');
    expect(element.classList.contains('zg-cell-image')).toBe(false);
  });
});

describe('AdvancedCellRenderer', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
  });

  it('should render composite elements', () => {
    const renderer = new AdvancedCellRenderer({
      elements: [
        { type: 'icon', getValue: () => '✓' },
        { type: 'text', getValue: (params) => params.value },
        { type: 'badge', getValue: () => '5' },
      ],
    });

    const params = createMockParams({ value: 'Test' });
    renderer.render(element, params);

    const children = Array.from(element.children);
    expect(children.length).toBe(3);
    expect(children[0].innerHTML).toBe('✓');
    expect(children[1].textContent).toBe('Test');
    expect(children[2].textContent).toBe('5');
  });

  it('should apply conditional className', () => {
    const renderer = new AdvancedCellRenderer({
      elements: [{ type: 'text', getValue: (params) => params.value }],
      conditions: [
        {
          condition: (params) => Number(params.value) < 0,
          className: 'negative',
        },
      ],
    });

    const params = createMockParams({ value: -100 });
    renderer.render(element, params);

    expect(element.classList.contains('negative')).toBe(true);
  });

  it('should remove conditional className when condition is false', () => {
    const renderer = new AdvancedCellRenderer({
      elements: [{ type: 'text', getValue: (params) => params.value }],
      conditions: [
        {
          condition: (params) => Number(params.value) < 0,
          className: 'negative',
        },
      ],
    });

    const params1 = createMockParams({ value: -100 });
    renderer.render(element, params1);
    expect(element.classList.contains('negative')).toBe(true);

    const params2 = createMockParams({ value: 100 });
    renderer.update(element, params2);
    expect(element.classList.contains('negative')).toBe(false);
  });

  it('should use horizontal layout by default', () => {
    const renderer = new AdvancedCellRenderer({
      elements: [{ type: 'text', getValue: (params) => params.value }],
    });

    const params = createMockParams({ value: 'Test' });
    renderer.render(element, params);

    expect(element.style.flexDirection).toBe('row');
  });

  it('should use vertical layout when specified', () => {
    const renderer = new AdvancedCellRenderer({
      elements: [{ type: 'text', getValue: (params) => params.value }],
      layout: 'vertical',
    });

    const params = createMockParams({ value: 'Test' });
    renderer.render(element, params);

    expect(element.style.flexDirection).toBe('column');
  });

  it('should update composite elements', () => {
    const renderer = new AdvancedCellRenderer({
      elements: [{ type: 'text', getValue: (params) => params.value }],
    });

    const params1 = createMockParams({ value: 'Hello' });
    renderer.render(element, params1);

    const params2 = createMockParams({ value: 'World' });
    renderer.update(element, params2);

    expect(element.children[0].textContent).toBe('World');
  });

  it('should cleanup on destroy', () => {
    const renderer = new AdvancedCellRenderer({
      elements: [{ type: 'text', getValue: (params) => params.value }],
    });

    const params = createMockParams({ value: 'Test' });
    renderer.render(element, params);
    renderer.destroy(element);

    expect(element.innerHTML).toBe('');
    expect(element.classList.contains('zg-cell-advanced')).toBe(false);
  });
});

describe('RendererRegistry', () => {
  let registry: RendererRegistry;

  beforeEach(() => {
    registry = new RendererRegistry();
  });

  it('should have default text renderer', () => {
    const renderer = registry.get('text');
    expect(renderer).toBeInstanceOf(TextRenderer);
  });

  it('should return default renderer for undefined name', () => {
    const renderer = registry.get(undefined);
    expect(renderer).toBeInstanceOf(TextRenderer);
  });

  it('should register custom renderer', () => {
    const customRenderer = new NumberRenderer();
    registry.register('number', customRenderer);

    expect(registry.get('number')).toBe(customRenderer);
  });

  it('should return default for unknown renderer', () => {
    const renderer = registry.get('unknown');
    expect(renderer).toBeInstanceOf(TextRenderer);
  });

  it('should check if renderer exists', () => {
    registry.register('number', new NumberRenderer());

    expect(registry.has('number')).toBe(true);
    expect(registry.has('unknown')).toBe(false);
  });

  it('should unregister renderer', () => {
    registry.register('number', new NumberRenderer());
    const result = registry.unregister('number');

    expect(result).toBe(true);
    expect(registry.has('number')).toBe(false);
  });

  it('should not unregister default text renderer', () => {
    const result = registry.unregister('text');
    expect(result).toBe(false);
    expect(registry.has('text')).toBe(true);
  });

  it('should return all registered names', () => {
    registry.register('number', new NumberRenderer());
    registry.register('image', new ImageRenderer());

    const names = registry.names;
    expect(names).toContain('text');
    expect(names).toContain('number');
    expect(names).toContain('image');
  });

  it('should clear all except default', () => {
    registry.register('number', new NumberRenderer());
    registry.register('image', new ImageRenderer());

    registry.clear();

    expect(registry.has('text')).toBe(true);
    expect(registry.has('number')).toBe(false);
    expect(registry.has('image')).toBe(false);
  });
});
