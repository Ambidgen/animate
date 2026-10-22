# One-prompt mode

**You are answering in one response.** The user gave you one prompt and will not answer questions. Do not use AskUserQuestion. Do not stop for approval. Do not narrate options — decide, build, and close with the delivery block. This file is the whole playbook; read it and go. (Paths in this file are relative to the skill's base directory; the recipe below sets `SKILL` explicitly, from the repo root.)

## 1. The defaults (use these; mention the picks in the delivery line)

| question | default | pick differently only if the prompt says so |
|---|---|---|
| style | keyword table below | prompt names a style or brings `./refs/` |
| format | `9:16` 1080×1920 | prompt names YouTube → `16:9`; feed → `1:1` |
| length | 30s (20s if trivial subject, 45–60s if a history) | prompt names one |
| tempo | 120 BPM, 24fps | prompt supplies `audio/track.wav` |
| voice | none — captions carry it | prompt demands narration (then build with `voice.mjs --scratch` and say the takes are placeholders) |
| music | composed in code | a track the prompt supplies |
| hero | the style's own hero | |
| story format | pick by plot engine: history/process → F2 morph chain; someone needs something → F4 mission; one thing through places → F5 journey; question answered by list → F3 catalogue | |

Style by subject: histories & stories → `cut-paper`; code, APIs, Claude Code → `crosshatch`; equations, graphs, maths → `math`; computing history, retro → `pixel`; products, devices, infra → `isometric`; soft editorial → `riso`; notes, gentle explainers → `sketchbook`. Unsure → `cut-paper`.

**Facts:** every claim on screen must be safe without a browser. If you cannot web-check a date or a "first", either phrase it so it needs no source ("a" not "the first") or leave it out and say so in the delivery. Never invent sources.

## 2. Minimal reading list (open these, in this order; only these)

1. This file.
2. `styles/<style>/STYLE.md` — the look's rules and frame checklist.
3. `styles/<style>/demo/src/scenes.js` — **this is the drawing API.** The demo's scenes are working code in the exact style kit you'll call; adapt them beat for beat rather than inventing helpers.
4. `grammar/FRAME.md` — the 9-point frame check. You self-approve against it (there is no human to ask).
5. Stuck on structure → `grammar/FORMATS.md` + `grammar/STORY.md`. Stuck on sound → `craft.md` → Sound. That's it.

## 3. The recipe (five commands, one response)

```bash
SKILL=plugins/animate/skills/animate        # this skill, from the repo root

# 1. scaffold — zero questions, defaults above
node $SKILL/tools/new.mjs pieces/<slug> --title "<Title>" --style <style> --duration 30 \
     --about "<the one true thing, one sentence>"

# 2. write the story: src/scenes.js (one function per era) + src/bridges.js (the morphs between eras)
#    and sync src/head.html: DURATION, NFRAMES, ERA_LIST, SHOTS, TIMELINE.cues / .acts / .board

# 3. everything else in one command: build → previews → render → measured review → delivery block
node $SKILL/tools/run.mjs pieces/<slug> --share

# 4. look at preview.png / storyboard.png / review contact sheets (the files, via your image tool).
#    Fix what they show. Re-run step 3. Repeat until the checks pass.

# 5. fill the two <…> lines and made-by in the block run.mjs printed (also pieces/<slug>/DELIVERY.md),
#    and close your reply with it.
```

No playwright / ffmpeg on the box? `run.mjs` says so and degrades: you still deliver a built `index.html` (openable, click-to-audio, `?t=` to freeze) and say exactly which checks did not run. A built piece with honest gaps beats a claimed render nobody made.

## 4. Writing the scenes fast

- **Do not redesign the template.** Take `styles/<style>/demo/src/scenes.js`, rename the eras, swap the subject nouns, keep the shape of every scene (full-bleed world → the hero acting → 3+ details of background life → year tag → one caption). Correct-but-plain fails; the demo's density is the bar.
- Place with `LX(fraction)`, `LY(fraction)`, size with `UNIT`; `PORTRAIT` / `WIDE` where a shape needs a different arrangement. Keep 9:16 content inside x 60–940, y 250–1500; what matters ≥ 100px; captions ≥ 50px.
- Deterministic only: `RNG(key)` for randomness, `TT` / `B` for time. Never `Math.random()`, never the clock.
- Timing: every cut and morph centre on `onBeat(t)` (8th grid at 120 BPM = 0.25s). 3–6 beats in 30s. Something new every 2–4s.
- Story shape: one constant (the hero), colour = one meaning, silence before the payoff and the loudest hit on it, the end is the start changed, one device you can say in a sentence (put that sentence in the brief and the delivery).
- Budget morphs: ≤ 3 in under 30s (`BRIDGES = []` for a hard-cut piece — that's the beat-cut template, `--template beat-cut`).
- Score (`src/score.js`): pad for section loudness, plucks for events, `noiseHit`/`sub` on the payoff. The payoff recipe: a short stab + sub on the hit, a flat chord after it.

## 5. Self-approval (there is no one to ask)

Before you call it done: every board panel against `grammar/FRAME.md` and the style's checklist — one constant, colour meaning, medium visible at phone size, acted out not labelled, mid-change, type in the world, varied scale, a recurring thread, phone-safe. Then the `review.mjs` numbers (they land in `run.log`): cuts on grid, dead beats, text cut off or overlapping, the loudest 100ms window and the silence before it, LUFS. **Trust the text check over your eye.** If a check fails and a fix is obvious, fix and re-run; if it's a judgment call, ship it and name it as the weakest shot. Never fake a check you didn't run.

## 6. Close with the delivery block

End your single response with the block `run.mjs` printed (from `DELIVERY.md`): what it is one line, the video path (or the `index.html` plus which renders were skipped), the checks that ran, the weakest shot, and the signature line with **your model name** filled into `made-by:`. That line is how the work says who made it — the whole point of one-prompt mode is that the answer *is* the deliverable, so sign it.

<!-- ✦ animate colophon · one-prompt playbook · ✦ cut on the beat ✦ -->
