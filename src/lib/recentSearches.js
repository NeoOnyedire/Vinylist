// Recent album searches, kept per browser in localStorage.
// Storage can be unavailable or throw (private windows, blocked site data),
// so every access is wrapped and the feature quietly does nothing if it fails.

const KEY = 'vinylist_recent_searches';
export const MAX_RECENT = 6;

export function getRecentSearches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((t) => typeof t === 'string' && t.trim()).slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore: recent searches are a convenience only
  }
  return list;
}

// Newest first, case-insensitive de-duplication, capped at MAX_RECENT.
export function addRecentSearch(term) {
  const value = String(term || '').trim();
  if (!value) return getRecentSearches();
  const rest = getRecentSearches().filter((t) => t.toLowerCase() !== value.toLowerCase());
  return save([value, ...rest].slice(0, MAX_RECENT));
}

export function removeRecentSearch(term) {
  return save(getRecentSearches().filter((t) => t !== term));
}

export function clearRecentSearches() {
  return save([]);
}
