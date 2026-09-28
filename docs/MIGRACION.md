# De Remotion a After Effects

Hasta el 28/9/2026 los reels se armaban en **Remotion**, en `educaplay-redes/remotion/`. El flujo
pasó a **After Effects** con la misma lógica que los capítulos (repo `EducaPlay-After-Effects`). La
versión Remotion queda en la historia de git (último commit: `fdc0330`).

## Qué se trajo

| En Remotion | Acá | Cambios |
|---|---|---|
| `src/data.ts` → `words`, `captions` | `reels/AMB26-04-REEL/words.json`, `captions.json` | Mismas 78 palabras y 31 páginas; las páginas guardan rangos de índices. |
| `src/data.ts` → `scenes` | `reels/AMB26-04-REEL/data.ts` | Tipos genéricos (`numero`, `medio`, `opciones`, `cierre`) en vez de `countdown`, `flood`, `rain`… |
| `src/layout.ts`, `notebook-layout.ts` | `ESCENARIO` en `scripts/lib/comun.mjs` | Una sola geometría, con las zonas seguras de las apps. |
| `scripts/check.mjs` | `scripts/check.mjs` | Sin sonda DOM: valida datos, zonas, contraste y marca; lo que depende de la fuente real (dos líneas, texto que no entra) lo verifica el armado en AE. |
| `render`, `render:sample` | `npm run render` (`--muestra 15`) | aerender + ffmpeg con el audio del máster copiado. |
| Contrato de entrega (`production-contract.md`) | `ae/render.mjs` | H.264 High 4.2, yuv420p, Rec.709, 25 fps, +faststart. |

## Qué cambió por decisión

- **Estética:** la de la plataforma Educaplay (tarjeta oscura, bandas, menta), no la tarjeta clara
  ni la variante «cuaderno» del 16/9. Es la única estética de los proyectos en AE.
- **Karaoke:** se mantiene, en menta con tinta sobre la pastilla canónica oscura (antes: amarillo
  `#FFF6C4` sobre pastilla clara).
- **Marca:** siempre «Educaplay».

## Qué se retiró

- React, Remotion y sus dependencias; `Root.tsx`, `Notebook.tsx`, `remotion.config`.
- La variante «cuaderno» y la composición `EducaPlayCuaderno`.
- `educaplay-redes/SKILL.md` y `references/production-contract.md`: los reemplazan la skill
  `.agents/skills/educaplay-redes/`, `docs/ESTETICA.md` y `ae/render.mjs`.

Los medios y renders locales de la versión Remotion (`educaplay-redes/remotion/public`, `out/`,
`node_modules/`) no se borraron del disco; el máster y los recursos de AMB26-04-REEL están enlazados
(enlaces duros) en `reels/AMB26-04-REEL/media/`.
