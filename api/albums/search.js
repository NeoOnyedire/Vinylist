const { requireAuth } = require('../_lib/auth');
const { searchAlbums } = require('../_lib/spotify');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!requireAuth(req, res)) return;

  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  try {
    const results = await searchAlbums(q);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Spotify search failed' });
  }
};
