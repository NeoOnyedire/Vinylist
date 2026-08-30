// Cached at module scope - persists across warm invocations of whichever
// function required this file, refetched automatically on cold starts.
let cachedToken = null;
let cachedTokenExpiry = 0;

async function getAppToken() {
  if (cachedToken && Date.now() < cachedTokenExpiry) {
    return cachedToken;
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
    body: 'grant_type=client_credentials',
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Spotify token request failed (${resp.status}): ${body}`);
  }

  const data = await resp.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function searchAlbums(query, limit = 12) {
  const token = await getAppToken();
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
    query
  )}&type=album&limit=${limit}`;

  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Spotify search failed (${resp.status}): ${body}`);
  }

  const data = await resp.json();
  return data.albums.items.map(formatAlbum);
}

async function getAlbum(albumId) {
  const token = await getAppToken();
  const resp = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Spotify album lookup failed (${resp.status}): ${body}`);
  }

  return formatAlbum(await resp.json());
}

function formatAlbum(a) {
  return {
    id: a.id,
    name: a.name,
    artist: (a.artists || []).map((x) => x.name).join(', '),
    image_url: a.images && a.images[0] ? a.images[0].url : null,
    release_date: a.release_date,
    spotify_url: a.external_urls ? a.external_urls.spotify : null,
  };
}

module.exports = { getAppToken, searchAlbums, getAlbum };
