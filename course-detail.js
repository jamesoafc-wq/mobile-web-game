// ============================================================================
// course-detail.js  ·  high-detail per-theme objects for the new courses
// ----------------------------------------------------------------------------
// Wraps drawThemeExtrasV046 so it first runs the original, then layers rich,
// course-specific detailing for the NEW themes. Drawn in world space (the camera
// transform is already applied by the draw loop) using the hole's own polygons.
//
// This first instalment details: MAGNOLIA GRAND ('masters') — the immaculate
// championship finale: azalea flower banks around the green & fairway edges,
// blossoming trees, bright-white sand sparkle, and fountains in the water.
// Other new themes will be added in subsequent passes.
// ============================================================================

(function () {
  'use strict';
  if (typeof drawThemeExtrasV046 !== 'function') return;

  // ---- tiny self-contained helpers ----
  function seeded(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function holeSeed(hole) { return Math.floor((hole.cup.x * 73 + hole.cup.y * 131 + (hole.par || 4) * 17)) || 1; }

  // ---- sprite image loader (real prop PNGs). Async; until ready, nothing draws
  // for that sprite, so it's always safe. ----
  var SPRITE_VER = 'v2';   // bump when sprite PNGs change to bust the cache
  var spriteCache = {};
  function sprite(url) {
    if (spriteCache[url]) return spriteCache[url];
    var rec = { img: new Image(), ready: false };
    rec.img.onload = function () { rec.ready = true; };
    rec.img.onerror = function () { rec.ready = false; };
    rec.img.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + SPRITE_VER;
    spriteCache[url] = rec;
    return rec;
  }
  // draw a sprite centred at (x,y) with a given world width, keeping aspect +
  // a soft contact shadow. wWorld = desired on-course width in px.
  function drawSprite(ctx, url, x, y, wWorld, sway) {
    var rec = sprite(url);
    if (!rec.ready) return false;
    var iw = rec.img.width || 1, ih = rec.img.height || 1;
    var s = wWorld / iw, dw = wWorld, dh = ih * s;
    // contact shadow (stays put on the ground)
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(x, y + dh * 0.34, dw * 0.4, dh * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    // optional wind sway: lean the top of the sprite, pivoting at its base
    if (sway) {
      ctx.save();
      ctx.translate(x, y + dh * 0.38);
      ctx.transform(1, 0, sway, 1, 0, 0);   // shear top sideways
      ctx.drawImage(rec.img, -dw / 2, -dh, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(rec.img, x - dw / 2, y - dh * 0.62, dw, dh);
    }
    return true;
  }
  // a gentle per-prop wind sway value from time + position
  function windSway(x, y, timeMs) {
    return Math.sin((timeMs || 0) * 0.0011 + (x + y) * 0.05) * 0.05;
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
  // is (x,y) on a playable surface we must NOT cover with props?
  function onPlay(hole, x, y, pad) {
    pad = pad || 0;
    function near(poly) {
      if (!poly || poly.length < 3) return false;
      if (inPoly(x, y, poly)) return true;
      if (pad > 0) { // cheap padding: test a ring of points
        for (var a = 0; a < 6.28; a += 1.05) if (inPoly(x + Math.cos(a) * pad, y + Math.sin(a) * pad, poly)) return true;
      }
      return false;
    }
    if (near(hole.fairway)) return true;
    if (near(hole.greenRing)) return true;
    if (near(hole.green)) return true;
    if (near(hole.tee)) return true;
    if (hole.water && near(hole.water)) return true;
    if (hole.bunkers) for (var i = 0; i < hole.bunkers.length; i++) if (near(hole.bunkers[i])) return true;
    return false;
  }
  // Scatter `count` props densely across the ROUGH (avoiding play), calling
  // draw(x,y,scale,rnd) for each accepted point. Returns how many placed.
  function scatterRough(hole, rnd, count, pad, draw) {
    var placed = 0, tries = 0, max = count * 8;
    var W = 420, H = 760;
    while (placed < count && tries < max) {
      tries++;
      var x = 8 + rnd() * (W - 16), y = 74 + rnd() * (H - 150);
      if (onPlay(hole, x, y, pad)) continue;
      draw(x, y, 0.85 + rnd() * 0.6, rnd);
      placed++;
    }
    return placed;
  }

  // ---- CHUNKY pixel-art tree (layered opaque clumps + hard shadow) ----
  // styleColours: { trunk, shadow, dark, mid, light }
  function chunkyTree(ctx, x, y, scale, rnd, col) {
    var s = scale * 1.35;   // bigger overall
    // hard drop shadow (consistent light down-right)
    ctx.fillStyle = col.shadow || 'rgba(20,50,25,0.32)';
    ctx.beginPath(); ctx.ellipse(x + 6 * s, y + 6 * s, 11 * s, 4.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    // trunk (tapered, two-tone)
    ctx.fillStyle = col.trunk || '#6a4a2c';
    ctx.beginPath();
    ctx.moveTo(x - 2.2 * s, y + 8 * s); ctx.lineTo(x - 1.4 * s, y + 1 * s);
    ctx.lineTo(x + 1.4 * s, y + 1 * s); ctx.lineTo(x + 2.2 * s, y + 8 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(x + 0.4 * s, y + 1 * s, 1.8 * s, 7 * s);
    // canopy: fuller, more layered — dark base ring of clumps, mid fill, light cap
    function clump(dx, dy, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); ctx.fill(); }
    // dark base (broad)
    clump(-5, -1, 7.5, col.dark); clump(5, -1, 7.5, col.dark); clump(0, -3, 9, col.dark);
    clump(-7, -4, 5.5, col.dark); clump(7, -4, 5.5, col.dark);
    // mid layer
    clump(-3, -5, 6, col.mid); clump(3, -5, 6, col.mid); clump(0, -7, 6.5, col.mid);
    clump(-6, -6, 4, col.mid); clump(6, -6, 4, col.mid);
    // light cap (toward light, upper-left)
    clump(-2, -9, 5, col.light); clump(2, -9.5, 4, col.light); clump(-4, -8, 3.5, col.light);
    // leaf-texture dabs (darker speckle)
    ctx.fillStyle = col.dark;
    for (var i = 0; i < 5; i++) ctx.beginPath(), ctx.arc(x + (rnd() - 0.5) * 16 * s, y - 4 * s + (rnd() - 0.5) * 10 * s, 1.3 * s, 0, Math.PI * 2), ctx.fill();
    // bright rim highlight on the cap
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(x - 4 * s, y - 10 * s, 2.4 * s, 0, Math.PI * 2); ctx.fill();
  }
  // small bush (two clumps + shadow) for filler
  function chunkyBush(ctx, x, y, scale, rnd, col) {
    var s = scale;
    ctx.fillStyle = col.shadow || 'rgba(20,50,25,0.3)';
    ctx.beginPath(); ctx.ellipse(x + 2 * s, y + 2.5 * s, 5 * s, 2.2 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col.dark; ctx.beginPath(); ctx.arc(x, y, 4 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col.mid; ctx.beginPath(); ctx.arc(x - 1.5 * s, y - 1.5 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col.light; ctx.beginPath(); ctx.arc(x - 2 * s, y - 2 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
  }
  // tree colour sets per family
  var TREECOL = {
    parkland: { trunk: '#6a4a2c', shadow: 'rgba(20,50,25,0.30)', dark: '#1f6b34', mid: '#2f8f46', light: '#4fb866' },
    pine:     { trunk: '#5a3f28', shadow: 'rgba(15,40,20,0.32)', dark: '#1a5a36', mid: '#247048', light: '#3a9162' },
    autumn:   { trunk: '#5a3a28', shadow: 'rgba(60,30,10,0.30)', dark: '#b5512c', mid: '#e0863c', light: '#f0bf57' },
    palm:     { trunk: '#8a5a32', shadow: 'rgba(20,50,25,0.30)', dark: '#1f7a44', mid: '#2f9e57', light: '#54c878' }
  };

  function pbounds(poly) {
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i];
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY, w: maxX - minX, h: maxY - minY,
             cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  }
  function polyCentroidEdge(poly, t) {
    // point at parameter t (0..1) around the polygon perimeter
    var n = poly.length, idx = Math.floor(t * n) % n, nx = (idx + 1) % n;
    var a = poly[idx], b = poly[nx], f = (t * n) % 1;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }

  // ---- azalea blossom cluster (pink/white mounds with dotted flowers) ----
  function azaleaBush(ctx, x, y, r, rnd, palette) {
    // foliage mound
    ctx.fillStyle = '#2f7a42';
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#256634';
    ctx.beginPath(); ctx.ellipse(x + r * 0.2, y + r * 0.2, r * 0.7, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    // blossoms
    var blooms = 10 + Math.floor(rnd() * 8);
    for (var i = 0; i < blooms; i++) {
      var a = rnd() * Math.PI * 2, rr = rnd() * r * 0.95;
      var bx = x + Math.cos(a) * rr, by = y + Math.sin(a) * rr * 0.8;
      ctx.fillStyle = palette[Math.floor(rnd() * palette.length)];
      ctx.beginPath(); ctx.arc(bx, by, 1.4 + rnd() * 1.1, 0, Math.PI * 2); ctx.fill();
    }
    // a few bright highlights
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (var j = 0; j < 3; j++) {
      ctx.beginPath(); ctx.arc(x + (rnd() - 0.5) * r, y + (rnd() - 0.5) * r * 0.7, 0.8, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---- flowering tree (white/pink magnolia canopy) ----
  function blossomTree(ctx, x, y, scale, rnd, palette) {
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath(); ctx.ellipse(x + 3 * scale, y + 4 * scale, 9 * scale, 4 * scale, 0, 0, Math.PI * 2); ctx.fill();
    // trunk
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(x - 1.4 * scale, y - 2 * scale, 2.8 * scale, 9 * scale);
    // canopy mounds
    var mounds = 4;
    for (var i = 0; i < mounds; i++) {
      var mx = x + (rnd() - 0.5) * 12 * scale, my = y - 6 * scale - rnd() * 6 * scale;
      var mr = (5 + rnd() * 3) * scale;
      ctx.fillStyle = '#2f7a42';
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
      // blossom dusting
      var nb = 8 + Math.floor(rnd() * 6);
      for (var b = 0; b < nb; b++) {
        var a = rnd() * Math.PI * 2, rr = rnd() * mr;
        ctx.fillStyle = palette[Math.floor(rnd() * palette.length)];
        ctx.beginPath(); ctx.arc(mx + Math.cos(a) * rr, my + Math.sin(a) * rr, 1 + rnd(), 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // ---- fountain in water (concentric rings + spray) ----
  function fountain(ctx, x, y, timeMs) {
    var t = (timeMs || 0) * 0.004;
    ctx.save();
    // basin ring
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
    // animated ripples
    for (var i = 0; i < 3; i++) {
      var rr = 3 + ((t + i * 0.5) % 1) * 9;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - ((t + i * 0.5) % 1))).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke();
    }
    // central jet
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.ellipse(x, y - 6, 1.4, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (var s = 0; s < 6; s++) {
      var a = (s / 6) * Math.PI * 2 + t, sx = x + Math.cos(a) * 4, sy = y - 4 + Math.sin(a) * 2;
      ctx.beginPath(); ctx.arc(sx, sy, 0.9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ---- Magnolia Grand detailing ----
  function detailMasters(ctx, hole, timeMs) {
    var rnd = seeded(holeSeed(hole));
    // immaculate, lush dark-green tree colour set (Augusta-style pines/hardwoods)
    var MAS_TREE = { trunk: '#5a3f28', shadow: 'rgba(12,38,18,0.34)', dark: '#155a30', mid: '#1f7a40', light: '#39a35e' };

    // a parked golf cart near the tee on some holes, tucked clear of play
    if (hole.start && (holeSeed(hole) % 2) === 0) {
      var candidates = [
        { x: hole.start.x - 42, y: hole.start.y - 6 },
        { x: hole.start.x + 42, y: hole.start.y - 6 },
        { x: hole.start.x - 38, y: hole.start.y + 24 }
      ];
      for (var ci = 0; ci < candidates.length; ci++) {
        var cpos = candidates[ci];
        if (cpos.x > 20 && cpos.x < 400 && !onPlay(hole, cpos.x, cpos.y, 18)) {
          drawSprite(ctx, 'sprites/cart.png', cpos.x, cpos.y, 34);
          break;
        }
      }
    }

    // 1) DENSE clean tree wall framing the hole — magnolia sprites + dark pines
    scatterRough(hole, rnd, 26, 11, function (x, y, sc, r) {
      if (r() < 0.5) { if (!drawSprite(ctx, 'sprites/magnolia.png', x, y, 28 + sc * 14)) chunkyTree(ctx, x, y, 1.15 + sc * 0.6, r, MAS_TREE); }
      else if (r() < 0.85) { if (!drawSprite(ctx, 'sprites/oak.png', x, y, 30 + sc * 16)) chunkyTree(ctx, x, y, 1.15 + sc * 0.6, r, MAS_TREE); }
      else chunkyBush(ctx, x, y, sc, r, MAS_TREE);
    });

    // 2) a single restrained azalea flower bank tucked just behind the green
    //    (the one tasteful pop of colour — not bushes scattered everywhere)
    if (hole.green && hole.green.length > 3) {
      var gb = pbounds(hole.green);
      flowerBank(ctx, gb.cx, gb.minY - 10, gb.w * 0.7, rnd);
    }

    // 3) brilliant white-sand sheen on bunkers (kept — it's a signature)
    if (hole.bunkers) {
      hole.bunkers.forEach(function (bk) {
        if (!bk || bk.length < 3) return;
        var bb = pbounds(bk);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (var s = 0; s < 6; s++) {
          var sx = bb.minX + rnd() * bb.w, sy = bb.minY + rnd() * bb.h;
          ctx.beginPath(); ctx.arc(sx, sy, 0.6, 0, Math.PI * 2); ctx.fill();
        }
      });
    }

    // 4) a tasteful fountain only if there's a water feature
    if (hole.water && hole.water.length > 3) {
      var wb = pbounds(hole.water);
      fountain(ctx, wb.cx, wb.cy, timeMs);
    } else if ((holeSeed(hole) % 2) === 0) {
      // decorative pond in a rough corner on ~half the holes (more water feel)
      var corners = [[70, 200], [350, 240], [80, 480], [340, 500]];
      for (var ci = 0; ci < corners.length; ci++) {
        var px = corners[ci][0], py = corners[ci][1];
        if (!onPlay(hole, px, py, 30)) { decorPond(ctx, px, py, 26, 18, timeMs); break; }
      }
    }
  }
  // a small ornamental pond (flat banded water + edge + fountain)
  function decorPond(ctx, cx, cy, rx, ry, timeMs) {
    ctx.save();
    ctx.fillStyle = '#1d6fa8'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2f9ad0'; ctx.beginPath(); ctx.ellipse(cx, cy - 2, rx * 0.8, ry * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3aa85e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    // sparkle
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (var i = 0; i < 8; i++) { ctx.fillRect(cx - rx + Math.random() * rx * 2, cy - ry + Math.random() * ry * 2, 1.2, 1.2); }
    fountain(ctx, cx, cy, timeMs);
    ctx.restore();
  }

  // a low, neat bank of azalea colour (a soft mound of pink/white dabs, not bushes)
  function flowerBank(ctx, cx, cy, w, rnd) {
    var AZ = ['#e87fb0', '#ff8fc0', '#ffffff', '#d86a9a'];
    var n = Math.max(18, Math.floor(w / 4));
    // green base mound
    ctx.fillStyle = '#1f7a40';
    ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#155a30';
    ctx.beginPath(); ctx.ellipse(cx, cy + 1.5, w * 0.5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    // flower dabs across the mound
    for (var i = 0; i < n; i++) {
      var fx = cx - w * 0.48 + (i / n) * w * 0.96 + (rnd() - 0.5) * 3;
      var fy = cy - 2 + (rnd() - 0.5) * 5;
      ctx.fillStyle = AZ[Math.floor(rnd() * AZ.length)];
      ctx.beginPath(); ctx.arc(fx, fy, 1.1 + rnd() * 1, 0, Math.PI * 2); ctx.fill();
    }
  }

  // tiered grandstand packed with little spectators
  function grandstand(ctx, x, y, w, rnd) {
    var rows = 5, rh = 3.4, depth = w * 0.42;
    ctx.save();
    // structure (perspective trapezoid)
    ctx.fillStyle = '#6b7078';
    ctx.beginPath();
    ctx.moveTo(x, y + rows * rh);
    ctx.lineTo(x + w, y + rows * rh);
    ctx.lineTo(x + w - 6, y - depth);
    ctx.lineTo(x + 6, y - depth);
    ctx.closePath(); ctx.fill();
    // tier steps + crowd
    for (var r = 0; r < rows; r++) {
      var ry = y + (rows - r) * rh - depth * (r / rows);
      var inset = 6 * (1 - r / rows);
      ctx.fillStyle = r % 2 ? '#7a808a' : '#727880';
      ctx.fillRect(x + inset, ry, w - inset * 2, rh - 0.6);
      // spectators: dotted heads in varied colours
      var heads = Math.floor((w - inset * 2) / 3);
      for (var hh = 0; hh < heads; hh++) {
        var hx = x + inset + 1.5 + hh * 3 + (rnd() - 0.5);
        ctx.fillStyle = ['#e8c4a0','#d8a888','#c89878','#f0d0b0'][Math.floor(rnd() * 4)];
        ctx.beginPath(); ctx.arc(hx, ry - 0.4, 0.9, 0, Math.PI * 2); ctx.fill();
        // occasional bright clothing dot
        if (rnd() < 0.3) {
          ctx.fillStyle = ['#d94f4f','#4f7fd9','#ffffff','#e8d44f'][Math.floor(rnd() * 4)];
          ctx.fillRect(hx - 0.5, ry + 0.4, 1, 1.2);
        }
      }
    }
    // roof lip
    ctx.fillStyle = '#565b62';
    ctx.fillRect(x + 6, y - depth - 1.5, w - 12, 2);
    ctx.restore();
  }

  // white gallery ropes on stakes following a polygon's edge
  function galleryRopes(ctx, poly, rnd) {
    var pts = [];
    var n = 18;
    for (var i = 0; i < n; i++) {
      var p = polyCentroidEdge(poly, i / n);
      // push outward a touch from the fairway
      pts.push(p);
    }
    ctx.save();
    // stakes
    ctx.fillStyle = '#e8e8e0';
    pts.forEach(function (p) {
      ctx.fillRect(p.x - 0.5, p.y - 3, 1, 3);
    });
    // rope (sagging segments between stakes)
    ctx.strokeStyle = 'rgba(245,245,235,0.85)'; ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      if (Math.hypot(b.x - a.x, b.y - a.y) > 30) continue; // don't span big gaps
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + 1.5;  // sag
      ctx.moveTo(a.x, a.y - 2.4);
      ctx.quadraticCurveTo(mx, my - 2.4, b.x, b.y - 2.4);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ========================================================================
  // HIGHLAND MOOR — drystone walls, heather clumps, lochs, grazing sheep, mist
  // ========================================================================
  function detailMoor(ctx, hole, timeMs) {
    var rnd = seeded(holeSeed(hole));
    // heather clumps (small olive mounds with tiny purple bells) in the rough
    for (var i = 0; i < 26; i++) {
      var hx = (rnd() < 0.5 ? 12 + rnd() * 70 : 340 + rnd() * 60), hy = 80 + rnd() * 580;
      ctx.fillStyle = '#5a6a3a';
      ctx.beginPath(); ctx.ellipse(hx, hy, 3 + rnd() * 2, 2 + rnd(), 0, 0, Math.PI * 2); ctx.fill();
      var bells = 5 + Math.floor(rnd() * 5);
      for (var b = 0; b < bells; b++) {
        ctx.fillStyle = rnd() < 0.5 ? '#9a6fb0' : '#b98ccc';
        ctx.beginPath(); ctx.arc(hx + (rnd() - 0.5) * 6, hy + (rnd() - 0.5) * 4, 0.8, 0, Math.PI * 2); ctx.fill();
      }
    }
    // drystone walls running through the rough (grey stacked stones)
    drystoneWall(ctx, 60, 150, 120, 6, rnd);
    drystoneWall(ctx, 250, 470, 110, -5, rnd);
    // grazing sheep near walls
    for (var s = 0; s < 4; s++) sheep(ctx, 70 + rnd() * 260, 120 + rnd() * 520, rnd);
    // drifting mist bands
    ctx.save();
    for (var m = 0; m < 3; m++) {
      var my = 120 + m * 200 + Math.sin((timeMs || 0) * 0.0003 + m) * 20;
      ctx.fillStyle = 'rgba(225,228,235,0.10)';
      ctx.beginPath(); ctx.ellipse(210, my, 230, 26, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function drystoneWall(ctx, x, y, len, angDeg, rnd) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angDeg * Math.PI / 180);
    for (var i = 0; i < len; i += 4) {
      var sh = 2 + rnd() * 1.5;
      ctx.fillStyle = ['#9a9488', '#8a8478', '#a8a298'][Math.floor(rnd() * 3)];
      ctx.fillRect(i, -sh, 3.6, sh * 2);
      ctx.strokeStyle = 'rgba(80,75,65,0.5)'; ctx.lineWidth = 0.3; ctx.strokeRect(i, -sh, 3.6, sh * 2);
    }
    ctx.restore();
  }
  function sheep(ctx, x, y, rnd) {
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.beginPath(); ctx.ellipse(x + 1, y + 2, 4, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eef0ee'; ctx.beginPath(); ctx.ellipse(x, y, 3.4, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.arc(x - 3, y - 0.5, 1.1, 0, Math.PI * 2); ctx.fill();
  }

  // ========================================================================
  // COASTAL CLIFFS — cliff edges, crashing surf, lighthouse, gulls, dune grass
  // ========================================================================
  function detailCliffs(ctx, hole, timeMs) {
    var rnd = seeded(holeSeed(hole));
    var t = (timeMs || 0) * 0.001;
    // a lighthouse on a clifftop corner — only on a few holes, clear of play.
    if ((holeSeed(hole) % 3) === 0) {
      var corners = [[34, 110], [386, 110], [34, 160], [386, 160]];
      for (var ci = 0; ci < corners.length; ci++) {
        var lx = corners[ci][0], ly = corners[ci][1];
        if (!onPlay(hole, lx, ly, 26)) {
          if (!drawSprite(ctx, 'sprites/lighthouse.png', lx, ly, 50)) lighthouse(ctx, lx, ly, t);
          break;
        }
      }
    }
    // crashing surf foam along the bottom/edges (animated)
    ctx.save();
    for (var i = 0; i < 22; i++) {
      var fx = 10 + (i / 22) * 400, fy = 700 + Math.sin(t * 2 + i) * 6;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.3 * Math.sin(t * 3 + i)).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(fx, fy, 3 + rnd() * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // wind-bent dune grass tufts in the rough
    for (var g = 0; g < 30; g++) {
      var gx = (rnd() < 0.5 ? 12 + rnd() * 64 : 344 + rnd() * 60), gy = 90 + rnd() * 560;
      grassTuft(ctx, gx, gy, 0.25, rnd);
    }
    // gulls (little M shapes) drifting
    ctx.strokeStyle = 'rgba(60,70,80,0.6)'; ctx.lineWidth = 1;
    for (var k = 0; k < 5; k++) {
      var bx = 60 + ((k * 80 + t * 30) % 320), by = 90 + (k * 47) % 180;
      ctx.beginPath(); ctx.moveTo(bx - 3, by); ctx.quadraticCurveTo(bx, by - 2, bx, by); ctx.quadraticCurveTo(bx, by - 2, bx + 3, by); ctx.stroke();
    }
  }
  function lighthouse(ctx, x, y, t) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 14, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
    // tower with red/white bands
    for (var i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? '#d94f4f' : '#f4f4f0';
      ctx.beginPath();
      var topW = 4 - i * 0.3, botW = 4.5 - i * 0.3, yy = y + 12 - i * 5;
      ctx.moveTo(x - botW, yy); ctx.lineTo(x + botW, yy); ctx.lineTo(x + topW, yy - 5); ctx.lineTo(x - topW, yy - 5); ctx.closePath(); ctx.fill();
    }
    // lantern room + rotating beam
    ctx.fillStyle = '#2a2a30'; ctx.fillRect(x - 3, y - 16, 6, 4);
    ctx.fillStyle = 'rgba(255,240,180,' + (0.3 + 0.4 * Math.abs(Math.sin(t))).toFixed(2) + ')';
    ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x + 30 * Math.cos(t), y - 14 + 30 * Math.sin(t) * 0.3); ctx.lineTo(x + 30 * Math.cos(t + 0.3), y - 14 + 30 * Math.sin(t + 0.3) * 0.3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function grassTuft(ctx, x, y, lean, rnd) {
    ctx.strokeStyle = '#a8b35e'; ctx.lineWidth = 0.7;
    for (var i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(x + i - 2, y);
      ctx.quadraticCurveTo(x + i - 2 + lean * 8, y - 4, x + i - 2 + lean * 14, y - 7); ctx.stroke();
    }
  }

  // ========================================================================
  // AMBER HOLLOW (autumn) — fallen leaves, bare/golden trees, log piles, stream sparkle
  // ========================================================================
  function detailAutumn(ctx, hole, timeMs) {
    var rnd = seeded(holeSeed(hole));
    var LEAF = ['#d9542c', '#e8923c', '#e8c046', '#b5652c', '#c0392b'];
    // scattered fallen leaves across rough + fairway edges
    for (var i = 0; i < 90; i++) {
      var lx = 10 + rnd() * 400, ly = 80 + rnd() * 590;
      ctx.fillStyle = LEAF[Math.floor(rnd() * LEAF.length)];
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(rnd() * Math.PI);
      ctx.beginPath(); ctx.ellipse(0, 0, 1.6, 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    // big autumn trees densely filling the rough (chunky pixel style)
    scatterRough(hole, rnd, 30, 9, function (x, y, sc, r) {
      if (r() < 0.72) chunkyTree(ctx, x, y, 1.1 + sc * 0.6, r, TREECOL.autumn);
      else chunkyBush(ctx, x, y, sc, r, TREECOL.autumn);
    });
    // a rustic log pile
    logPile(ctx, (holeSeed(hole) % 2) ? 64 : 356, 200 + (holeSeed(hole) % 200), rnd);
  }
  function autumnTree(ctx, x, y, scale, rnd, palette) {
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.ellipse(x + 3 * scale, y + 4 * scale, 9 * scale, 4 * scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a3a28'; ctx.fillRect(x - 1.6 * scale, y - 2 * scale, 3.2 * scale, 10 * scale);
    for (var i = 0; i < 5; i++) {
      var mx = x + (rnd() - 0.5) * 13 * scale, my = y - 7 * scale - rnd() * 7 * scale, mr = (5 + rnd() * 3.5) * scale;
      ctx.fillStyle = palette[Math.floor(rnd() * palette.length)];
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    }
  }
  function logPile(ctx, x, y, rnd) {
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3 - r; c++) {
      var lx = x + c * 5 + r * 2.5, ly = y - r * 4;
      ctx.fillStyle = '#7a5230'; ctx.beginPath(); ctx.arc(lx, ly, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#caa472'; ctx.beginPath(); ctx.arc(lx, ly, 1.3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ========================================================================
  // CYPRESS GLADES — cypress trees w/ knees, lily pads, reeds, herons, gator
  // ========================================================================
  function detailGlades(ctx, hole, timeMs) {
    var rnd = seeded(holeSeed(hole));
    var t = (timeMs || 0) * 0.001;
    // MARSH: shallow low-water pools with reeds scattered through the rough,
    // so the surrounds read as wetland, not just grass.
    scatterRough(hole, rnd, 9, 16, function (x, y, sc, r) {
      var pw = 16 + r() * 22, ph = 10 + r() * 14;
      // shallow water pool
      ctx.fillStyle = 'rgba(60,110,100,0.55)'; ctx.beginPath(); ctx.ellipse(x, y, pw, ph, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(90,140,120,0.4)'; ctx.beginPath(); ctx.ellipse(x, y - 1, pw * 0.7, ph * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      // muddy rim
      ctx.strokeStyle = 'rgba(80,90,50,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, pw, ph, 0, 0, Math.PI * 2); ctx.stroke();
      // reed clumps poking out
      ctx.strokeStyle = '#7a8a4a'; ctx.lineWidth = 0.9;
      for (var b = 0; b < 7; b++) {
        var rx = x - pw * 0.6 + r() * pw * 1.2, ry = y - ph * 0.4 + r() * ph * 0.8;
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + (r() - 0.5) * 3, ry - 5 - r() * 4); ctx.stroke();
      }
      // a lily pad or two
      if (r() < 0.6) { ctx.fillStyle = '#3a6e3a'; ctx.beginPath(); ctx.arc(x + (r()-0.5)*pw, y + (r()-0.5)*ph, 2.5, 0.4, Math.PI * 2); ctx.fill(); }
    });
    // cypress trees densely filling the rough margins
    scatterRough(hole, rnd, 20, 9, function (x, y, sc, r) {
      if (r() < 0.7) cypress(ctx, x, y, 1.3 + sc * 0.6, r);
      else chunkyBush(ctx, x, y, sc, r, TREECOL.pine);
    });
    // lily pads + reeds in/around water
    if (hole.water && hole.water.length > 3) {
      var wb = pbounds(hole.water);
      for (var i = 0; i < 14; i++) {
        var px = wb.minX + rnd() * wb.w, py = wb.minY + rnd() * wb.h;
        ctx.fillStyle = '#3a6e3a'; ctx.beginPath(); ctx.arc(px, py, 2 + rnd() * 1.5, 0.4, Math.PI * 2); ctx.fill();
        if (rnd() < 0.3) { ctx.fillStyle = '#e8d46a'; ctx.beginPath(); ctx.arc(px, py, 0.8, 0, Math.PI * 2); ctx.fill(); }
      }
      // a basking gator near the water edge
      gator(ctx, wb.cx, wb.maxY - 4, t);
      // a heron standing at the edge
      heron(ctx, wb.minX + 6, wb.maxY - 2);
    }
    // reed clumps in the rough
    for (var g = 0; g < 24; g++) {
      var gx = (rnd() < 0.5 ? 12 + rnd() * 64 : 344 + rnd() * 60), gy = 90 + rnd() * 560;
      ctx.strokeStyle = '#b5a85e'; ctx.lineWidth = 0.8;
      for (var b = 0; b < 4; b++) { ctx.beginPath(); ctx.moveTo(gx + b, gy); ctx.lineTo(gx + b + (rnd() - 0.5) * 2, gy - 6 - rnd() * 3); ctx.stroke(); }
    }
  }
  function cypress(ctx, x, y, scale, rnd) {
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 4 * scale, 7 * scale, 3 * scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6a4a30'; ctx.fillRect(x - 1.3 * scale, y - 2 * scale, 2.6 * scale, 9 * scale);
    // conical canopy
    ctx.fillStyle = '#3a5e3a';
    for (var i = 0; i < 3; i++) {
      ctx.beginPath(); var yy = y - 4 * scale - i * 4 * scale, w = (7 - i * 1.6) * scale;
      ctx.moveTo(x - w, yy); ctx.lineTo(x + w, yy); ctx.lineTo(x, yy - 6 * scale); ctx.closePath(); ctx.fill();
    }
    // hanging moss
    ctx.strokeStyle = 'rgba(150,170,120,0.6)'; ctx.lineWidth = 0.6;
    for (var m = 0; m < 4; m++) { var mx = x + (rnd() - 0.5) * 10 * scale; ctx.beginPath(); ctx.moveTo(mx, y - 4 * scale); ctx.lineTo(mx, y - 4 * scale + 3 + rnd() * 3); ctx.stroke(); }
  }
  function gator(ctx, x, y, t) {
    ctx.save(); ctx.fillStyle = '#3f5a3a';
    ctx.beginPath(); ctx.ellipse(x, y, 9, 2.4, 0, 0, Math.PI * 2); ctx.fill();   // body
    ctx.beginPath(); ctx.ellipse(x - 10, y, 4, 1.6, 0, 0, Math.PI * 2); ctx.fill(); // snout
    // ridged back
    ctx.fillStyle = '#324a30';
    for (var i = -6; i < 8; i += 3) { ctx.beginPath(); ctx.moveTo(x + i, y - 2); ctx.lineTo(x + i + 1.5, y - 3.6); ctx.lineTo(x + i + 3, y - 2); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#e8d44f'; ctx.beginPath(); ctx.arc(x - 12, y - 1, 0.7, 0, Math.PI * 2); ctx.fill(); // eye
    ctx.restore();
  }
  function heron(ctx, x, y) {
    ctx.strokeStyle = '#d8d8d0'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 8); ctx.stroke(); // leg
    ctx.fillStyle = '#e8e8e0'; ctx.beginPath(); ctx.ellipse(x, y - 11, 2.2, 3.2, 0, 0, Math.PI * 2); ctx.fill(); // body
    ctx.beginPath(); ctx.arc(x, y - 15, 1.4, 0, Math.PI * 2); ctx.fill(); // head
    ctx.strokeStyle = '#e8a23c'; ctx.beginPath(); ctx.moveTo(x + 1, y - 15); ctx.lineTo(x + 4, y - 14); ctx.stroke(); // beak
  }

  // ========================================================================
  // SEA OF SERENITY (moon) — craters, Earth in the black sky, lander, flag, footprints
  // ========================================================================
  function detailMoon(ctx, hole, timeMs) {
    var rnd = seeded(holeSeed(hole));
    // space scenery: faint stars scattered in the dark rough (avoid play)
    scatterRough(hole, rnd, 60, 2, function (x, y, sc, r) {
      var br = 0.3 + r() * 0.6;
      ctx.fillStyle = 'rgba(255,255,255,' + br.toFixed(2) + ')';
      var sz = r() < 0.85 ? 0.8 : 1.5;
      ctx.fillRect(x, y, sz, sz);
      if (r() > 0.95) { // occasional twinkle cross
        ctx.fillRect(x - 1, y + 0.4, 3, 0.4); ctx.fillRect(x + 0.4, y - 1, 0.4, 3);
      }
    });
    // craters scattered across the rough (ringed depressions)
    for (var i = 0; i < 16; i++) {
      var cx = 10 + rnd() * 400, cy = 80 + rnd() * 590, cr = 5 + rnd() * 14;
      if (!onPlay(hole, cx, cy, 6)) crater(ctx, cx, cy, cr, rnd);
    }
    // Earth hanging in the black sky (top area), with a soft glow
    earthInSky(ctx, 340, 70);
    // a lunar lander + flag near the tee (deterministic)
    if (hole.start) { lander(ctx, hole.start.x - 30, hole.start.y - 10); usFlag(ctx, hole.start.x + 26, hole.start.y - 8); }
    // bootprint trail meandering on the fairway
    ctx.fillStyle = 'rgba(60,64,72,0.5)';
    var px = 200, py = 600;
    for (var b = 0; b < 16; b++) { px += (rnd() - 0.5) * 14; py -= 14 + rnd() * 6; ctx.beginPath(); ctx.ellipse(px + (b % 2 ? 2 : -2), py, 1.2, 2, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  function crater(ctx, x, y, r, rnd) {
    ctx.save();
    ctx.fillStyle = '#42464f'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.78, 0, 0, Math.PI * 2); ctx.fill();   // floor
    ctx.fillStyle = '#5a5f6b'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.12, r * 0.7, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9aa0ad'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.78, 0, 0, Math.PI * 2); ctx.stroke(); // bright rim
    ctx.restore();
  }
  function earthInSky(ctx, x, y) {
    ctx.save();
    var g = ctx.createRadialGradient(x, y, 1, x, y, 26); g.addColorStop(0, 'rgba(120,170,255,0.25)'); g.addColorStop(1, 'rgba(120,170,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a6ea5'; ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5fae5e'; // continents
    ctx.beginPath(); ctx.ellipse(x - 4, y - 2, 5, 3, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 5, y + 4, 3.5, 2.5, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(x + 2, y - 5, 4, 1.6, 0.3, 0, Math.PI * 2); ctx.fill(); // cloud
    ctx.restore();
  }
  function lander(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = '#c9a84a'; ctx.fillRect(x - 5, y - 6, 10, 7);   // gold foil body
    ctx.strokeStyle = '#8a8a90'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 5, y + 1); ctx.lineTo(x - 9, y + 6); ctx.moveTo(x + 5, y + 1); ctx.lineTo(x + 9, y + 6); ctx.stroke(); // legs
    ctx.fillStyle = '#6a6f7b'; ctx.fillRect(x - 2, y - 10, 4, 4); // upper module
    ctx.restore();
  }
  function usFlag(ctx, x, y) {
    ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 12); ctx.stroke();
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x, y - 12, 8, 5);
    ctx.fillStyle = '#c0392b'; for (var i = 0; i < 3; i++) ctx.fillRect(x, y - 12 + i * 1.6, 8, 0.8);
    ctx.fillStyle = '#2a3a8a'; ctx.fillRect(x, y - 12, 3, 2.5);
  }

  // ========================================================================
  // OLYMPUS LINKS (mars) — red rocks, dust devils, rover, ice patches, alien sky
  // ========================================================================
  function detailMars(ctx, hole, timeMs) {
    var rnd = seeded(holeSeed(hole));
    var t = (timeMs || 0) * 0.001;
    // faint stars in the dusty sky + a small distant moon (Phobos)
    scatterRough(hole, rnd, 36, 2, function (x, y, sc, r) {
      if (y > 200) return;
      ctx.fillStyle = 'rgba(255,240,230,' + (0.25 + r() * 0.4).toFixed(2) + ')';
      ctx.fillRect(x, y, r() < 0.85 ? 0.8 : 1.4, r() < 0.85 ? 0.8 : 1.4);
    });
    if ((holeSeed(hole) % 2) === 0) {
      ctx.fillStyle = '#b8a89a'; ctx.beginPath(); ctx.arc(58, 96, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9a8a7a'; ctx.beginPath(); ctx.arc(60, 98, 2, 0, Math.PI * 2); ctx.fill();
    }
    // boulder fields
    for (var i = 0; i < 20; i++) {
      var rx = 10 + rnd() * 400, ry = 80 + rnd() * 590, rr = 2 + rnd() * 5;
      ctx.fillStyle = ['#8a3a24', '#6a2a18', '#9c4a30'][Math.floor(rnd() * 3)];
      ctx.beginPath(); ctx.ellipse(rx, ry, rr, rr * 0.8, rnd(), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(rx + rr * 0.4, ry + rr * 0.5, rr * 0.7, rr * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    }
    // a rover near the tee
    if (hole.start) rover(ctx, hole.start.x - 28, hole.start.y - 6);
    // dust devils (animated swirls)
    for (var d = 0; d < 2; d++) {
      var dx = 90 + d * 180 + Math.sin(t + d) * 30, dy = 200 + d * 200;
      dustDevil(ctx, dx, dy, t + d * 2);
    }
    // ice patches (pale blue translucent blobs)
    for (var p = 0; p < 5; p++) {
      var ix = 30 + rnd() * 360, iy = 100 + rnd() * 520;
      ctx.fillStyle = 'rgba(220,235,245,0.45)'; ctx.beginPath(); ctx.ellipse(ix, iy, 6 + rnd() * 5, 4 + rnd() * 3, rnd(), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(ix - 2, iy - 1, 2, 1, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  function rover(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = '#c9c4b8'; ctx.fillRect(x - 6, y - 4, 12, 5);   // body
    ctx.fillStyle = '#2a2a30';
    [-4, 0, 4].forEach(function (wx) { ctx.beginPath(); ctx.arc(x + wx, y + 2, 1.6, 0, Math.PI * 2); ctx.fill(); }); // wheels
    ctx.fillStyle = '#3a4a8a'; ctx.fillRect(x + 3, y - 8, 6, 4);   // solar panel
    ctx.strokeStyle = '#8a8a90'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - 5, y - 4); ctx.lineTo(x - 8, y - 9); ctx.stroke(); // mast
    ctx.fillStyle = '#d8d8d0'; ctx.beginPath(); ctx.arc(x - 8, y - 9, 1.2, 0, Math.PI * 2); ctx.fill(); // camera
    ctx.restore();
  }
  function dustDevil(ctx, x, y, t) {
    ctx.save();
    for (var i = 0; i < 10; i++) {
      var yy = y - i * 5, w = 2 + i * 1.4, ph = t * 3 + i * 0.6;
      ctx.fillStyle = 'rgba(200,120,80,' + (0.18 - i * 0.012).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(x + Math.sin(ph) * w * 0.5, yy, w, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ========================================================================
  // FLOATING ISLES (sky) — void background, island undersides, clouds, waterfalls
  // ========================================================================
  function detailSky(ctx, hole, timeMs) {
    var rnd = seeded(holeSeed(hole));
    var t = (timeMs || 0) * 0.001;
    // BIG clouds drifting continuously BELOW the islands. We clip them OUT of the
    // play surfaces (fairway/green/tee), so a cloud slides smoothly under the
    // island and reappears the other side — no pop in/out.
    ctx.save();
    if (typeof clipOutPlay === 'function') clipOutPlay(ctx, hole);
    for (var i = 0; i < 7; i++) {
      var cx = ((i * 150 + t * 14) % 560) - 70;
      var cy = 110 + (i * 89) % 560;
      bigCloud(ctx, cx, cy, 1.4 + (i % 3) * 0.5);
    }
    ctx.restore();
    // the odd bird gliding past, above everything
    for (var b = 0; b < 3; b++) {
      var bx = -20 + ((b * 150 + t * 36) % 480);
      var by = 120 + (b * 173) % 480;
      bird(ctx, bx, by, t + b);
    }
  }
  // clip so subsequent draws only show OUTSIDE the play surfaces (the void)
  function clipOutPlay(ctx, hole) {
    ctx.beginPath();
    ctx.rect(0, 0, 420, 760);
    [hole.fairway, hole.greenRing, hole.green, hole.tee].forEach(function (poly) {
      if (poly && poly.length > 2) {
        ctx.moveTo(poly[0].x, poly[0].y);
        for (var i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
        ctx.closePath();
      }
    });
    ctx.clip('evenodd');
  }
  function bigCloud(ctx, x, y, s) {
    ctx.save();
    // soft shadow underneath
    ctx.fillStyle = 'rgba(150,180,210,0.35)';
    [[0,2,13],[12,4,10],[-12,4,10],[5,-3,9],[-7,-2,8]].forEach(function (m) { ctx.beginPath(); ctx.ellipse(x + m[0]*s, y + m[1]*s + 2, m[2]*s, m[2]*s*0.7, 0, 0, Math.PI*2); ctx.fill(); });
    // white body
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    [[0,0,13],[12,2,10],[-12,2,10],[5,-5,9],[-7,-4,8]].forEach(function (m) { ctx.beginPath(); ctx.ellipse(x + m[0]*s, y + m[1]*s, m[2]*s, m[2]*s*0.72, 0, 0, Math.PI*2); ctx.fill(); });
    ctx.restore();
  }
  function bird(ctx, x, y, t) {
    var flap = Math.sin(t * 4) * 2.2;
    ctx.strokeStyle = 'rgba(40,50,60,0.7)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 5, y); ctx.quadraticCurveTo(x - 2, y - 2 - flap, x, y);
    ctx.quadraticCurveTo(x + 2, y - 2 - flap, x + 5, y); ctx.stroke();
  }
  function cloud(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    [[0,0,6],[6,1,5],[-6,1,5],[2,-2,4]].forEach(function (m) { ctx.beginPath(); ctx.arc(x + m[0]*s, y + m[1]*s, m[2]*s, 0, Math.PI*2); ctx.fill(); });
  }
  function islandUnderside(ctx, poly, rnd, t) {
    // draw a brown rocky taper hanging below the polygon's lower edge
    var b = pbounds(poly);
    ctx.save();
    ctx.fillStyle = '#6a4a32';
    ctx.beginPath();
    ctx.moveTo(b.minX + b.w * 0.2, b.maxY - 2);
    ctx.lineTo(b.maxX - b.w * 0.2, b.maxY - 2);
    ctx.lineTo(b.cx + b.w * 0.08, b.maxY + b.h * 0.5);
    ctx.lineTo(b.cx, b.maxY + b.h * 0.7);
    ctx.lineTo(b.cx - b.w * 0.08, b.maxY + b.h * 0.5);
    ctx.closePath(); ctx.fill();
    // rock striations
    ctx.fillStyle = '#8a6446';
    ctx.beginPath(); ctx.moveTo(b.minX + b.w * 0.25, b.maxY - 1); ctx.lineTo(b.cx, b.maxY + b.h * 0.55); ctx.lineTo(b.cx - b.w * 0.1, b.maxY); ctx.closePath(); ctx.fill();
    // a waterfall spilling off one edge
    var wfx = b.minX + b.w * 0.3;
    ctx.fillStyle = 'rgba(200,235,255,0.5)';
    ctx.fillRect(wfx, b.maxY - 2, 2.2, b.h * 0.5 + Math.sin(t * 4) * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(wfx + 1, b.maxY + b.h * 0.5, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function floatingIslet(ctx, x, y, s, rnd) {
    ctx.save();
    ctx.fillStyle = '#74c266'; ctx.beginPath(); ctx.ellipse(x, y, 10 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill(); // grass top
    ctx.fillStyle = '#6a4a32'; ctx.beginPath();
    ctx.moveTo(x - 9 * s, y); ctx.lineTo(x + 9 * s, y); ctx.lineTo(x, y + 12 * s); ctx.closePath(); ctx.fill(); // rock base
    ctx.restore();
  }

  // ---- original-course detailing in the new chunky style ----
  function detailWillow(ctx, hole, timeMs) {
    var rnd = seeded(holeSeed(hole));
    scatterRough(hole, rnd, 26, 11, function (x, y, sc, r) {
      if (r() < 0.8) { if (!drawSprite(ctx, 'sprites/oak.png', x, y, 30 + sc * 16)) chunkyTree(ctx, x, y, 1.1 + sc * 0.6, r, TREECOL.parkland); }
      else chunkyBush(ctx, x, y, sc, r, TREECOL.parkland);
    });
  }
  function detailPine(ctx, hole, timeMs) {
    var rnd = seeded(holeSeed(hole));
    scatterRough(hole, rnd, 30, 9, function (x, y, sc, r) {
      if (!drawSprite(ctx, 'sprites/pine.png', x, y, 26 + sc * 14, windSway(x, y, timeMs) * 0.5)) pineTree(ctx, x, y, 1.1 + sc * 0.7, r);
    });
  }
  function pineTree(ctx, x, y, scale, rnd) {
    var s = scale, col = TREECOL.pine;
    ctx.fillStyle = col.shadow; ctx.beginPath(); ctx.ellipse(x + 4 * s, y + 5 * s, 6 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = col.trunk; ctx.fillRect(x - 1 * s, y + 2 * s, 2 * s, 5 * s);
    // stacked conical tiers
    for (var i = 0; i < 3; i++) {
      var yy = y + 2 * s - i * 4 * s, w = (7 - i * 1.8) * s;
      ctx.fillStyle = i === 2 ? col.light : (i === 1 ? col.mid : col.dark);
      ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.lineTo(x + w, yy); ctx.lineTo(x, yy - 6 * s); ctx.closePath(); ctx.fill();
    }
  }
  function detailCoral(ctx, hole, timeMs) {
    var rnd = seeded(holeSeed(hole));
    // BEACH + lagoon along one edge of some holes (drawn first, behind props).
    // Side rotates by hole so it's not always the same corner.
    var beachSide = holeSeed(hole) % 4;  // 0 none, 1 left, 2 right, 3 top-corner
    if (beachSide !== 0) coralBeach(ctx, hole, beachSide, timeMs);
    // palms + bushes in the rough (palms sway in the sea breeze)
    scatterRough(hole, rnd, 18, 10, function (x, y, sc, r) {
      if (r() < 0.65) { if (!drawSprite(ctx, 'sprites/palm.png', x, y, 26 + sc * 14, windSway(x, y, timeMs))) palmTree(ctx, x, y, 1.0 + sc * 0.6, r); }
      else chunkyBush(ctx, x, y, sc, r, TREECOL.palm);
    });
  }
  function coralBeach(ctx, hole, side, timeMs) {
    var W = 420, H = 760, t = (timeMs || 0) * 0.001, T = 14, top = 0;
    var sand = '#ecd9a9', sandDk = '#d8c08a', sea1 = '#3fb0c0', sea2 = '#2f8fa8';
    var sandEdge = 'rgba(120,100,55,0.8)', seaEdge = 'rgba(20,70,90,0.8)';
    ctx.save();
    // bands now run to the very top (top:0) and are wider so they don't revert
    // to green near the screen edge.
    var band, seaBand;
    if (side === 1) { band = { x: 0, y: top, w: 70, h: H }; seaBand = { x: 0, y: top, w: 32, h: H }; }
    else if (side === 2) { band = { x: W - 70, y: top, w: 70, h: H }; seaBand = { x: W - 32, y: top, w: 32, h: H }; }
    else { band = { x: 0, y: top, w: W, h: 76 }; seaBand = { x: 0, y: top, w: W, h: 34 }; }

    // build a classification grid for these bands so we can draw hard borders
    // wherever beach/sea meets a non-beach cell (grass or play) — same cut-out
    // look the fairway/bunkers have.
    function cellKind(cx, cy) {
      // returns 'sea' | 'sand' | null (null = leave as-is / grass / play)
      if (cx < seaBand.x || cx >= seaBand.x + seaBand.w || cy < seaBand.y || cy >= seaBand.y + seaBand.h) {
        // not in sea band; maybe sand band
      } else if (!onPlay(hole, cx + 7, cy + 7, 0)) return 'sea';
      if (cx < band.x || cx >= band.x + band.w || cy < band.y || cy >= band.y + band.h) return null;
      if (onPlay(hole, cx + 7, cy + 7, 0)) return null;
      return 'sand';
    }
    var cols = Math.ceil(W / T), rows = Math.ceil(H / T), grid = [];
    for (var r = 0; r < rows; r++) { grid[r] = []; for (var c = 0; c < cols; c++) grid[r][c] = cellKind(c * T, r * T); }
    // paint bases
    for (var r2 = 0; r2 < rows; r2++) for (var c2 = 0; c2 < cols; c2++) {
      var k = grid[r2][c2]; if (!k) continue;
      var x = c2 * T, y = r2 * T, chk = (c2 + r2) % 2;
      ctx.fillStyle = k === 'sea' ? (chk ? sea1 : sea2) : (chk ? sand : sandDk);
      ctx.fillRect(x, y, T + 0.6, T + 0.6);
    }
    // hard borders where a cell differs from its neighbour (incl. against grass)
    for (var r3 = 0; r3 < rows; r3++) for (var c3 = 0; c3 < cols; c3++) {
      var k0 = grid[r3][c3]; if (!k0) continue;
      var x3 = c3 * T, y3 = r3 * T;
      var up = r3 > 0 ? grid[r3-1][c3] : null, lf = c3 > 0 ? grid[r3][c3-1] : null;
      var dn = r3 < rows-1 ? grid[r3+1][c3] : null, rt = c3 < cols-1 ? grid[r3][c3+1] : null;
      ctx.fillStyle = k0 === 'sea' ? seaEdge : sandEdge;
      if (up !== k0) ctx.fillRect(x3, y3, T + 0.6, 1.8);
      if (lf !== k0) ctx.fillRect(x3, y3, 1.8, T + 0.6);
      if (dn !== k0) ctx.fillRect(x3, y3 + T - 1.2, T + 0.6, 1.8);
      if (rt !== k0) ctx.fillRect(x3 + T - 1.2, y3, 1.8, T + 0.6);
    }
    // foam sparkle on the sea
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (var i = 0; i < 30; i++) {
      var fx = seaBand.x + (seaBand.w > 100 ? (i / 30) * seaBand.w : seaBand.w * 0.7);
      var fy = seaBand.y + (i / 30) * seaBand.h;
      if (!onPlay(hole, fx, fy, 0)) ctx.fillRect(fx, fy + Math.sin(t * 2 + i) * 2, 1.6, 1.6);
    }
    ctx.restore();
  }
  function palmTree(ctx, x, y, scale, rnd) {
    var s = scale, col = TREECOL.palm;
    ctx.fillStyle = col.shadow; ctx.beginPath(); ctx.ellipse(x + 4 * s, y + 4 * s, 7 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
    // curved trunk
    ctx.strokeStyle = col.trunk; ctx.lineWidth = 2.2 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + 4 * s); ctx.quadraticCurveTo(x + 2 * s, y - 4 * s, x + 1 * s, y - 9 * s); ctx.stroke();
    // fronds
    var fx = x + 1 * s, fy = y - 9 * s;
    [-1.4, -0.7, 0, 0.7, 1.4].forEach(function (a) {
      ctx.strokeStyle = a % 2 === 0 ? col.mid : col.dark; ctx.lineWidth = 1.6 * s;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + Math.cos(a - 1.57) * 8 * s, fy + Math.sin(a - 1.57) * 8 * s - 2 * s, fx + Math.cos(a - 1.57) * 12 * s, fy + Math.sin(a - 1.57) * 12 * s); ctx.stroke();
    });
    // coconuts
    ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.arc(fx - 1.5 * s, fy + 1 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
  }
  function detailDunes(ctx, hole, timeMs) {
    // arid links — a FEW cacti (like the old course had) + dense marram grass
    var rnd = seeded(holeSeed(hole));
    scatterRough(hole, rnd, 4, 12, function (x, y, sc, r) {
      drawSprite(ctx, 'sprites/cactus.png', x, y, 22 + sc * 12);
    });
    scatterRough(hole, rnd, 40, 4, function (x, y, sc, r) {
      ctx.strokeStyle = '#b8b06a'; ctx.lineWidth = 0.8;
      for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + i - 2, y); ctx.lineTo(x + i - 2 + (r() - 0.5) * 4, y - 5 - r() * 4); ctx.stroke(); }
    });
  }
  function detailSilver(ctx, hole, timeMs) {
    var rnd = seeded(holeSeed(hole));
    scatterRough(hole, rnd, 26, 9, function (x, y, sc, r) {
      // twilight birches: pale trunks, cool canopy
      if (r() < 0.7) chunkyTree(ctx, x, y, 1.0 + sc * 0.5, r, { trunk: '#cfd6d0', shadow: 'rgba(30,50,55,0.3)', dark: '#3a7a6a', mid: '#4f9e88', light: '#79c8b0' });
      else chunkyBush(ctx, x, y, sc, r, { shadow: 'rgba(30,50,55,0.3)', dark: '#3a7a6a', mid: '#4f9e88', light: '#79c8b0' });
    });
  }

  // ---- wrap the theme-extras dispatcher ----
  var beforeExtras = drawThemeExtrasV046;
  drawThemeExtrasV046 = function drawThemeExtrasDetailed(ctx, hole) {
    beforeExtras(ctx, hole);
    try {
      var t = (performance && performance.now) ? performance.now() : 0;
      var th = hole && hole.courseTheme;
      if (th === 'masters') detailMasters(ctx, hole, t);
      else if (th === 'moor') detailMoor(ctx, hole, t);
      else if (th === 'cliffs') detailCliffs(ctx, hole, t);
      else if (th === 'autumn') detailAutumn(ctx, hole, t);
      else if (th === 'glades') detailGlades(ctx, hole, t);
      else if (th === 'moon') detailMoon(ctx, hole, t);
      else if (th === 'mars') detailMars(ctx, hole, t);
      else if (th === 'sky') detailSky(ctx, hole, t);
      else if (th === 'willow') detailWillow(ctx, hole, t);
      else if (th === 'coral') detailCoral(ctx, hole, t);
      else if (th === 'dunes') detailDunes(ctx, hole, t);
      else if (th === 'pine') detailPine(ctx, hole, t);
      else if (th === 'silver') detailSilver(ctx, hole, t);
    } catch (e) {}
  };

  // The original 5 courses don't tag their holes with a courseTheme (only the
  // new courses do), so their new chunky-tree detailing never fired. Stamp the
  // theme from the course id when a course is applied.
  var ORIG_THEME = { willow: 'willow', coral: 'coral', dunes: 'dunes', pine: 'pine', silver: 'silver' };
  if (typeof applyCourseV045 === 'function') {
    var beforeApply = applyCourseV045;
    applyCourseV045 = function applyCourseThemed(course) {
      beforeApply(course);
      try {
        var th = (course && course.theme) || ORIG_THEME[course && course.id];
        if (th && typeof ROUND_HOLES_V035 !== 'undefined') {
          ROUND_HOLES_V035.forEach(function (h) { if (!h.courseTheme) h.courseTheme = th; });
          if (typeof hole !== 'undefined' && hole && !hole.courseTheme) hole.courseTheme = th;
        }
      } catch (e) {}
    };
  }

  window.courseDetailLoaded = true;
})();
