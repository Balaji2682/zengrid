/**
 * Date formatting utilities
 *
 * Provides flexible formatting for various date display formats.
 */

/**
 * Format a date according to a format string
 *
 * Supported tokens:
 * - YYYY: 4-digit year
 * - YY: 2-digit year
 * - MMMM: Full month name (January-December)
 * - MMM: Short month name (Jan-Dec)
 * - MM: 2-digit month (01-12)
 * - M: Month without leading zero (1-12)
 * - DD: 2-digit day (01-31)
 * - D: Day without leading zero (1-31)
 * - HH: 2-digit hour (00-23)
 * - H: Hour without leading zero (0-23)
 * - hh: 2-digit hour 12-hour (01-12)
 * - h: Hour 12-hour without leading zero (1-12)
 * - mm: 2-digit minute (00-59)
 * - m: Minute without leading zero (0-59)
 * - ss: 2-digit second (00-59)
 * - s: Second without leading zero (0-59)
 * - A: AM/PM
 * - a: am/pm
 */
export function formatDate(date: Date, format: string): string {
  if (!date || isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const hours12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';

  const pad = (n: number): string => String(n).padStart(2, '0');

  // Single-pass tokenizer: alternation is ordered longest-token-first so
  // multi-char tokens (YYYY/MMMM/MMM/MM) match before their shorter prefixes,
  // and each token is substituted exactly once — literal text is left intact.
  const tokens: Record<string, string> = {
    YYYY: String(year),
    YY: String(year).slice(-2),
    MMMM: MONTH_NAMES[month - 1],
    MMM: MONTH_NAMES_SHORT[month - 1],
    MM: pad(month),
    M: String(month),
    DD: pad(day),
    D: String(day),
    HH: pad(hours),
    H: String(hours),
    hh: pad(hours12),
    h: String(hours12),
    mm: pad(minutes),
    m: String(minutes),
    ss: pad(seconds),
    s: String(seconds),
    A: ampm,
    a: ampm.toLowerCase(),
  };

  return format.replace(
    /YYYY|YY|MMMM|MMM|MM|M|DD|D|HH|H|hh|h|mm|m|ss|s|A|a/g,
    (token) => tokens[token]
  );
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Format a date for display (common formats)
 */
export function formatDateForDisplay(date: Date | null, format: string = 'DD/MM/YYYY'): string {
  if (!date) return '';
  return formatDate(date, format);
}

/**
 * Format a time for display
 */
export function formatTime(date: Date, use24Hour: boolean = true): string {
  if (!date || isNaN(date.getTime())) {
    return '';
  }

  if (use24Hour) {
    return formatDate(date, 'HH:mm');
  } else {
    return formatDate(date, 'h:mm A');
  }
}

/**
 * Format a datetime for display
 */
export function formatDateTime(
  date: Date | null,
  dateFormat: string = 'DD/MM/YYYY',
  timeFormat: string = 'HH:mm'
): string {
  if (!date) return '';
  return `${formatDate(date, dateFormat)} ${formatDate(date, timeFormat)}`;
}

/**
 * Format a date range for display
 */
export function formatDateRange(
  startDate: Date | null,
  endDate: Date | null,
  format: string = 'DD/MM/YYYY',
  separator: string = ' - '
): string {
  const start = startDate ? formatDate(startDate, format) : '';
  const end = endDate ? formatDate(endDate, format) : '';

  if (!start && !end) return '';
  if (!start) return end;
  if (!end) return start;

  return `${start}${separator}${end}`;
}

/**
 * Get relative time string (e.g., "2 days ago", "in 3 hours")
 */
export function getRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffWeeks = Math.round(diffDays / 7);
  const diffMonths = Math.round(diffDays / 30);
  const diffYears = Math.round(diffDays / 365);

  const isFuture = diffMs > 0;
  const abs = Math.abs;

  if (abs(diffSecs) < 60) {
    return 'just now';
  }

  if (abs(diffMins) < 60) {
    const n = abs(diffMins);
    return isFuture
      ? `in ${n} minute${n === 1 ? '' : 's'}`
      : `${n} minute${n === 1 ? '' : 's'} ago`;
  }

  if (abs(diffHours) < 24) {
    const n = abs(diffHours);
    return isFuture ? `in ${n} hour${n === 1 ? '' : 's'}` : `${n} hour${n === 1 ? '' : 's'} ago`;
  }

  if (abs(diffDays) < 7) {
    const n = abs(diffDays);
    return isFuture ? `in ${n} day${n === 1 ? '' : 's'}` : `${n} day${n === 1 ? '' : 's'} ago`;
  }

  if (abs(diffWeeks) < 4) {
    const n = abs(diffWeeks);
    return isFuture ? `in ${n} week${n === 1 ? '' : 's'}` : `${n} week${n === 1 ? '' : 's'} ago`;
  }

  if (abs(diffMonths) < 12) {
    const n = abs(diffMonths);
    return isFuture ? `in ${n} month${n === 1 ? '' : 's'}` : `${n} month${n === 1 ? '' : 's'} ago`;
  }

  const n = abs(diffYears);
  return isFuture ? `in ${n} year${n === 1 ? '' : 's'}` : `${n} year${n === 1 ? '' : 's'} ago`;
}

/**
 * Get human-readable date label (e.g., "Today", "Yesterday", "Tomorrow", or formatted date)
 */
export function getDateLabel(date: Date, format: string = 'DD/MM/YYYY'): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.round((dateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  return formatDate(date, format);
}
