// ============================================================================
// slope-field.js  ·  Real green height-field slope model
// ----------------------------------------------------------------------------
// Replaces the old "force-blob" slope model (a few elliptical zones that just
// shoved the ball sideways) with an actual SURFACE: each green has a smooth
// height field h(x,y) built from control points, and the ball breaks by rolling
// down the gradient of that surface — like real gravity on a real green.
//
// Why this is better:
//   * Consistent & readable. Break everywhere derives from one continuous
//     surface, so neighbouring spots behave coherently (ridges, tiers, saddles,
//     false fronts all emerge naturally). The green-reading overlay (idea #4)
//     can simply visualise this same field — what you see is exactly what the
//     ball obeys.
//   * Physically honest. Break = -gravity * grad(h), and it scales with SPEED:
//     a fast putt holds its line; a dying putt takes the full break. That's how
//     real putts behave.
//
// Migration: existing greens define `slopeZones` (center, push-dir dx/dy,
// strength). A push-direction IS a downhill direction, so each zone becomes a
// pair of control points — raised "uphill" (behind the push) and lowered
// "downhill" (ahead) — reproducing the intended break as a genuine surface.
// All 5 courses keep working with zero data edits. Greens may also/instead
// define `heightPoints: [{x,y,h}]` directly for hand-authored multi-break greens.
//
// Loads AFTER engine-core (overrides getGreenSlopeAt) and is consumed by the
// patched updateRoll break step. Pure functions; no game state mutated here.
// ============================================================================

(function () {
  'use strict';

  // Cache the built field per hole object identity so we don't rebuild each
  // frame. The round engine mutates `hole` in place (copyHoleV035), so we key on
  // a cheap signature instead of object identity.
  var fieldCache = { sig: null, field: null };

  function holeSignature(hole) {
    // cup + first green vertex + zone count is enough to detect a hole swap.
    var g0 = (hole.green && hole.green[0]) || { x: 0, y: 0 };
    var z = (hole.slopeZones && hole.slopeZones.length) || 0;
    var hp = (hole.heightPoints && hole.heightPoints.length) || 0;
    return hole.cup.x + ':' + hole.cup.y + ':' + g0.x + ':' + g0.y + ':' + z + ':' + hp;
  }

  // Convert legacy slopeZones -> control points, OR use explicit heightPoints.
  function buildField(hole) {
    var pts = [];

    // Explicit authored height points win if present.
    if (hole.heightPoints && hole.heightPoints.length) {
      for (var i = 0; i < hole.heightPoints.length; i++) {
        var p = hole.heightPoints[i];
        pts.push({ x: p.x, y: p.y, h: p.h });
      }
    }

    // Convert each legacy slope zone into an uphill/downhill control-point pair.
    var zones = hole.slopeZones || [];
    for (var z = 0; z < zones.length; z++) {
      var zn = zones[z];
      var len = Math.hypot(zn.dx, zn.dy) || 1;
      var ux = zn.dx / len, uy = zn.dy / len;        // downhill unit direction
      // Scale: old strength ~0.0005–0.0008 acted as a per-frame shove. Turn that
      // into a height delta over the zone's radius. Empirically *1.0e5 maps the
      // old feel into height units that read well with the gradient model.
      var amp = zn.strength * 4.0e4;                 // height units
      var reach = (zn.rx + zn.ry) * 0.5;             // how far the tilt extends
      // raised point behind the push (uphill), lowered point ahead (downhill)
      pts.push({ x: zn.x - ux * reach * 0.7, y: zn.y - uy * reach * 0.7, h: +amp });
      pts.push({ x: zn.x + ux * reach * 0.7, y: zn.y + uy * reach * 0.7, h: -amp });
    }

    // Per-hole GREEN ARCHETYPE for variety. Real greens are mostly broad tilts
    // with subtle secondary movement — NOT radial basins — so these are
    // tilt-dominant and gentle, chosen deterministically from the hole id.
    var b = polyBoundsLocal(hole.green);
    if (b) {
      var hid = (hole.id || 1);
      var arche = hid % 5;
      var steepTier = (hid * 7) % 3;        // 0 gentle, 1 medium, 2 steep
      var k = (b.h) * (steepTier === 0 ? 0.045 : steepTier === 1 ? 0.075 : 0.11);
      var kx = (b.w) * (steepTier === 0 ? 0.04 : steepTier === 1 ? 0.065 : 0.095);

      if (arche === 0) {
        // back-to-front tilt (classic, most common)
        pts.push({ x: b.cx, y: b.minY, h: +k });
        pts.push({ x: b.cx, y: b.maxY, h: -k });
      } else if (arche === 1) {
        // diagonal tilt (high back-right -> low front-left)
        pts.push({ x: b.maxX, y: b.minY, h: +k });
        pts.push({ x: b.minX, y: b.maxY, h: -k });
      } else if (arche === 2) {
        // gentle RIDGE expressed as broad tilts away from a centre LINE plus a
        // mild back-to-front fall — drifts to a side, doesn't funnel to a point
        pts.push({ x: b.minX, y: b.cy, h: +k * 0.55 });
        pts.push({ x: b.maxX, y: b.cy, h: -k * 0.55 });
        pts.push({ x: b.cx, y: b.minY, h: +k * 0.4 });
        pts.push({ x: b.cx, y: b.maxY, h: -k * 0.4 });
      } else if (arche === 3) {
        // SADDLE: high back corner, low opposite front corner, mild counter on
        // the other diagonal — two-way movement, no central basin
        pts.push({ x: b.minX, y: b.minY, h: +k });
        pts.push({ x: b.maxX, y: b.maxY, h: -k });
        pts.push({ x: b.maxX, y: b.minY, h: +k * 0.35 });
        pts.push({ x: b.minX, y: b.maxY, h: -k * 0.35 });
      } else {
        // SHELF / tier: higher back, lower front, slight side tilt
        pts.push({ x: b.minX, y: b.minY, h: +k });
        pts.push({ x: b.maxX, y: b.minY, h: +k * 0.85 });
        pts.push({ x: b.cx, y: b.maxY, h: -k });
      }
      if (steepTier === 2) {
        pts.push({ x: b.minX, y: b.cy, h: (hid % 2 ? +1 : -1) * kx * 0.35 });
        pts.push({ x: b.maxX, y: b.cy, h: (hid % 2 ? -1 : +1) * kx * 0.35 });
      }
    }

    return { pts: pts, bounds: b };
  }

  function polyBoundsLocal(poly) {
    if (!poly || !poly.length) return null;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i];
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY,
             cx: (minX + maxX) / 2, cy: (minY + maxY) / 2,
             w: maxX - minX, h: maxY - minY };
  }

  function getField(hole) {
    var sig = holeSignature(hole);
    if (fieldCache.sig !== sig) {
      fieldCache.sig = sig;
      fieldCache.field = buildField(hole);
    }
    return fieldCache.field;
  }

  // Inverse-distance-weighted height at (x,y). Smooth, robust for any point set.
  function sampleHeight(hole, x, y) {
    var f = getField(hole);
    var pts = f.pts;
    if (!pts.length) return 0;
    var num = 0, den = 0;
    for (var i = 0; i < pts.length; i++) {
      var dx = x - pts[i].x, dy = y - pts[i].y;
      var d2 = dx * dx + dy * dy;
      // softening term avoids singularity at a control point and controls how
      // "peaky" each point is; larger => smoother surface.
      var w = 1 / (d2 + 650);
      num += w * pts[i].h;
      den += w;
    }
    return den > 0 ? num / den : 0;
  }

  // Gradient of the height field by central differences. Returns the DOWNHILL
  // direction (negative gradient) and its magnitude (steepness).
  function greenSlope(hole, x, y) {
    var e = 3; // sample epsilon in px
    var hL = sampleHeight(hole, x - e, y);
    var hR = sampleHeight(hole, x + e, y);
    var hU = sampleHeight(hole, x, y - e);
    var hD = sampleHeight(hole, x, y + e);
    // downhill = negative gradient
    var gx = -(hR - hL) / (2 * e);
    var gy = -(hD - hU) / (2 * e);
    return { x: gx, y: gy, strength: Math.hypot(gx, gy) };
  }

  // ---- Override engine-core's slope sampler --------------------------------
  // Keep the same name/shape so anything calling getGreenSlopeAt keeps working,
  // but only return a slope when actually on the green/fringe.
  getGreenSlopeAt = function getGreenSlopeAtField(holeRef, x, y) {
    var pt = { x: x, y: y };
    var onSurface = pointInPolygon(pt, holeRef.green) ||
                    (holeRef.greenRing && pointInPolygon(pt, holeRef.greenRing));
    if (!onSurface) return { x: 0, y: 0, strength: 0 };
    return greenSlope(holeRef, x, y);
  };

  // ---- Public break model (single, speed-scaled, gravity-style) ------------
  // Acceleration added to the ball per frame while rolling on the green.
  // Speed-scaled: a fast putt barely bends; a dying putt takes full break.
  // BREAK_GRAVITY tunes overall break amount; SPEED_HOLD tunes how much speed
  // resists break (higher => fast putts hold their line more).
  // ============================ TUNING KNOBS ============================
  // These three numbers control how the green plays. Safe to edit live.
  //   BREAK_BASE  : overall break amount. Higher = more curve. Start low.
  //   BREAK_CAP   : hard ceiling on sideways nudge per frame. The safety rail
  //                 that guarantees putts stay sane and SETTLE (must stay small
  //                 relative to green friction's ~0.011/frame slowdown).
  //   SETTLE_SPEED: below this speed the ball is coming to rest — break shuts
  //                 off so the putt settles cleanly instead of wandering.
  var BREAK_BASE   = 0.085;
  var BREAK_CAP    = 0.0013;
  var SETTLE_SPEED = 0.07;
  // =====================================================================

  // Acceleration added to the ball each frame while it rolls on the green.
  // Break scales with speed (a rolling ball curves; a dying ball settles) and
  // is hard-capped so it can never overpower friction and roll forever.
  function greenBreakAccel(hole, x, y, speed, vx, vy) {
    if (speed < SETTLE_SPEED) return { x: 0, y: 0 };
    var s = greenSlope(hole, x, y);
    if (s.strength < 1e-6) return { x: 0, y: 0 };
    var m = clamp(speed, 0, 1.4);
    var speedCurve = m / (1 + m * m * 1.1);
    var k = BREAK_BASE * speedCurve;
    var gx = s.x * k, gy = s.y * k;

    // Split the slope push into ALONG-track (speeds up / slows the putt) and
    // CROSS-track (curves it). We keep most of the cross-track (that's the break
    // you read and play) but heavily damp the along-track so a downhill putt
    // can't keep pumping its own speed and roll forever — friction must win.
    if (speed > 1e-4) {
      var ux = vx / speed, uy = vy / speed;            // travel direction
      var along = gx * ux + gy * uy;                    // component along travel
      var crossX = gx - along * ux, crossY = gy - along * uy;
      var ALONG_DAMP = 0.15;                            // keep only 15% of along
      gx = crossX + along * ALONG_DAMP * ux;
      gy = crossY + along * ALONG_DAMP * uy;
    }

    var amag = Math.hypot(gx, gy);
    if (amag > BREAK_CAP) { gx = gx / amag * BREAK_CAP; gy = gy / amag * BREAK_CAP; }
    return { x: gx, y: gy };
  }

  window.GreenField = {
    sampleHeight: sampleHeight,
    greenSlope: greenSlope,
    breakAccel: greenBreakAccel,
    getField: getField
  };
  window.greenBreakAccel = greenBreakAccel;
  window.slopeFieldLoaded = true;
})();
