export function formatBuddhistDate(dateString?: string | null): string {
  if (!dateString) return '-';

  const normalized = String(dateString).trim();

  if (/^\d{4}$/.test(normalized)) {
    const year = parseInt(normalized, 10);
    return String(year >= 2400 ? year : year + 543);
  }

  const parts = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (parts) {
    const day = parts[1].padStart(2, '0');
    const month = parts[2].padStart(2, '0');
    const year = parseInt(parts[3], 10);
    const buddhistYear = year >= 2400 ? year : year + 543;

    return `${day}/${month}/${buddhistYear}`;
  }

  const date = new Date(normalized);
  if (!Number.isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear() + 543;

    return `${day}/${month}/${year}`;
  }

  return normalized;
}

export function formatBuddhistDateInput(dateString?: string | null): string {
  const formatted = formatBuddhistDate(dateString);
  return formatted === '-' ? '' : formatted;
}

export function parseBuddhistDateInputToGregorian(dateString?: string | null): string {
  if (!dateString) return '';

  const normalized = String(dateString).trim();
  if (!normalized) return '';

  if (/^\d{4}$/.test(normalized)) {
    const year = parseInt(normalized, 10);
    return String(year >= 2400 ? year - 543 : year);
  }

  const isoParts = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoParts) {
    const year = parseInt(isoParts[1], 10);
    const gregorianYear = year >= 2400 ? year - 543 : year;
    const month = isoParts[2].padStart(2, '0');
    const day = isoParts[3].padStart(2, '0');

    return `${gregorianYear}-${month}-${day}`;
  }

  const displayParts = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (displayParts) {
    const day = displayParts[1].padStart(2, '0');
    const month = displayParts[2].padStart(2, '0');
    const year = parseInt(displayParts[3], 10);
    const gregorianYear = year >= 2400 ? year - 543 : year;

    return `${gregorianYear}-${month}-${day}`;
  }

  return normalized;
}
