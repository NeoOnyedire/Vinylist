const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { searchAlbums, getAlbum } = require('../spotify');
const db = require('../db');

const router = express.Router();

// GET /api/albums/search?q=...
router.get('/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  try {
    const results = await searchAlbums(q);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Spotify search failed' });
  }
});

// GET /api/albums/:id - album details + this app's aggregate rating
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    let album = db.prepare('SELECT * FROM albums WHERE id = ?').get(id);
    if (!album) {
      album = await getAlbum(id);
      db.prepare(
        `INSERT INTO albums (id, name, artist, image_url, release_date, spotify_url)
         VALUES (@id, @name, @artist, @image_url, @release_date, @spotify_url)`
      ).run(album);
    }

    const stats = db
      .prepare(
        `SELECT COUNT(*) AS review_count, AVG(rating) AS avg_rating
         FROM reviews WHERE album_id = ?`
      )
      .get(id);

    const myReview = db
      .prepare('SELECT * FROM reviews WHERE album_id = ? AND user_id = ?')
      .get(id, req.user.id);

    res.json({ ...album, stats, myReview: myReview || null });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not load album' });
  }
});

module.exports = router;
