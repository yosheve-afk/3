/* =============================================================
   Nadia Hartley | Accountant portfolio
   Vanilla JavaScript, no dependencies.

   Contents
   0. Config
   1. Helpers
   2. Navbar: mobile menu + scrolled state
   3. Scroll-spy for nav links
   4. Scroll-reveal (IntersectionObserver)
   5. Services: expandable cards + "ask about" preselect
   6. Hero: portrait fallback + trial-balance intro
   7. Contact form: validation and submit
   8. Footer year
   ============================================================= */

(() => {
  'use strict';

  /* ---------------------------------------------------------
     0. Config
     ---------------------------------------------------------
     To receive real messages, paste a form endpoint here
     (Formspree, Getform, Basin, or your own API). The form
     sends JSON via POST. While this is empty, the form runs
     in demo mode: it validates and shows the success state,
     but nothing is sent anywhere.
     Example: 'https://formspree.io/f/xxxxxxxx'
     --------------------------------------------------------- */
  const FORM_ENDPOINT = '';


  /* ---------------------------------------------------------
     1. Helpers
     --------------------------------------------------------- */
  const $  = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasObserver = 'IntersectionObserver' in window;


  /* ---------------------------------------------------------
     2. Navbar
     --------------------------------------------------------- */
  function initNav() {
    const header = $('.site-header');
    const toggle = $('.nav-toggle');
    const menu = $('#nav-menu');
    if (!header || !toggle || !menu) return;

    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

    const setMenu = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', () => setMenu(!isOpen()));

    // Close after choosing a link
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setMenu(false);
    });

    // Close with Escape (return focus to the button) or by tapping outside
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setMenu(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', (event) => {
      if (isOpen() && !header.contains(event.target)) setMenu(false);
    });

    // Reset when the layout switches to the desktop navbar
    const desktop = window.matchMedia('(min-width: 900px)');
    const onBreakpoint = (event) => { if (event.matches) setMenu(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onBreakpoint);
    else desktop.addListener(onBreakpoint); // older Safari

    // Shadow once the page has scrolled
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        header.classList.toggle('is-scrolled', window.scrollY > 8);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }


  /* ---------------------------------------------------------
     3. Scroll-spy
     --------------------------------------------------------- */
  function initScrollSpy() {
    if (!hasObserver) return;

    const links = $$('.nav-links a[href^="#"]');
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const clear = () => links.forEach((a) => a.removeAttribute('aria-current'));

    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (entry.target.id === 'home') { clear(); return; }
        const link = byId.get(entry.target.id);
        if (!link) return;
        clear();
        link.setAttribute('aria-current', 'location');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });

    ['home', ...byId.keys()].forEach((id) => {
      const section = document.getElementById(id);
      if (section) spy.observe(section);
    });
  }


  /* ---------------------------------------------------------
     4. Scroll-reveal
     --------------------------------------------------------- */
  function initReveal() {
    const items = $$('.reveal');
    if (!items.length) return;

    // Stagger children of any [data-stagger] group (wraps every 3 for grids)
    $$('[data-stagger]').forEach((group) => {
      Array.from(group.children).forEach((child, index) => {
        child.style.setProperty('--reveal-delay', `${(index % 3) * 90}ms`);
      });
    });

    if (!hasObserver || prefersReducedMotion) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target); // reveal once
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    items.forEach((el) => observer.observe(el));
  }


  /* ---------------------------------------------------------
     5. Services
     --------------------------------------------------------- */
  function initServices() {
    $$('.svc-card').forEach((card) => {
      const button = $('.svc-toggle', card);
      if (!button) return;
      button.addEventListener('click', () => {
        const open = card.classList.toggle('is-open');
        button.setAttribute('aria-expanded', String(open));
      });
    });

    // "Ask about ..." links preselect the matching option in the form
    const select = $('#f-service');
    $$('[data-service]').forEach((link) => {
      link.addEventListener('click', () => {
        if (!select) return;
        select.value = link.dataset.service;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }


  /* ---------------------------------------------------------
     6. Hero
     --------------------------------------------------------- */
  function initPortraitFallback() {
    const frame = $('.portrait-frame');
    const img = frame && $('img', frame);
    if (!img) return;

    const markMissing = () => frame.classList.add('is-empty');

    // The error may already have fired before this script ran (defer)
    if (img.complete && img.naturalWidth === 0) markMissing();
    else img.addEventListener('error', markMissing, { once: true });
  }

  // The one orchestrated moment: a trial balance fills in, totals count up,
  // and the status flips from "Checking totals" to "Balanced".
  function initLedger() {
    const ledger = $('#ledger');
    if (!ledger) return;

    const rows = $$('.ledger-row', ledger);
    const counters = $$('[data-count]', ledger);
    const status = $('#ledger-status');
    const statusText = status && $('.ledger-status-text', status);

    // Final state is already in the HTML, so reduced-motion users just see it.
    if (prefersReducedMotion || !hasObserver) {
      ledger.classList.add('is-done');
      return;
    }

    const format = (n) => Math.round(n).toLocaleString('en-US');
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const countUp = (duration, onDone) => {
      const startTime = performance.now();
      const frame = (now) => {
        const t = Math.min((now - startTime) / duration, 1);
        counters.forEach((el) => {
          el.textContent = format(Number(el.dataset.count) * easeOut(t));
        });
        if (t < 1) requestAnimationFrame(frame);
        else onDone();
      };
      requestAnimationFrame(frame);
    };

    const play = () => {
      const stepMs = 130;
      const startMs = 500;

      if (status) {
        status.classList.remove('is-balanced');
        statusText.textContent = 'Checking totals';
      }
      counters.forEach((el) => { el.textContent = '0'; });

      rows.forEach((row, i) => {
        setTimeout(() => row.classList.add('is-in'), startMs + i * stepMs);
      });

      const totalsAt = startMs + (rows.length - 1) * stepMs + 200;
      setTimeout(() => {
        countUp(1000, () => {
          if (status) {
            status.classList.add('is-balanced');
            statusText.textContent = 'Balanced';
          }
          ledger.classList.add('is-done');
        });
      }, totalsAt);
    };

    // Start when the card is actually on screen (on phones it sits below the portrait)
    const observer = new IntersectionObserver((entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) {
        obs.disconnect();
        play();
      }
    }, { threshold: 0.35 });
    observer.observe(ledger);
  }


  /* ---------------------------------------------------------
     7. Contact form
     --------------------------------------------------------- */
  function initForm() {
    const form = $('#contact-form');
    if (!form) return;

    const banner = $('#form-banner');
    const success = $('#form-success');
    const successTitle = $('#form-success-title');
    const submitBtn = $('#submit-btn');
    const resetBtn = $('#form-reset');
    const fieldNames = ['name', 'email', 'service', 'message'];

    const validators = {
      name: (v) => v.trim().length >= 2 || 'Enter your name.',
      email: (v) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ||
        'Enter a valid email address, like name@company.com.',
      service: (v) => v !== '' || 'Choose the service you need help with.',
      message: (v) => v.trim().length >= 10 || 'Add a few more details (at least 10 characters).'
    };

    const input = (name) => form.querySelector(`[name="${name}"]`);

    const setError = (name, message) => {
      const control = input(name);
      const wrapper = control.closest('.field');
      const error = $('.field-error', wrapper);
      const hasError = Boolean(message);
      error.textContent = message || '';
      error.hidden = !hasError;
      wrapper.classList.toggle('has-error', hasError);
      if (hasError) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    };

    const check = (name) => {
      const result = validators[name](input(name).value);
      const message = result === true ? '' : result;
      setError(name, message);
      return !message;
    };

    // Validate on blur; once a field shows an error, re-check as the person types
    fieldNames.forEach((name) => {
      const control = input(name);
      control.addEventListener('blur', () => check(name));
      const recheck = () => {
        if (control.closest('.field').classList.contains('has-error')) check(name);
      };
      control.addEventListener('input', recheck);
      control.addEventListener('change', recheck);
    });

    const setLoading = (loading) => {
      submitBtn.disabled = loading;
      submitBtn.classList.toggle('is-loading', loading);
      $('.btn-label', submitBtn).textContent = loading ? 'Sending' : 'Send message';
    };

    const send = async (data) => {
      if (!FORM_ENDPOINT) {
        // Demo mode: no endpoint configured, so nothing leaves the browser.
        await new Promise((resolve) => setTimeout(resolve, 900));
        console.info('[Contact form] Demo mode. Set FORM_ENDPOINT in script.js to send real messages.', data);
        return;
      }
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    };

    const showSuccess = () => {
      form.hidden = true;
      success.hidden = false;
      successTitle.focus();
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      banner.hidden = true;

      const results = fieldNames.map(check);
      const firstInvalid = results.indexOf(false);
      if (firstInvalid !== -1) {
        input(fieldNames[firstInvalid]).focus();
        return;
      }

      // Honeypot: bots fill hidden fields. Pretend it worked and discard.
      if (input('website').value) {
        showSuccess();
        return;
      }

      const data = Object.fromEntries(fieldNames.map((n) => [n, input(n).value.trim()]));

      setLoading(true);
      try {
        await send(data);
        showSuccess();
      } catch (error) {
        console.error(error);
        banner.hidden = false;
      } finally {
        setLoading(false);
      }
    });

    resetBtn.addEventListener('click', () => {
      form.reset();
      fieldNames.forEach((name) => setError(name, ''));
      success.hidden = true;
      form.hidden = false;
      input('name').focus();
    });
  }


  /* ---------------------------------------------------------
     8. Footer year
     --------------------------------------------------------- */
  function initYear() {
    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();
  }


  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */
  initNav();
  initScrollSpy();
  initReveal();
  initServices();
  initPortraitFallback();
  initLedger();
  initForm();
  initYear();
})();
