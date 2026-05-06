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
