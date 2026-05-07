export const WILDCARD_SEARCH_FIELDS_SEPARATOR = '*';

export function getWildcardSearchParts(rawSearch: string) {
  const search = rawSearch.trim();
  const hasWildcard = search.includes(WILDCARD_SEARCH_FIELDS_SEPARATOR);
  const parts = search
    .split(WILDCARD_SEARCH_FIELDS_SEPARATOR)
    .map(part => part.trim())
    .filter(Boolean);

  return { search, hasWildcard, parts };
}

export function matchesWildcardSearch(value: unknown, rawSearch: string) {
  const { search, hasWildcard, parts } = getWildcardSearchParts(rawSearch.toLowerCase());
  if (!search) return true;

  const text = String(value || '').toLowerCase();
  if (!hasWildcard) return text.includes(search);
  if (parts.length === 0) return true;

  return parts.every(part => text.includes(part));
}

export function matchesAnyWildcardSearch(values: unknown[], rawSearch: string) {
  if (!rawSearch.trim()) return true;
  return values.some(value => matchesWildcardSearch(value, rawSearch));
}

export function buildWildcardSearchWhere(fields: readonly string[], rawSearch: string) {
  const { search, hasWildcard, parts } = getWildcardSearchParts(rawSearch);
  if (!search) return null;

  if (!hasWildcard) {
    return {
      OR: fields.map(field => ({
        [field]: { contains: search },
      })),
    };
  }

  if (parts.length === 0) return null;

  return {
    OR: fields.map(field => ({
      AND: parts.map(part => ({
        [field]: { contains: part },
      })),
    })),
  };
}
