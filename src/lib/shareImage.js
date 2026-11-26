// Renders a shareable "My top 10" image onto a canvas (1080x1350, 4:5).

const WIDTH = 1080;
const HEIGHT = 1350;
const COLORS = {
  ink: '#14151A',
  surface: '#1E2027',
  surface2: '#262832',
  groove: '#3A3D4A',
  label: '#E8A33D',
  cream: '#F2EFE9',
  dim: '#9A9CAE',
};
const DISPLAY = '"Fraunces", Georgia, serif';
const BODY = '"Inter", system-ui, sans-serif';

const ROW_COUNT = 10;
const HEADER_H = 190;
const FOOTER_H = 70;
const ROW_H = (HEIGHT - HEADER_H - FOOTER_H) / ROW_COUNT; // 109
const COVER = 88;
const PAD = 64;

// Cover art comes from Spotify's CDN. If it can't be loaded with CORS
// (which would taint the canvas), the row just shows a blank tile.
function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function fit(ctx, text, maxWidth) {
  const value = String(text || '');
  if (ctx.measureText(value).width <= maxWidth) return value;
  let end = value.length;
  while (end > 1 && ctx.measureText(`${value.slice(0, end).trimEnd()}…`).width > maxWidth) end -= 1;
  return `${value.slice(0, end).trimEnd()}…`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function ensureFonts() {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await Promise.all([
      document.fonts.load(`700 56px ${DISPLAY}`),
      document.fonts.load(`600 30px ${BODY}`),
      document.fonts.load(`400 24px ${BODY}`),
    ]);
  } catch {
    // fall back to system fonts
  }
}

// reviews: already in rank order (best first). Only the first 10 are drawn.
export async function renderTopTenCanvas({ reviews, displayName }) {
  const top = reviews.slice(0, ROW_COUNT);
  const [covers] = await Promise.all([
    Promise.all(top.map((r) => loadImage(r.image_url))),
    ensureFonts(),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  // background
  ctx.fillStyle = COLORS.ink;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(WIDTH / 2, 0, 0, WIDTH / 2, 0, 700);
  glow.addColorStop(0, 'rgba(232,163,61,0.20)');
  glow.addColorStop(1, 'rgba(232,163,61,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // header
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.label;
  ctx.font = `600 24px ${BODY}`;
  ctx.fillText('MY TOP ALBUMS', PAD, 84);
  ctx.fillStyle = COLORS.cream;
  ctx.font = `700 64px ${DISPLAY}`;
  ctx.fillText(fit(ctx, displayName ? `${displayName}’s top ${top.length}` : `Top ${top.length}`, WIDTH - PAD * 2), PAD, 152);

  // rows
  top.forEach((r, i) => {
    const y = HEADER_H + i * ROW_H;
    const cy = y + ROW_H / 2;

    if (i > 0) {
      ctx.fillStyle = COLORS.groove;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(PAD, y, WIDTH - PAD * 2, 1);
      ctx.globalAlpha = 1;
    }

    // rank
    ctx.fillStyle = i === 0 ? COLORS.label : COLORS.dim;
    ctx.font = `700 40px ${DISPLAY}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), PAD + 52, cy);

    // cover
    const cx = PAD + 76;
    const cTop = cy - COVER / 2;
    ctx.save();
    roundRect(ctx, cx, cTop, COVER, COVER, 12);
    ctx.clip();
    if (covers[i]) {
      ctx.drawImage(covers[i], cx, cTop, COVER, COVER);
    } else {
      ctx.fillStyle = COLORS.surface2;
      ctx.fillRect(cx, cTop, COVER, COVER);
    }
    ctx.restore();

    // rating badge (right edge)
    const rating = Number(r.rating);
    const badgeR = 30;
    const bx = WIDTH - PAD - badgeR;
    ctx.fillStyle = 'rgba(232,163,61,0.15)';
    ctx.beginPath();
    ctx.arc(bx, cy, badgeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.label;
    ctx.font = `600 26px ${BODY}`;
    ctx.textAlign = 'center';
    ctx.fillText(Number.isFinite(rating) ? rating.toFixed(1) : '–', bx, cy + 1);

    // title + artist
    const tx = cx + COVER + 24;
    const maxText = bx - badgeR - 24 - tx;
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.cream;
    ctx.font = `600 30px ${BODY}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(fit(ctx, r.album_name, maxText), tx, cy - 6);
    ctx.fillStyle = COLORS.dim;
    ctx.font = `400 24px ${BODY}`;
    ctx.fillText(fit(ctx, r.artist, maxText), tx, cy + 30);
  });

  // footer
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.label;
  ctx.beginPath();
  ctx.arc(PAD + 12, HEIGHT - 34, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.ink;
  ctx.beginPath();
  ctx.arc(PAD + 12, HEIGHT - 34, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.cream;
  ctx.font = `700 26px ${DISPLAY}`;
  ctx.fillText('Vinylist', PAD + 36, HEIGHT - 25);

  return canvas;
}

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    // toBlob throws a SecurityError on a tainted canvas; surface that as a normal error
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create image.'))), 'image/png');
    } catch {
      reject(new Error('Could not create image.'));
    }
  });
}

// Uses the native share sheet when the browser can share image files
// (most phones); otherwise downloads the PNG. Returns 'shared' or 'downloaded'.
export async function shareOrDownloadImage(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'My top albums on Vinylist' });
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'shared'; // user closed the sheet
      // otherwise fall through to a download
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
