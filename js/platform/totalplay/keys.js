/* Totalplay STB - keys.js
   Mapa de teclas del control remoto (AI Guide v0.1, seccion 6) y normalizacion de eventos. */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var CODES = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
    OK: 13, BACK: 461, EXIT: 27, CANCEL: 3,
    PLAY: 415, MENU: 462,
    STANDBY: 0x7000001B, WAKEUP: 0x7000001C
  };

  /* Devuelve un nombre de accion: LEFT, UP, RIGHT, DOWN, OK, BACK, MENU, EXIT, STANDBY, WAKEUP, NUM1..NUM9, NUM0 o null.
     Solo en desarrollo de escritorio (sin runtime sagem) se aceptan Backspace/Escape como BACK. */
  function normalize(event) {
    var code = event.keyCode || event.which;
    var name, hasSTB = TP.device && TP.device.hasRuntime();

    for (name in CODES) {
      if (CODES.hasOwnProperty(name) && CODES[name] === code) {
        if (name === 'EXIT' && !hasSTB) { return 'BACK'; }
        return name;
      }
    }
    if (code >= 48 && code <= 57) { return 'NUM' + (code - 48); }
    if (!hasSTB && code === 8) { return 'BACK'; }
    return null;
  }

  TP.keys = { CODES: CODES, normalize: normalize };
})(window);
