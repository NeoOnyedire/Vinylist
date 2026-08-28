const express = require('express');
const { requireAuth } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

// GET /api/users/me - current session's profile
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// GET /api/users/:id - public profile + their ranked list
router.get('/:id', requireAuth, (req, res) => {
  const user = db
    .prepare('SELECT id, display_name, avatar_url, created_at FROM users WHERE id = ?')
    .get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const rows = db
    .prepare(
      `SELECT r.*, a.name AS album_name, a.artist, a.image_url, a.release_date, a.spotify_url
       FROM reviews r
       JOIN albums a ON a.id = r.album_id
       WHERE r.user_id = ?
       ORDER BY r.rating DESC, r.updated_at DESC`
    )
    .all(req.params.id);

  const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));
  res.json({ ...user, reviews: ranked });
});

module.exports = router;
