// ============================================================================
// course-visuals.js  ·  Full creative redo of all 5 courses (loads last)
// ----------------------------------------------------------------------------
// Reimagines the look of every course while preserving the GAME CONTRACT:
//   * same draw order: rough -> water -> fairway -> tee -> bunkers -> green ->
//     trees -> props -> theme extras -> cup/flag
//   * the playable surface polygons (fairway/green/greenRing/bunkers/water/tee)
//     are drawn in their exact existing positions, so lie detection, putting and
//     collision are untouched. We only change how they LOOK.
//
// Each course gets a distinct identity, palette and surroundings:
//   willow  — English parkland at golden hour: striped lawns, weeping willows,
//             wildflower rough, a meandering brook.
//   coral   — tropical island: turquoise lagoon, white-sand beaches, palms.
//   dunes   — windswept Scottish links at dusk: fescue grain, revetted pots,
//             rolling dune shadows, marram tufts.
//   pine    — misty alpine forest: deep evergreens, long shadows, granite.
//   silver  — moonlit twilight: cool silver-teal, frost sheen, still water.
//
// Overrides drawCourse (captures the previous themed one as a fallback). Pure
// rendering. Decoration is deterministic per hole (seeded by cup position) so it
// doesn't jitter frame to frame.
// ============================================================================

(function () {
  'use strict';
  if (typeof drawCourse !== 'function') return;
  var prevDrawCourse = drawCourse;

  // ---- helpers -------------------------------------------------------------
  function bounds(poly) { return polygonBounds(poly); }
  function clipPoly(ctx, poly, fn) { clipToPolygon(ctx, poly, fn); }
  function tracePoly(ctx, poly) { drawRoundedPolygon(ctx, poly); }
  function fillPoly(ctx, poly, fill, stroke, lw) { drawPolygonFill(ctx, poly, fill, stroke || null, lw || 1.5); }
  // deterministic pseudo-random from a seed (so décor is stable per hole)
  function rng(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function holeSeed(hole) { return Math.floor((hole.cup.x * 73 + hole.cup.y * 131 + (hole.par || 4) * 17)); }
  function lin(ctx, x0, y0, x1, y1, stops) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }
  function rad(ctx, x, y, r0, r1, stops) {
    r0 = Math.max(0.1, r0); r1 = Math.max(r0 + 0.1, r1);
    var g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }

  // ============================ THEME PALETTES =============================
  var T = {
    willow: {
      roughTop: '#3a7a3f', roughBot: '#27632f', blade: 'rgba(150,205,120,0.10)', flower: ['#f4e15a', '#ffffff', '#e87fb0'],
      fairway: '#7ec863', fairway2: '#8fd673', stripe: 'rgba(255,255,255,0.06)',
      fringe: '#86cf72', green: '#9fe27e', greenSheen: 'rgba(230,255,200,0.16)',
      sand: '#e2cf94', sandEdge: 'rgba(120,92,40,0.5)',
      water: ['#2f7fae', '#1f5f86'], waterSheen: 'rgba(220,245,255,0.18)'
    },
    coral: {
      roughTop: '#4f9e5e', roughBot: '#3a8049', blade: 'rgba(225,245,180,0.07)', flower: ['#ff9ab0', '#ffd36b', '#fff3c4'],
      fairway: '#86cf6e', fairway2: '#95d97c', stripe: 'rgba(255,255,255,0.06)',
      fringe: '#8fd277', green: '#a6e081', greenSheen: 'rgba(240,255,220,0.16)',
      sand: '#fbeec9', sandEdge: 'rgba(180,150,90,0.5)',
      water: ['#2fd0d8', '#1aa7c4'], waterSheen: 'rgba(255,255,255,0.22)', reef: 'rgba(255,170,120,0.22)'
    },
    dunes: {
      roughTop: '#c69a5a', roughBot: '#a87c41', blade: 'rgba(90,60,25,0.12)', flower: ['#d8c074', '#b89a52'],
      fairway: '#9cc36a', fairway2: '#a9cd78', stripe: 'rgba(255,250,225,0.05)',
      fringe: '#a6c478', green: '#bcdc8a', greenSheen: 'rgba(255,250,210,0.15)',
      sand: '#e6cf86', sandEdge: 'rgba(110,80,35,0.65)',
      water: ['#3a7f9a', '#2a6075'], waterSheen: 'rgba(220,245,255,0.14)'
    },
    pine: {
      roughTop: '#1f5235', roughBot: '#123723', blade: 'rgba(10,40,22,0.22)', flower: ['#caa24e', '#8fb56a'],
      fairway: '#5faa68', fairway2: '#6cb673', stripe: 'rgba(220,255,210,0.05)',
      fringe: '#79bd77', green: '#91d887', greenSheen: 'rgba(220,255,210,0.14)',
      sand: '#cdb474', sandEdge: 'rgba(70,50,25,0.6)',
      water: ['#2f8295', '#1d5f70'], waterSheen: 'rgba(210,245,255,0.16)'
    },
    silver: {
      roughTop: '#3d6f6a', roughBot: '#2a514f', blade: 'rgba(200,235,235,0.08)', flower: ['#bfe9e0', '#ffffff'],
      fairway: '#79c2a8', fairway2: '#86cdb2', stripe: 'rgba(225,255,250,0.07)',
      fringe: '#8fcfb0', green: '#a4debf', greenSheen: 'rgba(235,255,250,0.20)',
      sand: '#d9d3be', sandEdge: 'rgba(110,120,120,0.5)',
      water: ['#5aa6c0', '#3f7e9c'], waterSheen: 'rgba(240,255,255,0.26)'
    }
  };
  function pal(hole) { return T[hole.courseTheme] || T.willow; }

  // ============================ COASTLINE (coral) ==========================
  // Some coral holes run along the shore, others turn inland — giving the
  // course a real sense of geography. Keyed by hole.id so it's stable per hole.
  // side: 'right' | 'left' | null (no coast). Purely cosmetic background in the
  // rough margin; never overlaps playable surfaces or affects lie detection.
  var CORAL_COAST = {
    // FRONT NINE — head out along the shore, turn inland, come back to the water
    1: 'right', 2: 'right',          // open along the shore
    3: null, 4: null, 5: null,       // inland stretch
    6: 'left', 7: 'left',            // back to the water on the other side
    8: 'right', 9: 'right',          // finish the nine by the coast (near clubhouse)
    // BACK NINE — push inland again, then a dramatic coastal run for the finish
    10: 'left', 11: 'left',          // tenth heads back out, water on the left
    12: null, 13: null,              // turn inland
    14: 'right', 15: 'right',        // signature coastal stretch
    16: null,                        // one last inland hole
    17: 'left', 18: 'left'           // finishing holes sweep along the shore
  };

  function drawCoastline(ctx, hole, W, H, p, timeMs) {
    if (hole.courseTheme !== 'coral') return;
    var side = CORAL_COAST[hole.id];
    if (!side) return;

    // The coast occupies the outer ~26% of the rough on the chosen side: an
    // inner wet-sand beach, then the sea fading out to the edge, with an
    // animated surf line where they meet.
    var beachW = W * 0.13;     // beach band width
    var seaW = W * 0.22;       // sea band width beyond the beach
    var edgeX, beachInner, seaOuter, dir;
    if (side === 'right') {
      dir = 1;
      seaOuter = W;                       // sea hugs the right edge
      var seaInner = W - seaW;
      beachInner = seaInner - beachW;     // beach is inland of the sea
      edgeX = seaInner;
    } else {
      dir = -1;
      seaOuter = 0;
      var seaInnerL = seaW;
      beachInner = seaInnerL + beachW;
      edgeX = seaInnerL;
    }

    ctx.save();
    // --- sea ---
    var sx0 = (side === 'right') ? (W - seaW) : 0;
    var seaGrad = (side === 'right')
      ? lin(ctx, W - seaW, 0, W, 0, [[0, '#2fd0d8'], [1, '#1488ac']])
      : lin(ctx, seaW, 0, 0, 0, [[0, '#2fd0d8'], [1, '#1488ac']]);
    ctx.fillStyle = seaGrad;
    ctx.fillRect(sx0, 0, seaW, H);
    // animated surf highlights
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 1.1;
    for (var y = 0; y < H; y += 11) {
      ctx.beginPath();
      for (var x = sx0 - 6; x <= sx0 + seaW + 6; x += 8) {
        var wv = Math.sin((x + timeMs * 0.05) * 0.07 + y * 0.2) * 2.2;
        if (x === sx0 - 6) ctx.moveTo(x, y + wv); else ctx.lineTo(x, y + wv);
      }
      ctx.stroke();
    }
    // --- beach (wet sand fading to dry toward the fairway) ---
    var bx0 = (side === 'right') ? beachInner : (seaW);
    var beachGrad = (side === 'right')
      ? lin(ctx, beachInner, 0, edgeX, 0, [[0, 'rgba(243,230,190,0)'], [0.4, '#f3e6be'], [1, '#efdcb0']])
      : lin(ctx, beachInner, 0, edgeX, 0, [[0, 'rgba(243,230,190,0)'], [0.4, '#f3e6be'], [1, '#efdcb0']]);
    ctx.fillStyle = beachGrad;
    if (side === 'right') ctx.fillRect(beachInner, 0, edgeX - beachInner + seaW * 0.18, H);
    else ctx.fillRect(seaW * 0.82, 0, beachInner - seaW * 0.82, H);
    // --- surf foam line where sea meets sand ---
    var foamX = edgeX;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (var fy = 0; fy <= H; fy += 6) {
      var fwv = Math.sin(fy * 0.09 + timeMs * 0.0016) * 6 * dir + Math.sin(fy * 0.23 + timeMs * 0.0026) * 2.5;
      var fx = foamX + fwv;
      if (fy === 0) ctx.moveTo(fx, fy); else ctx.lineTo(fx, fy);
    }
    ctx.stroke();
    // scattered shells/pebbles on the beach
    var sr = rng(holeSeed(hole) + 71);
    for (var i = 0; i < 14; i++) {
      var px = (side === 'right') ? (beachInner + sr() * (edgeX - beachInner)) : (seaW + sr() * (beachInner - seaW));
      var py = sr() * H;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(px, py, 1.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ============================ ROUGH / BACKDROP ===========================
  function drawRough(ctx, W, H, p, theme, timeMs) {
    // vertical gradient base
    ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, p.roughTop], [1, p.roughBot]]);
    ctx.fillRect(0, 0, W, H);

    // theme-specific rough character
    if (theme === 'dunes') {
      // wind-combed diagonal grain
      ctx.strokeStyle = p.blade;
      ctx.lineWidth = 1.4;
      for (var y = -10; y < H + 10; y += 7) {
        ctx.beginPath();
        for (var x = -10; x < W + 10; x += 10) {
          var wob = Math.sin((x + y) * 0.05) * 3;
          if (x === -10) ctx.moveTo(x, y + wob); else ctx.lineTo(x, y + wob);
        }
        ctx.stroke();
      }
    } else if (theme === 'pine') {
      // dappled forest-floor shadow blotches
      var pr = rng(99);
      for (var i = 0; i < 90; i++) {
        var bx = pr() * W, by = pr() * H, br = 8 + pr() * 26;
        ctx.fillStyle = 'rgba(6,26,14,0.10)';
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      }
    } else if (theme === 'coral') {
      // lush tropical floor: darker foliage clumps + occasional warm sandy patches
      var cr = rng(41);
      for (var ci = 0; ci < 70; ci++) {
        var cbx = cr() * W, cby = cr() * H, cbr = 6 + cr() * 18;
        ctx.fillStyle = 'rgba(28,90,52,0.16)';
        ctx.beginPath(); ctx.arc(cbx, cby, cbr, 0, Math.PI * 2); ctx.fill();
      }
      for (var cj = 0; cj < 16; cj++) {
        var csx = cr() * W, csy = cr() * H, csr = 10 + cr() * 22;
        ctx.fillStyle = 'rgba(232,214,160,0.10)';
        ctx.beginPath(); ctx.ellipse(csx, csy, csr, csr * 0.6, cr() * 3, 0, Math.PI * 2); ctx.fill();
      }
      for (var chb = 0; chb < 50; chb++) {
        ctx.fillStyle = p.blade;
        ctx.fillRect(cr() * W, cr() * H, 7, 2);
      }
    } else {
      // soft mown-blade flecks (willow/silver)
      for (var yy = -8; yy < H + 8; yy += 11) {
        for (var xx = -8; xx < W + 8; xx += 14) {
          var seed = (xx * 17 + yy * 31) % 19;
          ctx.fillStyle = p.blade;
          ctx.fillRect(xx + ((yy / 11) % 2) * 4, yy, 8 + (seed % 4), 2);
        }
      }
    }

    // willow & silver get a sprinkling of wildflowers/sparkle in the rough
    if (theme === 'willow' || theme === 'silver') {
      var fr = rng(theme === 'willow' ? 7 : 23);
      for (var f = 0; f < 70; f++) {
        var fx = fr() * W, fy = fr() * H;
        ctx.fillStyle = p.flower[(f % p.flower.length)];
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(fx, fy, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  // ============================ WATER ======================================
  function drawWater(ctx, hole, timeMs, p, theme) {
    if (!hole.water || hole.water.length < 3) return;
    var b = bounds(hole.water);
    fillPoly(ctx, hole.water, lin(ctx, 0, b.minY, 0, b.maxY, [[0, p.water[0]], [1, p.water[1]]]), p.sandEdge, 2);
    clipPoly(ctx, hole.water, function () {
      // coral: visible reef patches under the surface
      if (theme === 'coral') {
        var rr = rng(holeSeed(hole) + 5);
        for (var i = 0; i < 7; i++) {
          var rx = b.minX + rr() * (b.maxX - b.minX), ry = b.minY + rr() * (b.maxY - b.minY);
          ctx.fillStyle = p.reef;
          ctx.beginPath(); ctx.ellipse(rx, ry, 10 + rr() * 14, 7 + rr() * 9, rr() * 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      // animated highlight ripples
      for (var y = b.minY; y < b.maxY; y += 9) {
        ctx.strokeStyle = p.waterSheen;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (var x = b.minX - 10; x <= b.maxX + 12; x += 8) {
          var wave = Math.sin((x + timeMs * 0.045) * 0.06 + y * 0.18) * 2.4;
          if (x === b.minX - 10) ctx.moveTo(x, y + wave); else ctx.lineTo(x, y + wave);
        }
        ctx.stroke();
      }
    });
  }

  // ============================ FAIRWAY ====================================
  function drawFairway(ctx, hole, p, theme) {
    var b = bounds(hole.fairway);
    fillPoly(ctx, hole.fairway, lin(ctx, 0, b.minY, 0, b.maxY, [[0, p.fairway2], [1, p.fairway]]), 'rgba(35,74,33,0.4)', 2);
    clipPoly(ctx, hole.fairway, function () {
      // mowing stripes — alternating light bands, angled per theme
      var ang = (theme === 'dunes') ? 0.18 : (theme === 'pine') ? -0.12 : 0;
      ctx.save();
      ctx.translate(b.minX, b.minY);
      ctx.rotate(ang);
      var span = (b.maxX - b.minX) + (b.maxY - b.minY) + 80;
      for (var i = -span; i < span; i += 30) {
        ctx.fillStyle = ((Math.floor(i / 30) % 2) === 0) ? p.stripe : 'rgba(0,0,0,0.03)';
        ctx.fillRect(i, -span, 15, span * 2);
      }
      ctx.restore();
    });
  }

  // ============================ BUNKERS ====================================
  function drawBunkers(ctx, hole, p, theme) {
    hole.bunkers.forEach(function (bk, idx) {
      var b = bounds(bk);
      if (theme === 'dunes') {
        // revetted pot bunker: dark stacked-sod ring + bright sand centre
        fillPoly(ctx, bk, '#6b4f25', 'rgba(40,28,12,0.8)', 3);
        ctx.save();
        clipPoly(ctx, bk, function () {
          ctx.fillStyle = p.sand;
          var cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
          ctx.beginPath(); ctx.ellipse(cx, cy, (b.maxX - b.minX) * 0.36, (b.maxY - b.minY) * 0.36, 0, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
      } else {
        var grad = rad(ctx, (b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, 2, Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.7,
          [[0, p.sand], [1, theme === 'coral' ? '#f0dca8' : '#d8c089']]);
        fillPoly(ctx, bk, grad, p.sandEdge, 2);
        clipPoly(ctx, bk, function () {
          // raked lines following the bunker's long axis
          for (var x = b.minX; x <= b.maxX; x += 9) {
            ctx.strokeStyle = 'rgba(120,90,40,0.10)';
            ctx.beginPath(); ctx.moveTo(x, b.minY - 5); ctx.lineTo(x + 12, b.maxY + 5); ctx.stroke();
          }
        });
      }
    });
  }

  // ============================ GREEN ======================================
  function drawGreen(ctx, hole, p, theme) {
    fillPoly(ctx, hole.greenRing, p.fringe, 'rgba(45,100,45,0.34)', 2);
    var b = bounds(hole.green);
    var cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    // domed green: radial light toward crown
    fillPoly(ctx, hole.green, rad(ctx, cx - 6, cy - 6, 3, Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.7,
      [[0, p.green], [1, theme === 'silver' ? '#8fd0b0' : '#86c96a']]), 'rgba(56,120,47,0.4)', 2);
    clipPoly(ctx, hole.green, function () {
      ctx.fillStyle = p.greenSheen;
      ctx.beginPath(); ctx.ellipse(cx - 5, cy - 5, (b.maxX - b.minX) * 0.3, (b.maxY - b.minY) * 0.24, -0.3, 0, Math.PI * 2); ctx.fill();
    });
  }

  // ============================ SURROUNDINGS ===============================
  // Extra atmosphere drawn in the rough margins (never over playable surfaces,
  // because they sit at the hole's edges by construction of the décor seeds).
  function drawSurroundings(ctx, hole, W, H, p, theme, timeMs) {
    var r = rng(holeSeed(hole));
    if (theme === 'willow') {
      // weeping willow fronds hanging from the top corners
      drawWillowTree(ctx, 40, 90, 1.1, timeMs);
      drawWillowTree(ctx, W - 44, 120, 0.95, timeMs);
    } else if (theme === 'pine') {
      // tall layered pines along the left & right margins with long shadows
      for (var i = 0; i < 5; i++) {
        var py = 80 + i * (H - 140) / 4;
        drawTallPine(ctx, 26 + (i % 2) * 8, py, 1 + r() * 0.25);
        drawTallPine(ctx, W - 30 - (i % 2) * 8, py + 30, 1 + r() * 0.25);
      }
    } else if (theme === 'dunes') {
      // marram grass tufts scattered in the rough
      for (var t = 0; t < 26; t++) {
        var gx = r() * W, gy = r() * H;
        drawMarram(ctx, gx, gy, 0.7 + r() * 0.6, timeMs);
      }
    } else if (theme === 'silver') {
      // faint glowing orbs / fireflies for a twilight feel
      for (var o = 0; o < 16; o++) {
        var ox = r() * W, oy = r() * H;
        var pulse = 0.3 + 0.3 * Math.sin(timeMs * 0.002 + o);
        ctx.fillStyle = 'rgba(190,240,235,' + pulse.toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(ox, oy, 1.8, 0, Math.PI * 2); ctx.fill();
      }
    }
    // coral surroundings handled by its existing palm themeExtras (kept)
  }

  function drawWillowTree(ctx, x, y, s, timeMs) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.ellipse(0, 26, 26, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5e4329'; ctx.fillRect(-3, 4, 6, 22);
    // drooping fronds
    var sway = Math.sin(timeMs * 0.0012) * 3;
    for (var a = -3; a <= 3; a++) {
      ctx.strokeStyle = 'rgba(120,180,90,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a * 6, -6);
      ctx.quadraticCurveTo(a * 9 + sway, 14, a * 7 + sway * 1.4, 30);
      ctx.stroke();
    }
    ctx.fillStyle = '#6fae54'; ctx.beginPath(); ctx.arc(0, -10, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(150,205,120,0.5)'; ctx.beginPath(); ctx.arc(-6, -15, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawTallPine(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(4,18,10,0.28)';
    ctx.beginPath(); ctx.ellipse(10, 30, 26, 8, 0, 0, Math.PI * 2); ctx.fill(); // long shadow
    ctx.fillStyle = '#5a3d24'; ctx.fillRect(-2.5, 14, 5, 18);
    ['#164a2c', '#1d5836', '#246340'].forEach(function (c, i) {
      ctx.fillStyle = c;
      var w = 22 - i * 4, yy = -8 - i * 14;
      ctx.beginPath(); ctx.moveTo(0, yy - 18); ctx.lineTo(-w, yy + 14); ctx.lineTo(w, yy + 14); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }

  function drawMarram(ctx, x, y, s, timeMs) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    var sway = Math.sin(timeMs * 0.002 + x * 0.1) * 2;
    ctx.strokeStyle = 'rgba(170,140,70,0.6)'; ctx.lineWidth = 1.2;
    for (var i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * 2, 0); ctx.quadraticCurveTo(i * 3 + sway, -8, i * 4 + sway * 1.6, -16); ctx.stroke();
    }
    ctx.restore();
  }

  // ============================ COMPOSE ====================================
  drawCourse = function drawCourseVisualRedo(ctx, hole, W, H, timeMs, showSlope) {
    var theme = hole.courseTheme || 'willow';
    var p = pal(hole);
    try {
      drawRough(ctx, W, H, p, theme, timeMs);
      drawCoastline(ctx, hole, W, H, p, timeMs);
      drawWater(ctx, hole, timeMs, p, theme);
      drawFairway(ctx, hole, p, theme);
      fillPoly(ctx, hole.tee, p.fringe, 'rgba(44,87,42,0.5)', 2);
      drawBunkers(ctx, hole, p, theme);
      drawGreen(ctx, hole, p, theme);
      // surroundings sit behind the in-play trees/props so playable items read on top
      drawSurroundings(ctx, hole, W, H, p, theme, timeMs);
      // Base oaks only suit the parkland-style courses. Coral is palms-only,
      // dunes is a treeless links — skip the generic oaks there so we don't get
      // mismatched/duplicate trees.
      var drawOaks = !(theme === 'coral' || theme === 'dunes');
      if (drawOaks && typeof drawTrees === 'function') drawTrees(ctx, hole);
      if (typeof drawProps === 'function') drawProps(ctx, hole);
      if (typeof drawThemeExtrasV046 === 'function') drawThemeExtrasV046(ctx, hole);
      if (typeof drawCupAndFlag === 'function') drawCupAndFlag(ctx, hole);
      if (showSlope && typeof drawSlopeRead === 'function') drawSlopeRead(ctx, hole, timeMs);
    } catch (e) {
      // On any error, fall back to the previous themed renderer so the game is
      // never left unrendered.
      try { prevDrawCourse(ctx, hole, W, H, timeMs, showSlope); } catch (_) {}
    }
  };

  window.courseVisualsLoaded = true;
})();
