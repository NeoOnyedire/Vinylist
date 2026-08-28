const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getAlbum } = require('../spotify');
const db = require('../db');

const router = express.Router();

async function ensureAlbumCached(albumId) {
  const existing = db.prepare('SELECT id FROM albums WHERE id = ?').get(albumId);
  if (existing) return;
  const album = await getAlbum(albumId);
  db.prepare(
    `INSERT INTO albums (id, name, artist, image_url, release_date, spotify_url)
     VALUES (@id, @name, @artist, @image_url, @release_date, @spotify_url)`
  ).run(album);
}

// POST /api/reviews  { album_id, rating, review_text?, listened_at? }
// Upserts - one review per user per album. rating is 0.5-5 in 0.5 steps.
router.post('/', requireAuth, async (req, res) => {
  const { album_id, rating, review_text, listened_at } = req.body;

  if (!album_id || typeof rating !== 'number' || rating < 0.5 || rating > 5) {
    return res.status(400).json({ error: 'album_id and rating (0.5-5) are required' });
  }

  try {
    await ensureAlbumCached(album_id);

    db.prepare(
      `INSERT INTO reviews (user_id, album_id, rating, review_text, listened_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, album_id) DO UPDATE SET
         rating = excluded.rating,
         review_text = excluded.review_text,
         listened_at = excluded.listened_at,
         updated_at = datetime('now')`
    ).run(req.user.id, album_id, rating, review_text || null, listened_at || null);

    const saved = db
      .prepare('SELECT * FROM reviews WHERE user_id = ? AND album_id = ?')
      .get(req.user.id, album_id);

    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not save review' });
  }
});

// DELETE /api/reviews/:albumId - remove the current user's review for an album
router.delete('/:albumId', requireAuth, (req, res) => {
  db.prepare('DELETE FROM reviews WHERE user_id = ? AND album_id = ?').run(
    req.user.id,
    req.params.albumId
  );
  res.status(204).end();
});

// GET /api/reviews/me - the logged-in user's ranked list (highest rated first)
router.get('/me', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT r.*, a.name AS album_name, a.artist, a.image_url, a.release_date, a.spotify_url
       FROM reviews r
       JOIN albums a ON a.id = r.album_id
       WHERE r.user_id = ?
       ORDER BY r.rating DESC, r.updated_at DESC`
    )
    .all(req.user.id);

  const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));
  res.json(ranked);
});

module.exports = router;
