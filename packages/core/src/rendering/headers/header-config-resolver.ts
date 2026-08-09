import type { ColumnDef, HeaderConfig, HeaderType, ResolvedHeaderConfig } from '../../types';

/**
 * Infer header type from column properties
 *
 * @param column - Column definition
 * @returns Inferred header type
 */
function inferHeaderType(column: ColumnDef): HeaderType {
  // If both sortable and filterable, prefer filterable as it typically includes sort
  if (column.filterable) return 'filterable';
  if (column.sortable) return 'sortable';
  return 'text';
}

/**
 * Resolve header configuration from string or HeaderConfig
 * Handles backward compatibility where header can be a simple string
 *
 * @param header - Header string or configuration object
 * @param column - Column definition
 * @returns Resolved header configuration with all defaults applied
 *
 * @example
 * ```typescript
 * // Legacy string header
 * const resolved = resolveHeaderConfig('Name', { field: 'name', header: 'Name', sortable: true });
 * // Result: { text: 'Name', type: 'sortable', interactive: true, sortIndicator: { show: true } }
 *
 * // Full config object
 * const resolved = resolveHeaderConfig(
 *   { text: 'Name', type: 'sortable', leadingIcon: { content: '👤' } },
 *   { field: 'name', header: '...', sortable: true }
 * );
 * ```
 */
export function resolveHeaderConfig(
  header: string | HeaderConfig,
  column: ColumnDef
): ResolvedHeaderConfig {
  // Case 1: Simple string (legacy/backward compatible)
  if (typeof header === 'string') {
    const inferredType = inferHeaderType(column);

    return {
      text: header,
      type: inferredType,
      interactive: column.sortable || column.filterable || false,

      // Add sort indicator if column is sortable
      sortIndicator: column.sortable
        ? {
            show: true,
            position: 'trailing',
          }
        : undefined,

      // Add filter indicator if column is filterable
      filterIndicator: column.filterable
        ? {
            show: true,
            dropdownType: column.filterType ?? 'text',
          }
        : undefined,
    };
  }

  // Case 2: Full HeaderConfig object
  const inferredType = header.type ?? inferHeaderType(column);

  // Build resolved config with defaults
  const resolved: ResolvedHeaderConfig = {
    // Required fields
    text: header.text,
    type: inferredType,
    interactive: header.interactive ?? (column.sortable || column.filterable || false),
  };

  // Optional fields (only include if defined)
  if (header.leadingIcon) resolved.leadingIcon = header.leadingIcon;
  if (header.trailingIcon) resolved.trailingIcon = header.trailingIcon;
  if (header.tooltip) resolved.tooltip = header.tooltip;
  if (header.className) resolved.className = header.className;
  if (header.style) resolved.style = header.style;
  if (header.onClick) resolved.onClick = header.onClick;
  if (header.onDoubleClick) resolved.onDoubleClick = header.onDoubleClick;
  if (header.contextMenu) resolved.contextMenu = header.contextMenu;
  if (header.renderer) resolved.renderer = header.renderer;
  if (header.rendererData) resolved.rendererData = header.rendererData;

  // Sort indicator (merge column property with config)
  if (header.sortIndicator) {
    resolved.sortIndicator = header.sortIndicator;
  } else if (column.sortable) {
    resolved.sortIndicator = {
      show: true,
      position: 'trailing',
    };
  }

  // Filter indicator (merge column property with config)
  if (header.filterIndicator) {
    resolved.filterIndicator = header.filterIndicator;
  } else if (column.filterable) {
    resolved.filterIndicator = {
      show: true,
      dropdownType: column.filterType ?? 'text',
    };
  }

  return resolved;
}

/**
 * Extract header text from string or HeaderConfig
 *
 * @param header - Header string or configuration object
 * @returns Header display text
 */
export function getHeaderText(header: string | HeaderConfig): string {
  return typeof header === 'string' ? header : header.text;
}

/**
 * Check if header configuration includes sort indicators
 *
 * @param config - Resolved header configuration
 * @returns True if sort indicators should be shown
 */
export function hasSortIndicator(config: ResolvedHeaderConfig): boolean {
  return config.sortIndicator?.show ?? false;
}

/**
 * Check if header configuration includes filter indicators
 *
 * @param config - Resolved header configuration
 * @returns True if filter indicators should be shown
 */
export function hasFilterIndicator(config: ResolvedHeaderConfig): boolean {
  return config.filterIndicator?.show ?? false;
}
