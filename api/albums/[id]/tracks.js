const { getPool } = require('../../_lib/db');
const { requireAuth } = require('../../_lib/auth');

function isValidRating(value) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0.5 &&
    value <= 5 &&
    Number.isInteger(value * 2)
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).end();
  const user = requireAuth(req, res);
  if (!user) return;

  const albumId = req.query.id;
  const { trackRatings, favoriteTrackIds } = req.body || {};

  if (
    typeof albumId !== 'string' ||
    !albumId ||
    !trackRatings ||
    typeof trackRatings !== 'object' ||
    Array.isArray(trackRatings) ||
    !Array.isArray(favoriteTrackIds)
  ) {
    return res.status(400).json({ error: 'Track ratings and favorite track IDs are required' });
  }

  const ratingEntries = Object.entries(trackRatings);
  const hasInvalidTrackId = (trackId) =>
    typeof trackId !== 'string' || !trackId.trim() || trackId.length > 128;
  if (
    ratingEntries.some(
      ([trackId, rating]) => hasInvalidTrackId(trackId) || !isValidRating(rating)
    ) ||
    favoriteTrackIds.some(hasInvalidTrackId) ||
    new Set(favoriteTrackIds).size !== favoriteTrackIds.length
  ) {
    return res.status(400).json({ error: 'Track IDs or ratings are invalid' });
  }

  if (favoriteTrackIds.length > 3) {
    return res.status(400).json({ error: 'You can select up to 3 favorite tracks per album' });
  }

  if (ratingEntries.length > 100) {
    return res.status(400).json({ error: 'Too many track ratings' });
  }

  const favoriteSet = new Set(favoriteTrackIds);
  const trackIds = [...new Set([...ratingEntries.map(([trackId]) => trackId), ...favoriteSet])];
  let client;
  let transactionStarted = false;

  try {
    client = await getPool().connect();
    await client.query('BEGIN');
    transactionStarted = true;

    const albumResult = await client.query(
      'SELECT id FROM albums WHERE id = $1 FOR UPDATE',
      [albumId]
    );
    if (!albumResult.rows.length) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(404).json({ error: 'Album not found' });
    }

    await client.query(
      'DELETE FROM track_rankings WHERE user_id = $1 AND album_id = $2',
      [user.id, albumId]
    );

    if (trackIds.length) {
      await client.query(
        `INSERT INTO track_rankings (user_id, album_id, track_id, rating, is_favorite)
         SELECT $1, $2, tracks.track_id, tracks.rating, tracks.is_favorite
         FROM UNNEST($3::text[], $4::numeric[], $5::boolean[])
           AS tracks(track_id, rating, is_favorite)`,
        [
          user.id,
          albumId,
          trackIds,
          trackIds.map((trackId) => trackRatings[trackId] ?? null),
          trackIds.map((trackId) => favoriteSet.has(trackId)),
        ]
      );
    }

    await client.query('COMMIT');
    transactionStarted = false;
    res.json({ saved: true });
  } catch (err) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(rollbackError);
      }
    }
    console.error(err);
    res.status(502).json({ error: 'Could not save track rankings' });
  } finally {
    if (client) client.release();
  }
};
