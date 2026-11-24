/* ==========================================================================
   KUXAIT — field.js
   Hero: a particle field that moves from noise to order to signal.
   Scattered particles (information without structure) are pulled into
   lanes (flows) by a global cycle and locally by the pointer. When order
   is high, a share of the particles light up in the signal color.
   No dependencies. 2D canvas. Pauses when off-screen.
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('field');
  if (!canvas) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ctx = canvas.getContext('2d', { alpha: false });
  var stateEl = document.querySelector('[data-field-state]');
  var stateWrap = document.querySelector('.hero__state');

  /* ---------- simplex noise (2D) ---------- */
  var F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  var grad = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  var perm = new Uint8Array(512), permMod8 = new Uint8Array(512);
  (function seed() {
    var p = new Uint8Array(256), i, j, t, s = 1337;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647; j = s % (i + 1);
      t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (i = 0; i < 512; i++) { perm[i] = p[i & 255]; permMod8[i] = perm[i] % 8; }
  })();
  function noise(x, y) {
    var s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s);
    var t = (i + j) * G2, x0 = x - (i - t), y0 = y - (j - t);
    var i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    var ii = i & 255, jj = j & 255, n = 0, tt, g;
    tt = 0.5 - x0 * x0 - y0 * y0;
    if (tt > 0) { tt *= tt; g = grad[permMod8[ii + perm[jj]]]; n += tt * tt * (g[0] * x0 + g[1] * y0); }
    tt = 0.5 - x1 * x1 - y1 * y1;
    if (tt > 0) { tt *= tt; g = grad[permMod8[ii + i1 + perm[jj + j1]]]; n += tt * tt * (g[0] * x1 + g[1] * y1); }
    tt = 0.5 - x2 * x2 - y2 * y2;
    if (tt > 0) { tt *= tt; g = grad[permMod8[ii + 1 + perm[jj + 1]]]; n += tt * tt * (g[0] * x2 + g[1] * y2); }
    return 70 * n;
  }

  /* ---------- config ---------- */
  var PAPER = '#F3F2ED';
  var INK = 'rgba(12,13,16,0.42)';
  var SIGNAL = 'rgba(30,43,230,0.9)';
  var LANE = 26;          // px between lanes
  var NOISE_SCALE = 0.0022;
  var CYCLE = 18;         // seconds for noise -> order -> signal -> noise
  var POINTER_R = 190;    // px radius of local order around the pointer

  var W = 0, H = 0, DPR = 1, parts = [], N = 0;
  var pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, on: false };
  var t0 = performance.now(), last = t0, running = false, visible = true, raf = 0;
  var globalOrder = 0, lastState = '';

  function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  function resize() {
    var r = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.floor(r.width)); H = Math.max(1, Math.floor(r.height));
    canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var density = window.innerWidth < 760 ? 2600 : 1500;
    N = Math.min(1700, Math.max(260, Math.floor((W * H) / density)));
    parts = [];
    for (var i = 0; i < N; i++) {
      parts.push({
        x: Math.random() * W, y: Math.random() * H, px: 0, py: 0,
        sp: 0.6 + Math.random() * 0.9,
        sig: Math.random() < 0.2,
        ph: Math.random() * Math.PI * 2
      });
      parts[i].px = parts[i].x; parts[i].py = parts[i].y;
    }
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  }

  function orderAt(time) {
    // 0..1 along a cycle: noise, ramp up, hold (signal), ramp down
    var p = (time % CYCLE) / CYCLE;
    if (p < 0.28) return 0;
    if (p < 0.46) return smooth(0.28, 0.46, p);
    if (p < 0.82) return 1;
    return 1 - smooth(0.82, 1, p);
  }

  function setState(o) {
    var s = o < 0.3 ? 'noise' : o < 0.92 ? 'ordering' : 'signal';
    if (s === lastState) return;
    lastState = s;
    if (stateEl) scramble(stateEl, s);
    if (stateWrap) stateWrap.classList.toggle('is-signal', s === 'signal');
  }

  /* text scramble for the state readout */
  var chars = '01▮▯/\\|·';
  function scramble(el, text) {
    var frames = 0, max = 14, out;
    function tick() {
      out = '';
      for (var i = 0; i < text.length; i++) {
        out += frames / max > i / text.length ? text[i] : chars[Math.floor(Math.random() * chars.length)];
      }
      el.textContent = out;
      if (frames++ < max) requestAnimationFrame(tick); else el.textContent = text;
    }
    tick();
  }

  function step(now) {
    if (!running) return;
    raf = requestAnimationFrame(step);
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var time = (now - t0) / 1000;
    var target = orderAt(time);
    globalOrder += (target - globalOrder) * 0.04;
    setState(globalOrder);

    // ease pointer
    pointer.x += (pointer.tx - pointer.x) * 0.12;
    pointer.y += (pointer.ty - pointer.y) * 0.12;

    // trails
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(243,242,237,0.13)';
    ctx.fillRect(0, 0, W, H);

    ctx.lineWidth = 1;
    ctx.lineCap = 'round';

    var inkPath = new Path2D(), sigPath = new Path2D();
    var speed = 60 * dt;
    var drift = time * 0.12;
    var pr2 = POINTER_R * POINTER_R;

    for (var i = 0; i < N; i++) {
      var p = parts[i];
      // chaos velocity from a slowly drifting noise field
      var a = noise(p.x * NOISE_SCALE, p.y * NOISE_SCALE + drift) * Math.PI * 1.6;
      var cvx = Math.cos(a), cvy = Math.sin(a);

      // order velocity: flow along lanes, pulled to nearest lane center
      var laneY = Math.round(p.y / LANE) * LANE + LANE * 0.5;
      var ovx = 1.25, ovy = (laneY - p.y) * 0.12;

      // local order: global cycle + pointer lens
      var o = globalOrder;
      if (pointer.on) {
        var dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < pr2) o = Math.max(o, 1 - Math.sqrt(d2 / pr2));
      }
      var oo = o * o * (3 - 2 * o);

      var vx = cvx + (ovx - cvx) * oo, vy = cvy + (ovy - cvy) * oo;
      p.px = p.x; p.py = p.y;
      p.x += vx * speed * p.sp; p.y += vy * speed * p.sp;

      // wrap
      if (p.x > W + 4) { p.x = -4; p.px = p.x; }
      else if (p.x < -4) { p.x = W + 4; p.px = p.x; }
      if (p.y > H + 4) { p.y = -4; p.py = p.y; }
      else if (p.y < -4) { p.y = H + 4; p.py = p.y; }

      var path = (p.sig && oo > 0.55) ? sigPath : inkPath;
      path.moveTo(p.px, p.py); path.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = INK; ctx.stroke(inkPath);
    ctx.strokeStyle = SIGNAL; ctx.lineWidth = 1.4; ctx.stroke(sigPath);
  }

  function start() { if (running || reduced) return; running = true; last = performance.now(); raf = requestAnimationFrame(step); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  /* ---------- static fallback for reduced motion ---------- */
  function renderStatic() {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 1; ctx.strokeStyle = INK;
    for (var i = 0; i < N; i++) {
      var p = parts[i];
      var o = smooth(0.25, 0.85, p.x / W);
      var a = noise(p.x * NOISE_SCALE, p.y * NOISE_SCALE) * Math.PI * 1.6;
      var laneY = Math.round(p.y / LANE) * LANE + LANE * 0.5;
      var vx = Math.cos(a) + (1.25 - Math.cos(a)) * o, vy = Math.sin(a) + ((laneY - p.y) * 0.12 - Math.sin(a)) * o;
      var len = 8;
      ctx.strokeStyle = (p.sig && o > 0.6) ? SIGNAL : INK;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + vx * len, p.y + vy * len); ctx.stroke();
    }
    if (stateEl) stateEl.textContent = 'signal';
    if (stateWrap) stateWrap.classList.add('is-signal');
  }

  /* ---------- events ---------- */
  var hero = canvas.closest('.hero') || canvas.parentElement;
  hero.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    pointer.tx = e.clientX - r.left; pointer.ty = e.clientY - r.top;
    if (!pointer.on) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
    pointer.on = true;
  });
  hero.addEventListener('pointerleave', function () { pointer.on = false; pointer.tx = -9999; pointer.ty = -9999; });

  var ro = new ResizeObserver(function () { resize(); if (reduced) renderStatic(); });
  ro.observe(canvas);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }, { threshold: 0.02 }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (visible) start();
  });

  resize();
  if (reduced) renderStatic(); else start();
})();
