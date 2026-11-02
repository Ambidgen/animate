# Vote 2026 — a one-minute get-out-the-vote piece

**Format:** 60 s, 24 fps. Rendered at 9:16 (1080×1920), 1:1 (1080×1080) and 16:9 (1920×1080) from one source.
**Sound:** a synthesized score only — no narration, no voice, no music files.
**Stance:** nonpartisan. It names no party, candidate, or cause, and it tells nobody how to vote.

| file | what |
|---|---|
| `renders/final-1080x1920.mp4` | the main cut, made for a phone |
| `renders/final-1080x1080.mp4` | square |
| `renders/final-1920x1080.mp4` | wide |
| `stills/contact-sheet.png` | nine key frames, one per act |
| `src/score.js` | the score, synthesized (pad, counted ticks, plucks, kick, the hole, the hit) |
| `src/scenes.js` | the eight scenes and the act clock |
| `render/render.mjs` | the headless renderer |

## The film

One sheet of newsprint, two inks: **navy is the system** (dates, numbers, sources) and **persimmon is a mark a person makes**. Nothing else in the piece is persimmon.

| time | beat | what is on screen |
|---|---|---|
| 0:00 | Tomorrow. | TOMORROW printed with the spot colour a hair off-register; "is Election Day."; "Polls close early. Don't wait." |
| 0:08 | It isn't one race. | 435 HOUSE SEATS · 1/3 OF THE SENATE · 36 GOVERNORS, as a stat table with dotted leaders |
| 0:14 | 535 marks | 435 House seats fill in persimmon, then 100 Senate seats in navy; a tick per seat in the score |
| 0:23 | Down the ballot | seven checkboxes fill one at a time: state legislature, governor, mayor & city council, school board, judges, ballot measures, and the local ones nobody covers |
| 0:30 | Turnout | 100 dots, 46 of them turning persimmon; 46% of eligible voters in 2022; "The other 54 didn't." |
| 0:37 | The hole | 4 s of near-silence, one line writes on, then: "It is decided by the people **who show up**." |
| 0:45 | The ask | Find your polling place · check your hours and ID · **vote.gov** |
| 0:52 | End card | the box that sat empty in the corner all minute gets its mark; VOTE · vote.gov |

The visual spine is a checkbox. It sits empty in the top-right corner of the ask, and it is filled in the last four seconds. Early on it is a ballot row; at the end it is the viewer's own.

## What's checked, and what isn't

**Measured:**
- Duration exactly 60.00 s at 24 fps (1,440 frames); all three files decode without error.
- Audio: **−14.2 LUFS integrated**, true peak below −1 dBFS. Loudness range 5.5 LU.
- The arc was measured, not eyeballed. RMS in 1.5 s windows: ~−16 dB through the body, **−46 dB in the hole (37.7–40.3 s)**, **−9.6 dB on the hit at 40.4 s** — the loudest moment in the film is the turn, and the silence before it is the quietest.
- Determinism: rendering the same timestamp twice gives byte-identical PNGs.
- Text: every line was set with a measured fit (`fitSize`) after a real bug — canvas silently rejects fractional px in the `font` shorthand, which made earlier frames measure with a stale font and overrun the safe area.
- All three formats were checked by eye at frame level; the wide frame has its own type scale and row math.

**Not verified:**
- I can't listen to the score. Its balance is measured, not heard — the pad may sit too far forward on a phone speaker.
- The claim "polls close early" is a nudge, not a figure. Polling hours genuinely vary by state and county (some close at 6 pm, some 9 pm), which is why the ask says *check your hours* and points at vote.gov rather than quoting a time.
- Accessibility: no captions track. The film is all on-screen type, so it works muted, but a burned-in caption file wasn't produced.

## The facts on screen, and where they come from

- **Election Day is Tuesday, November 3, 2026.** All 435 House seats, 33–34 Senate seats (Class 2, plus special elections), and 36 governorships are on the ballot. (Multiple 2026 election guides, checked 2 Nov 2026.)
- **"1/3 of the Senate"** is the safe framing — the count of seats up is reported as 33 or 34 depending on how special elections are counted, so the film says a third rather than a number that could be wrong by one.
- **46% turnout** in the 2022 midterms is the US Elections Project's figure for the voting-eligible population (46.8%; 46.4% in some recounts — the film says 46%, and the screen credit names the source).
- The film deliberately contains **no polling, no forecasts, no "history says" claims** and no assertion about who benefits from turnout.

## Re-rendering

Needs Node 22+, and an ffmpeg binary (the renderer uses `FFMPEG` from the environment, falling back to the path Python's `imageio-ffmpeg` installs).

```bash
cd pieces/vote-2026-vote
npm i                                   # @napi-rs/canvas — native, no browser
node render/render.mjs stills 12.5,27,41,58 out.png      # contact strip
node render/render.mjs video --format 9:16 --crf 20      # → renders/final-1080x1920.mp4
node render/render.mjs video --format 1:1
node render/render.mjs video --format 16:9
```

A full 9:16 render takes about 65 s for 1,440 frames on two cores.

## How this sits against the Animate skill

This piece uses the skill's *grammar* — one constant (the date), colour carrying one meaning (persimmon = a mark), silence before the payoff and the loudest hit on it, a hard cut on the turn, a measured review pass — but not its browser renderer, because this sandbox has no Chromium and no system ffmpeg. `@napi-rs/canvas` draws the same way (a `t → frame` function), and the renderer pipes raw RGBA straight into ffmpeg.

The trade: this piece can't be previewed in a browser as `index.html` the way a normal Animate piece can, and it carries 116 KB of embedded, subset fonts. It does gain a genuinely dependency-light render path — no Playwright, no GPU probing, 65 s for a minute of 1080-wide video.
