// ============================================================================
// pixel-style.js  ·  flat-band "polished cartoon / pixel-art" surface styling
// ----------------------------------------------------------------------------
// Reworks the look toward the reference art: FLAT colour bands (no gradients),
// crisp dark outlines between surfaces, a consistent hard drop-shadow direction,
// and subtle mown texture. Built as an additive layer that repaints the playable
// surfaces after the base renderer, so it's safe and reversible.
//
// FIRST PASS: applies to the 'masters' theme only, as a style proof. Once the
// look is approved it will extend to all themes (PIXEL_THEMES below).
// ============================================================================

(function () {
  'use strict';
  if (typeof drawCourse !== 'function') return;
  if (typeof drawPolygonFill !== 'function' || typeof clipToPolygon !== 'function') return;

  // which themes use the new flat style (start with masters as the proof)
  var PIXEL_THEMES = { masters: 1 };

  // flat palettes per theme: [roughDark, roughMid, fairway, fairwayLite, green, greenLite, fringe, sand, outline]
  var SKIN = {
    masters: {
      roughDark: '#1f6b38', roughMid: '#2a8048', rough3: '#35935a',
      fairway: '#43c46c', fairwayLite: '#52d079', fringe: '#3aa85e',
      green: '#5fd07e', greenLite: '#74e08f', sand: '#fbf3da',
      outline: 'rgba(12,40,20,0.55)', stripe: 'rgba(255,255,255,0.06)'
    }
  };

  function trace(poly) { drawRoundedPolygon(ctx, poly); }
  function fill(poly, colour) { drawPolygonFill(ctx, poly, colour, null, 0); }
  function outline(poly, colour, w) { ctx.save(); trace(poly); ctx.strokeStyle = colour; ctx.lineWidth = w; ctx.stroke(); ctx.restore(); }
  function bounds(poly) {
    var a = 1e9, b = 1e9, c = -1e9, d = -1e9;
    for (var i = 0; i < poly.length; i++) { var p = poly[i]; if (p.x<a)a=p.x; if (p.y<b)b=p.y; if (p.x>c)c=p.x; if (p.y>d)d=p.y; }
    return { minX:a, minY:b, maxX:c, maxY:d, w:c-a, h:d-b, cx:(a+c)/2, cy:(b+d)/2 };
  }

  // hard drop shadow for a polygon (consistent light: down-right)
  function dropShadow(poly, dx, dy, alpha) {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.globalAlpha = alpha;
    fill(poly, '#0a2010');
    ctx.restore();
  }

  // subtle mowing texture inside a clipped polygon
  function mowStripes(poly, colour, step) {
    var b = bounds(poly);
    clipToPolygon(ctx, poly, function () {
      ctx.fillStyle = colour;
      for (var x = b.minX - 4; x <= b.maxX + 4; x += step * 2) {
        ctx.fillRect(x, b.minY - 4, step, b.h + 8);
      }
    });
  }
  function greenHatch(poly) {
    var b = bounds(poly);
    clipToPolygon(ctx, poly, function () {
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 0.7;
      for (var y = b.minY; y < b.maxY; y += 6) {
        for (var x = b.minX; x < b.maxX; x += 8) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 2.4); ctx.lineTo(x + 6, y); ctx.stroke();
        }
      }
    });
  }

  function repaintSurfaces(hole, sk) {
    // FAIRWAY — flat band + crisp outline + faint stripes
    if (hole.fairway && hole.fairway.length > 2) {
      dropShadow(hole.fairway, 0, 2.5, 0.12);
      fill(hole.fairway, sk.fairway);
      mowStripes(hole.fairway, sk.stripe, 6);
      outline(hole.fairway, sk.outline, 1.6);
    }
    // GREEN RING (fringe) — flat, slightly darker, hard edge
    if (hole.greenRing && hole.greenRing.length > 2) {
      fill(hole.greenRing, sk.fringe);
      outline(hole.greenRing, sk.outline, 1.4);
    }
    // GREEN — flat bright band + subtle chevron hatch + crisp edge
    if (hole.green && hole.green.length > 2) {
      dropShadow(hole.green, 0, 2, 0.14);
      fill(hole.green, sk.green);
      greenHatch(hole.green);
      outline(hole.green, sk.outline, 1.4);
    }
    // BUNKERS — flat sand + crisp edge
    if (hole.bunkers) hole.bunkers.forEach(function (bk) {
      if (!bk || bk.length < 3) return;
      dropShadow(bk, 0, 1.5, 0.12);
      fill(bk, sk.sand);
      outline(bk, 'rgba(150,130,80,0.5)', 1.2);
    });
  }

  var beforeDraw = drawCourse;
  drawCourse = function drawCoursePixel(ctx2, hole, W, H, timeMs, showSlope) {
    beforeDraw(ctx2, hole, W, H, timeMs, showSlope);
    try {
      var th = hole && hole.courseTheme;
      if (th && PIXEL_THEMES[th] && SKIN[th]) {
        repaintSurfaces(hole, SKIN[th]);
        // re-draw cup/flag on top since we repainted the green
        if (typeof drawCupAndFlag === 'function') drawCupAndFlag(ctx, hole);
      }
    } catch (e) {}
  };

  window.pixelStyleLoaded = true;
})();
