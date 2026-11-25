const { getPool } = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');

// POST /api/reviews/import  { reviews: [...] }  (the "reviews" array of a backup file)
// Restores rankings from a Vinylist JSON backup. Albums are created from the
// data in the file, so no Spotify calls are needed. Existing reviews are never
// overwritten: albums you've already ranked are skipped.

const MAX_REVIEWS = 500;

const isHttpUrl = (v) => typeof v === 'string' && v.length <= 1000 && /^https?:\/\//i.test(v);
const text = (v, max) => (typeof v === 'string' && v.length <= max ? v : null);

function normalizeMetrics(metrics) {
  const out = {};
  for (const key of ['relatability', 'production', 'replayability']) {
    const n = Number(metrics && metrics[key]);
    out[key] = Number.isFinite(n) && n >= 0 && n <= 5 ? n : 0;
  }
  return out;
}

// Returns a clean review object, or null if the entry is unusable.
function clean(item) {
  if (!item || typeof item !== 'object') return null;

  const albumId = text(item.album_id, 64)?.trim();
  const albumName = text(item.album_name, 300)?.trim();
  const rating = typeof item.rating === 'number' ? Math.round(item.rating * 10) / 10 : NaN;
  if (!albumId || !albumName || !Number.isFinite(rating) || rating < 0.5 || rating > 5) {
    return null;
  }

  return {
    album_id: albumId,
    album_name: albumName,
    artist: text(item.artist, 300)?.trim() || 'Unknown artist',
    image_url: isHttpUrl(item.image_url) ? item.image_url : null,
    release_date: text(item.release_date, 20),
    spotify_url: isHttpUrl(item.spotify_url) ? item.spotify_url : null,
    rating,
    review_text: text(item.review_text, 10000),
    listened_at: text(item.listened_at, 40),
    metrics: normalizeMetrics(item.metrics),
    override_overall: item.override_overall === true,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const user = requireAuth(req, res);
  if (!user) return;

  const input = req.body && req.body.reviews;
  if (!Array.isArray(input) || input.length === 0) {
    return res.status(400).json({ error: 'reviews must be a non-empty array' });
  }
  if (input.length > MAX_REVIEWS) {
    return res.status(400).json({ error: `At most ${MAX_REVIEWS} reviews can be imported at once` });
  }

  // Keep the first entry for each album; count everything unusable as invalid.
  const seen = new Set();
  const reviews = [];
  let invalid = 0;
  for (const item of input) {
    const review = clean(item);
    if (!review || seen.has(review.album_id)) {
      invalid += 1;
      continue;
    }
    seen.add(review.album_id);
    reviews.push(review);
  }

  if (!reviews.length) {
    return res.status(400).json({ error: 'No valid reviews found in the backup' });
  }

  let client;
  let started = false;
  try {
    client = await getPool().connect();

    // Older databases may not have the metrics columns yet.
    const { rows: cols } = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'reviews'`
    );
    const names = new Set(cols.map((c) => c.column_name));
    const withMetrics = names.has('metrics') && names.has('override_overall');

    await client.query('BEGIN');
    started = true;

    let imported = 0;
    for (const r of reviews) {
      await client.query(
        `INSERT INTO albums (id, name, artist, image_url, release_date, spotify_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [r.album_id, r.album_name, r.artist, r.image_url, r.release_date, r.spotify_url]
      );

      const result = withMetrics
        ? await client.query(
            `INSERT INTO reviews (user_id, album_id, rating, review_text, listened_at, metrics, override_overall)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
             ON CONFLICT (user_id, album_id) DO NOTHING`,
            [user.id, r.album_id, r.rating, r.review_text, r.listened_at, JSON.stringify(r.metrics), r.override_overall]
          )
        : await client.query(
            `INSERT INTO reviews (user_id, album_id, rating, review_text, listened_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, album_id) DO NOTHING`,
            [user.id, r.album_id, r.rating, r.review_text, r.listened_at]
          );
      imported += result.rowCount;
    }

    await client.query('COMMIT');
    res.json({ imported, skipped: reviews.length - imported, invalid });
  } catch (err) {
    if (started) await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Could not import reviews' });
  } finally {
    if (client) client.release();
  }
};
