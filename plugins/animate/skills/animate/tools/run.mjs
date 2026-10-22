#!/usr/bin/env node
// run.mjs — the one-prompt pipeline: everything from piece to delivery in one command.
//   node tools/run.mjs <piece dir> [--formats 9:16,1:1] [--share] [--blur N] [--workers N] [--skip stage,stage]
// Stages, in order, each skipped cleanly when its dependency is missing (a one-shot agent on a bare
// sandbox still gets a deliverable and is told exactly which checks ran):
//   build    tools/build.mjs           -> index.html                          (needs node only)
//   still    tools/still.mjs           -> preview.png, three beats            (needs playwright)
//   board    tools/storyboard.mjs      -> storyboard.png                      (needs playwright)
//   export   tools/export.mjs --share  -> renders/final.mp4 + share.mp4       (needs playwright + ffmpeg)
//   review   tools/review.mjs          -> review/ + the measured checks       (needs playwright + ffmpeg)
//   stamp    tools/agentprint.mjs      -> maker's colophon + invisible print  (needs node only)
// Then it writes <piece>/DELIVERY.md (the closing block; fill in made-by) and appends every stage's
// output to <piece>/run.log. Exit 0 as long as the build passed — renders are a plus, not the gate.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { makePayload, encodeZW } from './watermark.mjs';

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS = path.join(SKILL, 'tools');
const USAGE = 'usage: node tools/run.mjs <piece dir> [--formats 9:16,1:1] [--share] [--blur N] [--workers N] [--skip stage,...]';
const argv = process.argv.slice(2);
if (!argv[0] || argv[0].startsWith('--')) { console.error(USAGE); process.exit(2); }
const ROOT = path.resolve(argv[0]);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const skip = new Set((opt('skip', '') || '').split(',').filter(Boolean));

if (!fs.existsSync(path.join(ROOT, 'piece.json'))) { console.error(`no piece.json in ${argv[0]} — scaffold first: node tools/new.mjs ${argv[0]}`); process.exit(1); }
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'piece.json'), 'utf8'));
const name = meta.name || path.basename(ROOT);
const LOG = path.join(ROOT, 'run.log');
fs.writeFileSync(LOG, `run.mjs ${name} ${new Date().toISOString()}\n`);

// ---- preflight: what this sandbox can actually do
const req = createRequire(import.meta.url);
function hasPlaywright() {
  try { req.resolve('playwright'); return true; } catch { }
  try { req.resolve(path.join(spawnSync('npm', ['root', '-g'], { encoding: 'utf8' }).stdout.trim(), 'playwright')); return true; } catch { return false; }
}
const env = {
  node: process.version,
  playwright: hasPlaywright(),
  ffmpeg: spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).status === 0,
};
console.log(`[env] node ${env.node} · playwright: ${env.playwright ? 'ok' : 'MISSING'} · ffmpeg: ${env.ffmpeg ? 'ok' : 'MISSING'}`);
if (!env.playwright) console.log('[env]   no playwright → still / board / export / review will be skipped. Install: npm i -g playwright && npx playwright install chromium');
else if (!env.ffmpeg) console.log('[env]   no ffmpeg → export / review will be skipped (stills and the storyboard still render).');

const results = {};   // stage -> { ran, ok, note }
function stage(id, okToRun, whyNot, cmd, args, extra = '') {
  if (skip.has(id)) { results[id] = { ran: false, ok: null, note: 'skipped by --skip' }; console.log(`\n=== ${id}: skipped (--skip)`); return; }
  if (!okToRun) { results[id] = { ran: false, ok: null, note: whyNot }; console.log(`\n=== ${id}: SKIPPED — ${whyNot}`); return; }
  console.log(`\n=== ${id} ${extra}`);
  const r = spawnSync(process.execPath, [path.join(TOOLS, cmd), ...args], { encoding: 'utf8', cwd: process.cwd() });
  const out = (r.stdout || '') + (r.stderr || '');
  process.stdout.write(out);
  fs.appendFileSync(LOG, `\n=== ${id}\n${out}\n`);
  results[id] = { ran: true, ok: r.status === 0, note: r.status === 0 ? 'ok' : `exit ${r.status}` };
  if (r.status !== 0) console.log(`[warn] ${id} exited ${r.status} — continuing`);
}

// 1. build — always (pure node)
stage('build', true, '', 'build.mjs', [ROOT]);
if (results.build.ran && !results.build.ok) { console.error('\nbuild failed — fix the errors above and rerun'); process.exit(1); }

// 2–3. previews (playwright)
const fmtArgs = opt('formats') ? ['--formats', opt('formats')] : [];
const dur = meta.format?.duration || 8;
const beatsAt = [0.2, 0.5, 0.8].map((f) => (dur * f).toFixed(2)).join(',');
stage('still', env.playwright, 'playwright missing', 'still.mjs', [ROOT, beatsAt, path.join(ROOT, 'preview.png'), '--scale', '0.35']);
stage('board', env.playwright, 'playwright missing', 'storyboard.mjs', [ROOT, path.join(ROOT, 'storyboard.png')]);

// 4–5. render + measured review (playwright + ffmpeg)
const exportArgs = [ROOT, '--share', ...(opt('workers') ? ['--workers', opt('workers')] : []), ...(opt('blur') ? ['--blur', opt('blur')] : []), ...fmtArgs];
stage('export', env.playwright && env.ffmpeg, 'playwright/ffmpeg missing', 'export.mjs', exportArgs);
stage('review', env.playwright && env.ffmpeg, 'playwright/ffmpeg missing', 'review.mjs', [ROOT]);

// 6. provenance stamps (always): colophon + invisible print, then a quick self-scrape
stage('stamp', true, '', 'agentprint.mjs', ['stamp', ROOT]);
stage('scrape', true, '', 'agentprint.mjs', ['scrape', ROOT, '--quiet']);

// ---- delivery block: the agent fills in made-by and closes with it (ONEPROMPT.md)
const done = Object.entries(results).map(([k, v]) => `${k}${v.ok === true ? '✓' : v.ok === false ? '✗' : '·'}`).join(' ');
const video = fs.existsSync(path.join(ROOT, 'renders', 'share.mp4')) ? `${path.relative(process.cwd(), path.join(ROOT, 'renders', 'share.mp4'))}`
  : fs.existsSync(path.join(ROOT, 'renders', 'final.mp4')) ? `${path.relative(process.cwd(), path.join(ROOT, 'renders', 'final.mp4'))}` : null;
const checks = results.review.ok ? 'the numbers are in run.log and review/ — report the headline ones (cuts on grid, anchor, loudest window + the silence before it, LUFS, text)'
  : 'review did not run here — say so, and report only what you verified';
const delivery = `<!-- anima-delivery v1 · ${encodeZW(makePayload({ name }))} -->

# ${meta.title || name}

<one line: what it is, and the sayable device — e.g. "a ${dur}s ${meta.style || 'cut paper'} piece: <device>. The silence before the payoff at <t>s; the loudest hit lands on it.">

- **video:** ${video || `built \`${path.relative(process.cwd(), path.join(ROOT, 'index.html'))}\` — open it to preview (renders skipped here: ${results.export.note})`}
- **files:** \`${path.relative(process.cwd(), ROOT)}/\` — index.html, brief.md, LOG.md${fs.existsSync(path.join(ROOT, 'preview.png')) ? ', preview.png' : ''}${fs.existsSync(path.join(ROOT, 'storyboard.png')) ? ', storyboard.png' : ''}
- **checks run:** ${done}
- **checks:** ${checks}
- **weakest shot:** <the one you'd fix first, and why>

made-by: <your model name here> · animate · ✦ cut on the beat ✦
`;
fs.writeFileSync(path.join(ROOT, 'DELIVERY.md'), delivery);
console.log('\n=== delivery');
console.log(delivery);
console.log(`wrote ${path.relative(process.cwd(), path.join(ROOT, 'DELIVERY.md'))} — fill in the two <…> lines and made-by, then close your reply with this block. Full stage output: ${path.relative(process.cwd(), LOG)}`);
