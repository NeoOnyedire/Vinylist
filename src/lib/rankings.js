// Pure helpers for ordering and filtering a user's ranked albums.
// Each review keeps its `rank` (position in the full list), so a filtered
// view still shows each album's true overall rank.

export const SORT_OPTIONS = [
  { value: 'rating-desc', label: 'Highest rated' },
  { value: 'rating-asc', label: 'Lowest rated' },
  { value: 'recent', label: 'Recently updated' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'artist', label: 'Artist A–Z' },
  { value: 'year-desc', label: 'Newest release' },
  { value: 'year-asc', label: 'Oldest release' },
];

export function releaseYear(item) {
  const year = parseInt(String(item?.release_date || '').slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function byText(a, b) {
  return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' });
}

// Albums with an unknown year always sort last, whichever direction is chosen.
function byYear(direction) {
  return (a, b) => {
    const ya = releaseYear(a);
    const yb = releaseYear(b);
    if (ya === null && yb === null) return 0;
    if (ya === null) return 1;
    if (yb === null) return -1;
    return direction === 'asc' ? ya - yb : yb - ya;
  };
}

const COMPARATORS = {
  'rating-desc': (a, b) => Number(b.rating) - Number(a.rating) || a.rank - b.rank,
  'rating-asc': (a, b) => Number(a.rating) - Number(b.rating) || b.rank - a.rank,
  recent: (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0),
  title: (a, b) => byText(a.album_name, b.album_name),
  artist: (a, b) => byText(a.artist, b.artist) || byText(a.album_name, b.album_name),
  'year-desc': byYear('desc'),
  'year-asc': byYear('asc'),
};

export function filterAndSortReviews(reviews, { query = '', sort = 'rating-desc' } = {}) {
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? reviews.filter(
        (r) =>
          String(r.album_name || '').toLowerCase().includes(needle) ||
          String(r.artist || '').toLowerCase().includes(needle)
      )
    : reviews;

  const compare = COMPARATORS[sort] || COMPARATORS['rating-desc'];
  return [...filtered].sort(compare);
}

// Summary numbers for the profile header.
// topDecade is the decade holding the most ranked albums (ties go to the more
// recent decade); albums with an unknown release year are ignored for it.
export function computeStats(reviews) {
  const count = reviews.length;
  if (!count) return { count: 0, average: null, topDecade: null, topDecadeCount: 0 };

  const total = reviews.reduce((sum, r) => sum + Number(r.rating), 0);

  const decades = new Map();
  for (const r of reviews) {
    const year = releaseYear(r);
    if (year === null) continue;
    const decade = Math.floor(year / 10) * 10;
    decades.set(decade, (decades.get(decade) || 0) + 1);
  }

  let topDecade = null;
  let topDecadeCount = 0;
  for (const [decade, n] of decades) {
    if (n > topDecadeCount || (n === topDecadeCount && decade > topDecade)) {
      topDecade = decade;
      topDecadeCount = n;
    }
  }

  return { count, average: total / count, topDecade, topDecadeCount };
}

// Counts of reviews per rating bucket, from 0.5 to 5 in half-point steps.
// Ratings are snapped to the nearest half so stray values still land in a bucket.
export function ratingDistribution(reviews) {
  const buckets = Array.from({ length: 10 }, (_, i) => ({ rating: (i + 1) / 2, count: 0 }));
  for (const r of reviews) {
    if (r.rating === null || r.rating === undefined || r.rating === '') continue;
    const value = Number(r.rating);
    if (!Number.isFinite(value)) continue;
    const index = Math.min(9, Math.max(0, Math.round(value * 2) - 1));
    buckets[index].count += 1;
  }
  return buckets;
}

// Split an already-sorted list into decade groups, newest decade first.
// Order inside each group is preserved; albums with no known year go in a
// final group with decade: null.
export function groupByDecade(reviews) {
  const groups = new Map();
  for (const r of reviews) {
    const year = releaseYear(r);
    const decade = year === null ? null : Math.floor(year / 10) * 10;
    if (!groups.has(decade)) groups.set(decade, []);
    groups.get(decade).push(r);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : b - a))
    .map(([decade, items]) => ({ decade, items }));
}
