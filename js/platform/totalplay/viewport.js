/* Totalplay STB - viewport.js
   Layout fluido (R5): 1rem = 16px a 1920x1080; escala con el menor de vw/120 y vh/67.5.
   La resolucion es fija durante la sesion en STB, asi que el calculo es de una sola vez al cargar. */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  function fit() {
    var w = global.innerWidth || global.document.documentElement.clientWidth;
    var h = global.innerHeight || global.document.documentElement.clientHeight;
    var unit = Math.min(w / 120, h / 67.5);
    global.document.documentElement.style.fontSize = unit + 'px';
  }

  fit();
  global.addEventListener('resize', fit);
  TP.viewport = { fit: fit };
})(window);
