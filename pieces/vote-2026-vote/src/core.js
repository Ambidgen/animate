// core.js — canvas primitives: palette, easing, seeded noise, paper, halftone, typography, layout.
// Every function is deterministic: same inputs, same pixels. No Math.random, no Date.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { FONTS } from './fonts.js';

// ---------- fonts ----------
export const F = { sans: 'DejaVuSans700', sansR: 'DejaVuSans400', mono: 'DejaVuSansMono700', monoR: 'DejaVuSansMono400', serif: 'DejaVuSerif700' };
let fontsReady = false;
export function useFonts() {
  if (fontsReady) return;
  for (const [key, b64] of Object.entries(FONTS)) {
    const [fam, w] = key.split('|');
    GlobalFonts.register(Buffer.from(b64, 'base64'), fam.replace(/ /g, '') + w);
  }
  fontsReady = true;
}

// ---------- palette ----------
// Two inks on newsprint: navy is the system (dates, sources, structure), persimmon is the mark a person makes.
// Nothing else is allowed to be persimmon.
export const C = {
  paper: '#EFE9DA',
  ink: '#12161C',       // navy-black ink
  inkSoft: '#2E3946',
  mute: '#8C8778',
  muteLight: '#C9C2AF',
  vote: '#D93E1B',      // the mark
  voteInk: '#B2300F',
  cream: '#F8F3E6',
};

// ---------- layout ----------
export function makeLayout(W, H) {
  const portrait = H > W;
  // the live area: inside the platform's UI at top and bottom for 9:16
  const box = portrait
    ? { x: 72, y: 268, w: 936, h: 1330 }
    : { x: 120, y: 118, w: 1680, h: 800 };
  return {
    W, H, portrait, box,
    LX: (f) => box.x + box.w * f,
    LY: (f) => box.y + box.h * f,
    // one type scale for the whole piece; wide frames get the same optical size, not a bigger one
    // wide frames get their own scale: the same optical weight would overrun a 1080-high frame
    T: portrait
      ? { display: 232, mega: 168, headline: 96, sub: 56, body: 40, micro: 27, tiny: 21 }
      : { display: 150, mega: 104, headline: 66, sub: 40, body: 32, micro: 21, tiny: 17 },
    CX: () => box.x + box.w / 2,
    CY: () => box.y + box.h / 2,
  };
}

// ---------- maths ----------
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const ease = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  in: (t) => t * t * t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};
export function spring(t, k = 0.55, zeta = 0.62) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const w = (Math.PI * 2) / Math.max(0.05, k);
  const env = Math.exp(-zeta * w * t);
  return 1 - env * Math.cos(Math.sqrt(1 - zeta * zeta) * w * t);
}
export function pop(t, t0, d = 0.5) { return spring(seg(t, t0, t0 + d)); }
// rise-in with fade: the workhorse entrance
export function rise(t, t0, d = 0.6, dist = 26) {
  const p = spring(seg(t, t0, t0 + d));
  return { p, dy: (1 - p) * dist, a: clamp(p * 1.5) };
}

// ---------- seeded noise ----------
export function rng(seed) {
  let h = 2166136261 >>> 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
}

// ---------- drawing helpers ----------
export function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad); ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad); ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}
export function disc(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2); ctx.fill(); }
export function ring(ctx, x, y, r, lw = 2) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2); ctx.lineWidth = lw; ctx.stroke(); }

// a printed score line: not a vector-perfect rule
export function rule(ctx, x0, y, x1, seed, { amp = 0.9, lw = 2, color = C.ink, alpha = 1 } = {}) {
  const r = rng(seed), n = 16;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = lerp(x0, x1, t), yy = y + (r() - 0.5) * 2 * amp;
    i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
  }
  ctx.stroke(); ctx.restore();
}

// ---------- paper ----------
let paperCache = null, grainTiles = null;
export function makePaper(W, H) {
  const c = createCanvas(W, H), x = c.getContext('2d');
  x.fillStyle = C.paper; x.fillRect(0, 0, W, H);
  const r = rng('paper');
  for (let i = 0; i < 46; i++) {
    const bx = r() * W, by = r() * H, br = 110 + r() * 460;
    const g = x.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, r() > 0.45 ? 'rgba(176,158,120,0.075)' : 'rgba(120,116,104,0.05)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  for (let i = 0; i < 3000; i++) {
    const px = r() * W, py = r() * H, len = 2 + r() * 10, a = (r() - 0.5) * 0.9;
    x.strokeStyle = `rgba(86,80,66,${(0.02 + r() * 0.055).toFixed(3)})`;
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
  }
  const v = x.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.22, W / 2, H * 0.5, Math.max(W, H) * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(46,38,22,0.14)');
  x.fillStyle = v; x.fillRect(0, 0, W, H);
  paperCache = { W, H, c };
  return c;
}
function grainTile(seed, S = 256) {
  const c = createCanvas(S, S), x = c.getContext('2d'), r = rng(seed);
  const img = x.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const v = r();
    const a = v > 0.84 ? 30 : v > 0.58 ? 11 : 0;
    img.data[i * 4] = 54; img.data[i * 4 + 1] = 48; img.data[i * 4 + 2] = 36; img.data[i * 4 + 3] = a;
  }
  x.putImageData(img, 0, 0);
  return c;
}
export function drawPaper(ctx, W, H, boil) {
  const p = paperCache && paperCache.W === W && paperCache.H === H ? paperCache.c : makePaper(W, H);
  ctx.drawImage(p, 0, 0);
  if (!grainTiles) grainTiles = grainTile('grain0');
  const tile = grainTiles;
  for (let y = 0; y < H; y += 256) for (let x = 0; x < W; x += 256) ctx.drawImage(tile, x, y);
}

// ---------- halftone: a dot screen over a region, coverage comes from a function ----------
export function halftone(ctx, x0, y0, w, h, { pitch = 14, cover = () => 1, color = C.ink, alpha = 1, angle = 0.26 } = {}) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const n = Math.ceil((w + h) / pitch) + 2;
  for (let i = -n; i < n; i++) {
    for (let j = -n; j < n; j++) {
      const u = i * pitch, v = j * pitch;
      const px = x0 + w / 2 + u * ca - v * sa, py = y0 + h / 2 + u * sa + v * ca;
      if (px < x0 - pitch || px > x0 + w + pitch || py < y0 - pitch || py > y0 + h + pitch) continue;
      const k = clamp(cover((px - x0) / w, (py - y0) / h));
      if (k <= 0.02) continue;
      const rad = (pitch * 0.5) * Math.sqrt(k) * 0.98;
      ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// ---------- type ----------
export function setFont(ctx, size, face = F.sans) { ctx.font = `${Math.round(size)}px ${face}`; }
export function measure(ctx, s, size, face = F.sans) { setFont(ctx, size, face); return ctx.measureText(s).width; }

export function tracked(ctx, s, x, y, { size = 24, face = F.mono, color = C.ink, track = 0.16, align = 'left', alpha = 1 } = {}) {
  setFont(ctx, size, face);
  const chars = [...s];
  const widths = chars.map((ch) => ctx.measureText(ch).width + size * track);
  const total = widths.reduce((a, b) => a + b, 0) - size * track;
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
  chars.forEach((ch, i) => { ctx.fillText(ch, cx, y); cx += widths[i]; });
  ctx.restore();
  return total;
}
export function trackedWidth(ctx, s, size = 24, face = F.mono, track = 0.16) {
  setFont(ctx, size, face);
  return [...s].reduce((a, ch) => a + ctx.measureText(ch).width + size * track, 0) - size * track;
}
export function wrap(ctx, s, maxW, size, face = F.sans) {
  setFont(ctx, size, face);
  const words = s.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// fit a string into a width: returns the largest size <= preferred that fits
export function fitSize(ctx, s, maxW, preferred, face = F.sans, track = 0) {
  setFont(ctx, preferred, face);
  const w = [...s].reduce((a, ch) => a + ctx.measureText(ch).width, 0) + Math.abs(track) * preferred * (s.length - 1);
  if (w <= maxW) return preferred;
  return Math.max(8, Math.floor(preferred * (maxW / w) * 0.995));
}

// draw a line with tight tracking (display type reads better tracked in slightly)
function tightLine(ctx, s, x, y, size, color, track = -0.012, align = 'left', alpha = 1) {
  const chars = [...s];
  setFont(ctx, size, F.sans);
  const widths = chars.map((ch) => ctx.measureText(ch).width + size * track);
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  chars.forEach((ch, i) => { ctx.fillText(ch, cx, y); cx += widths[i]; });
  ctx.restore();
}
export { tightLine };

// a measured vertical stack: each item declares its own height so nothing can overlap
// items: { h, gap, draw(ctx, y, i) }
export function stack(ctx, items, y0, { align = 'center', x = 0 } = {}) {
  let y = y0;
  items.forEach((it, i) => { y += (it.gap ?? 0); it.draw(ctx, y, i); y += it.h; });
  return y;
}
export function stackHeight(items) { return items.reduce((a, it) => a + (it.gap ?? 0) + it.h, 0); }

// entrance: draw a whole block with a fade + rise (cheap, consistent)
export function enter(ctx, t, t0, { d = 0.6, dist = 22, fn }) {
  const s = rise(t, t0, d, dist);
  if (s.p <= 0) return;
  ctx.save(); ctx.globalAlpha *= s.a; ctx.translate(0, s.dy);
  fn(); ctx.restore();
}

// print misregistration: draw the same thing twice, spot colour offset
export function misregistered(ctx, { dx = 7, dy = 5, alpha = 0.55, draw }) {
  ctx.save(); ctx.translate(dx, dy); ctx.globalAlpha *= alpha;
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; draw(C.voteInk); ctx.restore();
  ctx.restore();
  draw(C.ink);
}
