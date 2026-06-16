// ============================================================================
// tree-sway.js  ·  wind-driven tree sway (loads last)
// ----------------------------------------------------------------------------
// All trees (oaks, palms, pines) sway based on the live wind:
//   * No wind  -> no movement.
//   * Storm    -> lots of sway, leaning hard in the wind direction.
//   * In between, sway scales smoothly with wind speed (windStateV057.mph,
//     which ranges ~1..17).
//
// The sway = a steady LEAN in the wind's horizontal direction (proportional to
// speed) + a softer oscillating GUST (so trees shiver, not just tilt). Each tree
// gets a phase offset from its position so they don't all move in lockstep.
//
// Implemented by wrapping the existing tree draw functions and applying a small
// rotation pivoted at the trunk BASE — so the canopy (drawn above the base)
// leans while the roots stay planted, like a real tree bending. Purely visual.
// ============================================================================

(function () {
  'use strict';

  function nowMs() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  // Returns the sway rotation (radians) for a tree at world (x,y) right now.
  // Positive rotation leans the canopy toward +x.
  function swayAngle(x, y) {
    var wind = (typeof windStateV057 !== 'undefined' && windStateV057) ? windStateV057 : null;
    var mph = wind ? (wind.mph || 0) : 0;
    if (mph <= 0.5) return 0;                       // dead calm -> no movement

    // horizontal direction of the wind (-1 .. 1): cos(angle)
    var dirX = wind ? Math.cos(wind.angle || 0) : 1;

    // normalise speed 0..1 across the game's 1..17 mph range
    var s = Math.max(0, Math.min(1, mph / 17));

    // steady lean grows with wind; up to ~0.22 rad (~12.5 deg) in a storm
    var lean = dirX * s * 0.22;

    // gust oscillation: faster and larger with more wind; per-tree phase offset
    var t = nowMs() / 1000;
    var phase = x * 0.07 + y * 0.05;
    var gustFreq = 1.1 + s * 2.6;                   // Hz-ish, windier = quicker
    var gustAmp = s * 0.10;                          // up to ~0.10 rad shimmer
    var gust = Math.sin(t * gustFreq + phase) * gustAmp * dirX;
    // a little secondary flutter for liveliness
    gust += Math.sin(t * (gustFreq * 1.7) + phase * 1.3) * gustAmp * 0.35 * dirX;

    return lean + gust;
  }

  // Apply sway by rotating the canvas about the tree's BASE point in world
  // coordinates (prop.x, prop.y + baseY). The draw functions then run their own
  // translate/scale as normal, but the whole thing is now rotated about the base
  // so the canopy leans while the base stays planted.
  function withSway(ctx, x, y, baseY, drawFn) {
    var ang = swayAngle(x, y);
    if (ang === 0) { drawFn(); return; }
    var px = x, py = y + baseY;          // world-space pivot at the trunk base
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(ang);
    ctx.translate(-px, -py);
    drawFn();
    ctx.restore();
  }

  // ---- wrap oak trees (props.js drawTree) ----------------------------------
  if (typeof drawTree === 'function') {
    var baseDrawTree = drawTree;
    drawTree = function drawTreeSway(ctx, prop, palette) {
      // drawTree uses withTransform which translates to (prop.x,prop.y); the
      // sway must wrap the whole thing. The trunk base sits ~y=20 locally.
      withSway(ctx, prop.x || 0, prop.y || 0, 18, function () {
        baseDrawTree(ctx, prop, palette);
      });
    };
  }

  // ---- wrap palms + pines (courses-v046) -----------------------------------
  if (typeof drawPalmV046 === 'function') {
    var basePalm = drawPalmV046;
    drawPalmV046 = function drawPalmSway(ctx, e) {
      withSway(ctx, e.x || 0, e.y || 0, 18, function () { basePalm(ctx, e); });
    };
  }
  if (typeof drawPineV046 === 'function') {
    var basePine = drawPineV046;
    drawPineV046 = function drawPineSway(ctx, e) {
      withSway(ctx, e.x || 0, e.y || 0, 22, function () { basePine(ctx, e); });
    };
  }
  // cacti are stiff — intentionally left unswayed.

  window.treeSwayLoaded = true;
})();
