/**
 * Datetime popup lifecycle manager backed by the shared overlay manager.
 */

import {
  OverlayManager,
  type OverlayConfig,
} from '../../overlay/overlay-manager';
import type { ScrollHandlerOptions } from '../scroll/scroll-handler';
import type { PositionOptions } from './popup-positioner';

export interface PopupConfig {
  /** The popup element */
  popup: HTMLElement;
  /** The anchor element (trigger) */
  anchor: HTMLElement;
  /** Callback when popup should close */
  onClose: () => void;
  /** Callback when popup opens */
  onOpen?: () => void;
  /** Additional elements considered "inside" for click-outside detection */
  additionalElements?: HTMLElement[];
  /** Position options */
  positionOptions?: PositionOptions;
  /** Scroll handler options */
  scrollOptions?: ScrollHandlerOptions;
}

export class PopupManager {
  private static instance: PopupManager | null = null;
  private overlayManager: OverlayManager;

  private constructor() {
    this.overlayManager = OverlayManager.getInstance();
  }

  static getInstance(): PopupManager {
    if (!PopupManager.instance) {
      PopupManager.instance = new PopupManager();
    }
    return PopupManager.instance;
  }

  /**
   * Open a popup, closing any existing one first
   */
  open(config: PopupConfig): void {
    const overlayConfig: OverlayConfig = {
      overlay: config.popup,
      anchor: config.anchor,
      onClose: () => {
        config.popup.removeAttribute('data-zg-datetime-popup');
        config.onClose();
      },
      onOpen: () => {
        config.popup.setAttribute('data-zg-datetime-popup', 'true');
        config.onOpen?.();
      },
      additionalElements: config.additionalElements ? [config.anchor, ...config.additionalElements] : [config.anchor],
      positionOptions: config.positionOptions,
      scrollOptions: config.scrollOptions,
      restoreFocusOnClose: true,
      restoreFocusTo: config.anchor,
    };

    this.overlayManager.open(overlayConfig);
  }

  /**
   * Close a specific popup
   */
  close(popup: HTMLElement): void {
    this.overlayManager.close(popup);
  }

  /**
   * Close all open popups
   */
  closeAll(): void {
    this.overlayManager.closeAll();
  }

  /**
   * Check if a popup is currently open
   */
  isOpen(popup: HTMLElement): boolean {
    return this.overlayManager.isOpen(popup);
  }

  /**
   * Get the currently active popup
   */
  getActivePopup(): HTMLElement | null {
    return this.overlayManager.getActiveOverlay();
  }

  /**
   * Toggle a popup open/closed
   */
  toggle(config: PopupConfig): void {
    if (this.isOpen(config.popup)) {
      this.close(config.popup);
    } else {
      this.open(config);
    }
  }

  /**
   * Reposition an open popup
   */
  reposition(popup: HTMLElement): void {
    this.overlayManager.reposition(popup);
  }

  /**
   * Reset manager state (for testing)
   */
  reset(): void {
    this.overlayManager.reset();
  }
}

/**
 * Convenience function to create a popup controller
 */
export function createPopupController(config: PopupConfig) {
  const manager = PopupManager.getInstance();

  return {
    open: () => manager.open(config),
    close: () => manager.close(config.popup),
    toggle: () => manager.toggle(config),
    isOpen: () => manager.isOpen(config.popup),
    reposition: () => manager.reposition(config.popup),
  };
}
