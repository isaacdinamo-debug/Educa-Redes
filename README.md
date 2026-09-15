# EducaPlay Redes

Skill para producir **reels verticales educativos (1080×1920)** en Remotion para el ecosistema de **EducaPlay Secundaria (Corrientes)**.

El paquete del skill y el proyecto de referencia funcional viven en [`educaplay-redes/`](educaplay-redes/).

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

## Flujo de Trabajo Rápido

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
