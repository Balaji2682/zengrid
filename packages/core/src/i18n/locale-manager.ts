/**
 * Locale configuration
 */
export interface LocaleConfig {
  /**
   * Locale code (e.g., 'en-US', 'ar-SA')
   */
  code: string;

  /**
   * Text direction
   */
  direction: 'ltr' | 'rtl';

  /**
   * Decimal separator
   */
  decimalSeparator: string;

  /**
   * Thousands separator
   */
  thousandsSeparator: string;

  /**
   * Date format
   */
  dateFormat: string;

  /**
   * Time format
   */
  timeFormat: string;

  /**
   * First day of week (0 = Sunday, 1 = Monday)
   */
  firstDayOfWeek: number;

  /**
   * Translations
   */
  translations?: Record<string, string>;
}

/**
 * Built-in locales
 */
const LOCALES: Record<string, LocaleConfig> = {
  'en-US': {
    code: 'en-US',
    direction: 'ltr',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'h:mm A',
    firstDayOfWeek: 0,
  },
  'en-GB': {
    code: 'en-GB',
    direction: 'ltr',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    firstDayOfWeek: 1,
  },
  'ar-SA': {
    code: 'ar-SA',
    direction: 'rtl',
    decimalSeparator: '٫',
    thousandsSeparator: '٬',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'h:mm A',
    firstDayOfWeek: 6,
  },
  'he-IL': {
    code: 'he-IL',
    direction: 'rtl',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    firstDayOfWeek: 0,
  },
  'de-DE': {
    code: 'de-DE',
    direction: 'ltr',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    firstDayOfWeek: 1,
  },
  'fr-FR': {
    code: 'fr-FR',
    direction: 'ltr',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    firstDayOfWeek: 1,
  },
  'ja-JP': {
    code: 'ja-JP',
    direction: 'ltr',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: 'HH:mm',
    firstDayOfWeek: 0,
  },
  'zh-CN': {
    code: 'zh-CN',
    direction: 'ltr',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: 'HH:mm',
    firstDayOfWeek: 1,
  },
};

/**
 * LocaleManager - Manages localization and formatting
 *
 * Provides locale-aware formatting for numbers, dates, and text.
 * Supports custom locales and translations.
 *
 * @example
 * ```typescript
 * const locale = new LocaleManager('ar-SA');
 *
 * // Format number
 * const formatted = locale.formatNumber(1234.56);
 * // Returns: '١٬٢٣٤٫٥٦' (Arabic numerals)
 *
 * // Get direction
 * const dir = locale.getDirection(); // 'rtl'
 *
 * // Translate string
 * const text = locale.translate('loading');
 * ```
 */
export class LocaleManager {
  private locale: LocaleConfig;
  private numberFormatter: Intl.NumberFormat;
  private dateFormatter: Intl.DateTimeFormat;

  constructor(localeCode: string = 'en-US') {
    this.locale = LOCALES[localeCode] || LOCALES['en-US'];

    // Initialize formatters
    this.numberFormatter = new Intl.NumberFormat(this.locale.code);
    this.dateFormatter = new Intl.DateTimeFormat(this.locale.code);
  }

  /**
   * Get current locale code
   */
  getLocaleCode(): string {
    return this.locale.code;
  }

  /**
   * Get text direction
   */
  getDirection(): 'ltr' | 'rtl' {
    return this.locale.direction;
  }

  /**
   * Format a number
   * @param value - Number to format
   * @param options - Intl.NumberFormat options
   */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    if (options) {
      const formatter = new Intl.NumberFormat(this.locale.code, options);
      return formatter.format(value);
    }

    return this.numberFormatter.format(value);
  }

  /**
   * Format a date
   * @param date - Date to format
   * @param options - Intl.DateTimeFormat options
   */
  formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    if (options) {
      const formatter = new Intl.DateTimeFormat(this.locale.code, options);
      return formatter.format(date);
    }

    return this.dateFormatter.format(date);
  }

  /**
   * Format currency
   * @param value - Amount
   * @param currency - Currency code (e.g., 'USD', 'EUR')
   */
  formatCurrency(value: number, currency: string): string {
    const formatter = new Intl.NumberFormat(this.locale.code, {
      style: 'currency',
      currency,
    });

    return formatter.format(value);
  }

  /**
   * Format percentage
   * @param value - Percentage value (0-1)
   */
  formatPercent(value: number): string {
    const formatter = new Intl.NumberFormat(this.locale.code, {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    return formatter.format(value);
  }

  /**
   * Get decimal separator
   */
  getDecimalSeparator(): string {
    return this.locale.decimalSeparator;
  }

  /**
   * Get thousands separator
   */
  getThousandsSeparator(): string {
    return this.locale.thousandsSeparator;
  }

  /**
   * Get first day of week
   */
  getFirstDayOfWeek(): number {
    return this.locale.firstDayOfWeek;
  }

  /**
   * Translate a string
   * @param key - Translation key
   * @param fallback - Fallback text if not found
   */
  translate(key: string, fallback?: string): string {
    return this.locale.translations?.[key] ?? fallback ?? key;
  }

  /**
   * Register a custom locale
   * @param config - Locale configuration
   */
  static registerLocale(config: LocaleConfig): void {
    LOCALES[config.code] = config;
  }

  /**
   * Get available locales
   */
  static getAvailableLocales(): string[] {
    return Object.keys(LOCALES);
  }
}
