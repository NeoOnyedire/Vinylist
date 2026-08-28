const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: 'user-read-email user-read-private',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    state,
  });

  res.writeHead(302, { Location: `https://accounts.spotify.com/authorize?${params.toString()}` });
  res.end();
};
