/* Efectos de concurso: destellos, flashes, confeti y estrellas del escenario.
   R3: todo se anima SOLO con transform / opacity (nada de filter, blur ni backdrop-filter animados).
   Los destellos salen de un pool fijo de elementos reutilizados: no se crean nodos en cada tick. */
(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  var doc = global.document;

  var POOL_SIZE = 32;
  var pool = [], poolIdx = 0, layer = null, flashEl = null;
  var PALETTE = ['#ffe600', '#ffffff', '#00e5ff', '#ff2d95'];
  var CONFETTI = ['#ffe600', '#ff2d95', '#00e5ff', '#7cff3f', '#ff9a1f', '#ffffff'];

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function remPx() { return parseFloat(global.getComputedStyle(doc.documentElement).fontSize) || 16; }
  function reflow(n) { return n.offsetWidth; }

  function init() {
    var i, s, stars, st, size;
    layer = doc.getElementById('fx');
    flashEl = doc.getElementById('flash');
    for (i = 0; i < POOL_SIZE; i++) {
      s = doc.createElement('div');
      s.className = 'spark';
      layer.appendChild(s);
      pool.push(s);
    }
    stars = doc.getElementById('stars');
    for (i = 0; i < 28; i++) {
      st = doc.createElement('i');
      size = rnd(0.2, 0.5);
      st.className = 'twinkle';
      st.style.left = rnd(0, 100) + '%';
      st.style.top = rnd(0, 100) + '%';
      st.style.width = st.style.height = size + 'rem';
      st.style.webkitAnimationDelay = st.style.animationDelay = rnd(0, 3) + 's';
      st.style.webkitAnimationDuration = st.style.animationDuration = rnd(1.6, 3.4) + 's';
      stars.appendChild(st);
    }
  }

  /* un destello en (x, y) px de pantalla */
  function sparkAt(x, y, sizeRem, color, delayMs) {
    var s = pool[poolIdx], px = sizeRem * remPx();
    poolIdx = (poolIdx + 1) % POOL_SIZE;
    s.className = 'spark';
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    s.style.width = px + 'px';
    s.style.height = px + 'px';
    s.style.marginLeft = (-px / 2) + 'px';
    s.style.marginTop = (-px / 2) + 'px';
    s.style.color = color;
    s.style.webkitAnimationDelay = s.style.animationDelay = (delayMs || 0) + 'ms';
    reflow(s);
    s.className = 'spark go';
  }

  /* n destellos repartidos sobre el rectangulo de un elemento */
  function burstAt(el, n, colors, big) {
    var r, i, list = colors || PALETTE;
    if (!el || !layer) { return; }
    r = el.getBoundingClientRect();
    if (!r.width && !r.height) { return; }
    for (i = 0; i < n; i++) {
      sparkAt(r.left + rnd(0, r.width), r.top + rnd(0, r.height),
        big ? rnd(2.4, 4.2) : rnd(1.4, 2.6), pick(list), rnd(0, 260));
    }
  }

  function flash(kind) {
    if (!flashEl) { return; }
    flashEl.className = 'flash flash--' + kind;
    reflow(flashEl);
    flashEl.className = 'flash flash--' + kind + ' go';
  }

  function shake(el) {
    if (!el) { return; }
    el.classList.remove('shake');
    reflow(el);
    el.classList.add('shake');
  }

  function pop(el) {
    if (!el) { return; }
    el.classList.remove('pop');
    reflow(el);
    el.classList.add('pop');
  }

  function popSoft(el) {
    if (!el) { return; }
    el.classList.remove('pop-soft');
    reflow(el);
    el.classList.add('pop-soft');
  }

  function confetti(container, n) {
    var i, c;
    while (container.firstChild) { container.removeChild(container.firstChild); }
    for (i = 0; i < n; i++) {
      c = doc.createElement('i');
      c.className = 'confetto';
      c.style.left = rnd(0, 100) + '%';
      c.style.background = pick(CONFETTI);
      c.style.webkitAnimationDelay = c.style.animationDelay = (-rnd(0, 5)) + 's';
      c.style.webkitAnimationDuration = c.style.animationDuration = rnd(3.2, 5.6) + 's';
      container.appendChild(c);
    }
  }

  App.fx = { init: init, burstAt: burstAt, flash: flash, shake: shake, pop: pop, popSoft: popSoft, confetti: confetti };
})(window);
