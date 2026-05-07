export const normalizePositionNumber = (value?: string | number | null): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, '');
};

export const formatPositionNumber = (value?: string | number | null): string => {
  const rawValue = value === null || value === undefined ? '' : String(value).trim();
  const normalized = normalizePositionNumber(rawValue);

  if (!normalized) return '';
  if (!/^\d+$/.test(normalized)) return rawValue;

  if (normalized.length <= 4) return normalized;
  if (normalized.length <= 9) return `${normalized.slice(0, 4)} ${normalized.slice(4)}`;

  return `${normalized.slice(0, 4)} ${normalized.slice(4, 9)} ${normalized.slice(9)}`;
};
