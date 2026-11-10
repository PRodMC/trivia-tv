# Trivia Maratón — Web App para STB Totalplay (POC)

Look de concurso de TV de los 90: escenario con luces y foquitos, neón, destellos en los relojes y conteos.
Esta versión no usa la paleta del DS STB (decisión de diseño); sí respeta R1/R3/R5/R6.

Trivia por turnos, 2 equipos, contrarreloj. Se elige el tipo de trivia al inicio.

## Cómo probarla (R7: siempre con servidor HTTP, nunca file://)
```
cd trivia-tv
python3 -m http.server 8000
# abrir http://localhost:8000
```
Teclado en escritorio: flechas = D-pad, Enter = OK, Backspace = BACK, 1-4 = responder directo.
En STB: D-pad + OK + BACK (461) y teclas numéricas 1-4.

## Reglas del juego
- Cada equipo tiene un banco de tiempo (fijo en 30 s; se cambia en `CFG.BANK_S` de `js/app/game.js`). El reloj solo corre en su turno.
- Los equipos se alternan pregunta por pregunta.
- Acierto: +100 pts (+50 por cada acierto seguido extra, tope +150) y +3 s.
- Fallo: -5 s y se pierde la racha.
- Equipo sin tiempo queda fuera; el otro juega hasta agotar su banco. Gana quien tenga más puntos.
- BACK durante la partida abre la pausa (reloj detenido). Standby también pausa.

## Estructura
```
index.html
css/styles.css                       tokens DS STB, Montserrat local (R1)
fonts/montserrat-{500,600,700}.woff2
js/platform/totalplay/               único lugar con sagem.* (device), teclas, foco, lifecycle, viewport
js/app/questions.js                  banco de preguntas (5 categorías, 41-50 c/u) — agregar categorías aquí
js/ui/fx.js                          destellos, flashes, confeti (solo transform/opacity)
js/app/game.js                       motor de juego (sin DOM)
js/ui/ui.js, js/app/main.js          pantallas y orquestación
```
Agregar una trivia nueva = agregar un objeto a `App.categories` en `questions.js`
(`id`, `name`, `icon`, `desc`, `questions: [[pregunta, correcta, mala1, mala2, mala3], ...]`).

## Preguntas sin repetir
Cada trivia recuerda las preguntas que ya salieron (en localStorage si el STB lo soporta; si no, durante la sesión).
No se repite ninguna hasta agotar todas; al reiniciar el ciclo se conserva como "vista" la mitad más reciente, así que ninguna se repite en al menos ~20 preguntas.

## Pendiente / TBD (no asumido)
- Contenido de preguntas: validarlo con Contenidos antes de producción (las temáticas envejecen).
- Sin audio: autoplay/HTML5 audio en el STB sigue TBD (guía §5.2).
- localStorage (memoria de preguntas vistas) está protegido con try/catch: si el STB no lo soporta, solo recuerda durante la sesión. Sin entrada de texto (nombres de equipo fijos).
- Brillos: son sombras estáticas; solo late la opacidad de capas sueltas. Si el DIW362 se siente pesado, bajar estrellas/confeti en `fx.js`.
- Salida raíz (BACK/MENU en inicio): handler vacío en `lifecycle.js` (R6) hasta que Totalplay defina la política.
- Sin dependencia de red: todo el contenido va empaquetado, por eso no hay manejo de pérdida de red.
- Probado en Chromium a 1920×1080 y 1280×720; falta probar en STB real (idealmente DIW362, el piso de hardware).


## Cambios (ronda 3)
- **Bug 4ª tarjeta:** con mouse, al pasar el cursor el carrusel se desplazaba bajo el puntero y el clic caía en otra tarjeta. Ahora el foco por mouse no mueve el carrusel (`focus.js` manda `source: 'mouse'` y `ui.js` lo ignora). Con control remoto no cambia nada.
- **Reglas obligatorias:** al elegir trivia se pasa por 4 pantallas de regla (`ui.renderRule`, textos generados desde `App.game.CFG`), solo con "Siguiente / Entendido"; BACK retrocede una regla. Al pulsar "Entendido" en la última regla empieza la partida. "Jugar de nuevo" no vuelve a mostrarlas.
- **Sonido (`js/app/sound.js`):** música de concurso en loop, campanita al acertar, corneta al fallar o quedarse sin tiempo, fanfarria al final. Todo sintetizado con Web Audio (sin archivos). Arranca con la primera tecla o clic. **Soporte de Web Audio en la DIW362: TBD**; si no existe, el juego sigue en silencio. La música se acelera cuando el equipo activo tiene 7 s o menos y baja de volumen en pausa.
- **Legibilidad:** sombras de texto más bajas, tipografía de apoyo más grande, texto sin opacidad en equipos inactivos, y fallo en rojo oscuro. Auditoría de contraste sobre 144 textos en todas las pantallas: mínimo 4.5:1 a 1920×1080 y 1280×720.
- **Foquitos** de arriba y abajo eliminados.

## Cambios (ronda 4)
- **Tiempo fijo de 30 s por equipo:** se eliminó la pantalla y las opciones de selección de tiempo. La partida arranca directo al terminar las reglas.
