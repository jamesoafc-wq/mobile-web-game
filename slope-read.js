// ============================================================================
// slope-read.js  ·  Field-based green-read arrows (loads LAST)
// ----------------------------------------------------------------------------
// Replaces the old per-zone chevron arrows (drawSlopeReadV036, which read the
// legacy slopeZones) with a grid of flow arrows sampled from the SAME height
// field the physics now uses (GreenField). Result: what you see is exactly what
// the ball does — the arrows point down the real gradient, drift downhill, and
// fade where the green is flat.
//
// Loads after every round-* file so this override wins. Pure rendering; called
// inside the world transform by the engine's draw() when in putting view.
// ============================================================================

(function () {
  'use strict';
  if (typeof window.GreenField !== 'function' && (!window.GreenField || typeof window.GreenField.greenSlope !== 'function')) {
    // GreenField not available — leave the existing drawSlopeRead in place.
    return;
  }

  function pointInGreen(hole, x, y) {
    var p = { x: x, y: y };
    return pointInPolygon(p, hole.green) ||
           (hole.greenRing && pointInPolygon(p, hole.greenRing));
  }

  function bounds(poly) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i];
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  // Draw one small chevron pointing along (dirX,dirY).
  function chevron(ctx, x, y, dirX, dirY, alpha, size) {
    var ang = Math.atan2(dirY, dirX);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#f4fff0';
    ctx.font = '800 ' + size.toFixed(1) + 'px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u203a', 0, 0); // ›
    ctx.restore();
  }

  drawSlopeRead = function drawSlopeReadField(ctx, hole, timeMs) {
    if (!hole || !hole.green || !window.GreenField) return;
    var gf = window.GreenField;
    var b = bounds(hole.green);
    var step = 15;                       // grid spacing in px
    var t = (timeMs || 0) * 0.001;

    for (var gx = b.minX; gx <= b.maxX; gx += step) {
      for (var gy = b.minY; gy <= b.maxY; gy += step) {
        if (!pointInGreen(hole, gx, gy)) continue;
        var s = gf.greenSlope(hole, gx, gy);     // downhill direction
        var mag = s.strength;
        if (mag < 1e-4) continue;
        var ux = s.x / mag, uy = s.y / mag;       // unit downhill

        // steepness -> visibility (clamped so flat greens are faint, steep ones clear)
        var steep = clamp(mag / 1.6, 0.12, 1);

        // animate: each arrow drifts downhill on a looping phase, fading in/out
        var phase = (t * (0.35 + steep * 0.5) + (gx * 0.013 + gy * 0.017)) % 1;
        var travel = (phase - 0.5) * step * 1.3;
        var fade = Math.sin(phase * Math.PI);
        var cx = gx + ux * travel;
        var cy = gy + uy * travel;
        if (!pointInGreen(hole, cx, cy)) continue;

        var alpha = (0.10 + steep * 0.34) * fade;
        var size = 8 + steep * 4;
        chevron(ctx, cx, cy, ux, uy, alpha, size);
      }
    }
  };

  window.slopeReadFieldLoaded = true;
})();
