/**
 * nuevo — prepara un reel nuevo a partir de su máster.
 *
 *   npm run nuevo -- <CODE>              (con reels/<CODE>/media/master.mp4 ya copiado)
 *   npm run nuevo -- <CODE> --forzar     (re-transcribe aunque exista words.json)
 *
 * 1. mide el máster (1080×1920, 25 fps, con audio);
 * 2. transcribe con whisper.cpp, una palabra por segmento (-ml 1): timing por
 *    palabra para el karaoke → words.json [texto, desde, hasta) en frames;
 * 3. pagina los subtítulos: corta en puntuación, en pausas y a las 4 palabras
 *    → captions.json;
 * 4. si no hay data.ts, copia plantillas/data.molde.ts con el código y la
 *    duración ya puestos.
 *
 * Lo que un script no puede hacer queda para vos: leer words.json (Whisper
 * cambia palabras por otras que existen: se corrigen con captionFix) y
 * escribir las escenas con sus beats.
 *
 * Modelo: WHISPER_MODEL, o el del repo EducaPlay-After-Effects
 * (motor/models/ggml-large-v3-turbo.bin), o models/ en este repo.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ESCENARIO, hasAudio, paginar, parseArgs, probe, REPO, reelDir, writeJsonLines} from './lib/comun.mjs';

const findModel = (flag) => {
  const candidates = [flag, process.env.WHISPER_MODEL,
    path.join(os.homedir(), 'Documents/EducaPlay/EducaPlay-After-Effects/motor/models/ggml-large-v3-turbo.bin'),
    path.join(REPO, 'models', 'ggml-large-v3-turbo.bin')].filter(Boolean);
  const m = candidates.find((f) => fs.existsSync(f));
  if (!m) {
    throw new Error('No encontré el modelo de Whisper. Bajalo con:\n  mkdir -p models && curl -L -o models/ggml-large-v3-turbo.bin \\\n' +
      '    https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin');
  }
  return m;
};

const transcribe = (master, model, fps) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'educaplay-whisper-'));
  try {
    const wav = path.join(tmp, 'audio.wav');
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', master, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
    console.log('· transcribiendo (whisper large-v3-turbo, es, una palabra por segmento)…');
    const base = path.join(tmp, 'w');
    execFileSync('whisper-cli', ['-m', model, '-f', wav, '-l', 'es', '-ml', '1', '-sow',
      '--output-json-full', '-of', base], {stdio: 'pipe', maxBuffer: 64 * 1024 * 1024});
    const raw = JSON.parse(fs.readFileSync(`${base}.json`, 'utf8'));
    const words = [];
    for (const seg of raw.transcription) {
      const t = (seg.text ?? '').trim();
      if (!t) continue;
      let a = Math.round((seg.offsets.from / 1000) * fps);
      const b = Math.round((seg.offsets.to / 1000) * fps);
      // Una "palabra" de más de 2 s es atención sobre música: se acorta el inicio.
      if (b - a > 2 * fps) a = b - Math.round(0.6 * fps);
      // Whisper a veces separa la puntuación: se pega a la palabra anterior.
      if (/^[.,;:!?¡¿…)»]+$/.test(t) && words.length) {
        words.at(-1)[0] += t;
        words.at(-1)[2] = Math.max(words.at(-1)[2], b);
        continue;
      }
      words.push([t, a, Math.max(b, a + 1)]);
    }
    // Nunca dos palabras activas: cada una empieza cuando termina la anterior.
    for (let i = 1; i < words.length; i++) {
      if (words[i][1] < words[i - 1][2]) words[i][1] = words[i - 1][2];
      if (words[i][2] <= words[i][1]) words[i][2] = words[i][1] + 1;
    }
    return words;
  } finally {
    fs.rmSync(tmp, {recursive: true, force: true});
  }
};

/** Paginado con piso de 1 s (ver `paginar` en lib/comun.mjs). */
const paginate = (words) => paginar(words, {piso: ESCENARIO.editorial.pisoSubtitulo});

const main = () => {
  const {code, flags} = parseArgs();
  if (!code) throw new Error('Uso: npm run nuevo -- <CODE> [--forzar]');
  const dir = reelDir(code);
  const master = path.join(dir, 'media', 'master.mp4');
  if (!fs.existsSync(master)) {
    throw new Error(`Falta ${path.relative(REPO, master)}.\nCopiá ahí el máster vertical y los recursos en media/recursos/.`);
  }
  const m = probe(master);
  const fps = ESCENARIO.fps;
  const frames = Math.round(m.duration * fps);
  console.log(`· máster ${m.width}×${m.height} · ${m.fps} fps · ${m.duration.toFixed(2)} s = ${frames} frames`);
  if (m.width !== 1080 || m.height !== 1920) throw new Error('El máster tiene que ser 1080×1920.');
  if (Math.abs(m.fps - fps) > 0.01) throw new Error(`El máster va a ${m.fps} fps; los de Educaplay son de ${fps}.`);
  if (!hasAudio(master)) throw new Error('El máster no tiene audio.');

  const wordsFile = path.join(dir, 'words.json');
  if (fs.existsSync(wordsFile) && !flags.forzar) {
    console.log('· words.json ya existe: no se re-transcribe (usá --forzar).');
  } else {
    const words = transcribe(master, findModel(flags.modelo), fps);
    writeJsonLines(wordsFile, words);
    const pages = paginate(words);
    writeJsonLines(path.join(dir, 'captions.json'), pages);
    console.log(`✓ ${words.length} palabras → words.json · ${pages.length} páginas → captions.json`);
  }

  const dataFile = path.join(dir, 'data.ts');
  if (!fs.existsSync(dataFile)) {
    const molde = fs.readFileSync(path.join(REPO, 'plantillas', 'data.molde.ts'), 'utf8');
    fs.writeFileSync(dataFile, molde.replaceAll('__CODE__', code).replaceAll('__FRAMES__', String(frames)));
    console.log(`✓ borrador ${path.relative(REPO, dataFile)}`);
  }

  console.log(`
Lo que falta y ningún script hace:
  1. Leé words.json entero. Whisper cambia palabras por otras que existen:
     corregilas con captionFix en data.ts (por índice), nunca en words.json.
  2. La marca se escribe «Educaplay»: npm run check la exige.
  3. Escribí las escenas en data.ts. Cada beat (at) es el frame de la palabra
     que lo dispara: buscalo en words.json, no lo estimes.
  4. npm run check -- ${code}`);
};

try {
  main();
} catch (e) {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
}
