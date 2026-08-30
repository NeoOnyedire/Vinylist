const { requireAuth } = require('../_lib/auth');
const { getValidUserToken } = require('../_lib/spotifyAuth');
const { searchAlbums } = require('../_lib/spotify');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const user = requireAuth(req, res);
  if (!user) return;

  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  try {
    const token = await getValidUserToken(user.id);
    const results = await searchAlbums(token, q);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Spotify search failed' });
  }
};
