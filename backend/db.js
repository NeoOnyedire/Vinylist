const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'vinylist.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,              -- spotify user id
    display_name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,              -- spotify album id
    name TEXT NOT NULL,
    artist TEXT NOT NULL,
    image_url TEXT,
    release_date TEXT,
    spotify_url TEXT
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    rating REAL NOT NULL CHECK (rating >= 0.5 AND rating <= 5),
    review_text TEXT,
    listened_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, album_id)
  );

  CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_album ON reviews(album_id);
`);

module.exports = db;
