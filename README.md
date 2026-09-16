# EducaPlay Redes

Skill para producir **reels verticales educativos (1080×1920)** en Remotion para el ecosistema de **EducaPlay Secundaria (Corrientes)**.

El paquete del skill y el proyecto de referencia funcional viven en [`educaplay-redes/`](educaplay-redes/).

## Variante elegida: estilo cuaderno

Isaac eligió la muestra **Estilo cuaderno · 15 segundos** el 16 de septiembre de 2026 como referencia visual para continuar el trabajo. La composición es `EducaPlayCuaderno`, implementada en `src/Notebook.tsx`. La selección corresponde a esta muestra de 15 segundos; el reel completo sigue siendo una composición independiente.

Para revisar y reproducir la variante elegida:

```bash
cd educaplay-redes/remotion
npm install
# Preparar el máster y los recursos locales indicados en src/data.ts y src/layout.ts.
npm run check -- --notebook
npm run render:cuaderno
ffmpeg -i out/cuaderno-15s/render.mp4 -i public/media/master.mp4 -map 0:v:0 -map 1:a:0 -c copy -t 15 -movflags +faststart out/cuaderno-15s/propuesta-cuaderno-15s.mp4
```

El resultado es `out/cuaderno-15s/propuesta-cuaderno-15s.mp4`, con el audio original del máster. Consultar [las decisiones visuales y de movimiento](educaplay-redes/remotion/PROPUESTA_CUADERNO.md). Los medios de entrada y el video renderizado se conservan localmente y no se incluyen en Git.

---

## Estructura del Repositorio

- **`educaplay-redes/SKILL.md`**: Definición de la habilidad, reglas de oro, zonas seguras y guías editoriales.
- **`educaplay-redes/references/production-contract.md`**: Contrato técnico de layout, tipos TypeScript, tipografía y checklist.
- **`educaplay-redes/agents/openai.yaml`**: Metadatos de interfaz para Codex / Antigravity.
- **`educaplay-redes/remotion/`**: Proyecto Remotion completamente funcional y reproducible:
  - Subtítulos estilo karaoke sincronizados palabra por palabra con Whisper DTW.
  - Sonda DOM automática (`__EDUCA_QA__`) para control de calidad estricto de geometría, fuentes y textos.
  - Tipografías institucionales Museo Display, Museo Text y Museo Light incluidas en `public/fonts/`.

---

## Flujo del reel completo y prototipo anterior

```bash
cd educaplay-redes/remotion

# 1. Instalar dependencias
npm install

# 2. Asegurar carpeta de medios y máster
mkdir -p public/media/resources
# Copiar el máster vertical como public/media/master.mp4

# 3. Comprobación de QA automática (60 fotogramas clave)
npm run check

# 4. Renderizado de muestra rápida (primeros 15 segundos)
npm run render:sample

# 5. Renderizado final del reel completo (1080×1920 @ 25 fps)
npm run render
```

Los archivos pesados de producción (másters crudos y renders `.mp4`) permanecen fuera del repositorio según el [`.gitignore`](.gitignore); la carpeta `public/media/resources/.gitkeep` preserva la estructura de entrada para nuevos episodios.
