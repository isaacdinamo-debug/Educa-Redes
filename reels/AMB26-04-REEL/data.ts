/**
 * AMB26-04-REEL · adelanto vertical de «Plan B: protocolo para una inundación».
 *
 * Portado del reel de Remotion (educaplay-redes/remotion/src/data.ts, 16/9/2026):
 * mismas palabras, mismas 31 páginas de subtítulo y mismos beats. Cambian la
 * estética (plataforma Educaplay en vez de tarjeta clara) y los tipos de
 * escena, que ahora son genéricos (numero, medio, opciones, cierre).
 *
 * Máster: 1080×1920, 25 fps, 45,16 s. Es sólo el plató verde de Ambiente, con
 * el logo «Educaplay · Ed. Ambiental» quemado arriba (y < 230): no hay docente
 * en cuadro, el motion graphics es protagonista.
 *
 * Lo que el reel de Remotion tenía y acá cambió, con su motivo:
 *   · «Una inundación. Cualquier hogar.» mantiene el título; el kicker
 *     «EMERGENCIA POR INUNDACIÓN» sale de lo que dice la voz en f189–241.
 *   · El botón del cierre dice Educaplay: la voz nombra la plataforma en f953,
 *     no una URL. La marca se escribe siempre «Educaplay» (E mayúscula, resto
 *     en minúscula); Whisper la transcribió con P mayúscula: captionFix.
 *   · «El Niño» entra en «fenómeno» (f484) y no en «Niño» (f503): ahí le
 *     quedaban 19 frames antes del cambio de escena (piso: 25).
 *   · incertidumbre termina en f666 y no en f664 («sí»): «¿Cuándo?» (f641)
 *     necesita 25 frames. La tarjeta nueva entra igual bajo el barrido.
 */
import type {Reel} from '../../scripts/lib/tipos.ts';

export const REEL: Reel = {
  code: 'AMB26-04-REEL',
  title: 'Plan B: protocolo para una inundación',
  short: 'Plan B',
  series: 'Educación Ambiental Integral',
  fps: 25,
  master: 'media/master.mp4',
  scenes: [
    {
      key: 'cinco-minutos', kind: 'numero', from: 0, to: 97,
      kicker: 'PREPARARSE A TIEMPO', title: 'Tenés que\nsalir de casa.',
      value: '5', unit: 'minutos', at: 65, // «cinco»
      detalle: 'para salir, sin saber\ncuándo volvés.', pie: 'Protocolo ante una inundación',
    },
    {
      key: 'que-llevarias', kind: 'medio', from: 97, to: 189,
      kicker: 'NO SABÉS CUÁNDO VOLVÉS', title: '¿Qué llevarías?',
      media: 'media/recursos/mochila.gif', rank: 'refuerzo',
      pie: 'La mochila de emergencia', fuente: 'Animación del capítulo',
    },
    {
      key: 'cualquier-hogar', kind: 'medio', from: 189, to: 331,
      kicker: 'EMERGENCIA POR INUNDACIÓN', title: 'Una inundación.\nCualquier hogar.',
      media: 'media/recursos/lluvia-original.jpg', rank: 'didactico',
      pie: 'Tormenta eléctrica sobre una ciudad', fuente: 'Imagen del capítulo',
    },
    {
      key: 'lluvias', kind: 'medio', from: 331, to: 522,
      kicker: 'CUANDO LA LLUVIA NO PARA', title: 'Lluvias\nmuy intensas.',
      media: 'media/recursos/rain.mp4', rank: 'refuerzo',
      credit: 'Imágenes ilustrativas',
      note: {text: 'El Niño', at: 484, label: 'EL FENÓMENO'}, // «fenómeno»: en «Niño» (f503) quedaba 0,8 s
    },
    {
      key: 'incertidumbre', kind: 'opciones', from: 522, to: 666, // +2: «¿Cuándo?» (f641) necesita 1 s
      kicker: 'NO TODO SE PUEDE ANTICIPAR', title: 'No podemos\nsaberlo todo.',
      options: [
        {text: '¿Pasará?', at: 613},
        {text: '¿Cuándo?', at: 641},
      ],
    },
    {
      key: 'decision', kind: 'opciones', from: 666, to: 808,
      kicker: 'SÍ PODEMOS DECIDIR', title: 'Cómo nos\nencuentre.',
      options: [
        {text: 'Preparados', at: 751, marked: true},
        {text: 'Improvisando', at: 776},
      ],
    },
    {
      key: 'capitulo-completo', kind: 'cierre', from: 808, to: 1129,
      kicker: 'LA PREPARACIÓN EMPIEZA ANTES', title: 'Elegí estar\npreparado.',
      supporting: 'Mirá el video completo\nen la plataforma.',
      button: 'Educaplay', at: 885, // «mirá»
    },
  ],
  captionFix: {77: 'Educaplay.'}, // Whisper la escribió con P mayúscula
};
