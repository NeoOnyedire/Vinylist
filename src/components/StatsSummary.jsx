import { computeStats } from '../lib/rankings';

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-groove bg-surface/70 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-dim">{label}</p>
      <p className="mt-1 font-display text-2xl text-cream">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-dim">{hint}</p>}
    </div>
  );
}

export default function StatsSummary({ reviews }) {
  if (!reviews.length) return null;
  const { count, average, topDecade, topDecadeCount } = computeStats(reviews);

  return (
    <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
      <Stat label="Ranked" value={count} />
      <Stat label="Average" value={average.toFixed(1)} hint="out of 5" />
      <Stat
        label="Top decade"
        value={topDecade === null ? '–' : `${topDecade}s`}
        hint={topDecade === null ? null : `${topDecadeCount} album${topDecadeCount === 1 ? '' : 's'}`}
      />
    </div>
  );
}
