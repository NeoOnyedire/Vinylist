import { Link } from 'react-router-dom';

export default function AlbumCard({ album, rank, rating }) {
  return (
    <Link
      to={`/album/${album.id}`}
      className="group flex gap-4 items-center p-3 rounded-lg hover:bg-surface transition-colors"
    >
      {rank && (
        <span className="font-display text-2xl text-dim w-8 text-right flex-shrink-0">
          {rank}
        </span>
      )}
      <div className="w-16 h-16 rounded overflow-hidden bg-surface2 flex-shrink-0">
        {album.image_url ? (
          <img
            src={album.image_url}
            alt={`${album.name} cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-dim text-xs">
            No cover
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-cream truncate group-hover:text-label transition-colors">
          {album.name}
        </p>
        <p className="text-sm text-dim truncate">{album.artist}</p>
      </div>
      {typeof rating === 'number' && (
        <span className="text-label font-display text-lg flex-shrink-0">
          {rating.toFixed(1)}
        </span>
      )}
    </Link>
  );
}
