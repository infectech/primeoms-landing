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

  // Keep contact submission on-page so send feedback reflects the actual result.
  const contactForm = document.querySelector('.contact__form');
  if (contactForm && 'fetch' in window) {
    const button = contactForm.querySelector('.contact__send');
    const label = button.querySelector('.contact__send-label');
    const status = contactForm.querySelector('.contact__status');
    let sending = false;

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (sending) return;
      sending = true;
      button.disabled = true;
      button.dataset.state = 'sending';
      label.textContent = 'Sending…';
      status.dataset.state = 'sending';
      status.textContent = 'Sending your message…';
      contactForm.setAttribute('aria-busy', 'true');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(contactForm.action, {
          method: 'POST',
          body: new FormData(contactForm),
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Message submission failed');
        button.dataset.state = 'sent';
        label.textContent = 'Message sent';
        status.dataset.state = 'sent';
        status.textContent = 'Thanks for reaching out! The PrimeOMS team will be in touch.';
        contactForm.reset();
      } catch (error) {
        button.dataset.state = 'error';
        label.textContent = 'Try again';
        status.dataset.state = 'error';
        status.textContent = 'Your message couldn’t be sent. Please try again or email hello@infec.tech.';
      } finally {
        clearTimeout(timeout);
        sending = false;
        button.disabled = false;
        contactForm.removeAttribute('aria-busy');
      }
    });

    contactForm.addEventListener('input', () => {
      if (sending || button.dataset.state !== 'sent') return;
      delete button.dataset.state;
      label.textContent = 'Send message';
      status.textContent = '';
      delete status.dataset.state;
    });
  }

  // Footer year
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
})();
