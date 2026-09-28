/**
 * ae/render.mjs — el MP4 final de un reel, listo para Reels / TikTok / Shorts.
 *
 *   npm run render -- <CODE>                 → reels/<CODE>/render/<CODE>.mp4
 *   npm run render -- <CODE> --muestra 15    (sólo los primeros 15 s)
 *
 * 1. aerender renderiza la comp <CODE> del .aep (módulo de salida por defecto
 *    de AE; funciona con After Effects abierto);
 * 2. ffmpeg lo lleva al contrato de entrega: H.264 High 4.2, yuv420p, Rec.709,
 *    25 fps, +faststart, y copia la pista de audio del máster SIN recodificar;
 * 3. verifica formato, duración (±1 frame contra el máster) y audio.
 *
 * El .aep tiene que existir y estar al día: corré `npm run ae -- <CODE>` antes.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {hasAudio, parseArgs, probe, readJson, REPO} from '../scripts/lib/comun.mjs';

const aerender = () => {
  if (process.env.AERENDER) return process.env.AERENDER;
  const apps = fs.readdirSync('/Applications').filter((f) => /^Adobe After Effects 20\d\d$/.test(f)).sort();
  if (!apps.length) throw new Error('No encontré After Effects en /Applications (definí AERENDER).');
  return path.join('/Applications', apps.at(-1), 'aerender');
};

const main = () => {
  const {code, flags} = parseArgs();
  if (!code) throw new Error('Uso: npm run render -- <CODE> [--muestra 15]');
  const dir = path.join(REPO, 'reels', code);
  const aep = path.join(dir, `${code}.aep`);
  if (!fs.existsSync(aep)) throw new Error(`Falta ${path.relative(REPO, aep)}: corré npm run ae -- ${code}`);
  const M = readJson(path.join(dir, 'manifest.json'));
  const sample = flags.muestra ? Math.round(Number(flags.muestra) * M.fps) : null;
  const frames = sample ? Math.min(sample, M.duration) : M.duration;

  const outDir = path.join(dir, 'render');
  fs.mkdirSync(outDir, {recursive: true});
  const out = path.join(outDir, sample ? `${code}-muestra-${flags.muestra}s.mp4` : `${code}.mp4`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'educaplay-render-'));
  try {
    console.log(`▶ aerender ${code} · ${frames} frames`);
    const r = spawnSync(aerender(), ['-project', aep, '-comp', code, '-s', '0', '-e', String(frames - 1),
      '-output', path.join(tmp, 'ae.mov')], {encoding: 'utf8', maxBuffer: 256 * 1024 * 1024});
    // El módulo de salida por defecto decide la extensión (.mp4 si es H.264).
    const made = fs.readdirSync(tmp).filter((f) => /^ae\./.test(f));
    if (r.status !== 0 || !made.length) {
      console.log((r.stdout ?? '').split('\n').slice(-20).join('\n'));
      throw new Error('aerender no generó el video.');
    }
    const src = path.join(tmp, made[0]);

    console.log('▶ ffmpeg · H.264 High, yuv420p, Rec.709, audio del máster');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-i', path.join(dir, M.master),
      '-map', '0:v:0', '-map', '1:a:0', '-frames:v', String(frames),
      '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.2', '-preset', 'slow', '-crf', '18',
      '-pix_fmt', 'yuv420p', '-r', String(M.fps),
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      '-c:a', 'copy', '-t', String(frames / M.fps), '-movflags', '+faststart', out]);
  } finally {
    fs.rmSync(tmp, {recursive: true, force: true});
  }

  const p = probe(out);
  const got = Math.round(p.duration * M.fps);
  const problems = [];
  if (p.width !== M.width || p.height !== M.height) problems.push(`${p.width}×${p.height} ≠ ${M.width}×${M.height}`);
  if (Math.abs(p.fps - M.fps) > 0.01) problems.push(`${p.fps} fps ≠ ${M.fps}`);
  if (Math.abs(got - frames) > 1) problems.push(`dura ${got} frames y se esperaban ${frames}`);
  if (!hasAudio(out)) problems.push('sin audio');
  if (problems.length) {
    console.log(`✗ ${path.relative(REPO, out)}:\n   · ${problems.join('\n   · ')}`);
    process.exit(1);
  }
  const mb = (fs.statSync(out).size / 1e6).toFixed(1);
  console.log(`✓ ${path.relative(REPO, out)} · ${p.width}×${p.height} · ${p.fps} fps · ${p.duration.toFixed(2)} s · ${mb} MB`);
};

try {
  main();
} catch (e) {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
}
