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

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const data = await api.getAlbum(id);
    setAlbum(data);
    if (data.myReview) {
      setRating(data.myReview.rating);
      setReviewText(data.myReview.review_text || '');
    }
  }

  async function handleSave() {
    if (!rating) return;
    setSaving(true);
    setSaved(false);
    try {
      await api.saveReview({ album_id: id, rating, review_text: reviewText });
      setSaved(true);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    try {
      await api.deleteReview(id);
      setRating(0);
      setReviewText('');
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (!album) {
    return <div className="max-w-2xl mx-auto px-6 py-10 text-dim">Loading…</div>;
  }

  const avg = album.stats && album.stats.avg_rating;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link to="/" className="text-sm text-dim hover:text-cream">
        ← Back to search
      </Link>

      <div className="flex gap-6 mt-6 mb-8">
        <div className="w-40 h-40 rounded-lg overflow-hidden bg-surface2 flex-shrink-0">
          {album.image_url && (
            <img src={album.image_url} alt={album.name} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl mb-1">{album.name}</h1>
          <p className="text-dim mb-2">{album.artist}</p>
          <p className="text-xs text-dim mb-4">{album.release_date}</p>
          {avg ? (
            <p className="text-sm">
              <span className="text-label font-display text-xl">{avg.toFixed(1)}</span>
              <span className="text-dim">
                {' '}
                average · {album.stats.review_count} review
                {album.stats.review_count === 1 ? '' : 's'}
              </span>
            </p>
          ) : (
            <p className="text-sm text-dim">No reviews yet — be the first</p>
          )}
        </div>
      </div>

      <div className="bg-surface border border-groove rounded-xl p-6">
        <h2 className="font-display text-lg mb-4">Your rating</h2>
        <GrooveRating value={rating} onChange={setRating} />

        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Write a short review (optional)…"
          rows={4}
          className="w-full mt-4 bg-surface2 border border-groove rounded-lg px-4 py-3 text-cream placeholder:text-dim focus:border-label outline-none transition-colors resize-none"
        />

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={!rating || saving}
            className="px-5 py-2.5 rounded-lg bg-label text-ink font-medium hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : album.myReview ? 'Update review' : 'Save review'}
          </button>
          {album.myReview && (
            <button
              onClick={handleRemove}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg border border-groove text-dim hover:text-cream hover:border-cream transition"
            >
              Remove
            </button>
          )}
          {saved && <span className="text-tape text-sm">Saved ✓</span>}
        </div>
      </div>
    </div>
  );
}
