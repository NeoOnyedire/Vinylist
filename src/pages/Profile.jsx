import { useEffect, useState } from 'react';
import { api } from '../api';
import AlbumCard from '../components/AlbumCard';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

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

      {loading && <p className="text-dim text-sm">Loading your rankings…</p>}

      {!loading && reviews.length === 0 && (
        <div className="text-center py-16">
          <p className="text-dim mb-4">You haven't ranked anything yet.</p>
          <a href="/" className="text-label hover:underline">
            Search for an album to get started
          </a>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {reviews.map((r) => (
          <AlbumCard
            key={r.id}
            rank={r.rank}
            rating={r.rating}
            album={{
              id: r.album_id,
              name: r.album_name,
              artist: r.artist,
              image_url: r.image_url,
            }}
          />
        ))}
      </div>
    </div>
  );
}
