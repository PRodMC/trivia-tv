/* Totalplay STB - lifecycle.js
   - Standby / wakeup llegan como keycodes inyectados (AI Guide v0.1, seccion 11).
   - R6: BACK/MENU del nivel raiz NO implementan salida propia. rootBack() queda aislado y vacio
     (solo preventDefault) hasta que Totalplay confirme una API de salida oficial.
     No agregar window.close() ni equivalentes. */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var listeners = { standby: [], wakeup: [] };

  function emit(type) {
    var i, list = listeners[type];
    for (i = 0; i < list.length; i++) { list[i](); }
  }

  TP.lifecycle = {
    on: function (type, fn) { if (listeners[type]) { listeners[type].push(fn); } },

    /* Devuelve true si el evento era de ciclo de vida (ya atendido). */
    handlePlatformEvent: function (event) {
      var code = event.keyCode || event.which;
      if (code === TP.keys.CODES.STANDBY) { emit('standby'); return true; }
      if (code === TP.keys.CODES.WAKEUP) { emit('wakeup'); return true; }
      return false;
    },

    /* BACK / MENU en el nivel raiz de la app: intencionalmente vacio (R6). */
    rootBack: function (event) {
      if (event && event.preventDefault) { event.preventDefault(); }
    }
  };
})(window);
