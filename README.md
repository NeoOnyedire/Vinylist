# Vinylist

Log every album you listen to, rate it, and see your all-time ranking — Letterboxd, for music. Sign in with Spotify, search the catalog, rate albums (0.5–5 in half steps), write short reviews, and get an automatically sorted ranked list on your profile.

## Stack

- **Backend:** Node.js + Express + SQLite (`better-sqlite3`, a single local file, no external DB to set up)
- **Frontend:** React + Vite + Tailwind
- **Auth:** Spotify OAuth (Authorization Code flow) → the app issues its own JWT session token

## 1. Create a Spotify app

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and log in.
2. Click **Create app**.
3. Fill in a name/description (anything works).
4. Under **Redirect URIs**, add exactly:
   ```
   http://127.0.0.1:5000/api/auth/callback
   ```
5. Save, then open the app's **Settings** to copy your **Client ID** and **Client Secret**.

## 2. Backend setup

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in:
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` — from step 1
- `JWT_SECRET` — any long random string (e.g. run `openssl rand -hex 32`)
- Leave the rest as-is for local dev

Install and run:

```bash
npm install
npm run dev
```

The API starts on `http://127.0.0.1:5000` and creates `vinylist.db` automatically on first run.

## 3. Frontend setup

In a new terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Click **Continue with Spotify**, log in, and you're in.

## How it works

- **Login:** `/api/auth/login` redirects to Spotify's consent screen → Spotify calls back to `/api/auth/callback` → the backend exchanges the code for a token, fetches the user's Spotify profile, upserts a local `users` row, and signs a 30-day JWT → the frontend stores that JWT in `localStorage` and sends it as `Authorization: Bearer <token>` on every API call.
- **Search:** uses Spotify's Client Credentials flow (app-level, no user token needed) to query the full Spotify album catalog.
- **Reviews:** one review per user per album (rating + optional text), stored locally. Saving an album's first review caches its Spotify metadata (name, artist, cover, release date) in the local `albums` table so your ranked list loads instantly without re-hitting Spotify.
- **Ranking:** your profile page sorts all your reviews by rating (highest first, ties broken by most recently updated) and numbers them — that's your all-time ranking. No manual drag-and-drop needed; re-rate an album and it re-sorts itself.

## Project structure

```
vinylist/
├── backend/
│   ├── server.js          # Express app entrypoint
│   ├── db.js               # SQLite schema (users, albums, reviews)
│   ├── spotify.js          # Spotify catalog search / album lookup helpers
│   ├── middleware/auth.js  # JWT verification
│   └── routes/
│       ├── auth.js         # OAuth login/callback
│       ├── albums.js       # search + album detail
│       ├── reviews.js      # create/update/delete a review, "my ranking"
│       └── users.js        # profile + public ranked list by user id
└── frontend/
    └── src/
        ├── api.js                    # fetch wrapper, token storage
        ├── App.jsx                   # routes + auth guard
        ├── components/
        │   ├── Navbar.jsx
        │   ├── AlbumCard.jsx
        │   └── GrooveRating.jsx      # the 0.5–5 vinyl-record rating control
        └── pages/
            ├── Login.jsx
            ├── Callback.jsx
            ├── Dashboard.jsx         # search
            ├── AlbumDetail.jsx       # rate + review
            └── Profile.jsx           # your ranked list
```

## Where to take it next

A few natural next steps once this is running:
- **Public profiles:** the `GET /api/users/:id` endpoint already returns any user's public ranked list — add a route like `/u/:id` on the frontend to view friends' rankings.
- **Follow/feed:** a `follows` table + a feed endpoint would let people see friends' latest reviews.
- **Genres/years filters:** the `albums` table has `release_date`; adding a `genres` column (Spotify's artist endpoint has genre data) would enable filtering your ranking.
- **Deploying:** swap SQLite for Postgres if you outgrow a single file (the queries are plain SQL, easy to port), and set `SPOTIFY_REDIRECT_URI` / `FRONTEND_URL` to your real domains plus HTTPS.
