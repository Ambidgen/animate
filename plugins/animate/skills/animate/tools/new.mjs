#!/usr/bin/env node
// new.mjs — scaffold a piece with zero questions (one-prompt mode's first command).
//   node tools/new.mjs <piece dir> [--title "T"] [--style NAME] [--duration SEC] [--format 9:16]
//                      [--formats 9:16,1:1] [--template piece|beat-cut|<style>] [--about "one sentence"]
// Copies piece.json + src/ from the best starting point:
//   --template beat-cut|piece   templates/<that>/
//   --template <style>|<style>  styles/<style>/demo (the demo already speaks the kit)
//   (no --template)             styles/<style>/demo if it exists, else templates/piece
// Then it fills in the spec (title, style, duration, formats, frame count), writes fresh brief.md and
// LOG.md (with the made-by field), stamps the provenance payload, and prints the exact next commands.
// Deterministic: same flags in, same piece out.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makePayload, encodeZW } from './watermark.mjs';

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = 'usage: node tools/new.mjs <piece dir> [--title "T"] [--style NAME] [--duration SEC] [--format 9:16] [--formats 9:16,1:1] [--template piece|beat-cut|<style>] [--about "one sentence"]';
const argv = process.argv.slice(2);
const dir = argv[0];
if (!dir || dir.startsWith('--')) { console.error(USAGE); process.exit(2); }
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };

const FORMAT_WH = { '9:16': [1080, 1920], '4:5': [1080, 1350], '1:1': [1080, 1080], '16:9': [1920, 1080] };
const slug = path.basename(path.resolve(dir)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'piece';
const title = opt('title', slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
const style = opt('style', 'cut-paper');
const duration = Math.max(4, Math.min(120, Number(opt('duration', '30'))));
const formats = (opt('formats', null) || opt('format', '9:16')).split(',').map((s) => s.trim());
const main = formats[0];
if (!FORMAT_WH[main]) { console.error(`unknown format ${main} (have ${Object.keys(FORMAT_WH).join(', ')})`); process.exit(2); }
const about = opt('about', `<the one true thing this piece gets across: ${title}>`);

// pick the template
function templateDir() {
  const t = opt('template', null);
  const candidates = [];
  if (t) {
    candidates.push(path.join(SKILL, 'templates', t), path.join(SKILL, 'styles', t, 'demo'));
  } else {
    candidates.push(path.join(SKILL, 'styles', style, 'demo'), path.join(SKILL, 'templates', 'piece'));
  }
  const found = candidates.find((c) => fs.existsSync(path.join(c, 'piece.json')) && fs.existsSync(path.join(c, 'src')));
  if (!found) { console.error(`no template found among: ${candidates.join(', ')}`); process.exit(1); }
  return found;
}
const TPL = templateDir();
const ROOT = path.resolve(dir);
if (fs.existsSync(ROOT) && fs.readdirSync(ROOT).length) { console.error(`${dir} already exists and is not empty — refusing to overwrite`); process.exit(1); }

// copy the template: piece.json, src/, and any loose js/json/md at its root (e.g. dark.js variants)
fs.mkdirSync(path.join(ROOT, 'src'), { recursive: true });
for (const n of fs.readdirSync(TPL)) {
  const from = path.join(TPL, n);
  if (n === 'brief.md' || n === 'LOG.md') continue;
  if (fs.statSync(from).isDirectory()) { if (n === 'src') for (const f of fs.readdirSync(from)) fs.copyFileSync(path.join(from, f), path.join(ROOT, 'src', f)); continue; }
  if (/\.(js|json|html|css)$/.test(n)) fs.copyFileSync(from, path.join(ROOT, n));
}

// piece.json: the spec filled in
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'piece.json'), 'utf8'));
const [w, h] = FORMAT_WH[main];
const fps = meta.format?.fps || 24;
meta.name = slug;
meta.title = title;
meta.style = style;
meta.formats = formats;
meta.format = { width: w, height: h, fps, bpm: 120, duration, frames: Math.round(duration * fps) };
meta.maker = { kit: 'animate', mark: '✦ cut on the beat ✦', by: '', print: makePayload({ name: slug }), zw: encodeZW(makePayload({ name: slug })) };
fs.writeFileSync(path.join(ROOT, 'piece.json'), JSON.stringify(meta, null, 2) + '\n');

// brief.md and LOG.md fresh (the template's are placeholders)
const beats = Math.round(duration / 5);
fs.writeFileSync(path.join(ROOT, 'brief.md'), `# Brief: ${title}

## The idea in one sentence

${about}

## Format and spec

- Format: ${meta.storyFormat || 'F2 morph chain'} (pick/change from grammar/FORMATS.md by the plot engine)
- Size: ${w}x${h}, ${fps}fps, 120 BPM, ${duration}s = ${Math.round(duration * fps)} frames; formats: ${formats.join(', ')} (main: ${main})
- Style: ${style}, set in piece.json "style"; hero: the style's own hero; colour rules: colour = one meaning

## Beats (aim for ~${beats}; every fact web-checked before it goes on screen)

| # | t (s) | what happens | bridge into the next | sound |
|---|-------|--------------|----------------------|-------|
${Array.from({ length: beats }, (_, i) => `| ${i + 1} | ${(i * duration / beats).toFixed(1)} |  |  |  |`).join('\n')}

## Sound plan

- Where the silence is (before the payoff), where the loudest hit is, how the score grows.

## Claims and sources (web-checked)

- <claim> - <source>

---
**made with animate · ✦ cut on the beat ✦** ${encodeZW(makePayload({ name: slug }))}

*${about} — the silence before the payoff; the loudest hit lands on it.*
`);

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(ROOT, 'LOG.md'), `# Log: ${slug}

## Run 1 - ${today}

- Time, outputs
- Numbers: cuts/morphs on grid, story arc, anchor, loudest window, LUFS
- Per-shot PASS table (contact sheets vs grammar/FRAME.md)
- What the review caught (fixes)
- Weakest shot and what would fix it

made-by: <your model name here> · animate · ✦ cut on the beat ✦
`);

console.log(`created ${path.relative(process.cwd(), ROOT)} from ${path.relative(SKILL, TPL)}`);
console.log(`  ${title} — ${duration}s @ ${w}x${h}, style ${style}, formats ${formats.join(', ')}`);
console.log('\nnext:');
console.log(`  1. write the story into src/scenes.js (and src/bridges.js); sync TIMELINE in src/head.html (DURATION, SHOTS, cues, acts, board)`);
console.log(`  2. node ${path.relative(process.cwd(), path.join(SKILL, 'tools', 'run.mjs')) || 'tools/run.mjs'} ${path.relative(process.cwd(), ROOT)} --share`);
console.log('  (one-prompt mode: see ONEPROMPT.md — no questions, defaults above, deliver the block run.mjs prints)');
