import type { ColumnDef, ResolvedHeaderConfig } from '../../types';

/**
 * Sort direction for header rendering
 */
export type SortDirection = 'asc' | 'desc' | null;

/**
 * Parameters passed to header renderers for rendering a header cell
 */
export interface HeaderRenderParams {
  /**
   * Column index
   */
  columnIndex: number;

  /**
   * Column definition
   */
  column: ColumnDef;

  /**
   * Resolved header configuration
   */
  config: ResolvedHeaderConfig;

  /**
   * Column width in pixels
   */
  width: number;

  /**
   * Header height in pixels
   */
  height: number;

  /**
   * Current sort direction (if sortable)
   */
  sortDirection?: SortDirection;

  /**
   * Sort priority for multi-column sort (0 = primary sort)
   */
  sortPriority?: number;

  /**
   * Whether column has active filter
   */
  hasFilter?: boolean;

  /**
   * Whether column is being resized
   */
  isResizing?: boolean;

  /**
   * Whether header is hovered
   */
  isHovered?: boolean;

  /**
   * Whether header is focused
   */
  isFocused?: boolean;

  /**
   * Event emitter function for emitting grid events
   */
  emit?: (event: string, payload: any) => void;
}

/**
 * Header renderer interface
 *
 * Follows the same pattern as CellRenderer for consistency.
 * Renderers are responsible for creating and updating header content.
 */
export interface HeaderRenderer {
  /**
   * Initial render into a DOM element
   * Called when header is first created
   *
   * @param element - DOM element to render into
   * @param params - Rendering parameters
   */
  render(element: HTMLElement, params: HeaderRenderParams): void;

  /**
   * Update an existing rendered element
   * Called when header state changes (sort, filter, hover, etc.)
   * Should be optimized for frequent calls
   *
   * @param element - DOM element to update
   * @param params - Updated rendering parameters
   */
  update(element: HTMLElement, params: HeaderRenderParams): void;

  /**
   * Cleanup before element is removed
   * Called when column is removed or grid is destroyed
   *
   * @param element - DOM element to cleanup
   */
  destroy(element: HTMLElement): void;

  /**
   * Optional: Signals that this renderer wires its own sort-click interaction.
   * When falsy, the grid attaches a default sort-click handler for sortable
   * columns so custom renderers stay sortable without extra plumbing.
   */
  handlesSortInteraction?: boolean;

  /**
   * Optional: Get CSS class to apply to header cell based on state
   * Useful for conditional styling
   *
   * @param params - Rendering parameters
   * @returns CSS class name or undefined
   */
  getHeaderClass?(params: HeaderRenderParams): string | undefined;

  /**
   * Optional: Get inline styles to apply to header cell
   *
   * @param params - Rendering parameters
   * @returns Style object or undefined
   */
  getHeaderStyle?(params: HeaderRenderParams): Partial<CSSStyleDeclaration> | undefined;
}
