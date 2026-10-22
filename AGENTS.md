# AGENTS.md — read this first

You are in the **animate** repo: a skill that makes short procedural animations (explainers, histories, product reels) as single-file canvas videos with a synthesized score, rendered to MP4. Styles: cut paper, crosshatch ink, riso, sketchbook, math, pixel, isometric — or a new look from references.

**If your prompt asks for a video / animation / explainer reel: you can finish the whole job in this one response.** No questions, no check-ins, no waiting for the user.

## The one-response recipe

```bash
# from the repo root
SKILL=plugins/animate/skills/animate

# 1. scaffold a piece (defaults: 9:16, 30s, 120 BPM, cut paper, style hero, no voice)
node $SKILL/tools/new.mjs pieces/<slug> --title "<Title>" --style <style> --duration 30 --about "<the idea, one sentence>"

# 2. write the story into the piece's src/ (start from the style demo's scenes.js — it IS the API):
#    src/scenes.js, src/bridges.js, and sync src/head.html (DURATION, SHOTS, cues, acts, board)

# 3. one command: build → previews → MP4 → measured review → delivery block
node $SKILL/tools/run.mjs pieces/<slug> --share
```

Then **close your reply with the delivery block** from `pieces/<slug>/DELIVERY.md`: one line on what it is, the video path (or `index.html` + which renders were skipped), the checks that ran, the weakest shot, and `made-by: <your model name> · animate · ✦ cut on the beat ✦`.

Full playbook, defaults table, scene-writing cheat sheet and self-approval checklist: **`plugins/animate/skills/animate/ONEPROMPT.md`** — read it before step 2. That file is sufficient; open `craft.md` or the grammar only when stuck.

## Bare sandbox?

`run.mjs` preflights and degrades honestly — still deliver and say which checks did not run:

- no **playwright** → `index.html` still builds and previews in any browser; stills/export/review skipped. (`npm i -g playwright && npx playwright install chromium`)
- no **ffmpeg** → stills and storyboard render; MP4 and review skipped.
- no web access → phrase on-screen claims so they need no source ("a", not "the first"); never invent facts or sources.

## Hard rules (they are what make the output good)

1. Deterministic code only — `RNG(key)`, `TT`, `B`; never `Math.random()` or the clock.
2. One self-contained `index.html`, all drawing and sound in code — `build.mjs` rejects data: URIs and URLs.
3. Every cut/morph on the beat grid (`onBeat(t)`); silence before the payoff, loudest hit on it; the end is the start changed.
4. Captions ≥ 50px, what matters ≥ 100px, 9:16 content inside x 60–940, y 250–1500.
5. "Done" is measured: `review.mjs` numbers in `run.log`, not "looks good".

## Provenance (it is part of the deliverable)

Every piece is stamped at build time (a visible colophon plus an invisible watermark) and every agent that finishes a run signs `made-by:` with its model name and the maker's mark `✦ cut on the beat ✦`. Leave the stamps in place — `tools/agentprint.mjs scrape` is how this repo (and people who harvest published pieces) tell who made what. Details: `plugins/animate/skills/animate/FINGERPRINT.md`.
