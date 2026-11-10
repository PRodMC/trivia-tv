/* Totalplay STB - focus.js
   FocusManager reutilizable: navegacion espacial real con getBoundingClientRect() entre
   elementos [data-focusable] dentro de un "scope" (pantalla o modal).
   - OK activa el handler registrado en data-action (nunca .click() sintetico).
   - Un stack de scopes devuelve el foco al elemento previo al cerrar un modal.
   - Mouse/touch: solo capa extra, protegido con matchMedia('(hover: hover) and (pointer: fine)'). */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};
  var doc = global.document;

  var current = null;
  var scope = null;
  var stack = [];
  var handlers = {};
  var onFocusChange = null;
  var scopeStamp = 0;

  function focusables() {
    var list = [], nodes, i, el;
    if (!scope) { return list; }
    nodes = scope.querySelectorAll('[data-focusable]');
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i];
      if (el.getAttribute('aria-disabled') === 'true') { continue; }
      if (el.offsetWidth === 0 && el.offsetHeight === 0) { continue; }
      list.push(el);
    }
    return list;
  }

  function center(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  /* source: 'mouse' cuando el foco lo mueve el puntero; la UI no debe desplazar nada bajo el cursor */
  function setFocus(el, source) {
    if (!el) { return; }
    if (current && current !== el) { current.classList.remove('is-focused'); }
    current = el;
    el.classList.add('is-focused');
    if (onFocusChange) { onFocusChange(el, source); }
  }

  function clearFocus() {
    if (current) { current.classList.remove('is-focused'); }
    current = null;
  }

  function move(dir) {
    var list = focusables(), i, el, c, cc, dx, dy, primary, perp, score, best = null, bestScore = Infinity;
    if (!list.length) { return; }
    if (!current || list.indexOf(current) === -1) { setFocus(list[0]); return; }
    c = center(current.getBoundingClientRect());
    for (i = 0; i < list.length; i++) {
      el = list[i];
      if (el === current) { continue; }
      cc = center(el.getBoundingClientRect());
      dx = cc.x - c.x; dy = cc.y - c.y;
      if (dir === 'left')  { primary = -dx; perp = Math.abs(dy); }
      if (dir === 'right') { primary = dx;  perp = Math.abs(dy); }
      if (dir === 'up')    { primary = -dy; perp = Math.abs(dx); }
      if (dir === 'down')  { primary = dy;  perp = Math.abs(dx); }
      if (primary <= 1) { continue; }
      if (perp > primary * 2.5 && perp > 40) { continue; }
      score = primary + perp * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) { setFocus(best); }
  }

  function activate() {
    var name, fn;
    if (!current) { return; }
    /* evita activaciones fantasma: OK sostenido o doble pulsacion justo al cambiar de pantalla/modal */
    if (new Date().getTime() - scopeStamp < 300) { return; }
    name = current.getAttribute('data-action');
    fn = handlers[name];
    if (fn) { fn(current); }
  }

  function setScope(root, preferred) {
    var list;
    clearFocus();
    scope = root;
    scopeStamp = new Date().getTime();
    list = focusables();
    setFocus(preferred && list.indexOf(preferred) !== -1 ? preferred : list[0]);
  }

  function pushScope(root, preferred) {
    stack.push({ scope: scope, focus: current });
    setScope(root, preferred);
  }

  function popScope() {
    var prev = stack.pop();
    if (!prev) { return; }
    setScope(prev.scope, prev.focus);
  }

  function enableMouse() {
    if (!global.matchMedia || !global.matchMedia('(hover: hover) and (pointer: fine)').matches) { return; }
    doc.addEventListener('mouseover', function (e) {
      var el = e.target;
      while (el && el !== doc) {
        if (el.hasAttribute && el.hasAttribute('data-focusable')) {
          if (scope && scope.contains(el)) { setFocus(el, 'mouse'); }
          return;
        }
        el = el.parentNode;
      }
    });
    doc.addEventListener('click', function (e) {
      var el = e.target;
      while (el && el !== doc) {
        if (el.hasAttribute && el.hasAttribute('data-focusable')) {
          if (scope && scope.contains(el)) { setFocus(el, 'mouse'); activate(); }
          return;
        }
        el = el.parentNode;
      }
    });
  }

  TP.focus = {
    setFocus: setFocus,
    setScope: setScope,
    pushScope: pushScope,
    popScope: popScope,
    resetStack: function () { stack = []; },
    move: move,
    activate: activate,
    getCurrent: function () { return current; },
    register: function (name, fn) { handlers[name] = fn; },
    onChange: function (fn) { onFocusChange = fn; },
    enableMouse: enableMouse
  };
})(window);
