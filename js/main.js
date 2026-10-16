(() => {
  const nav = document.querySelector('[data-nav]');

  if (nav) {
    // Mega menus: click to toggle, hover to open on pointer devices
    const items = [...nav.querySelectorAll('.nav__item')];
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let closeTimer;

    const setItem = (item, open) => {
      item.classList.toggle('is-open', open);
      item.querySelector('.nav__trigger').setAttribute('aria-expanded', String(open));
    };
    const closeAll = (except) => items.forEach((item) => item !== except && setItem(item, false));
    const syncMenuState = () => nav.classList.toggle('is-menu-open', items.some((item) => item.classList.contains('is-open')));

    items.forEach((item) => {
      const trigger = item.querySelector('.nav__trigger');

      trigger.addEventListener('click', (e) => {
        // A mouse click on a hover-opened menu keeps it open; keyboard toggles
        const open = canHover && e.detail > 0 ? true : !item.classList.contains('is-open');
        closeAll(item);
        setItem(item, open);
        syncMenuState();
      });

      if (canHover) {
        item.addEventListener('mouseenter', () => {
          clearTimeout(closeTimer);
          closeAll(item);
          setItem(item, true);
          syncMenuState();
        });
        item.addEventListener('mouseleave', () => {
          closeTimer = setTimeout(() => { setItem(item, false); syncMenuState(); }, 140);
        });
      }

      item.querySelectorAll('.mm a').forEach((a) => a.addEventListener('click', () => { closeAll(); syncMenuState(); }));
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav__item')) { closeAll(); syncMenuState(); }
    });

    // Mobile drawer
    const burger = nav.querySelector('.nav__burger');
    const pinDrawer = () => nav.style.setProperty('--drawer-top', `${Math.max(0, nav.getBoundingClientRect().bottom)}px`);
    const setDrawer = (open) => {
      if (open) pinDrawer();
      nav.classList.toggle('is-drawer-open', open);
      document.documentElement.classList.toggle('is-locked', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    burger.addEventListener('click', () => setDrawer(!nav.classList.contains('is-drawer-open')));
    nav.querySelectorAll('.drawer a').forEach((a) => a.addEventListener('click', () => setDrawer(false)));
    window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => e.matches && setDrawer(false));

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const openItem = items.find((item) => item.classList.contains('is-open'));
      if (openItem) {
        setItem(openItem, false);
        syncMenuState();
        openItem.querySelector('.nav__trigger').focus();
      } else if (nav.classList.contains('is-drawer-open')) {
        setDrawer(false);
        burger.focus();
      }
    });

    // Hairline under the bar once the page scrolls
    const onScroll = () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 40);
      // Keep the drawer flush under the bar if a scroll was still settling when it opened
      if (nav.classList.contains('is-drawer-open')) pinDrawer();
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Reveal on scroll
  const items = document.querySelectorAll('.reveal');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add('is-in'));
  }

  // Order-activity heatmap: 13 weeks x 7 days, deterministic and trending up
  const heat = document.querySelector('[data-heatmap]');
  if (heat) {
    let seed = 11;
    const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const frag = document.createDocumentFragment();
    for (let week = 0; week < 13; week++) {
      for (let day = 0; day < 7; day++) {
        const level = Math.max(0, Math.min(4, Math.floor(rand() * 2.6 + (week / 12) * 2.2)));
        const cell = document.createElement('i');
        cell.className = `heat__c heat__c--${level}`;
        frag.appendChild(cell);
      }
    }
    heat.appendChild(frag);
  }

  // Footer year
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
