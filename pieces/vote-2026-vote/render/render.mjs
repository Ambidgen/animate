#!/usr/bin/env node
// Headless renderer for pieces/vote-2026-vote — no browser needed.
//   node render/render.mjs stills 2.5,9.75,16.5 out.png     → a contact strip of key frames
//   node render/render.mjs frame 16.5 out.png [--format 9:16|1:1|16:9]
//   node render/render.mjs audio renders/audio.wav
//   node render/render.mjs video [--format 9:16] [--fps 24]   → renders/final-<w>x<h>.mp4 (+ audio)
import { useFonts, drawPaper, makeLayout, C } from '../src/core.js';
import { drawScene, DURATION, S } from '../src/scenes.js';
import { renderAudio } from '../src/score.js';
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PIECE = path.resolve(HERE, '..');
const FFMPEG = process.env.FFMPEG || '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v9.0.2';
const FORMATS = { '9:16': [1080, 1920], '1:1': [1080, 1080], '16:9': [1920, 1080] };
const FPS = 24;

useFonts();

function frameAt(t, fmt = '9:16') {
  const [W, H] = FORMATS[fmt];
  const L = makeLayout(W, H);
  const c = createCanvas(W, H), ctx = c.getContext('2d');
  drawPaper(ctx, W, H, Math.floor(t * FPS / 2) % 4);
  ctx.save();
  drawScene(ctx, t, L);
  ctx.restore();
  return c;
}

// the score is rendered twice: once to measure, once with the gain that lands it at -14 LUFS
function measureLufs(file) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = [...r.stderr.matchAll(/I:\s+(-?\d+\.\d+) LUFS/g)].pop();
  return m ? parseFloat(m[1]) : -23;
}
function writeAudio(out) {
  globalThis.__SCORE_GAIN = 1;
  const first = renderAudio(null, 48000, DURATION);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, first.buf);
  const base = measureLufs(out);
  const gain = Math.pow(10, (-14 - base) / 20);
  globalThis.__SCORE_GAIN = Math.min(gain, 40);
  const final = renderAudio(null, 48000, DURATION);
  fs.writeFileSync(out, final.buf);
  const after = measureLufs(out);
  console.log(`audio: ${base.toFixed(1)} LUFS raw → ${after.toFixed(1)} LUFS at gain ${(Math.min(gain, 40)).toFixed(2)} (peak ${final.peak.toFixed(2)})`);
}

const [cmd, ...args] = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };

if (cmd === 'frame') {
  const t = parseFloat(args[0]), out = args[1] || 'frame.png';
  const c = frameAt(t, opt('--format', '9:16'));
  fs.writeFileSync(out, c.toBuffer('image/png'));
  console.log(out);
} else if (cmd === 'stills') {
  const times = args[0].split(',').map(Number), out = args[1] || 'stills.png';
  const fmt = opt('--format', '9:16'), [W, H] = FORMATS[fmt];
  const cols = Math.min(times.length, 5), scale = parseFloat(opt('--scale', String(fmt === '16:9' ? 0.30 : 0.28)));
  const tw = Math.round(W * scale), th = Math.round(H * scale);
  const c = createCanvas(tw * cols, (th + 34) * Math.ceil(times.length / cols)), x = c.getContext('2d');
  x.fillStyle = '#22252a'; x.fillRect(0, 0, c.width, c.height);
  times.forEach((t, i) => {
    const f = frameAt(t, fmt);
    const cx = (i % cols) * tw, cy = Math.floor(i / cols) * (th + 34);
    x.drawImage(f, cx, cy, tw, th);
    x.fillStyle = '#e8e4d8'; x.font = '20px sans-serif';
    x.fillText(`${t.toFixed(2)}s`, cx + 10, cy + th + 24);
  });
  fs.writeFileSync(out, c.toBuffer('image/png'));
  console.log(out);
} else if (cmd === 'audio') {
  const out = args[0] || path.join(PIECE, 'renders', 'audio.wav');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  writeAudio(out);
  console.log(out);
} else if (cmd === 'video') {
  const fmt = opt('--format', '9:16'), fps = parseInt(opt('--fps', String(FPS)), 10), crf = opt('--crf', '20');
  const [W, H] = FORMATS[fmt];
  fs.mkdirSync(path.join(PIECE, 'renders'), { recursive: true });
  const wav = path.join(PIECE, 'renders', `audio-${fmt.replace(':', 'x')}.wav`);
  writeAudio(wav);
  const out = path.join(PIECE, 'renders', `final-${W}x${H}.mp4`);
  const nFrames = Math.round(DURATION * fps);
  const { spawn } = await import('node:child_process');
  const proc = spawn(FFMPEG, [
    '-y', '-v', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(fps), '-i', '-',
    '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-tune', 'animation',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < nFrames; i++) {
    const c = frameAt(i / fps, fmt);
    const buf = Buffer.from(c.data());       // RGBA, top-down — exactly what ffmpeg wants
    if (!proc.stdin.write(buf)) await new Promise((r) => proc.stdin.once('drain', r));
    if (i % 48 === 0) process.stdout.write(`\r${i}/${nFrames} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  proc.stdin.end();
  await new Promise((res, rej) => proc.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
  console.log('\n' + out);
} else {
  console.error('usage: node render/render.mjs stills <t,t,t> out.png | frame <t> out.png | audio out.wav | video [--format 9:16]');
  process.exit(2);
}
