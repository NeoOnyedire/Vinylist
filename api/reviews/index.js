const { query } = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');
const { getValidUserToken } = require('../_lib/spotifyAuth');
const { getAlbum } = require('../_lib/spotify');

async function ensureAlbumCached(albumId, token) {
  const { rows } = await query('SELECT id FROM albums WHERE id = $1', [albumId]);
  if (rows.length) return;

  const album = await getAlbum(token, albumId);
  await query(
    `INSERT INTO albums (id, name, artist, image_url, release_date, spotify_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [album.id, album.name, album.artist, album.image_url, album.release_date, album.spotify_url]
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const user = requireAuth(req, res);
  if (!user) return;

  const { album_id, rating, review_text, listened_at } = req.body || {};

  if (!album_id || typeof rating !== 'number' || rating < 0.5 || rating > 5) {
    return res.status(400).json({ error: 'album_id and rating (0.5-5) are required' });
  }

  try {
    const token = await getValidUserToken(user.id);
    await ensureAlbumCached(album_id, token);

    const { rows } = await query(
      `INSERT INTO reviews (user_id, album_id, rating, review_text, listened_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, album_id) DO UPDATE SET
         rating = EXCLUDED.rating,
         review_text = EXCLUDED.review_text,
         listened_at = EXCLUDED.listened_at,
         updated_at = now()
       RETURNING *`,
      [user.id, album_id, rating, review_text || null, listened_at || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not save review' });
  }
};
