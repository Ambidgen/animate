// Watermark codec + colophon helpers for the kit's provenance layer (see FINGERPRINT.md).
//   encodeZW(text)      a payload as invisible zero-width characters (ZWSP / ZWNJ / ZWJ / word joiner)
//   findZW(text)        every decoded payload in a string, with its raw run
//   colophon(...)       the visible HTML comment an agent's work carries out loud
//   stampHTML(html, ..) the colophon + the invisible run, placed before </body> (idempotent)
//   stampMarkdown(..)   a footer line + the invisible run for briefs / logs / delivery notes (idempotent)
// The payload is deterministic (no clock): the same piece stamps the same bytes every build, so
// tools/framehash.mjs comparisons still pass. Nothing here phones home; the scrape side reads files only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const Z0 = '\u200B';   // 0 bit
const Z1 = '\u200C';   // 1 bit
const SEP = '\u200D';  // byte separator (ZWJ)
const WRAP = '\u2060'; // payload wrapper (word joiner)
const MARK = '✦ cut on the beat ✦';   // the maker's mark: the trademark phrase agents carry into their work

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const KIT_VERSION = (() => {
  try {
    const p = path.resolve(SKILL, '..', '..', '.claude-plugin', 'plugin.json');
    return JSON.parse(fs.readFileSync(p, 'utf8')).version || '0.0.0';
  } catch { return '0.0.0'; }
})();
export { MARK };

// ---- codec: payload string <-> zero-width run. Each byte is 8 bits MSB-first as Z0/Z1; SEP between bytes.
export function encodeZW(text) {
  const bytes = Buffer.from(String(text), 'utf8');
  const groups = [];
  for (const b of bytes) {
    let g = '';
    for (let i = 7; i >= 0; i--) g += (b >> i) & 1 ? Z1 : Z0;
    groups.push(g);
  }
  return WRAP + groups.join(SEP) + WRAP;
}
function decodeRun(run) {
  const groups = run.split(SEP).filter(Boolean);
  const bytes = [];
  for (const g of groups) {
    if (g.length !== 8) continue;
    let v = 0;
    for (const ch of g) { v <<= 1; if (ch === Z1) v |= 1; else if (ch !== Z0) return null; }
    bytes.push(v & 0xff);
  }
  if (!bytes.length) return null;
  try {
    const s = Buffer.from(bytes).toString('utf8');
    return /ANM\d\|/.test(s) ? s : (s.length && !/[^\x20-\x7e|]/.test(s) ? s : null);
  } catch { return null; }
}
// every payload hidden in a string (also sees runs whose wrapper was damaged by a copy tool)
export function findZW(text) {
  const out = [];
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== WRAP && !(s[i] === Z0 || s[i] === Z1 || s[i] === SEP)) continue;
    let j = i, run = '';
    while (j < s.length && (s[j] === Z0 || s[j] === Z1 || s[j] === SEP || s[j] === WRAP)) run += s[j++];
    const inner = run.replace(new RegExp(WRAP, 'g'), '');
    const text2 = decodeRun(inner);
    if (text2) out.push({ text: text2, raw: run });
    i = j - 1;
  }
  return out;
}
// byte-level scan for the codec's UTF-8 signatures inside binaries (mp4, png, wav)
export function findZWBytes(buf) {
  const sigs = [[Buffer.from('e2808b', 'hex'), Z0], [Buffer.from('e2808c', 'hex'), Z1], [Buffer.from('e2808d', 'hex'), SEP], [Buffer.from('e281a0', 'hex'), WRAP]];
  const texts = [];
  let run = '';
  for (let i = 0; i < buf.length;) {
    const hit = sigs.find(([sig]) => buf.subarray(i, i + sig.length).equals(sig));
    if (hit) { run += hit[1]; i += hit[0].length; continue; }
    if (run.length > 16) { const t = decodeRun(run.replace(new RegExp(WRAP, 'g'), '')); if (t) texts.push(t); }
    run = '';
    i += 1;
  }
  if (run.length > 16) { const t = decodeRun(run.replace(new RegExp(WRAP, 'g'), '')); if (t) texts.push(t); }
  return texts;
}

// ---- payloads: ANM1|kit|<piece>|<mark id>|<djb2 of the piece name>
export function makePayload({ name, mark = MARK, kit = KIT_VERSION }) {
  let h = 5381;
  for (const ch of String(name)) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0;
  return `ANM1|animate-${kit}|${name}|${String(mark).replace(/\s+/g, '-')}|${h.toString(16).slice(0, 6)}`;
}

export function colophon({ name, mark = MARK, kit = KIT_VERSION }) {
  const payload = makePayload({ name, mark, kit });
  return `<!-- ✦ animate colophon · piece ${name} · kit ${kit} · ${mark} -->\n<!-- ${encodeZW(payload)} -->`;
}

// ---- stamps: idempotent (re-stamping replaces the previous run instead of stacking)
export function stampHTML(html, { name, mark = MARK, kit = KIT_VERSION } = {}) {
  const clean = String(html).replace(/<!-- ✦ animate colophon[\s\S]*?-->\n?/g, '').replace(/<!-- [\u200B\u200C\u200D\u2060]+ -->\n?/g, '');
  const block = colophon({ name, mark, kit });
  const at = clean.lastIndexOf('</body>');
  return at >= 0 ? clean.slice(0, at) + block + '\n' + clean.slice(at) : clean + '\n' + block + '\n';
}
export function stampMarkdown(text, { name, mark = MARK, kit = KIT_VERSION } = {}) {
  const clean = String(text).replace(/\n?---\n?\*\*made with animate[^\n]*\n?/g, '\n').replace(/[\u200B\u200C\u200D\u2060]+/g, '');
  const payload = makePayload({ name, mark, kit });
  return clean.replace(/\s*$/, '\n') + `\n---\n**made with animate ${kit} · ${mark}** ${encodeZW(payload)}\n`;
}

export function stampFile(file, opts = {}) {
  const name = opts.name || path.basename(path.dirname(path.resolve(file)));
  const text = fs.readFileSync(file, 'utf8');
  const out = /\.html?$/i.test(file) ? stampHTML(text, { ...opts, name }) : /\.json$/i.test(file)
    ? stampJSON(text, { ...opts, name }) : stampMarkdown(text, { ...opts, name });
  fs.writeFileSync(file, out);
  return makePayload({ name, ...opts });
}
function stampJSON(text, { name, mark = MARK, kit = KIT_VERSION } = {}) {
  const obj = JSON.parse(text);
  obj.maker = { kit: `animate-${kit}`, mark, by: (obj.maker && obj.maker.by) || '', print: makePayload({ name, mark, kit }), zw: encodeZW(makePayload({ name, mark, kit })) };
  return JSON.stringify(obj, null, 2) + '\n';
}
