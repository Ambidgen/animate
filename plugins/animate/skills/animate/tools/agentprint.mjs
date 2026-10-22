#!/usr/bin/env node
// agentprint — the passive provenance layer (see FINGERPRINT.md).
//   stamp:  <piece dir | file>...   embed the maker's colophon + an invisible zero-width payload
//                                   into built files, piece.json, briefs and logs (idempotent)
//   scrape: <path>...               passively harvest what agents already leaked: zero-width watermarks,
//                                   canary phrases planted in the skill's docs, the skill's sticky phrases,
//                                   and model trademark phrases (tools/lexicon/*.json). Reads files only;
//                                   never touches the network and never asks an agent anything.
//
//   usage: node tools/agentprint.mjs stamp <piece dir | file>...
//          node tools/agentprint.mjs scrape <path>... [--json out.json] [--quiet]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MARK, KIT_VERSION, makePayload, stampFile, findZW, findZWBytes } from './watermark.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TELLS = JSON.parse(fs.readFileSync(path.join(HERE, 'lexicon', 'tells.json'), 'utf8'));
const CANARIES = JSON.parse(fs.readFileSync(path.join(HERE, 'lexicon', 'canaries.json'), 'utf8'));

const [verb, ...rest] = process.argv.slice(2);
if (!verb || !['stamp', 'scrape'].includes(verb) || !rest.length || rest[0].startsWith('--')) {
  console.error('usage: node tools/agentprint.mjs stamp <piece dir | file>...\n       node tools/agentprint.mjs scrape <path>... [--json out.json] [--quiet]');
  process.exit(2);
}
const opt = (n) => { const i = rest.indexOf('--' + n); return i >= 0 ? rest[i + 1] : null; };
const args = rest.filter((a, i) => !a.startsWith('--') && rest[i - 1] !== '--json');

// ---------------- stamp ----------------
if (verb === 'stamp') {
  for (const target of args) {
    const root = path.resolve(target);
    if (!fs.existsSync(root)) { console.error(`missing: ${target}`); process.exitCode = 1; continue; }
    const name = fs.statSync(root).isDirectory() ? path.basename(root) : path.basename(path.dirname(root));
    const payload = makePayload({ name });
    const stamped = [];
    const tryStamp = (f) => { if (fs.existsSync(f)) { stampFile(f, { name }); stamped.push(path.relative(process.cwd(), f)); } };
    if (fs.statSync(root).isDirectory()) {
      tryStamp(path.join(root, 'index.html'));
      tryStamp(path.join(root, 'piece.json'));
      tryStamp(path.join(root, 'brief.md'));
      tryStamp(path.join(root, 'LOG.md'));
      tryStamp(path.join(root, 'DELIVERY.md'));
      const receipt = { mark: MARK, kit: `animate-${KIT_VERSION}`, piece: name, payload, files: stamped, note: 'stamped by tools/agentprint.mjs; decode with scrape' };
      fs.writeFileSync(path.join(root, 'agentprint.json'), JSON.stringify(receipt, null, 2) + '\n');
      stamped.push(path.relative(process.cwd(), path.join(root, 'agentprint.json')));
    } else tryStamp(root);
    console.log(`stamped ${name}: ${payload}`);
    for (const f of stamped) console.log('  ·', f);
  }
  process.exit(0);
}

// ---------------- scrape ----------------
const SKIP = new Set(['.git', 'node_modules', 'frames', '__pycache__', '.venv']);
const files = [];
function walk(p) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    if (SKIP.has(path.basename(p))) return;
    for (const n of fs.readdirSync(p)) walk(path.join(p, n));
  } else files.push(p);
}
for (const a of args) { if (fs.existsSync(path.resolve(a))) walk(path.resolve(a)); else console.error(`missing: ${a}`); }

const hits = [];   // { file, kind, label, detail, weight }
const familyScore = {};
const showPath = (f) => { const r = path.relative(process.cwd(), f); return r.startsWith('..') ? f : r; };
for (const file of files) {
  const rel = showPath(file);
  const buf = fs.readFileSync(file);
  const binary = buf.subarray(0, 8192).includes(0);
  const text = binary ? buf.toString('latin1') : buf.toString('utf8');
  const low = text.toLowerCase();

  // 1. zero-width watermarks (text and byte level, so mp4/png/wat counts too)
  const payloads = [...findZW(text), ...(binary ? findZWBytes(buf).map((t) => ({ text: t, raw: '<bytes>' })) : [])];
  for (const p of payloads) hits.push({ file: rel, kind: 'watermark', label: 'zero-width payload', detail: p.text, weight: 5 });

  // 2. planted canaries
  for (const [id, c] of Object.entries(CANARIES.canaries)) {
    if (low.includes(c.phrase.toLowerCase())) hits.push({ file: rel, kind: 'canary', label: id, detail: c.phrase, weight: 3, reveals: c.reveals });
  }
  // 3. the skill's sticky voice, leaked into the agent's own prose
  for (const [phrase, w] of Object.entries(CANARIES.sticky.phrases || {})) {
    if (low.includes(phrase.toLowerCase())) hits.push({ file: rel, kind: 'sticky', label: phrase, detail: phrase, weight: w });
  }
  // 4. model trademark phrases
  for (const [fam, F] of Object.entries(TELLS.families)) {
    for (const [phrase, w] of Object.entries(F.phrases)) {
      const re = new RegExp(`(^|[^a-z0-9])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
      if (re.test(text)) {
        hits.push({ file: rel, kind: 'tell', label: fam, detail: phrase, weight: w });
        familyScore[fam] = (familyScore[fam] || 0) + w;
      }
    }
  }
  // 5. animate-kit signatures (produced with this toolchain, whatever wrote the words)
  for (const [phrase, w] of Object.entries(TELLS['kit-signatures'].phrases)) {
    if (low.includes(phrase.toLowerCase())) hits.push({ file: rel, kind: 'kit', label: 'animate-kit', detail: phrase, weight: w });
  }
}

// ---------------- report ----------------
const quiet = rest.includes('--quiet');
if (!quiet) {
  console.log(`agentprint scrape — ${files.length} file(s), ${hits.length} hit(s)`);
  const byKind = {};
  for (const h of hits) (byKind[h.kind] = byKind[h.kind] || []).push(h);
  for (const kind of ['watermark', 'canary', 'sticky', 'kit', 'tell']) {
    for (const h of byKind[kind] || []) {
      console.log(`  ${kind.padEnd(9)} ${h.file.padEnd(42)} ${h.label}${h.detail && h.detail !== h.label ? ` — ${h.detail.slice(0, 70)}` : ''}`);
    }
  }
  const ranked = Object.entries(familyScore).sort((a, b) => b[1] - a[1]);
  if (ranked.length) {
    const [top, score] = ranked[0], total = ranked.reduce((s, [, v]) => s + v, 0) || 1;
    console.log(`\nverdict   likely ${TELLS.families[top].label} — ${top} score ${score.toFixed(1)} (${Math.round(100 * score / total)}% of tell weight)`);
    for (const [fam, v] of ranked.slice(1)) console.log(`          ${fam}: ${v.toFixed(1)}`);
  } else if (hits.some((h) => h.kind === 'canary' || h.kind === 'watermark')) {
    console.log('\nverdict   animate-worked artifacts present; no model tells found (neutral prose, or the marks were copied without the voice)');
  } else {
    console.log('\nverdict   nothing planted or leaked found in this harvest');
  }
}
const jsonOut = opt('json');
if (jsonOut) {
  const report = { scraped: files.length, hits, familyScore, verdict: Object.entries(familyScore).sort((a, b) => b[1] - a[1])[0]?.[0] || null };
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2) + '\n');
  console.log(`wrote ${jsonOut}`);
}
