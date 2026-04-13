/**
 * Normalization helpers — used at every data boundary (import, API write, export).
 */

export function normalizePlate(v) {
  if (v == null || v === '') return '';
  return String(v).replace(/\s+/g, '').toUpperCase();
}

export function normalizeDate(v) {
  if (v == null || v === '' || v === '-') return '';

  // Already YYYY-MM-DD
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // JS Date object (from exceljs)
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    return v.toISOString().slice(0, 10);
  }

  // Excel serial number (number > 25000 is likely a date serial)
  if (typeof v === 'number' && v > 25000 && v < 100000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + v * 86400000);
    return d.toISOString().slice(0, 10);
  }

  const s = String(v).trim();

  // DD/MM/YYYY or D/M/YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD/MM/YY or D/M/YY
  const dmy2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if (dmy2) {
    const [, d, m, y] = dmy2;
    const fullYear = parseInt(y) > 50 ? '19' + y : '20' + y;
    return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try parsing as a date string
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch (e) { /* ignore */ }

  return '';
}

export function normalizeMonth(v) {
  const d = normalizeDate(v);
  if (!d) return '';
  return d.slice(0, 7) + '-01';
}

export function normalizeAmount(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  if (typeof v === 'object') return 0; // handles [object Object] from formula cells
  const s = String(v).replace(/[£,\s]/g, '').replace(/[()]/g, '-').trim();
  if (s === '' || s === '-') return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function normalizeString(v) {
  if (v == null) return '';
  if (typeof v === 'object') return '';
  return String(v).trim();
}
