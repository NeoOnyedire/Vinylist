const { query } = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');
const { getValidUserToken } = require('../_lib/spotifyAuth');
const { getAlbum } = require('../_lib/spotify');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;

  try {
    let { rows } = await query('SELECT * FROM albums WHERE id = $1', [id]);
    let album = rows[0];

    if (!album) {
      const token = await getValidUserToken(user.id);
      album = await getAlbum(token, id);
      await query(
        `INSERT INTO albums (id, name, artist, image_url, release_date, spotify_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [album.id, album.name, album.artist, album.image_url, album.release_date, album.spotify_url]
      );
    }

    const statsResult = await query(
      `SELECT COUNT(*)::int AS review_count, AVG(rating)::float AS avg_rating
       FROM reviews WHERE album_id = $1`,
      [id]
    );
    const stats = statsResult.rows[0];

    const myReviewResult = await query(
      'SELECT * FROM reviews WHERE album_id = $1 AND user_id = $2',
      [id, user.id]
    );

    res.json({ ...album, stats, myReview: myReviewResult.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not load album' });
  }
};
