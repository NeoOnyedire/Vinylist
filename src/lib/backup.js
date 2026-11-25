// JSON backup / restore for a user's rankings.
// The file is self-contained (album details included) so it can be restored
// into an empty account without any Spotify lookups.

export const BACKUP_APP = 'vinylist';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_REVIEWS = 500;

export function buildBackup(reviews) {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    reviews: reviews.map((r) => ({
      album_id: r.album_id,
      album_name: r.album_name,
      artist: r.artist,
      image_url: r.image_url ?? null,
      release_date: r.release_date ?? null,
      spotify_url: r.spotify_url ?? null,
      rating: Number(r.rating),
      review_text: r.review_text ?? null,
      listened_at: r.listened_at ?? null,
      metrics: r.metrics ?? null,
      override_overall: Boolean(r.override_overall),
    })),
  };
}

// Parses and sanity-checks backup file text. Throws an Error with a
// user-readable message; the server re-validates every field.
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  if (!data || data.app !== BACKUP_APP || !Array.isArray(data.reviews)) {
    throw new Error('That file is not a Vinylist backup.');
  }
  if (data.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${data.version}.`);
  }
  if (data.reviews.length === 0) {
    throw new Error('The backup has no rankings in it.');
  }
  if (data.reviews.length > MAX_BACKUP_REVIEWS) {
    throw new Error(`Backups can hold at most ${MAX_BACKUP_REVIEWS} rankings.`);
  }
  return data.reviews;
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
