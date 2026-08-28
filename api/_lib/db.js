const { Pool } = require('pg');

// Reused across warm invocations of the same function instance.
// Vercel Postgres, Neon, and Supabase all provide a POSTGRES_URL-style
// connection string and require SSL - this works with any of them.
let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('POSTGRES_URL (or DATABASE_URL) environment variable is not set');
    }
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 3, // serverless: keep the per-instance pool small
    });
  }
  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

module.exports = { query, getPool };
