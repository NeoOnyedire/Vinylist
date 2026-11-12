import { Link } from 'react-router-dom';

export default function AlbumCard({ album, rank, rating }) {
  return (
    <Link
      to={`/album/${album.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-groove bg-surface/70 p-3 text-left transition hover:-translate-y-0.5 hover:border-label hover:bg-surface sm:gap-4"
    >
      {typeof rank === 'number' && (
        <span className="w-8 flex-shrink-0 text-right font-display text-2xl text-dim">
          {rank}
        </span>
      )}

      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-surface2 ring-1 ring-white/5 sm:h-20 sm:w-20">
        {album.image_url ? (
          <img
            src={album.image_url}
            alt={`${album.name} cover`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-dim">
            No cover
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-cream transition group-hover:text-label">
          {album.name}
        </p>
        <p className="truncate text-sm text-dim">{album.artist}</p>
      </div>

      {typeof rating === 'number' && (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-label/15 text-sm font-semibold text-label">
          {rating.toFixed(1)}
        </div>
      )}
    </Link>
  );
}
