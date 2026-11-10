/* Sonido: musica de concurso + efectos, sintetizados con Web Audio (sin archivos de audio).
   - Musica: loop de 8 compases (C Am F G | C F G C), bajo, bombo, caja, hi-hat, acordes cortados y arpegio.
   - Acierto: campanita (ding-ding). Fallo / sin tiempo: corneta de "incorrecto". Final: fanfarria.
   - Soporte de Web Audio en la STB: TBD (guia 5.2). Si no existe o algo falla, todo queda en silencio y el juego sigue igual.
   - El audio solo arranca tras la primera tecla / clic (politica de autoplay). */
(function (global) {
  'use strict';
  var App = global.App = global.App || {};
  var Ctor = global.AudioContext || global.webkitAudioContext;

  var ctx = null, bus = null, noise = null;
  var enabled = !!Ctor, playing = false, timer = null;
  var step = 0, nextT = 0, tense = false, ducked = false;

  var PROG = [48, 45, 41, 43, 48, 41, 43, 48];     /* raices (midi): C Am F G | C F G C */
  var BASS_PAT = [0, 12, 7, 12];                    /* semitonos sobre la raiz, en los tiempos fuertes */
  var LEAD_A = [0, 1, 2, 3, 2, 1, 2, 3];            /* indices en la escalera de notas del acorde */
  var LEAD_B = [2, 3, 4, 3, 2, 1, 2, 3];            /* relleno en los compases de G */

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function bpm() { return tense ? 152 : 126; }

  function build(c) {
    var comp, lp, hp;
    ctx = c;
    bus = {};
    bus.master = ctx.createGain(); bus.master.gain.value = 0.85;
    comp = ctx.createDynamicsCompressor();
    bus.master.connect(comp); comp.connect(ctx.destination);
    bus.music = ctx.createGain(); bus.music.gain.value = 0.5; bus.music.connect(bus.master);
    bus.sfx = ctx.createGain(); bus.sfx.gain.value = 0.9; bus.sfx.connect(bus.master);
    lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.connect(bus.music); bus.bass = lp;
    lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.connect(bus.music); bus.lead = lp;
    hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000; hp.connect(bus.music); bus.hat = hp;
    lp = ctx.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 1900; lp.Q.value = 0.8; lp.connect(bus.music); bus.snare = lp;
    /* ruido para percusion */
    var len = Math.floor(ctx.sampleRate * 0.5), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), i;
    for (i = 0; i < len; i++) { d[i] = Math.random() * 2 - 1; }
    noise = buf;
  }

  /* envolvente: sube rapido a vol y cae exponencialmente en dur */
  function env(g, t, vol, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.006 + dur);
  }

  function tone(dest, type, f, t, dur, vol, glideTo) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (glideTo) { o.frequency.exponentialRampToValueAtTime(glideTo, t + dur); }
    env(g, t, vol, dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function hit(dest, t, dur, vol) {
    var s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = noise;
    env(g, t, vol, dur);
    s.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.2); s.stop(t + dur + 0.05);
  }

  function kick(t) { tone(bus.music, 'sine', 130, t, 0.16, 0.9, 42); }
  function snare(t) { hit(bus.snare, t, 0.14, 0.7); tone(bus.music, 'triangle', 200, t, 0.08, 0.25, 120); }
  function hat(t) { hit(bus.hat, t, 0.045, 0.35); }

  function playStep(i, t) {
    var bar = Math.floor(i / 8) % 8, s = i % 8, root = PROG[bar], third = (root === 45) ? 3 : 4,
        sd = 60 / bpm() / 2, ladder, pat, idx, note;
    if (s % 2 === 0) { kick(t); tone(bus.bass, 'sawtooth', mtof(root + BASS_PAT[s / 2]), t, sd * 1.7, 0.55); }
    if (s === 2 || s === 6) { snare(t); }
    if (s % 2 === 1) {
      hat(t);
      tone(bus.lead, 'square', mtof(root + 12), t, sd * 0.7, 0.07);
      tone(bus.lead, 'square', mtof(root + 12 + third), t, sd * 0.7, 0.07);
      tone(bus.lead, 'square', mtof(root + 19), t, sd * 0.7, 0.07);
    }
    ladder = [root + 24, root + 24 + third, root + 31, root + 36, root + 36 + third];
    pat = (bar === 3 || bar === 6) ? LEAD_B : LEAD_A;
    idx = pat[s];
    note = ladder[idx];
    tone(bus.lead, 'square', mtof(note), t, sd * 0.9, 0.1);
  }

  function pump() {
    var limit;
    if (!ctx) { return; }
    limit = ctx.currentTime + 0.3;
    if (nextT < ctx.currentTime - 0.1) { nextT = ctx.currentTime + 0.05; }   /* se atraso (pestana dormida): re-sincroniza */
    while (nextT < limit) {
      playStep(step, nextT);
      step = (step + 1) % 64;
      nextT += 60 / bpm() / 2;
    }
  }

  function startMusic() {
    if (playing) { return; }
    playing = true;
    nextT = ctx.currentTime + 0.1;
    pump();
    timer = setInterval(function () { try { pump(); } catch (e) { enabled = false; stopMusic(); } }, 60);
  }
  function stopMusic() { playing = false; if (timer) { clearInterval(timer); timer = null; } }

  /* ---- efectos ---- */
  function bell(f, t, vol) {
    var parts = [[1, 1, 1.4], [2.76, 0.38, 0.8], [5.4, 0.16, 0.45]], i;
    for (i = 0; i < parts.length; i++) { tone(bus.sfx, 'sine', f * parts[i][0], t, parts[i][2], vol * parts[i][1]); }
  }

  function honk(f1, f2, t, dur) {
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o1.type = 'sawtooth'; o2.type = 'square';
    o1.frequency.setValueAtTime(f1, t); o2.frequency.setValueAtTime(f1 * 1.015, t);
    o1.frequency.linearRampToValueAtTime(f2, t + dur); o2.frequency.linearRampToValueAtTime(f2 * 1.015, t + dur);
    lp.type = 'lowpass'; lp.frequency.value = 1300;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.42, t + 0.02);
    g.gain.setValueAtTime(0.42, t + dur - 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(bus.sfx);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }

  function fanfare(t) {
    var notes = [523.25, 659.25, 783.99, 1046.5], at = [0, 0.15, 0.3, 0.45], du = [0.14, 0.14, 0.14, 0.9], lp = ctx.createBiquadFilter(), i;
    lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(bus.sfx);
    for (i = 0; i < notes.length; i++) {
      tone(lp, 'sawtooth', notes[i], t + at[i], du[i], 0.22);
      tone(lp, 'square', notes[i] * 2, t + at[i], du[i], 0.05);
    }
    bell(2093, t + 0.45, 0.3);
  }

  function safe(fn) {
    return function () {
      if (!enabled || !ctx) { return; }
      try { fn.apply(null, arguments); } catch (e) { enabled = false; stopMusic(); }
    };
  }

  function init() {
    try { build(new Ctor()); } catch (e) { enabled = false; }
  }

  App.sound = {
    /* llamar en la primera interaccion (tecla / clic): crea el contexto y arranca la musica */
    unlock: function () {
      if (!enabled) { return; }
      try {
        if (!ctx) { init(); }
        if (ctx && ctx.state === 'suspended' && ctx.resume) { ctx.resume(); }
        if (enabled && ctx) { startMusic(); }
      } catch (e) { enabled = false; }
    },
    correct: safe(function () { var t = ctx.currentTime + 0.02; bell(1568, t, 0.5); bell(2093, t + 0.12, 0.5); bell(2637, t + 0.26, 0.28); }),
    wrong: safe(function () { var t = ctx.currentTime + 0.02; honk(196, 190, t, 0.26); honk(147, 118, t + 0.3, 0.6); }),
    fanfare: safe(function () { fanfare(ctx.currentTime + 0.05); }),
    tension: function (on) { tense = !!on; },
    duck: safe(function (on) { ducked = !!on; bus.music.gain.value = ducked ? 0.12 : 0.5; }),
    suspend: safe(function () { if (ctx.suspend) { ctx.suspend(); } }),
    resume: safe(function () { if (ctx.resume) { ctx.resume(); } }),
    /* solo para pruebas con OfflineAudioContext */
    _test: { build: function (c) { enabled = true; build(c); }, play: function (i, t) { playStep(i, t); }, correct: function (t) { bell(1568, t, 0.5); bell(2093, t + 0.12, 0.5); bell(2637, t + 0.26, 0.28); },
      wrong: function (t) { honk(196, 190, t, 0.26); honk(147, 118, t + 0.3, 0.6); }, fanfare: fanfare }
  };
})(window);
