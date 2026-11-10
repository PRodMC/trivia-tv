/* UI: construye y actualiza pantallas. Sin sagem.*; solo usa TP.focus, App.fx y App.game (via main.js). */
(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  var TP = global.TP;
  var FX = App.fx;
  var doc = global.document;

  var SAFE_X_REM = 8;   /* debe coincidir con --margin-x en styles.css */

  var ICONS = {
    globe: '<circle cx="24" cy="24" r="18"/><ellipse cx="24" cy="24" rx="8" ry="18"/><path d="M6 24h36M9 14h30M9 34h30"/>',
    star: '<path d="M24 5l5.5 13 13.5 1-10 9.5 3 13.5-12-7-12 7 3-13.5-10-9.5 13.5-1z"/>',
    ball: '<circle cx="24" cy="24" r="18"/><path d="M24 17l7 5-2.5 8h-9L17 22z"/><path d="M24 17V6M31 22l11-3M28.5 30l7 9M19.5 30l-7 9M17 22L6 19"/>',
    music: '<path d="M18 36V10l20-4v26"/><circle cx="12" cy="36" r="6"/><circle cx="32" cy="32" r="6"/>',
    turns: '<path d="M8 17h28M28 9l8 8-8 8M40 31H12M20 23l-8 8 8 8"/>',
    clock: '<circle cx="24" cy="27" r="16"/><path d="M24 27V17M24 27l8 5M19 6h10"/>',
    trophy: '<path d="M14 8h20v10a10 10 0 0 1-20 0zM14 12H6v4a8 8 0 0 0 8 8M34 12h8v4a8 8 0 0 1-8 8M24 28v8M16 41h16"/>',
    atom: '<circle cx="24" cy="24" r="3"/><ellipse cx="24" cy="24" rx="19" ry="8"/><ellipse cx="24" cy="24" rx="19" ry="8" transform="rotate(60 24 24)"/><ellipse cx="24" cy="24" rx="19" ry="8" transform="rotate(120 24 24)"/>'
  };
  var CAT_COLORS = { cultura: '#00e5ff', oscares: '#ffe600', mundial: '#7cff3f', musica: '#ff2d95', ciencia: '#ff9a1f' };
  var TEAM_COLORS = ['#ff2d95', '#00e5ff'];
  var SPARK_GOOD = ['#7cff3f', '#ffe600', '#ffffff'];
  var SPARK_BAD = ['#ff3b3b', '#ffffff', '#ffe600'];
  var SPARK_CLOCK = ['#ffe600', '#ffffff', '#00e5ff'];

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) { n.className = cls; }
    if (text !== undefined && text !== null) { n.textContent = text; }
    return n;
  }
  function byId(id) { return doc.getElementById(id); }
  function clear(n) { while (n.firstChild) { n.removeChild(n.firstChild); } }
  function focusable(n, action) { n.setAttribute('data-focusable', ''); n.setAttribute('data-action', action); return n; }
  function now() { return new Date().getTime(); }

  function fmt(ms) {
    var s = Math.ceil(ms / 1000), m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }
  function setTransform(n, v) { n.style.webkitTransform = v; n.style.transform = v; }

  var ui = { refs: null, timer: null };

  /* detiene los destellos periodicos / confeti de la pantalla anterior */
  ui.stopFx = function () {
    if (ui.timer) { clearInterval(ui.timer); ui.timer = null; }
    var c = byId('confetti');
    if (c && c.parentNode) { c.parentNode.removeChild(c); }
  };

  ui.showScreen = function (id) {
    var list = doc.querySelectorAll('.screen'), i;
    ui.stopFx();
    for (i = 0; i < list.length; i++) { list[i].classList.remove('is-active'); }
    byId(id).classList.add('is-active');
  };

  /* ---------- HOME ---------- */
  ui.renderHome = function (lastId) {
    var root = byId('screen-home'), head, track, wrap, i, c, card, icon, title, preferred = null;
    clear(root);
    ui.showScreen('screen-home');

    head = el('div', 'home__head');
    title = el('h1', 't-display title-retro home__title', 'Trivia Maratón');
    head.appendChild(title);
    head.appendChild(el('p', 't-body is-variant home__sub', 'Dos equipos, un reloj. Respondan por turnos y no dejen que se acabe el tiempo.'));
    root.appendChild(head);
    root.appendChild(el('h2', 't-h2 home__label', 'Elige tu trivia'));

    wrap = el('div', 'carousel');
    track = el('div', 'carousel__track');
    for (i = 0; i < App.categories.length; i++) {
      c = App.categories[i];
      card = focusable(el('div', 'card'), 'pick-category');
      card.setAttribute('data-id', c.id);
      card.style.setProperty('--c', CAT_COLORS[c.id] || '#00e5ff');
      icon = el('div', 'card__icon');
      icon.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true">' + ICONS[c.icon] + '</svg>';
      card.appendChild(icon);
      card.appendChild(el('h3', 't-h2 card__name', c.name));
      card.appendChild(el('p', 't-caption is-variant', c.desc));
      track.appendChild(card);
      if (c.id === lastId) { preferred = card; }
    }
    wrap.appendChild(track);
    root.appendChild(wrap);
    root.appendChild(el('p', 't-caption is-variant home__hint', 'Presiona OK para elegir.'));
    TP.focus.setScope(root, preferred);

    /* destellos periodicos sobre el titulo */
    ui.timer = setInterval(function () { FX.burstAt(title, 3, ['#ffe600', '#ffffff', '#ff2d95'], true); }, 1100);
    FX.burstAt(title, 5, ['#ffe600', '#ffffff', '#ff2d95'], true);
  };

  /* al mover el foco: desplaza el carrusel y lanza un destello corto */
  var lastBurst = 0;
  TP.focus.onChange(function (n, source) {
    var track = n.parentNode, step, last, rootPx, visible, kMax, k, idx, i, t = now(), color;
    if (t - lastBurst > 160) {
      lastBurst = t;
      color = n.getAttribute('data-action') === 'pick-category' ? [CAT_COLORS[n.getAttribute('data-id')] || '#ffffff', '#ffffff'] : null;
      FX.burstAt(n, 2, color || undefined);
    }
    if (source === 'mouse') { return; }   /* con mouse el carrusel no se mueve bajo el cursor */
    if (!track || !track.className || track.className.indexOf('carousel__track') === -1) { return; }
    /* desplazamiento por pasos de una tarjeta: nunca queda una tarjeta cortada a la izquierda */
    step = track.children.length > 1 ? track.children[1].offsetLeft - track.children[0].offsetLeft : n.offsetWidth;
    last = track.children[track.children.length - 1];
    rootPx = parseFloat(global.getComputedStyle(doc.documentElement).fontSize) || 16;
    visible = track.clientWidth - SAFE_X_REM * rootPx;       /* hasta el margen derecho */
    kMax = Math.max(0, Math.ceil((last.offsetLeft + last.offsetWidth - visible) / step));
    for (i = 0; i < track.children.length; i++) { if (track.children[i] === n) { idx = i; } }
    k = Math.min(kMax, Math.max(0, idx - 1));
    setTransform(track, 'translateX(' + (-k * step) + 'px)');
  });

  /* ---------- REGLAS (obligatorias, una por una) ---------- */
  function rulesData() {
    var C = App.game.CFG, bonusCap = C.STREAK_STEP * C.STREAK_CAP;
    return [
      { icon: 'turns', color: '#ff2d95', title: 'Turnos alternados',
        text: 'Cada equipo responde una pregunta y le pasa el control al otro.' },
      { icon: 'clock', color: '#00e5ff', title: 'El reloj manda',
        text: 'Cada equipo tiene su propio banco de tiempo, y solo corre en su turno. Si el tiempo de un equipo se acaba, queda fuera.' },
      { icon: 'star', color: '#ffe600', title: 'Acierta y suma',
        text: 'Cada acierto da +' + C.BASE + ' puntos y +' + (C.BONUS_MS / 1000) + ' segundos. Los aciertos seguidos suman hasta +' + bonusCap + ' puntos de bono.' },
      { icon: 'trophy', color: '#7cff3f', title: 'Falla y pierdes tiempo',
        text: 'Cada fallo resta ' + (C.PENALTY_MS / 1000) + ' segundos y rompe la racha. Cuando se acaba el tiempo de los dos, gana quien tenga más puntos.' }
    ];
  }
  ui.rulesCount = function () { return rulesData().length; };

  ui.renderRule = function (cat, idx) {
    var root = byId('screen-rules'), list = rulesData(), r = list[idx], last = (idx === list.length - 1),
        card, icon, body, dots, i, d, btn, wrap;
    clear(root);
    ui.showScreen('screen-rules');

    root.appendChild(el('p', 't-body-s is-variant rules__cat', 'Reglas · ' + cat.name));
    card = el('div', 'rule-card');
    card.style.setProperty('--c', r.color);
    icon = el('div', 'rule-card__icon');
    icon.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true">' + ICONS[r.icon] + '</svg>';
    body = el('div', 'rule-card__body');
    body.appendChild(el('p', 't-h2 rule-card__step', 'Regla ' + (idx + 1) + ' de ' + list.length));
    body.appendChild(el('h1', 't-display rule-card__title', r.title));
    body.appendChild(el('p', 'rule-card__text', r.text));
    card.appendChild(icon); card.appendChild(body);
    root.appendChild(card);

    dots = el('div', 'dots');
    for (i = 0; i < list.length; i++) {
      d = el('i', 'dots__d' + (i < idx ? ' is-done' : '') + (i === idx ? ' is-now' : ''));
      d.style.setProperty('--c', list[i].color);
      dots.appendChild(d);
    }
    root.appendChild(dots);

    wrap = el('div', 'rules__go');
    btn = focusable(el('div', 'btn btn--cta', last ? 'Entendido' : 'Siguiente'), 'next-rule');
    wrap.appendChild(btn);
    root.appendChild(wrap);
    TP.focus.setScope(root, btn);
    FX.popSoft(card);
    FX.burstAt(icon, 6, [r.color, '#ffffff', '#ffe600'], true);
  };

  /* ---------- SETUP (tiempo por equipo) ---------- */
  ui.renderSetup = function (cat, bankSec) {
    var root = byId('screen-setup'), chips, chip, secs = [20, 40, 60], i, go, ctaEl, box;
    clear(root);
    ui.showScreen('screen-setup');

    box = el('div', 'setup__box');
    box.appendChild(el('h1', 't-display title-retro setup__title', cat.name));
    box.appendChild(el('p', 't-body is-variant setup__sub', 'Ya conocen las reglas. Solo falta elegir cuánto tiempo tendrá cada equipo.'));
    box.appendChild(el('h2', 't-h2 setup__label', 'Tiempo por equipo'));
    chips = el('div', 'chips');
    for (i = 0; i < secs.length; i++) {
      chip = focusable(el('div', 'btn btn--chip' + (secs[i] === bankSec ? ' is-selected' : ''), secs[i] + ' s'), 'set-bank');
      chip.setAttribute('data-sec', String(secs[i]));
      chips.appendChild(chip);
    }
    box.appendChild(chips);
    go = el('div', 'setup__go');
    ctaEl = focusable(el('div', 'btn btn--cta', 'Comenzar'), 'start');
    go.appendChild(ctaEl);
    box.appendChild(go);
    root.appendChild(box);
    TP.focus.setScope(root, ctaEl);
  };

  ui.markBank = function (sec) {
    var list = byId('screen-setup').querySelectorAll('[data-action="set-bank"]'), i;
    for (i = 0; i < list.length; i++) {
      if (parseInt(list[i].getAttribute('data-sec'), 10) === sec) { list[i].classList.add('is-selected'); }
      else { list[i].classList.remove('is-selected'); }
    }
  };

  /* ---------- JUEGO ---------- */
  function buildTeam(t) {
    var r = { root: el('div', 'team team--' + t.key), lastSec: null }, top = el('div', 'team__top'), mid = el('div', 'team__mid'), bar = el('div', 'team__bar');
    top.appendChild(el('span', 'team__dot'));
    top.appendChild(el('span', 't-body-s team__name', t.name));
    r.streak = el('span', 'team__streak t-caption', '');
    top.appendChild(r.streak);
    r.clock = el('span', 'team__clock');
    r.time = el('span', 'team__time', '');
    r.clock.appendChild(r.time);
    r.score = el('span', 'team__score', '');
    mid.appendChild(r.clock); mid.appendChild(r.score);
    r.fill = el('div', 'team__fill');
    bar.appendChild(r.fill);
    r.delta = el('div', 'team__delta', '');
    r.root.appendChild(top); r.root.appendChild(mid); r.root.appendChild(bar); r.root.appendChild(r.delta);
    return r;
  }

  ui.renderGame = function (S) {
    var root = byId('screen-game'), hud, center, i, refs = { teams: [], opts: [] };
    clear(root);
    ui.showScreen('screen-game');
    hud = el('div', 'hud');
    refs.teams[0] = buildTeam(S.teams[0]);
    refs.teams[1] = buildTeam(S.teams[1]);
    center = el('div', 'hud__center');
    refs.qnum = el('p', 't-h2 neon-yellow', '');
    refs.cat = el('p', 't-caption is-variant', S.cat.name);
    center.appendChild(refs.qnum); center.appendChild(refs.cat);
    hud.appendChild(refs.teams[0].root); hud.appendChild(center); hud.appendChild(refs.teams[1].root);
    root.appendChild(hud);
    refs.question = el('div', 'question');
    refs.qtext = el('p', 't-h1', '');
    refs.question.appendChild(refs.qtext);
    root.appendChild(refs.question);
    refs.optsWrap = el('div', 'options');
    root.appendChild(refs.optsWrap);
    ui.refs = refs;
    for (i = 0; i < 2; i++) { ui.updateTeam(S, i); }
  };

  ui.renderQuestion = function (S, hidden) {
    var refs = ui.refs, i, o, num;
    refs.qnum.textContent = 'Pregunta ' + S.n;
    refs.qtext.textContent = S.q.text;
    clear(refs.optsWrap);
    refs.opts = [];
    for (i = 0; i < S.q.options.length; i++) {
      o = focusable(el('div', 'opt opt--' + i), 'answer');
      o.setAttribute('data-i', String(i));
      num = el('span', 'opt__num', String(i + 1));
      o.appendChild(num);
      o.appendChild(doc.createTextNode(S.q.options[i]));
      refs.optsWrap.appendChild(o);
      refs.opts.push(o);
    }
    ui.setHidden(hidden);
    TP.focus.setScope(byId('screen-game'), refs.opts[0]);
    ui.updateHud(S);
  };

  ui.setHidden = function (hidden) {
    var refs = ui.refs, fn = hidden ? 'add' : 'remove';
    refs.question.classList[fn]('is-hidden');
    refs.optsWrap.classList[fn]('is-hidden');
  };

  ui.updateTeam = function (S, i) {
    var t = S.teams[i], r = ui.refs.teams[i], active = (S.active === i && S.phase !== 'over'), secs = Math.ceil(t.time / 1000), low;
    low = active && !t.out && t.time <= 7000;
    r.time.textContent = fmt(t.time);
    r.score.textContent = t.score + ' pts';
    r.streak.textContent = t.streak >= 2 ? 'Racha x' + t.streak : (t.out ? 'Sin tiempo' : '');
    setTransform(r.fill, 'scaleX(' + Math.max(0, Math.min(1, t.time / S.bank)) + ')');
    r.root.className = 'team team--' + t.key + (active ? ' is-active' : '');
    r.time.className = 'team__time' + (low ? ' is-low' : '');
    /* destellos en el conteo: uno por cada segundo que baja; mas fuertes en los ultimos segundos */
    if (active && S.phase === 'playing' && r.lastSec !== null && secs < r.lastSec) {
      if (low) { FX.burstAt(r.clock, 4, SPARK_BAD, true); } else { FX.burstAt(r.clock, 2, SPARK_CLOCK); }
    }
    r.lastSec = secs;
  };

  ui.updateHud = function (S) { ui.updateTeam(S, 0); ui.updateTeam(S, 1); };

  ui.showDelta = function (i, text, good) {
    var d = ui.refs.teams[i].delta;
    d.className = 'team__delta ' + (good ? 'is-good' : 'is-bad');
    d.textContent = text;
    void d.offsetWidth;
    d.className += ' is-show';
  };

  ui.revealAnswer = function (S) {
    var refs = ui.refs;
    refs.opts[S.q.correct].classList.add('is-correct');
    if (S.chosen > -1 && S.chosen !== S.q.correct) { refs.opts[S.chosen].classList.add('is-wrong'); }
  };

  /* efectos de respuesta */
  ui.fxAnswer = function (S, correct) {
    var refs = ui.refs;
    FX.flash(correct ? 'good' : 'bad');
    if (correct) {
      FX.burstAt(refs.opts[S.chosen], 10, SPARK_GOOD, true);
      FX.burstAt(refs.teams[S.active].clock, 7, SPARK_GOOD, true);
      FX.burstAt(refs.teams[S.active].score, 4, SPARK_CLOCK);
    } else {
      FX.shake(refs.question);
      FX.burstAt(refs.opts[S.chosen], 6, SPARK_BAD);
    }
  };
  ui.fxTimeout = function (S) {
    FX.flash('bad');
    FX.burstAt(ui.refs.teams[S.active].clock, 8, SPARK_BAD, true);
  };

  /* ---------- OVERLAYS ---------- */
  ui.showHandoff = function (S, count) {
    var root = byId('overlay-turn'), m = el('div', 'modal'), name, btn, tcolor = TEAM_COLORS[S.active];
    /* al reanudar tras una pausa el modal sigue abierto: solo se reinicia la cuenta */
    if (root.classList.contains('is-active')) { ui.setCount(count); return; }
    clear(root);
    name = el('h2', 't-display modal__title ' + (S.active === 0 ? 'neon-pink' : 'neon-cyan'), S.teams[S.active].name);
    m.appendChild(el('p', 't-body-s is-variant', 'TURNO DE'));
    m.appendChild(name);
    ui.refs.count = el('span', 't-display modal__count neon-yellow', String(count));
    m.appendChild(ui.refs.count);
    btn = focusable(el('div', 'btn btn--cta', 'Empezar'), 'start-turn');
    m.appendChild(btn);
    root.appendChild(m);
    root.classList.add('is-active');
    TP.focus.pushScope(root, btn);
    FX.pop(ui.refs.count);
    FX.burstAt(m, 8, [tcolor, '#ffffff', '#ffe600'], true);
  };
  ui.setCount = function (n) {
    if (ui.refs && ui.refs.count) {
      ui.refs.count.textContent = String(n);
      FX.pop(ui.refs.count);
      FX.burstAt(ui.refs.count, 7, ['#ffe600', '#ffffff', '#ff2d95', '#00e5ff'], true);
    }
  };
  ui.hideHandoff = function () {
    var root = byId('overlay-turn');
    if (!root.classList.contains('is-active')) { return false; }
    root.classList.remove('is-active');
    TP.focus.popScope();
    return true;
  };

  ui.showPause = function () {
    var root = byId('overlay-pause'), m = el('div', 'modal'), acts = el('div', 'modal__actions'), a, b;
    clear(root);
    m.appendChild(el('h2', 't-display neon-cyan modal__title modal__title--sm', 'Juego en pausa'));
    m.appendChild(el('p', 't-body is-variant', 'El reloj está detenido.'));
    a = focusable(el('div', 'btn btn--cta', 'Continuar'), 'resume');
    b = focusable(el('div', 'btn', 'Volver al inicio'), 'quit');
    acts.appendChild(a); acts.appendChild(b);
    m.appendChild(acts);
    root.appendChild(m);
    root.classList.add('is-active');
    TP.focus.pushScope(root, a);
  };
  ui.hidePause = function () {
    var root = byId('overlay-pause');
    if (!root.classList.contains('is-active')) { return false; }
    root.classList.remove('is-active');
    TP.focus.popScope();
    return true;
  };
  ui.isPauseOpen = function () { return byId('overlay-pause').classList.contains('is-active'); };

  ui.hideAllOverlays = function () {
    byId('overlay-turn').classList.remove('is-active');
    byId('overlay-pause').classList.remove('is-active');
    TP.focus.resetStack();
  };

  /* ---------- RESULTADOS ---------- */
  ui.renderResults = function (S, winner) {
    var root = byId('screen-results'), title, teams, i, t, card, acts, again, other, text, cards = [], conf;
    clear(root);
    ui.showScreen('screen-results');
    conf = el('div', '');
    conf.id = 'confetti';
    root.appendChild(conf);
    FX.confetti(conf, 24);

    if (winner === -1) { text = '¡Empate!'; } else { text = '¡Gana ' + S.teams[winner].name + '!'; }
    title = el('h1', 't-display title-retro results__title', text);
    root.appendChild(title);
    teams = el('div', 'results__teams');
    for (i = 0; i < 2; i++) {
      t = S.teams[i];
      card = el('div', 'res res--' + t.key + (winner === i ? ' is-winner' : ''));
      card.appendChild(el('p', 't-body-s res__name', t.name));
      card.appendChild(el('p', 't-display res__score', t.score + ' pts'));
      card.appendChild(el('p', 't-body res__stats', 'Aciertos ' + t.right + '  ·  Fallos ' + t.wrong));
      card.appendChild(el('p', 't-body res__stats', 'Mejor racha ' + t.best));
      teams.appendChild(card);
      cards.push(card);
    }
    root.appendChild(teams);
    acts = el('div', 'results__actions');
    again = focusable(el('div', 'btn btn--cta', 'Jugar de nuevo'), 'again');
    other = focusable(el('div', 'btn', 'Elegir otra trivia'), 'other');
    acts.appendChild(again); acts.appendChild(other);
    root.appendChild(acts);
    TP.focus.setScope(root, again);

    function celebrate() {
      var k;
      FX.burstAt(title, 4, ['#ffe600', '#ffffff', '#ff2d95'], true);
      if (winner === -1) { for (k = 0; k < 2; k++) { FX.burstAt(cards[k], 3, ['#ffe600', '#ffffff'], true); } }
      else { FX.burstAt(cards[winner], 6, ['#ffe600', '#ffffff', TEAM_COLORS[winner]], true); }
    }
    celebrate();
    ui.timer = setInterval(celebrate, 700);
  };

  App.ui = ui;
})(window);
