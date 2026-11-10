/* Motor del juego: logica pura, sin DOM ni sagem. La UI se suscribe a App.game.events.
   Reglas (maraton contrarreloj por turnos, 2 equipos):
   - Cada equipo tiene un banco de tiempo. El reloj corre SOLO en el turno del equipo activo.
   - Los equipos se alternan pregunta por pregunta.
   - Acierto: +100 pts (+50 por cada acierto seguido adicional, tope +150) y +3 s.
   - Fallo: -5 s y se pierde la racha.
   - Un equipo sin tiempo queda fuera; el otro sigue hasta agotar su banco.
   - Gana quien tenga mas puntos cuando ambos bancos llegan a cero. */
(function (global) {
  'use strict';
  var App = global.App = global.App || {};

  var CFG = {
    BONUS_MS: 3000, PENALTY_MS: 5000,
    BASE: 100, STREAK_STEP: 50, STREAK_CAP: 3,
    FEEDBACK_MS: 1300, HANDOFF_S: 2, GUARD_MS: 350, TICK_MS: 100
  };

  var S = null, tickId = null, advanceId = null, handoffId = null, lastTick = 0;
  var events = {};

  function now() { return new Date().getTime(); }

  function shuffle(a) {
    var r = a.slice(), i, j, t;
    for (i = r.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = r[i]; r[i] = r[j]; r[j] = t;
    }
    return r;
  }

  function makeTeam(key, name, bank) {
    return { key: key, name: name, score: 0, time: bank, streak: 0, best: 0, right: 0, wrong: 0, out: false };
  }

  /* Memoria de preguntas ya vistas por categoria (entre partidas). Se guarda en localStorage cuando existe
     (soporte en STB aun TBD, guia 5.2); si falla, queda en memoria durante la sesion. */
  var SEEN_KEY = 'tp-trivia-seen-v1';
  var seenStore = null;

  function loadSeen() {
    var raw = null;
    if (seenStore) { return seenStore; }
    try { raw = global.localStorage.getItem(SEEN_KEY); } catch (e) { raw = null; }
    try { seenStore = raw ? JSON.parse(raw) : {}; } catch (e2) { seenStore = {}; }
    if (!seenStore || typeof seenStore !== 'object') { seenStore = {}; }
    return seenStore;
  }

  function saveSeen() {
    try { global.localStorage.setItem(SEEN_KEY, JSON.stringify(seenStore)); } catch (e) { /* sin persistencia */ }
  }

  function seenFor(cat) {
    var all = loadSeen(), e = all[cat.id];
    if (!e || e.n !== cat.questions.length || !e.seen || e.seen.constructor !== Array) {
      e = all[cat.id] = { n: cat.questions.length, seen: [] };
    }
    return e;
  }

  /* Elige una pregunta que no se haya visto; solo cuando se agotan todas reinicia el ciclo,
     conservando como "vistas" la mitad mas reciente para que ninguna pregunta se repita pronto. */
  function drawIndex(cat) {
    var e = seenFor(cat), unseen = [], i;
    for (i = 0; i < cat.questions.length; i++) { if (e.seen.indexOf(i) === -1) { unseen.push(i); } }
    if (!unseen.length) {
      e.seen = e.seen.slice(-Math.floor(cat.questions.length / 2));
      for (i = 0; i < cat.questions.length; i++) { if (e.seen.indexOf(i) === -1) { unseen.push(i); } }
    }
    i = unseen[Math.floor(Math.random() * unseen.length)];
    e.seen.push(i);
    saveSeen();
    return i;
  }

  function nextQuestion() {
    var raw = S.cat.questions[drawIndex(S.cat)], opts, order, correctText = raw[1];
    order = shuffle([raw[1], raw[2], raw[3], raw[4]]);
    opts = order.slice();
    return { text: raw[0], options: opts, correct: opts.indexOf(correctText) };
  }

  function clearTimers() {
    if (tickId) { clearInterval(tickId); tickId = null; }
    if (advanceId) { clearTimeout(advanceId); advanceId = null; }
    if (handoffId) { clearInterval(handoffId); handoffId = null; }
  }

  function emit(name, a, b) { if (events[name]) { events[name](a, b); } }

  function startPlay() {
    if (handoffId) { clearInterval(handoffId); handoffId = null; }
    S.phase = 'playing';
    S.guardUntil = now() + CFG.GUARD_MS;
    lastTick = now();
    if (tickId) { clearInterval(tickId); }
    tickId = setInterval(tick, CFG.TICK_MS);
    emit('onPlay', S);
  }

  function runHandoff() {
    var count = CFG.HANDOFF_S;
    S.phase = 'handoff';
    emit('onHandoff', S, count);
    if (handoffId) { clearInterval(handoffId); }
    handoffId = setInterval(function () {
      count--;
      if (count <= 0) { startPlay(); } else { emit('onCount', count); }
    }, 1000);
  }

  function beginTurn(withHandoff) {
    S.n++;
    S.q = nextQuestion();
    S.chosen = -1;
    S.timedOut = false;
    emit('onQuestion', S);
    if (withHandoff) { runHandoff(); } else { startPlay(); }
  }

  function settleClock() {
    var t = now(), dt = t - lastTick, team = S.teams[S.active];
    lastTick = t;
    team.time -= dt;
    if (team.time <= 0) {
      team.time = 0; team.out = true; team.streak = 0;
      S.phase = 'feedback'; S.timedOut = true;
      if (tickId) { clearInterval(tickId); tickId = null; }
      emit('onTick', S);
      emit('onTimeout', S);
      advanceId = setTimeout(advance, CFG.FEEDBACK_MS + 500);
      return false;
    }
    return true;
  }

  function tick() {
    if (!S || S.phase !== 'playing') { return; }
    if (settleClock()) { emit('onTick', S); }
  }

  function advance() {
    var other = 1 - S.active, next = -1;
    if (advanceId) { clearTimeout(advanceId); advanceId = null; }
    if (!S.teams[other].out) { next = other; }
    else if (!S.teams[S.active].out) { next = S.active; }
    if (next === -1) { end(); return; }
    var changed = next !== S.active;
    S.active = next;
    beginTurn(changed);
  }

  function end() {
    clearTimers();
    S.phase = 'over';
    emit('onEnd', S);
  }

  var game = {
    CFG: CFG,
    events: events,
    getState: function () { return S; },

    start: function (cat, bankSec) {
      var bank = bankSec * 1000;
      clearTimers();
      S = {
        cat: cat, bank: bank, n: 0, active: 0,
        phase: 'idle', prevPhase: null, q: null, chosen: -1, timedOut: false, guardUntil: 0,
        teams: [makeTeam('a', 'Equipo Rosa', bank), makeTeam('b', 'Equipo Azul', bank)]
      };
      emit('onStart', S);
      beginTurn(true);
    },

    skipHandoff: function () { if (S && S.phase === 'handoff') { startPlay(); } },

    answer: function (i) {
      var team, correct, pts = 0, deltaMs;
      if (!S || S.phase !== 'playing' || now() < S.guardUntil) { return; }
      if (i < 0 || i >= S.q.options.length) { return; }
      if (!settleClock()) { return; }
      team = S.teams[S.active];
      correct = (i === S.q.correct);
      S.chosen = i;
      S.phase = 'feedback';
      if (tickId) { clearInterval(tickId); tickId = null; }
      if (correct) {
        team.streak++;
        if (team.streak > team.best) { team.best = team.streak; }
        pts = CFG.BASE + Math.min(team.streak - 1, CFG.STREAK_CAP) * CFG.STREAK_STEP;
        team.score += pts; team.right++;
        team.time += CFG.BONUS_MS; deltaMs = CFG.BONUS_MS;
      } else {
        team.streak = 0; team.wrong++;
        deltaMs = -Math.min(CFG.PENALTY_MS, team.time);
        team.time = Math.max(0, team.time - CFG.PENALTY_MS);
        if (team.time === 0) { team.out = true; }
      }
      emit('onTick', S);
      emit('onAnswer', S, { correct: correct, pts: pts, deltaMs: deltaMs });
      advanceId = setTimeout(advance, CFG.FEEDBACK_MS);
    },

    pause: function () {
      if (!S || (S.phase !== 'playing' && S.phase !== 'handoff' && S.phase !== 'feedback')) { return false; }
      if (S.phase === 'playing') { settleClock(); }  /* si el tiempo se agota justo ahora, la fase pasa a 'feedback' */
      S.prevPhase = S.phase;
      clearTimers();
      S.phase = 'paused';
      emit('onPause', S);
      return true;
    },

    resume: function () {
      var prev;
      if (!S || S.phase !== 'paused') { return; }
      prev = S.prevPhase;
      emit('onResume', S, prev);
      if (prev === 'playing') { startPlay(); }
      else if (prev === 'handoff') { runHandoff(); }
      else { S.phase = 'feedback'; advance(); }
    },

    /* Descarta la partida (volver al inicio). */
    stop: function () { clearTimers(); S = null; },

    winner: function () {
      var a = S.teams[0], b = S.teams[1];
      if (a.score === b.score) { return -1; }
      return a.score > b.score ? 0 : 1;
    }
  };

  App.game = game;
})(window);
