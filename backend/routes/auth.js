const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const db = require('../db');

const router = express.Router();

const SCOPES = ['user-read-email', 'user-read-private'].join(' ');

// Step 1: send the user to Spotify's consent screen
router.get('/login', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    state,
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

// Step 2: Spotify redirects back here with a one-time code
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=${error}`);
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

    const avatar =
      profile.images && profile.images[0] ? profile.images[0].url : null;

    db.prepare(
      `INSERT INTO users (id, display_name, email, avatar_url)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         display_name = excluded.display_name,
         email = excluded.email,
         avatar_url = excluded.avatar_url`
    ).run(profile.id, profile.display_name || profile.id, profile.email, avatar);

    const sessionToken = jwt.sign(
      { id: profile.id, display_name: profile.display_name, avatar_url: avatar },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.redirect(`${process.env.FRONTEND_URL}/callback#token=${sessionToken}`);
  } catch (err) {
    console.error(err);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

module.exports = router;
