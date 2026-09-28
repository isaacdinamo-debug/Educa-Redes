# Educaplay Redes — reels verticales en After Effects

Reels 9:16 de Educaplay Secundaria (Corrientes). Unos scripts en Node miden el máster, transcriben y
validan; un constructor en ExtendScript arma el `.aep` editable (capas, keyframes y una capa
`CONTROL` con los ajustes globales), y `aerender` saca el MP4.

**Para armar un reel, seguí el workflow `/reel-ae`** (`.agents/workflows/reel-ae.md`). Los criterios
y las trampas están en la skill `.agents/skills/educaplay-redes/SKILL.md`.

## Mapa

| Carpeta | Qué es |
|---|---|
| `reels/<CODE>/data.ts` | **El único archivo escrito a mano**: escenas, beats y `captionFix`. |
| `reels/<CODE>/words.json`, `captions.json` | Transcripción por palabra y páginas de subtítulo. Los genera `npm run nuevo`. |
| `reels/<CODE>/manifest.json` | Lo que lee AE. Lo genera `npm run export:ae`. |
| `reels/<CODE>/revision/` | `contacto.jpg`, `log.txt`, `estado.json`: la evidencia que se versiona. |
| `reels/<CODE>/media/`, `assets/`, `render/`, `*.aep` | Medios, GIF transcodificados, MP4 y proyecto. Fuera de git. |
| `scripts/` | `nuevo`, `check`, `export-ae`, `publicar`; `lib/comun.mjs` tiene el `ESCENARIO`, la paleta y la marca. |
| `ae/` | `build-reel.jsx` (constructor), `run.mjs` (maneja AE desde la terminal), `render.mjs` (aerender + ffmpeg). |
| `plantillas/data.molde.ts` | Molde del `data.ts` de un reel nuevo. |

## Reglas duras

- **La marca se escribe «Educaplay»**: E mayúscula y el resto en minúscula, en subtítulos, botones,
  títulos, comentarios y docs. Nunca «EducaPlay» ni «EDUCAPLAY». `npm run check` lo exige; si
  Whisper la transcribe mal, va en `captionFix`. En pantalla, sola, va en Museo 700 como el logo.
- **Las coordenadas viven en `ESCENARIO`** (`scripts/lib/comun.mjs`) y sólo ahí: caja de la
  tarjeta, banda de subtítulos, zonas seguras de las apps. Nunca en `data.ts` ni en el `.jsx`.
- **Los beats salen de `words.json`.** Cada `at` es el frame de la palabra que lo dispara; no se
  estima. La voz no se acelera ni se corta: la duración es la del máster.
- **No se editan archivos generados** (`words.json`, `captions.json`, `manifest.json`). Las
  correcciones van en `data.ts`.
- **Karaoke: nunca dos palabras activas a la vez.** Lo verifica `check` y lo cuenta `ae`.
- **Nada se publica sin chequeo.** `npm run publicar` corre todo y no toca git si algo falla.
- **Antes de ejecutar AE, cerrá tu trabajo.** `npm run ae` cierra sin guardar sólo los proyectos
  que generó este flujo; si hay otro abierto, se detiene.
- **Rutas con espacio**: el repo vive en `~/Documents/EducaPlay/Secundaria /Educa-Redes` (hay un
  espacio antes de la barra). Entrecomillá siempre.
