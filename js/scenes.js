/* PrimeOMS scenes — the living demo. Every loop runs only while its
   section is on screen, and everything settles to a still state under
   prefers-reduced-motion. All people, orders and numbers are illustrative. */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const avatar = (who, cls = 'av av--md') =>
    `<svg class="${cls}" viewBox="20 12 80 80" aria-hidden="true"><use href="#av-${who}" width="120" height="120"/></svg>`;

  // Re-trigger a one-shot CSS animation class
  const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const bump = (el, text) => { el.textContent = text; replay(el, 'bump'); };

  // Run `cycle(alive)` again and again while `el` is on screen
  function scene(el, cycle, threshold = 0.25) {
    if (!el) return;
    let visible = false;
    let running = false;
    const alive = () => visible;
    const run = async () => {
      if (running) return;
      running = true;
      while (visible) await cycle(alive);
      running = false;
    };
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) run();
    }, { threshold }).observe(el);
  }

  // Position of `el` inside `root`, in untransformed layout pixels
  const posIn = (el, root) => {
    let x = 0;
    let y = 0;
    let n = el;
    while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  };

  /* ---- Avatars: give every instance its own blink / glance rhythm ------ */
  $$('svg > use[href^="#av-"]').forEach((u) => {
    const svg = u.parentElement;
    svg.style.setProperty('--blink', `${(-Math.random() * 6.5).toFixed(2)}s`);
    svg.style.setProperty('--look', `${(-Math.random() * 9).toFixed(2)}s`);
  });

  /* ---- Ticker: duplicate the list for a seamless loop ------------------ */
  const track = $('[data-ticker]');
  if (track) {
    const list = track.firstElementChild;
    const clone = list.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
    track.style.setProperty('--marquee-dur', `${Math.round(list.scrollWidth / 45)}s`);
  }

  /* ---- Count-ups -------------------------------------------------------- */
  const countUp = (el, to, dur = 1500) => {
    if (reduced) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const countIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    countIO.unobserve(en.target);
    countUp(en.target, Number(en.target.dataset.countTo));
  }), { threshold: 0.4 });
  $$('[data-count-to]').forEach((el) => countIO.observe(el));

  /* ---- One-shot "is-in" for the bento + staggers ---------------------- */
  $$('.bento .heat__c').forEach((c, i) => c.style.setProperty('--i', i));
  $$('.feat-grid .reveal').forEach((c, i) => c.style.setProperty('--d', (i % 4) + Math.floor(i / 4)));
  const inIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add('is-in');
    inIO.unobserve(en.target);
  }), { threshold: 0.2 });
  $$('.bento').forEach((el) => inIO.observe(el));

  /* ---- Hero: tilt toward the pointer ---------------------------------- */
  const tiltWrap = $('[data-tilt]');
  const stage = tiltWrap && $('.stage', tiltWrap);
  if (stage && !reduced && window.matchMedia('(hover: hover) and (min-width: 735px)').matches) {
    tiltWrap.addEventListener('pointermove', (e) => {
      const r = tiltWrap.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      stage.style.setProperty('--ry', `${(-10 + x * 9).toFixed(2)}deg`);
      stage.style.setProperty('--rx', `${(4 - y * 6).toFixed(2)}deg`);
    });
    tiltWrap.addEventListener('pointerleave', () => {
      stage.style.removeProperty('--ry');
      stage.style.removeProperty('--rx');
    });
  }

  /* ---- Hero: multiplayer demo ----------------------------------------- */
  const win = $('[data-hero-window]');
  const toasts = $('[data-toasts]');
  if (win && toasts) {
    const curA = $('[data-cursor="nabila"]', win);
    const curB = $('[data-cursor="tanvir"]', win);
    const btn = $('[data-courier-btn]', win);
    const chip = $('[data-card="2047"] [data-status]', win);
    const kOrders = $('[data-kpi="orders"]', win);
    const kShipped = $('[data-kpi="shipped"]', win);
    const kRev = $('[data-kpi="revenue"]', win);
    const revBox = $('[data-kpi-box="revenue"]', win);

    const moveTo = (cur, el, fx = 0.5, fy = 0.5) => {
      const p = posIn(el, win);
      cur.style.setProperty('--x', `${Math.round(p.x + p.w * fx)}px`);
      cur.style.setProperty('--y', `${Math.round(p.y + p.h * fy)}px`);
    };
    const click = (cur) => replay(cur, 'is-click');
    const toast = (html, ms = 3600) => {
      const t = document.createElement('div');
      t.className = 'toast';
      t.innerHTML = html;
      toasts.prepend(t);
      while (toasts.children.length > 2) toasts.lastElementChild.remove();
      setTimeout(() => { t.classList.add('is-leaving'); setTimeout(() => t.remove(), 400); }, ms);
    };
    const reset = () => {
      btn.classList.remove('is-sent');
      btn.textContent = 'Add to Courier';
      chip.className = 'chip chip--amber';
      chip.textContent = 'Confirmed';
      kOrders.textContent = '48';
      kShipped.textContent = '12';
      kRev.textContent = 'BDT 86,450';
      revBox.classList.remove('is-hover');
    };

    // Resting spots
    moveTo(curA, $('.app__title', win), 1.4, 1.2);
    moveTo(curB, $('.m-kpis', win), 0.3, 1.6);

    if (!reduced) {
      scene(win, async (alive) => {
        await wait(700);
        moveTo(curA, btn);
        await wait(1300); if (!alive()) return;
        click(curA);
        btn.classList.add('is-pressed');
        await wait(160);
        btn.classList.remove('is-pressed');
        btn.classList.add('is-sent');
        btn.textContent = 'Sent ✓';
        chip.className = 'chip chip--blue';
        chip.textContent = 'Pathao · Pending pickup';
        bump(kShipped, '13');
        toast(`${avatar('nabila')}<span><b>Nabila</b> sent #2047 to Pathao<small>Pending pickup · just now</small></span>`);

        await wait(900);
        moveTo(curB, revBox, 0.55, 0.7);
        await wait(1200); if (!alive()) return;
        revBox.classList.add('is-hover');
        await wait(700);
        toast(`${avatar('sadia')}<span><b>New order #2048</b><small>Sadia R. · Facebook · BDT 2,400</small></span>`);
        bump(kOrders, '49');
        bump(kRev, 'BDT 88,850');

        await wait(2300); if (!alive()) return;
        revBox.classList.remove('is-hover');
        moveTo(curA, $('.m-cutoff', win), 0.75, 0.5);
        moveTo(curB, $('[data-card="2047"] .m-name', win), 1.1, 0.6);
        await wait(2600);
        reset();
        moveTo(curA, $('.app__title', win), 1.4, 1.2);
        moveTo(curB, $('.m-kpis', win), 0.3, 1.6);
        await wait(1200);
      }, 0.3);
    }
  }

  // Tween a number into an element
  const tween = (el, to, dur = 1000, suffix = '') => {
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = `${fmt(to * (1 - Math.pow(1 - p, 3)))}${suffix}`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const press = async (el) => { el.classList.add('is-pressed'); await wait(160); el.classList.remove('is-pressed'); };

  /* ---- Storyboard: chat → draft → delivery ----------------------------- */
  const story = $('[data-story]');
  if (story) {
    const steps = $$('.story__step', story);
    const msgs = $$('[data-msg]', story);
    const typing = $('[data-typing]', story);
    const line = $('[data-draft-line]', story);
    const shipRow = $('[data-draft-ship]', story);
    const check = $('[data-draft-check]', story);
    const rate = $('[data-draft-rate]', story);
    const dbtn = $('[data-draft-btn]', story);
    const dstatus = $('[data-draft-status]', story);
    const sstatus = $('[data-ship-status]', story);
    const road = $('.pship__road', story);
    const sSteps = $$('[data-ship-steps] li', story);
    const done = $('[data-ship-done]', story);
    const confetti = $('[data-confetti]', story);
    const stopNames = ['Picked up', 'At the sorting hub', 'In transit', 'Delivered'];

    const setActive = (i) => steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    const finalState = () => {
      msgs.forEach((m) => m.classList.add('is-shown'));
      typing.hidden = true;
      [line, shipRow, check].forEach((e) => e.classList.add('is-shown'));
      check.classList.add('is-done');
      rate.textContent = '94% delivered';
      dbtn.classList.add('is-done');
      dbtn.textContent = 'Order #2048 confirmed ✓';
      dstatus.className = 'chip chip--green';
      dstatus.textContent = 'Confirmed';
      road.style.setProperty('--p', '100%');
      sSteps.forEach((s) => s.classList.add('is-done'));
      sstatus.className = 'chip chip--green';
      sstatus.textContent = 'Pathao · Delivered';
      done.classList.add('is-shown');
    };
    const resetStory = () => {
      msgs.forEach((m) => m.classList.remove('is-shown'));
      msgs.forEach((m) => m.classList.add('is-hidden'));
      typing.hidden = true;
      [line, shipRow, check].forEach((e) => e.classList.remove('is-shown'));
      check.classList.remove('is-done', 'is-scanning');
      rate.textContent = '—';
      dbtn.classList.remove('is-done');
      dbtn.textContent = 'Finalize order';
      dstatus.className = 'chip chip--amber';
      dstatus.textContent = 'Draft';
      road.style.setProperty('--p', '0%');
      sSteps.forEach((s) => s.classList.remove('is-done'));
      sstatus.className = 'chip chip--blue';
      sstatus.textContent = 'Sent to Pathao';
      done.classList.remove('is-shown');
      confetti.innerHTML = '';
    };
    const burst = () => {
      confetti.innerHTML = '';
      const colors = ['#0066cc', '#2997ff', '#a6c6f1', '#d7e6fa', '#1d7a3a'];
      for (let i = 0; i < 28; i++) {
        const c = document.createElement('i');
        c.style.left = `${44 + Math.random() * 12}%`;
        c.style.top = '72%';
        c.style.background = colors[i % colors.length];
        c.style.setProperty('--dx', `${((Math.random() - 0.5) * 280).toFixed(0)}px`);
        c.style.setProperty('--dy', `${(-70 - Math.random() * 170).toFixed(0)}px`);
        c.style.setProperty('--rot', `${(Math.random() * 600).toFixed(0)}deg`);
        c.style.animationDelay = `${(Math.random() * 0.15).toFixed(2)}s`;
        confetti.appendChild(c);
      }
    };

    if (reduced) {
      finalState();
    } else {
      resetStory();
      scene(story, async (alive) => {
        resetStory();
        story.classList.add('is-playing');
        setActive(0);
        for (const m of msgs) {
          typing.classList.toggle('is-out', m.classList.contains('msg--out'));
          typing.hidden = false;
          await wait(850); if (!alive()) return;
          typing.hidden = true;
          m.classList.remove('is-hidden');
          void m.offsetWidth;
          m.classList.add('is-shown');
          await wait(550);
        }
        await wait(500); if (!alive()) return;

        setActive(1);
        line.classList.add('is-shown'); await wait(450);
        shipRow.classList.add('is-shown'); await wait(450);
        check.classList.add('is-shown', 'is-scanning');
        await wait(1300); if (!alive()) return;
        check.classList.remove('is-scanning');
        check.classList.add('is-done');
        rate.textContent = '94% delivered';
        await wait(700);
        await press(dbtn);
        dbtn.classList.add('is-done');
        dbtn.textContent = 'Order #2048 confirmed ✓';
        dstatus.className = 'chip chip--green';
        dstatus.textContent = 'Confirmed';
        await wait(1000); if (!alive()) return;

        setActive(2);
        for (let i = 0; i < 4; i++) {
          await wait(900); if (!alive()) return;
          road.style.setProperty('--p', `${(i + 1) * 25}%`);
          sSteps[i].classList.add('is-done');
          sstatus.textContent = `Pathao · ${stopNames[i]}`;
          if (i === 3) sstatus.className = 'chip chip--green';
        }
        await wait(700);
        done.classList.add('is-shown');
        burst();
        await wait(3400);
        story.classList.remove('is-playing');
        setActive(-1);
        await wait(700);
      }, 0.3);
    }
  }

  /* ---- Order board: cards travel New → Delivered ---------------------- */
  const board = $('[data-board]');
  if (board) {
    const lists = $$('.board__list', board);
    const counts = $$('[data-colcount]', board);
    const people = ['nabila', 'ayesha', 'tanvir', 'rafi'];
    const channels = ['Facebook', 'Store', 'Facebook', 'Facebook'];
    const amounts = [890, 1250, 2150, 1450, 3200, 1100, 2400];
    let next = 2055;

    const syncCounts = () => counts.forEach((c, i) => {
      const n = String(lists[i].querySelectorAll('.bcard:not(.is-leaving)').length);
      if (c.textContent !== n) bump(c, n);
    });
    const flip = (mutate) => {
      const before = new Map($$('.bcard', board).map((c) => [c, c.getBoundingClientRect()]));
      mutate();
      $$('.bcard', board).forEach((c) => {
        const f = before.get(c);
        if (!f) return;
        const l = c.getBoundingClientRect();
        const dx = f.left - l.left;
        const dy = f.top - l.top;
        if (!dx && !dy) return;
        c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.2,.7,.2,1)' });
      });
    };
    const restyle = (card, col) => {
      const chip = $('.chip', card);
      if (col === 2) { chip.className = 'chip chip--blue'; chip.textContent = 'Pathao'; }
      if (col === 3) { chip.className = 'chip chip--green'; chip.textContent = 'Paid'; }
    };
    const newCard = () => {
      const el = document.createElement('article');
      el.className = 'bcard is-new';
      el.innerHTML = `<div class="bcard__top"><b>#${next}</b><span>BDT ${fmt(amounts[next % amounts.length])}</span></div><div class="bcard__meta"><span class="chip chip--gray">${channels[next % 4]}</span>${avatar(people[next % 4], 'av av--xs')}</div>`;
      next += 1;
      return el;
    };

    const cd = $('[data-countdown]');
    let secs = 72 * 60 + 40;
    if (cd && !reduced) {
      setInterval(() => {
        secs = secs > 0 ? secs - 1 : 72 * 60 + 40;
        const h = Math.floor(secs / 3600);
        const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
        const s = String(secs % 60).padStart(2, '0');
        cd.textContent = `${h}:${m}:${s}`;
      }, 1000);
    }

    if (!reduced) {
      scene(board, async (alive) => {
        await wait(1500); if (!alive()) return;
        const from = [2, 1, 0].find((i) => lists[i].children.length && Math.random() > 0.3)
          ?? [2, 1, 0].find((i) => lists[i].children.length);
        if (from === undefined) return;
        const card = lists[from].lastElementChild;
        card.classList.remove('is-new');
        card.classList.add('is-moving');
        flip(() => { lists[from + 1].prepend(card); restyle(card, from + 1); });
        setTimeout(() => card.classList.remove('is-moving'), 750);
        if (lists[3].children.length > 3) {
          const old = lists[3].lastElementChild;
          old.classList.add('is-leaving');
          setTimeout(() => { old.remove(); syncCounts(); }, 400);
        }
        if (lists[0].children.length < 2) {
          await wait(450);
          const c = newCard();
          flip(() => lists[0].prepend(c));
        }
        syncCounts();
      }, 0.3);
    }
  }

  /* ---- Fraud Check: type, scan, verdict -------------------------------- */
  const fraud = $('[data-fraud]');
  if (fraud) {
    const phone = $('[data-fphone]', fraud);
    const fbtn = $('[data-fbtn]', fraud);
    const ring = $('[data-fring]', fraud);
    const pct = $('[data-fpct]', fraud);
    const tot = $('[data-ftotal]', fraud);
    const del = $('[data-fdel]', fraud);
    const ret = $('[data-fret]', fraud);
    const vtext = $('[data-fverdict-text]', fraud);
    const vicon = $('[data-fverdict] use', fraud);
    const C = 213.6;
    const cases = [
      { phone: '01712-XXX421', total: 32, del: 30, ret: 2, pct: 94, risky: false, text: 'Good delivery record — safe to confirm' },
      { phone: '01815-XXX044', total: 13, del: 5, ret: 8, pct: 38, risky: true, text: '8 of 13 returned — call before confirming' },
    ];
    const setCase = (c) => {
      fraud.classList.toggle('is-risky', c.risky);
      vtext.textContent = c.text;
      vicon.setAttribute('href', c.risky ? '#i-phone' : '#i-check');
      ring.setAttribute('stroke-dasharray', `${(C * c.pct / 100).toFixed(1)} ${C}`);
    };
    let k = 0;

    if (reduced) {
      const c = cases[0];
      phone.textContent = c.phone;
      setCase(c);
      pct.textContent = `${c.pct}%`;
      tot.textContent = c.total;
      del.textContent = c.del;
      ret.textContent = c.ret;
      fraud.classList.add('is-verdict');
    } else {
      scene(fraud, async (alive) => {
        const c = cases[k % cases.length];
        k += 1;
        fraud.classList.remove('is-verdict', 'is-risky');
        ring.setAttribute('stroke-dasharray', `0 ${C}`);
        pct.textContent = '0%';
        tot.textContent = '0';
        del.textContent = '0';
        ret.textContent = '0';
        phone.textContent = '';
        await wait(500);
        for (const ch of c.phone) { phone.textContent += ch; await wait(65); }
        await wait(350); if (!alive()) return;
        await press(fbtn);
        fraud.classList.add('is-scanning');
        await wait(1100); if (!alive()) return;
        fraud.classList.remove('is-scanning');
        setCase(c);
        tween(pct, c.pct, 1100, '%');
        tween(tot, c.total, 900);
        tween(del, c.del, 900);
        tween(ret, c.ret, 900);
        await wait(1100);
        fraud.classList.add('is-verdict');
        await wait(3800);
      }, 0.35);
    }
  }

  /* ---- Courier route: the truck drives, statuses arrive ----------------- */
  const routeEl = $('[data-route]');
  if (routeEl) {
    const path = $('[data-route-path]', routeEl);
    const len = path.getTotalLength();
    const pt = (t) => {
      const p = path.getPointAtLength(len * t);
      return { x: (p.x / 1000) * 100, y: (p.y / 260) * 100 };
    };
    const place = (el, t) => {
      const p = pt(t);
      el.style.setProperty('--x', `${p.x.toFixed(2)}%`);
      el.style.setProperty('--y', `${p.y.toFixed(2)}%`);
    };
    const stops = $$('.route__stop', routeEl).map((el) => ({ el, at: Number(el.dataset.at), label: el.dataset.label }));
    stops.forEach((s) => place(s.el, s.at));
    $$('[data-pin]', routeEl).forEach((pin) => place(pin, Number(pin.dataset.pin)));
    const truck = $('[data-truck-r]', routeEl);
    const status = $('[data-route-status]');
    const endPin = $('.route__pin--end', routeEl);
    const endText = $('span', endPin);
    path.style.strokeDasharray = `${len}`;
    const setT = (t) => {
      place(truck, t);
      path.style.strokeDashoffset = `${len * (1 - t)}`;
    };
    const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

    if (reduced) {
      setT(1);
      stops.forEach((s) => s.el.classList.add('is-done'));
      status.textContent = 'Delivered';
      endPin.classList.add('is-happy');
      endText.innerHTML = '<b>Sadia</b> · received ✓';
    } else {
      setT(0);
      scene(routeEl, async (alive) => {
        stops.forEach((s, i) => s.el.classList.toggle('is-done', i === 0));
        status.textContent = 'Packed';
        endPin.classList.remove('is-happy');
        endText.innerHTML = '<b>Sadia</b> · waiting';
        setT(0);
        await wait(900); if (!alive()) return;
        let reached = 0;
        const t0 = performance.now();
        await new Promise((resolve) => {
          const frame = (now) => {
            if (!alive()) { resolve(); return; }
            const p = Math.min(1, (now - t0) / 7000);
            const e = ease(p);
            setT(e);
            stops.forEach((s, i) => {
              if (i > reached && e >= s.at - 0.002) {
                reached = i;
                s.el.classList.add('is-done');
                bump(status, s.label);
              }
            });
            if (p < 1) requestAnimationFrame(frame); else resolve();
          };
          requestAnimationFrame(frame);
        });
        if (!alive()) return;
        endPin.classList.add('is-happy');
        endText.innerHTML = '<b>Sadia</b> · received ✓';
        await wait(2800);
      }, 0.3);
    }
  }

  /* ---- Inventory: runs low, gets restocked, sells one ----------------- */
  const inv = $('.inv2__stage');
  if (inv) {
    const L = $('[data-size="L"]', inv);
    const M = $('[data-size="M"]', inv);
    const lQty = $('[data-qty]', L);
    const mQty = $('[data-qty]', M);
    const lBar = $('i', L);
    const mBar = $('i', M);
    const tLow = $('[data-itoast="low"]', inv);
    const tLowText = $('span:not(.itoast__pulse)', tLow);
    const tRe = $('[data-itoast="restock"]', inv);
    const tOrd = $('[data-itoast="order"]', inv);
    const setQty = (qtyEl, bar, q, cap) => { bump(qtyEl, String(q)); bar.style.setProperty('--p', `${Math.round((q / cap) * 100)}%`); };
    const lowState = () => {
      tLow.classList.add('itoast--low');
      tLow.classList.remove('itoast--ok');
      tLowText.innerHTML = '<b>Low stock</b> · OXF-12-L · 3 left';
    };

    if (reduced) {
      [tLow, tRe, tOrd].forEach((t) => t.classList.add('is-shown'));
    } else {
      scene(inv, async (alive) => {
        [tLow, tRe, tOrd].forEach((t) => t.classList.remove('is-shown'));
        lowState();
        L.classList.add('is-low');
        L.classList.remove('is-up');
        lQty.textContent = '3';
        lBar.style.setProperty('--p', '12%');
        mQty.textContent = '18';
        mBar.style.setProperty('--p', '75%');
        await wait(900); if (!alive()) return;
        tLow.classList.add('is-shown');
        await wait(1900); if (!alive()) return;
        tRe.classList.add('is-shown');
        await wait(600);
        L.classList.remove('is-low');
        L.classList.add('is-up');
        setQty(lQty, lBar, 23, 24);
        await wait(900);
        tLow.classList.remove('itoast--low');
        tLow.classList.add('itoast--ok');
        tLowText.innerHTML = '<b>Back in stock</b> · OXF-12-L · 23 left';
        await wait(1500); if (!alive()) return;
        tOrd.classList.add('is-shown');
        await wait(500);
        setQty(mQty, mBar, 17, 24);
        await wait(3400);
      }, 0.3);
    }
  }

  /* ---- Team: orbit picks, permissions, live log ----------------------- */
  const team = $('[data-scene="team"]');
  if (team) {
    const FEATURES = ['Orders', 'Fraud Check', 'Products', 'Stock levels', 'Customers', 'Discounts', 'Marketing', 'Store settings'];
    const PEOPLE = {
      nabila: { name: 'Nabila', role: 'Moderator · 14 features', on: [1, 1, 1, 1, 1, 1, 0, 0] },
      tanvir: { name: 'Tanvir', role: 'Store owner · every feature', on: [1, 1, 1, 1, 1, 1, 1, 1] },
      ayesha: { name: 'Ayesha', role: 'Operations · 7 features', on: [1, 0, 1, 1, 1, 0, 0, 0] },
      rafi: { name: 'Rafi', role: 'Moderator · invited · 3 features', on: [1, 1, 0, 0, 1, 0, 0, 0] },
    };
    const grid = $('[data-perm-grid]', team);
    const card = grid.closest('.perm-card');
    const pAv = $('[data-perm-av]', team);
    const pName = $('[data-perm-name]', team);
    const pRole = $('[data-perm-role]', team);
    const items = $$('.orbit__item', team);
    let userPicked = false;
    let idx = 0;

    const render = (key) => {
      const p = PEOPLE[key];
      pAv.setAttribute('href', `#av-${key}`);
      pName.textContent = p.name;
      pRole.textContent = p.role;
      grid.innerHTML = FEATURES.map((f, i) =>
        `<li class="perm${p.on[i] ? ' is-on' : ''}" style="--d:${i}"><span>${f}</span><i class="toggle"></i></li>`).join('');
    };
    const pick = (b) => {
      items.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      render(b.dataset.person);
    };
    items.forEach((b, i) => b.addEventListener('click', () => {
      userPicked = true;
      idx = i;
      card.setAttribute('aria-live', 'polite');
      pick(b);
    }));
    render('nabila');

    if (!reduced) {
      scene(team, async (alive) => {
        await wait(4200);
        if (!alive() || userPicked) return;
        card.setAttribute('aria-live', 'off');
        idx = (idx + 1) % items.length;
        pick(items[idx]);
      }, 0.3);
    }

    const feed = $('[data-feed]', team);
    const POOL = [
      ['nabila', 'confirmed order', '#2056'],
      ['tanvir', 'updated the price of', 'OXF-12'],
      ['ayesha', 'restocked', 'CRG-03-L'],
      ['rafi', 'created draft', 'D-122'],
      ['nabila', 'ran Fraud Check on', '018XX-XXX907'],
      ['tanvir', 'exported the', 'daily report'],
      ['ayesha', 'approved exchange', '#EX-32'],
      ['rafi', 'updated the address on', 'D-122'],
    ];
    let fi = 0;
    let minutes = 19 * 60 + 2;
    const clock = () => {
      const h = Math.floor(minutes / 60);
      const m = String(minutes % 60).padStart(2, '0');
      return `${((h + 11) % 12) + 1}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
    };
    const addFeed = () => {
      const [who, verb, obj] = POOL[fi % POOL.length];
      fi += 1;
      minutes += 1 + (fi % 3);
      const li = document.createElement('li');
      li.innerHTML = `${avatar(who, 'av')}<span><b>${who[0].toUpperCase()}${who.slice(1)}</b> ${verb} ${obj}</span><time>${clock()}</time>`;
      feed.prepend(li);
      while (feed.children.length > 4) feed.lastElementChild.remove();
    };
    for (let i = 0; i < 4; i++) addFeed();
    if (!reduced) scene(feed, async (alive) => { await wait(2800); if (alive()) addFeed(); }, 0.2);
  }

  /* ---- "A day on PrimeOMS" companion pill ------------------------------ */
  const now = $('[data-now]');
  if (now) {
    const STORY = {
      hero: ['nabila', '9:00 AM', 'The store opens · 4 teammates online'],
      story: ['nabila', '9:41 AM', 'Nabila takes an order on Messenger'],
      orders: ['rafi', '11:20 AM', 'Orders move across the board'],
      fraud: ['nabila', '12:05 PM', 'Nabila checks a new number'],
      route: ['ayesha', '1:05 PM', 'Pathao picks up today’s parcels'],
      inventory: ['ayesha', '3:30 PM', 'Ayesha restocks OXF-12'],
      dash: ['tanvir', '6:30 PM', 'Cutoff · Tanvir reviews the day'],
      team: ['tanvir', '7:10 PM', 'Tanvir gives Rafi Fraud Check'],
      features: ['sadia', '8:15 PM', 'Sadia’s parcel is out for delivery'],
      cta: ['sadia', '9:00 PM', 'Delivered. A calm day.'],
    };
    const nAv = $('[data-now-av]', now);
    const nTime = $('[data-now-time]', now);
    const nMsg = $('[data-now-msg]', now);
    const hand = $('[data-now-hand]', now);
    const text = $('.now__text', now);
    const toMin = (t) => {
      const [, h, m, ap] = t.match(/(\d+):(\d+) (AM|PM)/);
      return ((Number(h) % 12) + (ap === 'PM' ? 12 : 0)) * 60 + Number(m);
    };
    let current = '';
    const set = (key) => {
      if (key === current || !STORY[key]) return;
      current = key;
      const [who, time, msg] = STORY[key];
      replay(text, 'is-swapping');
      setTimeout(() => {
        nAv.setAttribute('href', `#av-${who}`);
        nTime.textContent = time;
        nMsg.textContent = msg;
      }, 200);
      hand.style.setProperty('--deg', `${270 + ((toMin(time) - 540) / 720) * 360}deg`);
    };

    const ratios = new Map();
    const sceneIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => ratios.set(e.target, e.intersectionRatio));
      let best = null;
      let max = 0;
      ratios.forEach((r, el) => { if (r > max) { max = r; best = el; } });
      if (best) set(best.dataset.scene);
    }, { threshold: [0, 0.15, 0.3, 0.5, 0.7, 0.9] });
    $$('[data-scene]').forEach((el) => sceneIO.observe(el));

    let footerIn = false;
    const footer = $('.footer');
    if (footer) new IntersectionObserver(([e]) => { footerIn = e.isIntersecting; onScroll(); }).observe(footer);
    function onScroll() { now.classList.toggle('is-visible', window.scrollY > 260 && !footerIn); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
