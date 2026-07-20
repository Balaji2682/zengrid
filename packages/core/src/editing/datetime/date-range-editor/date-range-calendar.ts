import type { DateRange, ResolvedDateRangeEditorOptions } from './types';
import { formatDateForCalendar } from '../../../datetime-core';

export interface CalendarRefs {
  startCalendar: any;
  endCalendar: any;
}

export interface CalendarHandlers {
  onStartDateSelect: (date: Date) => void;
  onEndDateSelect: (date: Date) => void;
}

export async function initializeCalendars(
  startDiv: HTMLDivElement,
  endDiv: HTMLDivElement,
  options: ResolvedDateRangeEditorOptions,
  currentValue: DateRange,
  handlers: CalendarHandlers
): Promise<CalendarRefs> {
  const { minDate, maxDate } = options;
  const dateMinStr = minDate ? formatDateForCalendar(minDate) : '1900-01-01';
  const dateMaxStr = maxDate ? formatDateForCalendar(maxDate) : '2099-12-31';
  // Follow the editor's theme (default 'light') instead of the library's
  // 'system' default, which would render dark on a dark OS even when the grid
  // is on a light theme. themeAttrDetect:false stops the library from
  // auto-detecting a page attribute and overriding selectedTheme.
  const selectedTheme = options.theme === 'auto' ? 'system' : options.theme || 'light';

  try {
    const { Calendar } = await import('vanilla-calendar-pro');

    const startOptions: any = {
      type: 'default',
      selectionDatesMode: 'single',
      enableJumpToSelectedDate: true,
      selectedTheme,
      themeAttrDetect: false,
      dateMin: dateMinStr,
      dateMax: dateMaxStr,
      selectedDates: currentValue.start
        ? [formatDateForCalendar(currentValue.start)]
        : [],
      selectedMonth: currentValue.start
        ? currentValue.start.getMonth()
        : undefined,
      selectedYear: currentValue.start
        ? currentValue.start.getFullYear()
        : undefined,
      onClickDate(self: any, event: any) {
        const dateEl = event?.target?.closest?.('[data-vc-date]');
        const dateStr = dateEl?.dataset?.vcDate || (self.selectedDates?.[0] ?? null);
        if (dateStr) {
          const selectedDate = new Date(dateStr);
          if (!isNaN(selectedDate.getTime())) {
            handlers.onStartDateSelect(selectedDate);
          }
        }
      },
    };
    const startCalendar = new Calendar(startDiv, startOptions);
    startCalendar.init();

    const endDateMin = currentValue.start
      ? formatDateForCalendar(currentValue.start)
      : dateMinStr;
    const endOptions: any = {
      type: 'default',
      selectionDatesMode: 'single',
      enableJumpToSelectedDate: true,
      selectedTheme,
      themeAttrDetect: false,
      dateMin: endDateMin,
      dateMax: dateMaxStr,
      selectedDates: currentValue.end
        ? [formatDateForCalendar(currentValue.end)]
        : [],
      selectedMonth: currentValue.end
        ? currentValue.end.getMonth()
        : undefined,
      selectedYear: currentValue.end
        ? currentValue.end.getFullYear()
        : undefined,
      onClickDate(self: any, event: any) {
        const dateEl = event?.target?.closest?.('[data-vc-date]');
        const dateStr = dateEl?.dataset?.vcDate || (self.selectedDates?.[0] ?? null);
        if (dateStr) {
          const selectedDate = new Date(dateStr);
          if (!isNaN(selectedDate.getTime())) {
            handlers.onEndDateSelect(selectedDate);
          }
        }
      },
    };
    const endCalendar = new Calendar(endDiv, endOptions);
    endCalendar.init();

    return { startCalendar, endCalendar };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('DateRangeEditor: Failed to load vanilla-calendar-pro:', error);
    return { startCalendar: null, endCalendar: null };
  }
}

export function clearCalendars(
  refs: CalendarRefs,
  options: ResolvedDateRangeEditorOptions
): void {
  if (refs.startCalendar) {
    refs.startCalendar.selectedDates = [];
    refs.startCalendar.update({ dates: true });
  }
  if (refs.endCalendar) {
    refs.endCalendar.selectedDates = [];
    refs.endCalendar.dateMin = options.minDate
      ? formatDateForCalendar(options.minDate)
      : '1900-01-01';
    refs.endCalendar.update({ dates: true });
  }
}

export function updateEndCalendarMinDate(endCalendar: any, date: Date): void {
  if (!endCalendar) return;
  endCalendar.dateMin = formatDateForCalendar(date);
  endCalendar.update({ dates: true });
}

export function resetEndCalendarSelection(endCalendar: any, endDate: Date | null): void {
  if (!endCalendar) return;
  endCalendar.selectedDates = endDate ? [formatDateForCalendar(endDate)] : [];
  endCalendar.update({ dates: true });
}

export function destroyCalendars(refs: CalendarRefs): void {
  if (refs.startCalendar && typeof refs.startCalendar.destroy === 'function') {
    try {
      refs.startCalendar.destroy();
    } catch (_e) {
      // Ignore errors during cleanup
    }
  }
  if (refs.endCalendar && typeof refs.endCalendar.destroy === 'function') {
    try {
      refs.endCalendar.destroy();
    } catch (_e) {
      // Ignore errors during cleanup
    }
  }
}
