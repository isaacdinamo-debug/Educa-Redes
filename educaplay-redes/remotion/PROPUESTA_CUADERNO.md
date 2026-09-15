# Cuaderno ilustrado — prueba de movimiento

Propuesta independiente de 15 segundos para comparar con el prototipo aprobado.
Mantiene Museo, el fondo y audio originales, la franja de cuatro colores y los
recursos completos. Se desarrolla en Remotion, a 1080×1920 y 25 fps.

## Referencias y decisiones

- Se consultó la [plataforma oficial de EducaPlay](https://www.corrientesplay.edu.ar/educaplay/buscar)
  y la [presentación del Ministerio de Educación de Corrientes](https://www.mec.gob.ar/educa-play/)
  para identificar la marca correcta. No se atribuye a esas páginas una animación que no se pudo reproducir.
- La dirección visual parte de los materiales locales vistos: fondo verde con textura
  de papel y dibujos de naturaleza, mochila ilustrada y marco multicolor aprobado.
- La propuesta de hojas deslizantes, reloj multicolor y líneas trazadas es una
  exploración propia, no una cortina oficial reproducida.

## Movimiento

1. El papel se acomoda con un desplazamiento breve. Las cuatro tintas entran por segmentos.
2. Un reloj se traza con la misma paleta; al decir «cinco» se transforma en el número.
3. La siguiente hoja revela la pregunta y la mochila original; una línea curva las relaciona.
4. La fotografía de tormenta conserva su encuadre completo y la lluvia mantiene su formato vertical.

Una hoja opaca cubre la anterior durante la transición; los titulares no se funden
entre sí. Los subtítulos permanecen en una banda estable próxima al centro y
mantienen el resaltado de la palabra activa. Las dimensiones de la nueva tarjeta
están en `src/notebook-layout.ts`; la composición aprobada conserva su layout.

## Reproducción

```sh
npm run check -- --notebook
npm run render:cuaderno
ffmpeg -i out/cuaderno-15s/render.mp4 -i public/media/master.mp4 -map 0:v:0 -map 1:a:0 -c copy -t 15 -movflags +faststart out/cuaderno-15s/propuesta-cuaderno-15s.mp4
```

El último paso copia la pista del máster sin recodificarla. Es una muestra de los
primeros 15 segundos, no un montaje con un cierre editorial nuevo.
