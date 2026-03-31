import {
  positionPopup,
  type PositionOptions,
} from '../datetime-core/popup/popup-positioner';
import {
  ScrollHandler,
  type ScrollAction,
  type ScrollHandlerOptions,
} from '../datetime-core/scroll/scroll-handler';

export type OverlayCloseReason =
  | 'programmatic'
  | 'outside-click'
  | 'escape'
  | 'scroll'
  | 'destroy';

export interface OverlayConfig {
  overlay: HTMLElement;
  anchor?: HTMLElement | null;
  onClose?: (reason: OverlayCloseReason) => void;
  onOpen?: () => void;
  additionalElements?: HTMLElement[];
  positionOptions?: PositionOptions;
  scrollOptions?: ScrollHandlerOptions;
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
  restoreFocusOnClose?: boolean;
  restoreFocusTo?: HTMLElement | null;
  closeOthers?: boolean;
  hideOnClose?: boolean;
}

interface NormalizedOverlayConfig {
  overlay: HTMLElement;
  anchor: HTMLElement | null;
  onClose?: (reason: OverlayCloseReason) => void;
  onOpen?: () => void;
  additionalElements: HTMLElement[];
  positionOptions?: PositionOptions;
  scrollOptions?: ScrollHandlerOptions;
  closeOnOutsideClick: boolean;
  closeOnEscape: boolean;
  restoreFocusOnClose: boolean;
  restoreFocusTo: HTMLElement | null;
  closeOthers: boolean;
  hideOnClose: boolean;
}

interface ActiveOverlay {
  config: NormalizedOverlayConfig;
  cleanupScroll: () => void;
  cleanupOutsideClick: () => void;
  cleanupKeydown: () => void;
  restoreFocusTarget: HTMLElement | null;
}

/**
 * Generic body-overlay lifecycle manager used by dropdowns, popups, and filter menus.
 */
export class OverlayManager {
  private static instance: OverlayManager | null = null;
  private activeOverlays: Map<HTMLElement, ActiveOverlay> = new Map();
  private overlayOrder: HTMLElement[] = [];

  private constructor() {}

  static getInstance(): OverlayManager {
    if (!OverlayManager.instance) {
      OverlayManager.instance = new OverlayManager();
    }
    return OverlayManager.instance;
  }

  open(config: OverlayConfig): void {
    const normalizedConfig = this.normalizeConfig(config);
    const existing = this.activeOverlays.get(normalizedConfig.overlay);

    if (normalizedConfig.closeOthers) {
      this.closeAll(normalizedConfig.overlay);
    }

    if (!normalizedConfig.overlay.isConnected) {
      document.body.appendChild(normalizedConfig.overlay);
    }

    if (existing) {
      existing.config = normalizedConfig;
      if (normalizedConfig.anchor) {
        this.positionOverlay(normalizedConfig.anchor, normalizedConfig.overlay, normalizedConfig);
      }
      this.bringToFront(normalizedConfig.overlay);
      return;
    }

    const restoreFocusTarget = this.resolveRestoreFocusTarget(normalizedConfig);
    const overlay = normalizedConfig.overlay;

    overlay.style.display = 'block';
    overlay.setAttribute('data-zg-overlay', 'true');

    if (normalizedConfig.anchor) {
      this.positionOverlay(normalizedConfig.anchor, overlay, normalizedConfig);
    }

    const activeOverlay: ActiveOverlay = {
      config: normalizedConfig,
      cleanupScroll: this.attachScrollHandling(normalizedConfig),
      cleanupOutsideClick: this.attachOutsideClickHandling(normalizedConfig),
      cleanupKeydown: this.attachEscapeHandling(normalizedConfig),
      restoreFocusTarget,
    };

    this.activeOverlays.set(overlay, activeOverlay);
    this.overlayOrder.push(overlay);
    normalizedConfig.onOpen?.();
  }

  close(overlay: HTMLElement, reason: OverlayCloseReason = 'programmatic'): void {
    this.closeInternal(overlay, reason, true);
  }

  dismiss(overlay: HTMLElement, reason: OverlayCloseReason = 'destroy'): void {
    this.closeInternal(overlay, reason, false);
  }

  closeAll(except?: HTMLElement): void {
    for (const openOverlay of [...this.overlayOrder]) {
      if (openOverlay !== except) {
        this.closeInternal(openOverlay, 'programmatic', false);
      }
    }
  }

  isOpen(overlay: HTMLElement): boolean {
    return this.activeOverlays.has(overlay);
  }

  reposition(overlay: HTMLElement): void {
    const activeOverlay = this.activeOverlays.get(overlay);
    if (!activeOverlay?.config.anchor) return;
    this.positionOverlay(activeOverlay.config.anchor, overlay, activeOverlay.config);
  }

  getActiveOverlay(): HTMLElement | null {
    const overlay = this.overlayOrder[this.overlayOrder.length - 1];
    return overlay ?? null;
  }

  reset(): void {
    for (const overlay of [...this.overlayOrder]) {
      this.dismiss(overlay);
    }
    this.activeOverlays.clear();
    this.overlayOrder = [];
  }

  private normalizeConfig(config: OverlayConfig): NormalizedOverlayConfig {
    return {
      ...config,
      anchor: config.anchor ?? null,
      additionalElements: config.additionalElements ?? [],
      closeOnOutsideClick: config.closeOnOutsideClick ?? true,
      closeOnEscape: config.closeOnEscape ?? false,
      restoreFocusOnClose: config.restoreFocusOnClose ?? false,
      restoreFocusTo: config.restoreFocusTo ?? null,
      closeOthers: config.closeOthers ?? true,
      hideOnClose: config.hideOnClose ?? true,
    };
  }

  private closeInternal(
    overlay: HTMLElement,
    reason: OverlayCloseReason,
    shouldRestoreFocus: boolean
  ): void {
    const activeOverlay = this.activeOverlays.get(overlay);
    if (!activeOverlay) return;

    activeOverlay.cleanupScroll();
    activeOverlay.cleanupOutsideClick();
    activeOverlay.cleanupKeydown();

    if (activeOverlay.config.hideOnClose) {
      overlay.style.display = 'none';
    }

    overlay.removeAttribute('data-zg-overlay');
    overlay.removeAttribute('data-zg-placement');
    overlay.style.willChange = '';

    this.activeOverlays.delete(overlay);
    this.overlayOrder = this.overlayOrder.filter((item) => item !== overlay);

    activeOverlay.config.onClose?.(reason);

    if (
      shouldRestoreFocus &&
      activeOverlay.config.restoreFocusOnClose &&
      activeOverlay.restoreFocusTarget &&
      activeOverlay.restoreFocusTarget.isConnected
    ) {
      requestAnimationFrame(() => {
        activeOverlay.restoreFocusTarget?.focus?.();
      });
    }
  }

  private attachScrollHandling(config: NormalizedOverlayConfig): () => void {
    if (!config.anchor) {
      return () => {};
    }

    const scrollHandler = ScrollHandler.getInstance();
    const { overlay, anchor, scrollOptions } = config;

    scrollHandler.attach(
      anchor,
      overlay,
      (action: ScrollAction) => {
        if (action === 'close') {
          this.close(overlay, 'scroll');
          return;
        }
        this.positionOverlay(anchor, overlay, config);
      },
      scrollOptions
    );

    return () => {
      scrollHandler.detach(overlay);
    };
  }

  private attachOutsideClickHandling(config: NormalizedOverlayConfig): () => void {
    if (!config.closeOnOutsideClick) {
      return () => {};
    }

    const handler = (event: Event) => {
      const target = event.target as Node | null;
      if (!target || this.isInsideOverlay(target, config)) {
        return;
      }

      if (this.getActiveOverlay() !== config.overlay) {
        return;
      }

      this.close(config.overlay, 'outside-click');
    };

    document.addEventListener('mousedown', handler, true);
    document.addEventListener('touchstart', handler, true);

    return () => {
      document.removeEventListener('mousedown', handler, true);
      document.removeEventListener('touchstart', handler, true);
    };
  }

  private attachEscapeHandling(config: NormalizedOverlayConfig): () => void {
    if (!config.closeOnEscape) {
      return () => {};
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (this.getActiveOverlay() !== config.overlay) {
        return;
      }

      this.close(config.overlay, 'escape');
    };

    document.addEventListener('keydown', handler, true);

    return () => {
      document.removeEventListener('keydown', handler, true);
    };
  }

  private isInsideOverlay(target: Node, config: NormalizedOverlayConfig): boolean {
    if (config.overlay.contains(target)) {
      return true;
    }

    for (const element of config.additionalElements) {
      if (element.contains(target)) {
        return true;
      }
    }

    return false;
  }

  private positionOverlay(
    anchor: HTMLElement,
    overlay: HTMLElement,
    config: NormalizedOverlayConfig
  ): void {
    overlay.style.visibility = 'hidden';
    overlay.style.display = 'block';
    positionPopup(anchor, overlay, config.positionOptions);
    overlay.style.visibility = '';
  }

  private resolveRestoreFocusTarget(config: NormalizedOverlayConfig): HTMLElement | null {
    if (config.restoreFocusTo) {
      return config.restoreFocusTo;
    }

    const activeElement = document.activeElement;
    return activeElement instanceof HTMLElement ? activeElement : (config.anchor ?? null);
  }

  private bringToFront(overlay: HTMLElement): void {
    this.overlayOrder = this.overlayOrder.filter((item) => item !== overlay);
    this.overlayOrder.push(overlay);
  }
}
