/* PrimeOMS — Gen Z cut. One score drives picture AND sound:
   the drum pattern, chords, 808s, vocal chops and UI sounds are all declared
   here with ev(beat, type), exported as window.__timeline, rendered to audio
   by beat.py — and the visuals bounce on the very same kicks and snares. */
(() => {
  const BPM = 140;
  const SPB = 60 / BPM;
  const END = 92;
  const DURATION = END * SPB + 1.8;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const pr = (b, b0, d) => cl((b - b0) / d);
  const lerp = (a, b, p) => a + (b - a) * p;
  const E = {
    out: (p) => 1 - Math.pow(1 - p, 3),
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    back: (p) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  };
  const css = (el, o) => { for (const k in o) el.style[k] = o[k]; };
  const fmt = (n) => Math.round(n).toLocaleString('en-US');

  /* ---- The score ------------------------------------------------------- */
  const EV = [];
  const ev = (b, type, o = {}) => EV.push({ b, type, ...o });
  const KICKS = [];
  const SNARES = [];

  const CHORDS = {
    Abmaj9: { ep: [56, 60, 63, 67, 70], bass: 32 },
    Gm7: { ep: [55, 58, 62, 65, 70], bass: 31 },
    Fm9: { ep: [53, 56, 60, 63, 67], bass: 29 },
    Bb13: { ep: [56, 62, 65, 67, 70], bass: 34 },
    Ebmaj9: { ep: [51, 55, 58, 62, 65, 70], bass: 27 },
  };
  const LOOP = ['Abmaj9', 'Gm7', 'Fm9', 'Bb13'];
  const chordOf = (bar) => CHORDS[LOOP[(bar < 2 ? bar : bar - 2) % 4]];

  // Lo-fi intro: filtered keys + vinyl, the typing is the percussion
  ev(0, 'ep', { notes: chordOf(0).ep, dur: 4, vel: 0.5, cut: 650 });
  ev(4, 'ep', { notes: chordOf(1).ep, dur: 4, vel: 0.5, cut: 1100 });
  ev(4, 'riser', { dur: 4 });
  ev(6, 'revcrash', { dur: 2 });

  for (let bar = 2; bar < 22; bar++) {
    const b0 = bar * 4;
    const ch = chordOf(bar);
    // keys: strike + syncopated restrike
    ev(b0, 'ep', { notes: ch.ep, dur: 2.5, vel: 0.56, cut: 2600 });
    if (b0 + 2.5 < 86) ev(b0 + 2.5, 'ep', { notes: ch.ep.slice(1), dur: 1.5, vel: 0.42, cut: 2400 });

    const build = bar === 17;           // beats 68-72: tension before the second drop
    const typing = bar === 8;           // fraud scene: typing replaces hats
    let kicks = bar % 2 ? [0, 0.75, 1.5, 3.25] : [0, 1.5, 2.75];
    if (build) kicks = [0, 1.5];
    kicks.forEach((k, i) => {
      const at = b0 + k;
      if (at >= 86) return;
      KICKS.push(at);
      ev(at, 'kick', { vel: i === 0 ? 1 : 0.85 });
      const next = kicks[i + 1] !== undefined ? kicks[i + 1] : 4;
      ev(at, 'b808', { note: ch.bass + (i === kicks.length - 1 && bar % 4 === 3 ? 12 : 0), dur: Math.max(0.5, next - k - 0.1) });
    });
    if (b0 + 2 < 86) {
      SNARES.push(b0 + 2);
      ev(b0 + 2, 'snare');
      ev(b0 + 2, 'snap', { pan: 0.35 });
    }
    if (bar % 4 === 3 && !build) ev(b0 + 3.75, 'snap', { pan: -0.35, vel: 0.55 });

    // hats: eighths, rolls at phrase ends
    for (let k = 0; k < 8; k++) {
      const at = b0 + k * 0.5;
      if (at >= 86 || (typing && k >= 2) || (build && k >= 4)) continue;
      const rollZone = k >= 6 && (bar % 4 === 3 || bar % 8 === 5);
      if (rollZone) continue;
      ev(at, 'hat', { vel: k % 2 ? 0.45 : 0.7, pan: k % 2 ? 0.25 : -0.2 });
    }
    if (bar % 4 === 3 && !build && b0 + 3 < 86) [0, 0.25, 0.5, 0.75].forEach((o, i) => ev(b0 + 3 + o, 'hat', { vel: 0.4 + i * 0.12, pan: 0.3 }));
    if (bar % 8 === 5) [0, 1, 2, 3, 4, 5].forEach((i) => ev(b0 + 3 + i / 6, 'hat', { vel: 0.35 + i * 0.08, pan: -0.3 + i * 0.1 }));
    if (bar % 2 === 0 && !typing && !build && b0 + 3.5 < 86) ev(b0 + 3.5, 'ohat', { vel: 0.5 });
  }
  ev(8, 'impact');
  ev(8, 'crash');
  for (let i = 0; i < 16; i++) ev(70 + i * 0.125, 'hat', { vel: 0.3 + i * 0.04, pan: (i % 2 ? 0.3 : -0.3) });
  ev(70, 'riser', { dur: 2 });
  ev(72, 'impact');
  ev(72, 'crash');
  ev(40, 'crash', { vel: 0.6 });
  ev(56, 'crash', { vel: 0.6 });
  ev(86, 'tapestop', { dur: 1.2 });
  ev(87.5, 'ep', { notes: CHORDS.Ebmaj9.ep, dur: 6, vel: 0.62, cut: 3200 });
  ev(87.5, 'b808', { note: 27, dur: 4 });
  ev(87.5, 'sparkle', { notes: [75, 79, 82, 86, 89], dur: 1.2 });

  // Vocal-chop hook ("ooh/ah") for the flex moments
  const HOOK = [[0, 75, 0.5, 'ah'], [0.5, 77, 0.25, 'oo'], [0.75, 79, 0.75, 'ah'], [2, 82, 0.5, 'oo'], [2.75, 79, 0.75, 'ah'],
    [4, 77, 0.5, 'ah'], [4.75, 75, 0.5, 'oo'], [5.5, 72, 0.5, 'ah'], [6, 70, 1.5, 'oo']];
  [24, 56].forEach((s) => HOOK.forEach(([o, n, d, v]) => ev(s + o, 'chop', { note: n, dur: d, vowel: v })));

  /* ---- Beat-reactive helpers ------------------------------------------- */
  const pulse = (b, list, decay = 7) => {
    let v = 0;
    for (const k of list) { if (k > b) break; v = Math.max(v, Math.exp(-(b - k) * decay)); }
    return v;
  };

  const units = (el) => {
    const out = [];
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = p;
            frag.appendChild(s);
            out.push(s);
          });
          n.replaceWith(frag);
        } else if (n.classList && (n.classList.contains('hl') || n.classList.contains('hl-blue'))) {
          n.style.display = 'inline-block';
          out.push(n);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return out;
  };
  // Words land one per 8th note (on the hats)
  const capIn = (ws, b, at, step = 0.5) => ws.forEach((w, i) => {
    const p = pr(b, at + i * step, 0.35);
    css(w, { opacity: String(cl(p * 3)), transform: `translateY(${(1 - E.out(p)) * 40}px) scale(${p <= 0 ? 0.6 : 0.6 + E.back(p) * 0.4})` });
  });
  const popIn = (el, b, at, d = 0.5, rise = 40, rot = 0) => {
    const p = pr(b, at, d);
    css(el, { opacity: String(cl(p * 3)), transform: `translateY(${(1 - E.out(p)) * rise}px) scale(${p <= 0 ? 0.001 : E.back(p)}) rotate(${rot}deg)` });
    return p;
  };
  const snareBounce = (el, b) => css(el, { scale: String(1 + 0.035 * pulse(b, SNARES, 9)) });

  function cursor(el, b, keys, clicks = []) {
    let x = keys[0][1];
    let y = keys[0][2];
    for (let i = 1; i < keys.length; i++) {
      const [b1, x1, y1] = keys[i];
      const [b0, x0, y0] = keys[i - 1];
      if (b >= b1) { x = x1; y = y1; continue; }
      if (b > b0) { const p = E.inOut(pr(b, b0, b1 - b0)); x = lerp(x0, x1, p); y = lerp(y0, y1, p); }
      break;
    }
    let press = 1;
    const rip = $('[data-ripple]', el);
    css(rip, { opacity: '0' });
    clicks.forEach((c) => {
      const d = b - c;
      if (d >= 0 && d < 1) {
        css(rip, { opacity: String(0.5 * (1 - d)), transform: `scale(${0.4 + d * 3.5})` });
        if (d < 0.3) press = 0.82 + d * 0.6;
      }
    });
    css(el, { transform: `translate(${x}px, ${y}px) scale(${press})` });
  }

  let avatars = [];
  const lifeAvatars = (b) => avatars.forEach((svg, i) => {
    const period = 5.5 + (i % 5) * 0.8;
    const local = (b + i * 1.7) % period;
    const es = local < 0.3 ? 1 - Math.sin((local / 0.3) * Math.PI) * 0.92 : 1;
    svg.style.setProperty('--es', es.toFixed(3));
    svg.style.setProperty('--lx', `${(Math.sin(b * 0.3 + i) * 0.6).toFixed(3)}px`);
  });

  /* ---- Scenes ---------------------------------------------------------- */
  const SCENES = [];
  const scene = (id, from, to, draw, opts = {}) => SCENES.push({ el: document.getElementById(id), from, to, draw, ...opts });

  // 0 · pov: typed on 32nds — the keystrokes are the hi-hats
  const ghosts = $$('[data-ghost]');
  const typed = $$('[data-type]').map((el, i) => ({ el, text: el.dataset.type, hl: el.dataset.hl || '', at: [0.5, 1.75, 4.25][i], step: [0.25, 0.125, 0.125][i] }));
  typed.forEach((t) => [...t.text].forEach((ch, i) => { if (ch !== ' ') ev(t.at + i * t.step, 'type', { seed: i + t.at * 10 }); }));
  scene('g-intro', 0, 8, (b) => {
    ghosts.forEach((g, i) => {
      const p = pr(b, 0.2 + i * 0.6, 0.6);
      const out = pr(b, 6, 1.5);
      css(g, { opacity: String(cl(p) * 0.85 * (1 - out)), transform: `translateY(${Math.sin(b * 0.8 + i) * 10}px) scale(${1 - out * 0.15})`, filter: `blur(${out * 6}px)` });
    });
    typed.forEach((t, k) => {
      const n = cl(Math.floor((b - t.at) / t.step) + 1, 0, t.text.length);
      const shown = b >= t.at ? t.text.slice(0, n) : '';
      const cut = t.hl ? t.text.length - t.hl.length : t.text.length;
      const lastLine = typed.findLastIndex((x) => b >= x.at);
      const caret = k === lastLine && (Math.floor(b * 2) % 2 === 0 || n < t.text.length) ? '<span class="caret"></span>' : '';
      t.el.innerHTML = (shown.length > cut ? `${shown.slice(0, cut)}<span class="hl">${shown.slice(cut)}</span>` : shown) + caret;
    });
  });

  // 1 · the drop: logo slams on beat 8
  const ltile = $('[data-ltile]');
  const lword = $$('[data-lword] span');
  const l1 = units($('#g-logo [data-c1]'));
  const l2 = $('#g-logo [data-c2]');
  const lst = $('#g-logo [data-st1]');
  lword.forEach((_, i) => ev(8.5 + i * 0.125, 'tick', { note: 82 + (i % 4) * 2, gain: 0.35 }));
  ev(12.5, 'pop', { note: 82, pan: 0.5 });
  scene('g-logo', 8, 16, (b) => {
    const p = pr(b, 8, 0.5);
    const kick = pulse(b, KICKS, 8);
    css(ltile, { opacity: String(cl(p * 3)), transform: `scale(${(p <= 0 ? 2.2 : lerp(2.2, 1, E.out(p))) * (1 + kick * 0.04)}) rotate(${(1 - E.out(p)) * -18}deg)` });
    lword.forEach((el, i) => {
      const q = pr(b, 8.5 + i * 0.125, 0.4);
      css(el, { opacity: String(cl(q * 3)), transform: `translateY(${(1 - E.out(q)) * 80}px)` });
    });
    capIn(l1, b, 10);
    popIn(l2, b, 14, 0.45, 30);
    snareBounce($('#g-logo [data-c1]'), b);
    popIn(lst, b, 12.5, 0.45, 20, 8);
  }, { enter: 'drop' });

  // 2 · the squad: one teammate per kick, each sings a note
  const mates = $$('[data-mate]');
  const MATE_AT = [16, 17.5, 18.75, 20];
  MATE_AT.forEach((at, i) => ev(at, 'chop', { note: [70, 72, 75, 79][i], dur: 0.6, vowel: 'oo' }));
  const s1 = units($('#g-squad [data-c1]'));
  const s2 = units($('#g-squad [data-c2]'));
  scene('g-squad', 16, 24, (b) => {
    capIn(s1, b, 16.25);
    mates.forEach((m, i) => {
      const p = popIn(m, b, MATE_AT[i], 0.5, 80);
      if (p >= 1) css(m, { transform: `translateY(${-pulse(b, KICKS, 6) * 10}px) scale(${1 + pulse(b, SNARES, 8) * 0.02})` });
    });
    capIn(s2, b, 21.5);
  });

  // 3 · orders: cards hop columns on the kicks
  const AV = (who) => `<svg class="avc" viewBox="20 12 80 80"><use href="#av-${who}" width="120" height="120"/></svg>`;
  const boardEl = $('[data-board]');
  const COLW = 225;
  const GAP = (940 - COLW * 4) / 3;
  [['new', '#7a7a7a'], ['confirmed', '#8a5a00'], ['shipped', '#0066cc'], ['delivered', '#1d7a3a']].forEach(([name, color], c) => {
    const col = document.createElement('div');
    col.className = 'bcol';
    col.style.left = `${22 + c * (COLW + GAP)}px`;
    col.innerHTML = `<p><i style="background:${color}"></i>${name}</p>`;
    boardEl.appendChild(col);
  });
  const CARDS = [
    { id: 2054, amt: 890, ch: 'Facebook', who: 'rafi', col: 0, at: -1 },
    { id: 2053, amt: 2150, ch: 'Store', who: 'nabila', col: 0, at: -2 },
    { id: 2052, amt: 1450, ch: 'Facebook', who: 'ayesha', col: 1, at: -1 },
    { id: 2051, amt: 3200, ch: 'Facebook', who: 'nabila', col: 1, at: -2 },
    { id: 2050, amt: 1100, ch: 'Store', who: 'tanvir', col: 2, at: -1 },
    { id: 2049, amt: 2750, ch: 'Facebook', who: 'nabila', col: 3, at: -1 },
    { id: 2055, amt: 1250, ch: 'Facebook', who: 'ayesha', col: 0, at: 28, born: 28 },
  ];
  const MOVES = [[25.5, 2053, 1], [26.75, 2051, 2], [28.75, 2050, 3], [29.5, 2052, 2], [30.75, 2054, 1], [31.25, 2053, 2]];
  CARDS.forEach((c) => {
    c.el = document.createElement('div');
    c.el.className = 'bcard';
    c.el.innerHTML = `<b>#${c.id}</b><span class="amt">BDT ${fmt(c.amt)}</span><div class="meta"><span class="chip chip--gray" data-chip>${c.ch}</span>${AV(c.who)}</div>`;
    boardEl.appendChild(c.el);
  });
  MOVES.forEach(([m, , to]) => ev(m, 'swish', { dur: 0.6, pan: -0.6 + to * 0.4, gain: 0.5 }));
  ev(28, 'pop', { note: 75, pan: -0.6 });
  const o1 = units($('#g-orders [data-c1]'));
  const o2 = $('#g-orders [data-c2]');
  const ost = $('#g-orders [data-st1]');
  const layoutAt = (b) => {
    const st = CARDS.filter((c) => (c.born ?? -99) <= b).map((c) => {
      let col = c.col;
      let at = c.at;
      MOVES.forEach(([m, id, to]) => { if (id === c.id && m <= b) { col = to; at = m; } });
      return { c, col, at };
    });
    const pos = new Map();
    for (let k = 0; k < 4; k++) st.filter((s) => s.col === k).sort((a, z) => z.at - a.at).forEach((s, idx) => pos.set(s.c, { col: k, idx }));
    return pos;
  };
  const xy = ({ col, idx }) => [22 + col * (COLW + GAP) + 10, 92 + idx * 196];
  scene('g-orders', 24, 32, (b) => {
    capIn(o1, b, 24.25);
    popIn(o2, b, 26, 0.45, 30);
    popIn(ost, b, 30, 0.45, 20, -7);
    const marks = MOVES.map((m) => m[0]).concat([28]).filter((m) => m <= b);
    const last = marks.length ? Math.max(...marks) : -99;
    const now = layoutAt(b);
    const moving = b - last < 0.6;
    const before = moving ? layoutAt(last - 0.001) : now;
    const p = moving ? E.inOut((b - last) / 0.6) : 1;
    CARDS.forEach((c) => {
      const n = now.get(c);
      if (!n) { css(c.el, { opacity: '0' }); return; }
      const o = before.get(c) || n;
      const [x0, y0] = xy(o);
      const [x1, y1] = xy(n);
      const mover = moving && MOVES.some(([m, id]) => m === last && id === c.id);
      const born = c.born !== undefined ? pr(b, c.born, 0.45) : 1;
      const lift = mover ? Math.sin(p * Math.PI) : 0;
      css(c.el, {
        opacity: String(cl(born * 3)),
        transform: `translate(${lerp(x0, x1, p)}px, ${lerp(y0, y1, p) - lift * 60}px) scale(${(born <= 0 ? 0.001 : E.back(born)) * (1 + lift * 0.08)}) rotate(${lift * -4}deg)`,
        boxShadow: mover ? `0 ${lift * 40}px 60px -20px rgba(0,102,204,${lift * 0.6})` : 'none',
        zIndex: mover ? '5' : '1',
      });
      const chip = $('[data-chip]', c.el);
      const col = mover && p < 0.5 ? o.col : n.col;
      if (col >= 3) { chip.className = 'chip chip--green'; chip.textContent = 'paid'; }
      else if (col >= 2) { chip.className = 'chip chip--blue'; chip.textContent = 'Pathao'; }
      else { chip.className = 'chip chip--gray'; chip.textContent = c.ch; }
    });
  });

  // 4 · fraud check: the phone number is typed as a 16th-note hat roll
  const f1 = units($('#g-fraud [data-c1]'));
  const f2 = $('#g-fraud [data-c2]');
  const fst = $('#g-fraud [data-st1]');
  const ftext = $('[data-ftext]');
  const fcaret = $('#g-fraud [data-caret]');
  const fbtn = $('[data-fbtn]');
  const fbeam = $('[data-fbeam]');
  const fring = $('[data-fring]');
  const fpct = $('[data-fpct]');
  const ftot = $('[data-ftot]');
  const fdel = $('[data-fdel]');
  const fret = $('[data-fret]');
  const fverdict = $('[data-fverdict]');
  const fcursor = $('[data-fcursor]');
  const PHONE = '01712-XXX421';
  const T0 = 33;
  ev(32.9, 'click');
  [...PHONE].forEach((_, i) => ev(T0 + i * 0.25, 'type', { seed: 50 + i, gain: 1.15 }));
  ev(36, 'click', { gain: 1.1 });
  ev(36.1, 'scan', { dur: 0.9 });
  ev(37, 'sparkle', { notes: [70, 75, 79, 82, 87], dur: 1 });
  ev(38, 'chime', { note: 82 });
  ev(38, 'chop', { note: 82, dur: 0.75, vowel: 'ah' });
  ev(39, 'pop', { note: 87, pan: -0.3 });
  scene('g-fraud', 32, 40, (b) => {
    capIn(f1, b, 32.25);
    popIn(f2, b, 34, 0.45, 30);
    snareBounce($('#g-fraud [data-c1]'), b);
    const n = cl(Math.floor((b - T0) / 0.25) + 1, 0, PHONE.length);
    ftext.textContent = b >= T0 ? PHONE.slice(0, n) : '';
    css(fcaret, { opacity: b < 32.9 || (b > 36 && Math.floor(b * 2) % 2) ? '0' : '1' });
    css(fbtn, { transform: `scale(${b >= 36 && b < 36.3 ? 0.95 : 1})` });
    const sc = pr(b, 36.1, 0.9);
    css(fbeam, { opacity: sc > 0 && sc < 1 ? '1' : '0', transform: `translateX(${-100 + ((sc * 2) % 1) * 350}%)` });
    const rp = E.out(pr(b, 37, 1));
    fring.setAttribute('stroke-dasharray', `${(94 * rp).toFixed(2)} 100`);
    fring.style.opacity = rp > 0.005 ? '1' : '0';
    fpct.textContent = `${Math.round(94 * rp)}%`;
    ftot.textContent = String(Math.round(32 * rp));
    fdel.textContent = String(Math.round(30 * rp));
    fret.textContent = String(Math.round(2 * rp));
    popIn(fverdict, b, 38, 0.45, 20);
    popIn(fst, b, 39, 0.45, 20, -5);
    cursor(fcursor, b, [[32, 980, 1900], [32.75, 520, 800], [35.6, 520, 800], [35.95, 560, 950], [37.2, 560, 950], [39.5, 960, 1500]], [32.9, 36]);
  });

  // 5 · couriers: the 808 slides up as the truck drives
  const r1 = units($('#g-route [data-c1]'));
  const r2 = $('#g-route [data-c2]');
  const rst = $('#g-route [data-st1]');
  const cchips = $$('[data-cchip]');
  const rbase = $('[data-rbase]');
  const rprog = $('[data-rprog]');
  const rstops = $$('[data-rstop]').map((el) => ({ el, at: Number(el.dataset.at) }));
  const rpins = $$('[data-rpin]');
  const truck = $('[data-truck]');
  const sadia = $('[data-sadia]');
  const RLEN = rbase.getTotalLength();
  const rpt = (t) => { const p = rbase.getPointAtLength(RLEN * t); return [p.x / 10, p.y / 9]; };
  const place = (el, t) => { const [x, y] = rpt(t); css(el, { left: `${x}%`, top: `${y}%` }); };
  rstops.forEach((s) => place(s.el, s.at));
  const D0 = 42.5;
  const DL = 4;
  const inv = (y) => { let lo = 0, hi = 1; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (E.inOut(m) < y) lo = m; else hi = m; } return (lo + hi) / 2; };
  const STOP_B = rstops.slice(1, 4).map((s) => D0 + inv(s.at) * DL);
  cchips.forEach((_, i) => ev(40.5 + i * 0.5, 'pop', { note: [75, 77, 79, 82][i], pan: -0.6 + i * 0.4, gain: 0.8 }));
  // replace the 808 under the drive with a climbing slide line
  for (let i = EV.length - 1; i >= 0; i--) if (EV[i].type === 'b808' && EV[i].b >= D0 && EV[i].b < D0 + DL + 0.5) EV.splice(i, 1);
  const LINE = [32, 36, 39, 41, 44];
  const BEATS = [D0, ...STOP_B, D0 + DL];
  BEATS.forEach((at, i) => ev(at, 'b808', { note: LINE[i], from: i ? LINE[i - 1] : undefined, dur: (BEATS[i + 1] ?? at + 1) - at - 0.05 }));
  STOP_B.forEach((at, i) => ev(at, 'plink', { note: [79, 82, 86][i], pan: 0.3 }));
  ev(D0 + DL, 'chime', { note: 87 });
  ev(47, 'pop', { note: 82, pan: 0.5 });
  scene('g-route', 40, 48, (b) => {
    capIn(r1, b, 40.25);
    popIn(r2, b, 42, 0.45, 30);
    snareBounce($('#g-route [data-c1]'), b);
    cchips.forEach((el, i) => popIn(el, b, 40.5 + i * 0.5, 0.4, 20));
    const [sx, sy] = rpt(0);
    const [ex, ey] = rpt(1);
    css(rpins[0], { left: `${sx}%`, top: `${sy}%`, translate: '-40px 60%' });
    css(rpins[1], { left: `${ex}%`, top: `${ey}%`, translate: 'calc(-100% + 40px) -170%' });
    popIn(rpins[0], b, 41.5, 0.4, 16);
    popIn(rpins[1], b, 42, 0.4, 16);
    const p = E.inOut(pr(b, D0, DL));
    rprog.setAttribute('stroke-dashoffset', String(1 - p));
    place(truck, p);
    css(truck, { opacity: String(cl(pr(b, 41.75, 0.4) * 2)), scale: String(1 + pulse(b, KICKS, 8) * 0.08) });
    rstops.forEach((s) => s.el.classList.toggle('done', s.at === 0 || (b >= D0 && p >= s.at - 0.002)));
    sadia.innerHTML = p >= 1 ? '<b>sadia</b> · received ✓' : '<b>sadia</b> · waiting';
    popIn(rst, b, 47, 0.45, 20, 6);
  });

  // 6 · inventory: sizes fill on the kicks, restock runs up an arpeggio
  const i1 = units($('#g-inv [data-c1]'));
  const i2 = $('#g-inv [data-c2]');
  const pcard = $('[data-pcard]');
  const sizes = $$('[data-size]').map((el) => ({ el, q: $('[data-q]', el), bar: $('[data-bar]', el) }));
  const FILL_AT = [48, 49.5, 50.75, 52];
  const SIZE_TO = [[18, 24], [3, 24], [14, 24], [11, 12]];
  const it = (k) => $(`#g-inv [data-it="${k}"]`);
  const itText = $('#g-inv [data-ittext]');
  ev(48.4, 'swish', { dur: 0.5, pan: 0.2, gain: 0.5 });
  ev(51, 'warble');
  ev(52.75, 'pop', { note: 79, pan: 0.3 });
  [63, 67, 70, 75, 79].forEach((n, k) => ev(52.9 + k * 0.125, 'pluck', { note: n, pan: -0.4 + k * 0.2 }));
  ev(53.5, 'chime', { note: 82, gain: 0.7 });
  ev(55.25, 'pop', { note: 75, pan: 0.3 });
  scene('g-inv', 48, 56, (b) => {
    capIn(i1, b, 48.25);
    popIn(i2, b, 50, 0.45, 30);
    snareBounce($('#g-inv [data-c1]'), b);
    const pc = E.out(pr(b, 48.5, 0.6));
    css(pcard, { opacity: String(pc), transform: `translateY(${(1 - pc) * 80}px)` });
    sizes.forEach((s, i) => {
      const [to, cap] = SIZE_TO[i];
      let q = to * E.out(pr(b, FILL_AT[i], 0.6));
      if (i === 1) q = lerp(q, 23, E.inOut(pr(b, 52.9, 0.6)));
      if (i === 0 && b >= 55.4) q = 17;
      s.q.textContent = String(Math.round(q));
      css(s.bar, { width: `${(q / cap) * 100}%` });
    });
    sizes[1].el.classList.toggle('low', b >= 49.6 && b < 53);
    sizes[1].el.classList.toggle('up', b >= 53);
    popIn(it('low'), b, 51, 0.4, 20);
    const ok = b >= 53.5;
    css(it('low'), { background: ok ? '#e3f5e8' : '#fff4d6', color: ok ? '#1d7a3a' : '#8a5a00' });
    itText.innerHTML = ok ? '<b style="color:#1d7a3a">back in stock</b> · OXF-12-L · 23 left' : '<b style="color:#8a5a00">low stock</b> · OXF-12-L · 3 left';
    popIn(it('restock'), b, 52.75, 0.4, 20);
    popIn(it('order'), b, 55.25, 0.4, 20);
  });

  // 7 · dashboard: count-up, heat cells pop with a 32nd-note hat roll
  const d1 = units($('#g-dash [data-c1]'));
  const d2 = $('#g-dash [data-c2]');
  const bcs = $$('#g-dash [data-bc]');
  const rev = $('[data-rev]');
  const spark = $('[data-spark]');
  const heat = $('[data-heat]');
  const SEQ = ['#eef0f3', '#cfe0f5', '#93bce9', '#4f93da', '#0066cc'];
  let seed = 11;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const cells = [];
  for (let w = 0; w < 13; w++) for (let d = 0; d < 7; d++) {
    const c = document.createElement('i');
    c.style.background = SEQ[Math.max(0, Math.min(4, Math.floor(rnd() * 2.6 + (w / 12) * 2.2)))];
    heat.appendChild(c);
    cells.push({ c, g: w });
  }
  for (let g = 0; g < 13; g++) ev(60 + g * 0.125, 'hat', { vel: 0.3 + g * 0.03, pan: -0.5 + g * 0.08 });
  const LEAD = [['nabila', 'nabila', 142], ['ayesha', 'ayesha', 118], ['tanvir', 'tanvir', 96], ['rafi', 'rafi', 31]];
  const LEAD_AT = [60.75, 61.5, 62, 63.25];
  const leadersEl = $('[data-leaders]');
  const rows = LEAD.map(([who, name, n]) => {
    const r = document.createElement('div');
    r.className = 'lead-row';
    r.innerHTML = `${AV(who)}<span>${name}</span><span class="barx"><i></i></span><b>0</b>`;
    leadersEl.appendChild(r);
    return { bar: $('i', r), num: $('b', r), n };
  });
  ev(56.4, 'swish', { dur: 0.5, pan: -0.2, gain: 0.5 });
  ev(56.75, 'count', { dur: 3.2, gain: 0.55 });
  ev(58, 'sparkle', { notes: [82, 86, 89, 94], dur: 0.8, gain: 0.8 });
  scene('g-dash', 56, 64, (b) => {
    capIn(d1, b, 56.25);
    popIn(d2, b, 58, 0.45, 30);
    snareBounce($('#g-dash [data-c1]'), b);
    bcs.forEach((el, i) => { const p = E.out(pr(b, 56.5 + i * 0.5, 0.6)); css(el, { opacity: String(p), transform: `translateY(${(1 - p) * 70}px)` }); });
    const rp = E.out(pr(b, 56.75, 3.25));
    rev.textContent = fmt(412800 * rp);
    spark.setAttribute('stroke-dashoffset', String(1 - E.inOut(pr(b, 56.75, 3.25))));
    cells.forEach(({ c, g }) => { const p = pr(b, 60 + g * 0.125, 0.3); css(c, { transform: `scale(${p <= 0 ? 0 : E.back(p)})` }); });
    rows.forEach((r, i) => {
      const p = E.out(pr(b, LEAD_AT[i], 0.7));
      css(r.bar, { width: `${(r.n / 142) * 100 * p}%` });
      r.num.textContent = String(Math.round(r.n * p));
    });
  });

  // 8 · the flex list: one feature stamped per 8th note
  const x1 = units($('#g-flex [data-c1]'));
  const x2 = $('#g-flex [data-c2]');
  const flexEl = $('[data-flex]');
  const FLEX = [['promotions', 'i-percent'], ['exchanges', 'i-exchange'], ['invoices', 'i-doc'], ['reviews', 'i-star'],
    ['analytics', 'i-trend'], ['meta pixel', 'i-target'], ['bKash', 'i-wallet'], ['your storefront', 'i-store']];
  const flexRows = FLEX.map(([word, icon], k) => {
    const r = document.createElement('div');
    r.className = 'flex-row';
    r.innerHTML = `<span class="tile"><svg class="icon"><use href="#${icon}"/></svg></span><span>${word}</span><span class="tick" data-tick><svg class="icon"><use href="#i-check"/></svg></span>`;
    flexEl.appendChild(r);
    ev(65.5 + k * 0.5, 'stamp', { note: [75, 77, 79, 82, 84, 86, 87, 89][k], pan: k % 2 ? 0.4 : -0.4 });
    return r;
  });
  ev(70, 'chop', { note: 87, dur: 1, vowel: 'ah' });
  scene('g-flex', 64, 72, (b) => {
    capIn(x1, b, 64.25, 0.25);
    flexRows.forEach((r, k) => {
      const at = 65.5 + k * 0.5;
      const p = pr(b, at, 0.35);
      css(r, { opacity: String(cl(p * 3)), transform: `translateX(${(1 - E.out(p)) * 360}px) rotate(${(1 - E.out(p)) * 4}deg)` });
      const t = pr(b, at + 0.15, 0.35);
      css($('[data-tick]', r), { transform: `scale(${t <= 0 ? 0 : E.back(t)})` });
    });
    popIn(x2, b, 70, 0.45, 30);
    css(flexEl, { transform: `scale(${1 - pr(b, 70, 2) * 0.04})` });
  });

  // 9 · second drop: the crew is chilling
  const c1 = units($('#g-cast [data-c1]'));
  const c2 = $('#g-cast [data-c2]');
  const vibes = $$('[data-vibe]');
  const castP = $$('[data-cp]');
  const hand = $('[data-hand]');
  const speech = $('[data-speech]');
  const CAST_AT = [72.75, 73.25, 73.5, 74.75, 74];
  CAST_AT.forEach((at, i) => ev(at, 'chop', { note: [70, 72, 75, 79, 82][i], dur: 0.5, vowel: i % 2 ? 'ah' : 'oo' }));
  const VIBE_AT = [76.75, 77.5, 78, 79.25];
  VIBE_AT.forEach((at, i) => ev(at, 'pop', { note: [79, 82, 84, 87][i], pan: i % 2 ? 0.5 : -0.5 }));
  ev(76, 'pop', { note: 89, pan: 0.1 });
  scene('g-cast', 72, 80, (b) => {
    capIn(c1, b, 72.25, 0.25);
    popIn(c2, b, 74, 0.45, 30);
    snareBounce($('#g-cast [data-c1]'), b);
    castP.forEach((el, i) => {
      const p = pr(b, CAST_AT[i], 0.6);
      const y = p <= 0 ? 110 : (1 - E.back(p)) * 110;
      const bob = p >= 1 ? -pulse(b, KICKS, 5) * 2.5 : 0;
      css(el, { transform: `translateY(${y + bob}%)` });
    });
    const w = b > 75 ? Math.sin((b - 75) * Math.PI * 1.3) * 18 * Math.min(1, (b - 75) * 2) : 0;
    css(hand, { transform: `rotate(${w}deg)`, opacity: String(cl(pr(b, 74.4, 0.4) * 2)) });
    popIn(speech, b, 76, 0.45, 14);
    vibes.forEach((v, i) => popIn(v, b, VIBE_AT[i], 0.45, 30));
  }, { enter: 'drop' });

  // 10 · end card: click → tape stop → final chord
  const etile = $('[data-etile]');
  const eword = $('[data-eword]');
  const etag = units($('[data-etag]'));
  const ecta = $('[data-ecta]');
  const enote = $('[data-enote]');
  const ecursor = $('[data-ecursor]');
  const fadeEl = $('[data-fade]');
  ev(82, 'pop', { note: 82 });
  ev(86, 'click', { gain: 1.2 });
  scene('g-end', 80, END + 4, (b) => {
    popIn(etile, b, 80, 0.5, 40);
    const wp = E.out(pr(b, 80.5, 0.5));
    css(eword, { opacity: String(wp), transform: `translateY(${(1 - wp) * 60}px) scale(${1 + pulse(b, KICKS, 8) * 0.025})` });
    capIn(etag, b, 81, 0.25);
    popIn(ecta, b, 82, 0.45, 30);
    if (b >= 82.5) css(ecta, { transform: `scale(${b >= 86 && b < 86.4 ? 0.94 : 1 + pulse(b, SNARES, 8) * 0.03})`, background: b >= 86 && b < 86.6 ? '#e8f1fc' : '#ffffff' });
    popIn(enote, b, 87.5, 0.6, 24);
    cursor(ecursor, b, [[82.5, 900, 1960], [85.6, 545, 1290], [92, 545, 1290]], [86]);
    css(fadeEl, { opacity: String(E.inOut(pr(b, 90.5, 2.5))) });
  });

  /* Quick zoom-cut transitions with a swish (the drops get an impact instead) */
  SCENES.forEach((s, i) => { if (i && s.enter !== 'drop') ev(s.from - 0.35, 'swish', { dur: 0.7, pan: 0.6, gain: 0.75 }); });

  const flash = document.createElement('div');
  css(flash, { position: 'absolute', inset: '0', background: '#ffffff', zIndex: '40', opacity: '0', pointerEvents: 'none' });
  $('#stage').appendChild(flash);

  function render(t) {
    const b = t / SPB;
    const kick = pulse(b, KICKS, 6);
    SCENES.forEach((s, i) => {
      const next = SCENES[i + 1];
      const start = i === 0 ? -99 : s.from - 0.05;
      const stop = next ? next.from - 0.05 : 999;
      if (b < start || b >= stop) { css(s.el, { visibility: 'hidden', opacity: '0' }); return; }
      const p = i === 0 ? 1 : E.out(pr(b, start, 0.3));
      const sc = s.enter === 'drop' ? lerp(1.2, 1, p) : lerp(1.06, 1, p);
      css(s.el, { visibility: 'visible', opacity: String(cl(p * 1.6)), transform: `scale(${sc})`, zIndex: String(i) });
      const glow = $('.glow', s.el);
      if (glow) css(glow, { transform: `scale(${1 + 0.08 * kick})`, opacity: String(0.35 + 0.35 * kick) });
      s.draw(b);
    });
    let f = 0;
    [8, 72].forEach((d) => { if (b >= d) f = Math.max(f, Math.exp(-(b - d) * 9) * 0.8); });
    css(flash, { opacity: String(f) });
    lifeAvatars(b);
  }

  EV.sort((a, z) => a.b - z.b);
  window.__timeline = {
    bpm: BPM, spb: SPB, endBeat: END, duration: DURATION, kicks: KICKS, snares: SNARES,
    events: EV.map((e) => ({ ...e, t: Number((e.b * SPB).toFixed(4)) })),
  };
  window.__render = (t) => new Promise((resolve) => {
    render(t);
    let done = false;
    const fin = () => { if (!done) { done = true; resolve(true); } };
    requestAnimationFrame(() => requestAnimationFrame(fin));
    setTimeout(fin, 60);
  });

  async function init() {
    const html = await (await fetch('../../index.html')).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    $('#sprite').innerHTML = doc.querySelector('body > svg').outerHTML;
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    avatars = $$('svg').filter((s) => s.querySelector(':scope > use[href^="#av-"]'));
    const q = new URLSearchParams(location.search);
    if (q.has('t')) render(Number(q.get('t')));
    else if (q.has('play')) {
      const t0 = performance.now() - Number(q.get('play') || 0) * 1000;
      const loop = (now) => { render(((now - t0) / 1000) % DURATION); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    } else render(0);
    window.__ready = true;
  }
  init();
})();
