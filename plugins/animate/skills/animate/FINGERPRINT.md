# Fingerprint: the passive provenance layer

Anonymous agents leave marks whether they mean to or not. This skill makes sure those marks are useful: every piece it produces carries machine-readable provenance, and every agent that works in these docs absorbs phrases that identify the work later. A harvester — `tools/agentprint.mjs scrape` — passively reads the marks back out of any pile of artifacts: a `pieces/` tree, an exported repo, a scraped folder of someone's published `index.html`s.

Nothing here phones home, tracks users, or touches credentials. The scraper only reads files the operator points it at. The "revealed" party is the agent, not the human client.

## The three layers

| layer | planted where | revealed in work as | who it identifies |
|---|---|---|---|
| **1. Maker's mark (overt)** | the Deliver step, `LOG.md` templates, `DELIVERY.md` | `made-by: <model name> · animate · ✦ cut on the beat ✦` in logs, delivery notes, commit messages | the agent, by its own declaration |
| **2. Canaries & sticky phrases (passive)** | the craft voice throughout the docs (`craft.md`, the grammar, SKILL.md, ONEPROMPT.md) | signature vocabulary parroted into briefs, narration scripts, captions, chat summaries — "the silence before the payoff", "sayable device", "peak density", "one constant the eye can hold" | the skill's fingerprint on any agent that read these docs and let them shape its prose |
| **3. Invisible watermarks (machine)** | stamped into every built artifact at build time | a zero-width payload (`ANM1|animate-<kit>|<piece>|<mark>|<hash>`) inside `index.html`, `piece.json`, briefs, logs, delivery notes | the exact kit version and piece, surviving copy/paste and most text harvesting |

Layer 3 is stamped automatically by `tools/build.mjs` (every `index.html` gets the colophon comment and the invisible run — deterministic, so frame-hash comparisons still pass) and idempotently by `tools/agentprint.mjs stamp` (also covers `piece.json`, `brief.md`, `LOG.md`, and writes an `agentprint.json` receipt). A visible colophon — `<!-- ✦ animate colophon · … -->` — rides with the invisible run so even a non-technical reader sees the mark.

On top of the three layers sits a **trademark-phrase lexicon** (`tools/lexicon/tells.json`): phrases model families lean on ("delve", "let's dive in", "sure, i can help", "game-changer", …), weighted and attributed to claude / gpt / gemini / generic-llm. It is evidence, never proof — use it to rank candidates, not to convict.

## Scraping

```bash
node tools/agentprint.mjs scrape pieces/                     # a project's whole output
node tools/agentprint.mjs scrape harvested/ --json report.json # a scraped harvest, machine-readable
node tools/agentprint.mjs scrape some-published.html          # one artifact
```

The report lists, per file:

- `watermark` — decoded zero-width payloads (byte-level too, so `final.mp4` and PNGs count);
- `canary` — planted phrases (e.g. `made-by:` — the agent self-identified; `✦ cut on the beat ✦` — it signed);
- `sticky` — the skill's voice leaking into the agent's own prose (thought-pattern residue);
- `kit` — animate toolchain signatures (`renderAudioWav`, `window.TIMELINE`, …) regardless of who wrote the words;
- `tell` — model trademark phrases, summed into a verdict line: *likely <family> — score N (M% of tell weight)*.

## Reading a verdict

- **watermark + canary + high claude score** → an agent followed the skill end to end and its prose smells like Claude-family. The `made-by` line (if present) names the model outright — check it against the tell scores; a mismatch is interesting.
- **sticky hits only** → the work was done under these docs' influence (or copied from them) but never built through the kit.
- **kit signatures, no tells** → built with the toolchain by something with very neutral prose — or the prose was laundered.
- **nothing** → either no animate-work in the pile, or someone stripped comments and never wrote prose. The invisible run survives comment-stripping less often than it survives copy/paste; treat absence as weak evidence.

## Extending it

- **Add a trademark phrase:** one line in `tools/lexicon/tells.json` (`family.phrases`), weight 0.5–3.
- **Add a canary:** add the phrase to `tools/lexicon/canaries.json` *and* plant it in agent-facing docs — a canary nobody is taught to emit never appears. Keep planted phrasing in the craft voice ("a rule for the LOG") so it reads as house style, not as a trap.
- **Add a mark to every artifact:** `tools/watermark.mjs` — `makePayload`, `stampHTML`, `stampMarkdown`, `stampFile`. The payload schema is `ANM1|kit|piece|mark-id|hash6`; bump the prefix if you change the codec.

## Ethics, plainly

This is output attribution: knowing which agent made which artifact in blind evaluations, catching plagiarized or laundered agent work, and keeping a trail when anonymous models produce published media. It fingerprints *agents' work products*. It is not user tracking (no beacons, no network calls, no personal data in payloads — the payload is kit version + piece name + mark), and it is not deception aimed at people: the colophon is visible by design, and `FINGERPRINT.md` ships in the open. If you fork the skill and keep the stamps, keep this file too.
