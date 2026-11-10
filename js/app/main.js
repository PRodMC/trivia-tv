/* Orquestacion: conecta motor, UI, foco y teclas. */
(function (global) {
  'use strict';
  var App = global.App, TP = global.TP, ui = App.ui, game = App.game, snd = App.sound, doc = global.document;

  var route = 'home';          /* home | rules | game | results */
  var settings = { catId: null, rule: 0 };

  function findCat(id) {
    var i;
    for (i = 0; i < App.categories.length; i++) { if (App.categories[i].id === id) { return App.categories[i]; } }
    return null;
  }

  function goHome() {
    game.stop();
    snd.tension(false); snd.duck(false);
    ui.hideAllOverlays();
    route = 'home';
    ui.renderHome(settings.catId);
  }

  /* las reglas son obligatorias: se pasan una por una antes de poder elegir tiempo y jugar */
  function goRules(i) {
    route = 'rules';
    settings.rule = i;
    ui.renderRule(findCat(settings.catId), i);
  }

  function startGame() {
    route = 'game';
    game.start(findCat(settings.catId), game.CFG.BANK_S);
  }

  /* ---- acciones de foco (OK) ---- */
  TP.focus.register('pick-category', function (n) { settings.catId = n.getAttribute('data-id'); goRules(0); });
  TP.focus.register('next-rule', function () { if (settings.rule < ui.rulesCount() - 1) { goRules(settings.rule + 1); } else { startGame(); } });
    TP.focus.register('answer', function (n) { game.answer(parseInt(n.getAttribute('data-i'), 10)); });
  TP.focus.register('start-turn', function () { game.skipHandoff(); });
  TP.focus.register('resume', function () { game.resume(); });
  TP.focus.register('quit', function () { goHome(); });
  TP.focus.register('again', function () { startGame(); });
  TP.focus.register('other', function () { goHome(); });

  /* ---- eventos del motor ---- */
  game.events.onStart = function (S) { ui.hideAllOverlays(); ui.renderGame(S); };
  game.events.onQuestion = function (S) { ui.renderQuestion(S, true); };
  game.events.onHandoff = function (S, count) { ui.updateHud(S); ui.showHandoff(S, count); };
  game.events.onCount = function (n) { ui.setCount(n); };
  game.events.onPlay = function (S) { ui.hideHandoff(); ui.setHidden(false); ui.updateHud(S); };
  game.events.onTick = function (S) {
    var a = S.teams[S.active];
    ui.updateHud(S);
    snd.tension(S.phase === 'playing' && !a.out && a.time <= 7000);   /* la musica se acelera con poco tiempo */
  };
  game.events.onAnswer = function (S, r) {
    ui.revealAnswer(S);
    ui.showDelta(S.active, r.correct ? ('+' + (r.deltaMs / 1000) + ' s') : ('-' + (Math.abs(r.deltaMs) / 1000) + ' s'), r.correct);
    ui.fxAnswer(S, r.correct);
    if (r.correct) { snd.correct(); } else { snd.wrong(); }
  };
  game.events.onTimeout = function (S) { ui.revealAnswer(S); ui.showDelta(S.active, '¡Sin tiempo!', false); ui.fxTimeout(S); snd.wrong(); };
  game.events.onPause = function () { snd.tension(false); snd.duck(true); ui.showPause(); };
  game.events.onResume = function () { snd.duck(false); ui.hidePause(); };
  game.events.onEnd = function (S) {
    route = 'results';
    snd.tension(false); snd.duck(false); snd.fanfare();
    ui.hideAllOverlays();
    ui.renderResults(S, game.winner());
  };

  /* ---- BACK: un nivel atras dentro de la app; en la raiz, handler aislado y vacio (R6) ---- */
  function handleBack(e) {
    if (route === 'game') {
      if (ui.isPauseOpen()) { game.resume(); } else { game.pause(); }
      e.preventDefault();
    } else if (route === 'rules') {
      if (settings.rule > 0) { goRules(settings.rule - 1); } else { goHome(); }
      e.preventDefault();
    } else if (route === 'results') {
      goHome();
      e.preventDefault();
    } else {
      TP.lifecycle.rootBack(e);
    }
  }

  /* ---- ciclo de vida ---- */
  TP.lifecycle.on('standby', function () { if (route === 'game' && !ui.isPauseOpen()) { game.pause(); } snd.suspend(); });
  TP.lifecycle.on('wakeup', function () { snd.resume(); /* la partida queda en pausa; el equipo decide cuando continuar */ });

  /* ---- teclado / control remoto ---- */
  global.addEventListener('keydown', function (e) {
    var k, n;
    snd.unlock();   /* el audio arranca con la primera tecla */
    if (TP.lifecycle.handlePlatformEvent(e)) { e.preventDefault(); return; }
    k = TP.keys.normalize(e);
    if (!k) { return; }
    switch (k) {
      case 'LEFT': TP.focus.move('left'); break;
      case 'RIGHT': TP.focus.move('right'); break;
      case 'UP': TP.focus.move('up'); break;
      case 'DOWN': TP.focus.move('down'); break;
      case 'OK': TP.focus.activate(); break;
      case 'BACK': handleBack(e); break;
      case 'MENU': TP.lifecycle.rootBack(e); break;
      default:
        if (k.indexOf('NUM') === 0 && route === 'game') {
          n = parseInt(k.substr(3), 10);
          if (n >= 1 && n <= 4 && !ui.isPauseOpen()) { game.answer(n - 1); }
        }
        break;
    }
    e.preventDefault();
  }, false);

  doc.addEventListener('click', function () { snd.unlock(); }, false);
  TP.focus.enableMouse();
  App.fx.init();
  ui.renderHome(null);
})(window);
