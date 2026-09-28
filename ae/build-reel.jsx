/**
 * build-reel.jsx — arma un reel vertical de Educaplay en After Effects.
 *
 *   npm run export:ae -- <CODE>
 *   npm run ae -- <CODE>
 *
 * `npm run ae` (ae/run.mjs) lo evalúa y le pasa el manifiesto en
 * $.global.EDUCAPLAY_MANIFEST. A mano: AE → File → Scripts → Run Script File…
 * → este archivo; si hay un solo reel en reels/ lo toma, y si hay varios
 * pregunta cuál.
 *
 * Con `reels/<CODE>/manifest.json` construye un proyecto nuevo:
 *
 *   00_CONTROL     la capa CONTROL de la comp principal: colores de la web,
 *                  entrada/salida, deslizamiento, rebote, sombra, subtítulos
 *                  y karaoke
 *   01_MASTER      el máster (plató y voz)
 *   02_ESCENAS     una precomp por escena, <kind>_<key>
 *   03_ASSETS      fotos, videos y GIF (llegan como .mov con alfa)
 *   04_SUBTITULOS  la precomp SUBTITULOS
 *
 * La caja de la tarjeta y la banda de subtítulos NO se deciden acá: vienen en
 * manifest.stage (scripts/lib/comun.mjs, ESCENARIO). Este script pone en
 * escena, con la estética de la plataforma Educaplay (docs/ESTETICA.md).
 *
 * Todo lo que se agrega por scripting usa matchNames, no nombres visibles:
 * funciona igual con AE en español o en inglés. ExtendScript es ES3: sin
 * let/const, sin arrow functions, sin Array.map, sin JSON.
 */
var LOG = [];
function log(m) { LOG.push(m); $.writeln(m); }

function buildReel() {
  // ───────────────────────────────────────────────────────────── utilidades
  function readJSON(file) {
    file.encoding = 'UTF-8';
    if (!file.open('r')) throw new Error('No pude abrir ' + file.fsName);
    var txt = file.read();
    file.close();
    // ES3 no trae JSON. El manifiesto lo genera nuestro propio exportador.
    return eval('(' + txt + ')');
  }

  function hex(h, a) {
    h = h.replace('#', '');
    return [
      parseInt(h.substr(0, 2), 16) / 255,
      parseInt(h.substr(2, 2), 16) / 255,
      parseInt(h.substr(4, 2), 16) / 255,
    ].concat(a === undefined ? [] : [a]);
  }

  function sec(frames) { return frames / FPS; }

  /** Paso "de lujo": si falla, se anota con ⚠ y el reel sigue. La estructura no va acá. */
  function soft(label, fn) {
    try { return fn(); } catch (e) { log('⚠ ' + label + ': ' + e.toString() + ' (línea ' + e.line + ')'); }
    return null;
  }

  var EASE_IN = 25, EASE_OUT = 75;

  /** Keyframes con ease. Cuántos KeyframeEase pide cada propiedad no se deduce de su tipo: se prueba 1, 2 y 3. */
  function keys(prop, times, values) {
    for (var i = 0; i < times.length; i++) prop.setValueAtTime(times[i], values[i]);
    for (var k = 1; k <= prop.numKeys; k++) {
      for (var n = 1; n <= 3; n++) {
        var easeOut = [], easeIn = [];
        for (var d = 0; d < n; d++) {
          easeIn.push(new KeyframeEase(0, EASE_IN));
          easeOut.push(new KeyframeEase(0, EASE_OUT));
        }
        try { prop.setTemporalEaseAtKey(k, easeIn, easeOut); break; } catch (e) { /* siguiente n */ }
      }
    }
  }

  // ─────────────────────────────────────────────────────────── el manifiesto
  var manifestFile = null;
  if ($.global.EDUCAPLAY_MANIFEST) {
    manifestFile = File($.global.EDUCAPLAY_MANIFEST);
    $.global.EDUCAPLAY_MANIFEST = undefined;
    if (!manifestFile.exists) throw new Error('No existe el manifiesto ' + manifestFile.fsName);
  } else {
    var found = [];
    var base = Folder(File($.fileName).parent.parent.fsName + '/reels');
    var dirs = base.exists ? base.getFiles(function (f) { return f instanceof Folder; }) : [];
    for (var di = 0; di < dirs.length; di++) {
      var mf = File(dirs[di].fsName + '/manifest.json');
      if (mf.exists) found.push(mf);
    }
    if (found.length === 1) manifestFile = found[0];
    else manifestFile = File.openDialog('Elegí el manifest.json del reel', 'JSON:*.json');
  }
  if (!manifestFile) return;

  var M = readJSON(manifestFile);
  var ROOTDIR = manifestFile.parent;
  var FPS = M.fps, W = M.width, H = M.height;
  var MAIN = M.code;
  var WEB = M.palette;
  var FONTS = M.fonts;
  var STAGE = M.stage;
  var RAINBOW = [WEB.cian, WEB.rojo, WEB.amarillo, WEB.verde];
  log('▶ ' + MAIN + ' · ' + M.scenes.length + ' escenas · ' + M.captions.length + ' subtítulos');

  app.beginUndoGroup('Educaplay Redes · ' + MAIN);
  if (app.project && app.project.numItems > 0) {
    if (!app.newProject()) return; // el usuario canceló el "¿guardar cambios?"
  }
  var proj = app.project;
  proj.bitsPerChannel = 8;

  var F = {
    control: proj.items.addFolder('00_CONTROL'),
    master: proj.items.addFolder('01_MASTER'),
    escenas: proj.items.addFolder('02_ESCENAS'),
    assets: proj.items.addFolder('03_ASSETS'),
    subs: proj.items.addFolder('04_SUBTITULOS'),
  };

  var footageCache = {};
  function footage(rel) {
    if (footageCache[rel]) return footageCache[rel];
    var f = File(ROOTDIR.fsName + '/' + rel);
    if (!f.exists) throw new Error('Falta ' + f.fsName);
    var it = proj.importFile(new ImportOptions(f));
    it.parentFolder = F.assets;
    footageCache[rel] = it;
    return it;
  }

  // ─────────────────────────────────────────────────────── comp principal
  var main = proj.items.addComp(MAIN, W, H, 1, sec(M.duration), FPS);
  main.motionBlur = true;
  main.shutterAngle = 180;
  main.bgColor = hex(WEB.oscuro);

  var masterItem = footage(M.master);
  masterItem.parentFolder = F.master;
  var masterLayer = main.layers.add(masterItem);
  masterLayer.name = 'MASTER · plató y voz';

  // Las expresiones apuntan acá. Los parámetros se leen por ÍNDICE —(1)— y
  // los efectos por nombre propio (no traducible): no depende del idioma de AE.
  var CTRL_REF = 'comp("' + MAIN + '").layer("CONTROL")';
  var ctrl = main.layers.addNull(sec(M.duration));
  ctrl.name = 'CONTROL';
  ctrl.label = 9;
  ctrl.source.parentFolder = F.control;
  var fx = ctrl.property('ADBE Effect Parade');
  function colorCtl(name, hx) {
    var e = fx.addProperty('ADBE Color Control');
    e.name = name;
    e.property(1).setValue(hex(hx, 1));
  }
  function sliderCtl(name, v) {
    var e = fx.addProperty('ADBE Slider Control');
    e.name = name;
    e.property(1).setValue(v);
  }
  function checkCtl(name, v) {
    var e = fx.addProperty('ADBE Checkbox Control');
    e.name = name;
    e.property(1).setValue(v);
  }
  colorCtl('Gris', WEB.gris);
  colorCtl('Oscuro', WEB.oscuro);
  colorCtl('Tinta', WEB.tinta);
  colorCtl('Menta', WEB.menta);
  colorCtl('Banda cian', WEB.cian);
  colorCtl('Banda roja', WEB.rojo);
  colorCtl('Banda amarilla', WEB.amarillo);
  colorCtl('Banda verde', WEB.verde);
  sliderCtl('Entrada (frames)', 16);
  sliderCtl('Salida (frames)', 8);
  sliderCtl('Deslizamiento (px)', 90);
  sliderCtl('Rebote (%)', 8);
  sliderCtl('Sombra (%)', 22);
  checkCtl('Subtítulos', 1);
  checkCtl('Karaoke', 1);
  var BAND_CTL = ['Banda cian', 'Banda roja', 'Banda amarilla', 'Banda verde'];

  function colorExpr(name) { return CTRL_REF + '.effect("' + name + '")(1)'; }

  // ─────────────────────────────────────────────────── primitivas de forma
  function addRect(layer, x, y, w, h, radius, fillRGB, name) {
    var grp = layer.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
    if (name) grp.name = name;
    var v = grp.property('ADBE Vectors Group');
    var rect = v.addProperty('ADBE Vector Shape - Rect');
    rect.property('ADBE Vector Rect Size').setValue([w, h]);
    rect.property('ADBE Vector Rect Position').setValue([x + w / 2, y + h / 2]);
    rect.property('ADBE Vector Rect Roundness').setValue(radius || 0);
    if (fillRGB) {
      var fill = v.addProperty('ADBE Vector Graphic - Fill');
      fill.property('ADBE Vector Fill Color').setValue(fillRGB);
    }
    return grp;
  }
  function addEllipse(layer, cx, cy, d, fillRGB, name) {
    var grp = layer.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
    if (name) grp.name = name;
    var v = grp.property('ADBE Vectors Group');
    var el = v.addProperty('ADBE Vector Shape - Ellipse');
    el.property('ADBE Vector Ellipse Size').setValue([d, d]);
    el.property('ADBE Vector Ellipse Position').setValue([cx, cy]);
    if (fillRGB) {
      var fill = v.addProperty('ADBE Vector Graphic - Fill');
      fill.property('ADBE Vector Fill Color').setValue(fillRGB);
    }
    return grp;
  }
  function addPath(layer, pts, closed, name) {
    var grp = layer.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
    if (name) grp.name = name;
    var sh = grp.property('ADBE Vectors Group').addProperty('ADBE Vector Shape - Group');
    var s = new Shape();
    s.vertices = pts;
    s.closed = !!closed;
    sh.property('ADBE Vector Shape').setValue(s);
    return grp;
  }
  function addStroke(grp, rgb, width) {
    var st = grp.property('ADBE Vectors Group').addProperty('ADBE Vector Graphic - Stroke');
    st.property('ADBE Vector Stroke Color').setValue(rgb);
    st.property('ADBE Vector Stroke Width').setValue(width);
    soft('stroke cap', function () { st.property('ADBE Vector Stroke Line Cap').setValue(2); });
    return st;
  }
  function fillOf(grp) {
    var v = grp.property('ADBE Vectors Group');
    for (var i = 1; i <= v.numProperties; i++) {
      if (v.property(i).matchName === 'ADBE Vector Graphic - Fill') return v.property(i);
    }
    return null;
  }
  function linkFill(grp, ctl) {
    var f = fillOf(grp);
    if (f) soft('color vinculado', function () {
      f.property('ADBE Vector Fill Color').expression = colorExpr(ctl);
    });
  }
  function linkStroke(st, ctl) {
    soft('trazo vinculado', function () { st.property('ADBE Vector Stroke Color').expression = colorExpr(ctl); });
  }
  /** Trazo que se dibuja: trim paths de 0 a 100 entre t0 y t1. */
  function drawOn(grp, t0, t1) {
    soft('trim paths', function () {
      var tr = grp.property('ADBE Vectors Group').addProperty('ADBE Vector Filter - Trim');
      keys(tr.property('ADBE Vector Trim End'), [t0, t1], [0, 100]);
    });
  }
  function newShapeLayer(comp, name) {
    var l = comp.layers.addShape();
    l.name = name;
    l.property('ADBE Transform Group').property('ADBE Position').setValue([0, 0]);
    l.property('ADBE Transform Group').property('ADBE Anchor Point').setValue([0, 0]);
    return l;
  }
  /** Sube un grupo de shape al frente: AE agrega los grupos nuevos DEBAJO. */
  function toFront(layer, grp) {
    grp.moveTo(1);
    return layer.property('ADBE Root Vectors Group').property(1);
  }

  // ───────────────────────────────────────────────────────────────── texto
  function styleText(layer, o) {
    var p = layer.property('ADBE Text Properties').property('ADBE Text Document');
    var td = p.value;
    td.resetCharStyle();
    td.resetParagraphStyle();
    td.font = o.font;
    td.fontSize = o.size;
    td.applyFill = true;
    td.fillColor = o.color;
    td.applyStroke = false;
    td.tracking = o.tracking || 0;
    if (o.leading) { td.autoLeading = false; td.leading = o.leading; }
    td.justification = o.center ? ParagraphJustification.CENTER_JUSTIFY : ParagraphJustification.LEFT_JUSTIFY;
    p.setValue(td);
  }
  function setText(layer, str) {
    var p = layer.property('ADBE Text Properties').property('ADBE Text Document');
    var td = p.value;
    td.text = str;
    p.setValue(td);
  }
  function rectOf(layer) { return layer.sourceRectAtTime(0, false); }

  /** Corte greedy por palabras, midiendo con la fuente real dentro de AE. */
  function wrap(layer, str, maxW) {
    var words = str.split(/\s+/);
    var lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var next = cur ? cur + ' ' + words[i] : words[i];
      setText(layer, next);
      if (cur && rectOf(layer).width > maxW) {
        lines.push(cur);
        cur = words[i];
      } else cur = next;
    }
    if (cur) lines.push(cur);
    setText(layer, lines.join('\r'));
    return lines.length;
  }

  /**
   * Capa de texto con su esquina superior izquierda VISIBLE en (x, y).
   * Los \n del dato se respetan; si no hay, `maxW` activa el corte. Si una
   * línea no entra en `maxW`, se anota con ⚠: el chequeo de run.mjs falla.
   */
  function text(comp, str, x, y, o) {
    var l = comp.layers.addText(str);
    l.name = o.name || str.substr(0, 28);
    styleText(l, o);
    if (str.indexOf('\n') >= 0) setText(l, str.replace(/\n/g, '\r'));
    else if (o.maxW) wrap(l, str, o.maxW);
    var r = rectOf(l);
    if (o.maxW && r.width > o.maxW + 1) log('⚠ texto que no entra (' + Math.round(r.width) + ' > ' + o.maxW + ' px): ' + str.replace(/\n/g, ' '));
    var t = l.property('ADBE Transform Group');
    t.property('ADBE Anchor Point').setValue([r.left, r.top]);
    t.property('ADBE Position').setValue([x, y]);
    return {layer: l, h: r.height, w: r.width};
  }

  /** Revelado por carácter (o palabra): opacidad y subida, de izquierda a derecha. */
  function revealChars(layer, t0, dur, basedOnWords) {
    soft('animador de texto', function () {
      var anims = layer.property('ADBE Text Properties').property('ADBE Text Animators');
      var an = anims.addProperty('ADBE Text Animator');
      an.name = 'Revelado';
      var props = an.property('ADBE Text Animator Properties');
      props.addProperty('ADBE Text Opacity').setValue(0);
      props.addProperty('ADBE Text Position 3D').setValue([0, 26, 0]);
      var sel = an.property('ADBE Text Selectors').addProperty('ADBE Text Selector');
      var adv = sel.property('ADBE Text Range Advanced');
      soft('basado en palabras', function () {
        if (basedOnWords) adv.property('ADBE Text Range Type2').setValue(3);
      });
      keys(sel.property('ADBE Text Percent Start'), [t0, t0 + dur], [0, 100]);
    });
  }

  function fadeIn(layer, t0, dur, rise) {
    var t = layer.property('ADBE Transform Group');
    keys(t.property('ADBE Opacity'), [t0, t0 + dur], [0, 100]);
    if (rise) {
      var p = t.property('ADBE Position');
      var v = p.value;
      keys(p, [t0, t0 + dur], [[v[0], v[1] + rise], v]);
    }
  }

  /** Pop con un leve sobrepaso alrededor de (cx, cy), sin mover nada de lugar. */
  function pop(layers, cx, cy, t0) {
    for (var i = 0; i < layers.length; i++) {
      var t = layers[i].property('ADBE Transform Group');
      var a = t.property('ADBE Anchor Point').value, p = t.property('ADBE Position').value;
      t.property('ADBE Anchor Point').setValue([a[0] + (cx - p[0]), a[1] + (cy - p[1])]);
      t.property('ADBE Position').setValue([cx, cy]);
      keys(t.property('ADBE Scale'), [t0, t0 + sec(9), t0 + sec(14)], [[0, 0], [106, 106], [100, 100]]);
    }
  }

  // ─────────────────────────────────────────── primitivas de la plataforma
  var RADIUS = 18;
  var STRIP = [0.14, 0.42, 0.33, 0.11]; // proporciones de la franja de la web

  /** Baldosa gris plana, como los botones "1° AÑO" de la web. */
  function grayTile(comp, x, y, w, h, name) {
    var l = newShapeLayer(comp, name || 'BALDOSA · gris');
    linkFill(addRect(l, x, y, w, h, RADIUS, hex(WEB.gris), 'gris'), 'Gris');
    l.moveToEnd();
    return l;
  }

  /** Franja de 4 colores que se dibuja de izquierda a derecha. */
  function bandStrip(comp, x, y, w, h, t0) {
    var l = newShapeLayer(comp, 'FRANJA · bandas');
    var xx = x;
    for (var i = 0; i < 4; i++) {
      var sw = Math.round(w * STRIP[i]) + (i < 3 ? 1 : 0);
      linkFill(addRect(l, xx, y, sw, h, 0, hex(RAINBOW[i]), 'banda ' + (i + 1)), BAND_CTL[i]);
      xx += Math.round(w * STRIP[i]);
    }
    var t = l.property('ADBE Transform Group');
    t.property('ADBE Anchor Point').setValue([x, y]);
    t.property('ADBE Position').setValue([x, y]);
    keys(t.property('ADBE Scale'), [t0, t0 + sec(14)], [[0, 100], [100, 100]]);
    return l;
  }

  /** Tarjeta oscura de los listados de la web, con la franja arriba recortada a sus esquinas. */
  function darkCard(comp, x, y, w, h) {
    var l = newShapeLayer(comp, 'TARJETA · oscura');
    linkFill(addRect(l, x, y, w, h, RADIUS, hex(WEB.oscuro), 'oscuro'), 'Oscuro');
    var strip = bandStrip(comp, x, y, w, 10, sec(2));
    l.moveToEnd();
    strip.moveBefore(l);
    soft('recorte de franja', function () {
      var m = l.duplicate();
      m.name = 'MATTE · franja';
      m.moveBefore(strip);
      strip.setTrackMatte(m, TrackMatteType.ALPHA);
      m.enabled = false;
    });
    return l;
  }

  function mintStroke(grp, w) {
    var st = addStroke(grp, hex(WEB.menta), w);
    linkStroke(st, 'Menta');
    soft('unión redonda', function () { st.property('ADBE Vector Stroke Line Join').setValue(2); });
    return st;
  }

  /** Subrayado menta con la flecha ↓ al final, como las cabeceras de la web. */
  function mintUnderline(comp, x0, x1, y, t0) {
    var l = newShapeLayer(comp, 'SUBRAYADO · menta');
    var g = addPath(l, [[x0, y], [x1, y]], false, 'línea');
    mintStroke(g, 3);
    drawOn(g, t0, t0 + sec(16));
    var s = 30, ax = x1 + 26, ay = y - 14;
    var a1 = addPath(l, [[ax, ay - s / 2], [ax, ay + s / 2]], false, 'flecha');
    mintStroke(a1, 4);
    drawOn(a1, t0 + sec(10), t0 + sec(18));
    var a2 = addPath(l, [[ax - s * 0.36, ay + s * 0.12], [ax, ay + s / 2], [ax + s * 0.36, ay + s * 0.12]], false, 'punta');
    mintStroke(a2, 4);
    drawOn(a2, t0 + sec(14), t0 + sec(22));
    return l;
  }

  /**
   * Barrido de bandas diagonales, como el encabezado de la web: cuatro capas
   * inclinadas, desfasadas 2 cuadros. A mitad de camino cada banda cubre el
   * rect entero, así que un cambio de tarjeta ahí no se ve.
   */
  function diagonalBands(comp, name, t0, t1, rx, ry, rw, rh) {
    var dx = rh * 0.7; // ~35°
    var bodyW = rw + dx + 240;
    var made = [];
    for (var i = 0; i < 4; i++) {
      var l = newShapeLayer(comp, name + ' · banda ' + (i + 1));
      var g = addPath(l, [[0, ry + rh], [dx, ry], [dx + bodyW, ry], [bodyW, ry + rh]], true, 'banda');
      var f = g.property('ADBE Vectors Group').addProperty('ADBE Vector Graphic - Fill');
      f.property('ADBE Vector Fill Color').setValue(hex(RAINBOW[i]));
      linkFill(g, BAND_CTL[i]);
      var lag = sec(2 * i);
      var mid = rx + (rw - bodyW - dx) / 2;
      keys(l.property('ADBE Transform Group').property('ADBE Position'),
        [t0 + lag, (t0 + t1) / 2 + lag, t1 + lag], [[rx - bodyW - dx - 40, 0], [mid, 0], [rx + rw + 40, 0]]);
      l.motionBlur = true;
      l.inPoint = Math.max(0, t0 + lag);
      l.outPoint = t1 + lag + sec(1);
      made.push(l);
    }
    return made;
  }

  /** Ícono de línea chico para los metadatos de un recurso (hoja, play, destello). */
  function metaIcon(comp, kind, x, y, s) {
    var l = newShapeLayer(comp, 'META · ' + kind);
    var c = hex(WEB.meta);
    if (kind === 'recurso') {
      addStroke(addRect(l, x, y, s * 0.8, s, 2, null, 'hoja'), c, 2.5);
      addStroke(addPath(l, [[x + s * 0.2, y + s * 0.4], [x + s * 0.6, y + s * 0.4]], false, 'l1'), c, 2.5);
      addStroke(addPath(l, [[x + s * 0.2, y + s * 0.65], [x + s * 0.6, y + s * 0.65]], false, 'l2'), c, 2.5);
    } else if (kind === 'animacion') {
      addStroke(addPath(l, [[x, y], [x + s * 0.85, y + s / 2], [x, y + s]], true, 'play'), c, 2.5);
    } else {
      var m = s / 2, cx = x + m, cy = y + m;
      addStroke(addPath(l, [[cx, y], [cx + m * 0.25, cy - m * 0.25], [x + s, cy], [cx + m * 0.25, cy + m * 0.25],
        [cx, y + s], [cx - m * 0.25, cy + m * 0.25], [x, cy], [cx - m * 0.25, cy - m * 0.25]], true, 'destello'), c, 2.5);
    }
    return l;
  }

  /** Medio (foto/video/gif) recortado en un rect redondeado con track matte. */
  function mediaIn(comp, s, x, y, w, h, fit, kenBurns) {
    var item = footage(s.media);
    var l = comp.layers.add(item);
    l.name = 'MEDIO · ' + s.media.replace(/^(media\/recursos|assets)\//, '');
    if (l.hasAudio) l.audioEnabled = false;
    // Un .mov de GIF (o un video corto) dura lo suyo: se loopea hasta cubrir la escena.
    if (item.mainSource && item.duration && item.duration < comp.duration) {
      soft('loop', function () { item.mainSource.loop = Math.ceil(comp.duration / item.duration) + 1; });
      l.outPoint = comp.duration;
    }
    var cover = Math.max(w / item.width, h / item.height) * 100;
    var contain = Math.min(w / item.width, h / item.height) * 100;
    var sc = fit === 'contain' ? contain : cover;
    var t = l.property('ADBE Transform Group');
    t.property('ADBE Position').setValue([x + w / 2, y + h / 2]);
    if (kenBurns) keys(t.property('ADBE Scale'), [0, comp.duration], [[sc * 1.02, sc * 1.02], [sc * 1.09, sc * 1.09]]);
    else t.property('ADBE Scale').setValue([sc, sc]);

    var matte = newShapeLayer(comp, 'MATTE · ' + l.name);
    addRect(matte, x, y, w, h, RADIUS - 6, [1, 1, 1]);
    matte.moveBefore(l);
    l.setTrackMatte(matte, TrackMatteType.ALPHA);
    return {layer: l, matte: matte, w: item.width * sc / 100, h: item.height * sc / 100};
  }

  /** Pastilla de crédito ("Imágenes ilustrativas") sobre la esquina del medio. */
  function creditPill(comp, str, right, bottom, t0) {
    var tx = text(comp, str, 0, 0, {name: 'CRÉDITO', font: FONTS.texto, size: 20, color: [1, 1, 1]});
    var px = 14, py = 8;
    var x = right - tx.w - px * 2 - 12, y = bottom - tx.h - py * 2 - 12;
    tx.layer.property('ADBE Transform Group').property('ADBE Position').setValue([x + px, y + py]);
    var pill = newShapeLayer(comp, 'CRÉDITO · pastilla');
    addRect(pill, x, y, tx.w + px * 2, tx.h + py * 2, 999, hex(WEB.tinta));
    pill.property('ADBE Transform Group').property('ADBE Opacity').setValue(75);
    pill.moveAfter(tx.layer);
    fadeIn(tx.layer, t0, sec(10));
    fadeIn(pill, t0, sec(10));
  }

  // ─────────────────────────────────────────────────── escenas
  var CW = STAGE.tarjeta.width, CH = STAGE.tarjeta.height;
  var P = 36;       // relleno interior de la tarjeta oscura
  var GAP = 18;     // entre la cabecera y la baldosa
  var INNER = 16;   // borde de la baldosa alrededor del medio

  /**
   * Cabecera: tarjeta oscura con la franja de 4 colores, kicker menta, título
   * blanco y subrayado menta con la flecha ↓. Devuelve su alto.
   */
  function header(comp, s, big) {
    var y = 10 + P;
    var k = text(comp, s.kicker, P, y, {name: 'KICKER', font: FONTS.texto, size: 28, color: hex(WEB.menta), tracking: 120, maxW: CW - P * 2});
    revealChars(k.layer, sec(3), sec(12), false);
    y += k.h + 16;
    var size = big ? 88 : 74;
    var title = text(comp, s.title, P, y, {
      name: 'TÍTULO', font: FONTS.titulo, size: size, leading: Math.round(size * 1.1),
      color: [1, 1, 1], maxW: CW - P * 2 - 60,
    });
    revealChars(title.layer, sec(6), sec(16), true);
    y += title.h + 24;
    mintUnderline(comp, P, CW - P - 60, y, sec(12));
    y += 10 + P;
    darkCard(comp, 0, 0, CW, y);
    return y;
  }

  var BUILD = {};

  /** El reloj de bandas se dibuja, la aguja gira y, al decir el número, el reloj se corre y entra el número. */
  BUILD.numero = function (comp, s, top) {
    var th = 300;
    grayTile(comp, 0, top, CW, th);
    var at = sec(s.at - s.from);
    var D = 220, R = D / 2;
    var clock = newShapeLayer(comp, 'RELOJ');
    var cx = 0, cy = 0;
    // Cuatro arcos, uno por banda, que se trazan en sucesión.
    for (var i = 0; i < 4; i++) {
      var arc = addEllipse(clock, cx, cy, D, null, 'arco ' + (i + 1));
      var st = addStroke(arc, hex(RAINBOW[i]), 12);
      linkStroke(st, BAND_CTL[i]);
      (function (grp, idx) {
        soft('arco', function () {
          var tr = grp.property('ADBE Vectors Group').addProperty('ADBE Vector Filter - Trim');
          tr.property('ADBE Vector Trim Start').setValue(idx * 25);
          tr.property('ADBE Vector Trim Offset').setValue(-90);
          keys(tr.property('ADBE Vector Trim End'), [sec(4 + idx * 5), sec(12 + idx * 5)], [idx * 25, idx * 25 + 24]);
        });
      })(arc, i);
    }
    for (var m = 0; m < 12; m++) {
      var a = m * Math.PI / 6;
      var tick = addPath(clock, [[cx + Math.sin(a) * (R - 26), cy - Math.cos(a) * (R - 26)], [cx + Math.sin(a) * (R - 16), cy - Math.cos(a) * (R - 16)]], false, 'marca ' + (m + 1));
      addStroke(tick, hex(WEB.tinta), 4);
    }
    // El eje primero: mover un grupo invalida las referencias a los demás.
    toFront(clock, addEllipse(clock, cx, cy, 18, hex(WEB.tinta), 'eje'));
    var hand = addPath(clock, [[cx, cy + 10], [cx, cy - R + 40]], false, 'aguja');
    addStroke(hand, hex(WEB.tinta), 8);
    hand = toFront(clock, hand);
    // La aguja da vueltas hasta el número y se detiene arriba.
    keys(hand.property('ADBE Vector Transform Group').property('ADBE Vector Rotation'), [sec(4), at], [-720, 0]);
    var ct = clock.property('ADBE Transform Group');
    var left = [P + R + 20, top + th / 2], center = [CW / 2, top + th / 2];
    keys(ct.property('ADBE Position'), [at - sec(4), at + sec(10)], [center, left]);
    keys(ct.property('ADBE Scale'), [0, sec(12)], [[60, 60], [100, 100]]);
    fadeIn(clock, 0, sec(8));

    var num = text(comp, s.value, 0, 0, {name: 'NÚMERO', font: FONTS.numero, size: 230, color: hex(WEB.tinta)});
    var unit = text(comp, s.unit, 0, 0, {name: 'UNIDAD', font: FONTS.titulo, size: 64, color: hex(WEB.tinta)});
    var nx = left[0] + R + 60, ny = top + (th - num.h) / 2;
    num.layer.property('ADBE Transform Group').property('ADBE Position').setValue([nx, ny]);
    unit.layer.property('ADBE Transform Group').property('ADBE Position').setValue([nx + num.w + 22, ny + num.h - unit.h - 4]);
    if (nx + num.w + 22 + unit.w > CW - P) log('⚠ numero ' + s.key + ': «' + s.value + ' ' + s.unit + '» no entra en la baldosa');
    pop([num.layer, unit.layer], nx + num.w / 2, top + th / 2, at);
    return top + th;
  };

  /**
   * Medio en la baldosa gris. Apaisado: ocupa el ancho. Vertical (o casi
   * cuadrado): va a la derecha y la columna izquierda lleva el metadato del
   * recurso y, si hay, la nota que entra con la voz.
   */
  BUILD.medio = function (comp, s, top) {
    var maxH = CH - top;
    var ratio = s.mediaSize[0] / s.mediaSize[1];
    var photo = s.mediaKind === 'photo';
    if (ratio > 1.2) {
      var mw = CW - INNER * 2;
      var mh = Math.min(maxH - INNER * 2, Math.round(mw / ratio));
      var th = mh + INNER * 2;
      grayTile(comp, 0, top, CW, th);
      mediaIn(comp, s, INNER, top + INNER, mw, mh, 'cover', photo);
      if (s.credit) creditPill(comp, s.credit, INNER + mw, top + INNER + mh, sec(14));
      return top + th;
    }
    var th2 = Math.min(maxH, 440);
    var bh = th2 - INNER * 2;
    var bw = Math.min(Math.round(bh * ratio), Math.round(CW * 0.5));
    grayTile(comp, 0, top, CW, th2);
    // Metadatos del recurso abajo a la izquierda, como las filas de la web.
    // Van primero: el medio se ubica según lo que ocupan.
    var metas = [[s.mediaKind === 'photo' ? 'recurso' : 'animacion', s.mediaKind === 'photo' ? 'RECURSO' : (s.mediaKind === 'gif' ? 'ANIMACIÓN' : 'VIDEO')]];
    if (s.credit) metas.push(['ia', s.credit]);
    var colMax = CW - bw - INNER * 2 - P - 24;
    var my = top + th2 - P - metas.length * 36, metaW = 0;
    for (var i = 0; i < metas.length; i++) {
      var ic = metaIcon(comp, metas[i][0], P, my + 3, 24);
      var mt = text(comp, metas[i][1], P + 38, my, {name: 'META ' + (i + 1), font: FONTS.texto, size: 24, color: hex(WEB.meta), tracking: i === 0 ? 80 : 0, maxW: colMax - 38});
      fadeIn(ic, sec(10 + 4 * i), sec(10), 10);
      fadeIn(mt.layer, sec(10 + 4 * i), sec(10), 10);
      metaW = Math.max(metaW, 38 + mt.w);
      my += 36;
    }
    // Sin nota, el medio va al centro (o lo más cerca que dejen los metadatos);
    // con nota, a la derecha y la nota a la izquierda.
    var mx = s.note ? CW - INNER - bw : Math.max(Math.round((CW - bw) / 2), P + metaW + 24);
    mediaIn(comp, s, mx, top + INNER, bw, bh, 'contain', false);
    var colW = colMax;
    if (s.note) {
      var at = sec(s.note.at - s.from);
      var nt = text(comp, s.note.text, 0, 0, {name: 'NOTA', font: FONTS.titulo, size: 60, color: hex(WEB.tinta)});
      var px = 26, py = 14;
      var nw = nt.w + px * 2, nh = nt.h + py * 2;
      if (nw > colW) log('⚠ nota «' + s.note.text + '» más ancha que su columna');
      var nx = P, ny = top + (th2 - nh) / 2 - 30;
      nt.layer.property('ADBE Transform Group').property('ADBE Position').setValue([nx + px, ny + py]);
      var chip = newShapeLayer(comp, 'NOTA · pastilla menta');
      linkFill(addRect(chip, nx, ny, nw, nh, 14, hex(WEB.menta), 'menta'), 'Menta');
      chip.moveAfter(nt.layer);
      pop([chip, nt.layer], nx + nw / 2, ny + nh / 2, at);
    }
    return top + th2;
  };

  /** Opciones en baldosas: cada una entra con un pop cuando la voz la nombra. La marcada va en menta. */
  BUILD.opciones = function (comp, s, top) {
    var n = s.options.length, gap = 18;
    var tw = Math.floor((CW - gap * (n - 1)) / n), th = 190;
    for (var i = 0; i < n; i++) {
      var o = s.options[i];
      var at = sec(o.at - s.from);
      var x = i * (tw + gap);
      var tile = newShapeLayer(comp, 'OPCIÓN · ' + o.text);
      var g = addRect(tile, x, top, tw, th, RADIUS, hex(o.marked ? WEB.menta : WEB.gris), 'baldosa');
      linkFill(g, o.marked ? 'Menta' : 'Gris');
      // Filete de color de banda arriba: cian, amarillo, verde (el rojo se lee como error).
      var bi = [0, 2, 3][i % 3];
      var band = addRect(tile, x + 24, top + 22, 56, 8, 4, hex(RAINBOW[bi]), 'filete');
      linkFill(band, BAND_CTL[bi]);
      toFront(tile, band);
      var tx = text(comp, o.text, 0, 0, {name: 'TEXTO · ' + o.text, font: FONTS.titulo, size: 54, color: hex(WEB.tinta), maxW: tw - 48});
      tx.layer.property('ADBE Transform Group').property('ADBE Position').setValue([x + 24, top + th - 30 - tx.h]);
      tx.layer.moveBefore(tile);
      pop([tile, tx.layer], x + tw / 2, top + th / 2, at);
    }
    return top + th;
  };

  /** Cierre: texto de apoyo y el botón menta (como "Descargá la APP" en la web). */
  BUILD.cierre = function (comp, s, top) {
    var at = sec(s.at - s.from);
    var sup = text(comp, s.supporting, P, top + P, {name: 'APOYO', font: FONTS.texto, size: 44, leading: 54, color: hex(WEB.tinta), maxW: CW - P * 2});
    fadeIn(sup.layer, at, sec(12), 18);
    var y = top + P + sup.h + 28;
    // La marca va como en el logo (Museo 700, sin mayúsculas forzadas ni tracking).
    var isBrand = /^educaplay$/i.test(s.button);
    var bt = text(comp, s.button, 0, 0, {name: 'BOTÓN · texto', font: isBrand ? FONTS.marca : FONTS.titulo, size: isBrand ? 54 : 48, color: hex(WEB.tinta), tracking: isBrand ? 0 : 100});
    var px = 40, py = 22, arrow = 46;
    var bw = bt.w + px * 2 + arrow, bh = bt.h + py * 2;
    bt.layer.property('ADBE Transform Group').property('ADBE Position').setValue([P + px, y + py]);
    var btn = newShapeLayer(comp, 'BOTÓN · menta');
    linkFill(addRect(btn, P, y, bw, bh, bh / 2, hex(WEB.menta), 'menta'), 'Menta');
    var ax = P + px + bt.w + 24, ay = y + bh / 2;
    var ar = addPath(btn, [[ax, ay - 15], [ax, ay + 15]], false, 'flecha');
    addStroke(ar, hex(WEB.tinta), 5);
    toFront(btn, ar);
    var ah = addPath(btn, [[ax - 11, ay + 4], [ax, ay + 15], [ax + 11, ay + 4]], false, 'punta');
    addStroke(ah, hex(WEB.tinta), 5);
    toFront(btn, ah);
    btn.moveAfter(bt.layer);
    pop([btn, bt.layer], P + bw / 2, y + bh / 2, at + sec(8));
    var th = y + bh + P - top;
    grayTile(comp, 0, top, CW, th);
    return top + th;
  };

  var built = 0;
  var S = M.scenes;
  var ENTRY_DELAY = 8; // la tarjeta nueva entra cuando el barrido ya la tapó
  for (var si = 0; si < S.length; si++) {
    var s = S[si];
    var builder = BUILD[s.kind];
    if (!builder) { log('✗ sin constructor para ' + s.kind + ' (' + s.key + ')'); continue; }
    var pre = proj.items.addComp(s.kind + '_' + s.key, CW, CH, 1, sec(s.to - s.from), FPS);
    pre.parentFolder = F.escenas;
    pre.bgColor = hex(WEB.oscuro);
    pre.motionBlur = true;

    var contentH = soft(s.kind + ':' + s.key, function () {
      var hh = header(pre, s, s.kind === 'cierre');
      return builder(pre, s, hh + GAP);
    });
    if (!contentH) { log('✗ ' + s.kind + ':' + s.key + ' quedó incompleto'); contentH = CH; }
    if (contentH > CH + 1) log('⚠ ' + s.key + ': la escena mide ' + Math.round(contentH) + ' px y la caja ' + CH);
    contentH = Math.min(Math.ceil(contentH), CH);

    var L = main.layers.add(pre);
    L.name = 'ESCENA · ' + s.key;
    L.startTime = sec(s.from);
    L.motionBlur = true;
    L.label = 11;
    var tr = L.property('ADBE Transform Group');
    // Centrada en la caja; el ancla abajo al centro: sube desde abajo.
    var offY = (CH - contentH) / 2;
    tr.property('ADBE Anchor Point').setValue([CW / 2, offY + contentH]);
    tr.property('ADBE Position').setValue([STAGE.tarjeta.x + CW / 2, STAGE.tarjeta.y + offY + contentH]);

    // Entrada y salida gobernadas por CONTROL. easeOutBack: sube y se pasa
    // apenas; `Rebote (%)` en 0 lo vuelve un ease out sin sobrepaso.
    var delay = si === 0 ? 0 : ENTRY_DELAY;
    var common = 'var c=' + CTRL_REF + ';' +
      'var fi=Math.max(1,c.effect("Entrada (frames)")(1))*thisComp.frameDuration;' +
      'var fo=Math.max(1,c.effect("Salida (frames)")(1))*thisComp.frameDuration;' +
      'var t=Math.min(1,Math.max(0,(time-inPoint-' + delay + '*thisComp.frameDuration)/fi));' +
      'var s=1.70158*c.effect("Rebote (%)")(1)/8;' +
      'var e=1+(s+1)*Math.pow(t-1,3)+s*Math.pow(t-1,2);' +
      'var x=ease(outPoint-time,0,fo,0,1);';
    soft('expresiones de escena', function () {
      tr.property('ADBE Opacity').expression = common + 'Math.min(Math.min(1,t*2.5),x)*100;';
      tr.property('ADBE Position').expression = common +
        'var d=c.effect("Deslizamiento (px)")(1);value+[0,(1-e)*d+(1-x)*d*0.25];';
    });
    soft('sombra', function () {
      var ds = L.property('ADBE Effect Parade').addProperty('ADBE Drop Shadow');
      ds.property('ADBE Drop Shadow-0001').setValue(hex(WEB.tinta, 1));
      ds.property('ADBE Drop Shadow-0003').setValue(180);
      ds.property('ADBE Drop Shadow-0004').setValue(10);
      ds.property('ADBE Drop Shadow-0005').setValue(30);
      ds.property('ADBE Drop Shadow-0002').expression = CTRL_REF + '.effect("Sombra (%)")(1)*2.55;';
    });
    built++;
  }
  log('· ' + built + ' escenas armadas');

  // ─────────────────────────────────────────────── barridos entre escenas
  // Al empezar cada escena, un barrido de bandas diagonales (el encabezado de
  // la web) cruza la caja de la tarjeta: tapa el cambio y marca el ritmo.
  soft('barridos', function () {
    var n = 0;
    for (var i = 0; i < S.length; i++) {
      var b = S[i].from;
      var t0 = i === 0 ? sec(0) : sec(b - 8), t1 = i === 0 ? sec(14) : sec(b + 8);
      var bs = diagonalBands(main, 'BANDAS ' + S[i].key, t0, t1, 0, STAGE.tarjeta.y - 20, W, STAGE.tarjeta.height + 40);
      for (var q = bs.length - 1; q >= 0; q--) {
        bs[q].label = 8;
        bs[q].moveToBeginning();
      }
      n++;
    }
    log('· ' + n + ' barridos de bandas');
  });

  // ───────────────────────────────────────────────────────────── subtítulos
  // Estándar de subtitulado Educaplay (§1.4) más el karaoke de redes:
  //   · pastilla esmerilada: scrim negro al 55 %, 10 px de desenfoque detrás,
  //     borde de 1 px al 16 %, filete interior y sombra; sin degradados;
  //   · Museo Sans Rounded 700 blanco, dos líneas como mucho, corte balanceado;
  //   · la palabra que se está diciendo va en tinta sobre una pastilla menta.
  //     Nunca hay dos a la vez (lo garantiza npm run check).
  // Una capa de texto por página: doble clic para corregir. El karaoke lee el
  // timing de cada palabra de la expresión del animador «Palabra activa».
  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /** Corte balanceado: el corte entre palabras que deja la línea más larga lo más corta posible. */
  function wrapBalanced(layer, str, maxW) {
    setText(layer, str);
    if (rectOf(layer).width <= maxW) return 1;
    var words = str.split(/\s+/);
    var best = null, bestW = Infinity;
    for (var k = 1; k < words.length; k++) {
      var a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      setText(layer, a);
      var wa = rectOf(layer).width;
      setText(layer, b);
      var m = Math.max(wa, rectOf(layer).width);
      if (m < bestW) { bestW = m; best = a + '\r' + b; }
    }
    if (bestW <= maxW) { setText(layer, best); return 2; }
    return wrap(layer, str, maxW);
  }

  var karaokeWords = 0;
  soft('subtítulos', function () {
    var subs = proj.items.addComp('SUBTITULOS', W, H, 1, sec(M.duration), FPS);
    subs.parentFolder = F.subs;
    var PILL = STAGE.pastilla, BAND = STAGE.subtitulos;
    var fs = PILL.fontSize, padX = PILL.padX, padY = PILL.padY;
    var LEAD = Math.round(fs * PILL.lineHeight);
    var FADE = 3; // frames de fundido de entrada y salida
    var over = 0;
    var cx = BAND.x + BAND.width / 2, cy = BAND.y + BAND.height / 2;
    var textStyle = {font: FONTS.texto, size: fs, color: [1, 1, 1], center: true, leading: LEAD};

    // Capa auxiliar para medir palabras con la fuente real (se borra al final).
    var meter = subs.layers.addText('x');
    styleText(meter, {font: FONTS.texto, size: fs, color: [1, 1, 1], leading: LEAD});
    function widthOf(str) { setText(meter, str); return rectOf(meter).width; }

    for (var i = 0; i < M.captions.length; i++) {
      var c = M.captions[i];
      var tl = subs.layers.addText(c.text);
      tl.name = 'SUB ' + pad2(i + 1) + ' · ' + c.text.substr(0, 32);
      styleText(tl, textStyle);
      var lines = wrapBalanced(tl, c.text, BAND.width - padX * 2);
      if (lines > PILL.maxLines) { over++; log('⚠ subtítulo ' + pad2(i + 1) + ' en ' + lines + ' líneas'); }
      tl.inPoint = sec(c.from);
      tl.outPoint = sec(c.to);
      var tt = tl.property('ADBE Transform Group');
      tt.property('ADBE Anchor Point').expression = 'var r=sourceRectAtTime(time,false);[r.left+r.width/2,r.top+r.height/2];';
      tt.property('ADBE Position').setValue([cx, cy]);
      tt.property('ADBE Opacity').expression =
        'var d=' + FADE + '*thisComp.frameDuration;Math.min(ease(time-inPoint,0,d,0,100),ease(outPoint-time,0,d,0,100));';

      // Caja de cada palabra en el espacio de la capa. Texto centrado: cada
      // línea va de -ancho/2 a +ancho/2; el renglón li tiene su base en li*LEAD.
      var lineStrs = String(tl.property('ADBE Text Properties').property('ADBE Text Document').value.text).split(/[\r\n]/);
      var boxes = [], wi = 0;
      for (var li = 0; li < lineStrs.length; li++) {
        var ws = lineStrs[li].split(' ');
        var lw = widthOf(lineStrs[li]);
        for (var j = 0; j < ws.length; j++) {
          var ww = widthOf(ws[j]);
          var off = j ? widthOf(ws.slice(0, j + 1).join(' ')) - ww : 0;
          boxes.push([Math.round(-lw / 2 + off + ww / 2), Math.round(li * LEAD - fs * 0.34), Math.round(ww)]);
          wi++;
        }
      }
      if (wi !== c.words.length) log('✗ subtítulo ' + pad2(i + 1) + ': ' + wi + ' palabras en AE y ' + c.words.length + ' en el manifiesto');
      var timing = [];
      for (var q = 0; q < c.words.length; q++) timing.push('[' + c.words[q][1] + ',' + c.words[q][2] + ']');
      var ACTIVE = 'var T=[' + timing.join(',') + '];var f=Math.round(time/thisComp.frameDuration);var k=-1;' +
        'for(var i=0;i<T.length;i++){if(f>=T[i][0]&&f<T[i][1]){k=i;break;}}';
      karaokeWords += c.words.length;

      // Palabra activa en tinta: animador por índice de palabra.
      soft('karaoke ' + pad2(i + 1), function () {
        var an = tl.property('ADBE Text Properties').property('ADBE Text Animators').addProperty('ADBE Text Animator');
        an.name = 'Palabra activa';
        an.property('ADBE Text Animator Properties').addProperty('ADBE Text Fill Color');
        var fc = an.property('ADBE Text Animator Properties').property('ADBE Text Fill Color');
        fc.setValue(hex(WEB.tinta));
        fc.expression = colorExpr('Tinta');
        var sel = an.property('ADBE Text Selectors').addProperty('ADBE Text Selector');
        var adv = sel.property('ADBE Text Range Advanced');
        adv.property('ADBE Text Range Units').setValue(2);  // índice
        adv.property('ADBE Text Range Type2').setValue(3);  // palabras
        sel.property('ADBE Text Index Start').expression = ACTIVE + 'k<0?0:k;';
        sel.property('ADBE Text Index End').expression = ACTIVE + 'k<0?0:k+1;';
        adv.property('ADBE Text Selector Max Amount').expression = CTRL_REF + '.effect("Karaoke")(1)*100;';
      });

      // Pastilla menta detrás de la palabra activa.
      soft('resaltado ' + pad2(i + 1), function () {
        var bx = [];
        for (var q2 = 0; q2 < boxes.length; q2++) bx.push('[' + boxes[q2].join(',') + ']');
        var BX = 'var B=[' + bx.join(',') + '];var L=thisComp.layer("' + tl.name + '");';
        var chip = subs.layers.addShape();
        chip.name = 'RESALTADO ' + pad2(i + 1);
        chip.inPoint = tl.inPoint;
        chip.outPoint = tl.outPoint;
        var g = chip.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
        g.name = 'menta';
        g.property('ADBE Vectors Group').addProperty('ADBE Vector Shape - Rect');
        g.property('ADBE Vectors Group').addProperty('ADBE Vector Graphic - Fill');
        var rect = g.property('ADBE Vectors Group').property('ADBE Vector Shape - Rect');
        var fill = g.property('ADBE Vectors Group').property('ADBE Vector Graphic - Fill');
        fill.property('ADBE Vector Fill Color').setValue(hex(WEB.menta));
        fill.property('ADBE Vector Fill Color').expression = colorExpr('Menta');
        rect.property('ADBE Vector Rect Roundness').setValue(12);
        rect.property('ADBE Vector Rect Size').expression = ACTIVE + BX + 'k<0?[0,0]:[B[k][2]+18,' + Math.round(fs * 1.22) + '];';
        var ct = chip.property('ADBE Transform Group');
        ct.property('ADBE Anchor Point').setValue([0, 0]);
        ct.property('ADBE Position').expression = ACTIVE + BX + 'k<0?[-1000,-1000]:L.toComp([B[k][0],B[k][1]]);';
        ct.property('ADBE Opacity').expression = ACTIVE + BX + 'k<0?0:L.transform.opacity*' + CTRL_REF + '.effect("Karaoke")(1);';
        chip.moveAfter(tl);
      });

      soft('sombra de texto', function () {
        var ds = tl.property('ADBE Effect Parade').addProperty('ADBE Drop Shadow');
        ds.property('ADBE Drop Shadow-0001').setValue([0, 0, 0, 1]);
        ds.property('ADBE Drop Shadow-0002').setValue(90);
        ds.property('ADBE Drop Shadow-0003').setValue(180);
        ds.property('ADBE Drop Shadow-0004').setValue(2);
        ds.property('ADBE Drop Shadow-0005').setValue(4);
      });
    }
    meter.remove();

    // Una sola pastilla: busca el subtítulo activo y se ajusta a él.
    var FIND = 'var L=null;for(var i=1;i<=thisComp.numLayers;i++){var l=thisComp.layer(i);' +
      'if(l.name.indexOf("SUB ")==0&&l.active){L=l;break;}}';
    var SIZE = FIND + 'var sz=[0,0];if(L){var r=L.sourceRectAtTime(time,false);sz=[r.width+' + padX * 2 + ',r.height+' + padY * 2 + '];}';
    var pill = subs.layers.addShape();
    pill.name = 'PASTILLA';
    var g = pill.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
    g.name = 'scrim';
    var gv = g.property('ADBE Vectors Group');
    gv.addProperty('ADBE Vector Shape - Rect');
    gv.addProperty('ADBE Vector Graphic - Fill');
    gv.addProperty('ADBE Vector Graphic - Stroke');
    // Se leen DESPUÉS de agregar todo: cada addProperty invalida las anteriores.
    var rect = gv.property('ADBE Vector Shape - Rect');
    var fill = gv.property('ADBE Vector Graphic - Fill');
    var st = gv.property('ADBE Vector Graphic - Stroke');
    fill.property('ADBE Vector Fill Color').setValue([0, 0, 0]);
    fill.property('ADBE Vector Fill Opacity').setValue(PILL.scrimAlpha * 100);
    st.property('ADBE Vector Stroke Color').setValue([1, 1, 1]);
    st.property('ADBE Vector Stroke Width').setValue(1);
    st.property('ADBE Vector Stroke Opacity').setValue(16);
    rect.property('ADBE Vector Rect Roundness').setValue(PILL.radius);
    rect.property('ADBE Vector Rect Size').expression = SIZE + 'sz;';
    soft('filete interior', function () {
      var hg = pill.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
      hg.name = 'filete interior';
      hg.property('ADBE Vectors Group').addProperty('ADBE Vector Shape - Group');
      hg.property('ADBE Vectors Group').addProperty('ADBE Vector Graphic - Stroke');
      var hs = hg.property('ADBE Vectors Group').property('ADBE Vector Graphic - Stroke');
      hs.property('ADBE Vector Stroke Color').setValue([1, 1, 1]);
      hs.property('ADBE Vector Stroke Width').setValue(1);
      hs.property('ADBE Vector Stroke Opacity').setValue(15);
      hg.property('ADBE Vectors Group').property('ADBE Vector Shape - Group').property('ADBE Vector Shape').expression =
        SIZE + 'var w=sz[0]/2-' + PILL.radius + ',y=-sz[1]/2+1.5;' +
        'createPath([[-Math.max(w,0),y],[Math.max(w,0),y]],[],[],false);';
    });
    pill.property('ADBE Transform Group').property('ADBE Anchor Point').setValue([0, 0]);
    pill.property('ADBE Transform Group').property('ADBE Position').expression = FIND +
      'if(L){var r=L.sourceRectAtTime(time,false);L.toComp([r.left+r.width/2,r.top+r.height/2]);}else[-1000,-1000];';
    pill.property('ADBE Transform Group').property('ADBE Opacity').expression = FIND + 'L?L.transform.opacity:0;';
    soft('sombra de pastilla', function () {
      var ds = pill.property('ADBE Effect Parade').addProperty('ADBE Drop Shadow');
      ds.property('ADBE Drop Shadow-0001').setValue([0, 0, 0, 1]);
      ds.property('ADBE Drop Shadow-0002').setValue(89);
      ds.property('ADBE Drop Shadow-0003').setValue(180);
      ds.property('ADBE Drop Shadow-0004').setValue(8);
      ds.property('ADBE Drop Shadow-0005').setValue(32);
    });
    pill.moveToEnd();

    // Esmerilado: desenfoque del cuadro recortado a la pastilla. La capa de
    // ajuste vive en la precomp y alcanza al máster porque SUBTÍTULOS va con
    // «contraer transformaciones».
    soft('esmerilado', function () {
      var pm = pill.duplicate();
      pm.name = 'MATTE · pastilla';
      pm.property('ADBE Effect Parade').property(1).remove();
      pm.property('ADBE Root Vectors Group').property(1).property('ADBE Vectors Group')
        .property('ADBE Vector Graphic - Fill').property('ADBE Vector Fill Opacity').setValue(100);
      var adj = subs.layers.addSolid([1, 1, 1], 'PASTILLA · esmerilado', W, H, 1);
      adj.adjustmentLayer = true;
      var bl = adj.property('ADBE Effect Parade').addProperty('ADBE Gaussian Blur 2');
      bl.property(1).setValue(PILL.blur);
      soft('repetir bordes', function () { bl.property(3).setValue(1); });
      adj.moveToEnd();
      pm.moveToEnd();
      adj.setTrackMatte(pm, TrackMatteType.ALPHA);
      pm.enabled = false;
    });

    var SL = main.layers.add(subs);
    SL.name = 'SUBTÍTULOS';
    SL.label = 2;
    SL.collapseTransformation = true;
    SL.property('ADBE Transform Group').property('ADBE Opacity').expression = CTRL_REF + '.effect("Subtítulos")(1)*100;';
    SL.moveToBeginning();
    log('· ' + M.captions.length + ' subtítulos, una capa cada uno' + (over ? '' : ', todos en ≤' + PILL.maxLines + ' líneas'));
    log('· ' + karaokeWords + ' palabras con karaoke');
  });

  // Guía (no se renderiza): lo que tapa la interfaz de Reels/TikTok/Shorts.
  soft('guía de zonas seguras', function () {
    var g = newShapeLayer(main, 'GUIA · zonas seguras');
    g.guideLayer = true;
    g.label = 1;
    var sf = STAGE.seguro;
    var zones = [[0, 0, W, sf.top], [0, sf.bottom, W, H - sf.bottom], [sf.right, sf.top, W - sf.right, sf.bottom - sf.top]];
    for (var i = 0; i < zones.length; i++) {
      var grp = addRect(g, zones[i][0], zones[i][1], zones[i][2], zones[i][3], 0, [1, 0.2, 0.2], 'zona ' + (i + 1));
      fillOf(grp).property('ADBE Vector Fill Opacity').setValue(25);
    }
    g.moveToBeginning();
  });

  ctrl.moveToBeginning();
  masterLayer.moveToEnd();
  masterLayer.locked = true;

  // ─────────────────────────────────────────────────────────────── guardar
  var out = File(ROOTDIR.fsName + '/' + MAIN + '.aep');
  proj.save(out);
  main.openInViewer();
  app.endUndoGroup();
  log('✓ guardado en ' + out.fsName);
}

try {
  buildReel();
} catch (err) {
  // ae/run.mjs lee LOG y falla el chequeo ante cualquier ✗.
  log('✗ ERROR: ' + err.toString() + ' (línea ' + err.line + ')');
}
