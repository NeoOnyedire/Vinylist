const { query } = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!requireAuth(req, res)) return;

  const { id } = req.query;

  const userResult = await query(
    'SELECT id, display_name, avatar_url, created_at FROM users WHERE id = $1',
    [id]
  );
  if (!userResult.rows[0]) return res.status(404).json({ error: 'User not found' });

  const reviewsResult = await query(
    `SELECT r.*, a.name AS album_name, a.artist, a.image_url, a.release_date, a.spotify_url
     FROM reviews r
     JOIN albums a ON a.id = r.album_id
     WHERE r.user_id = $1
     ORDER BY r.rating DESC, r.updated_at DESC`,
    [id]
  );

  const ranked = reviewsResult.rows.map((r, i) => ({ ...r, rank: i + 1 }));
  res.json({ ...userResult.rows[0], reviews: ranked });
};
