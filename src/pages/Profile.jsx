import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import AlbumCard from '../components/AlbumCard';
import StatsSummary from '../components/StatsSummary';
import RatingHistogram from '../components/RatingHistogram';
import { SORT_OPTIONS, filterAndSortReviews, groupByDecade } from '../lib/rankings';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('rating-desc');
  const [grouped, setGrouped] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [me, myReviews] = await Promise.all([api.me(), api.myReviews()]);
        setUser(me);
        setReviews(myReviews || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = useMemo(
    () => filterAndSortReviews(reviews, { query, sort }),
    [reviews, query, sort]
  );

  const groups = useMemo(() => (grouped ? groupByDecade(visible) : []), [grouped, visible]);

  function renderCard(r) {
    return (
      <AlbumCard
        key={r.id}
        rank={r.rank}
        rating={r.rating}
        album={{
          id: r.album_id,
          name: r.album_name,
          artist: r.artist,
          image_url: r.image_url,
          release_date: r.release_date,
        }}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {user && (
        <div className="flex items-center gap-4 mb-8">
          {user.avatar_url && (
            <img
              src={user.avatar_url}
              alt={user.display_name}
              className="w-14 h-14 rounded-full object-cover"
            />
          )}
          <div>
            <h1 className="font-display text-2xl">{user.display_name}</h1>
            <p className="text-dim text-sm">
              {reviews.length} album{reviews.length === 1 ? '' : 's'} ranked
            </p>
          </div>
        </div>
      )}

      <StatsSummary reviews={reviews} />
      <RatingHistogram reviews={reviews} />

      {loading && <p className="text-dim text-sm">Loading your rankings…</p>}

      {!loading && reviews.length === 0 && (
        <div className="text-center py-16">
          <p className="text-dim mb-4">You haven't ranked anything yet.</p>
          <a href="/" className="text-label hover:underline">
            Search for an album to get started
          </a>
        </div>
      )}

      {reviews.length > 1 && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by album or artist…"
            aria-label="Filter rankings"
            className="flex-1 rounded-xl border border-groove bg-surface2 px-4 py-2.5 text-sm text-cream placeholder:text-dim focus:border-label focus:outline-none"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort rankings"
            className="rounded-xl border border-groove bg-surface2 px-3 py-2.5 text-sm text-cream focus:border-label focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setGrouped((g) => !g)}
            aria-pressed={grouped}
            className={`rounded-xl border px-3 py-2.5 text-sm transition ${
              grouped
                ? 'border-label bg-label/15 text-label'
                : 'border-groove bg-surface2 text-dim hover:border-label hover:text-cream'
            }`}
          >
            By decade
          </button>
        </div>
      )}

      {query.trim() && visible.length === 0 && reviews.length > 0 && (
        <p className="py-8 text-center text-sm text-dim">
          No ranked albums match “{query.trim()}”.
        </p>
      )}

      {grouped ? (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.decade ?? 'unknown'} aria-label={g.decade === null ? 'Unknown year' : `${g.decade}s`}>
              <h2 className="mb-2 flex items-baseline gap-2 font-display text-lg text-cream">
                {g.decade === null ? 'Unknown year' : `${g.decade}s`}
                <span className="text-xs font-body text-dim">
                  {g.items.length} album{g.items.length === 1 ? '' : 's'}
                </span>
              </h2>
              <div className="flex flex-col gap-1">{g.items.map(renderCard)}</div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1">{visible.map(renderCard)}</div>
      )}
    </div>
  );
}
