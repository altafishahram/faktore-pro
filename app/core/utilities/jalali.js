/**
 * Jalali (Persian / Shamsi) date helpers — zero dependency
 */

function div(a, b) {
  return Math.floor(a / b);
}

/** Gregorian → Jalali [jy, jm, jd] */
export function toJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    div(gy2 + 3, 4) -
    div(gy2 + 99, 100) +
    div(gy2 + 399, 400) +
    gd +
    g_d_m[gm - 1];
  let jy = -1595 + 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

/** Jalali → Gregorian [gy, gm, gd] */
export function toGregorian(jy, jm, jd) {
  jy += 1595;
  let days =
    -355668 +
    365 * jy +
    div(jy, 33) * 8 +
    div((jy % 33) + 3, 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ];
  let gm = 0;
  for (gm = 1; gm <= 12 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return [gy, gm, gd];
}

export function isoToJalaliParts(iso) {
  if (!iso) {
    const n = new Date();
    return toJalali(n.getFullYear(), n.getMonth() + 1, n.getDate());
  }
  const d = new Date(iso.includes('T') ? iso : iso + 'T12:00:00');
  if (isNaN(d.getTime())) {
    const n = new Date();
    return toJalali(n.getFullYear(), n.getMonth() + 1, n.getDate());
  }
  return toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function jalaliPartsToIso(jy, jm, jd) {
  const [gy, gm, gd] = toGregorian(Number(jy), Number(jm), Number(jd));
  const mm = String(gm).padStart(2, '0');
  const dd = String(gd).padStart(2, '0');
  return `${gy}-${mm}-${dd}`;
}

export function formatJalali(isoOrDate) {
  if (!isoOrDate) return '';
  const d = typeof isoOrDate === 'string'
    ? new Date(isoOrDate.includes('T') ? isoOrDate : isoOrDate + 'T12:00:00')
    : isoOrDate;
  if (isNaN(d.getTime())) return '';
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const toFa = (n) => String(n).padStart(2, '0').replace(/\d/g, (x) => persian[+x]);
  return `${toFa(jy)}/${toFa(jm)}/${toFa(jd)}`;
}

const MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

/**
 * Render three selects for Jalali date into a container element id
 * @returns {Function} getIso() current value as YYYY-MM-DD
 */
export function mountJalaliDatePicker(container, initialIso, onChange) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return () => '';

  let [jy, jm, jd] = isoToJalaliParts(initialIso);
  const now = new Date();
  const [cy] = toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const years = [];
  for (let y = cy - 5; y <= cy + 2; y++) years.push(y);

  const daysInMonth = (y, m) => {
    if (m <= 6) return 31;
    if (m <= 11) return 30;
    // Esfand: leap approx
    const [gy] = toGregorian(y, 12, 1);
    // simplified: 29 or 30
    const next = toGregorian(y + 1, 1, 1);
    // use algorithm: esfand has 30 in leap
    const leap = [1, 5, 9, 13, 17, 22, 26, 30].includes(y % 33);
    return leap ? 30 : 29;
  };

  function render() {
    const dim = daysInMonth(jy, jm);
    if (jd > dim) jd = dim;
    el.innerHTML = `
      <div class="jalali-picker" style="display:flex;gap:8px;flex-wrap:nowrap;align-items:center;">
        <select class="form-input j-day" style="flex:1;min-width:0;padding:10px 8px;" aria-label="روز">
          ${Array.from({ length: dim }, (_, i) => i + 1)
            .map((d) => `<option value="${d}" ${d === jd ? 'selected' : ''}>${d}</option>`)
            .join('')}
        </select>
        <select class="form-input j-month" style="flex:1.4;min-width:0;padding:10px 8px;" aria-label="ماه">
          ${MONTH_NAMES.map((name, i) => `<option value="${i + 1}" ${i + 1 === jm ? 'selected' : ''}>${name}</option>`).join('')}
        </select>
        <select class="form-input j-year" style="flex:1.2;min-width:0;padding:10px 8px;" aria-label="سال">
          ${years.map((y) => `<option value="${y}" ${y === jy ? 'selected' : ''}>${y}</option>`).join('')}
        </select>
      </div>
    `;
    el.querySelector('.j-day').onchange = (e) => {
      jd = Number(e.target.value);
      notify();
    };
    el.querySelector('.j-month').onchange = (e) => {
      jm = Number(e.target.value);
      render();
      notify();
    };
    el.querySelector('.j-year').onchange = (e) => {
      jy = Number(e.target.value);
      render();
      notify();
    };
  }

  function notify() {
    const iso = jalaliPartsToIso(jy, jm, jd);
    if (onChange) onChange(iso);
  }

  render();
  return () => jalaliPartsToIso(jy, jm, jd);
}
