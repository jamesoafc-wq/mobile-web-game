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
    var cols = Math.ceil(W / TILE), rows = Math.ceil(H / TILE);
    // 1) classify every cell once
    var grid = [];
    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      for (var c = 0; c < cols; c++) {
        grid[r][c] = surfaceAt(hole, c * TILE + TILE / 2, r * TILE + TILE / 2);
      }
    }
    // 2) paint base tiles + texture
    for (var r2 = 0; r2 < rows; r2++) {
      for (var c2 = 0; c2 < cols; c2++) {
        var surf = grid[r2][c2];
        var pal = sk[surf] || sk.rough;
        var x = c2 * TILE, y = r2 * TILE;
        var rv = cellRand(c2, r2);
        // base: alternate base/light for a subtle checker like tile art
        ctx.fillStyle = (rv < 0.18) ? pal[1] : (rv > 0.86 ? pal[2] : pal[0]);
        ctx.fillRect(x, y, TILE + 0.6, TILE + 0.6);
        // per-surface texture
        if (surf === 'rough' || surf === 'fairway' || surf === 'green' || surf === 'fringe' || surf === 'tee') {
          // little V grass tuft
          if (rv > 0.5) {
            ctx.strokeStyle = shade(pal[2], 0.92); ctx.lineWidth = 1;
            var tx = x + TILE * (0.3 + rv * 0.4), ty = y + TILE * 0.6;
            ctx.beginPath(); ctx.moveTo(tx - 2, ty - 2); ctx.lineTo(tx, ty); ctx.lineTo(tx + 2, ty - 2); ctx.stroke();
          }
        } else if (surf === 'water') {
          // sparkle dots
          if (rv > 0.7) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x + TILE * 0.5, y + TILE * 0.4, 1.4, 1.4); }
        } else if (surf === 'sand') {
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
    var b = { minX: 1e9, minY: 1e9, maxX: -1e9, maxY: -1e9 };
    hole.green.forEach(function (p) { b.minX = Math.min(b.minX, p.x); b.minY = Math.min(b.minY, p.y); b.maxX = Math.max(b.maxX, p.x); b.maxY = Math.max(b.maxY, p.y); });
    var cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2, mr = Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.7;
    ctx.save();
    if (typeof clipToPolygon === 'function') {
      clipToPolygon(ctx, hole.green, function () {
        var hi = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx - 6, cy - 6, mr);
        hi.addColorStop(0, 'rgba(255,255,255,0.22)'); hi.addColorStop(0.6, 'rgba(255,255,255,0)');
        ctx.fillStyle = hi; ctx.fillRect(b.minX - 10, b.minY - 10, (b.maxX - b.minX) + 20, (b.maxY - b.minY) + 20);
        var sh = ctx.createRadialGradient(cx + 8, cy + 8, 2, cx + 8, cy + 8, mr);
        sh.addColorStop(0, 'rgba(10,40,18,0)'); sh.addColorStop(1, 'rgba(10,40,18,0.4)');
        ctx.fillStyle = sh; ctx.fillRect(b.minX - 10, b.minY - 10, (b.maxX - b.minX) + 20, (b.maxY - b.minY) + 20);
      });
    }
    ctx.restore();
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
