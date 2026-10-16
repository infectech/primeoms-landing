/* PrimeOMS promo — deterministic, time-driven composition.
   render(t) draws the frame for time t (seconds). Every sound effect is
   declared here with ev(beat, type) next to the motion it belongs to, and
   exported as window.__timeline, so the soundtrack lands on the exact frame. */
(() => {
  const BPM = 90;
  const SPB = 60 / BPM;
  const END_BEAT = 84;
  const DURATION = END_BEAT * SPB + 1.6;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const pr = (b, b0, d) => cl((b - b0) / d);
  const lerp = (a, b, p) => a + (b - a) * p;
  const E = {
    out: (p) => 1 - Math.pow(1 - p, 3),
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    back: (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  };
  const css = (el, o) => { for (const k in o) el.style[k] = o[k]; };
  const fmt = (n) => Math.round(n).toLocaleString('en-US');

  /* ---- Sound events (single source of truth for sync) ------------------ */
  const EV = [];
  const ev = (b, type, o = {}) => EV.push({ b, type, ...o });

  /* Pop in: scale with a little overshoot */
  const popIn = (el, b, at, d = 0.55, rise = 40) => {
    const p = pr(b, at, d);
    const s = p <= 0 ? 0.001 : E.back(p);
    css(el, { opacity: String(cl(p * 3)), transform: `translateY(${(1 - E.out(p)) * rise}px) scale(${s})` });
    return p;
  };
  const fadeUp = (el, b, at, d = 0.7, rise = 36) => {
    const p = E.out(pr(b, at, d));
    css(el, { opacity: String(p), transform: `translateY(${(1 - p) * rise}px)` });
    return p;
  };

  /* Cursor: moves between keyframes [beat, x, y], clicks at given beats */
  function cursor(el, b, keys, clicks = []) {
    let x = keys[0][1];
    let y = keys[0][2];
    for (let i = 1; i < keys.length; i++) {
      const [b1, x1, y1] = keys[i];
      const [b0, x0, y0] = keys[i - 1];
      if (b >= b1) { x = x1; y = y1; continue; }
      if (b > b0) {
        const p = E.inOut(pr(b, b0, b1 - b0));
        x = lerp(x0, x1, p);
        y = lerp(y0, y1, p);
      }
      break;
    }
    let press = 1;
    const rip = $('[data-ripple]', el);
    css(rip, { opacity: '0' });
    clicks.forEach((c) => {
      const d = b - c;
      if (d >= 0 && d < 0.6) {
        css(rip, { opacity: String(0.5 * (1 - d / 0.6)), transform: `scale(${0.4 + d * 4})` });
        if (d < 0.2) press = 0.82 + d * 0.9;
      }
    });
    css(el, { transform: `translate(${x}px, ${y}px) scale(${press})` });
  }

  /* ---- Avatars: deterministic blink + glance per instance --------------- */
  let avatars = [];
  function lifeAvatars(b) {
    avatars.forEach((svg, i) => {
      const period = 4.4 + (i % 5) * 0.65;
      const local = (b + i * 1.37) % period;
      const es = local < 0.24 ? 1 - Math.sin((local / 0.24) * Math.PI) * 0.92 : 1;
      svg.style.setProperty('--es', es.toFixed(3));
      svg.style.setProperty('--lx', `${(Math.sin(b * 0.42 + i) * 0.6).toFixed(3)}px`);
    });
  }

  /* ---- Scenes ------------------------------------------------------------ */
  const SCENES = [];
  const scene = (id, from, to, draw, opts = {}) => SCENES.push({ el: document.getElementById(id), from, to, draw, ...opts });

  // 1 · Intro: the noise of running a store, then the question
  const noise = $$('[data-noise]');
  const introQ = $('[data-introq]');
  const NOISE_AT = [0.5, 1.25, 2.0, 2.75, 3.5];
  const NOISE_NOTE = [74, 76, 78, 81, 83];
  NOISE_AT.forEach((at, i) => ev(at, 'pop', { note: NOISE_NOTE[i], pan: [-0.6, 0.6, 0, -0.5, 0.5][i] }));
  ev(4.4, 'swish', { dur: 0.75, pan: 0 });
  ev(5.35, 'bell', { note: 81 });
  scene('s-intro', 0, 8, (b) => {
    noise.forEach((el, i) => {
      const p = cl(pr(b, NOISE_AT[i], 0.5));
      const s = p <= 0 ? 0.001 : E.back(p);
      const fy = Math.sin(b * 0.9 + i * 1.7) * 9;
      const c = E.inOut(pr(b, 4.4, 0.9));
      const dx = (960 - (parseFloat(el.style.left) + 260)) * c;
      const dy = (540 - (parseFloat(el.style.top) + 50)) * c;
      css(el, {
        opacity: String(cl(p * 3) * (1 - c)),
        transform: `translate(${dx}px, ${dy + fy}px) scale(${s * (1 - c * 0.8)}) rotate(${(i % 2 ? 1 : -1) * 1.5 * (1 - p)}deg)`,
      });
    });
    const q = E.out(pr(b, 5.3, 0.9));
    css(introQ, { opacity: String(q), transform: `translateY(${(1 - q) * 40}px) scale(${0.96 + q * 0.04})` });
  });

  // 2 · Logo bloom + tagline
  const logoMark = $('[data-logomark]');
  const letters = $$('[data-wordmark] span');
  const tag1 = $('[data-tag1]');
  const tag2 = $('[data-tag2]');
  const underline = $('[data-underline]');
  const floats = $$('[data-float]', $('#s-logo'));
  ev(7.55, 'whoosh', { dur: 0.9 });
  ev(8.0, 'bloom', { note: 74 });
  letters.forEach((_, i) => ev(8.5 + i * 0.09, 'tick', { note: 86 + (i % 3) * 2, gain: 0.45 }));
  ev(10.0, 'click', { gain: 0.6 });
  ev(11.25, 'swish', { dur: 0.55, pan: 0.3, gain: 0.7 });
  scene('s-logo', 8, 16, (b) => {
    const p = pr(b, 8, 0.9);
    css(logoMark, { opacity: String(cl(p * 2.5)), transform: `scale(${p <= 0 ? 0.4 : 0.4 + E.back(p) * 0.6}) rotate(${(1 - E.out(p)) * -14}deg)` });
    letters.forEach((el, i) => {
      const q = E.out(pr(b, 8.5 + i * 0.09, 0.5));
      css(el, { display: 'inline-block', opacity: String(q), transform: `translateY(${(1 - q) * 46}px)` });
    });
    fadeUp(tag1, b, 10.0, 0.7);
    fadeUp(tag2, b, 11.0, 0.7);
    underline.setAttribute('stroke-dashoffset', String(1 - E.inOut(pr(b, 11.3, 0.9))));
    floats.forEach((el, i) => css(el, { transform: `translate(${Math.sin(b * 0.35 + i) * 18}px, ${Math.cos(b * 0.3 + i * 2) * 14}px)` }));
  }, { enter: 'bloom' });

  // 3 · The crew pops in, one per beat
  const members = $$('[data-member]');
  const crewT1 = $('[data-crewt1]');
  const crewT2 = $('[data-crewt2]');
  const CREW_NOTES = [74, 78, 81, 86];
  members.forEach((_, i) => ev(16 + i, 'pop', { note: CREW_NOTES[i], pan: -0.45 + i * 0.3 }));
  ev(19.75, 'swish', { dur: 0.5, pan: -0.2 });
  ev(21.0, 'click', { gain: 0.55 });
  scene('s-crew', 16, 24, (b) => {
    members.forEach((el, i) => {
      const p = popIn(el, b, 16 + i, 0.6, 70);
      const bob = p >= 1 ? Math.sin(b * 1.4 + i) * 5 : 0;
      if (p >= 1) css(el, { transform: `translateY(${bob}px)` });
      const dot = $('.dot', el);
      const dp = pr(b, 16.35 + i, 0.4);
      css(dot, { transform: `scale(${dp <= 0 ? 0 : E.back(dp)})` });
    });
    fadeUp(crewT1, b, 19.9, 0.6);
    fadeUp(crewT2, b, 21.0, 0.6);
  });

  // 4 · Orders board: cards hop columns
  const AV = (who, cls = '') => `<svg class="${cls}" viewBox="20 12 80 80"><use href="#av-${who}" width="120" height="120"/></svg>`;
  const colsEl = $('[data-cols]');
  const COLS = [['New', '#7a7a7a'], ['Confirmed', '#8a5a00'], ['Shipped', '#0066cc'], ['Delivered', '#1d7a3a']];
  const COL_W = 236;
  const COL_GAP = (988 - COL_W * 4) / 3;
  const CARD_H = 122;
  const colHeads = COLS.map(([name, color], c) => {
    const col = document.createElement('div');
    col.className = 'bcol';
    col.style.left = `${c * (COL_W + COL_GAP)}px`;
    col.innerHTML = `<p><i style="background:${color}"></i>${name}<span style="margin-left:auto;color:#7a7a7a" data-n>0</span></p>`;
    colsEl.appendChild(col);
    return $('[data-n]', col);
  });
  const CARDS = [
    { id: 2054, amt: 890, ch: 'Facebook', who: 'rafi', col: 0, at: -1 },
    { id: 2053, amt: 2150, ch: 'Store', who: 'nabila', col: 0, at: -2 },
    { id: 2052, amt: 1450, ch: 'Facebook', who: 'ayesha', col: 1, at: -1 },
    { id: 2051, amt: 3200, ch: 'Facebook', who: 'nabila', col: 1, at: -2 },
    { id: 2050, amt: 1100, ch: 'Store', who: 'tanvir', col: 2, at: -1 },
    { id: 2049, amt: 2750, ch: 'Facebook', who: 'nabila', col: 3, at: -1 },
    { id: 2055, amt: 1250, ch: 'Facebook', who: 'ayesha', col: 0, at: 29.5, born: 29.5 },
  ];
  const MOVES = [[25.5, 2053, 1], [26.5, 2051, 2], [27.5, 2050, 3], [28.5, 2052, 2], [30.5, 2054, 1], [31.2, 2053, 2]];
  CARDS.forEach((c) => {
    c.el = document.createElement('div');
    c.el.className = 'bcard';
    c.el.innerHTML = `<div class="top"><b>#${c.id}</b><span class="amt">BDT ${fmt(c.amt)}</span></div><div class="meta"><span class="chip chip--gray" data-chip>${c.ch}</span>${AV(c.who, 'avc')}</div>`;
    colsEl.appendChild(c.el);
  });
  MOVES.forEach(([m, , to], i) => {
    ev(m, 'swish', { dur: 0.45, pan: -0.6 + to * 0.4, gain: 0.55 });
    ev(m + 0.55, 'tick', { note: 79 + (i % 3) * 2, gain: 0.5 });
  });
  ev(29.5, 'pop', { note: 81, pan: -0.6 });
  const layoutAt = (b) => {
    const state = CARDS.filter((c) => (c.born ?? -99) <= b).map((c) => {
      let col = c.col;
      let at = c.at;
      MOVES.forEach(([m, id, to]) => { if (id === c.id && m <= b) { col = to; at = m; } });
      return { c, col, at };
    });
    const pos = new Map();
    for (let k = 0; k < 4; k++) {
      state.filter((s) => s.col === k).sort((a, z) => z.at - a.at).forEach((s, idx) => pos.set(s.c, { col: k, idx }));
    }
    return pos;
  };
  const xy = ({ col, idx }) => [col * (COL_W + COL_GAP) + 12, 72 + idx * (CARD_H + 12)];
  const otitle = $('[data-otitle]');
  scene('s-orders', 24, 32, (b) => {
    fadeUp(otitle, b, 24.15, 0.7);
    const marks = MOVES.map((m) => m[0]).concat([29.5]).filter((m) => m <= b);
    const last = marks.length ? Math.max(...marks) : -99;
    const now = layoutAt(b);
    const moving = b - last < 0.7;
    const before = moving ? layoutAt(last - 0.001) : now;
    const p = moving ? E.inOut((b - last) / 0.7) : 1;
    CARDS.forEach((c) => {
      const n = now.get(c);
      if (!n) { css(c.el, { opacity: '0' }); return; }
      const o = before.get(c) || n;
      const [x0, y0] = xy(o);
      const [x1, y1] = xy(n);
      const isMover = moving && MOVES.some(([m, id]) => m === last && id === c.id);
      const born = c.born !== undefined ? pr(b, c.born, 0.5) : 1;
      const lift = isMover ? Math.sin(p * Math.PI) * 0.07 : 0;
      css(c.el, {
        opacity: String(cl(born * 3)),
        transform: `translate(${lerp(x0, x1, p)}px, ${lerp(y0, y1, p) - lift * 120}px) scale(${(born <= 0 ? 0.001 : E.back(born)) * (1 + lift)})`,
        boxShadow: isMover ? `0 ${30 * lift / 0.07}px 50px -20px rgba(11,74,168,${0.5 * lift / 0.07})` : 'none',
        zIndex: isMover ? '5' : '1',
      });
      const chip = $('[data-chip]', c.el);
      const shown = moving && isMover && p < 0.5 ? o.col : n.col;
      if (shown >= 3) { chip.className = 'chip chip--green'; chip.textContent = 'Paid'; }
      else if (shown >= 2) { chip.className = 'chip chip--blue'; chip.textContent = 'Pathao'; }
      else { chip.className = 'chip chip--gray'; chip.textContent = c.ch; }
    });
    const counts = [0, 0, 0, 0];
    now.forEach((v) => { counts[v.col] += 1; });
    colHeads.forEach((el, k) => { el.textContent = String(counts[k]); });
  });

  // 5 · Fraud Check: click, type, scan, verdict
  const ftitle = $('[data-ftitle]');
  const ftext = $('[data-ftext]');
  const caret = $('[data-caret]');
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
  const TYPE_AT = 33.5;
  const TYPE_STEP = 0.16;
  ev(33.2, 'click');
  [...PHONE].forEach((_, i) => ev(TYPE_AT + i * TYPE_STEP, 'type', { seed: i }));
  ev(36.2, 'click');
  ev(36.3, 'scan', { dur: 1.0 });
  ev(37.3, 'sparkle', { dur: 1.2, notes: [74, 76, 78, 81, 83, 86] });
  ev(38.6, 'chime', { note: 81 });
  scene('s-fraud', 32, 40, (b) => {
    fadeUp(ftitle, b, 32.15, 0.7);
    const typed = cl(Math.floor((b - TYPE_AT) / TYPE_STEP) + 1, 0, PHONE.length);
    ftext.textContent = PHONE.slice(0, b >= TYPE_AT ? typed : 0);
    css(caret, { opacity: b < 33.2 ? '0' : (b > 35.5 && Math.floor(b * 2.5) % 2) ? '0' : '1' });
    const press = b >= 36.2 && b < 36.45 ? 0.94 : 1;
    css(fbtn, { transform: `scale(${press})` });
    const sc = pr(b, 36.3, 1.0);
    css(fbeam, { opacity: sc > 0 && sc < 1 ? '1' : '0', transform: `translateX(${-100 + ((sc * 2) % 1) * 350}%)` });
    const rp = E.out(pr(b, 37.3, 1.3));
    fring.setAttribute('stroke-dasharray', `${(94 * rp).toFixed(2)} 100`);
    fring.style.opacity = rp > 0.005 ? '1' : '0';
    fpct.textContent = `${Math.round(94 * rp)}%`;
    ftot.textContent = String(Math.round(32 * rp));
    fdel.textContent = String(Math.round(30 * rp));
    fret.textContent = String(Math.round(2 * rp));
    popIn(fverdict, b, 38.6, 0.5, 20);
    cursor(fcursor, b, [[32, 1560, 1000], [33.1, 1010, 420], [35.6, 1010, 420], [36.15, 1600, 430], [37.4, 1600, 430], [39.2, 1720, 860]], [33.2, 36.2]);
  });

  // 6 · Couriers: the route, the truck, the webhook
  const rtitle = $('[data-rtitle]');
  const cchips = $$('[data-cchip]');
  const hook = $('[data-hook]');
  const hookStatus = $('[data-hookstatus]');
  const rbase = $('[data-rbase]');
  const rprog = $('[data-rprog]');
  const rstops = $$('[data-rstop]').map((el) => ({ el, at: Number(el.dataset.at), label: el.dataset.label }));
  const rpins = $$('[data-rpin]');
  const truck = $('[data-truck]');
  const sadia = $('[data-sadia]');
  const RLEN = rbase.getTotalLength();
  const rpt = (t) => { const p = rbase.getPointAtLength(RLEN * t); return [p.x / 10, p.y / 2.6]; };
  const placePct = (el, t) => { const [x, y] = rpt(t); css(el, { left: `${x}%`, top: `${y}%` }); };
  rstops.forEach((s) => placePct(s.el, s.at));
  const DRIVE_AT = 42.2;
  const DRIVE_LEN = 4.4;
  const invEase = (y) => { let lo = 0, hi = 1; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (E.inOut(m) < y) lo = m; else hi = m; } return (lo + hi) / 2; };
  cchips.forEach((_, i) => ev(40.6 + i * 0.4, 'pop', { note: [76, 79, 83, 86][i], pan: -0.7 + i * 0.25 }));
  ev(42.0, 'pop', { note: 69, pan: -0.8, gain: 0.7 });
  ev(DRIVE_AT, 'swish', { dur: 1.2, pan: -0.8, gain: 0.5 });
  rstops.slice(1, 4).forEach((s, i) => ev(DRIVE_AT + invEase(s.at) * DRIVE_LEN, 'plink', { note: [78, 81, 83][i], pan: -0.3 + i * 0.3 }));
  ev(DRIVE_AT + DRIVE_LEN, 'chime', { note: 86 });
  scene('s-route', 40, 48, (b) => {
    fadeUp(rtitle, b, 40.15, 0.7);
    cchips.forEach((el, i) => popIn(el, b, 40.6 + i * 0.4, 0.5, 20));
    fadeUp(hook, b, 41.9, 0.6, 16);
    popIn(rpins[0], b, 42.0, 0.5, 16);
    popIn(rpins[1], b, 42.2, 0.5, 16);
    const [sx, sy] = rpt(0);
    const [ex, ey] = rpt(1);
    rpins[0].style.left = `${sx}%`;
    rpins[0].style.top = `${sy}%`;
    rpins[0].style.translate = '-30px -150%';
    rpins[1].style.left = `${ex}%`;
    rpins[1].style.top = `${ey}%`;
    rpins[1].style.translate = 'calc(-100% + 30px) -150%';
    const p = E.inOut(pr(b, DRIVE_AT, DRIVE_LEN));
    rprog.setAttribute('stroke-dashoffset', String(1 - p));
    placePct(truck, p);
    css(truck, { opacity: String(cl(pr(b, 41.9, 0.4) * 2)) });
    let label = 'Packed';
    rstops.forEach((s) => {
      const done = p >= s.at - 0.002 && b >= DRIVE_AT;
      s.el.classList.toggle('done', done || s.at === 0);
      if (done) label = s.label;
    });
    hookStatus.textContent = label;
    sadia.innerHTML = p >= 1 ? '<b>Sadia</b> · received ✓' : '<b>Sadia</b> · waiting';
  });

  // 7 · Inventory: fill, run low, restock, sell one
  const ititle = $('[data-ititle]');
  const pcard = $('[data-pcard]');
  const sizes = $$('[data-size]').map((el) => ({ el, q: $('[data-q]', el), bar: $('[data-bar]', el) }));
  const SIZE_TO = [[18, 24], [3, 24], [14, 24], [11, 12]];
  const toast = (k) => $(`[data-it="${k}"]`);
  const itText = $('[data-ittext]');
  ev(48.8, 'sparkle', { dur: 1.1, notes: [69, 74, 78, 81] });
  ev(50.3, 'pop', { note: 66, pan: 0.4, gain: 0.8 });
  ev(52.0, 'pop', { note: 81, pan: 0.4 });
  ev(52.3, 'rise', { dur: 0.8 });
  ev(53.2, 'chime', { note: 86, gain: 0.6 });
  ev(54.5, 'pop', { note: 78, pan: 0.4 });
  ev(54.8, 'tick', { note: 74, gain: 0.6 });
  scene('s-inv', 48, 56, (b) => {
    fadeUp(ititle, b, 48.15, 0.7);
    fadeUp(pcard, b, 48.3, 0.7, 50);
    sizes.forEach((s, i) => {
      const [to, cap] = SIZE_TO[i];
      let q = to * E.out(pr(b, 48.8 + i * 0.22, 0.8));
      if (i === 1) q = lerp(q, 23, E.inOut(pr(b, 52.3, 0.8)));
      if (i === 0 && b >= 54.8) q = 17;
      s.q.textContent = String(Math.round(q));
      css(s.bar, { width: `${(q / cap) * 100}%` });
    });
    sizes[1].el.classList.toggle('low', b >= 50 && b < 52.4);
    sizes[1].el.classList.toggle('up', b >= 52.4);
    const low = toast('low');
    popIn(low, b, 50.3, 0.5, 20);
    const ok = b >= 53.2;
    low.classList.toggle('itoast-low', !ok);
    low.classList.toggle('itoast-ok', ok);
    itText.innerHTML = ok ? '<b>Back in stock</b> · OXF-12-L · 23 left' : '<b>Low stock</b> · OXF-12-L · 3 left';
    popIn(toast('restock'), b, 52.0, 0.5, 20);
    popIn(toast('order'), b, 54.5, 0.5, 20);
  });

  // 8 · Dashboard: count, draw, pop
  const dtitle = $('[data-dtitle]');
  const bcs = $$('[data-bc]');
  const rev = $('[data-rev]');
  const spark = $('[data-spark]');
  const heat = $('[data-heat]');
  const SEQ = ['#eef0f3', '#cfe0f5', '#93bce9', '#4f93da', '#0066cc'];
  let seed = 11;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const cells = [];
  for (let w = 0; w < 13; w++) {
    for (let d = 0; d < 7; d++) {
      const i = document.createElement('i');
      i.style.background = SEQ[Math.max(0, Math.min(4, Math.floor(rnd() * 2.6 + (w / 12) * 2.2)))];
      heat.appendChild(i);
      cells.push(i);
    }
  }
  const LEADERS = [['nabila', 'Nabila', 142], ['ayesha', 'Ayesha', 118], ['tanvir', 'Tanvir', 96], ['rafi', 'Rafi', 31]];
  const leadersEl = $('[data-leaders]');
  const leaderRows = LEADERS.map(([who, name, n]) => {
    const row = document.createElement('div');
    row.className = 'lead-row';
    row.innerHTML = `${AV(who, 'avc')}<span>${name}</span><span class="barx"><i></i></span><b>0</b>`;
    leadersEl.appendChild(row);
    return { bar: $('i', row), num: $('b', row), n };
  });
  ev(56.45, 'swish', { dur: 0.5, pan: 0.2, gain: 0.5 });
  ev(57.2, 'count', { dur: 2.6 });
  ev(58.2, 'sparkle', { dur: 2.2, notes: [74, 78, 81, 83, 86, 88, 90], gain: 0.7 });
  scene('s-dash', 56, 64, (b) => {
    fadeUp(dtitle, b, 56.15, 0.7);
    bcs.forEach((el, i) => fadeUp(el, b, 56.5 + i * 0.25, 0.7, 60));
    const rp = E.out(pr(b, 57.2, 2.8));
    rev.textContent = fmt(412800 * rp);
    spark.setAttribute('stroke-dashoffset', String(1 - E.inOut(pr(b, 57.2, 2.8))));
    cells.forEach((c, i) => {
      const p = pr(b, 58.2 + i * 0.022, 0.35);
      css(c, { transform: `scale(${p <= 0 ? 0 : E.back(p)})` });
    });
    leaderRows.forEach((r, i) => {
      const p = E.out(pr(b, 59 + i * 0.2, 1.2));
      css(r.bar, { width: `${(r.n / 142) * 100 * p}%` });
      r.num.textContent = String(Math.round(r.n * p));
    });
  });

  // 9 · Feature parade: one feature per half-beat
  const PARADE = [
    ['Promotions', 'i-percent'], ['Exchanges', 'i-exchange'], ['Invoices', 'i-doc'], ['Reviews', 'i-star'],
    ['Analytics', 'i-trend'], ['Meta Pixel', 'i-target'], ['bKash', 'i-wallet'], ['Storefront', 'i-store'],
  ];
  const PBG = ['#0066cc', '#ffffff', '#1d1d1f', '#e8f1fc'];
  const paradeEl = $('[data-parade]');
  const items = PARADE.map(([word, icon], k) => {
    const dark = k % 4 === 0 || k % 4 === 2;
    const it = document.createElement('div');
    it.className = 'pitem abs';
    it.innerHTML = `<span class="tile" style="background:${dark ? '#ffffff' : '#e8f1fc'};color:#0066cc"><svg class="icon"><use href="#${icon}"/></svg></span><b style="color:${dark ? '#ffffff' : '#1d1d1f'}">${word}</b>`;
    paradeEl.appendChild(it);
    return it;
  });
  PARADE.forEach((_, k) => { if (k) ev(64 + k * 0.5 - 0.1, 'swish', { dur: 0.32, pan: k % 2 ? -0.7 : 0.7, gain: 0.75 }); });
  scene('s-parade', 64, 68, (b) => {
    const k = cl(Math.floor((b - 64) / 0.5), 0, 7);
    paradeEl.style.background = PBG[k % 4];
    items.forEach((it, j) => {
      const at = 64 + j * 0.5;
      const dir = j % 2 ? -1 : 1;
      const pin = E.out(pr(b, at - 0.1, 0.28));
      const pout = E.inOut(pr(b, at + 0.4, 0.15));
      const on = j === k;
      css(it, {
        opacity: on ? '1' : '0',
        transform: `translateX(${(1 - pin) * 700 * dir - pout * 500 * dir}px) scale(${0.9 + 0.1 * pin})`,
      });
    });
  }, { enter: 'cut' });

  // 10 · The cast waves goodbye
  const ct1 = $('[data-ct1]');
  const ct2 = $('[data-ct2]');
  const castPeople = $$('[data-cp]');
  const hand = $('[data-hand]');
  const speech = $('[data-speech]');
  const CAST_AT = [69.0, 69.35, 69.7, 70.05, 70.4];
  CAST_AT.forEach((at, i) => ev(at, 'pop', { note: [74, 78, 81, 83, 86][i], pan: -0.6 + i * 0.3 }));
  ev(71.2, 'pop', { note: 90, pan: 0.2 });
  ev(72.6, 'bell', { note: 86, gain: 0.5 });
  scene('s-cast', 68, 76, (b) => {
    fadeUp(ct1, b, 68.15, 0.7);
    fadeUp(ct2, b, 68.55, 0.7);
    castPeople.forEach((el, i) => {
      const p = pr(b, CAST_AT[i], 0.7);
      const y = p <= 0 ? 110 : (1 - E.back(p)) * 110;
      const bob = p >= 1 ? Math.sin(b * 1.5 + i * 1.3) * 7 : 0;
      css(el, { transform: `translateY(${y + bob}%)` });
    });
    const w = b > 70.8 ? Math.sin((b - 70.8) * Math.PI * 1.6) * 18 * Math.min(1, (b - 70.8) * 2) : 0;
    css(hand, { transform: `rotate(${w}deg)`, opacity: String(cl(pr(b, 70.4, 0.4) * 2)) });
    popIn(speech, b, 71.2, 0.5, 14);
  });

  // 11 · End card + a click on "Book a demo"
  const ebadge = $('[data-ebadge]');
  const eword = $('[data-eword]');
  const etag = $('[data-etag]');
  const ecta = $('[data-ecta]');
  const ecursor = $('[data-ecursor]');
  const fadeEl = $('[data-fade]');
  ev(75.55, 'whoosh', { dur: 0.9 });
  ev(76.0, 'bloom', { note: 74 });
  ev(78.0, 'pop', { note: 81 });
  ev(79.5, 'click', { gain: 1 });
  ev(79.55, 'chime', { note: 86, gain: 0.7 });
  scene('s-end', 76, END_BEAT + 3, (b) => {
    popIn(ebadge, b, 76.05, 0.8, 30);
    fadeUp(eword, b, 76.6, 0.7);
    fadeUp(etag, b, 77.2, 0.7);
    popIn(ecta, b, 78.0, 0.5, 20);
    const hit = b >= 79.5 && b < 79.8;
    css(ecta, { background: hit ? '#e8f1fc' : '#ffffff' });
    if (b >= 78.5) css(ecta, { transform: `scale(${hit ? 0.95 : 1})` });
    cursor(ecursor, b, [[78.3, 1600, 1120], [79.35, 985, 790], [84, 985, 790]], [79.5]);
    css(fadeEl, { opacity: String(E.inOut(pr(b, 83.2, 2.4))) });
  }, { enter: 'bloom' });

  /* Transition swishes between scenes */
  SCENES.forEach((s, i) => { if (i && !s.enter) ev(s.from - 0.32, 'swish', { dur: 0.6, pan: 0.6, gain: 0.85 }); });

  /* ---- Render ------------------------------------------------------------ */
  function render(t) {
    const b = t / SPB;
    SCENES.forEach((s, i) => {
      const next = SCENES[i + 1];
      const lead = s.enter === 'cut' ? 0.12 : 0.3;
      const start = i === 0 ? -99 : s.from - lead;
      const nextLead = next ? (next.enter === 'cut' ? 0.12 : 0.3) : 0;
      const stop = next ? (next.enter === 'cut' ? next.from - nextLead : next.from + 0.25) : 999;
      if (b < start || b >= stop) { css(s.el, { visibility: 'hidden', opacity: '0' }); return; }
      let op = 1;
      let tx = 0;
      let sc = 1;
      if (i && s.enter !== 'cut' && b < s.from + 0.25) {
        const p = E.out(pr(b, start, 0.55));
        op = p;
        if (s.enter === 'bloom') sc = 1.1 - 0.1 * p; else tx = (1 - p) * 180;
      }
      if (next && next.enter !== 'cut' && b >= next.from - 0.3) {
        const p = E.inOut(pr(b, next.from - 0.3, 0.55));
        op *= 1 - p;
        if (next.enter === 'bloom') sc *= 1 + p * 0.06; else tx -= p * 180;
      }
      css(s.el, { visibility: 'visible', opacity: String(op), transform: `translateX(${tx}px) scale(${sc})`, zIndex: String(i) });
      s.draw(b);
    });
    lifeAvatars(b);
  }

  EV.sort((a, z) => a.b - z.b);
  window.__timeline = { bpm: BPM, spb: SPB, endBeat: END_BEAT, duration: DURATION, events: EV.map((e) => ({ ...e, t: Number((e.b * SPB).toFixed(4)) })) };
  window.__render = (t) => new Promise((resolve) => {
    render(t);
    let done = false;
    const fin = () => { if (!done) { done = true; resolve(true); } };
    requestAnimationFrame(() => requestAnimationFrame(fin));
    setTimeout(fin, 60);
  });

  async function init() {
    const html = await (await fetch('../index.html')).text();
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
