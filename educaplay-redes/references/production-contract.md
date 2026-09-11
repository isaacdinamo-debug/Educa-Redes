# Contrato de producción

## Entrada y salida

Entradas mínimas: máster MP4, escaleta `.docx`, carpeta `RECURSOS/`, tema de la materia y proyecto Remotion. Salida mínima: composición 1080×1920, fuente editable, `.srt` opcional, hoja de contacto, reporte QA y MP4 H.264/AAC.

## Esquema de datos

```ts
type SpokenWord = {text: string; from: number; to: number};
type Scene = {
  key: string;
  kind: string;
  from: number;
  to: number;
  kicker: string;
  title: string;
  rank: 'didactico' | 'refuerzo';
  beats: Record<string, number>;
  media?: string;
  copy?: {value?: string; label?: string; supporting?: string; highlight?: string; options?: string[]};
};
```

Los tiempos se expresan en frames de la composición. `from` es inclusivo y `to` exclusivo. Toda escena debe durar al menos 2,4 s salvo una palabra-cue deliberadamente breve, que se documenta como excepción.

## Layout social de referencia

```ts
const SOCIAL = {
  width: 1080, height: 1920,
  safe: {top: 280, right: 180, bottom: 680, left: 80},
  graphicTop: 380, graphicBottom: 1056,
  captionTop: 1100, captionHeight: 140,
  captionFont: 54, captionLineHeight: 1.08,
};
```

Estos valores protegen el header, el área central de lectura y la interfaz inferior de Reels. Ajustalos sólo si el proyecto tiene medición propia; si cambiás el área de captions, actualizá el piso de slots y el checker juntos.

## Alineación DTW

Whisper.cpp emite `t_dtw` como el momento aproximado en que se produce un token. Para agruparlo en palabras, ordená los tokens de texto, ignorá tokens especiales y usá el último `t_dtw` del grupo como final de palabra. El inicio es el final anterior, limitado por el inicio convencional del segmento para no absorber silencios. Distribuí marcas finales iguales entre las palabras del grupo. Guardá el JSON crudo y un `alignment.json` derivado; no sobreescribas `words.json` generado por otra etapa.

La documentación de Whisper declara que `t_dtw` sólo debe usarse cuando se calcularon timestamps DTW. La implementación de referencia agrupa tokens por espacios y usa la marca DTW final de cada palabra; esa misma convención evita los saltos de karaoke observados en la primera pasada.

## Audio y publicación

Medí el programa completo, no un fragmento. Mantén la mezcla original salvo la ganancia necesaria para −18/−19 LUFS. Exportá color Rec.709 explícito y `yuv420p` para compatibilidad móvil. Verificá con `ffprobe` que el resultado sea 1080×1920, 30 fps, AAC 48 kHz, duración igual a la voz y sin frames negros no intencionales.

## Checklist visual

- El logo y el header se mantienen dentro del margen superior.
- El gráfico principal nunca entra en el área de captions.
- Hay una sola palabra activa y el resaltado se apaga al terminar su intervalo.
- Cada recurso declara `didactico` o `refuerzo` y el crédito de una recreación queda visible cuando corresponde.
- El cierre tiene CTA legible sin depender de texto en el tercio inferior.
- La hoja de contacto se mira a tamaño de teléfono antes de publicar.
