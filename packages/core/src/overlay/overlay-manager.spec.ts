/**
 * @jest-environment jsdom
 */

import { OverlayManager } from './overlay-manager';

describe('OverlayManager', () => {
  let manager: OverlayManager;
  let anchor: HTMLButtonElement;
  let overlayOne: HTMLDivElement;
  let overlayTwo: HTMLDivElement;

  beforeEach(() => {
    manager = OverlayManager.getInstance();
    manager.reset();

    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });

    anchor = document.createElement('button');
    anchor.textContent = 'anchor';
    document.body.appendChild(anchor);

    overlayOne = document.createElement('div');
    overlayOne.tabIndex = -1;
    document.body.appendChild(overlayOne);

    overlayTwo = document.createElement('div');
    overlayTwo.tabIndex = -1;
    document.body.appendChild(overlayTwo);
  });

  afterEach(() => {
    manager.reset();
    jest.restoreAllMocks();
    overlayOne.remove();
    overlayTwo.remove();
    anchor.remove();
  });

  it('closes an already open overlay when another opens', () => {
    const firstClose = jest.fn();

    manager.open({
      overlay: overlayOne,
      anchor,
      onClose: firstClose,
    });

    manager.open({
      overlay: overlayTwo,
      anchor,
    });

    expect(firstClose).toHaveBeenCalledWith('programmatic');
    expect(overlayOne.style.display).toBe('none');
    expect(overlayTwo.style.display).toBe('block');
    expect(manager.getActiveOverlay()).toBe(overlayTwo);
  });

  it('restores focus to the configured element after outside-click close', () => {
    manager.open({
      overlay: overlayOne,
      anchor,
      restoreFocusOnClose: true,
      restoreFocusTo: anchor,
      additionalElements: [anchor],
    });

    overlayOne.focus();
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(overlayOne.style.display).toBe('none');
    expect(document.activeElement).toBe(anchor);
  });

  it('closes overlay on Escape when closeOnEscape is true', () => {
    const onClose = jest.fn();

    manager.open({
      overlay: overlayOne,
      anchor,
      closeOnEscape: true,
      onClose,
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onClose).toHaveBeenCalledWith('escape');
    expect(overlayOne.style.display).toBe('none');
    expect(manager.isOpen(overlayOne)).toBe(false);
  });

  it('does not close overlay on Escape when closeOnEscape is false (default)', () => {
    const onClose = jest.fn();

    manager.open({
      overlay: overlayOne,
      anchor,
      onClose,
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onClose).not.toHaveBeenCalled();
    expect(manager.isOpen(overlayOne)).toBe(true);
  });

  it('keeps other overlays open when closeOthers is false', () => {
    const firstClose = jest.fn();

    manager.open({
      overlay: overlayOne,
      anchor,
      onClose: firstClose,
    });

    manager.open({
      overlay: overlayTwo,
      anchor,
      closeOthers: false,
    });

    expect(firstClose).not.toHaveBeenCalled();
    expect(manager.isOpen(overlayOne)).toBe(true);
    expect(manager.isOpen(overlayTwo)).toBe(true);
  });

  it('does not hide the element when hideOnClose is false', () => {
    manager.open({
      overlay: overlayOne,
      anchor,
      hideOnClose: false,
    });

    overlayOne.style.display = 'block';
    manager.close(overlayOne);

    expect(overlayOne.style.display).toBe('block');
    expect(manager.isOpen(overlayOne)).toBe(false);
  });

  it('maintains correct stacking order with getActiveOverlay', () => {
    manager.open({
      overlay: overlayOne,
      anchor,
      closeOthers: false,
    });

    manager.open({
      overlay: overlayTwo,
      anchor,
      closeOthers: false,
    });

    expect(manager.getActiveOverlay()).toBe(overlayTwo);

    manager.close(overlayTwo);
    expect(manager.getActiveOverlay()).toBe(overlayOne);

    manager.close(overlayOne);
    expect(manager.getActiveOverlay()).toBe(null);
  });

  it('dismiss does not restore focus', () => {
    anchor.focus();

    manager.open({
      overlay: overlayOne,
      anchor,
      restoreFocusOnClose: true,
      restoreFocusTo: anchor,
    });

    overlayOne.focus();
    manager.dismiss(overlayOne);

    expect(manager.isOpen(overlayOne)).toBe(false);
    expect(overlayOne.style.display).toBe('none');
    // Focus should NOT have been restored to anchor
    expect(document.activeElement).not.toBe(anchor);
  });

  it('outside click on additionalElements does not close', () => {
    const onClose = jest.fn();

    manager.open({
      overlay: overlayOne,
      anchor,
      additionalElements: [anchor],
      onClose,
    });

    anchor.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(onClose).not.toHaveBeenCalled();
    expect(manager.isOpen(overlayOne)).toBe(true);
  });

  it('closeAll closes every open overlay', () => {
    const closeOne = jest.fn();
    const closeTwo = jest.fn();

    manager.open({
      overlay: overlayOne,
      anchor,
      closeOthers: false,
      onClose: closeOne,
    });

    manager.open({
      overlay: overlayTwo,
      anchor,
      closeOthers: false,
      onClose: closeTwo,
    });

    manager.closeAll();

    expect(closeOne).toHaveBeenCalled();
    expect(closeTwo).toHaveBeenCalled();
    expect(manager.getActiveOverlay()).toBe(null);
  });

  it('Escape only closes the topmost overlay in a stack', () => {
    const closeOne = jest.fn();
    const closeTwo = jest.fn();

    manager.open({
      overlay: overlayOne,
      anchor,
      closeOthers: false,
      closeOnEscape: true,
      onClose: closeOne,
    });

    manager.open({
      overlay: overlayTwo,
      anchor,
      closeOthers: false,
      closeOnEscape: true,
      onClose: closeTwo,
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(closeTwo).toHaveBeenCalledWith('escape');
    expect(closeOne).not.toHaveBeenCalled();
    expect(manager.isOpen(overlayOne)).toBe(true);
    expect(manager.getActiveOverlay()).toBe(overlayOne);
  });

  it('re-opening the same overlay updates config without duplicating', () => {
    const onClose = jest.fn();

    manager.open({ overlay: overlayOne, anchor });
    manager.open({ overlay: overlayOne, anchor, onClose });

    // Still only one overlay tracked
    manager.close(overlayOne);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(manager.getActiveOverlay()).toBe(null);
  });
});
