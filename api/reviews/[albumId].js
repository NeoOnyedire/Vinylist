const { query } = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();
  const user = requireAuth(req, res);
  if (!user) return;

  const { albumId } = req.query;

  await query('DELETE FROM reviews WHERE user_id = $1 AND album_id = $2', [
    user.id,
    albumId,
  ]);

  res.status(204).end();
};
