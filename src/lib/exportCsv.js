// CSV export for a user's rankings.

const COLUMNS = [
  { header: 'Rank', value: (r) => r.rank },
  { header: 'Album', value: (r) => r.album_name },
  { header: 'Artist', value: (r) => r.artist },
  { header: 'Rating', value: (r) => r.rating },
  { header: 'Release date', value: (r) => r.release_date },
  { header: 'Listened', value: (r) => r.listened_at },
  { header: 'Review', value: (r) => r.review_text },
  { header: 'Spotify URL', value: (r) => r.spotify_url },
  { header: 'Last updated', value: (r) => r.updated_at },
];

// Quote a field per RFC 4180. Text starting with = + - @ (or a tab/CR) is
// prefixed with an apostrophe so spreadsheets don't run it as a formula.
export function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function rankingsToCsv(reviews) {
  const lines = [COLUMNS.map((c) => escapeCsvField(c.header)).join(',')];
  for (const review of reviews) {
    lines.push(COLUMNS.map((c) => escapeCsvField(c.value(review))).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

// Triggers a browser download. The BOM makes Excel read the file as UTF-8.
export function downloadCsv(filename, csv) {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
