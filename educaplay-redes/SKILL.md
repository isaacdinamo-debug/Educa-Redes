---
name: educaplay-redes
description: |
  Crea reels verticales de EducaPlay (9:16, 1080x1920) a partir de un máster, escaleta y recursos: motion graphics protagonista, voz original, subtítulos palabra por palabra (karaoke) y exportación segura para Instagram Reels / TikTok / YouTube Shorts. Usar para adelantos educativos 9:16 y variantes con o sin marco; no usar para capítulos horizontales completos ni para subtitular un talking head sin rediseño.
allowed-tools: Bash(npm run *), Bash(node *), Bash(npx remotion *), Bash(ffmpeg *), Bash(ffprobe *)
metadata:
  short-description: Reels verticales de EducaPlay con motion graphics, karaoke captions y QA automatizado
---

# EducaPlay Redes — Producción de Reels Verticales

Este skill define el estándar técnico, editorial y de control de calidad para producir **reels verticales educativos (1080×1920)** en Remotion para EducaPlay Secundaria (Corrientes).

El proyecto de referencia funcional y reproducible vive en [`educaplay-redes/remotion/`](remotion/).

---

## 1. Principios Fundamentales

1. **El motion graphics es protagonista**: En reels de adelanto o síntesis temática, si el docente no está en cuadro se declara `framing: 'none'`. La pantalla es 100% gráfica, centrada y optimizada para retención visual en dispositivos móviles.
2. **Respeto absoluto al máster y audio original**: La voz del docente mantiene su timing y entonación. No se acelera ni se corta el audio para forzar una duración; la duración en frames (`durationInFrames`) deriva de la pista de audio del máster.
3. **Framerate nativo de producción (25 fps)**: Los másters de EducaPlay se graban y entregan a **25 fps**. Nunca fuerces 30 fps ni mezcles tasas de refresco sin medir previamente con `ffprobe`.
4. **Legibilidad móvil implacable (WCAG AAA)**: El texto nunca va suelto sobre fondos de bajo contraste. Todo texto se apoya en superficies opacas (`#F7FFFC`, ratio > 15:1) o se verifica contra el plató real sobre múltiples fotogramas.

---

## 2. Contrato de Layout y Zonas Seguras (9:16)

Lienzo: **1080 × 1920 px**, 25 fps, H.264 (`yuv420p`, Rec.709), AAC 48 kHz.

| Zona | Coordenadas / Medidas | Función y restricciones |
|---|---|---|
| **Margen superior seguro** | $y < 280$ px | Libre de texto crítico para no ser tapado por el header, nombre de cuenta o cámara frontal. |
| **Margen inferior seguro** | $y > 1650$ px | Libre de contenido para no interferir con la descripción de Reels/TikTok, audio y barra de progreso. |
| **Margen lateral derecho** | $x > 940$ px | Zona de interacción de la app (Likes, comentarios, compartir, avatar). |
| **Contenedor principal (`card`)** | $x: 90$, $y: 340$, $w: 840$, $h: 570$ | Espacio para la escena gráfica activa (títulos, animaciones, datos, fotos). |
| **Cápsula de subtítulos (`captions`)** | $x: 90$, $y: 940$, $w: 840$, $h: 184$ | Banda para los subtítulos palabra a palabra en cápsula clara centrada. |

### Variantes de Estilo Visual

- **`visualStyle: 'open'` (Sin marco blanco)**: Elimina la tarjeta contenedora y ubica los gráficos directamente sobre el fondo del máster. Los títulos usan tinta de alto contraste y deben ser validados contra al menos 8 fotogramas del máster real. Los subtítulos conservan siempre su cápsula opaca.
- **`visualStyle: 'card'` (Con marco institucional)**: Tarjeta de bordes redondeados (`borderRadius: 30`), fondo `#F7FFFC`, sombra sutil (`0 14px 40px rgba(12,43,36,0.13)`) y la barra superior multicolor de EducaPlay (`FRAME_COLORS`: `#EC0A63`, `#F7C515`, `#2BB8D6`, `#23B545`).

---

## 3. Subtítulos y Sincronización Palabra por Palabra (Karaoke)

1. **Alineación Whisper con DTW**:
   - Transcribir con `whisper.cpp -dtw large.v3.turbo -nfa -ml 1 -sow -ojf`.
   - Consumir la marca `t_dtw` como el límite final del token (`to`). El inicio (`from`) es el final del token previo, respetando pausas naturales.
2. **Páginas de subtítulos (`DATA.captions`)**:
   - Agrupar en páginas de **máximo dos líneas**.
   - Preferencia editorial: 3 a 5 palabras por página para que la lectura móvil sea ágil y cómoda.
3. **Resaltado de palabra activa**:
   - Fondo amarillo institucional: `#FFF6C4`.
   - Tinta oscura: `#0C2B24`.
   - Subrayado: `text-decoration: underline`, espesor 3 px, offset 6 px.
   - **Regla estricta**: En cualquier instante temporal sólo puede haber **exactamente una palabra activa** (o ninguna si hay silencio).

---

## 4. Recursos Visuales y Tipografía

1. **Rango de Recursos**:
   - `'didactico'`: Evidencia real, gráficos informativos o documentos que el alumno debe comprender.
   - `'refuerzo'`: Ilustraciones, íconos o clips ambientales que apoyan lo que la voz explica.
2. **Proporciones y Medición (`layout.ts`)**:
   - Todo recurso (`image`, `video`, `gif`) declara sus dimensiones nativas en `MEDIA`.
   - Se ajusta mediante `fitMedia(native, maxW, maxH)` con `objectFit: 'contain'`.
   - Si una imagen entregada contiene texto ilegible en móvil, se recompone tipográficamente con las fuentes del sistema (`kind: 'checklist'`).
3. **Tipografía Institucional (Museo)**:
   - Titulares y Displays: `MuseoDisplay` (`Museo700-Regular.otf`).
   - Textos de lectura y subtítulos: `MuseoText` (`MuseoSansRounded700.otf`).
   - Textos livianos y apoyos: `MuseoLight` (`Museo300-Regular.otf`).
   - Carga con `document.fonts.load()` coordinada con `delayRender` / `continueRender`.

---

## 5. Arquitectura del Proyecto (`remotion/`)

```
educaplay-redes/
├── remotion/
│   ├── public/
│   │   ├── fonts/           # Museo300, Museo700, MuseoSansRounded700
│   │   └── media/
│   │       ├── master.mp4   # Máster vertical 1080x1920
│   │       └── resources/   # Recursos de la escaleta (GIF, JPG, MP4)
│   ├── scripts/
│   │   └── check.mjs        # QA automático headless con sonda DOM
│   ├── src/
│   │   ├── data.ts          # Fuente única: escenas, beats, captions, words
│   │   ├── layout.ts        # Coordenadas, dimensiones nativas y fitMedia
│   │   ├── Root.tsx         # Composición Remotion, escenas y QA probe
│   │   └── index.ts         # Entry point de Remotion
│   ├── package.json
│   └── tsconfig.json
├── references/
│   └── production-contract.md
├── agents/
│   └── openai.yaml
└── SKILL.md
```

---

## 6. Sonda de Calidad Automática (`__EDUCA_QA__`)

El proyecto incluye un arnés de verificación automatizado en `check.mjs` y `Root.tsx`:
- Cuando `qa: true`, en cada frame muestreado el componente inspecciona el DOM del navegador y emite la sonda:
  `__EDUCA_QA__{"frame": N, "errors": [...], "fonts": "loaded"}`
- **Comprobaciones automáticas**:
  1. Fuentes cargadas (`document.fonts.status === 'loaded'`).
  2. Todo texto o asset dentro de los límites de su región (`data-region="card"` o `data-region="captions"`).
  3. Ningún desborde (`overflow`) detectado en rangos de texto (`Range.getClientRects()`).
  4. Proporción de aspecto (`data-ratio`) preservada dentro de tolerancia (0.002).
  5. Máximo dos líneas simultáneas de subtítulos.
  6. Exactitud temporal de palabras activas contra `DATA.words`.

---

## 7. Flujo de Comandos y Compuertas de Aprobación

```bash
cd educaplay-redes/remotion

# 1. Validación estricta de tipos
npm run typecheck

# 2. Comprobación automática de geometría, fuentes y subtítulos (60 frames clave)
npm run check

# 3. Renderizado de muestra rápida (primeros 15 segundos) para revisión en celular
npm run render:sample

# 4. Renderizado completo del reel
npm run render
```

> [!CRITICAL]
> **Condición de aprobación**: Ningún reel se entrega sin haber superado `npm run check` con 0 errores y haber visualizado la muestra o el render final en formato vertical de smartphone.
