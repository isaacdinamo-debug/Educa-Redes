# Estética de los reels: la plataforma Educaplay en 9:16

Los reels usan la misma estética que los capítulos del repo `EducaPlay-After-Effects`: la de la web
de Educaplay (Corrientes Play), nivel secundario. Es la única. La aplica `ae/build-reel.jsx`.

## Escenario (`ESCENARIO` en `scripts/lib/comun.mjs`)

| Zona | Medidas (px) | Para qué |
|---|---|---|
| Lienzo | 1080 × 1920, 25 fps | |
| Zonas seguras | y 280–1650, x 90–940 | Fuera de ahí tapan el header, la descripción, la barra y los botones de la app |
| Caja de la tarjeta | x 90, y 300, 840 × 760 | La escena se centra adentro |
| Banda de subtítulos | x 90, y 1090, 840 × 200 | La pastilla se centra en ella |

## Colores (medidos sobre la web)

| Uso | Color | Control en `CONTROL` |
|---|---|---|
| Bandas | cian `#5DCBE1`, rojo `#EA3355`, amarillo `#F5C042`, verde `#54B835` | Banda cian / roja / amarilla / verde |
| Tarjeta oscura | `#3B3B3E` | Oscuro |
| Baldosa clara | `#F0F0F0` | Gris |
| Tinta | `#201D2F` | Tinta |
| Menta (subrayado, flecha, botón, palabra activa) | `#6CEACB` | Menta |

Tipografía: **Museo Sans Rounded** (1000 en el número gigante, 900 en títulos, 700 en textos y
subtítulos). La marca, **Educaplay**, va en **Museo 700** como el logo.

## Escenas (`kind` en `data.ts`)

Todas arrancan con la **cabecera**: tarjeta oscura con la franja de 4 colores (se dibuja de izquierda
a derecha), kicker menta en mayúsculas, título blanco y subrayado menta con la flecha ↓. Debajo, una
**baldosa gris** según el tipo:

- **`numero`**: un reloj de cuatro arcos de banda se traza y la aguja gira; cuando la voz dice el
  número, el reloj se corre y entra el número gigante con su unidad.
- **`medio`**: foto, GIF o video. Apaisado ocupa el ancho (la foto con un Ken Burns suave).
  Vertical va a un costado, con el metadato del recurso («ANIMACIÓN», «VIDEO») como en las filas de
  la web y, si hay `note`, una pastilla menta que entra con la voz.
- **`opciones`**: 2 o 3 baldosas que entran con un pop cuando la voz las nombra; la `marked` va en
  menta. Filetes de color cian, amarillo, verde: el rojo se lee como error.
- **`cierre`**: texto de apoyo y el botón menta con la flecha ↓, como «Descargá la APP» en la web.

## Movimiento

- Cada escena **sube** desde abajo con `easeOutBack`; `Rebote (%)` en 0 lo apaga.
- En cada cambio de escena, un **barrido de bandas diagonales** (el encabezado de la web) cruza la
  caja de la tarjeta y tapa el cambio. La tarjeta nueva entra 8 frames después.

## Subtítulos con karaoke

- Pastilla canónica: scrim negro al 55 %, esmerilado de 10 px, borde blanco al 16 %, filete y sombra.
- Museo Sans Rounded 700, 56 px, blanca; como mucho dos líneas, corte balanceado.
- **La palabra que se está diciendo va en tinta sobre una pastilla menta.** Nunca hay dos.
- Una capa de texto por página: se corrige con doble clic. El timing de cada palabra está en la
  expresión del animador «Palabra activa» y en la capa `RESALTADO NN`.

## Capa `CONTROL`

| Control | Qué hace |
|---|---|
| Colores | Gris, Oscuro, Tinta, Menta y las 4 bandas |
| `Entrada (frames)` / `Salida (frames)` | Duración de la entrada y la salida de cada escena |
| `Deslizamiento (px)` | Distancia desde la que sube la escena |
| `Rebote (%)` | Sobrepaso de la entrada (0 = sin rebote) |
| `Sombra (%)` | Opacidad de la sombra de las tarjetas |
| `Subtítulos` | Prende o apaga los subtítulos |
| `Karaoke` | Prende o apaga el resaltado de la palabra activa |

La capa `GUIA · zonas seguras` (guía, no se renderiza) marca en rojo lo que tapa la interfaz.

## Variante editorial

Salió de la auditoría de diseño del 7/10/2026. Misma marca, misma paleta y misma familia Museo, con
criterio de página: **el reel es una página que se transforma**. Convive con el armado clásico; no
lo reemplaza.

```bash
npm run export:ae -- <CODE> --editorial   # manifest.editorial.json (subtítulos repaginados)
npm run ae        -- <CODE> --editorial   # <CODE>-editorial.aep y revision-editorial/
npm run render    -- <CODE> --editorial   # render/<CODE>-editorial.mp4
```

| | Clásico | Editorial |
|---|---|---|
| Superficie | tarjeta oscura + baldosas, con radio y sombra | **una página** oscura fija, x 90–930, y 300–1310, sin radio ni sombra |
| Titulares | Museo Sans Rounded 900 | **Museo 700**, la slab del logo; 108 px que se achica hasta 80 si no entra |
| Cabecera | — | nombre corto del capítulo (`short`) y folio «03 / 07» |
| Recursos | en baldosa gris con marco | foto a sangre con pie y fuente; GIF sobre bloque gris; vertical con destacado |
| Opciones | baldosas con pop | renglones con filete que se escriben con la voz |
| Bandas | en cada escena y en los barridos | sólo en la apertura y en el cierre |
| Cambio de escena | barrido de 4 bandas | el contenido se funde y el nuevo se revela línea a línea |
| Karaoke | tinta sobre pastilla menta | palabra en **menta, subrayada** |
| Subtítulos | las páginas de `captions.json`, en y 1090–1290 | fundidas hasta durar 1 s o más, en y 1390–1560 |

Campos de `data.ts` que sólo usa esta variante: `short` (reel), `pie` y `fuente` (medio), `detalle`
y `pie` (numero), `note.label`. La geometría está en `ESCENARIO.editorial`.

En `CONTROL` quedan los colores, `Entrada`, `Salida`, `Subtítulos` y `Karaoke`. No hay
deslizamiento, rebote ni sombra.
