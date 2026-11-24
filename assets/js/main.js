/* ==========================================================================
   KUXAIT — main.js
   Smooth scroll, reveals, scroll-scrubbed thesis, method tracker,
   cadence rings, FAQ, cursor, magnetic buttons, form.
   Requires: gsap + ScrollTrigger (CDN). Lenis is optional.
   Everything degrades gracefully: content is visible without JS.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var hasGsap = typeof window.gsap !== 'undefined';
  var hasST = hasGsap && typeof window.ScrollTrigger !== 'undefined';
  if (hasST) gsap.registerPlugin(ScrollTrigger);

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------------
     Smooth scroll (Lenis) synced to GSAP ticker
     --------------------------------------------------------------------- */
  var lenis = null;
  if (!reduced && typeof window.Lenis !== 'undefined' && hasGsap) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
    if (hasST) lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
  }
  function scrollToEl(el) {
    var off = -(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72) + 8;
    if (lenis) lenis.scrollTo(el, { offset: off, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------------------------------------------------------------------
     Nav: scrolled state, progress bar, mobile menu, anchor links
     --------------------------------------------------------------------- */
  var nav = $('.nav'), progress = $('.progress'), menu = $('.menu'), burger = $('.nav__burger');
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (nav) nav.classList.toggle('is-scrolled', y > 24);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  if (lenis) lenis.on('scroll', onScroll);
  onScroll();

  function closeMenu() {
    if (!menu) return;
    menu.classList.remove('is-open'); nav.classList.remove('is-open');
    burger && burger.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start(); else document.body.style.overflow = '';
  }
  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = !menu.classList.contains('is-open');
      menu.classList.toggle('is-open', open); nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      if (lenis) { open ? lenis.stop() : lenis.start(); } else document.body.style.overflow = open ? 'hidden' : '';
    });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var el = document.getElementById(id.slice(1));
      if (!el) return;
      e.preventDefault(); closeMenu();
      setTimeout(function () { scrollToEl(el); }, menu && menu.classList.contains('is-open') ? 350 : 0);
      history.replaceState(null, '', id);
    });
  });

  /* ---------------------------------------------------------------------
     Word splitting (keeps nested elements like <span class="acc">)
     --------------------------------------------------------------------- */
  function splitWords(el, wClass, iClass) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      if (!node.nodeValue.trim()) return;
      var frag = document.createDocumentFragment();
      var parts = node.nodeValue.split(/(\s+)/);
      parts.forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span'); w.className = wClass;
        var i = document.createElement('span'); i.className = iClass; i.textContent = part;
        w.appendChild(i); frag.appendChild(w);
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  /* ---------------------------------------------------------------------
     Reveals
     --------------------------------------------------------------------- */
  if (hasST && !reduced) {
    // headline word reveals
    $$('[data-split]').forEach(function (el) {
      splitWords(el, 'w', 'wi');
      var words = $$('.wi', el);
      gsap.set(words, { yPercent: 110 });
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(words, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.035, overwrite: true });
        }
      });
    });

    // generic fade-up reveals
    $$('[data-reveal]').forEach(function (el) {
      var kids = el.hasAttribute('data-reveal-children') ? Array.prototype.slice.call(el.children) : [el];
      gsap.set(kids, { y: 28, opacity: 0 });
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: function () { gsap.to(kids, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.08, overwrite: true }); }
      });
    });

    // hero intro
    var heroWords = $$('.hero__title .wi');
    var heroBits = $$('.hero__copy > *, .hero__foot');
    gsap.set(heroBits, { y: 20, opacity: 0 });
    var tl = gsap.timeline({ delay: 0.15 });
    if (heroWords.length) tl.to(heroWords, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.05, overwrite: true }, 0);
    tl.to(heroBits, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.1 }, 0.45);

    // hero canvas parallax / fade on scroll
    var heroCanvas = $('.hero__canvas');
    if (heroCanvas) {
      gsap.to(heroCanvas, {
        opacity: 0.15, yPercent: 12, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }

    // SVG stroke draw-ins
    $$('.draw').forEach(function (path) {
      var len = 0;
      try { len = path.getTotalLength(); } catch (e) { return; }
      if (!len) return;
      path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
    });
    $$('.stage__viz, .role__sig, .pillar__art').forEach(function (fig) {
      var paths = $$('.draw', fig); if (!paths.length) return;
      ScrollTrigger.create({
        trigger: fig, start: 'top 85%', once: true,
        onEnter: function () { gsap.to(paths, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.08 }); }
      });
    });
  } else {
    // no motion: make sure nothing stays hidden
    $$('[data-split], [data-reveal]').forEach(function (el) { el.style.opacity = 1; });
  }

  /* ---------------------------------------------------------------------
     Thesis: words light up as you scroll
     --------------------------------------------------------------------- */
  var thesis = $('.thesis__text');
  if (thesis) {
    splitWords(thesis, 't-w', 't-wi');
    $$('.t-w', thesis).forEach(function (w) {
      if (w.closest('.acc')) w.classList.add('acc-w');
    });
    var tw = $$('.t-w', thesis);
    if (hasST && !reduced) {
      gsap.set(tw, { opacity: 0.16 });
      gsap.to(tw, {
        opacity: 1, ease: 'none', stagger: 0.06,
        scrollTrigger: { trigger: thesis, start: 'top 75%', end: 'bottom 45%', scrub: 0.4 }
      });
    }
  }

  /* ---------------------------------------------------------------------
     Method: sticky tracker follows the active stage
     --------------------------------------------------------------------- */
  var stages = $$('.stage');
  if (stages.length) {
    var numEl = $('[data-method-num]'), nameEl = $('[data-method-name]'), blockEl = $('[data-method-block]');
    var rail = $$('.method__rail span'), blocks = $$('.method__blocks span');
    function activate(i) {
      stages.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      rail.forEach(function (r, k) { r.classList.toggle('is-done', k < i); r.classList.toggle('is-active', k === i); });
      var s = stages[i];
      if (numEl) numEl.textContent = s.getAttribute('data-num') || String(i + 1).padStart(2, '0');
      if (nameEl) nameEl.textContent = s.getAttribute('data-name') || '';
      if (blockEl) blockEl.textContent = s.getAttribute('data-block') || '';
      var b = s.getAttribute('data-block-index') || '0';
      blocks.forEach(function (el) { el.classList.toggle('is-active', el.getAttribute('data-block-index') === b); });
    }
    if (hasST) {
      stages.forEach(function (s, i) {
        ScrollTrigger.create({
          trigger: s, start: 'top 55%', end: 'bottom 55%',
          onEnter: function () { activate(i); }, onEnterBack: function () { activate(i); }
        });
      });
    } else {
      activate(0);
    }
    activate(0);
  }

  /* ---------------------------------------------------------------------
     Cadence rings: hovering a property highlights its ring
     --------------------------------------------------------------------- */
  var cadence = $('.cadence');
  if (cadence) {
    var props = $$('.prop');
    var coreB = $('.cadence__core b'), coreS = $('.cadence__core span');
    var defaultB = coreB ? coreB.textContent : '', defaultS = coreS ? coreS.textContent : '';
    props.forEach(function (p) {
      function on() {
        props.forEach(function (q) { q.classList.remove('is-active'); });
        p.classList.add('is-active');
        cadence.setAttribute('data-active', p.getAttribute('data-ring') || '');
        if (coreB) coreB.textContent = p.getAttribute('data-core') || defaultB;
        if (coreS) coreS.textContent = p.getAttribute('data-core-sub') || defaultS;
      }
      function off() {
        p.classList.remove('is-active'); cadence.removeAttribute('data-active');
        if (coreB) coreB.textContent = defaultB; if (coreS) coreS.textContent = defaultS;
      }
      p.addEventListener('mouseenter', on); p.addEventListener('mouseleave', off);
      p.addEventListener('focusin', on); p.addEventListener('focusout', off);
    });
  }

  /* ---------------------------------------------------------------------
     Checks + stamp (standard section)
     --------------------------------------------------------------------- */
  var checks = $$('.checks li'), stamp = $('.stamp');
  if (checks.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        checks.forEach(function (li, i) { setTimeout(function () { li.classList.add('is-in'); }, 120 * i); });
        io.disconnect();
      });
    }, { threshold: 0.4 });
    io.observe(checks[0].parentElement);
  }
  if (stamp && 'IntersectionObserver' in window) {
    var io2 = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { setTimeout(function () { stamp.classList.add('is-in'); }, 500); io2.disconnect(); }
    }, { threshold: 0.5 });
    io2.observe(stamp.parentElement);
  } else if (stamp) { stamp.classList.add('is-in'); }

  /* ---------------------------------------------------------------------
     Bento glow follows the pointer
     --------------------------------------------------------------------- */
  if (fine) {
    $$('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      });
    });
  }

  /* ---------------------------------------------------------------------
     FAQ accordion
     --------------------------------------------------------------------- */
  $$('.faq__item').forEach(function (item) {
    var q = $('.faq__q', item); if (!q) return;
    q.addEventListener('click', function () {
      var open = item.classList.contains('is-open');
      $$('.faq__item.is-open').forEach(function (o) { o.classList.remove('is-open'); $('.faq__q', o).setAttribute('aria-expanded', 'false'); });
      if (!open) { item.classList.add('is-open'); q.setAttribute('aria-expanded', 'true'); }
    });
  });

  /* ---------------------------------------------------------------------
     Magnetic buttons + custom cursor (desktop only)
     --------------------------------------------------------------------- */
  if (fine && !reduced) {
    $$('.btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        b.style.transform = 'translate(' + dx * 0.18 + 'px,' + dy * 0.22 + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });

    var cur = $('.cursor');
    if (cur) {
      var cx = -100, cy = -100, tx = -100, ty = -100, shown = false;
      window.addEventListener('pointermove', function (e) {
        tx = e.clientX; ty = e.clientY;
        if (!shown) { cx = tx; cy = ty; shown = true; cur.classList.add('is-on'); }
      });
      document.addEventListener('pointerleave', function () { cur.classList.add('is-hidden'); });
      document.addEventListener('pointerenter', function () { cur.classList.remove('is-hidden'); });
      document.addEventListener('pointerover', function (e) {
        cur.classList.toggle('is-link', !!e.target.closest('a, button, .prop, .faq__q, select, input, textarea'));
      });
      (function loop() {
        cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
        cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
        requestAnimationFrame(loop);
      })();
    }
  }

  /* ---------------------------------------------------------------------
     Contact form
     - If data-endpoint is set (Formspree, your own API, n8n webhook...),
       POST JSON there. Otherwise, open a prefilled email.
     --------------------------------------------------------------------- */
  var form = $('.form');
  if (form) {
    var status = $('.form__status', form);
    var endpoint = (form.getAttribute('data-endpoint') || '').trim();
    var mailto = (form.getAttribute('data-mailto') || '').trim();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      if (data.website) return; // honeypot
      var btn = $('button[type="submit"]', form);
      if (endpoint) {
        if (status) status.textContent = 'Sending…';
        btn && (btn.disabled = true);
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { if (!r.ok) throw new Error('bad'); form.classList.add('is-sent'); if (status) status.textContent = 'Received. We will reply shortly.'; })
          .catch(function () { if (status) status.textContent = 'Something failed. Email us at ' + mailto; })
          .then(function () { btn && (btn.disabled = false); });
      } else if (mailto) {
        var subject = 'Kuxait — first conversation (' + (data.company || data.name || '') + ')';
        var body = 'Name: ' + (data.name || '') + '\nEmail: ' + (data.email || '') + '\nCompany: ' + (data.company || '') +
          '\nCompany size: ' + (data.size || '') + '\n\nProcess to unlock:\n' + (data.message || '');
        window.location.href = 'mailto:' + mailto + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        if (status) status.textContent = 'Opening your email client…';
      }
    });
  }

  /* ---------------------------------------------------------------------
     Year
     --------------------------------------------------------------------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  if (hasST) { window.addEventListener('load', function () { ScrollTrigger.refresh(); }); }
})();
