/**
 * Tipos del data.ts de un reel. Es el único archivo que se escribe a mano;
 * words.json y captions.json los genera `npm run nuevo`.
 *
 * Todos los tiempos van en FRAMES del máster (25 fps), absolutos.
 */

/** 'didactico': hay que leerlo, o es evidencia real. 'refuerzo': ilustra lo que ya dijo la voz. */
export type Rank = 'didactico' | 'refuerzo';

type SceneBase = {
  key: string;
  from: number;
  to: number;
  /** Línea chica en mayúsculas, color menta, arriba del título. */
  kicker: string;
  /** Título de la tarjeta oscura. Los cortes de línea van con \n. */
  title: string;
};

/** Un número protagonista (5 minutos): reloj de bandas que se vuelve el número. */
export type NumeroScene = SceneBase & {
  kind: 'numero';
  value: string;
  unit: string;
  /** Frame de la palabra que dice el número. */
  at: number;
};

/** Foto, GIF o video del capítulo en la baldosa gris, debajo del título. */
export type MedioScene = SceneBase & {
  kind: 'medio';
  /** Ruta dentro de reels/<CODE>/media/. */
  media: string;
  rank: Rank;
  credit?: string;
  /** Pastilla que aparece junto a un medio vertical, en su frame. */
  note?: {text: string; at: number};
};

/** Dos o tres opciones que aparecen cuando la voz las nombra. */
export type OpcionesScene = SceneBase & {
  kind: 'opciones';
  options: {text: string; at: number; marked?: boolean}[];
};

/** Cierre con llamado a la acción: texto de apoyo y botón menta. */
export type CierreScene = SceneBase & {
  kind: 'cierre';
  supporting: string;
  button: string;
  at: number;
};

export type Scene = NumeroScene | MedioScene | OpcionesScene | CierreScene;

export type Reel = {
  code: string;
  /** Título del capítulo del que sale el reel. */
  title: string;
  series: string;
  fps: 25;
  /** Ruta dentro de reels/<CODE>/media/. */
  master: string;
  /** Las escenas cubren el reel sin huecos ni solapes. */
  scenes: Scene[];
  /** Correcciones de Whisper, por índice de palabra en words.json. */
  captionFix?: Record<number, string>;
};

/** words.json: [texto, desde, hasta) en frames. */
export type Word = [string, number, number];
/** captions.json: una página de subtítulo, con el rango [desde, hasta) de índices de palabra. */
export type CaptionPage = {from: number; to: number; words: [number, number]};
