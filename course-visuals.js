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
    },
    desert: {
      roughTop: '#b06a36', roughBot: '#8f5025', blade: 'rgba(120,70,30,0.16)', flower: ['#e8c06a', '#d98c4a', '#f0d49a'],
      fairway: '#a9b86a', fairway2: '#b8c578', stripe: 'rgba(255,245,210,0.05)',
      fringe: '#b5be78', green: '#cdd68a', greenSheen: 'rgba(255,248,205,0.14)',
      sand: '#e7c98a', sandEdge: 'rgba(120,75,35,0.65)',
      water: ['#3f8aa0', '#2c6478'], waterSheen: 'rgba(220,245,255,0.14)',
      rock: '#9c4a2c', rockDark: '#7a3620', mesa: '#b8623a', sky: ['#f0c98a', '#e09a5a']
    },
    moor: {
      // recoloured: peat browns, sage/olive greens, grey stone & lochs.
      roughTop: '#6e6a4e', roughBot: '#54513a', blade: 'rgba(150,150,90,0.12)', flower: ['#9a6fb0', '#b98ccc', '#c9b46a'],
      fairway: '#8a9663', fairway2: '#96a06e', stripe: 'rgba(235,240,210,0.05)',
      fringe: '#8fa06b', green: '#a8bd80', greenSheen: 'rgba(228,240,205,0.15)',
      sand: '#b8a878', sandEdge: 'rgba(80,70,45,0.6)',
      water: ['#46586a', '#33424f'], waterSheen: 'rgba(200,215,230,0.16)',
      heather: '#9a6fb0', wall: '#9a9488', wallDark: '#736d61', sky: ['#c2c2cc', '#9a9aa8'], mist: 'rgba(225,228,235,0.20)'
    },
    cliffs: {
      roughTop: '#5f8a55', roughBot: '#4a7044', blade: 'rgba(210,235,170,0.10)', flower: ['#ffffff', '#f0e68c', '#e8a0b0'],
      fairway: '#7cbf6a', fairway2: '#8acb77', stripe: 'rgba(255,255,255,0.06)',
      fringe: '#84c473', green: '#9bd886', greenSheen: 'rgba(235,255,225,0.16)',
      sand: '#ece2c6', sandEdge: 'rgba(120,110,80,0.5)',
      water: ['#2f7d9c', '#1d5773'], waterSheen: 'rgba(255,255,255,0.22)',
      cliff: '#d8cfb4', cliffDark: '#b3a886', surf: 'rgba(255,255,255,0.8)', sky: ['#bfe0ee', '#8ec0d6']
    },
    autumn: {
      roughTop: '#8a5a2a', roughBot: '#6e441f', blade: 'rgba(200,120,50,0.14)', flower: ['#e8a23c', '#d9542c', '#f0c46a'],
      fairway: '#9fae54', fairway2: '#aeb863', stripe: 'rgba(255,240,200,0.05)',
      fringe: '#a8b35e', green: '#c0cb78', greenSheen: 'rgba(255,245,200,0.15)',
      sand: '#dcc28a', sandEdge: 'rgba(100,70,35,0.6)',
      water: ['#3a7a90', '#275868'], waterSheen: 'rgba(220,245,255,0.16)',
      canopy: ['#d9542c', '#e8923c', '#e8c046', '#b5652c'], leaf: 'rgba(220,120,50,0.5)', sky: ['#e8cf9a', '#d8a86a']
    },
    glades: {
      roughTop: '#4a7340', roughBot: '#385a30', blade: 'rgba(180,210,120,0.12)', flower: ['#e8d46a', '#ffffff', '#d8a0b0'],
      fairway: '#6f9e55', fairway2: '#7cab62', stripe: 'rgba(240,255,210,0.05)',
      fringe: '#79a85e', green: '#94c277', greenSheen: 'rgba(235,255,210,0.15)',
      sand: '#cabd86', sandEdge: 'rgba(80,70,40,0.55)',
      water: ['#3f6e6a', '#2a4f4c'], waterSheen: 'rgba(210,240,235,0.18)',
      marsh: '#8a9e5a', reed: '#b5a85e', cypress: '#3a5e3a', sky: ['#cfe0c8', '#9ab89a']
    },
    moon: {
      roughTop: '#6a6f7b', roughBot: '#535863', blade: 'rgba(200,205,215,0.06)', flower: ['#aeb4c0', '#c8ccd6'],
      fairway: '#878d9a', fairway2: '#959ba8', stripe: 'rgba(230,235,245,0.05)',
      fringe: '#9298a5', green: '#a7adba', greenSheen: 'rgba(235,240,250,0.14)',
      sand: '#b8bcc6', sandEdge: 'rgba(60,64,72,0.6)',
      water: ['#3a3f4a', '#2a2e36'], waterSheen: 'rgba(180,190,210,0.10)',
      crater: '#5a5f6b', craterDark: '#42464f', craterRim: '#9aa0ad', sky: ['#05060a', '#0a0c14'], earth: true
    },
    mars: {
      roughTop: '#9c4a30', roughBot: '#7a3620', blade: 'rgba(150,70,40,0.16)', flower: ['#c87a52', '#e0996a'],
      fairway: '#b5613f', fairway2: '#c47049', stripe: 'rgba(255,220,190,0.05)',
      fringe: '#bd6a46', green: '#cf8a5c', greenSheen: 'rgba(255,225,200,0.12)',
      sand: '#c98a5a', sandEdge: 'rgba(90,40,25,0.65)',
      water: ['#7a8aa0', '#5a6a80'], waterSheen: 'rgba(220,235,255,0.16)',
      rock: '#8a3a24', rockDark: '#6a2a18', ice: 'rgba(220,235,245,0.7)', sky: ['#d8a07a', '#c07850'], dust: 'rgba(200,120,80,0.12)'
    },
    sky: {
      roughTop: '#4e8e5a', roughBot: '#3a7046', blade: 'rgba(200,245,190,0.10)', flower: ['#ffd36b', '#ff9ab0', '#ffffff'],
      fairway: '#74c266', fairway2: '#82cd74', stripe: 'rgba(255,255,255,0.06)',
      fringe: '#7fc873', green: '#98dc88', greenSheen: 'rgba(235,255,220,0.18)',
      sand: '#ecd9a9', sandEdge: 'rgba(120,100,60,0.5)',
      water: ['#3b6ea5', '#2a5080'], waterSheen: 'rgba(220,240,255,0.20)',
      voidTop: '#bfe0ff', voidBot: '#5f8fc5', islandEdge: '#6a4a32', islandRock: '#8a6446', cloud: 'rgba(255,255,255,0.7)', sky: ['#cfe8ff', '#7fb2e0']
    },
    masters: {
      roughTop: '#2a8048', roughBot: '#1f6638', blade: 'rgba(180,255,170,0.10)', flower: ['#e87fb0', '#ff9ab0', '#ffffff', '#d86a9a'],
      fairway: '#37b85e', fairway2: '#45c46c', stripe: 'rgba(255,255,255,0.08)',
      fringe: '#5aa86e', green: '#5fd07e', greenSheen: 'rgba(240,255,230,0.22)',
      sand: '#fbf3da', sandEdge: 'rgba(150,130,80,0.5)',
      water: ['#2f9ad0', '#1d6fa8'], waterSheen: 'rgba(255,255,255,0.26)',
      azalea: ['#e87fb0', '#ff6fa0', '#ffffff', '#d86a9a'], fountain: 'rgba(255,255,255,0.85)', sky: ['#d8f0ff', '#9fd0f0']
    }
  };
  function pal(hole) { return T[hole.courseTheme] || T.willow; }
  // expose palettes for other modules (tile renderer etc.)
  window.__themePalette = function (hole) { return T[hole && hole.courseTheme] || T.willow; };
  window.__themeTable = T;

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
    var beachW = W * 0.075;    // beach band width
    var seaW = W * 0.125;      // sea band width beyond the beach (~1/5 total)
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
    // FLAT pixel-art ground: solid base, then a few large soft tonal patches in
    // the theme's rough tones (no vertical gradient). Reads as stylised turf.
    ctx.fillStyle = p.roughBot;
    ctx.fillRect(0, 0, W, H);
    // large irregular lighter patches for organic flat variation
    var r = (function () { var s = 12345; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
    ctx.fillStyle = p.roughTop;
    for (var i = 0; i < 7; i++) {
      var px = r() * W, py = r() * H, pr = 70 + r() * 130;
      ctx.beginPath(); ctx.ellipse(px, py, pr, pr * 0.7, r() * 6.28, 0, Math.PI * 2); ctx.fill();
    }
    // a third mid tone for depth if the theme provides one
    if (p.rough3) {
      ctx.fillStyle = p.rough3;
      for (var j = 0; j < 4; j++) {
        var qx = r() * W, qy = r() * H, qr = 50 + r() * 90;
        ctx.beginPath(); ctx.ellipse(qx, qy, qr, qr * 0.65, r() * 6.28, 0, Math.PI * 2); ctx.fill();
      }
    }

    // theme-specific rough character (kept; sits over the flat bands)
    if (theme === 'dunes') {
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
    // FLAT deep-water fill + crisp edge, then a flat lighter band on top (banded
    // water like the reference, no gradient).
    fillPoly(ctx, hole.water, p.water[1], 'rgba(20,50,70,0.55)', 2);
    clipPoly(ctx, hole.water, function () {
      ctx.fillStyle = p.water[0];
      ctx.beginPath(); ctx.ellipse(b.cx, b.minY + (b.maxY - b.minY) * 0.4, (b.maxX - b.minX) * 0.55, (b.maxY - b.minY) * 0.34, 0, 0, Math.PI * 2); ctx.fill();
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
    // hard drop shadow (consistent light: down-right) for that cut-out look
    ctx.save(); ctx.translate(1.5, 2.5); ctx.globalAlpha = 0.16;
    fillPoly(ctx, hole.fairway, '#0a2010', null, 0);
    ctx.restore();
    // FLAT fairway fill + crisp dark outline (no gradient)
    fillPoly(ctx, hole.fairway, p.fairway, 'rgba(20,55,24,0.5)', 2);
    clipPoly(ctx, hole.fairway, function () {
      // a lighter band toward the top edge (soft sunlit side) — still flat
      ctx.fillStyle = p.fairway2;
      ctx.beginPath(); ctx.ellipse(b.cx, b.minY + (b.maxY - b.minY) * 0.32, (b.maxX - b.minX) * 0.52, (b.maxY - b.minY) * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      // subtle mowing stripes
      var ang = (theme === 'dunes') ? 0.18 : (theme === 'pine') ? -0.12 : 0;
      ctx.save();
      ctx.translate(b.minX, b.minY);
      ctx.rotate(ang);
      var span = (b.maxX - b.minX) + (b.maxY - b.minY) + 80;
      for (var i = -span; i < span; i += 26) {
        ctx.fillStyle = ((Math.floor(i / 26) % 2) === 0) ? p.stripe : 'rgba(0,0,0,0.03)';
        ctx.fillRect(i, -span, 13, span * 2);
      }
      ctx.restore();
    });
  }

  // ============================ TEE BOX ====================================
  // A distinct, fully opaque manicured tee — its own slightly cooler/darker
  // mown tone with a crisp edge, so it reads as a tee box rather than blending
  // into (and appearing to show through to) the fairway.
  function drawTeeBox(ctx, hole, p, theme) {
    if (!hole.tee || hole.tee.length < 3) return;
    var b = bounds(hole.tee);
    // GUARANTEED opaque base in a DISTINCT tee tone (not the fairway colour,
    // which would look identical to — and thus see-through to — the fairway).
    var teeBase = shade(p.fairway, 0.86);
    fillPoly(ctx, hole.tee, teeBase, null, 0);
    var teeTop = shade(p.fairway2, 0.96), teeBot = shade(p.fairway, 0.8);
    fillPoly(ctx, hole.tee, lin(ctx, 0, b.minY, 0, b.maxY, [[0, teeTop], [1, teeBot]]),
             'rgba(20,48,20,0.85)', 2.5);
    clipPoly(ctx, hole.tee, function () {
      // fine tee-mowing stripes (tighter than fairway) for a manicured look
      for (var x = b.minX - 4; x <= b.maxX + 4; x += 8) {
        ctx.fillStyle = ((Math.floor(x / 8) % 2) === 0) ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
        ctx.fillRect(x, b.minY - 4, 4, (b.maxY - b.minY) + 8);
      }
    });
    // two tee markers
    var cx = (b.minX + b.maxX) / 2, my = b.minY + (b.maxY - b.minY) * 0.42;
    ctx.fillStyle = '#e8e8ee';
    ctx.beginPath(); ctx.arc(cx - 9, my, 2.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 9, my, 2.1, 0, Math.PI * 2); ctx.fill();
  }

  // lighten/darken a hex colour by a factor (>1 lighter, <1 darker)
  function shade(hex, f) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    var n = parseInt(m[1], 16);
    var r = Math.min(255, Math.round(((n >> 16) & 255) * f));
    var g = Math.min(255, Math.round(((n >> 8) & 255) * f));
    var bl = Math.min(255, Math.round((n & 255) * f));
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
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
        // hard shadow + FLAT sand + crisp edge
        ctx.save(); ctx.translate(1, 1.5); ctx.globalAlpha = 0.12;
        fillPoly(ctx, bk, '#0a2010', null, 0);
        ctx.restore();
        fillPoly(ctx, bk, p.sand, p.sandEdge, 2);
        clipPoly(ctx, bk, function () {
          // a slightly lighter flat centre for a touch of depth
          ctx.fillStyle = theme === 'coral' ? '#f7e8c0' : 'rgba(255,255,255,0.18)';
          ctx.beginPath(); ctx.ellipse((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, (b.maxX - b.minX) * 0.32, (b.maxY - b.minY) * 0.3, 0, 0, Math.PI * 2); ctx.fill();
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
    // GUARANTEED opaque fringe base first (kills fairway show-through), then the
    // fringe tone on top with its edge stroke.
    if (hole.greenRing && hole.greenRing.length > 2) {
      fillPoly(ctx, hole.greenRing, p.fringe, null, 0);
      fillPoly(ctx, hole.greenRing, p.fringe, 'rgba(45,100,45,0.34)', 2);
    }
    var b = bounds(hole.green);
    var cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    var maxR = Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.7;
    // hard drop shadow under the green (consistent light) for the raised look
    ctx.save(); ctx.translate(1.5, 2.5); ctx.globalAlpha = 0.16;
    fillPoly(ctx, hole.green, '#0a2010', null, 0);
    ctx.restore();
    // FLAT green base + crisp dark outline (no gradient base)
    fillPoly(ctx, hole.green, p.green, 'rgba(30,80,38,0.5)', 2);
    // DOME / HILL shading preserved: soft lit crown + soft far-side shadow,
    // clipped inside the green so the slope still reads as a raised mound.
    clipPoly(ctx, hole.green, function () {
      // lit crown toward the light (upper-left)
      var hi = rad(ctx, cx - 7, cy - 7, 2, maxR, [[0, p.greenLite || '#7fe08f'], [0.55, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]);
      ctx.globalAlpha = 0.5; ctx.fillStyle = hi;
      ctx.beginPath(); ctx.ellipse(cx, cy, maxR, maxR * 0.85, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      // far-side shadow (lower-right) for the fall-away
      var sh = rad(ctx, cx + 9, cy + 9, 2, maxR, [[0, 'rgba(20,60,28,0)'], [0.5, 'rgba(20,60,28,0)'], [1, 'rgba(20,60,28,0.5)']]);
      ctx.fillStyle = sh;
      ctx.beginPath(); ctx.ellipse(cx, cy, maxR, maxR * 0.85, 0, 0, Math.PI * 2); ctx.fill();
      // faint sheen fleck
      ctx.fillStyle = p.greenSheen;
      ctx.beginPath(); ctx.ellipse(cx - 5, cy - 5, (b.maxX - b.minX) * 0.26, (b.maxY - b.minY) * 0.2, -0.3, 0, Math.PI * 2); ctx.fill();
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
      drawTeeBox(ctx, hole, p, theme);
      drawBunkers(ctx, hole, p, theme);
      drawGreen(ctx, hole, p, theme);
      drawCourseDecorV046(ctx, hole, W, H, p, theme, timeMs, showSlope);
    } catch (e) {
      // On any error, fall back to the previous themed renderer so the game is
      // never left unrendered.
      try { prevDrawCourse(ctx, hole, W, H, timeMs, showSlope); } catch (_) {}
    }
  };

  // Decor-only pass (everything that sits ON TOP of the surfaces). Exposed
  // globally so an alternate surface renderer (tile-render.js) can paint its own
  // surfaces and then call this to layer trees/props/cup/flag/slope-read on top.
  function drawCourseDecorV046(ctx, hole, W, H, p, theme, timeMs, showSlope) {
    drawSurroundings(ctx, hole, W, H, p, theme, timeMs);
    var NO_OAK = { willow: 1, coral: 1, dunes: 1, pine: 1, silver: 1, moor: 1, cliffs: 1, autumn: 1, glades: 1, moon: 1, mars: 1, sky: 1, masters: 1 };
    if (!NO_OAK[theme] && typeof drawTrees === 'function') drawTrees(ctx, hole);
    if (typeof drawProps === 'function') drawProps(ctx, hole);
    if (typeof drawThemeExtrasV046 === 'function') drawThemeExtrasV046(ctx, hole);
    if (typeof drawCupAndFlag === 'function') drawCupAndFlag(ctx, hole);
    if (typeof drawSlopeRead === 'function') drawSlopeRead(ctx, hole, timeMs, !showSlope);
  }
  // global entry point for the tile renderer
  window.drawCourseDecorOnly = function (ctx2, hole, W2, H2, timeMs, showSlope) {
    var p = pal(hole), theme = hole.courseTheme;
    drawCourseDecorV046(ctx2, hole, W2, H2, p, theme, timeMs, showSlope);
  };

  window.courseVisualsLoaded = true;
})();
