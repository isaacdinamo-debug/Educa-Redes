/**
 * check — verificadores de un reel, antes de tocar After Effects.
 *
 *   npm run check -- <CODE>
 *
 * Máster (formato, fps, audio), cobertura de escenas, beats, medios, palabras
 * (a lo sumo una activa por frame), páginas de subtítulo, escenario dentro de
 * las zonas seguras y contraste de los pares de color. Lo que depende de la
 * fuente real (dos líneas, texto que no entra) lo verifica el armado en AE.
 */
import fs from 'node:fs';
import path from 'node:path';
import {ESCENARIO as E, MARCA, PALETA, hasAudio, loadReel, parseArgs, probe, REPO} from './lib/comun.mjs';

const errors = [];
const fail = (m) => errors.push(m);
const ok = (m) => console.log(`✓ ${m}`);

/** Contraste WCAG 2.x entre dos colores #RRGGBB. */
const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** Negro al `alpha` sobre `bg`, como lo compone la pastilla. */
const scrim = (bg, alpha) => '#' + [1, 3, 5].map((i) =>
  Math.round(parseInt(bg.slice(i, i + 2), 16) * (1 - alpha)).toString(16).padStart(2, '0')).join('');

const main = async () => {
  const {code} = parseArgs();
  const {REEL, words, captions, dir} = await loadReel(code);
  const rel = (f) => path.relative(REPO, f);

  // ── máster
  const master = path.join(dir, REEL.master);
  if (!fs.existsSync(master)) throw new Error(`Falta el máster ${rel(master)}.`);
  const m = probe(master);
  const frames = Math.round(m.duration * REEL.fps);
  if (m.width !== E.canvas.width || m.height !== E.canvas.height) fail(`máster ${m.width}×${m.height}, se espera ${E.canvas.width}×${E.canvas.height}`);
  if (Math.abs(m.fps - REEL.fps) > 0.01) fail(`máster a ${m.fps} fps y data.ts dice ${REEL.fps}`);
  if (!hasAudio(master)) fail('el máster no tiene audio');
  ok(`máster ${m.width}×${m.height} · ${m.fps} fps · ${m.duration.toFixed(2)} s = ${frames} frames`);

  // ── escenas: cubren [0, frames) sin huecos ni solapes
  const S = REEL.scenes;
  if (!S.length) throw new Error('data.ts no tiene escenas todavía: escribilas (ver plantillas/data.molde.ts).');
  if (S[0].from !== 0) fail(`la primera escena empieza en ${S[0].from}, no en 0`);
  if (S.at(-1).to !== frames) fail(`la última escena termina en ${S.at(-1).to} y el máster dura ${frames}`);
  const keys = new Set();
  for (let i = 0; i < S.length; i++) {
    const s = S[i];
    const where = `escena ${s.key}`;
    if (keys.has(s.key)) fail(`${where}: key repetida`);
    keys.add(s.key);
    if (i && S[i - 1].to !== s.from) fail(`${where}: empieza en ${s.from} y la anterior termina en ${S[i - 1].to}`);
    if (s.to - s.from < E.minEscena) fail(`${where}: dura ${s.to - s.from} frames (piso ${E.minEscena})`);
    if (!s.kicker || s.kicker !== s.kicker.toUpperCase()) fail(`${where}: el kicker va en mayúsculas`);
    if (s.kicker.length > 34) fail(`${where}: kicker de ${s.kicker.length} caracteres (máximo 34, entra en una línea)`);
    if (s.title.split('\n').length > 3) fail(`${where}: título de más de 3 líneas`);
    const beat = (at, what) => {
      if (!(at >= s.from && at + E.minOpcion <= s.to)) fail(`${where}: ${what} en f${at}, fuera de [${s.from}, ${s.to - E.minOpcion}]`);
    };
    if (s.kind === 'numero') beat(s.at, 'el número');
    else if (s.kind === 'cierre') beat(s.at, 'el botón');
    else if (s.kind === 'opciones') {
      if (s.options.length < 2 || s.options.length > 3) fail(`${where}: van 2 o 3 opciones`);
      s.options.forEach((o, k) => {
        beat(o.at, `«${o.text}»`);
        if (k && o.at < s.options[k - 1].at) fail(`${where}: las opciones van en orden de aparición`);
      });
    } else if (s.kind === 'medio') {
      const f = path.join(dir, s.media);
      if (!fs.existsSync(f)) fail(`${where}: falta ${rel(f)}`);
      else {
        const p = probe(f);
        if (!p.width || !p.height) fail(`${where}: no pude medir ${s.media}`);
      }
      if (!['didactico', 'refuerzo'].includes(s.rank)) fail(`${where}: rank tiene que ser 'didactico' o 'refuerzo'`);
      if (s.note) beat(s.note.at, `la nota «${s.note.text}»`);
    } else fail(`${where}: kind '${s.kind}' desconocido`);
  }
  ok(`${S.length} escenas cubren f0–${frames} sin huecos ni solapes`);

  // ── palabras: ordenadas y a lo sumo una activa por frame
  for (let i = 0; i < words.length; i++) {
    const [t, a, b] = words[i];
    if (!t || /\s/.test(t)) fail(`palabra ${i} «${t}»: vacía o con espacios`);
    if (!(b > a)) fail(`palabra ${i} «${t}»: termina (${b}) antes de empezar (${a})`);
    if (i && a < words[i - 1][2]) fail(`palabras ${i - 1} y ${i} se pisan (f${a}): habría dos resaltadas`);
    if (b > frames) fail(`palabra ${i} «${t}» termina después del máster`);
  }
  ok(`${words.length} palabras, nunca dos activas a la vez`);

  // ── páginas: consecutivas, cada palabra en exactamente una
  let next = 0;
  for (let i = 0; i < captions.length; i++) {
    const p = captions[i];
    const [a, b] = p.words;
    const where = `subtítulo ${i + 1}`;
    if (a !== next) fail(`${where}: arranca en la palabra ${a} y tocaba la ${next}`);
    next = b;
    if (b - a < 1 || b - a > E.maxPalabras) fail(`${where}: ${b - a} palabras (de 1 a ${E.maxPalabras})`);
    if (i && p.from < captions[i - 1].to) fail(`${where}: se pisa con el anterior`);
    if (words[a] && p.from > words[a][1]) fail(`${where}: aparece (f${p.from}) después de su primera palabra (f${words[a][1]})`);
    if (words[b - 1] && p.to < words[b - 1][2]) fail(`${where}: se va (f${p.to}) antes de su última palabra (f${words[b - 1][2]})`);
  }
  if (next !== words.length) fail(`las páginas cubren ${next} de ${words.length} palabras`);
  ok(`${captions.length} páginas de subtítulo, de 1 a ${E.maxPalabras} palabras cada una`);

  // ── la marca: siempre «Educaplay», en los textos de las escenas y en los subtítulos
  const brand = /educa\s*-?\s*play/gi;
  const texts = [
    ...S.flatMap((s) => [['kicker', s.key, s.kicker], ['título', s.key, s.title], ['botón', s.key, s.button],
      ['apoyo', s.key, s.supporting], ['nota', s.key, s.note?.text], ...(s.options ?? []).map((o) => ['opción', s.key, o.text])]),
    ...words.map((w, i) => ['palabra', i, w[0]]),
  ];
  for (const [what, where, str] of texts) {
    for (const m of String(str ?? '').matchAll(brand)) {
      if (m[0] !== MARCA) fail(`${what} ${where}: «${m[0]}» → la marca se escribe «${MARCA}»` +
        (what === 'palabra' ? ` (captionFix: {${where}: '${String(str).replace(m[0], MARCA)}'})` : '') +
        (what === 'kicker' ? ' (el kicker va en mayúsculas: sacá la marca de ahí)' : ''));
    }
  }
  ok(`la marca se escribe «${MARCA}» en todos los textos`);

  // ── escenario: dentro de las zonas seguras y sin cruzarse
  const inSafe = (r) => r.x >= E.seguro.left && r.x + r.width <= E.seguro.right &&
    r.y >= E.seguro.top && r.y + r.height <= E.seguro.bottom;
  if (!inSafe(E.tarjeta)) fail('ESCENARIO.tarjeta sale de las zonas seguras');
  if (!inSafe(E.subtitulos)) fail('ESCENARIO.subtitulos sale de las zonas seguras');
  if (E.tarjeta.y + E.tarjeta.height > E.subtitulos.y) fail('la tarjeta se cruza con los subtítulos');
  ok('tarjeta y subtítulos dentro de las zonas seguras');

  // ── contraste (WCAG AA 4,5:1 para texto; los pares que usa el .jsx)
  const plate = '#22BCA2'; // plató verde de Ambiente, el más claro de los que se usan
  const pairs = [
    ['título blanco / tarjeta oscura', '#FFFFFF', PALETA.oscuro],
    ['kicker menta / tarjeta oscura', PALETA.menta, PALETA.oscuro],
    ['texto tinta / baldosa gris', PALETA.tinta, PALETA.gris],
    ['palabra activa tinta / menta', PALETA.tinta, PALETA.menta],
    ['subtítulo blanco / pastilla sobre el plató', '#FFFFFF', scrim(plate, E.pastilla.scrimAlpha)],
  ];
  for (const [what, fg, bg] of pairs) {
    const r = ratio(fg, bg);
    if (r < 4.5) fail(`contraste ${what}: ${r.toFixed(2)}:1 (piso 4,5:1)`);
    else ok(`contraste ${what}: ${r.toFixed(2)}:1`);
  }

  if (errors.length) {
    console.log(`\n✗ ${errors.length} problema(s):`);
    for (const e of errors) console.log(`   · ${e}`);
    process.exit(1);
  }
  console.log(`\n✓ ${code}: todos los verificadores en verde.`);
};

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
