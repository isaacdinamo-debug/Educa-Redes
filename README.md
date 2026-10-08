# Educaplay Redes

Reels verticales (1080×1920, 25 fps) de **Educaplay Secundaria (Corrientes)** para Instagram Reels,
TikTok y YouTube Shorts, armados en **Adobe After Effects**. A partir del máster, un `data.ts` con
las escenas y la transcripción palabra por palabra, un constructor en ExtendScript arma un `.aep`
editable con la estética de la plataforma Educaplay y subtítulos con karaoke.

Reel de referencia: **AMB26-04-REEL**, adelanto de «Plan B: protocolo para una inundación» (45 s,
7 escenas, 31 subtítulos, 78 palabras).

## Instalación (una vez por máquina)

- macOS con **Adobe After Effects 2026**;
- **Node ≥ 22.6**, `ffmpeg`/`ffprobe` y `whisper-cli` (whisper.cpp) con el modelo
  `ggml-large-v3-turbo.bin` (se usa el de `EducaPlay-After-Effects/motor/models/` si está);
- las fuentes **Museo** y **Museo Sans Rounded** instaladas (AE las busca por nombre PostScript).

No hay dependencias de npm.

## Flujo de un reel

```bash
# 0. copiar el máster a reels/<CODE>/media/master.mp4 y los recursos a reels/<CODE>/media/recursos/
npm run nuevo      -- AMB26-05-REEL     # 1. medir, transcribir (Whisper), paginar, borrador de data.ts
#                                       # 2. escribir las escenas en reels/<CODE>/data.ts
npm run check      -- AMB26-05-REEL     # 3. datos, zonas seguras, contraste, marca
npm run export:ae  -- AMB26-05-REEL     # 4. manifiesto para AE
npm run ae         -- AMB26-05-REEL     # 5. armar en AE + stills + chequeo → revision/contacto.jpg
npm run render     -- AMB26-05-REEL     # 6. MP4 final → reels/<CODE>/render/<CODE>.mp4
npm run publicar   -- AMB26-05-REEL     # 7. si todo pasa: commit, push y PR
```

En **Antigravity**, todo esto es el workflow **`/reel-ae`**; lo sigue la skill `educaplay-redes`.

## Documentación

- [`AGENTS.md`](AGENTS.md): mapa del repo y reglas duras.
- [`docs/ESTETICA.md`](docs/ESTETICA.md): escenario 9:16, piezas, karaoke y la capa `CONTROL`.
- [`docs/MIGRACION.md`](docs/MIGRACION.md): qué se trajo del flujo Remotion y qué se retiró.
