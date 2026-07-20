/**
 * DateEditor - Date input editor for cell editing
 *
 * Uses the new datetime-core infrastructure for:
 * - Reliable click-outside detection
 * - Unified scroll handling
 * - CSS variable theming
 * - Keyboard navigation
 *
 * Supports both calendar popup and native HTML5 picker.
 */

import type { CellEditor, EditorParams, ValidationResult } from '../../cell-editor.interface';
import type { DateEditorOptions, ResolvedDateEditorOptions } from './types';
import {
  PopupManager,
  parseDate,
  formatDateForDisplay,
  formatDateForCalendar,
  isDateInRange,
  setupDatetimeKeyboard,
  ThemeManager,
} from '../../../datetime-core';

/**
 * DateEditor - Date input editor for cell editing
 *
 * @example
 * ```typescript
 * const editor = new DateEditor({
 *   format: 'DD/MM/YYYY',
 *   required: true,
 *   useCalendarPopup: true,
 *   theme: 'dark',
 * });
 * ```
 */
export class DateEditor implements CellEditor<Date | null> {
  private options: ResolvedDateEditorOptions;
  private container: HTMLElement | null = null;
  private inputElement: HTMLInputElement | null = null;
  private calendarWrapper: HTMLDivElement | null = null;
  private popup: HTMLDivElement | null = null;
  private calendar: any = null;
  private params: EditorParams | null = null;
  private initialValue: Date | null = null;
  private currentValue: Date | null = null;
  private isDestroyed: boolean = false;
  private cleanup: (() => void) | null = null;
  private popupManager: PopupManager;

  constructor(options: DateEditorOptions = {}) {
    this.options = this.resolveOptions(options);
    this.popupManager = PopupManager.getInstance();

    // Apply theme
    if (this.options.theme !== 'auto') {
      ThemeManager.getInstance().setTheme(this.options.theme);
    }
  }

  private resolveOptions(options: DateEditorOptions): ResolvedDateEditorOptions {
    return {
      format: options.format ?? 'DD/MM/YYYY',
      type: options.type ?? 'date',
      minDate: options.minDate ? parseDate(options.minDate) : null,
      maxDate: options.maxDate ? parseDate(options.maxDate) : null,
      placeholder: options.placeholder ?? 'Select date...',
      required: options.required ?? false,
      className: options.className ?? 'zg-date-editor',
      theme: options.theme ?? 'light',
      autoFocus: options.autoFocus ?? true,
      useCalendarPopup: options.useCalendarPopup ?? true,
      commitOnBlur: options.commitOnBlur ?? true,
      closeOnScroll: options.closeOnScroll ?? true,
      validator: options.validator,
    };
  }

  init(container: HTMLElement, value: Date | null, params: EditorParams): void {
    this.isDestroyed = false;
    this.params = params;
    this.container = container;
    this.initialValue = parseDate(value);
    this.currentValue = this.initialValue;

    container.innerHTML = '';

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = `${this.options.className}-wrapper zg-datetime-container`;
    wrapper.style.cssText = 'position: relative; width: 100%; height: 100%;';

    // Create input element
    this.inputElement = this.createInputElement();
    wrapper.appendChild(this.inputElement);

    container.appendChild(wrapper);

    if (this.options.useCalendarPopup) {
      // Create popup and calendar
      this.popup = this.createPopup();
      this.calendarWrapper = this.createCalendarWrapper();
      this.popup.appendChild(this.calendarWrapper);
      document.body.appendChild(this.popup);

      // Initialize calendar
      this.initializeCalendar().then(() => {
        // Use requestAnimationFrame to ensure DOM layout is complete
        // This fixes popup positioning when the input element hasn't been laid out yet
        requestAnimationFrame(() => {
          if (!this.isDestroyed) {
            this.showPopup();
          }
        });
      });

      // Register popup with editor manager if available
      if (params.registerPopup) {
        params.registerPopup(this.popup);
      }
    }

    // Setup event handlers
    this.setupEventHandlers();

    // Auto-focus
    if (this.options.autoFocus) {
      requestAnimationFrame(() => this.focus());
    }
  }

  private createInputElement(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = this.options.useCalendarPopup ? 'text' : this.options.type;
    input.className = `${this.options.className}-input zg-datetime-input`;
    input.placeholder = this.options.placeholder;

    if (this.currentValue) {
      if (this.options.useCalendarPopup) {
        input.value = formatDateForDisplay(this.currentValue, this.options.format);
      } else {
        input.value = this.formatForNativeInput(this.currentValue);
      }
    }

    // Set min/max for native picker
    if (!this.options.useCalendarPopup) {
      if (this.options.minDate) {
        input.min = this.formatForNativeInput(this.options.minDate);
      }
      if (this.options.maxDate) {
        input.max = this.formatForNativeInput(this.options.maxDate);
      }
    }

    // ARIA attributes
    input.setAttribute('aria-label', 'Date input');
    if (this.options.required) {
      input.required = true;
      input.setAttribute('aria-required', 'true');
    }

    return input;
  }

  private createPopup(): HTMLDivElement {
    const popup = document.createElement('div');
    popup.className = 'zg-datetime-popup zg-date-editor-popup';
    popup.style.display = 'none';
    popup.style.zIndex = '9999';
    return popup;
  }

  private createCalendarWrapper(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'zg-datetime-calendar-wrapper';
    return wrapper;
  }

  private async initializeCalendar(): Promise<void> {
    if (!this.calendarWrapper) return;

    const { minDate, maxDate } = this.options;

    const calendarOptions: any = {
      type: 'default',
      selectionDatesMode: 'single',
      enableJumpToSelectedDate: true,
      // Follow the editor's theme (default 'light') instead of the library's
      // 'system' default, which would render dark on a dark OS even when the
      // grid is on a light theme. themeAttrDetect:false stops the library from
      // auto-detecting a page attribute and overriding selectedTheme.
      selectedTheme: this.options.theme === 'auto' ? 'system' : this.options.theme || 'light',
      themeAttrDetect: false,
      dateMin: minDate ? formatDateForCalendar(minDate) : '1900-01-01',
      dateMax: maxDate ? formatDateForCalendar(maxDate) : '2099-12-31',
      onClickDate: (self: any, event: any) => {
        const dateEl = (event?.target as HTMLElement)?.closest?.('[data-vc-date]');
        const dateStr = (dateEl as HTMLElement)?.dataset?.['vcDate'] || (self.selectedDates?.[0] ?? null);
        if (dateStr) {
          const selectedDate = new Date(dateStr);
          if (!isNaN(selectedDate.getTime())) {
            this.handleDateSelect(selectedDate);
          }
        }
      },
    };

    if (this.currentValue) {
      calendarOptions.selectedDates = [formatDateForCalendar(this.currentValue)];
      calendarOptions.selectedMonth = this.currentValue.getMonth();
      calendarOptions.selectedYear = this.currentValue.getFullYear();
    }

    try {
      const { Calendar } = await import('vanilla-calendar-pro');
      this.calendar = new Calendar(this.calendarWrapper, calendarOptions);
      this.calendar.init();
    } catch (error) {
      console.error('DateEditor: Failed to load vanilla-calendar-pro:', error);
    }
  }

  private setupEventHandlers(): void {
    if (!this.inputElement) return;

    const cleanupFns: (() => void)[] = [];

    // Input change handler (for native picker)
    if (!this.options.useCalendarPopup) {
      const handleChange = () => {
        const value = this.inputElement?.value;
        if (value) {
          this.currentValue = parseDate(value);
          this.params?.onChange?.(this.currentValue);
        } else {
          this.currentValue = null;
          this.params?.onChange?.(null);
        }
      };
      this.inputElement.addEventListener('change', handleChange);
      cleanupFns.push(() => this.inputElement?.removeEventListener('change', handleChange));
    }

    // Input handler (for popup mode typed values)
    if (this.options.useCalendarPopup) {
      const handleInput = () => {
        const value = this.inputElement?.value.trim() ?? '';
        this.currentValue = value ? parseDate(value) : null;
        this.params?.onChange?.(this.currentValue);
        this.syncCalendarSelection(this.currentValue);
      };
      this.inputElement.addEventListener('input', handleInput);
      cleanupFns.push(() => this.inputElement?.removeEventListener('input', handleInput));
    }

    // Blur handler
    if (this.options.commitOnBlur) {
      const handleBlur = (e: FocusEvent) => {
        if (this.isDestroyed) return;

        // Check if focus is moving to popup
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (this.popup?.contains(relatedTarget) || this.calendarWrapper?.contains(relatedTarget)) {
          return;
        }

        // Commit on blur
        setTimeout(() => {
          if (!this.isDestroyed && !this.popupManager.isOpen(this.popup!)) {
            this.commit();
          }
        }, 100);
      };
      this.inputElement.addEventListener('blur', handleBlur);
      cleanupFns.push(() => this.inputElement?.removeEventListener('blur', handleBlur));
    }

    // Click to show popup
    if (this.options.useCalendarPopup) {
      const handleClick = () => {
        if (!this.popupManager.isOpen(this.popup!)) {
          this.showPopup();
        }
      };
      this.inputElement.addEventListener('click', handleClick);
      cleanupFns.push(() => this.inputElement?.removeEventListener('click', handleClick));
    }

    // Keyboard navigation
    const cleanupKeyboard = setupDatetimeKeyboard(this.container!, {
      onEscape: () => this.cancel(),
      onEnter: () => this.commit(),
    });
    cleanupFns.push(cleanupKeyboard);

    this.cleanup = () => {
      cleanupFns.forEach((fn) => fn());
    };
  }

  private syncCalendarSelection(date: Date | null): void {
    if (!this.calendar) return;

    try {
      if (!this.calendar.settings.selected) {
        this.calendar.settings.selected = { dates: [] };
      }

      this.calendar.settings.selected.dates = date ? [formatDateForCalendar(date)] : [];
      if (typeof this.calendar.update === 'function') {
        this.calendar.update();
      }
    } catch (_error) {
      // Ignore calendar sync errors to avoid breaking typed input.
    }
  }

  private showPopup(): void {
    if (!this.popup || !this.inputElement) return;

    // Build scroll options with grid's scroll container if available
    const scrollOptions: any = {
      closeOnOutOfView: this.options.closeOnScroll,
    };
    if (this.params?.scrollContainer) {
      scrollOptions.additionalScrollContainers = [this.params.scrollContainer];
    }

    this.popupManager.open({
      popup: this.popup,
      anchor: this.inputElement,
      onClose: () => {
        // Popup closed
      },
      additionalElements: this.calendarWrapper ? [this.calendarWrapper] : undefined,
      positionOptions: {
        placement: 'bottom-start',
        offset: 4,
      },
      scrollOptions,
    });
  }

  private hidePopup(): void {
    if (this.popup) {
      this.popupManager.close(this.popup);
    }
  }

  private handleDateSelect(date: Date): void {
    if (this.isDestroyed) return;

    // Validate
    if (this.options.validator) {
      const result = this.options.validator(date);
      if (result !== true) {
        return;
      }
    }

    // Check range
    if (!isDateInRange(date, this.options.minDate, this.options.maxDate)) {
      return;
    }

    this.currentValue = date;

    // Update input
    if (this.inputElement) {
      this.inputElement.value = formatDateForDisplay(date, this.options.format);
    }

    // Notify change
    this.params?.onChange?.(date);

    // Close popup and commit
    this.hidePopup();
    setTimeout(() => this.commit(), 50);
  }

  private formatForNativeInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    switch (this.options.type) {
      case 'datetime-local':
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      case 'time':
        return `${hours}:${minutes}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  private commit(): void {
    if (this.isDestroyed || !this.params) return;

    const validationResult = this.isValid();
    if (
      validationResult === true ||
      (typeof validationResult === 'object' && validationResult.valid)
    ) {
      this.params.onComplete?.(this.currentValue, false);
    }
  }

  private cancel(): void {
    if (this.isDestroyed || !this.params) return;

    this.hidePopup();
    this.params.onComplete?.(this.initialValue, true);
  }

  onKeyDown(event: KeyboardEvent): boolean {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.cancel();
      return true;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.commit();
      return true;
    }

    return true;
  }

  getValue(): Date | null {
    // If input has been modified directly, parse the current value
    if (this.inputElement?.value && this.currentValue === null) {
      const parsed = parseDate(this.inputElement.value);
      if (parsed) {
        this.currentValue = parsed;
      }
    }
    return this.currentValue;
  }

  isValid(): boolean | ValidationResult {
    const value = this.currentValue;

    // Required check
    if (this.options.required && !value) {
      return { valid: false, message: 'Date is required' };
    }

    // Range check
    if (value) {
      if (this.options.minDate && value < this.options.minDate) {
        return { valid: false, message: 'Date is before minimum allowed' };
      }
      if (this.options.maxDate && value > this.options.maxDate) {
        return { valid: false, message: 'Date is after maximum allowed' };
      }
    }

    // Custom validator
    if (this.options.validator) {
      const result = this.options.validator(value);
      if (result === true) {
        return true;
      }
      if (typeof result === 'string') {
        return { valid: false, message: result };
      }
      return { valid: false };
    }

    return true;
  }

  focus(): void {
    this.inputElement?.focus();
  }

  destroy(): void {
    this.isDestroyed = true;

    // Clean up event handlers
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }

    // Close and unregister popup
    if (this.popup) {
      this.hidePopup();
      if (this.params?.unregisterPopup) {
        this.params.unregisterPopup(this.popup);
      }
    }

    // Destroy calendar
    if (this.calendar && typeof this.calendar.destroy === 'function') {
      try {
        this.calendar.destroy();
      } catch (error) {
        // Ignore errors during cleanup
      }
      this.calendar = null;
    }

    // Remove popup from DOM
    this.popup?.remove();

    // Remove input
    this.inputElement?.remove();

    // Clear references
    this.container = null;
    this.inputElement = null;
    this.calendarWrapper = null;
    this.popup = null;
    this.params = null;
    this.initialValue = null;
    this.currentValue = null;
  }
}

/**
 * Factory function to create DateEditor
 */
export function createDateEditor(options: DateEditorOptions = {}): DateEditor {
  return new DateEditor(options);
}
