import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import GrooveRating from '../components/GrooveRating';

const METRIC_LABELS = {
  relatability: 'Relatability',
  production: 'Production',
  replayability: 'Replayability',
};

const DEFAULT_METRICS = {
  relatability: 0,
  production: 0,
  replayability: 0,
};

function parseMetrics(rawMetrics) {
  const next = { ...DEFAULT_METRICS };
  const source = typeof rawMetrics === 'string' ? JSON.parse(rawMetrics) : rawMetrics || {};

  Object.keys(next).forEach((key) => {
    const value = Number(source?.[key]);
    next[key] = Number.isFinite(value) ? value : 0;
  });

  return next;
}

function averageMetrics(metrics) {
  const values = Object.values(metrics).filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default function AlbumDetail() {
  const { id } = useParams();
  const [album, setAlbum] = useState(null);
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [overallRating, setOverallRating] = useState(0);
  const [overrideOverall, setOverrideOverall] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [trackRatings, setTrackRatings] = useState({});
  const [favoriteTrackIds, setFavoriteTrackIds] = useState([]);
  const [savingTracks, setSavingTracks] = useState(false);
  const [tracksSaved, setTracksSaved] = useState(false);
  const [trackError, setTrackError] = useState('');

  useEffect(() => {
    let active = true;
    setAlbum(null);
    load(() => active);
    return () => {
      active = false;
    };
  }, [id]);

  async function load(isActive = () => true) {
    setLoading(true);
    setError('');

    try {
      const data = await api.getAlbum(id);
      if (!data) throw new Error('Album response was empty');
      if (!isActive()) return;

      setAlbum(data);
      const nextTrackRatings = {};
      const nextFavoriteTrackIds = [];
      (data.trackRankings || []).forEach((ranking) => {
        if (ranking.rating !== null && ranking.rating !== undefined) {
          nextTrackRatings[ranking.track_id] = Number(ranking.rating);
        }
        if (ranking.is_favorite) nextFavoriteTrackIds.push(ranking.track_id);
      });
      setTrackRatings(nextTrackRatings);
      setFavoriteTrackIds(nextFavoriteTrackIds);
      setTracksSaved(false);
      setTrackError('');

      if (data.myReview) {
        const reviewMetrics = parseMetrics(data.myReview.metrics);
        const avg = averageMetrics(reviewMetrics);
        const hasOverride = data.myReview.override_overall || Math.abs(Number(data.myReview.rating) - avg) > 0.1;

        setMetrics(reviewMetrics);
        setOverallRating(hasOverride ? Number(data.myReview.rating) || avg : avg);
        setOverrideOverall(hasOverride);
        setReviewText(data.myReview.review_text || '');
      } else {
        setMetrics(DEFAULT_METRICS);
        setOverallRating(0);
        setOverrideOverall(false);
        setReviewText('');
      }
    } catch (err) {
      console.error(err);
      if (isActive()) setError('Could not load this album. Please try again.');
    } finally {
      if (isActive()) setLoading(false);
    }
  }

  async function handleSave() {
    const baseScore = averageMetrics(metrics);
    const finalOverall = overrideOverall ? (overallRating || baseScore) : baseScore;

    if (!finalOverall || finalOverall < 0.5) {
      setError('Rate the album before saving your review.');
      return;
    }

    setSaving(true);
    setSaved(false);
    setError('');

    try {
      await api.saveReview({
        album_id: id,
        rating: finalOverall,
        review_text: reviewText,
        metrics,
        overrideOverall,
      });
      setSaved(true);
      await load();
    } catch (err) {
      console.error(err);
      setError('Could not save your review right now.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    setError('');
    try {
      await api.deleteReview(id);
      setMetrics(DEFAULT_METRICS);
      setOverallRating(0);
      setOverrideOverall(false);
      setReviewText('');
      setSaved(false);
      await load();
    } catch (err) {
      console.error(err);
      setError('Could not remove the review.');
    } finally {
      setSaving(false);
    }
  }

  function handleTrackRating(trackId, rating) {
    setTrackRatings((current) => ({ ...current, [trackId]: rating }));
    setTracksSaved(false);
    setTrackError('');
  }

  function toggleFavorite(trackId) {
    if (favoriteTrackIds.includes(trackId)) {
      setFavoriteTrackIds((current) => current.filter((id) => id !== trackId));
      setTracksSaved(false);
      setTrackError('');
      return;
    }

    if (favoriteTrackIds.length >= 3) {
      setTrackError('You can choose up to 3 favorite songs per album. Remove one first.');
      return;
    }

    setFavoriteTrackIds((current) => [...current, trackId]);
    setTracksSaved(false);
    setTrackError('');
  }

  async function handleSaveTrackRankings() {
    setSavingTracks(true);
    setTracksSaved(false);
    setTrackError('');

    try {
      await api.saveTrackRankings(id, { trackRatings, favoriteTrackIds });
      setTracksSaved(true);
    } catch (err) {
      console.error(err);
      setTrackError('Could not save song rankings. Please try again.');
    } finally {
      setSavingTracks(false);
    }
  }

  if (!album && loading) {
    return <div className="mx-auto max-w-2xl py-10 text-sm text-dim">Loading album…</div>;
  }

  if (!album) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <p className="text-sm text-red-200">{error || 'Could not load this album.'}</p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-4 rounded-xl border border-groove px-4 py-2 text-sm text-cream transition hover:border-label"
        >
          Try again
        </button>
      </div>
    );
  }

  const avg = album.stats && album.stats.avg_rating;
  const computedOverall = averageMetrics(metrics) || 0;
  const finalDisplayedOverall = overrideOverall ? (overallRating || computedOverall) : computedOverall;

  return (
    <div className="mx-auto max-w-2xl py-6 sm:py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-dim transition hover:text-cream">
        <span aria-hidden="true">←</span>
        Back to search
      </Link>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-5 rounded-3xl border border-groove bg-surface/70 p-4 sm:flex-row sm:p-6">
        <div className="h-40 w-full overflow-hidden rounded-2xl bg-surface2 ring-1 ring-white/5 sm:h-48 sm:w-48">
          {album.image_url && (
            <img src={album.image_url} alt={album.name} className="h-full w-full object-cover" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl leading-tight text-cream">{album.name}</h1>
          <p className="mt-2 text-base text-dim">{album.artist}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-dim">{album.release_date}</p>

          <div className="mt-5">
            {avg ? (
              <p className="text-sm text-dim">
                <span className="font-display text-2xl text-label">{avg.toFixed(1)}</span>
                <span className="ml-2">
                  average · {album.stats.review_count} review
                  {album.stats.review_count === 1 ? '' : 's'}
                </span>
              </p>
            ) : (
              <p className="text-sm text-dim">No reviews yet — be the first.</p>
            )}
          </div>
        </div>
      </div>

      {album.tracks && album.tracks.length > 0 && (
        <div className="mt-6 rounded-3xl border border-groove bg-surface/70 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-xl text-cream">Rank the songs</h2>
              <p className="mt-1 text-xs text-dim">Rate each song and choose up to 3 favorites.</p>
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-dim">
              {favoriteTrackIds.length}/3 favorites
            </span>
          </div>
          <ol className="space-y-3">
            {album.tracks.map((track, index) => (
              <li key={track.id || `${track.name}-${index}`} className="rounded-xl border border-groove bg-surface2 px-3 py-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-right text-dim">{index + 1}.</span>
                  <span className="min-w-0 flex-1 truncate text-cream">{track.name}</span>
                  <span className="shrink-0 text-dim">{Math.floor((track.duration_ms || 0) / 60000)}:{String(Math.floor(((track.duration_ms || 0) % 60000) / 1000)).padStart(2, '0')}</span>
                </div>
                {track.id && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pl-8">
                    <GrooveRating
                      value={trackRatings[track.id] || 0}
                      size={20}
                      ariaLabel={`Rate ${track.name}`}
                      onChange={(rating) => handleTrackRating(track.id, rating)}
                    />
                    <button
                      type="button"
                      aria-pressed={favoriteTrackIds.includes(track.id)}
                      aria-label={`${favoriteTrackIds.includes(track.id) ? 'Remove' : 'Add'} ${track.name} ${favoriteTrackIds.includes(track.id) ? 'from' : 'to'} favorites`}
                      onClick={() => toggleFavorite(track.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        favoriteTrackIds.includes(track.id)
                          ? 'border-label bg-label/10 text-label'
                          : 'border-groove text-dim hover:border-label hover:text-cream'
                      }`}
                    >
                      {favoriteTrackIds.includes(track.id) ? '★ Favorite' : '☆ Favorite'}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
          {trackError && (
            <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {trackError}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSaveTrackRankings}
              disabled={savingTracks}
              className="rounded-xl bg-label px-4 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {savingTracks ? 'Saving songs…' : 'Save song rankings'}
            </button>
            {tracksSaved && <span className="text-sm text-tape">Songs saved ✓</span>}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-groove bg-surface/70 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-cream">Your score</h2>
          <div className="flex items-center gap-2 rounded-full border border-groove bg-surface2 px-3 py-1.5 text-sm text-label">
            <span>{finalDisplayedOverall ? finalDisplayedOverall.toFixed(1) : '–'}</span>
            <span className="text-dim">/ 5</span>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {Object.entries(METRIC_LABELS).map(([key, label]) => (
            <div key={key} className="rounded-2xl border border-groove bg-surface2 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-cream">{label}</span>
                <span className="text-xs text-dim">{metrics[key] ? metrics[key].toFixed(1) : '0.0'}</span>
              </div>
              <GrooveRating value={metrics[key]} size={24} onChange={(value) => setMetrics((current) => ({ ...current, [key]: value }))} />
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-groove bg-surface2 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-cream">Overall score</p>
              <p className="text-xs text-dim">Average of the metrics unless you override it.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!overrideOverall) {
                  setOverallRating(computedOverall || 0);
                }
                setOverrideOverall((current) => !current);
              }}
              className="rounded-full border border-label px-3 py-1.5 text-xs font-medium text-label"
            >
              {overrideOverall ? 'Using override' : 'Override'}
            </button>
          </div>

          {overrideOverall && (
            <div className="mt-3">
              <GrooveRating value={overallRating || computedOverall || 0} size={26} onChange={setOverallRating} />
            </div>
          )}
        </div>

        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Write a short review (optional)…"
          rows={4}
          className="mt-4 w-full resize-none rounded-2xl border border-groove bg-surface2 px-4 py-3 text-cream placeholder:text-dim focus:border-label focus:outline-none"
        />

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-label px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? 'Saving…' : album.myReview ? 'Update review' : 'Save review'}
          </button>

          {album.myReview && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={saving}
              className="rounded-xl border border-groove px-5 py-3 text-sm text-dim transition hover:border-cream hover:text-cream disabled:cursor-not-allowed disabled:opacity-45"
            >
              Remove
            </button>
          )}

          {saved && <span className="text-sm text-tape">Saved ✓</span>}
        </div>
      </div>
    </div>
  );
}
