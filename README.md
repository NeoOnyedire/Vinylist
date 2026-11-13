# Vinylist (Vercel edition)

Same app — log albums, rate 0.5–5, get an auto-sorted ranking — restructured to deploy entirely on Vercel:

- **Frontend:** React + Vite + Tailwind, built as a static site
- **Backend:** one serverless function per API route under `api/`, same domain as the frontend (no CORS needed)
- **Database:** Postgres (works with Vercel Postgres, [Neon](https://neon.tech), or [Supabase](https://supabase.com) — anything that gives you a connection string)

SQLite doesn't work on Vercel (functions have no persistent disk), so storage moved to hosted Postgres. Everything else — routes, auth flow, rating logic — is unchanged from the Express version.

## 1. Create a Postgres database

Pick one (all have a free tier):
- **Vercel Postgres:** in your Vercel project → Storage tab → Create Database → Postgres. It auto-adds a `POSTGRES_URL` env var to your project.
- **Neon / Supabase:** create a project on their site, copy the connection string they give you.

Either way, you end up with a connection string like `postgres://user:pass@host/dbname?sslmode=require`.

## 2. Create a Spotify app

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) → **Create app**.
2. Add a Redirect URI — you'll set the real one after your first deploy gives you a domain, e.g.:
   ```
   https://your-app.vercel.app/api/auth/callback
   ```
   (You can add `http://127.0.0.1:3000/api/auth/callback` too, for local testing with `vercel dev`.)
3. Copy the **Client ID** and **Client Secret**.

## 3. Deploy

```bash
npm install -g vercel   # if you don't have it
cd vinylist-vercel
vercel                  # follow the prompts, links this folder to a Vercel project
```

Then in the Vercel dashboard → your project → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `POSTGRES_URL` | your connection string from step 1 (skip if you used Vercel Postgres — it's already set) |
| `SPOTIFY_CLIENT_ID` | from step 2 |
| `SPOTIFY_CLIENT_SECRET` | from step 2 |
| `SPOTIFY_REDIRECT_URI` | `https://your-app.vercel.app/api/auth/callback` |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `JWT_SECRET` | any long random string (`openssl rand -hex 32`) |

Redeploy so the new env vars take effect:

```bash
vercel --prod
```

Go back to the Spotify dashboard and make sure the Redirect URI there **exactly** matches `SPOTIFY_REDIRECT_URI`.

## 4. Run the migration

The tables aren't created automatically (running schema changes on every cold start would be wasteful). For a new database, set `POSTGRES_URL` or `DATABASE_URL` locally and run `npm run migrate`; the script is safe to rerun.

Vercel Secret environment variables are write-only, so `vercel env pull` may not provide the database URL locally. For the existing Neon database, open its SQL Editor and run this additive migration:

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS spotify_access_token TEXT,
  ADD COLUMN IF NOT EXISTS spotify_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS spotify_token_expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS track_rankings (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  rating NUMERIC(2,1) CHECK (
    rating IS NULL OR (
      rating >= 0.5 AND rating <= 5 AND rating * 2 = TRUNC(rating * 2)
    )
  ),
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, album_id, track_id)
);
```

Afterward, sign out of Vinylist and sign back in so Spotify tokens are saved for catalog search. Re-run the migration after deploying schema updates; it is safe to run again.

## Local development

```bash
npm install
vercel dev
```

`vercel dev` serves the frontend **and** the `api/` functions together on `http://localhost:3000`, exactly like production — plain `vite dev` alone won't run the API routes.

## Project structure

```
vinylist-vercel/
├── api/
│   ├── _lib/
│   │   ├── db.js        # Postgres pool (reused across warm invocations)
│   │   ├── auth.js       # JWT verification
│   │   └── spotify.js    # Spotify catalog search / album lookup
│   ├── auth/
│   │   ├── login.js      # GET  /api/auth/login
│   │   └── callback.js   # GET  /api/auth/callback
│   ├── albums/
│   │   ├── search.js     # GET  /api/albums/search?q=
│   │   └── [id].js       # GET  /api/albums/:id
│   ├── reviews/
│   │   ├── index.js      # POST /api/reviews
│   │   ├── me.js          # GET  /api/reviews/me
│   │   └── [albumId].js   # DELETE /api/reviews/:albumId
│   └── users/
│       ├── me.js           # GET /api/users/me
│       └── [id].js         # GET /api/users/:id
├── scripts/migrate.js       # one-time schema setup
├── src/                      # same React app as before, api.js now calls same-origin /api/*
└── vercel.json               # SPA fallback so client-side routes survive a refresh
```

## Things to know about this setup

- **Same-origin, no CORS:** the frontend calls relative `/api/...` paths, so it only works when frontend and API are deployed together like this. If you ever split them onto different domains, you'll need to reintroduce CORS headers.
- **Spotify token caching is per-function:** each `api/*.js` file is bundled as its own Lambda, so the in-memory Spotify app-token cache in `_lib/spotify.js` isn't shared between e.g. `albums/search.js` and `albums/[id].js`. Harmless — it just means slightly more token fetches than a single long-running server — but worth knowing if you're optimizing.
- **Connection pooling:** `pg`'s `Pool` is capped at 3 connections per function instance to avoid exhausting your database's connection limit under concurrent serverless invocations. If you outgrow that, look at a pooler like PgBouncer or Neon's built-in pooled connection string.
