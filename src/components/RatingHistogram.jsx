import { ratingDistribution } from '../lib/rankings';

export default function RatingHistogram({ reviews }) {
  if (!reviews.length) return null;
  const buckets = ratingDistribution(reviews);
  const max = Math.max(...buckets.map((b) => b.count));

  return (
    <section
      aria-label="Rating distribution"
      className="mb-6 rounded-2xl border border-groove bg-surface/70 px-4 py-3"
    >
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-dim">
        Rating distribution
      </p>
      <div className="mt-3 flex h-24 items-end gap-1.5" role="list">
        {buckets.map((b) => (
          <div
            key={b.rating}
            role="listitem"
            aria-label={`${b.count} album${b.count === 1 ? '' : 's'} rated ${b.rating.toFixed(1)}`}
            title={`${b.rating.toFixed(1)}: ${b.count}`}
            className="flex h-full flex-1 flex-col justify-end"
          >
            <span className="mb-1 text-center text-[10px] tabular-nums text-dim">
              {b.count || ''}
            </span>
            <div
              className={`w-full rounded-t ${b.count ? 'bg-label' : 'bg-groove/60'}`}
              style={{ height: b.count ? `${Math.max(8, (b.count / max) * 100)}%` : '2px' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5" aria-hidden="true">
        {buckets.map((b) => (
          <span key={b.rating} className="flex-1 text-center text-[10px] tabular-nums text-dim">
            {Number.isInteger(b.rating) ? b.rating : ''}
          </span>
        ))}
      </div>
    </section>
  );
}
