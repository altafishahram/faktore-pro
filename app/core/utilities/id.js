/**
 * ID & Date Utilities
 */

/**
 * Generate a stable unique ID
 * @param {string} [prefix]
 * @returns {string}
 */
export function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Format number as Persian digits
 * @param {number|string} num
 * @returns {string}
 */
export function toPersianDigits(num) {
  if (num == null) return '';
  const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/\d/g, (d) => persian[parseInt(d, 10)]);
}

/**
 * Format currency (centralized)
 * @param {number} amount
 * @param {string} [currency='تومان']
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'تومان') {
  if (amount == null || isNaN(amount)) return `۰ ${currency}`;
  const formatted = new Intl.NumberFormat('fa-IR').format(Math.round(amount));
  return `${formatted} ${currency}`;
}

/**
 * Format date as Jalali (Shamsi) e.g. ۱۴۰۴/۰۶/۲۹
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '';
  try {
    // Prefer persian calendar via Intl when available
    const d = typeof date === 'string'
      ? new Date(date.includes('T') ? date : date + 'T12:00:00')
      : date;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  }
}

/**
 * Debounce helper
 */
export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
