/**
 * ae/run.mjs — arma un reel en After Effects, saca stills y lo verifica.
 *
 *   npm run ae -- <CODE>                          (desde la raíz del repo)
 *   npm run ae -- <CODE> --frames 60,420          (stills en esos frames)
 *   npm run ae -- <CODE> --forzar                 (cierra aunque haya otro proyecto)
 *   npm run ae -- <CODE> --editorial              (variante editorial: manifest.editorial.json,
 *                                                  <CODE>-editorial.aep y revision-editorial/)
 *
 *   1. abre After Effects si no está corriendo y espera a que acepte scripts;
 *   2. cierra el proyecto abierto SIN guardar sólo si lo generó este flujo
 *      (su archivo empieza con <CODE>); si hay otro trabajo abierto, aborta;
 *   3. evalúa ae/build-reel.jsx con el manifiesto de reels/<CODE>/ y
 *      guarda reels/<CODE>/<CODE>.aep;
 *   4. vuelca el LOG del armado a reels/<CODE>/revision/log.txt;
 *   5. pide los stills (saveFrameToPng es ASÍNCRONO: se espera a que existan)
 *      y arma la hoja de contacto revision/contacto.jpg;
 *   6. chequea: sin ⚠ ni ✗ en el LOG, .aep guardado, cantidad de escenas, de
 *      subtítulos y de palabras con karaoke igual a la del manifiesto, todos
 *      los stills presentes.
 *
 * Sale con código 1 si algo no pasa. `npm run publicar` depende de eso.
 *
 * AE se maneja con AppleScript: `DoScript "$.evalFile(…)"`. `DoScript` siempre
 * devuelve "0", así que lo que hay que leer de vuelta se escribe a un archivo
 * temporal. Con `DoScriptFile` esas escrituras fallan en silencio (el archivo
 * queda en 0 bytes), por eso no se usa.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AE_DIR = path.join(REPO, 'ae');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const args = (() => {
  const out = {flags: {}, code: null};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) {
      const [k, v] = a[i].slice(2).split('=');
      if (v !== undefined) out.flags[k] = v;
      else if (a[i + 1] && !a[i + 1].startsWith('--')) out.flags[k] = a[++i];
      else out.flags[k] = true;
    } else if (!out.code) out.code = a[i];
  }
  return out;
})();

/** La versión de After Effects más nueva instalada, o AE_APP. */
const aeApp = () => {
  if (process.env.AE_APP) return process.env.AE_APP;
  const apps = fs.readdirSync('/Applications').filter((f) => /^Adobe After Effects 20\d\d$/.test(f)).sort();
  if (!apps.length) throw new Error('No encontré After Effects en /Applications (definí AE_APP).');
  return apps[apps.length - 1];
};

const applescriptStr = (s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

/** Corre un .jsx en AE. El código se escribe a un archivo: sin escapar a mano. */
const runJsx = (app, code, tmpDir) => {
  const f = path.join(tmpDir, `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}.jsx`);
  fs.writeFileSync(f, code, 'utf8');
  try {
    // DoScript + $.evalFile, NO DoScriptFile: con DoScriptFile, AE no deja que
    // el script escriba archivos (quedan en 0 bytes); evaluado desde DoScript sí.
    const call = `$.evalFile(File(${JSON.stringify(f)}))`;
    execFileSync('osascript', ['-e', `tell application ${applescriptStr(app)} to DoScript ${applescriptStr(call)}`], {stdio: 'pipe'});
  } finally {
    fs.rmSync(f, {force: true});
  }
};

const js = (v) => JSON.stringify(v);

/** Espera a que AE acepte scripts; lo abre si hace falta. */
const ensureAE = async (app, tmpDir) => {
  const probe = path.join(tmpDir, 'ae-ok.txt');
  fs.rmSync(probe, {force: true});
  const ping = `var f=new File(${js(probe)});f.open('w');f.write(app.version);f.close();`;
  try {
    runJsx(app, ping, tmpDir);
  } catch {
    console.log(`· abriendo ${app}…`);
    execFileSync('open', ['-a', app]);
    for (let i = 0; i < 60; i++) {
      await sleep(3000);
      try {
        runJsx(app, ping, tmpDir);
        break;
      } catch { /* todavía arrancando */ }
    }
  }
  if (!fs.existsSync(probe)) throw new Error(`${app} no responde a scripts.`);
  console.log(`· ${app} ${fs.readFileSync(probe, 'utf8')} listo`);
  fs.rmSync(probe, {force: true});
};

/** Cierra el proyecto abierto sólo si es de este flujo o está vacío. */
const closeOwnProject = (app, code, tmpDir, force) => {
  const st = path.join(tmpDir, 'ae-proyecto.txt');
  runJsx(app, `
    var r='VACIO';
    if (app.project) {
      var f=app.project.file;
      if (f && f.name.indexOf(${js(code)})===0) r='PROPIO';
      else if (app.project.numItems>0) r='AJENO:'+(f?f.fsName:'(sin guardar)');
    }
    var o=new File(${js(st)});o.encoding='UTF-8';o.open('w');o.write(r);o.close();
    if (r==='PROPIO' || r==='VACIO' || ${force ? 'true' : 'false'}) {
      if (app.project) app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
    }`, tmpDir);
  const r = fs.readFileSync(st, 'utf8');
  fs.rmSync(st, {force: true});
  if (r.startsWith('AJENO') && !force) {
    throw new Error(`Hay otro proyecto abierto en AE (${r.slice(6)}). Guardalo y cerralo, o usá --forzar.`);
  }
};

/**
 * Frames de revisión: uno por escena, con todo ya en pantalla (40 frames
 * después de entrar, o 20 después de su último beat) y, si se puede, en medio
 * de una palabra, para ver el karaoke. Más uno en pleno barrido de bandas.
 */
const defaultFrames = (M) => {
  const words = M.captions.flatMap((c) => c.words);
  const out = M.scenes.map((s) => {
    const beats = [s.at, s.note?.at, ...(s.options ?? []).map((o) => o.at)].filter((x) => x !== undefined);
    // Nunca en los últimos 12 cuadros: ahí la escena ya se está yendo.
    const target = Math.min(Math.max(s.from + 40, ...beats.map((b) => b + 20)), s.to - 12);
    // La primera palabra desde ahí, con la tarjeta todavía entera en pantalla.
    let best = target, dist = Infinity;
    for (const [, a, b] of words) {
      const mid = Math.floor((a + b) / 2);
      if (mid < target || mid >= s.to - 12) continue;
      if (Math.abs(mid - target) < dist) { dist = Math.abs(mid - target); best = mid; }
    }
    return dist <= 25 ? best : target;
  });
  if (M.scenes[1]) out.push(M.scenes[1].from + 1);
  return [...new Set(out)].sort((a, b) => a - b);
};

const waitFiles = async (files, timeoutMs) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (files.every((f) => fs.existsSync(f) && fs.statSync(f).size > 0)) {
      await sleep(1500); // que termine de escribir el último
      return true;
    }
    await sleep(1000);
  }
  return false;
};

const contactSheet = (pngs, out) => {
  const cols = 4, w = 360, h = 640;
  const n = pngs.length;
  const inputs = pngs.flatMap((p) => ['-i', p]);
  const scaled = pngs.map((_, i) => `[${i}]scale=${w}:${h}[v${i}]`).join(';');
  const layout = pngs.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join('|');
  const filter = n === 1 ? `[0]scale=${w}:${h}` :
    `${scaled};${pngs.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${n}:layout=${layout}:fill=black`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-frames:v', '1', '-q:v', '4', out]);
};

const build = async (app, code, M, frames, revDir, tmpDir, force, manifestPath) => {
  const problems = [];
  const aep = path.join(REPO, 'reels', code, `${code}${M.variant === 'editorial' ? '-editorial' : ''}.aep`);
  const logFile = path.join(tmpDir, 'log.txt');
  const stillDir = path.join(revDir, 'stills');
  fs.rmSync(aep, {force: true});
  fs.rmSync(stillDir, {recursive: true, force: true});
  fs.mkdirSync(stillDir, {recursive: true});

  closeOwnProject(app, code, tmpDir, force);

  console.log(`\n▶ ${code}${M.variant === 'editorial' ? ' · editorial' : ''}`);
  runJsx(app, `
    $.global.EDUCAPLAY_MANIFEST = ${js(manifestPath)};
    $.evalFile(File(${js(path.join(AE_DIR, 'build-reel.jsx'))}));
    var o=new File(${js(logFile)});o.encoding='UTF-8';o.lineFeed='Unix';o.open('w');
    o.write((typeof LOG!=='undefined'?LOG:['✗ el constructor no dejó LOG']).join('\\n'));o.close();`, tmpDir);

  // ExtendScript en Mac escribe \r como fin de línea si no se le pide Unix.
  const log = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').replace(/\r\n?/g, '\n') : '';
  fs.writeFileSync(path.join(revDir, 'log.txt'), log);
  if (!log) problems.push('no hay LOG del armado');
  for (const line of log.split('\n')) {
    if (/[⚠✗]/.test(line)) problems.push(line.trim());
  }
  const count = (re) => Number((re.exec(log) ?? [])[1]);
  const cards = count(/· (\d+) escenas armadas/);
  const subs = count(/· (\d+) subtítulos/);
  const karaoke = count(/· (\d+) palabras con karaoke/);
  const nWords = M.captions.reduce((n, c) => n + c.words.length, 0);
  if (cards !== M.scenes.length) problems.push(`escenas armadas ${cards} ≠ manifiesto ${M.scenes.length}`);
  if (subs !== M.captions.length) problems.push(`subtítulos ${subs} ≠ manifiesto ${M.captions.length}`);
  if (karaoke !== nWords) problems.push(`palabras con karaoke ${karaoke} ≠ manifiesto ${nWords}`);
  if (!fs.existsSync(aep)) problems.push(`no se guardó ${path.relative(REPO, aep)}`);

  // Stills desde la comp principal. saveFrameToPng vuelve antes de escribir.
  const pngs = frames.map((f) => path.join(stillDir, `f${String(f).padStart(5, '0')}.png`));
  const sheet = path.join(revDir, 'contacto.jpg');
  if (fs.existsSync(aep)) {
    runJsx(app, `
      var c=null;
      for (var i=1;i<=app.project.numItems;i++){var it=app.project.item(i);
        if (it instanceof CompItem && it.name===${js(code)}) c=it;}
      var fr=${js(frames)}, out=${js(pngs)};
      for (var k=0;k<fr.length;k++) c.saveFrameToPng(fr[k]/c.frameRate, new File(out[k]));`, tmpDir);
    const ok = await waitFiles(pngs, 30000 + frames.length * 8000);
    const got = pngs.filter((p) => fs.existsSync(p));
    if (!ok) problems.push(`faltan stills: ${pngs.length - got.length} de ${pngs.length}`);
    if (got.length) contactSheet(got, sheet);
  }

  if (problems.length) {
    console.log('✗ NO pasa');
    for (const p of problems) console.log(`   · ${p}`);
  } else {
    console.log(`✓ ${cards} escenas, ${subs} subtítulos, ${karaoke} palabras con karaoke, ${pngs.length} stills → ${path.relative(REPO, sheet)}`);
  }
  return problems;
};

const main = async () => {
  const {code, flags} = args;
  if (!code) throw new Error('Uso: npm run ae -- <CODE> [--frames 60,420] [--forzar]');

  const ed = flags.editorial ? '.editorial' : '';
  const manifestPath = path.join(REPO, 'reels', code, `manifest${ed}.json`);
  if (!fs.existsSync(manifestPath)) throw new Error(`Falta ${path.relative(REPO, manifestPath)}: corré npm run export:ae -- ${code}${flags.editorial ? ' --editorial' : ''}`);
  const M = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const frames = flags.frames ? String(flags.frames).split(',').map(Number) : defaultFrames(M);
  const revDir = path.join(REPO, 'reels', code, flags.editorial ? 'revision-editorial' : 'revision');
  fs.mkdirSync(revDir, {recursive: true});

  const app = aeApp();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'educaplay-ae-'));
  let problems;
  try {
    await ensureAE(app, tmpDir);
    problems = await build(app, code, M, frames, revDir, tmpDir, !!flags.forzar, manifestPath);
  } finally {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  }

  fs.writeFileSync(path.join(revDir, 'estado.json'), JSON.stringify({
    code, fecha: new Date().toISOString(), frames,
    ok: problems.length === 0, problemas: problems,
  }, null, 1));
  if (problems.length) {
    console.log('\n✗ No pasa. Mirá revision/log.txt.');
    process.exit(1);
  }
  console.log(`\n✓ ${code} armado y verificado. Revisá ${path.relative(REPO, revDir)}/contacto.jpg.`);
};

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
