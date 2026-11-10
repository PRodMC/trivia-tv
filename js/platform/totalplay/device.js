/* Totalplay STB - device.js
   Unica capa que toca sagem.*. La UI y la logica de juego NUNCA llaman sagem directamente.
   Solo lectura de modelo/serie; fuera del STB cae a un mock de desarrollo. */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  function hasRuntime() {
    return typeof global.sagem !== 'undefined' && global.sagem !== null;
  }

  function safeGet() {
    if (!hasRuntime()) { return null; }
    try { return global.sagem.Get.apply(global.sagem, arguments); } catch (e) { return null; }
  }

  TP.device = {
    hasRuntime: hasRuntime,
    getModel: function () { return hasRuntime() ? safeGet('WEBSERVICE', 'USER_AGENT') : 'DEV-MOCK'; },
    getSerialNumber: function () { return hasRuntime() ? safeGet('INFO', 'SERIAL_NUMBER') : 'DEV-MOCK-0000'; },
    getSoftwareVersion: function () { return hasRuntime() ? safeGet('INFO', 'SOFTWARE_VERSION') : '0.0.0-dev'; }
  };
})(window);
