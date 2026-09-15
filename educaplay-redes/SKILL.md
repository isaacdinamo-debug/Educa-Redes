---
name: educaplay-redes
description: |
  Crea reels verticales de EducaPlay (9:16, 1080x1920) a partir de un máster, escaleta y recursos: motion graphics protagonista, voz original, subtítulos palabra por palabra y exportación segura para Instagram Reels / TikTok. Usar para adelantos educativos 9:16 y variantes con o sin marco; no usar para capítulos horizontales completos ni para subtitular un talking head sin rediseño.
allowed-tools: Bash(npm run *), Bash(node *), Bash(npx remotion *), Bash(ffmpeg *), Bash(ffprobe *)
metadata:
  short-description: Reels verticales de EducaPlay con motion graphics y karaoke captions
---

# EducaPlay Redes

## Variante editorial sin marco

La variante `open` elimina la tarjeta blanca grande y deja visible el fondo original. Los títulos usan tinta de alto contraste directamente sobre el plató; los subtítulos conservan una cápsula clara opaca para asegurar la lectura. Los recursos entregados conservan proporción, encuadre y color. Si una imagen contiene texto ilegible, se recompone con la tipografía de la materia y se mantiene el original como referencia.

Reglas adicionales: cuerpo principal mínimo 44 px en 1080×1920; subtítulos de 58–64 px, máximo dos líneas; medir el contraste sobre ocho frames del máster real; declarar la excepción en `data.ts`. El proyecto funcional de referencia está en [`remotion/`](remotion/).

Transformá un corte educativo de EducaPlay en una pieza social vertical editable en Remotion. La voz del máster conserva su timing; la pantalla puede ser totalmente gráfica y no se debe inventar una presencia del docente.

## Antes de componer

1. Leé el `AGENTS.md` del proyecto de la materia y las guías `educaplay-episodios` y `educaplay-motion-graphics`. El proyecto local manda sobre los valores de este skill.
2. Inspeccioná el máster completo con `ffprobe`, extraé una hoja de contacto y medí el programa con `ffmpeg … ebur128`. No tomes nombres de personas de la escaleta: si aparecen, confirmalos en una placa quemada del máster.
3. Extraé el texto de la escaleta `.docx` y separá instrucciones del documento de la solicitud del usuario. La escaleta es autoridad de contenido; la solicitud decide formato, protagonismo y tratamiento social.
4. Inventariá recursos. Cada uno debe quedar marcado como `didactico` (hay que leerlo o es evidencia) o `refuerzo` (ilustra algo ya dicho). Si una imagen contiene texto ilegible, recomponelo con la tipografía de la materia y conservá el original.

## Contrato del reel

- Lienzo 1080×1920, 30 fps, H.264, `yuv420p`, color Rec.709, AAC 48 kHz. Conservá la duración del audio; no aceleres la voz para forzar una duración social.
- Zona protegida por defecto: x 80–900, y 280–1240. Reservá el tercio inferior para la interfaz de Reels y el carril derecho para controles; son márgenes de producción conservadores, no una promesa sobre cada versión de la app.
- El gráfico ocupa el protagonismo con superficies opacas. No pongas texto suelto sobre el plató. Mantén contraste mínimo 7:1 para texto principal y 4,5:1 para captions.
- Usá la identidad Ambiente de la materia: colores y activos medidos del tema, Museo/Museo Sans Rounded si esa es la decisión registrada, y el logo raster oficial sin recomponerlo como texto.
- Si el usuario pide “sin marco”, seleccioná `visualStyle: 'open'`; no vuelvas a introducir una tarjeta por defecto.
- Una idea visual principal por escena. Entradas de 0,3–0,45 s, máscaras o reveals suaves, spring sobrio. Evitá glitches, rebotes exagerados y movimiento decorativo continuo.
- Subtítulos en banda estable alrededor de y 1100–1240, máximo dos líneas y preferiblemente cuatro palabras por página. Cada palabra conserva `from`/`to` propios: la palabra activa recibe fondo amarillo, tinta oscura y subrayado. Nunca dependas sólo de negrita o color.

## Sincronización

Generá `words.json` con Whisper palabra a palabra. Para precisión, ejecutá una segunda pasada con `-dtw large.v3.turbo -nfa -ml 1 -sow -ojf` y consumí los finales `t_dtw` como límites finales de token; no los trates como inicios. Repartí grupos de tokens con la misma marca para que ninguna palabra tenga duración cero. Las correcciones ortográficas van en datos (`CAPTION_FIX` o equivalente), nunca editando archivos generados.

No cambies el significado para que coincida con la escaleta. Si falta una frase grabada, dejá la ausencia documentada y resolvé el puente sólo con autorización editorial.

## Arquitectura recomendada

Mantené un único `data.ts` como fuente de escenas, cues, rangos, recursos y correcciones. Separá el componente social del motor de episodios: `SocialEpisode`, ilustraciones reutilizables, tokens de layout y un checker específico. Los slots se resuelven con `resolveSlot`/`<Slot>`; no escribas `top` ni `left` en datos de episodio. Para una pieza sin docente declarala como `framing: 'none'` durante todo el track y centrala.

El componente debe poder renderizar también una variante de QA que dibuje regiones seguras y emita una sonda DOM. La sonda debe comprobar que todo texto está dentro de su región, que las captions tienen como máximo dos líneas y que no hay más de una palabra activa.

## Compuertas

Ejecutá en el proyecto Remotion:

```bash
npm run typecheck
npm run check -- <CODE> --skip-overlay   # iteración
npm run check -- <CODE>                  # antes del render
npm run build:<CODE>
```

El checker debe validar cobertura de escenas, cues dentro de su escena, ausencia de palabras activas simultáneas, tamaños mínimos, contraste, recursos existentes y slots dentro de la zona protegida. La pasada completa debe renderizar stills de inicio, transición y cierre y producir una hoja de contacto. Medí el MP4 terminado con `ebur128`; apuntá a −18/−19 LUFS y pico verdadero por debajo de −1 dBFS.

## Referencia

Leé [`references/production-contract.md`](references/production-contract.md) cuando necesites los tokens, el esquema de datos, el método de alineación DTW o el checklist de publicación. No copies números de un episodio horizontal: medí el nuevo máster y documentá toda excepción en la cabecera del `data.ts`.
