import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import GrooveRating from '../components/GrooveRating';

export default function AlbumDetail() {
  const { id } = useParams();
  const [album, setAlbum] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const data = await api.getAlbum(id);
    setAlbum(data);
    if (data?.myReview) {
      setRating(data.myReview.rating);
      setReviewText(data.myReview.review_text || '');
    } else {
      setRating(0);
      setReviewText('');
    }
  }

  async function handleSave() {
    if (!rating) {
      setError('Pick a rating before saving your review.');
      return;
    }

    setSaving(true);
    setSaved(false);
    setError('');

    try {
      await api.saveReview({ album_id: id, rating, review_text: reviewText });
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
      setRating(0);
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

  if (!album) {
    return <div className="mx-auto max-w-2xl py-10 text-sm text-dim">Loading album…</div>;
  }

  const avg = album.stats && album.stats.avg_rating;

  return (
    <div className="mx-auto max-w-2xl py-6 sm:py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-dim transition hover:text-cream">
        <span aria-hidden="true">←</span>
        Back to search
      </Link>

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

      <div className="mt-6 rounded-3xl border border-groove bg-surface/70 p-4 sm:p-6">
        <h2 className="font-display text-xl text-cream">Your rating</h2>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-groove bg-surface2 px-3 py-3 sm:px-4">
          <GrooveRating value={rating} onChange={setRating} />
          {rating > 0 && <span className="text-sm text-label">{rating.toFixed(1)}/5</span>}
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
            disabled={!rating || saving}
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
