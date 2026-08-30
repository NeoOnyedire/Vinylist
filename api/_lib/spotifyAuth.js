const { query } = require('./db');

const REFRESH_BUFFER_MS = 60 * 1000; // refresh a minute before actual expiry

// Spotify now requires catalog/search calls to use a real user token rather
// than an app-level Client Credentials token (Feb 2026 Developer Mode changes).
// This returns the current user's Spotify access token, transparently
// refreshing it first if it's expired or close to it.
async function getValidUserToken(userId) {
  const { rows } = await query(
    'SELECT spotify_access_token, spotify_refresh_token, spotify_token_expires_at FROM users WHERE id = $1',
    [userId]
  );
  const user = rows[0];
  if (!user) throw new Error('User not found');

  const expiresAt = user.spotify_token_expires_at
    ? new Date(user.spotify_token_expires_at).getTime()
    : 0;

  if (user.spotify_access_token && Date.now() < expiresAt - REFRESH_BUFFER_MS) {
    return user.spotify_access_token;
  }

  if (!user.spotify_refresh_token) {
    throw new Error('No Spotify refresh token on file - user needs to log in again');
  }

  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: user.spotify_refresh_token,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Spotify token refresh failed (${resp.status}): ${body}`);
  }

  const data = await resp.json();
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  // Spotify sometimes rotates the refresh token and sometimes doesn't - keep
  // the old one if a new one wasn't issued.
  await query(
    `UPDATE users SET
       spotify_access_token = $1,
       spotify_token_expires_at = $2,
       spotify_refresh_token = COALESCE($3, spotify_refresh_token)
     WHERE id = $4`,
    [data.access_token, newExpiresAt, data.refresh_token || null, userId]
  );

  return data.access_token;
}

module.exports = { getValidUserToken };