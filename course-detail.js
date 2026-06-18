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
    var AZ = ['#e87fb0', '#ff6fa0', '#ffffff', '#d86a9a', '#f4a8c8'];

    // 1) azalea banks hugging the green ring (the signature look)
    if (hole.greenRing && hole.greenRing.length > 3) {
      var ring = hole.greenRing;
      var count = 14;
      for (var i = 0; i < count; i++) {
        var t = i / count + rnd() * 0.02;
        var pt = polyCentroidEdge(ring, t);
        var gb = pbounds(hole.green);
        // push the bush slightly outward from the green centre
        var dx = pt.x - gb.cx, dy = pt.y - gb.cy, d = Math.hypot(dx, dy) || 1;
        var ox = pt.x + (dx / d) * 5, oy = pt.y + (dy / d) * 5;
        azaleaBush(ctx, ox, oy, 4 + rnd() * 3, rnd, AZ);
      }
    }

    // 2) bright white-sand sparkle on bunkers
    if (hole.bunkers) {
      hole.bunkers.forEach(function (bk) {
        if (!bk || bk.length < 3) return;
        var bb = pbounds(bk);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (var s = 0; s < 8; s++) {
          var sx = bb.minX + rnd() * bb.w, sy = bb.minY + rnd() * bb.h;
          ctx.beginPath(); ctx.arc(sx, sy, 0.6, 0, Math.PI * 2); ctx.fill();
        }
      });
    }

    // 3) fountains in any water
    if (hole.water && hole.water.length > 3) {
      var wb = pbounds(hole.water);
      fountain(ctx, wb.cx, wb.cy, timeMs);
    }

    // 4) blossoming trees scattered in the rough margins (away from play)
    var nTrees = 7;
    for (var k = 0; k < nTrees; k++) {
      var edge = rnd();
      var tx = edge < 0.5 ? 14 + rnd() * 46 : 360 + rnd() * 46 - 46;
      var ty = 80 + rnd() * 580;
      blossomTree(ctx, tx, ty, 1.9 + rnd() * 0.9, rnd, AZ);
    }

    // 5) grandstands with spectators, set back in the rough behind the green
    var gb2 = pbounds(hole.green);
    grandstand(ctx, Math.max(40, gb2.minX - 40), gb2.minY - 18, 54, rnd);
    grandstand(ctx, Math.min(380, gb2.maxX + 40) - 54, gb2.cy - 10, 48, rnd);

    // 6) gallery ropes on stakes lining the fairway corridor
    if (hole.fairway && hole.fairway.length > 3) galleryRopes(ctx, hole.fairway, rnd);
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

  // ---- wrap the theme-extras dispatcher ----
  var beforeExtras = drawThemeExtrasV046;
  drawThemeExtrasV046 = function drawThemeExtrasDetailed(ctx, hole) {
    beforeExtras(ctx, hole);
    try {
      var t = (performance && performance.now) ? performance.now() : 0;
      if (hole && hole.courseTheme === 'masters') detailMasters(ctx, hole, t);
    } catch (e) {}
  };

  window.courseDetailLoaded = true;
})();
