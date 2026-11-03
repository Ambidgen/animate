// scenes.js — eight scenes on one sheet of paper, sixty seconds, nonpartisan.
// The rule of the look: navy ink is the system, persimmon is a mark a person makes.
// Anything that is a vote is persimmon; nothing else is.
import { C, F, clamp, lerp, seg, ease, spring, pop, rise, rng, disc, ring, rr, rule, setFont, measure, tracked, trackedWidth, wrap, tightLine, stack, stackHeight, enter, halftone, misregistered, fitSize } from './core.js';

export const DURATION = 60.0;

// act boundaries drive the score and the seams
export const S = {
  q: 8.0,      // S1 -> S2  the numbers
  grid: 14.5,  // S2 -> S3  the 535
  down: 23.0,  // S3 -> S4  down the ballot
  turn: 30.0,  // S4 -> S5  turnout
  quiet: 37.5, // S5 -> S6  the silence
  ask: 45.0,   // S6 -> S7  the ask
  end: 52.0,   // S7 -> S8  end card
  out: 60.0,
};

// ---------------------------------------------------------------- chrome
function chrome(ctx, t, L) {
  // the constant: the date, top-left, in every frame
  enter(ctx, t, -0.1, { fn: () => {
    const x = L.portrait ? 72 : 132, y = L.portrait ? 176 : 96;
    ctx.fillStyle = C.vote; ctx.fillRect(x, y - 17, 11, 19);
    tracked(ctx, 'NOVEMBER 3, 2026', x + 25, y, { size: L.T.micro, face: F.mono, color: C.inkSoft, track: 0.15 });
  } });

  // progress rule along the bottom of the live area
  const y = L.portrait ? L.H - 128 : L.H - 52, x0 = L.portrait ? 72 : 132, x1 = L.W - x0;
  rule(ctx, x0, y, x1, 'prog' + (Math.floor(t * 12) % 4), { lw: 1.5, color: C.muteLight, amp: 0.5, alpha: 0.9 });
  ctx.save(); ctx.globalAlpha = 0.9;
  rule(ctx, x0, y, lerp(x0, x1, clamp(t / DURATION)), 'progf' + (Math.floor(t * 12) % 4), { lw: 3, color: C.vote, amp: 0.5 });
  ctx.restore();
}

// ---------------------------------------------------------------- S1: Tomorrow.
function s1(ctx, t, L) {
  const dsz = fitSize(ctx, 'TOMORROW', L.box.w * 0.99, L.T.display, F.sans, -0.02);
  const sub = L.T.sub;
  const body = L.T.body;

  // measure the whole block first, then centre it in the live area
  const H = dsz * 0.78 + sub * 1.75 + body * 2.5 + body * 1.1;
  const top = L.CY() - H / 2;

  enter(ctx, t, 0.0, { fn: () => tracked(ctx, 'THE 2026 MIDTERMS', L.LX(0), top, { size: L.T.micro, face: F.mono, color: C.inkSoft, track: 0.2 }) });

  // TOMORROW — with the spot colour printed a hair off-register
  const baseY = top + dsz * 0.78;
  const p = rise(t, 0.12, 0.85, 46);
  if (p.p > 0) {
    ctx.save(); ctx.globalAlpha = p.a; ctx.translate(0, p.dy);
    tightLine(ctx, 'TOMORROW', L.LX(0), baseY, dsz, C.ink, -0.02);
    ctx.restore();
    const off = 7 + (1 - p.p) * 26;
    ctx.save(); ctx.globalAlpha = 0.30 * clamp(p.p * 1.2);
    tightLine(ctx, 'TOMORROW', L.LX(0) + off, baseY + off * 0.8, dsz, C.vote, -0.02);
    ctx.restore();
  }

  // "is Election Day." writes on under it
  const ySub = baseY + sub * 1.75;
  const p2 = seg(t, 1.55, 1.55 + 0.85);
  if (p2 > 0) {
    setFont(ctx, sub, F.sansR);
    const s = 'is Election Day.';
    const w = ctx.measureText(s).width;
    ctx.save(); ctx.globalAlpha = clamp(p2 * 1.6) * 0.95;
    ctx.beginPath(); ctx.rect(L.LX(0), ySub - sub * 1.05, w * ease.out(p2) + 2, sub * 1.5); ctx.clip();
    ctx.fillStyle = C.inkSoft; ctx.fillText(s, L.LX(0), ySub);
    ctx.restore();
    enter(ctx, t, 2.3, { fn: () => { ctx.fillStyle = C.vote; disc(ctx, L.LX(0) + w + sub * 0.30, ySub - sub * 0.12, sub * 0.10); } });
  }

  // the deadline line, bold, on the body row
  const t3 = 3.5;
  const p3 = spring(seg(t, t3, t3 + 0.75));
  if (p3 > 0) {
    const y = ySub + body * 2.5;
    ctx.save(); ctx.globalAlpha = clamp(p3 * 1.3); ctx.translate(0, (1 - p3) * 18);
    setFont(ctx, body, F.sansR); ctx.fillStyle = C.ink;
    ctx.fillText('Polls close early. ', L.LX(0), y);
    const w1 = ctx.measureText('Polls close early. ').width;
    setFont(ctx, body, F.sans); ctx.fillStyle = C.vote;
    ctx.fillText('Don’t wait.', L.LX(0) + w1, y);
    ctx.restore();
    enter(ctx, t, t3 + 0.5, { fn: () => rule(ctx, L.LX(0), y + body * 0.42, L.LX(0) + Math.min(L.box.w * 0.9, w1 + measure(ctx, 'Don’t wait.', body, F.sans) + 4), 's1r' + (Math.floor(t * 12) % 4), { lw: 3, color: C.vote, amp: 1.1, alpha: 0.9 }) });
  }

  // a printed rule at the foot of the sheet, and the calendar tick that started it
  enter(ctx, t, 1.4, { fn: () => { ctx.save(); ctx.globalAlpha = 0.4; rule(ctx, L.LX(0), L.LY(0.94), L.LX(1), 's1c' + (Math.floor(t * 12) % 4), { lw: 1.5, color: C.mute, amp: 0.8 }); ctx.restore(); } });
}

// ---------------------------------------------------------------- S2: the numbers
function s2(ctx, t, L) {
  const hs = L.T.headline * 0.86;
  enter(ctx, t, S.q + 0.15, { fn: () => tightLine(ctx, 'It isn’t one race.', L.LX(0), L.LY(0.10), hs, C.ink, -0.015) });

  const rows = [
    { big: '435', label: 'HOUSE SEATS', t0: 9.0 },
    { big: '1/3', label: 'OF THE SENATE', t0: 10.5 },
    { big: '36', label: 'GOVERNORS', t0: 12.0 },
  ];
  const big = L.T.mega * 0.86;
  const rowH = L.portrait ? 292 : 250;
  const y0 = L.portrait ? L.CY() - rowH - L.T.mega * 0.34 : L.LY(0.30);

  rows.forEach((r, i) => {
    const y = y0 + i * rowH;
    const p = pop(t, r.t0, 0.62);
    if (p <= 0) return;
    // the numeral, counted up quickly so it lands with a settle
    const shown = r.big.replace(/\d+/g, (m) => String(Math.round(Number(m) * ease.out(seg(t, r.t0, r.t0 + 0.6)))));
    setFont(ctx, big, F.sans);
    ctx.save(); ctx.globalAlpha = clamp(p * 1.4); ctx.translate(0, (1 - p) * 24);
    ctx.fillStyle = C.ink; ctx.fillText(shown, L.LX(0), y);
    ctx.restore();
    const w = ctx.measureText(shown).width;

    // label right-aligned on the sheet edge, dotted leader running back to the numeral
    const ls = L.T.micro;
    const lw = trackedWidth(ctx, r.label, ls, F.mono, 0.14);
    const pl = ease.out(seg(t, r.t0 + 0.2, r.t0 + 0.9));
    if (pl > 0) {
      tracked(ctx, r.label, L.LX(1), y - big * 0.20, { size: ls, face: F.mono, color: C.inkSoft, track: 0.14, align: 'right', alpha: clamp(pl * 1.5) });
      const xa = L.LX(0) + w + 30, xb = L.LX(1) - lw - 26;
      if (xb > xa) {
        ctx.save(); ctx.globalAlpha = 0.45 * clamp(pl * 1.4); ctx.fillStyle = C.inkSoft;
        for (let x = xa; x < lerp(xa, xb, pl); x += 13) disc(ctx, x, y - big * 0.26, 1.7);
        ctx.restore();
      }
    }
    // persimmon rule under the numeral only
    const pr = ease.out(seg(t, r.t0 + 0.15, r.t0 + 1.0));
    if (pr > 0) rule(ctx, L.LX(0), y + big * 0.30, L.LX(0) + w * pr, 's2' + i + (Math.floor(t * 12) % 4), { lw: 3.5, color: C.vote, amp: 1.1 });
  });

  // the punchline
  enter(ctx, t, 13.15, { fn: () => {
    const y = L.LY(0.985);
    setFont(ctx, L.T.sub * 0.9, F.sansR); ctx.fillStyle = C.inkSoft;
    ctx.fillText('Every one of them turns on ', L.LX(0), y);
    const w = ctx.measureText('Every one of them turns on ').width;
    setFont(ctx, L.T.sub * 0.9, F.sans); ctx.fillStyle = C.ink;
    ctx.fillText('who votes.', L.LX(0) + w, y);
  } });
}

// ---------------------------------------------------------------- S3: the 535
function s3(ctx, t, L) {
  const N = 535, MARK = 435;
  const cols = L.portrait ? 22 : 43;
  const rows = Math.ceil(N / cols);
  const pitch = L.box.w / cols;
  const areaH = rows * pitch;
  const gx = L.LX(0), gy = L.LY(0.115);
  const r = pitch * 0.27;
  const rnd = rng('grid');

  // 435 House seats first (persimmon), then 100 Senate seats (navy)
  const fillT = (i) => S.grid + 0.55 + 2.55 * (Math.pow(i / MARK, 0.94)) + rnd() * 0.18;
  for (let i = 0; i < N; i++) {
    const cx = gx + (i % cols) * pitch + pitch / 2;
    const cy = gy + Math.floor(i / cols) * pitch + pitch / 2;
    const isHouse = i < MARK;
    const k = isHouse ? clamp((t - fillT(i)) / 0.20) : clamp((t - (S.grid + 2.9 + (i - MARK) * 0.004)) / 0.4);
    ctx.save();
    if (k <= 0) {
      ctx.globalAlpha = 0.46; ctx.strokeStyle = isHouse ? C.voteInk : C.inkSoft;
      ring(ctx, cx, cy, r, Math.max(1.3, pitch * 0.06));
    } else {
      ctx.globalAlpha = 1;
      ctx.fillStyle = isHouse ? C.vote : C.inkSoft;
      disc(ctx, cx, cy, r * (0.5 + 0.5 * ease.outBack(k)));
    }
    ctx.restore();
  }

  // caption sits under the field, measured
  const capY = gy + areaH + (L.portrait ? 96 : 62);
  const cs = L.T.sub * 0.92;
  enter(ctx, t, S.grid + 0.55, { fn: () => { setFont(ctx, cs, F.sans); ctx.fillStyle = C.ink; ctx.fillText('Every seat in the House.', L.LX(0), capY); } });
  enter(ctx, t, S.grid + 3.1, { fn: () => { setFont(ctx, cs, F.sans); ctx.fillStyle = C.inkSoft; ctx.fillText('A third of the Senate.', L.LX(0), capY + cs * 1.32); } });
  enter(ctx, t, S.grid + 3.5, { fn: () => tracked(ctx, `${MARK} OF ${N}`, L.LX(1), L.LY(0.075), { size: L.T.micro, face: F.mono, color: C.vote, track: 0.16, align: 'right' }) });
}

// ---------------------------------------------------------------- S4
// ---------------------------------------------------------------- S4: down the ballot
const OFFICES = ['STATE LEGISLATURE', 'GOVERNOR', 'MAYOR & CITY COUNCIL', 'SCHOOL BOARD', 'JUDGES', 'BALLOT MEASURES', 'AND THE LOCAL ONES NOBODY COVERS'];
function s4(ctx, t, L) {
  const hs = L.T.headline * 0.72;
  enter(ctx, t, S.down - 0.02, { fn: () => {
    tightLine(ctx, 'And further', L.LX(0), L.LY(0.055), hs, C.ink, -0.015);
    tightLine(ctx, 'down the ballot:', L.LX(0), L.LY(0.055) + hs * 1.02, hs, C.ink, -0.015);
  } });

  const y0 = L.portrait ? L.LY(0.225) : L.LY(0.26);
  const capY4 = L.LY(0.97);
  const rowH = Math.max(46, Math.min(L.portrait ? 128 : 96, (capY4 - L.T.sub * 1.5 - y0) / OFFICES.length));
  const ls = L.T.body * 0.80;
  const sq = L.portrait ? 44 : 36;

  // the stack draws only the rows that have arrived, so the rules never outrun the boxes
  OFFICES.forEach((label, i) => {
    const t0 = S.down + 0.30 + i * 0.38;
    const p = seg(t, t0, t0 + 0.45);
    if (p <= 0) return;
    const y = y0 + i * rowH;
    const last = i === OFFICES.length - 1;
    const cy = y + rowH * 0.5;

    // checkbox
    ctx.save(); ctx.globalAlpha = clamp(p * 1.5);
    ctx.strokeStyle = C.inkSoft; ctx.lineWidth = 2.5;
    rr(ctx, L.LX(0), cy - sq / 2, sq, sq, 4); ctx.stroke();
    ctx.restore();

    // the mark: same check as the end card, persimmon, drawn in two strokes
    const pk = seg(t, t0 + 0.22, t0 + 0.6);
    if (pk > 0) {
      const X = L.LX(0), Y = cy - sq / 2, z = sq;
      const a = [X + z * 0.20, Y + z * 0.50], b = [X + z * 0.42, Y + z * 0.76], c = [X + z * 0.82, Y + z * 0.20];
      const k1 = clamp(pk / 0.45), k2 = clamp((pk - 0.4) / 0.6);
      ctx.save(); ctx.strokeStyle = C.vote; ctx.lineWidth = Math.max(5, sq * 0.17); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(a[0], a[1]);
      ctx.lineTo(lerp(a[0], b[0], k1), lerp(a[1], b[1], k1));
      if (k2 > 0) ctx.lineTo(lerp(b[0], c[0], k2), lerp(b[1], c[1], k2));
      ctx.stroke(); ctx.restore();
    }

    // label writes on, sized to the room it has
    const pl = ease.out(seg(t, t0 + 0.08, t0 + 0.7));
    if (pl > 0) {
      const x = L.LX(0) + sq + (L.portrait ? 30 : 22);
      const avail = L.LX(1) - x - 6;
      const lsz = fitSize(ctx, label, avail, ls * 0.86, F.mono, 0.03);
      const tw = trackedWidth(ctx, label, lsz, F.mono, 0.03);
      ctx.save();
      // a leader rule from the label's end to the edge of the sheet
      ctx.globalAlpha = 0.22 * clamp(pl * 1.5);
      rule(ctx, x + tw * pl + 14, cy + 1, L.LX(1), 's4r' + i + (Math.floor(t * 12) % 4), { lw: 1.5, color: C.ink, amp: 0.6 });
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.rect(x, cy - lsz * 1.1, avail * pl + 2, lsz * 1.6); ctx.clip();
      tracked(ctx, label, x, cy + lsz * 0.34, { size: lsz, face: F.mono, color: C.ink, track: 0.03, alpha: (last ? 0.62 : 0.95) * clamp(pl * 1.5) });
      ctx.restore();
    }
  });

  enter(ctx, t, S.down + 3.95, { fn: () => {
    const y = capY4;
    setFont(ctx, L.T.sub * 0.92, F.sansR); ctx.fillStyle = C.inkSoft;
    ctx.fillText('It goes ', L.LX(0), y);
    const w = ctx.measureText('It goes ').width;
    setFont(ctx, L.T.sub * 0.92, F.sans); ctx.fillStyle = C.vote;
    ctx.fillText('all the way down.', L.LX(0) + w, y);
  } });
}

// ---------------------------------------------------------------- S5: turnout
const DOT = { n: 100, on: 46, cols: 10 };
function s5(ctx, t, L) {
  const pitch = Math.min(L.box.w / (DOT.cols + 0.4), (L.box.h * 0.66) / (DOT.cols + 0.4));
  const gw = pitch * DOT.cols;
  const gx = L.LX(0) + (L.box.w - gw) / 2 + pitch / 2;
  const gy = L.LY(0.075);
  const r = pitch * 0.30;

  enter(ctx, t, S.turn - 0.05, { fn: () => tracked(ctx, 'WHO ACTUALLY VOTES', L.LX(0), L.LY(0.045), { size: L.T.micro, face: F.mono, color: C.inkSoft, track: 0.18 }) });

  for (let i = 0; i < DOT.n; i++) {
    const cx = gx + (i % DOT.cols) * pitch;
    const cy = gy + Math.floor(i / DOT.cols) * pitch;
    const isOn = i < DOT.on;
    const ft = S.turn + 0.9 + (i / DOT.on) * 1.7;
    const k = isOn ? clamp((t - ft) / 0.28) : 0;
    const appear = seg(t, S.turn - 0.50, S.turn + 0.05);
    ctx.save(); ctx.globalAlpha = appear;
    if (k <= 0) { ctx.strokeStyle = C.mute; ctx.lineWidth = 2; ring(ctx, cx, cy, r, 2); }
    else { ctx.fillStyle = C.vote; disc(ctx, cx, cy, Math.max(0.01, r * ease.outBack(k))); }
    ctx.restore();
  }

  // the number, big, then the sentence that makes it mean something
  const yn = gy + DOT.cols * pitch + (L.portrait ? 150 : 100);
  const pn = rise(t, S.turn + 3.0, 0.7, 26);
  if (pn.p > 0) {
    ctx.save(); ctx.globalAlpha = pn.a; ctx.translate(0, pn.dy);
    setFont(ctx, L.T.mega * 0.78, F.sans); ctx.fillStyle = C.ink;
    ctx.fillText('46%', L.LX(0), yn);
    ctx.restore();
    enter(ctx, t, S.turn + 3.4, { fn: () => {
      const w = measure(ctx, '46%', L.T.mega * 0.78, F.sans);
      setFont(ctx, L.T.micro, F.mono); ctx.fillStyle = C.inkSoft;
      ctx.fillText('OF ELIGIBLE VOTERS, 2022', L.LX(0) + w + (L.portrait ? 30 : 24), yn - L.T.micro * 0.2);
    } });
  }
  enter(ctx, t, S.turn + 4.0, { fn: () => {
    setFont(ctx, L.T.sub * 0.86, F.sansR); ctx.fillStyle = C.ink;
    ctx.fillText('The other 54 didn’t.', L.LX(0), yn + L.T.sub * 1.35);
  } });
  enter(ctx, t, S.turn + 3.2, { fn: () => tracked(ctx, 'SOURCE: US ELECTIONS PROJECT', L.LX(0), L.LY(0.985), { size: L.T.tiny, face: F.mono, color: C.inkSoft, track: 0.12, alpha: 0.55 }) });
}

// ---------------------------------------------------------------- S6: the silence, and the turn
function s6(ctx, t, L) {
  // the dots stay as a ghost so the previous thought is still there
  const pitch = Math.min(L.box.w / (DOT.cols + 0.4), (L.box.h * 0.66) / (DOT.cols + 0.4));
  const gw = pitch * DOT.cols;
  const gx = L.LX(0) + (L.box.w - gw) / 2 + pitch / 2, gy = L.LY(0.075);
  ctx.save(); ctx.globalAlpha = 0.055;
  for (let i = 0; i < DOT.n; i++) {
    const cx = gx + (i % DOT.cols) * pitch, cy = gy + Math.floor(i / DOT.cols) * pitch;
    ctx.fillStyle = i < DOT.on ? C.vote : C.mute;
    disc(ctx, cx, cy, pitch * 0.29);
  }
  ctx.restore();

  // line one, written on with no bounce
  const s1 = L.T.sub * 0.92;
  const yA = L.LY(0.30);
  const p1 = seg(t, S.quiet + 0.5, S.quiet + 1.9);
  if (p1 > 0) {
    setFont(ctx, s1, F.sansR);
    const w = ctx.measureText('Not a weather report.').width;
    ctx.save(); ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.rect(L.LX(0), yA - s1 * 1.05, w * ease.out(p1) + 2, s1 * 1.45); ctx.clip();
    ctx.fillStyle = C.inkSoft; ctx.fillText('Not a weather report.', L.LX(0), yA);
    ctx.restore();
  }

  // the payoff: lands on the loudest hit at 40.4, then the second line
  const bs = L.T.headline * 0.92;
  const yB = L.LY(0.50);
  const ts = S.quiet + 2.85;
  const lineA = ['It is decided', 'by the people'];
  if (t > ts) {
    lineA.forEach((ln, i) => {
      const p = pop(t, ts + i * 0.16, 0.55);
      if (p <= 0) return;
      ctx.save(); ctx.globalAlpha = clamp(p * 1.5); ctx.translate(0, (1 - p) * 22);
      tightLine(ctx, ln, L.LX(0), yB + i * bs * 1.04, bs, C.ink, -0.014);
      ctx.restore();
    });
  }
  const yC = yB + bs * 2.08 + L.T.sub * 0.55;
  if (t > ts + 0.5) {
    const parts = [['who ', C.ink], ['show up', C.vote], ['.', C.vote]];
    let x = L.LX(0);
    setFont(ctx, bs, F.sans);
    parts.forEach(([s, col], i) => {
      const p = pop(t, ts + 0.5 + i * 0.10, 0.5);
      if (p > 0) {
        ctx.save(); ctx.globalAlpha = clamp(p * 1.5); ctx.translate(0, (1 - p) * 18);
        ctx.fillStyle = col; ctx.fillText(s, x, yC);
        ctx.restore();
      }
      x += ctx.measureText(s).width;
    });
    const pu = ease.out(seg(t, ts + 0.95, ts + 1.4));
    if (pu > 0) {
      const wShow = measure(ctx, 'who show up', bs, F.sans);
      const wWho = measure(ctx, 'who ', bs, F.sans);
      rule(ctx, L.LX(0) + wWho, yC + bs * 0.26, L.LX(0) + wWho + wShow * pu, 's6u' + (Math.floor(t * 12) % 4), { lw: 6, color: C.vote, amp: 1.4 });
    }
  }
}

// ---------------------------------------------------------------- S7: the ask
function s7(ctx, t, L) {
  const hs = fitSize(ctx, 'polling place.', L.box.w * 0.98, L.T.headline * 0.80, F.sans, -0.014);
  const l1 = ['Find your', 'polling place.'];
  enter(ctx, t, S.ask - 0.05, { fn: () => l1.forEach((ln, i) => tightLine(ctx, ln, L.LX(0), L.LY(0.10) + i * hs * 1.04, hs, C.ink, -0.014)) });

  const sub = L.T.sub * 0.86;
  const y2 = L.LY(0.10) + l1.length * hs * 1.04 + sub * 0.95;
  enter(ctx, t, S.ask + 1.0, { fn: () => { setFont(ctx, sub, F.sansR); ctx.fillStyle = C.ink; ctx.fillText('Check your hours and your ID.', L.LX(0), y2); } });
  enter(ctx, t, S.ask + 1.7, { fn: () => { setFont(ctx, sub * 0.9, F.sansR); ctx.fillStyle = C.inkSoft; ctx.fillText('Both depend on your state and county.', L.LX(0), y2 + sub * 1.22); } });

  // the blank field in the corner of the form: the box is empty until the end card fills it
  const bz = L.portrait ? 156 : 124;
  const bxs = L.LX(1) - bz, bys = L.LY(0.055);
  enter(ctx, t, S.ask + 0.6, { fn: () => {
    ctx.save();
    ctx.globalAlpha = 0.42; ctx.strokeStyle = C.inkSoft; ctx.lineWidth = 3;
    rr(ctx, bxs, bys, bz, bz, 4); ctx.stroke();
    ctx.globalAlpha = 0.75; ctx.strokeStyle = C.vote; ctx.lineWidth = 2;
    const k = bz * 0.13, o = 11;
    [[bxs - o, bys - o, 1, 1], [bxs + bz + o, bys - o, -1, 1], [bxs - o, bys + bz + o, 1, -1], [bxs + bz + o, bys + bz + o, -1, -1]].forEach(([x, y, dx, dy]) => {
      ctx.beginPath(); ctx.moveTo(x, y + dy * k); ctx.lineTo(x, y); ctx.lineTo(x + dx * k, y); ctx.stroke();
    });
    ctx.restore();
    tracked(ctx, 'YOUR BALLOT', bxs + bz, bys + bz + L.T.tiny * 2.2, { size: L.T.tiny, face: F.mono, color: C.inkSoft, track: 0.14, align: 'right', alpha: 0.75 });
  } });

  // the boxed URL: the one thing on screen that is persimmon, because it is the action
  const t0 = S.ask + 2.6;
  const p = spring(seg(t, t0, t0 + 0.7));
  if (p > 0) {
    const us = L.T.headline * 0.92;
    setFont(ctx, us, F.mono);
    const tw = ctx.measureText('vote.gov').width;
    const padX = us * 0.46, padY = us * 0.34;
    const bw = tw + padX * 2, bh = us + padY * 2;
    const yb = L.LY(0.56);
    ctx.save();
    ctx.translate(L.LX(0), yb + (1 - p) * 26);
    ctx.scale(0.94 + 0.06 * p, 0.94 + 0.06 * p);
    ctx.globalAlpha = clamp(p * 1.4);
    // a persimmon block with a printed offset shadow, not a rounded web button
    ctx.fillStyle = C.voteInk; ctx.fillRect(12, 12, bw, bh);
    ctx.fillStyle = C.vote; ctx.fillRect(0, 0, bw, bh);
    ctx.fillStyle = C.cream; ctx.textBaseline = 'alphabetic';
    ctx.fillText('vote.gov', padX, bh - padY - us * 0.06);
    ctx.restore();
    enter(ctx, t, t0 + 0.9, { fn: () => {
      setFont(ctx, L.T.micro, F.mono); ctx.fillStyle = C.inkSoft;
      ctx.fillText('MAILED YOUR BALLOT?', L.LX(0), yb + bh + L.T.micro * 2.4);
      setFont(ctx, L.T.body * 0.88, F.sansR); ctx.fillStyle = C.inkSoft;
      ctx.fillText('Don’t mail it now — use a drop box.', L.LX(0), yb + bh + L.T.micro * 2.6 + L.T.body * 1.05);
    } });
  }
}

// ---------------------------------------------------------------- S8: end card
function s8(ctx, t, L) {
  enter(ctx, t, S.end - 0.05, { fn: () => tracked(ctx, 'TUESDAY · NOVEMBER 3, 2026', L.LX(0), L.LY(0.12), { size: L.T.micro, face: F.mono, color: C.inkSoft, track: 0.16 }) });

  // the box, stamped first: the mark is the thing this whole film is about
  const z = L.portrait ? 200 : 156;
  const by = L.LY(0.235);
  const pk = seg(t, S.end + 0.5, S.end + 1.15);
  if (pk > 0) {
    const X = L.LX(0), Y = by;
    ctx.save();
    ctx.globalAlpha = 0.55; ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5;
    rr(ctx, X, Y, z, z, 6); ctx.stroke();
    ctx.globalAlpha = 1; ctx.strokeStyle = C.vote; ctx.lineWidth = z * 0.135; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const a = [X + z * 0.18, Y + z * 0.50], b = [X + z * 0.41, Y + z * 0.77], c = [X + z * 0.84, Y + z * 0.20];
    const k1 = clamp(pk / 0.42), k2 = clamp((pk - 0.38) / 0.62);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]);
    ctx.lineTo(lerp(a[0], b[0], k1), lerp(a[1], b[1], k1));
    if (k2 > 0) ctx.lineTo(lerp(b[0], c[0], k2), lerp(b[1], c[1], k2));
    ctx.stroke(); ctx.restore();
  }

  // VOTE — the biggest word in the film
  const size = fitSize(ctx, 'VOTE', L.box.w * 0.99, L.T.mega * 1.42, F.sans, -0.03);
  const p = rise(t, S.end + 1.05, 0.8, 40);
  const vy = by + z + size * 0.94;
  if (p.p > 0) {
    ctx.save(); ctx.globalAlpha = p.a; ctx.translate(0, p.dy);
    tightLine(ctx, 'VOTE', L.LX(0), vy, size, C.vote, -0.03);
    ctx.restore();
  }

  enter(ctx, t, S.end + 2.0, { fn: () => {
    const us = L.T.headline * 0.86;
    setFont(ctx, us, F.mono); ctx.fillStyle = C.ink;
    ctx.fillText('vote.gov', L.LX(0), vy + us * 1.5);
    const w = measure(ctx, 'vote.gov', us, F.mono);
    rule(ctx, L.LX(0), vy + us * 1.72, L.LX(0) + w, 's8u' + (Math.floor(t * 12) % 4), { lw: 4, color: C.vote, amp: 0.8 });
  } });

  enter(ctx, t, S.end + 2.8, { fn: () => tracked(ctx, 'A NONPARTISAN MESSAGE', L.LX(0), L.LY(0.975), { size: L.T.micro, face: F.mono, color: C.inkSoft, track: 0.12, alpha: 0.62 }) });
  enter(ctx, t, S.end + 3.1, { fn: () => tracked(ctx, 'NOT AUTHORIZED BY ANY CANDIDATE OR CAMPAIGN', L.LX(0), L.LY(0.975) + L.T.micro * 1.5, { size: L.T.tiny, face: F.mono, color: C.inkSoft, track: 0.08, alpha: 0.5 }) });
}

// ---------------------------------------------------------------- the reel
const SCENES = [
  { t0: 0, t1: S.q, draw: s1 },
  { t0: S.q, t1: S.grid, draw: s2 },
  { t0: S.grid, t1: S.down, draw: s3 },
  { t0: S.down, t1: S.turn, draw: s4 },
  { t0: S.turn, t1: S.quiet, draw: s5 },
  { t0: S.quiet, t1: S.ask, draw: s6 },
  { t0: S.ask, t1: S.end, draw: s7 },
  { t0: S.end, t1: S.out, draw: s8 },
];

// hard cuts, but the sheet stays: a 0.12 s ink lift at each seam sells it
function seam(ctx, t, L) {
  let d = Infinity;
  for (const b of [S.q, S.grid, S.down, S.turn, S.quiet, S.ask, S.end]) d = Math.min(d, Math.abs(t - b));
  if (d > 0.12) return;
  ctx.save(); ctx.globalAlpha = (1 - d / 0.12) * 0.09; ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, L.W, L.H); ctx.restore();
}

export function drawScene(ctx, t, L) {
  const sc = SCENES.find((s) => t >= s.t0 && t < s.t1) || SCENES[SCENES.length - 1];
  sc.draw(ctx, t, L);
  seam(ctx, t, L);
  chrome(ctx, t, L);
}
