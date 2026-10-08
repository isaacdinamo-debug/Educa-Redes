/**
 * __CODE__ · <qué capítulo adelanta este reel>
 *
 * Máster: 1080×1920, 25 fps, __FRAMES__ frames. <Qué hay en cuadro: plató,
 * docente, logo quemado y dónde.>
 *
 * Decisiones y excepciones, cada una con su motivo:
 *   · <por ejemplo: «X» entra en «Y» (f123) y no en «Z» porque…>
 *
 * Errores de Whisper corregidos (captionFix): <índice: «mal» → «bien»>
 */
import type {Reel} from '../../scripts/lib/tipos.ts';

export const REEL: Reel = {
  code: '__CODE__',
  title: '<título del capítulo>',
  series: '<serie o materia>',
  fps: 25,
  master: 'media/master.mp4',
  // Las escenas cubren de 0 a __FRAMES__ sin huecos. Cada `at` sale de words.json.
  // Tipos: numero, medio, opciones, cierre (ver scripts/lib/tipos.ts y
  // reels/AMB26-04-REEL/data.ts, el reel de referencia).
  scenes: [
    // {key: 'gancho', kind: 'numero', from: 0, to: 97, kicker: 'KICKER', title: 'Título\nen dos líneas.', value: '5', unit: 'minutos', at: 65},
    // {key: 'recurso', kind: 'medio', from: 97, to: 189, kicker: '…', title: '…', media: 'media/recursos/x.jpg', rank: 'didactico'},
    // {key: 'dilema', kind: 'opciones', from: 189, to: 331, kicker: '…', title: '…', options: [{text: 'A', at: 250, marked: true}, {text: 'B', at: 290}]},
    // {key: 'cierre', kind: 'cierre', from: 331, to: __FRAMES__, kicker: '…', title: '…', supporting: 'Mirá el video completo\nen la plataforma.', button: 'Educaplay', at: 400},
  ],
  captionFix: {},
};
