---
trigger: glob
globs: reels/**/*
description: Qué archivos de un reel se escriben a mano y cuáles los pisan los scripts.
---

En `reels/<CODE>/` hay un solo archivo escrito a mano: **`data.ts`**.

Estos los **generan los scripts**:

    words.json   captions.json      (npm run nuevo)
    manifest.json   assets/         (npm run export:ae)
    revision/   <CODE>.aep          (npm run ae)
    render/                         (npm run render)

Editarlos no da error: la corrección desaparece en la próxima corrida y el error vuelve al video
sin que nadie se entere. Lo que haya que corregir se declara en `data.ts`:

- una palabra mal transcripta → `captionFix: {<índice>: '<texto>'}`;
- un beat → el `at` de la escena, con el frame de la palabra en `words.json`.

La marca se escribe **Educaplay**; `npm run check` lo exige también en `words.json`.
