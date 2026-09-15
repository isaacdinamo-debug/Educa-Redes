# EducaPlay Redes

Skill de Codex para producir reels verticales de EducaPlay en Remotion. El paquete vive en [`educaplay-redes/`](educaplay-redes/) y no incluye masters ni salidas pesadas.

Incluye un proyecto Remotion funcional en [`educaplay-redes/remotion/`](educaplay-redes/remotion/), preparado para la variante editorial `open` (sin marco):

```bash
cd educaplay-redes/remotion
npm install
mkdir -p public/media/resources
# copiar el máster como public/media/master.mp4
npm run check
npm run render:sample
```

El proyecto conserva el máster como fondo, usa subtítulos con resaltado palabra por palabra y deja el área de captions sobre una cápsula clara para lectura móvil. Los archivos pesados permanecen fuera del repositorio; el `.gitkeep` marca la carpeta de entrada.
