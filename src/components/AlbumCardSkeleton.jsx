// Placeholder rows that mirror AlbumCard's layout while a list is loading.
function SkeletonRow({ withRank }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-groove bg-surface/70 p-3 sm:gap-4">
      {withRank && <div className="h-6 w-8 flex-shrink-0 rounded bg-surface2" />}
      <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-surface2 sm:h-20 sm:w-20" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded bg-surface2" />
        <div className="h-3 w-1/3 rounded bg-surface2" />
      </div>
    </div>
  );
}

export default function AlbumCardSkeleton({ count = 5, withRank = false, label = 'Loading' }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex animate-pulse flex-col gap-2 motion-reduce:animate-none"
    >
      <span className="sr-only">{label}…</span>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} withRank={withRank} />
      ))}
    </div>
  );
}
