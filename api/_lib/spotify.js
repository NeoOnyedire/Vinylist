// Callers pass in a valid token (a per-user token from _lib/spotifyAuth.js) -
// this module no longer manages its own Client Credentials token, since
// Spotify's Feb 2026 Developer Mode changes restrict catalog/search access
// for that flow on newly-created apps.

async function searchAlbums(token, searchQuery, limit = 12) {
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
    searchQuery
  )}&type=album&limit=${limit}`;

  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Spotify search failed (${resp.status}): ${body}`);
  }

  const data = await resp.json();
  return data.albums.items.map(formatAlbum);
}

async function getAlbum(token, albumId) {
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

module.exports = { searchAlbums, getAlbum };