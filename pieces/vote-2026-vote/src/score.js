// score.js — the film's sound, synthesized from nothing.
// A single sustained pad per act (it opens in voicing as the piece opens), one rising root,
// a counted tick for each of the 535 seats, a pluck for each mark on the ballot,
// a kick that enters on the date — then a hole, one hit, and the final resolve.
// Timings come from the picture's own act boundaries, imported from scenes.js.
import { rng, clamp, seg } from './core.js';
import { S, DURATION } from './scenes.js';

export function renderAudio(ctx, SR, DUR) {
  const N = Math.ceil(DUR * SR);
  const L = new Float32Array(N), R = new Float32Array(N);
  const rnd = rng('score');

  const put = (i, v, pan = 0) => {
    if (i < 0 || i >= N) return;
    const a = (pan + 1) * 0.25;
    L[i] += v * (1 - a); R[i] += v * a;
  };
  // one voice: a sine with quiet partials and a hair of detune (a synth, not a wall)
  const tone = (f, sec, det = 0.0022) =>
    Math.sin(2 * Math.PI * f * sec) + 0.13 * Math.sin(4 * Math.PI * f * sec) +
    0.05 * Math.sin(6 * Math.PI * f * sec) + 0.45 * Math.sin(2 * Math.PI * f * (1 + det) * sec);

  // a note with attack / sustain / release, written sample by sample
  function note(t0, dur, f, amp, pan = 0, { att = 0.5, rel = 1.6, breathe = 0.13, harm = 1 } = {}) {
    const i0 = Math.round(t0 * SR), n = Math.round((dur + rel) * SR);
    for (let k = 0; k < n; k++) {
      const i = i0 + k; if (i >= N) break;
      const sec = k / SR;
      const e = sec < att ? sec / att : sec <= dur ? 1 : Math.max(0, 1 - (sec - dur) / rel);
      if (e <= 0) continue;
      const br = 1 - breathe + breathe * Math.sin(2 * Math.PI * 0.11 * sec + f * 0.01);
      put(i, tone(f, sec) * harm * e * br * amp, pan);
    }
  }
  function hit(t0, f0, fGlide, dur, amp, decay) {
    const i0 = Math.round(t0 * SR);
    for (let k = 0; k < Math.round(dur * SR); k++) {
      const i = i0 + k; if (i >= N) break;
      const sec = k / SR;
      const f = f0 + fGlide * Math.exp(-sec * 24);
      put(i, Math.sin(2 * Math.PI * f * sec) * Math.exp(-sec * decay) * amp, 0);
    }
  }
  function click(t0, amp, pan) {
    const i0 = Math.round(t0 * SR), len = Math.round(0.016 * SR), f = 1500 + rnd() * 2800;
    for (let k = 0; k < len; k++) {
      const i = i0 + k; if (i >= N) break;
      put(i, Math.sin(2 * Math.PI * f * (k / SR)) * Math.exp(-(k / len) * 6) * amp, pan);
    }
  }
  function pluck(t0, f, amp, pan) {
    const i0 = Math.round(t0 * SR), len = Math.round(1.0 * SR);
    for (let k = 0; k < len; k++) {
      const i = i0 + k; if (i >= N) break;
      const sec = k / SR, e = Math.exp(-sec * 5.0);
      put(i, (Math.sin(2 * Math.PI * f * sec) + 0.26 * Math.sin(4 * Math.PI * f * sec)) * e * amp, pan);
    }
  }

  // ---------- the room: filtered noise, so the silence has a floor and the top has air ----------
  let lp = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    lp += (rnd() * 2 - 1 - lp) * 0.02;
    const fadeIn = clamp(t / 3), fadeOut = t > DUR - 3 ? clamp((DUR - t) / 3) : 1;
    put(i, lp * 0.05 * fadeIn * fadeOut, 0);
  }

  // ---------- the pad: one chord per act, the root rising to the final resolve ----------
  const acts = [
    { t: 0.25, d: S.q - 0.25 + 0.4, notes: [146.83, 220.0, 293.66, 73.42], amp: 0.9 },      // D  — the question
    { t: S.q, d: S.grid - S.q + 0.4, notes: [196.0, 293.66, 392.0, 98.0], amp: 1.0 },         // G  — the numbers
    { t: S.grid, d: S.down - S.grid + 0.4, notes: [246.94, 329.63, 493.88, 123.47], amp: 1.05 }, // Bm — the seats
    { t: S.down, d: S.turn - S.down + 0.4, notes: [293.66, 440.0, 587.33, 146.83], amp: 1.1 }, // D  — the ballot
    { t: S.turn, d: S.quiet - S.turn + 0.4, notes: [329.63, 493.88, 659.26, 164.81], amp: 1.15 }, // E — turnout
    { t: S.quiet, d: 3.2, notes: [220.0, 277.18, 329.63, 110.0], amp: 1.05 },                // Am — the hole's lead-in
    { t: 40.35, d: 2.4, notes: [293.66, 440.0, 587.33, 146.83], amp: 1.2 },                   // D  — the turn
    { t: S.ask, d: 2.6, notes: [246.94, 369.99, 493.88, 123.47], amp: 1.0 },                  // Bm — the ask
    { t: S.end + 0.2, d: DUR - S.end - 0.2, notes: [146.83, 220.0, 293.66, 440.0, 73.42], amp: 1.1 }, // D resolve — the box, filled
  ];
  for (const a of acts) {
    a.notes.forEach((f, n) => note(a.t, a.d, f, (0.042 * a.amp) / (1 + n * 0.42), (n - 1.5) * 0.28));
  }

  // ---------- the count: a tick per seat, dense at first, thinning as it runs ----------
  for (let k = 0; k < 535; k++) {
    const u = k / 534;
    click(S.grid + 0.55 + 3.0 * Math.pow(u, 1.5), 0.05 * (1 - 0.55 * u), (rnd() - 0.5) * 0.7);
  }

  // ---------- the ballot: one pluck per mark, climbing a D-major scale ----------
  {
    const scale = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.26, 739.99];
    for (let k = 0; k < 14; k++) pluck(S.down + 1.02 + k * 0.24, scale[k % 8] * (k >= 8 ? 2 : 1), 0.10, (k % 3 - 1) * 0.3);
  }

  // ---------- the kick: enters on the date, holds to the ask, stops for the hole ----------
  const HOLE = { a: S.quiet + 0.12, b: 40.30 };
  const inHole = (t) => t > HOLE.a && t < HOLE.b;
  for (let t = S.turn; t < S.ask - 0.2; t += 1.43) if (!inHole(t)) hit(t, 52, 90, 0.36, 0.34, 11);
  for (let t = S.end + 0.35; t < DUR - 1.2; t += 2.86) hit(t, 52, 80, 0.34, 0.26, 11);

  // ---------- the pass, just before the hole: a swell that cuts off ----------
  for (let i = Math.round((S.quiet - 2.2) * SR); i < Math.round(HOLE.a * SR); i++) {
    const x = i / SR;
    const e = Math.pow(clamp((x - (S.quiet - 2.2)) / 2.2), 3);
    put(i, (rnd() * 2 - 1) * e * 0.05, (rnd() - 0.5) * 0.5);
  }

  // ---------- the turn: one hit on the silence's end ----------
  hit(40.35, 44, 46, 2.2, 0.46, 2.4);
  { // a low fifth under it, and a bright edge so it reads on a phone speaker
    const i0 = Math.round(40.35 * SR);
    for (let k = 0; k < Math.round(1.4 * SR); k++) {
      const i = i0 + k; if (i >= N) break;
      const sec = k / SR;
      put(i, Math.sin(2 * Math.PI * 196 * sec) * Math.exp(-sec * 3.2) * 0.085, 0);
      put(i, Math.sin(2 * Math.PI * 880 * sec) * Math.exp(-sec * 9) * 0.02, 0.3);
    }
  }

  // ---------- the end card: the final resolve and the mark ----------
  hit(S.end + 1.05, 52, 70, 0.9, 0.30, 4.2);   // lands under VOTE
  hit(S.end + 2.05, 60, 40, 1.2, 0.16, 3.0);   // under vote.gov

  // ---------- the hole: everything above is gated to near-silence, on purpose ----------
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    if (inHole(t)) { const e = 0.03; L[i] *= e; R[i] *= e; }
  }

  // ---------- loudness stage: static gain to -14 LUFS (the caller measures and passes it in),
  //            then a soft limiter at -1 dBFS. Nothing here can lift the hole: it is linear. ----------
  const gain = globalThis.__SCORE_GAIN ?? 1;
  let peak = 0;
  for (let i = 0; i < N; i++) {
    L[i] *= gain; R[i] *= gain;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const ceil = 0.891;                        // -1 dBFS
  const knee = 0.62;
  const lim = (v) => {
    const a = Math.abs(v);
    if (a <= knee) return v;
    const s = Math.sign(v), x = (a - knee) / (ceil - knee);
    return s * (knee + (ceil - knee) * Math.tanh(x));
  };
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    buf.writeInt16LE(Math.round(clamp(lim(L[i]), -1, 1) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(clamp(lim(R[i]), -1, 1) * 32767), 46 + i * 4);
  }
  return { buf, peak };
}
