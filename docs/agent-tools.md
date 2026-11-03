# The agentic animation stack

**A survey of the tools an AI agent can actually drive to make animation — checked 2 November 2026.**

This is the map Animate lives on. It answers one question: *if an agent (Claude Code, Codex, Cursor, Gemini CLI, or a script) is doing the animating, which tools can it reach, and how?*

Everything here was checked against the tool's own repository, npm/PyPI registry or docs on the date above: star counts, licences, latest versions, and — where possible — the actual CLI. Star counts are approximate and age fast. Anything I could only confirm through a third-party blog is marked **[secondary]**; treat those as leads, not facts.

---

## What makes a tool "agent-usable"

Five properties separate the tools that work in an agent loop from the ones that only look like they should:

1. **A frame is a pure function of time.** `renderFrame(t)` — the same `t` always gives the same pixels. Without this, a review pass can't trust what it sees, and a diff can't tell a regression from noise.
2. **The source of truth is a file.** Code, JSON, or a project file the agent can read and edit. A GUI's internal state is invisible to it.
3. **It runs headless from a terminal.** One command in, an MP4 or PNG out. If the tool needs a human to click "Render", it isn't in the loop.
4. **It gives the agent eyes.** Stills, contact sheets, snapshots, lint that names the problem, a report the agent can read back and act on. This is the difference between a tool an agent *can* drive and one it can drive *well*.
5. **The licence allows shipping.** MIT/Apache are safe; AGPL, "free under N people", and vendor-licence terms need a decision before the first render, not after.

Animate scores 5/5 on 1–3 by design, and invests heavily in 4 (`review.mjs`, `tile.mjs`, `textcheck.mjs`, frame hashing). Most of what follows is weaker somewhere — usually 4.

---

## At a glance

| Tool | What it is | Licence | How an agent drives it | State, 2 Nov 2026 |
|---|---|---|---|---|
| **[Animate](../README.md)** (this repo) | Canvas video: one HTML file, drawn + scored in code | MIT | Claude Code plugin / `npx skills add Ambidgen/animate`; Node CLI (`build`, `tile`, `export`, `review`) | 8 styles, 12 tools, 0.4.0 |
| **[HyperFrames](https://github.com/heygen-com/hyperframes)** | HTML/CSS/GSAP → deterministic MP4; "built for agents" | Apache-2.0 | `npx hyperframes init/preview/render`; 8 published agent skills; desktop Studio | 77.7k★, npm 0.9.6 |
| **[Remotion](https://github.com/remotion-dev/remotion)** | React components → MP4; the category's default | Free ≤3 people, then $25/seat/mo or $0.01/render | `npx create-video@latest`, `npx skills add remotion-dev/skills` (12 skills), Lambda/Cloud Run render | 70k★, 4.0.540 |
| **[Motion Canvas](https://github.com/motion-canvas/motion-canvas)** | TypeScript generators → vector animation + live editor | MIT | Agent writes scenes; editor previews | 19.7k★, core 3.17.2, maintained |
| **[Revideo](https://github.com/midrender/revideo)** (fork of Motion Canvas) | Motion Canvas + rendering pipeline for programmatic video | MIT | Agent writes TS; CLI renders | 4.2k★, @revideo/core 0.11.0 |
| **[Manim CE](https://github.com/ManimCommunity/manim)** | Python maths animation (3Blue1Brown style) | MIT | `manim scene.py Scene`; agents write Python | 42.2k★, 0.22.1 |
| **[manim_skill](https://github.com/adithya-s-k/manim_skill)** | Skill pack teaching an agent Manim CE + ManimGL | MIT | `npx skills add adithya-s-k/manim_skill` | 1.2k★, last push Jan 2026 |
| **[text-to-lottie](https://github.com/diffusionstudio/lottie)** | Agent skill that emits production Lottie JSON | MIT | `npx skills add diffusionstudio/lottie` + included player | 5.7k★, active |
| **[GSAP](https://github.com/greensock/GSAP)** | The web's motion library; now fully free | Free, all plugins, commercial included (Apr 2025) | Agent writes JS; any browser renders | 30k★, npm 3.15.0 |
| **[Motion](https://github.com/motiondivision/motion)** (ex-Framer Motion) | React/JS animation library | MIT | Agent writes JSX/props | 34.8k★, 14.9.0 |
| **[anime.js](https://github.com/juliangarnier/anime)** | Small, fast JS animation engine | MIT | Agent writes JS | 74.2k★, 4.5.0 |
| **[Rive](https://rive.app)** | Interactive state-machine animation; runtime + editor | Runtime MIT (@rive-app/canvas 2.49.1); editor subscription | **Official Rive Editor MCP** (ships inside the editor, early access) | Editor-bound; no headless render |
| **[Spline](https://spline.design)** | 3D design tool; V2 rebuilt the editor around WebGPU and agents | Proprietary | **MCP server bundled in the desktop app**; drives a live, still-editable scene | V2 launched 20 Aug 2026 |
| **[Three.js](https://github.com/mrdoob/three.js)** | WebGL/WebGPU 3D | MIT | Agent writes JS; Playwright renders frames | 117k★, r187 |
| **[PixiJS](https://github.com/pixijs/pixijs)** | Fast 2D WebGL/WebGPU renderer | MIT | Agent writes JS; Playwright renders | 48.6k★, 8.22.0 |
| **[Theatre.js](https://github.com/theatre-js/theatre)** | Visual sequencing for web animation | Apache-2.0 | Agent writes/reads project state | 12.8k★, dormant since Aug 2024 |
| **[rough.js](https://github.com/rough-stuff/rough)** | Hand-drawn 2D primitives | MIT | Agent writes JS | 21.3k★, stable/dormant |
| **[Blender + MCP](https://github.com/ahujasid/mcp-for-blender)** | 3D modelling, rigging, animation, render | MIT | MCP tools from Claude Code/Codex/Cursor; Blender addon on localhost | 33.1k★ (renamed from `blender-mcp`) |
| **[After Effects MCP](https://github.com/HeroicSwan/after-effects-mcp)** | Motion graphics in a live AE project | MIT (community servers) | MCP → CEP/ExtendScript bridge; frame capture for vision | AE 2022+ desktop only |
| **[fal MCP](https://fal.ai)** | 1,000+ hosted models incl. video | Commercial API | `claude mcp add --transport http fal-ai https://mcp.fal.ai/mcp` | Official, hosted |
| **[Replicate MCP](https://mcp.replicate.com/)** | Any public model, pinned versions | Commercial API | Remote `mcp.replicate.com/sse` or `npx -y replicate-mcp` | Official, hosted |
| **[Shotstack](https://shotstack.io)** / **[Creatomate](https://creatomate.com)** | Cloud render APIs with JSON timelines / templates | Commercial | Official hosted MCP servers | Mature |
| **[HY-Motion 1.0](https://github.com/Tencent-Hunyuan/HY-Motion-1.0)** | Text → skeleton motion (human) | Tencent Hunyuan Community Licence | Local inference, skeleton out | 2.6k★, 1.0B / 0.46B |
| **[UniMate](https://github.com/Friedrich-M/UniMate)** | Text → motion for *diverse* skeletons (SIGGRAPH Asia 2026) | MIT code | Local inference; FBX/GLB export | 2.4k★ |
| **[Kokoro-82M](https://github.com/hexgrad/kokoro)** | Local TTS, 54 voices, CPU-capable | Apache-2.0 | `pip install kokoro` (Python 0.9.4), `kokoro-js` (npm 1.2.1), a local OpenAI-compatible server ([Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI), 5.6k★), or `hyperframes tts` | Model repo quiet since Aug 2025; runtimes active |
| **[OpenMontage](https://github.com/calesthio/OpenMontage)** | Agentic end-to-end production system (12 pipelines) | **AGPL-3.0** | Agent skills; renders via Remotion/FFmpeg | 75.3k★ |

---

## 1. Code-rendered video engines — the core of the stack

These are the four an agent can genuinely *build* with today, in rough order of how much of the loop they hand you:

**HyperFrames** is the closest thing to a direct competitor to Animate's thesis, and it is worth studying closely. Its pitch — "write HTML. Render video. Built for agents." — is the same bet: web tech, deterministic frames, a headless render, and agent skills shipped *with* the renderer. What it has that Animate doesn't: a ~450-item registry of ready-made blocks (`hyperframes add`), a desktop Studio for human handoff, cloud/Lambda rendering, and a `check` command whose warnings are unusually well-designed for agents — `line_unread` (a line on screen too briefly to read, using a 0.3s-per-word rule), `dead_stretch`, `text_below_floor`, `first_frame_empty`, `film_silent`. Every one of those is a measured failure a model cannot see by looking at a still. Verified locally: `hyperframes doctor` (v0.9.6) requires Node 22+, FFmpeg and a headless Chrome; `render` is one command.

**Remotion** is the incumbent: React components as frames, the most mature render farm story (Lambda, Cloud Run, Vercel), 12 first-party agent skills, and a huge template ecosystem. Two things to keep in mind: it drags a React toolchain into every project, and its licence is *not* open source for larger users — free for individuals and companies of ≤3, then per-seat or per-render. For a solo creator it's genuinely free; for a studio or a product that renders for customers, budget for it.

**Motion Canvas** (and its fork **Revideo**, now `midrender/revideo`) is the animation-first TypeScript option: generator functions, a real timeline editor, excellent voice-over sync. It's MIT and stable but its ecosystem is thinner — no first-party agent skills, and the docs assume a human learning the API. An agent can write it well; it just has to be taught.

**Manim** is the outlier that keeps earning its place: for maths and technical diagrams nothing else gets close, its scene grammar is plain Python, and `manim_skill` (1.2k★) is a good example of packaging that knowledge for agents. It's also the least forgiving to install — LaTeX, ffmpeg, and two incompatible flavours (Manim CE and 3b1b's ManimGL) that fail loudly on each other's code. Note that `manim_skill` has been quiet since January 2026; check it still matches current Manim before leaning on it.

Animate's niche next to these four: it is the only one of them that ships a **style system** (eight drawing kits plus a procedure for matching new looks from references) and a **story grammar** with measured checks for cuts, arcs and loudness. The others give you a renderer and leave art direction to the prompt. That is the differentiator worth defending — and the reason the roadmap below is mostly about *borrowing their agent ergonomics* rather than their rendering.

---

## 2. Runtimes: when the animation ships inside a product

Not every animation is an MP4. When the deliverable is a loader, a hero animation, or an interactive explainer in an app, the target is a runtime, and the agent's job is to write code against it.

- **GSAP** stopped being a licensing question in April 2025 — Webflow made the whole library, including SplitText and MorphSVG, free for commercial use. It remains the default for timeline-driven DOM motion, and it's what HyperFrames builds on.
- **Motion** (14.9.0, MIT) is the React-first alternative; **anime.js** (4.5.0, MIT) is the small, dependency-free one.
- **text-to-lottie** is the interesting new entry. Lottie is the format that survives into iOS, Android, Flutter, React Native and the web, and until recently having an agent author it by hand was miserable — the JSON is opaque and a wrong keyframe is silent. This skill gives the agent a player to scrub against, so it can see its own mistakes. If a user asks for "an animation for my app" rather than "a video", this is the right shape of output, and Animate has no answer to it yet.
- **Rive** is the best runtime for *interactive* animation (state machines driven by real inputs) and now has an official **Rive Editor MCP** that lets Claude or Cursor scaffold state machines, layers and view models inside the editor **[secondary]**. The catch is structural: the MCP ships inside the early-access editor app, so it is a design assistant, not a headless render stage. The runtime (`@rive-app/canvas`, MIT) is what you'd actually ship.
- **Three.js** (r187) and **PixiJS** (8.22.0) are how an agent gets real-time 3D or GPU-heavy 2D into a piece. Both render fine under Playwright, which means both fit Animate's existing export path — `tools/gpu.mjs` already probes for a real GPU and warns when it falls back to SwiftShader. This is the shortest route to the "coming" WebGL style in the README.
- **Theatre.js** and **rough.js** are both stable and effectively frozen (last releases 2024). Fine as libraries — rough.js is still the cheapest way to get an authentic hand-drawn line — but don't expect an agent-shaped layer to appear around them.

---

## 3. Editors an agent can drive over MCP

This is the newest and fastest-moving category: instead of the agent writing code, it drives a real DCC tool through the Model Context Protocol.

**Blender** is the strongest case, and the numbers are hard to argue with: `mcp-for-blender` (renamed from `blender-mcp`) has 33.1k stars, an installer that wires up Claude Desktop/Code, Codex, Cursor, VS Code and Antigravity, and a one-command setup (`uvx mcp-for-blender setup`). It covers modelling, materials, rigging, animation, physics and render. For animation work the useful pattern is **asset generation, not shot authoring** — have the agent build, rig and render a prop or character, then bring the result into a code-rendered piece as sprites or a reference plate. Two caveats: the ecosystem is full of look-alikes of varying quality (one, `RFingAdam/mcp-blender`, publicly audits its own tools as broken as of October 2026), and Blender 5.x broke enough of the Python API that addon compatibility is a real concern.

**After Effects** has several community MCP servers. The good ones (`HeroicSwan/after-effects-mcp`) are thoughtfully built for agents: headless bridge startup, synchronous-feeling RPC with request IDs, and `ae_capture_frame` returning a PNG so the model can *see* what it did. But AE is a desktop application, licensing is per-seat, and scripting requires a preference toggle — so this is a **handoff** tool, not a build-loop tool. The realistic use: the agent produces the shot, a human motion designer opens it in AE for polish.

**Rive** and **Spline** have both shipped official MCP servers, and both are editor-bound: Spline's arrived with V2 (20 Aug 2026 — WebGPU renderer, AI agent, MCP bundled in the macOS/Windows desktop app, no standalone server) and it edits a *live, still-editable document* rather than exporting a flat image. That's the right design for design tools, and the wrong one for an unattended render farm. Rive's is early access **[secondary]**.

Rule of thumb: **MCP-into-an-editor is for assets and handoff; code-into-a-renderer is for the piece itself.**

---

## 4. Generative motion

Two very different things get called "AI animation", and an agent needs both for different jobs:

**Generated footage and clips.** The MCP gateways are now the practical interface: **fal** exposes 1,000+ models (Kling, Veo, LTX, Wan, FLUX, Stable Audio) through one hosted endpoint with an API key header, and **Replicate** exposes any public model with every prediction pinned to an immutable version — which is the property that matters if you want a render you can reproduce in six months. **Shotstack** and **Creatomate** sit above them as assembly layers with JSON timelines and hosted MCP servers, for turning a hundred clips into a hundred formatted videos without owning render infrastructure.

The honest benchmark for what this costs comes from **OpenMontage**: a 60-second animated short assembled from six Kling v3 clips, Chirp narration and a licensed score, total **$1.33**; a 50-second vertical brand film, **about $4**. Cheap enough to use as B-roll inside a code-rendered piece — which is the pattern Animate should support, not compete with. Note OpenMontage itself is **AGPL-3.0**, so its code is a reference, not a dependency, for an MIT skill.

**Text-to-motion (3D character animation)** matured in 2026. **HY-Motion 1.0** (Tencent Hunyuan) is a billion-parameter DiT + flow-matching model producing skeleton animation from a prompt — 1.0B and 0.46B variants, ~26 GB VRAM for the standard one, and a *custom Tencent community licence* that needs legal review before commercial use. **UniMate** (SIGGRAPH Asia 2026) is the more interesting result: one model for *diverse* skeletons — humans, quadrupeds, birds, insects — plus motion in-betweening and text-guided editing, MIT-licensed code with FBX/GLB export and animated mesh output. Caveat worth repeating: its training data (Truebones) has had public provenance questions raised, so clear it before shipping anything commercial.

Both are *research pipelines*, not agent tools. Neither belongs in a skill's happy path yet; both are worth a spike if a piece needs a walking character.

---

## 5. Audio: the part that quietly decides whether it feels finished

Animate already treats the voice as the clock (`voice.mjs`, faster-whisper word timing, ducking, −14 LUFS). What's changed around it:

- **Local TTS got good enough to ship.** Kokoro-82M (Apache-2.0, 82M params, 54 voices) runs on CPU and is the model HyperFrames ships as its free voice fallback (`hyperframes tts`); `kokoro-js` (1.2.1, Apache-2.0) puts it in Node with no Python. Comparable options: Chatterbox (MIT, zero-shot cloning), Piper (fast, CPU-first — note `piper-tts` itself is GPL-3.0).
- **That changes Animate's voice story.** Today `voice.mjs --scratch` produces a timing voice from the OS and says *never ship it*, with real takes coming from the ElevenLabs connector. A local Kokoro take is good enough to ship, which would make voice-over work with no account, no credits and no network.
- **Transcription** is solved either way: `faster-whisper` (1.2.1, MIT, already a dependency) or `whisper.cpp` if you want a single binary with no Python.

---

## 6. How skills get distributed now

The install surface moved while the rendering tools were maturing. [`skills`](https://github.com/vercel-labs/skills) (37.8k★, npm 1.7.5) is now the cross-agent package manager: `npx skills add <owner>/<repo>` clones, discovers every `SKILL.md`, and installs into whichever agent is present. Remotion, HyperFrames, Manim, text-to-lottie and Animate all publish this way.

I ran it against this repo:

```bash
npx skills add Ambidgen/animate --list
# Source: https://github.com/Ambidgen/animate.git
# Found 1 skill
#   animate — Make a short procedural animation in any style…
```

So the skill is already discoverable and installable by any agent that speaks the format — the README only documents the Claude Code marketplace path. It should document both.

Directories are proliferating alongside (one tracking site lists 402 Claude-Code video skills in October 2026 **[secondary]**). Signal to take from that: the differentiators are no longer "can it render" but "does it check its own work" — which is exactly where Animate's `review.mjs` investment pays off.

---

## 7. What to take, what to skip

Concrete, ordered by value to this repo.

### Adopt now (small, no new dependencies)

| Move | Why | Where |
|---|---|---|
| Document `npx skills add Ambidgen/animate` | Verified working; reaches Codex, Cursor, Gemini CLI, not just Claude Code | `README.md` → Install |
| Add Kokoro as a shippable local narrator | Removes the "never ship the scratch voice" dead end; Apache-2.0, CPU-only | `tools/voice.mjs` (`--local`), `intake.md` |
| Port HyperFrames' `line_unread` rule into `review.mjs` | Animate checks cut-off/overlap text but not *reading time* per line — an agent cannot see this in a still | `tools/review.mjs` → TEXT |
| Add a `film_silent` check | A muted export is the single most expensive silent failure | `tools/review.mjs` → SOUND |
| Cite the free-GSAP fact in `craft.md` | Anyone building a DOM style will otherwise assume it's still paid | `craft.md` → Code |

### Prototype (one piece each)

| Move | Why |
|---|---|
| A **Lottie export path** (`export.mjs --lottie`) | The only way to serve "animate our logo in the app" requests; text-to-lottie shows the format is agent-authorable and the runtimes are everywhere |
| The **WebGL style** the README already promises | `tools/gpu.mjs` already handles the GPU check; three.js r187 / PixiJS 8.22 both render deterministically under Playwright |
| **MCP handoff**: Blender for a prop, After Effects for the final polish | Turns "the agent can't do 3D or AE polish" from a limitation into a documented boundary |
| **Generated B-roll** via fal/Replicate, cut into a code-rendered piece on the beat | OpenMontage proves the cost (~$1–5/clip set); Animate already has the beat grid to cut it to |

### Watch, don't build on

| Tool | Why not yet |
|---|---|
| Rive Editor MCP | Early access, editor-bound, no headless render |
| Spline V2 MCP | Desktop-only; excellent for handoff, useless in a build loop |
| HY-Motion / UniMate | Research pipelines; ~26 GB VRAM and licence/provenance questions |
| Theatre.js, rough.js | Dormant upstream; safe to use, not safe to plan around |
| OpenMontage | AGPL-3.0 conflicts with MIT; read it, don't depend on it |

### Don't

**Remotion as Animate's renderer.** It would mean rewriting every style kit into React and taking on a licence that prices per render at scale, in exchange for a render farm Animate doesn't need. Better to *interoperate*: the ecosystem is already building converters (`/remotion-to-hyperframes`), and a piece that lives as plain HTML is the more portable artifact.

---

## 8. How this list was verified

```bash
# repos: stars, licence, last push (GitHub API)
curl -s https://api.github.com/repos/heygen-com/hyperframes | jq '.stargazers_count, .license.spdx_id, .pushed_at'

# packaging: latest version + licence
curl -s https://registry.npmjs.org/hyperframes/latest | jq '.version'
curl -s https://pypi.org/pypi/kokoro/json | jq '.info.version'

# the CLIs, actually run
npx -y hyperframes@0.9.6 --help && hyperframes doctor
npx -y skills@1.7.5 add Ambidgen/animate --list
```

Facts marked **[secondary]** come from press or directory coverage rather than the vendor's own repo/docs (Rive's MCP scope, the count of skills in directories, cloud-API pricing tiers). Re-check any of them before quoting them to a user.

---

*Maintained alongside Animate. If a tool here has changed — licence, CLI, or whether it still renders headlessly — fix the row and bump the date at the top.*
