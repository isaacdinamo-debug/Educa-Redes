/**
 * export-ae — manifiesto de un reel para After Effects.
 *
 *   npm run export:ae -- <CODE>
 *
 * Escribe reels/<CODE>/manifest.json: escenas, subtítulos con el timing de
 * cada palabra (el karaoke), escenario, paleta y fuentes. Todo lo que el .jsx
 * necesita decidir ya viene resuelto acá; el .jsx sólo pone en escena.
 *
 * Los GIF se transcodifican a reels/<CODE>/assets/<nombre>.mov (Animation, con
 * alfa, 25 fps): After Effects importa un GIF como un cuadro fijo.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ESCENARIO, FUENTES, PALETA, loadReel, parseArgs, probe, REPO} from './lib/comun.mjs';

const main = async () => {
  const {code} = parseArgs();
  const {REEL, words, captions, dir} = await loadReel(code);
  const assetsDir = path.join(dir, 'assets');
  fs.mkdirSync(assetsDir, {recursive: true});

  const master = probe(path.join(dir, REEL.master));
  const duration = Math.round(master.duration * REEL.fps);

  let gifs = 0;
  const scenes = REEL.scenes.map((s) => {
    if (s.kind !== 'medio') return s;
    const src = path.join(dir, s.media);
    const info = probe(src);
    let media = s.media;
    let kind = /\.(mp4|mov|m4v|webm)$/i.test(src) ? 'video' : 'photo';
    if (/\.gif$/i.test(src)) {
      kind = 'gif';
      media = `assets/${path.basename(src, path.extname(src))}.mov`;
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-fps_mode', 'cfr', '-r', String(REEL.fps),
        '-c:v', 'qtrle', '-pix_fmt', 'argb', path.join(dir, media)]);
      gifs++;
    }
    return {...s, media, mediaKind: kind, mediaSize: [info.width, info.height], portrait: info.height > info.width};
  });

  const manifest = {
    code: REEL.code,
    generatedBy: 'scripts/export-ae.mjs — no editar a mano: se regenera',
    title: REEL.title,
    series: REEL.series,
    fps: REEL.fps,
    width: ESCENARIO.canvas.width,
    height: ESCENARIO.canvas.height,
    duration,
    master: REEL.master,
    palette: PALETA,
    fonts: FUENTES,
    stage: {
      tarjeta: ESCENARIO.tarjeta,
      subtitulos: ESCENARIO.subtitulos,
      seguro: ESCENARIO.seguro,
      pastilla: ESCENARIO.pastilla,
    },
    scenes,
    captions: captions.map((p) => {
      const ws = words.slice(p.words[0], p.words[1]);
      return {from: p.from, to: p.to, text: ws.map((w) => w[0]).join(' '), words: ws};
    }),
  };
  const out = path.join(dir, 'manifest.json');
  fs.writeFileSync(out, JSON.stringify(manifest, null, 1) + '\n');
  console.log(`✓ ${path.relative(REPO, out)}: ${scenes.length} escenas, ${manifest.captions.length} subtítulos, ` +
    `${words.length} palabras, ${gifs} GIF → .mov, ${duration} frames`);
};

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
