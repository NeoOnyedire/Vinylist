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

async function getReviewColumns() {
  const { rows } = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'reviews'`
  );

  return new Set(rows.map((row) => row.column_name));
}

function normalizeMetrics(metrics) {
  const defaults = { relatability: 0, production: 0, replayability: 0 };
  if (!metrics || typeof metrics !== 'object') return defaults;

  const normalized = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const value = Number(metrics[key]);
    normalized[key] = Number.isFinite(value) ? value : 0;
  }

  return normalized;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const user = requireAuth(req, res);
  if (!user) return;

  const { album_id, rating, review_text, listened_at, metrics, overrideOverall } = req.body || {};
  const normalizedMetrics = normalizeMetrics(metrics);
  const metricValues = Object.values(normalizedMetrics).filter((value) => Number.isFinite(value));
  const averageMetricScore = metricValues.length
    ? metricValues.reduce((sum, value) => sum + value, 0) / metricValues.length
    : 0;

  const finalRating = overrideOverall === true && typeof rating === 'number'
    ? rating
    : averageMetricScore || rating;

  if (!album_id || typeof finalRating !== 'number' || finalRating < 0.5 || finalRating > 5) {
    return res.status(400).json({ error: 'album_id and rating (0.5-5) are required' });
  }

  try {
    const token = await getValidUserToken(user.id);
    await ensureAlbumCached(album_id, token);

    const reviewColumns = await getReviewColumns();
    const supportsMetrics = reviewColumns.has('metrics');
    const supportsOverrideOverall = reviewColumns.has('override_overall');

    const queryText = supportsMetrics && supportsOverrideOverall
      ? `INSERT INTO reviews (user_id, album_id, rating, review_text, listened_at, metrics, override_overall)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
         ON CONFLICT (user_id, album_id) DO UPDATE SET
           rating = EXCLUDED.rating,
           review_text = EXCLUDED.review_text,
           listened_at = EXCLUDED.listened_at,
           metrics = EXCLUDED.metrics,
           override_overall = EXCLUDED.override_overall,
           updated_at = now()
         RETURNING *`
      : `INSERT INTO reviews (user_id, album_id, rating, review_text, listened_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, album_id) DO UPDATE SET
           rating = EXCLUDED.rating,
           review_text = EXCLUDED.review_text,
           listened_at = EXCLUDED.listened_at,
           updated_at = now()
         RETURNING *`;

    const queryParams = supportsMetrics && supportsOverrideOverall
      ? [
          user.id,
          album_id,
          finalRating,
          review_text || null,
          listened_at || null,
          JSON.stringify(normalizedMetrics),
          Boolean(overrideOverall && typeof rating === 'number'),
        ]
      : [
          user.id,
          album_id,
          finalRating,
          review_text || null,
          listened_at || null,
        ];

    const { rows } = await query(queryText, queryParams);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not save review' });
  }
};
