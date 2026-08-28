const { query } = require('../_lib/db');
const { signSession } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { code, error } = req.query;

  if (error) {
    res.writeHead(302, { Location: `${process.env.FRONTEND_URL}/login?error=${error}` });
    return res.end();
  }

  try {
    const tokenResp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      }),
    });
    if (!tokenResp.ok) throw new Error('Token exchange failed');
    const tokenData = await tokenResp.json();

    const profileResp = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileResp.ok) throw new Error('Profile fetch failed');
    const profile = await profileResp.json();

    const avatar = profile.images && profile.images[0] ? profile.images[0].url : null;

    await query(
      `INSERT INTO users (id, display_name, email, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         email = EXCLUDED.email,
         avatar_url = EXCLUDED.avatar_url`,
      [profile.id, profile.display_name || profile.id, profile.email, avatar]
    );

    const sessionToken = signSession({
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: avatar,
    });

    res.writeHead(302, {
      Location: `${process.env.FRONTEND_URL}/callback#token=${sessionToken}`,
    });
    res.end();
  } catch (err) {
    console.error(err);
    res.writeHead(302, { Location: `${process.env.FRONTEND_URL}/login?error=auth_failed` });
    res.end();
  }
};
