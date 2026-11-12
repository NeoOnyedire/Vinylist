// Run locally against your hosted Postgres database after deploying schema changes:
//   POSTGRES_URL="postgres://..." npm run migrate
// (or `vercel env pull` first to load it from your Vercel project's env vars)
require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Set POSTGRES_URL (or DATABASE_URL) before running the migration.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
});

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    display_name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS spotify_access_token TEXT,
    ADD COLUMN IF NOT EXISTS spotify_refresh_token TEXT,
    ADD COLUMN IF NOT EXISTS spotify_token_expires_at TIMESTAMPTZ;

  CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    artist TEXT NOT NULL,
    image_url TEXT,
    release_date TEXT,
    spotify_url TEXT
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    rating NUMERIC(3,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5),
    review_text TEXT,
    listened_at TEXT,
    metrics JSONB DEFAULT '{}'::jsonb,
    override_overall BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, album_id)
  );

  CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_album ON reviews(album_id);

  ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS override_overall BOOLEAN NOT NULL DEFAULT false;
`;

(async () => {
  try {
    await pool.query(schema);
    console.log('Migration complete: users, albums, reviews tables are ready.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
