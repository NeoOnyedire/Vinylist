const { query } = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const user = requireAuth(req, res);
  if (!user) return;

  const { rows } = await query(
    `SELECT r.*, a.name AS album_name, a.artist, a.image_url, a.release_date, a.spotify_url
     FROM reviews r
     JOIN albums a ON a.id = r.album_id
     WHERE r.user_id = $1
     ORDER BY r.rating DESC, r.updated_at DESC`,
    [user.id]
  );

  const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));
  res.json(ranked);
};
