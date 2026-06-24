// ============================================================================
// tile-render.js  ·  tile-grid pixel-art surface renderer (Path 2, code-only)
// ----------------------------------------------------------------------------
// Emulates the chunky tile-art reference WITHOUT image assets: the play area is
// divided into a grid of small cells; each cell is classified by which surface
// it sits on (green/fringe/fairway/tee/bunker/water/rough) and stamped as a flat
// tile with that surface's pixel texture (grass V-tufts, water sparkle, sand
// speckle) plus HARD edge borders where it meets a different surface — the
// autotiled, cut-out look. Replaces the smooth-polygon surface pass.
//
// Wraps drawCourse: runs the original for trees/props/cup/flag/slope-read, but
// paints the surfaces itself first. Tunable constants up top.
// ============================================================================

(function () {
  'use strict';
  if (typeof drawCourse !== 'function') return;

  var TILE = 14;          // cell size in world px (chunky like the reference)
  var W = 420, H = 760;

  // ---- image textures (per theme). Loaded async; until ready we fall back to
  // the flat-colour tiles, so nothing breaks if an image is missing. ----
  var TEX_SETS = {
    masters: {
      rough: 'tex/masters-rough.png', fairway: 'tex/masters-fairway.png',
      fringe: 'tex/masters-fringe.png', green: 'tex/masters-green.png',
      tee: 'tex/masters-tee.png', sand: 'tex/masters-sand.png',
      water: 'tex/masters-water.png'
    },
    coral: {
      rough: 'tex/coral-fringe.png', fairway: 'tex/coral-fairway.png',
      fringe: 'tex/coral-rough.png', green: 'tex/coral-green.png',
      tee: 'tex/coral-tee.png', sand: 'tex/coral-sand.png',
      water: 'tex/coral-water.png'
    },
    // Willow + Floating Isles + Pine Ridge reuse the masters grass/sand set,
    // and the masters water texture (per request).
    willow: {
      rough: 'tex/masters-rough.png', fairway: 'tex/masters-fairway.png',
      fringe: 'tex/masters-fringe.png', green: 'tex/masters-green.png',
      tee: 'tex/masters-tee.png', sand: 'tex/masters-sand.png',
      water: 'tex/masters-water.png'
    },
    sky: {
      rough: 'tex/masters-rough.png', fairway: 'tex/masters-fairway.png',
      fringe: 'tex/masters-fringe.png', green: 'tex/masters-green.png',
      tee: 'tex/masters-tee.png', sand: 'tex/masters-sand.png',
      water: 'tex/masters-water.png'
    },
    pine: {
      rough: 'tex/masters-rough.png', fairway: 'tex/masters-fairway.png',
      fringe: 'tex/masters-fringe.png', green: 'tex/masters-green.png',
      tee: 'tex/masters-tee.png', sand: 'tex/masters-sand.png',
      water: 'tex/masters-water.png'
    }
  };
  var texCache = {};       // url -> {img, ready}
  function getTex(url) {
    if (texCache[url]) return texCache[url];
    var rec = { img: new Image(), ready: false };
    rec.img.onload = function () { rec.ready = true; };
    rec.img.onerror = function () { rec.ready = false; };
    rec.img.src = url;
    texCache[url] = rec;
    return rec;
  }
  function preloadTheme(theme) { var set = TEX_SETS[theme]; if (!set) return; for (var k in set) if (set.hasOwnProperty(k)) getTex(set[k]); }

  // per-theme tile palettes: each surface gets [base, light, dark, edgeDark]
  function skin(theme, p) {
    // derive from the existing theme palette `p` so every course keeps its hues
    return {
      rough:   [p.roughTop, p.rough3 || p.roughTop, p.roughBot, shade(p.roughBot, 0.7)],
      fairway: [p.fairway, p.fairway2, shade(p.fairway, 0.84), shade(p.fairway, 0.66)],
      fringe:  [p.fringe, shade(p.fringe, 1.08), shade(p.fringe, 0.86), shade(p.fringe, 0.7)],
      green:   [p.green, p.greenLite || shade(p.green, 1.1), shade(p.green, 0.86), shade(p.green, 0.7)],
      tee:     [shade(p.fairway, 0.9), p.fairway, shade(p.fairway, 0.78), shade(p.fairway, 0.62)],
      sand:    [p.sand, shade(p.sand, 1.06), shade(p.sand, 0.88), p.sandEdge || shade(p.sand, 0.7)],
      water:   [p.water[1], p.water[0], shade(p.water[1], 0.82), shade(p.water[1], 0.66)]
    };
  }

  function shade(hex, f) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return hex || '#000';
    var n = parseInt(m[1], 16);
    var r = Math.min(255, Math.round(((n >> 16) & 255) * f));
    var g = Math.min(255, Math.round(((n >> 8) & 255) * f));
    var b = Math.min(255, Math.round((n & 255) * f));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function inPoly(x, y, poly) {
    if (!poly || poly.length < 3) return false;
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  // surface priority at a point (highest wins), matching draw order
  function surfaceAt(hole, x, y) {
    if (inPoly(x, y, hole.green)) return 'green';
    if (inPoly(x, y, hole.greenRing)) return 'fringe';
    if (hole.bunkers) for (var i = 0; i < hole.bunkers.length; i++) if (inPoly(x, y, hole.bunkers[i])) return 'sand';
    if (inPoly(x, y, hole.tee)) return 'tee';
    if (inPoly(x, y, hole.fairway)) return 'fairway';
    if (hole.water && inPoly(x, y, hole.water)) return 'water';
    return 'rough';
  }

  // deterministic per-cell pseudo-random
  function cellRand(cx, cy) {
    var s = (cx * 73856093) ^ (cy * 19349663);
    s = (s ^ (s >> 13)) >>> 0;
    return (s % 1000) / 1000;
  }

  function paintTiles(hole, sk) {
    var texSet = TEX_SETS[hole.courseTheme] || null;
    if (texSet) preloadTheme(hole.courseTheme);
    var cols = Math.ceil(W / TILE), rows = Math.ceil(H / TILE);
    // 1) classify every cell once
    var grid = [];
    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      for (var c = 0; c < cols; c++) {
        grid[r][c] = surfaceAt(hole, c * TILE + TILE / 2, r * TILE + TILE / 2);
      }
    }
    var isSky = (hole.courseTheme === 'sky');
    // 2) paint base tiles + texture
    for (var r2 = 0; r2 < rows; r2++) {
      for (var c2 = 0; c2 < cols; c2++) {
        var surf = grid[r2][c2];
        // FLOATING ISLES: the "rough" is the open void/sky, not grass — so
        // islands (fairway/green/tee) read as land suspended in sky.
        if (isSky && surf === 'rough') {
          var vy = (r2 * TILE) / H;
          ctx.fillStyle = vy < 0.5 ? '#bfe0ff' : (vy < 0.8 ? '#9fc8f0' : '#7fb0e0');
          ctx.fillRect(c2 * TILE, r2 * TILE, TILE + 0.6, TILE + 0.6);
          continue;
        }
        var pal = sk[surf] || sk.rough;
        var x = c2 * TILE, y = r2 * TILE;
        var rv = cellRand(c2, r2);
        // IMAGE TEXTURE: if this theme has a ready texture for this surface, stamp
        // a seamless crop of it for this cell; else fall back to flat tile colour.
        var texUrl = texSet && texSet[surf];
        var rec = texUrl ? texCache[texUrl] : null;
        if (rec && rec.ready) {
          var ts = rec.img.width || 96;
          // source offset tiles the texture continuously across the whole course
          var sx = ((x % ts) + ts) % ts, sy = ((y % ts) + ts) % ts;
          // draw with wrap: may need up to 4 sub-draws if the cell crosses the
          // texture edge — clip to the cell and draw the texture aligned.
          ctx.save();
          ctx.beginPath(); ctx.rect(x, y, TILE + 0.6, TILE + 0.6); ctx.clip();
          var ox = x - sx, oy = y - sy;
          for (var gx = ox - ts; gx <= x + TILE; gx += ts) {
            for (var gy = oy - ts; gy <= y + TILE; gy += ts) {
              ctx.drawImage(rec.img, gx, gy, ts, ts);
            }
          }
          ctx.restore();
        } else {
          // base: alternate base/light for a subtle checker like tile art
          ctx.fillStyle = (rv < 0.18) ? pal[1] : (rv > 0.86 ? pal[2] : pal[0]);
          ctx.fillRect(x, y, TILE + 0.6, TILE + 0.6);
        }
        // MOWING STRIPES on mown surfaces: gentle alternating vertical bands
        // (every 2 columns) layered over the per-cell variation, so it reads as
        // a striped lawn but still has grid-by-grid texture.
        if (surf === 'fairway' || surf === 'green' || surf === 'fringe' || surf === 'tee') {
          var band = Math.floor(c2 / 2) % 2;
          ctx.fillStyle = band ? 'rgba(255,255,255,0.085)' : 'rgba(0,0,0,0.07)';
          ctx.fillRect(x, y, TILE + 0.6, TILE + 0.6);
        }
        // per-surface PROCEDURAL texture (only when NOT using an image texture)
        var usingTex = !!(rec && rec.ready);
        if (!usingTex && (surf === 'rough' || surf === 'fairway' || surf === 'green' || surf === 'fringe' || surf === 'tee')) {
          // little V grass tuft
          if (rv > 0.5) {
            ctx.strokeStyle = shade(pal[2], 0.92); ctx.lineWidth = 1;
            var tx = x + TILE * (0.3 + rv * 0.4), ty = y + TILE * 0.6;
            ctx.beginPath(); ctx.moveTo(tx - 2, ty - 2); ctx.lineTo(tx, ty); ctx.lineTo(tx + 2, ty - 2); ctx.stroke();
          }
        } else if (!usingTex && surf === 'water') {
          // sparkle dots
          if (rv > 0.7) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x + TILE * 0.5, y + TILE * 0.4, 1.4, 1.4); }
        } else if (!usingTex && surf === 'sand') {
          if (rv > 0.6) { ctx.fillStyle = shade(pal[2], 0.95); ctx.fillRect(x + TILE * rv, y + TILE * (1 - rv), 1.2, 1.2); }
        }
      }
    }
    // 3) hard edges: where a cell differs from the neighbour above/left, draw a
    // dark border on that side (the autotiled cut-out look)
    ctx.fillStyle = 'rgba(0,0,0,0)';
    for (var r3 = 0; r3 < rows; r3++) {
      for (var c3 = 0; c3 < cols; c3++) {
        var s0 = grid[r3][c3], x3 = c3 * TILE, y3 = r3 * TILE;
        var pal3 = sk[s0] || sk.rough;
        var up = r3 > 0 ? grid[r3 - 1][c3] : s0;
        var lf = c3 > 0 ? grid[r3][c3 - 1] : s0;
        var dn = r3 < rows - 1 ? grid[r3 + 1][c3] : s0;
        var rt = c3 < cols - 1 ? grid[r3][c3 + 1] : s0;
        ctx.fillStyle = pal3[3];
        if (up !== s0) ctx.fillRect(x3, y3, TILE + 0.6, 1.8);
        if (lf !== s0) ctx.fillRect(x3, y3, 1.8, TILE + 0.6);
        if (dn !== s0) ctx.fillRect(x3, y3 + TILE - 1.2, TILE + 0.6, 1.8);
        if (rt !== s0) ctx.fillRect(x3 + TILE - 1.2, y3, 1.8, TILE + 0.6);
        // soft drop shadow below a higher surface meeting rough (green/sand/fairway over rough)
        if (dn === 'rough' && (s0 === 'green' || s0 === 'fringe' || s0 === 'sand' || s0 === 'fairway')) {
          ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x3, y3 + TILE, TILE + 0.6, 2.4);
        }
      }
    }
  }

  // expose the green's hill shading on top of tiles (kept subtle, clipped)
  function greenHillShade(hole, sk) {
    if (!hole.green || hole.green.length < 3) return;
    var GF = window.GreenField;
    if (!GF || !GF.sampleHeight) return;
    var b = { minX: 1e9, minY: 1e9, maxX: -1e9, maxY: -1e9 };
    hole.green.forEach(function (p) { b.minX = Math.min(b.minX, p.x); b.minY = Math.min(b.minY, p.y); b.maxX = Math.max(b.maxX, p.x); b.maxY = Math.max(b.maxY, p.y); });
    var hi = -1e9, lo = 1e9, samples = [];
    for (var sy = b.minY; sy <= b.maxY; sy += TILE) {
      for (var sx = b.minX; sx <= b.maxX; sx += TILE) {
        if (!inPoly(sx + TILE / 2, sy + TILE / 2, hole.green)) continue;
        var h = GF.sampleHeight(hole, sx + TILE / 2, sy + TILE / 2);
        samples.push({ x: sx, y: sy, h: h });
        if (h > hi) hi = h; if (h < lo) lo = h;
      }
    }
    var range = (hi - lo) || 1;
    samples.forEach(function (s) {
      var n = (s.h - lo) / range, d = (n - 0.5) * 2;
      if (d > 0.05) { ctx.fillStyle = 'rgba(255,255,255,' + (d * 0.16).toFixed(3) + ')'; ctx.fillRect(s.x, s.y, TILE + 0.6, TILE + 0.6); }
      else if (d < -0.05) { ctx.fillStyle = 'rgba(12,45,22,' + (-d * 0.20).toFixed(3) + ')'; ctx.fillRect(s.x, s.y, TILE + 0.6, TILE + 0.6); }
    });
  }

  // theme palette lookup (reuse the global theme table via a tiny probe)
  function paletteFor(hole) {
    // course-visuals exposes palettes only internally; rebuild minimal palette
    // from a global helper if present, else fall back to willow-ish greens.
    if (window.__themePalette) return window.__themePalette(hole);
    return null;
  }

  var beforeDraw = drawCourse;
  drawCourse = function drawCourseTiled(ctx2, hole, w, h, timeMs, showSlope) {
    var pal = paletteFor(hole);
    if (!pal) { beforeDraw(ctx2, hole, w, h, timeMs, showSlope); return; }   // safe fallback
    try {
      var sk = skin(hole.courseTheme, pal);
      paintTiles(hole, sk);
      greenHillShade(hole, sk);
      // now run the original for everything NON-surface (trees, props, cup, flag,
      // slope read) — but its surfaces will be hidden under nothing; we accept a
      // double-paint of surfaces beneath, which is covered by our tiles already.
      // To avoid double surfaces we instead call a decor-only path if available.
      if (typeof drawCourseDecorOnly === 'function') drawCourseDecorOnly(ctx2, hole, w, h, timeMs, showSlope);
      else beforeDraw(ctx2, hole, w, h, timeMs, showSlope);
    } catch (e) {
      beforeDraw(ctx2, hole, w, h, timeMs, showSlope);
    }
  };

  window.tileRenderLoaded = true;
})();
