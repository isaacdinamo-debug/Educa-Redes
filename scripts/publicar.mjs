/**
 * publicar — chequeo completo de un reel y, SÓLO si pasa, subida a GitHub.
 *
 *   npm run publicar -- <CODE> [--sin-pr] [--sin-render] [--trailer "…"]
 *
 * 1. npm run check        máster, escenas, palabras, páginas, zonas, contraste, marca
 * 2. npm run export:ae    manifiesto para After Effects
 * 3. npm run ae           arma el .aep, stills, hoja de contacto, chequeo
 * 4. npm run render       MP4 final y su verificación (salvo --sin-render)
 * 5. git                  rama reel/<CODE>, commit, push
 * 6. gh                   PR hacia main con la hoja de contacto (si no existe)
 *
 * Si cualquier paso de 1–4 falla, NO toca git. Los medios (máster, recursos,
 * .aep, assets, MP4) quedan afuera por .gitignore: se suben los datos, el
 * manifiesto y revision/ (hoja de contacto, log y estado).
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {parseArgs, readJson, REPO} from './lib/comun.mjs';

const step = (titulo, args) => {
  console.log(`\n━━ ${titulo}\n$ npm run ${args.join(' ')}`);
  const r = spawnSync('npm', ['run', '-s', ...args], {cwd: REPO, stdio: 'inherit'});
  if (r.status !== 0) throw new Error(`${titulo}: falló (código ${r.status}). No se subió nada.`);
};

const git = (...a) => execFileSync('git', a, {cwd: REPO, encoding: 'utf8'}).trim();
const gitOk = (...a) => spawnSync('git', a, {cwd: REPO}).status === 0;

const repoSlug = () => {
  const url = git('remote', 'get-url', 'origin');
  const m = /github\.com[:/](.+?)(\.git)?$/.exec(url);
  if (!m) throw new Error(`El remote origin no es de GitHub: ${url}`);
  return m[1];
};

const main = () => {
  const {code, flags} = parseArgs();
  if (!code) throw new Error('Uso: npm run publicar -- <CODE> [--sin-pr] [--sin-render] [--trailer "…"]');
  const slug = repoSlug();

  step('1/4 · verificadores', ['check', '--', code]);
  step('2/4 · manifiesto para After Effects', ['export:ae', '--', code]);
  step('3/4 · armado y chequeo en After Effects', ['ae', '--', code]);
  if (!flags['sin-render']) step('4/4 · MP4 final', ['render', '--', code]);

  const dir = path.join(REPO, 'reels', code);
  const estado = readJson(path.join(dir, 'revision', 'estado.json'));
  const M = readJson(path.join(dir, 'manifest.json'));
  const nWords = M.captions.reduce((n, c) => n + c.words.length, 0);

  const branch = `reel/${code}`;
  if (git('branch', '--show-current') !== branch) {
    if (gitOk('show-ref', '--verify', '--quiet', `refs/heads/${branch}`)) git('checkout', branch);
    else git('checkout', '-b', branch);
  }
  git('add', '-A');
  if (gitOk('diff', '--cached', '--quiet')) {
    console.log('\n· No hay cambios nuevos para commitear.');
  } else {
    const msg = [
      `${code} · ${M.title}: reel armado en After Effects`,
      '',
      `${M.scenes.length} escenas, ${M.captions.length} subtítulos, ${nWords} palabras con karaoke, ${estado.frames.length} stills.`,
      'Chequeo completo en verde: datos, zonas seguras, contraste, marca y armado en AE sin advertencias.',
      ...(flags.trailer ? ['', String(flags.trailer)] : []),
    ].join('\n');
    execFileSync('git', ['commit', '-m', msg], {cwd: REPO, stdio: 'inherit'});
  }
  execFileSync('git', ['push', '-u', 'origin', branch], {cwd: REPO, stdio: 'inherit'});

  if (flags['sin-pr']) return;
  const existing = spawnSync('gh', ['pr', 'view', branch, '--repo', slug, '--json', 'url', '-q', '.url'], {cwd: REPO, encoding: 'utf8'});
  if (existing.status === 0 && existing.stdout.trim()) {
    console.log(`\n✓ Push hecho. El PR ya existía: ${existing.stdout.trim()}`);
    return;
  }
  const img = `https://github.com/${slug}/blob/${branch}/reels/${code}/revision/contacto.jpg?raw=1`;
  const body = [
    `**${code} · ${M.title}** — ${M.series}`,
    '',
    `${M.scenes.length} escenas · ${M.captions.length} subtítulos · ${nWords} palabras con karaoke · ${M.fps} fps · ${M.width}×${M.height}`,
    '',
    '### Chequeo',
    '- `npm run check`: datos, zonas seguras, contraste y marca en verde',
    '- `npm run ae`: armado sin ⚠ ni ✗; escenas, subtítulos y karaoke coinciden con el manifiesto',
    ...(flags['sin-render'] ? [] : ['- `npm run render`: MP4 1080×1920, 25 fps, H.264 + audio del máster']),
    '',
    '### Hoja de contacto',
    `![contacto](${img})`,
    '',
    'El .aep, los medios y el MP4 no se suben: se regeneran con `npm run export:ae`, `npm run ae` y `npm run render`.',
  ].join('\n');
  execFileSync('gh', ['pr', 'create', '--repo', slug, '--base', 'main', '--head', branch,
    '--title', `${code} · ${M.title}`, '--body', body], {cwd: REPO, stdio: 'inherit'});
};

try {
  main();
} catch (e) {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
}
