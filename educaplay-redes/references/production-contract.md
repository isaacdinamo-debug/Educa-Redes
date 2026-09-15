# Contrato de Producción — EducaPlay Redes

## 1. Especificaciones de Entrega y Formato

- **Lienzo**: 1080 × 1920 píxeles (relación de aspecto 9:16).
- **Framerate**: **25 fps** (derivado del máster nativo de EducaPlay).
- **Códec de video**: H.264, perfil High, nivel 4.2, espacio de color Rec.709, submuestreo cromático `yuv420p`.
- **Códec de audio**: AAC estéreo, 48.000 Hz, 320 kbps.
- **Sonoridad integrada**: −18 a −19 LUFS (salvo másters ya normalizados a nivel comercial, manteniendo ganancia neutra `gain: 1.0` con True Peak $\le -1.0$ dBTP).

---

## 2. Esquema de Datos (`src/data.ts`)

```ts
export type SpokenWord = {
  text: string;
  from: number; // frame de inicio (inclusivo)
  to: number;   // frame de finalización (exclusivo)
};

export type CaptionPage = {
  from: number;
  to: number;
  words: SpokenWord[];
};

export type Scene = {
  key: string;
  kind: 'countdown' | 'question' | 'flood' | 'rain' | 'uncertainty' | 'choice' | 'cta' | string;
  from: number;
  to: number;
  kicker: string;
  title: string;
  rank: 'didactico' | 'refuerzo';
  beats: Record<string, number>;
  media?: string;
  copy?: {
    value?: string;
    label?: string;
    supporting?: string;
    highlight?: string;
    options?: string[];
  };
};

export type EpisodeData = {
  id: string;
  master: string;
  fps: number;
  durationInFrames: number;
  captions: CaptionPage[];
  scenes: Scene[];
};
```

---

## 3. Geometría y Zonas Seguras (`src/layout.ts`)

```ts
export const LAYOUT = {
  canvas: { width: 1080, height: 1920 },
  card: { x: 90, y: 340, width: 840, height: 570 },
  captions: { x: 90, y: 940, width: 840, height: 184 },
  safeMargins: { top: 280, bottom: 270, right: 140, left: 90 },
};

export const fitMedia = (
  native: { width: number; height: number },
  maxW: number,
  maxH: number
) => {
  const scale = Math.min(maxW / native.width, maxH / native.height);
  return {
    width: Math.round(native.width * scale),
    height: Math.round(native.height * scale),
  };
};
```

---

## 4. Tipografía y Colores Institucionales

- **`MuseoDisplay`**: `Museo700-Regular.otf` (pesos 700 para titulares destacados).
- **`MuseoText`**: `MuseoSansRounded700.otf` (pesos 700 redondeado para subtítulos, kickers y botones).
- **`MuseoLight`**: `Museo300-Regular.otf` (peso 300 para textos explicativos y apoyos).
- **Superficie de lectura (`PAPER`)**: `#F7FFFC`.
- **Tinta institucional (`INK`)**: `#0C2B24`.
- **Acento temático (`ACCENT`)**: `#17613B`.
- **Resaltado de palabra activa**: `#FFF6C4` con `text-decoration: underline`.
- **Barra arcoíris (`FRAME_COLORS`)**:
  - Rosa: `#EC0A63`
  - Amarillo: `#F7C515`
  - Cian: `#2BB8D6`
  - Verde: `#23B545`

---

## 5. Protocolo de Sonda QA (`__EDUCA_QA__`)

Durante la ejecución de `npm run check`, Remotion evalúa fotogramas con `qa: true`. El navegador emite a consola una línea serializada en JSON:

```json
__EDUCA_QA__{"frame": 331, "errors": [], "fonts": "loaded"}
```

Si se detectan anomalías, `errors` acumula mensajes descriptivos:
- `"Fuera de región: <asset>"`: el elemento desborda su contenedor declarado.
- `"Texto desbordado: <texto>"`: alguna caja de texto sobrepasa los límites del contenedor.
- `"Proporción alterada"`: el elemento no conserva su aspecto nativo registrado.
- `"Más de dos líneas"`: las palabras de subtítulo ocupan tres o más renglones.
- `"Palabra activa incorrecta"`: la cantidad o índice de palabras con `data-active="true"` no coincide con el rango temporal de `DATA.words`.

---

## 6. Checklist de Publicación y Aprobación

- [ ] Duración en frames coincide exactamente con el audio del máster.
- [ ] No existen palabras activas fuera de su intervalo de voz.
- [ ] Subtítulos no superan las 2 líneas en ningún fotograma.
- [ ] Todos los recursos (`media/resources/*`) están medidos en `layout.ts` y no sufren distorsión.
- [ ] Ejecución de `npm run typecheck` sin errores.
- [ ] Ejecución de `npm run check` completada con 0 errores en los 60 fotogramas de prueba.
- [ ] Exportación en `out/educaplay-redes.mp4` visualizada y aprobada en formato móvil real.
