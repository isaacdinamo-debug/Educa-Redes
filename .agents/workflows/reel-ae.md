---
description: Armar un reel vertical de Educaplay en After Effects, verificarlo, renderizarlo y subirlo a GitHub (nuevo → data.ts → check → AE → revisión → render → publicar)
---

# /reel-ae — reel vertical de Educaplay en After Effects

Pedile al usuario el **código del reel** (por ejemplo `AMB26-05-REEL`) y de qué capítulo sale. Todos
los comandos se corren desde la raíz del repo. Antes de empezar, leé `AGENTS.md` y la skill
`educaplay-redes`.

Si un paso falla, **pará y mostrale al usuario el error tal cual**. No lo esquives editando
archivos generados, escribiendo coordenadas a mano ni saltando al paso de publicar.

## 1. Medios

Copiá el máster vertical a `reels/<CODE>/media/master.mp4` y los recursos del capítulo a
`reels/<CODE>/media/recursos/`. Quedan fuera de git.

## 2. Transcribir y escribir `data.ts`

```bash
npm run nuevo -- <CODE>
```

Mide el máster, transcribe con Whisper palabra por palabra, pagina los subtítulos y deja el borrador
de `data.ts`. Después, en orden:

1. Leé `words.json` entero y corregí los errores de Whisper con `captionFix` en `data.ts`.
2. La marca se escribe **Educaplay**.
3. Escribí las escenas. Cada `at` es el frame de la palabra que lo dispara: buscalo en
   `words.json`. Tomá como modelo `reels/AMB26-04-REEL/data.ts`.
4. Completá la cabecera del `data.ts` (qué hay en el máster, excepciones con su motivo).

## 3. Verificar los datos

```bash
npm run check -- <CODE>
```

Tiene que terminar en `✓ <CODE>: todos los verificadores en verde.`

## 4. Manifiesto y armado en After Effects

Pedile al usuario que **guarde y cierre** cualquier proyecto propio abierto en AE. Después:

```bash
npm run export:ae -- <CODE>
npm run ae -- <CODE>
```

Arma `reels/<CODE>/<CODE>.aep`, saca stills y la hoja `reels/<CODE>/revision/contacto.jpg`. Falla
si el armado dejó alguna ⚠ o ✗; el detalle queda en `revision/log.txt`.

## 5. Revisión visual

Abrí `revision/contacto.jpg` y listale al usuario todo lo que se vea mal:

- texto cortado, ilegible o fuera de la tarjeta;
- un subtítulo de más de dos líneas, o una pastilla menta corrida de su palabra;
- algo crítico en las zonas que tapa la app (arriba, abajo o a la derecha);
- la marca escrita de otra forma que «Educaplay».

Corregí en `data.ts` (o en `ae/build-reel.jsx`) y volvé al paso 3. **Esperá el OK del usuario.**

## 6. Render

```bash
npm run render -- <CODE>                 # o --muestra 15 para revisar en el celular
```

Deja `reels/<CODE>/render/<CODE>.mp4` (H.264, 1080×1920, 25 fps, audio del máster) y lo verifica.

## 7. Publicar

```bash
npm run publicar -- <CODE>
```

Repite los pasos 3, 4 y 6 y, **sólo si todo pasa**, commitea en `reel/<CODE>`, hace push y abre el
PR con la hoja de contacto. Pasale al usuario el link del PR.
