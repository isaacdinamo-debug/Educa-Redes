/**
 * Utilidades compartidas por los scripts: rutas, argumentos, carga del reel y
 * el escenario 9:16. Node ≥ 22.6 con --experimental-strip-types (data.ts se
 * importa directo).
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const reelDir = (code) => path.join(REPO, 'reels', code);

/**
 * El escenario de un reel. Las coordenadas viven acá y sólo acá: ni el data.ts
 * ni el .jsx escriben posiciones. Medido sobre Instagram Reels, TikTok y
 * YouTube Shorts (la zona más restrictiva de las tres).
 */
export const ESCENARIO = {
  canvas: {width: 1080, height: 1920},
  fps: 25,
  /** Fuera de estas zonas la interfaz de la app tapa: nada crítico ahí. */
  seguro: {top: 280, bottom: 1650, left: 90, right: 940},
  /** Caja de la tarjeta de cada escena. La tarjeta se centra adentro. */
  tarjeta: {x: 90, y: 300, width: 840, height: 760},
  /** Banda de los subtítulos: la pastilla se centra en ella. */
  subtitulos: {x: 90, y: 1090, width: 840, height: 200},
  /** Cuerpo del subtítulo y pastilla (estándar §1.4 adaptado a 9:16). */
  pastilla: {fontSize: 56, lineHeight: 1.32, padX: 40, padY: 16, radius: 22, blur: 10, scrimAlpha: 0.55, maxLines: 2},
  /** Una página de subtítulo: de 1 a 6 palabras, como mucho dos líneas. */
  maxPalabras: 6,
  /** Piso de lectura: una escena dura al menos 2 s y una opción 1 s en pantalla. */
  minEscena: 50,
  minOpcion: 25,
  /**
   * Variante editorial (auditoría del 7/10/2026): una sola página oscura, fija
   * y del mismo tamaño en todas las escenas, y el subtítulo anclado debajo.
   * Usa el alto seguro completo.
   */
  editorial: {
    pagina: {x: 90, y: 300, width: 840, height: 1010},
    margen: 44,
    subtitulos: {x: 90, y: 1390, width: 840, height: 170},
    /** Una página de subtítulo se queda al menos 1 s. */
    pisoSubtitulo: 25,
  },
};

/**
 * La estética de la plataforma Educaplay (colores medidos sobre la web de
 * Corrientes Play). Es la misma del repo EducaPlay-After-Effects; viaja en el
 * manifiesto y el .jsx la vuelca a la capa CONTROL.
 */
export const PALETA = {
  cian: '#5DCBE1', rojo: '#EA3355', amarillo: '#F5C042', verde: '#54B835',
  oscuro: '#3B3B3E', gris: '#F0F0F0', tinta: '#201D2F', menta: '#6CEACB', meta: '#7A7985',
  // Grises de texto sobre la página oscura (variante editorial), del más claro al más tenue.
  claro: '#D9D8DF', suave: '#B4B3BD', tenue: '#A6A5B0',
};
export const FUENTES = {
  titulo: 'MuseoSansRounded-900', numero: 'MuseoSansRounded-1000',
  texto: 'MuseoSansRounded-700', liviana: 'MuseoSansRounded-300',
  /** La marca, como en el logo: Museo 700, «Educaplay». */
  marca: 'Museo-700',
  /** Variante editorial: titulares en la slab del logo; etiquetas y pies en Rounded 500. */
  slab: 'Museo-700', media: 'MuseoSansRounded-500',
};

/**
 * Pagina los subtítulos a partir de las palabras [texto, desde, hasta).
 * Corta en puntuación, en pausas y a las `max` palabras, sin dejar una
 * palabra de enlace («de», «la», «y»…) colgada al final. Con `piso` (frames),
 * ninguna página dura menos: primero se queda hasta que empieza la siguiente
 * y, si aun así no llega, se funde con una vecina (sin pasar de `tope`).
 * `base` permite partir de cortes ya hechos a mano (rangos [desde, hasta)).
 */
const ENLACE = new Set(['a', 'al', 'con', 'de', 'del', 'el', 'en', 'es', 'la', 'las', 'lo', 'los', 'mi', 'no', 'o', 'para', 'por', 'que', 'se', 'si', 'su', 'tu', 'un', 'una', 'y']);
export const paginar = (words, {max = 4, pausa = 8, cola = 6, piso = 0, tope = ESCENARIO.maxPalabras, base = null} = {}) => {
  let ranges = base ? base.map((r) => [...r]) : [];
  let start = 0;
  for (let i = 0; !base && i < words.length; i++) {
    const next = words[i + 1];
    const endsPhrase = /[.,;:!?…]$/.test(words[i][0]);
    const gap = next && next[1] - words[i][2] >= pausa;
    if (!next || endsPhrase || gap) {
      ranges.push([start, i + 1]);
      start = i + 1;
    } else if (i - start + 1 >= max) {
      // Se retrocede el corte mientras termine en una palabra de enlace.
      let cut = i + 1;
      while (cut - 1 > start && ENLACE.has(words[cut - 1][0].toLowerCase())) cut--;
      ranges.push([start, cut]);
      start = cut;
    }
  }
  const timed = (rs) => rs.map(([a, b], k) => {
    const from = words[a][1];
    const end = words[b - 1][2];
    const limit = rs[k + 1] ? words[rs[k + 1][0]][1] : Infinity;
    // Si la siguiente llega enseguida, se queda hasta ahí: sin parpadeo entre páginas.
    const to = limit - end < 12 ? limit : Math.min(Math.max(end + cola, from + piso), limit);
    return {from, to: Number.isFinite(to) ? to : end + cola, words: [a, b]};
  });
  const endsSentence = ([, b]) => /[.!?…]$/.test(words[b - 1][0]);
  const stuck = new Set(); // páginas cortas que no se pueden fundir con nadie
  for (let guard = 0; piso && guard < words.length; guard++) {
    const pages = timed(ranges);
    const k = pages.findIndex((p) => p.to - p.from < piso && !stuck.has(p.words[0]));
    if (k < 0) break;
    const size = (r) => r[1] - r[0];
    const fitsNext = ranges[k + 1] && size(ranges[k]) + size(ranges[k + 1]) <= tope;
    // No se funde hacia atrás cruzando el final de una oración.
    const fitsPrev = ranges[k - 1] && size(ranges[k]) + size(ranges[k - 1]) <= tope && !endsSentence(ranges[k - 1]);
    // Una oración que termina no se pega a la que empieza: mejor a la anterior.
    const withNext = fitsNext && !endsSentence(ranges[k]);
    if (withNext) ranges.splice(k, 2, [ranges[k][0], ranges[k + 1][1]]);
    else if (fitsPrev) ranges.splice(k - 1, 2, [ranges[k - 1][0], ranges[k][1]]);
    else stuck.add(ranges[k][0]);
  }
  return timed(ranges);
};

/** Cómo se escribe la marca, siempre: E mayúscula y el resto en minúscula. */
export const MARCA = 'Educaplay';

export const parseArgs =(argv = process.argv.slice(2)) => {
  const out = {flags: {}, code: null};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const [k, v] = argv[i].slice(2).split('=');
      if (v !== undefined) out.flags[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) out.flags[k] = argv[++i];
      else out.flags[k] = true;
    } else if (!out.code) out.code = argv[i];
  }
  return out;
};

export const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

/** Una línea por elemento: los diffs de words.json y captions.json se leen. */
export const writeJsonLines = (f, arr) =>
  fs.writeFileSync(f, '[' + arr.map((x) => JSON.stringify(x)).join(',\n ') + ']\n');

/** Lee data.ts + words.json + captions.json, con CAPTION_FIX aplicado. */
export const loadReel = async (code) => {
  if (!code) throw new Error('Falta el código del reel (por ejemplo AMB26-04-REEL).');
  const dir = reelDir(code);
  const dataFile = path.join(dir, 'data.ts');
  if (!fs.existsSync(dataFile)) throw new Error(`No existe ${path.relative(REPO, dataFile)}.`);
  const {REEL} = await import(pathToFileURL(dataFile).href);
  if (REEL.code !== code) throw new Error(`data.ts dice code '${REEL.code}' y la carpeta es '${code}'.`);
  const words = readJson(path.join(dir, 'words.json')).map((w) => [...w]);
  for (const [i, t] of Object.entries(REEL.captionFix ?? {})) {
    if (!words[i]) throw new Error(`captionFix: no hay palabra ${i}.`);
    words[i][0] = t;
  }
  const captions = readJson(path.join(dir, 'captions.json'));
  return {REEL, words, captions, dir};
};

/** Medidas de un medio con ffprobe: ancho, alto, duración y cantidad de cuadros. */
export const probe = (file) => {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets',
    '-show_entries', 'stream=width,height,r_frame_rate,nb_read_packets:format=duration', '-of', 'json', file], {encoding: 'utf8'}));
  const s = j.streams[0];
  const [n, d] = s.r_frame_rate.split('/').map(Number);
  return {width: s.width, height: s.height, fps: d ? n / d : 0, frames: Number(s.nb_read_packets), duration: Number(j.format.duration)};
};

export const hasAudio = (file) => execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries',
  'stream=index', '-of', 'csv=p=0', file], {encoding: 'utf8'}).trim() !== '';
