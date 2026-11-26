import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import AlbumCard from '../components/AlbumCard';
import StatsSummary from '../components/StatsSummary';
import RatingHistogram from '../components/RatingHistogram';
import { canvasToBlob, renderTopTenCanvas, shareOrDownloadImage } from '../lib/shareImage';
import { buildBackup, downloadJson, parseBackup } from '../lib/backup';
import { downloadCsv, rankingsToCsv } from '../lib/exportCsv';
import { DEFAULT_SORT, SORT_OPTIONS, filterAndSortReviews, groupByDecade } from '../lib/rankings';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [notice, setNotice] = useState(null); // { kind: 'ok' | 'error', text }
  const fileInputRef = useRef(null);
  // Filter, sort and grouping live in the URL (?q=&sort=&group=decade) so a
  // view survives refresh and can be bookmarked. Defaults are left out.
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const sortParam = searchParams.get('sort');
  const sort = SORT_OPTIONS.some((o) => o.value === sortParam) ? sortParam : DEFAULT_SORT;
  const grouped = searchParams.get('group') === 'decade';

  function updateParams(changes) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  }

  const setQuery = (value) => updateParams({ q: value });
  const setSort = (value) => updateParams({ sort: value === DEFAULT_SORT ? '' : value });
  const toggleGrouped = () => updateParams({ group: grouped ? '' : 'decade' });

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

  function handleExportCsv() {
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`vinylist-rankings-${date}.csv`, rankingsToCsv(reviews));
  }

  function handleExportJson() {
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`vinylist-backup-${date}.json`, buildBackup(reviews));
    setNotice({ kind: 'ok', text: `Saved a backup of ${reviews.length} ranking${reviews.length === 1 ? '' : 's'}.` });
  }

  async function handleShareImage() {
    setSharing(true);
    setNotice(null);
    try {
      const ranked = [...reviews].sort((a, b) => a.rank - b.rank);
      const canvas = await renderTopTenCanvas({ reviews: ranked, displayName: user && user.display_name });
      const blob = await canvasToBlob(canvas);
      const outcome = await shareOrDownloadImage(blob, 'vinylist-top-10.png');
      if (outcome === 'downloaded') setNotice({ kind: 'ok', text: 'Saved your top 10 image.' });
    } catch (err) {
      setNotice({ kind: 'error', text: err.message || 'Could not create the image.' });
    } finally {
      setSharing(false);
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;

    setImporting(true);
    setNotice(null);
    try {
      const entries = parseBackup(await file.text());
      const result = await api.importReviews(entries);
      setReviews((await api.myReviews()) || []);
      const parts = [`Imported ${result.imported}`];
      if (result.skipped) parts.push(`${result.skipped} already ranked`);
      if (result.invalid) parts.push(`${result.invalid} invalid`);
      setNotice({ kind: 'ok', text: `${parts.join(', ')}.` });
    } catch (err) {
      setNotice({ kind: 'error', text: err.message || 'Import failed.' });
    } finally {
      setImporting(false);
    }
  }

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
          <div className="ml-auto flex flex-wrap justify-end gap-1.5">
            {reviews.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleShareImage}
                  disabled={sharing}
                  className="rounded-full border border-groove bg-surface/80 px-3 py-1.5 text-xs font-medium text-dim transition hover:border-label hover:text-cream disabled:opacity-60 sm:text-sm"
                >
                  {sharing ? 'Creating…' : 'Share top 10'}
                </button>
                <button type="button" onClick={handleExportCsv} className="rounded-full border border-groove bg-surface/80 px-3 py-1.5 text-xs font-medium text-dim transition hover:border-label hover:text-cream disabled:opacity-60 sm:text-sm">
                  Export CSV
                </button>
                <button type="button" onClick={handleExportJson} className="rounded-full border border-groove bg-surface/80 px-3 py-1.5 text-xs font-medium text-dim transition hover:border-label hover:text-cream disabled:opacity-60 sm:text-sm">
                  Export JSON
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              disabled={importing}
              className="rounded-full border border-groove bg-surface/80 px-3 py-1.5 text-xs font-medium text-dim transition hover:border-label hover:text-cream disabled:opacity-60 sm:text-sm"
            >
              {importing ? 'Importing…' : 'Import JSON'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
              aria-label="Import rankings from a JSON backup"
            />
          </div>
        </div>
      )}

      {notice && (
        <p
          role="status"
          className={`mb-4 rounded-xl border px-4 py-2.5 text-sm ${
            notice.kind === 'error'
              ? 'border-red-500/40 bg-red-500/10 text-red-200'
              : 'border-tape/40 bg-tape/10 text-cream'
          }`}
        >
          {notice.text}
        </p>
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
            onClick={toggleGrouped}
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
