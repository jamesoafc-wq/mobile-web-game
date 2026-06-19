// ============================================================================
// graphics-enhance.js  ·  Stage C — depth, lighting & shadows  (clean rewrite)
// ----------------------------------------------------------------------------
// Loads LAST. Adds dimensionality to the flat top-down rendering WITHOUT
// touching menu, HUD, round, course-data, or input. It only wraps the two
// rendering entry points the engine calls each frame — drawCourse and drawBall
// — and composites extra light/shadow on top of the real, untouched render.
//
// SAFETY BY CONSTRUCTION
// ----------------------
//  * Every visual pass is run through safe() — a try/catch that restores the
//    canvas state and swallows errors. A bad frame can NEVER throw out of the
//    wrapper, so the game can never freeze because of graphics.
//  * The real base render always runs FIRST and unconditionally, so even if
//    every enhancement pass failed, you'd still see exactly today's game.
//  * All radii/coords fed to gradients & arcs are clamped finite & positive
//    (the one thing that throws in real browsers).
//
// Same global-script contract as the rest of the game: we read the engine's
// globals (ctx, ball, hole, clamp, lerp, drawRoundedPolygon) and reassign the
// bare globals drawCourse / drawBall.
// ============================================================================

(function () {
  'use strict';

  // ---- guards: only engage if the primitives we need exist -----------------
  if (typeof drawCourse !== 'function' || typeof drawBall !== 'function') return;
  var HAS_POLY = (typeof drawRoundedPolygon === 'function');
  var CLAMP = (typeof clamp === 'function') ? clamp
    : function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  // ---- world light (top-left sun) ------------------------------------------
  var LIGHT = { x: -0.52, y: -0.85 };

  // Per-course shadow / light tints so the depth feels native to each theme.
  // [shadow rgb, warm-light rgb]
  var THEME_TINT = {
    willow: ['6,26,12', '255,250,205'],
    coral:  ['4,40,46', '230,255,245'],
    dunes:  ['60,38,12', '255,244,205'],
    pine:   ['3,16,11', '210,245,200'],
    silver: ['8,30,32', '224,245,250']
  };
  function tint(hole) {
    return THEME_TINT[(hole && hole.courseTheme)] || THEME_TINT.willow;
  }

  // ---- tiny helpers --------------------------------------------------------
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function pos(v, min) { v = num(v, min); return v > min ? v : min; }

  // Run a visual pass; if it throws, restore canvas balance and move on.
  function safe(fn) {
    try { fn(); }
    catch (e) { try { ctx.restore(); } catch (_) {} }
  }

  function polyBounds(pts) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY,
             cx: (minX + maxX) / 2, cy: (minY + maxY) / 2,
             w: maxX - minX, h: maxY - minY };
  }

  function tracePoly(pts) {
    if (HAS_POLY) { drawRoundedPolygon(ctx, pts); return; }
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  }

  // Soft contact shadow cast just under a raised polygon (green / bunker).
  function groundShadow(pts, shadowRgb, blur, alpha, lift) {
    if (!pts || pts.length < 3) return;
    ctx.save();
    ctx.translate(-LIGHT.x * lift, -LIGHT.y * lift);
    ctx.shadowColor = 'rgba(' + shadowRgb + ',' + alpha + ')';
    ctx.shadowBlur = pos(blur, 1);
    ctx.fillStyle = 'rgba(' + shadowRgb + ',' + alpha + ')';
    tracePoly(pts);
    ctx.fill();
    ctx.restore();
  }

  // Directional sheen across a surface: warm toward the sun, shade away from it.
  function surfaceSheen(pts, shadowRgb, lightRgb, strength) {
    if (!pts || pts.length < 3) return;
    var b = polyBounds(pts);
    var span = pos(Math.max(b.w, b.h), 1);
    var g = ctx.createLinearGradient(
      b.cx + LIGHT.x * span * 0.55, b.cy + LIGHT.y * span * 0.55,
      b.cx - LIGHT.x * span * 0.55, b.cy - LIGHT.y * span * 0.55);
    g.addColorStop(0, 'rgba(' + lightRgb + ',' + (0.26 * strength) + ')');
    g.addColorStop(0.5, 'rgba(' + lightRgb + ',0)');
    g.addColorStop(1, 'rgba(' + shadowRgb + ',' + (0.30 * strength) + ')');
    ctx.save();
    tracePoly(pts); ctx.clip();
    ctx.fillStyle = g;
    tracePoly(pts); ctx.fill();
    ctx.restore();
  }

  // Gentle dome on the green: a soft radial highlight at its crown so the putting
  // surface reads as a raised mound rather than a flat sticker.
  function greenDome(pts, lightRgb, shadowRgb) {
    if (!pts || pts.length < 3) return;
    var b = polyBounds(pts);
    var r = pos(Math.max(b.w, b.h) * 0.66, 2);
    var cx = b.cx + LIGHT.x * b.w * 0.16;
    var cy = b.cy + LIGHT.y * b.h * 0.16;
    var g = ctx.createRadialGradient(cx, cy, pos(r * 0.12, 0.5), b.cx, b.cy, r);
    g.addColorStop(0, 'rgba(' + lightRgb + ',0.40)');
    g.addColorStop(0.5, 'rgba(' + lightRgb + ',0.08)');
    g.addColorStop(1, 'rgba(' + shadowRgb + ',0.30)');
    ctx.save();
    tracePoly(pts); ctx.clip();
    ctx.fillStyle = g;
    tracePoly(pts); ctx.fill();
    ctx.restore();
  }

  // Tree depth: elongated ground shadow + lit rim on the sun side. The base
  // renderer already drew the flat canopy; we only add grounding + a highlight.
  function treeDepth(trees, shadowRgb, lightRgb) {
    for (var i = 0; i < trees.length; i++) {
      var t = trees[i];
      var x = num(t.x, null), y = num(t.y, null);
      if (x === null || y === null) continue;
      var r = pos((t.r || 16) * (t.scale || 1), 2);
      // cast shadow
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = 'rgba(' + shadowRgb + ',1)';
      ctx.beginPath();
      ctx.ellipse(x - LIGHT.x * r * 0.8, y - LIGHT.y * r * 0.4 + r * 0.4,
                  pos(r * 1.0, 1), pos(r * 0.46, 0.5), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // lit rim
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
      var g = ctx.createRadialGradient(
        x + LIGHT.x * r * 0.55, y + LIGHT.y * r * 0.55, pos(r * 0.12, 0.4),
        x, y, r);
      g.addColorStop(0, 'rgba(' + lightRgb + ',0.34)');
      g.addColorStop(0.6, 'rgba(' + lightRgb + ',0)');
      g.addColorStop(1, 'rgba(' + shadowRgb + ',0.30)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // ====================================================================
  // drawCourse wrapper
  // ====================================================================
  // A very soft scene-wide light: warm glow from the sun side, gentle shade in
  // the far corner. Drawn over the whole hole region so the scene has a single
  // readable light direction. Kept low-opacity so it never muddies the colours.
  function sceneSunLight(hole, W, H) {
    // sun glow centre: pull toward the top-left (the light source)
    var cx = W * (0.5 + LIGHT.x * 0.42);
    var cy = H * (0.5 + LIGHT.y * 0.42);
    var rad = pos(Math.max(W, H) * 1.05, 1);
    var g = ctx.createRadialGradient(cx, cy, pos(rad * 0.08, 1), W * 0.5, H * 0.5, rad);
    g.addColorStop(0, 'rgba(255,248,214,0.10)');
    g.addColorStop(0.5, 'rgba(255,248,214,0.0)');
    g.addColorStop(1, 'rgba(6,18,10,0.20)');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);   // screen space, full viewport
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  var baseCourse = drawCourse;
  drawCourse = function drawCourseEnhanced(c, hole, W, H, timeMs, showSlope) {
    var t = tint(hole);
    var shadowRgb = t[0], lightRgb = t[1];

    // (1) grounding shadows UNDER the raised features
    safe(function () {
      if (hole && hole.bunkers) for (var i = 0; i < hole.bunkers.length; i++)
        groundShadow(hole.bunkers[i], shadowRgb, 9, 0.32, 7);
      if (hole && hole.greenRing) groundShadow(hole.greenRing, shadowRgb, 14, 0.34, 9);
    });

    // (2) the REAL render — always runs, untouched
    baseCourse(c, hole, W, H, timeMs, showSlope);

    // (2b) scene-wide sun light for a readable global light direction
    safe(function () { sceneSunLight(hole, W, H); });

    // (3) depth passes OVER the surfaces — the surface renderer now does its own
    // FLAT pixel-art shading (incl. the green dome), so the old gradient sheen
    // and dome are disabled here to avoid muddying the flat look.
    safe(function () { if (hole && hole.trees) treeDepth(hole.trees, shadowRgb, lightRgb); });
    safe(function () { if (hole && hole.trees) treeDepth(hole.trees, shadowRgb, lightRgb); });
  };

  // ====================================================================
  // drawBall wrapper — flight-responsive shadow + spherical shading
  // ====================================================================
  var baseBall = drawBall;
  drawBall = function drawBallEnhanced() {
    // sanity: if ball isn't ready, defer entirely to base
    if (!ball || !isFinite(ball.x) || !isFinite(ball.y) || !(ball.radius > 0)) {
      return baseBall();
    }

    var vs = pos(num(ball.visualScale, 1), 0.2);
    var height = CLAMP(vs - 1, 0, 1.2);
    var aloft = height > 0.001;

    // (1) ground shadow first, so the ball sits on top of it
    safe(function () {
      if (ball.holed) return;
      var sx = aloft ? (ball.x - LIGHT.x * (10 + height * 46)) : ball.x;
      var sy = aloft ? (ball.y - LIGHT.y * (10 + height * 46)) : ball.y + 4.5;
      var sr = pos(ball.radius * (1.0 + height * 1.7), 0.5);
      ctx.save();
      ctx.globalAlpha = aloft ? CLAMP(0.30 - height * 0.16, 0.08, 0.30) : 0.30;
      ctx.fillStyle = 'rgba(6,20,10,1)';
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr, pos(sr * 0.55, 0.4), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // (2) the REAL ball (skin/seam/customisation) — always runs
    baseBall();

    // (3) spherical shading overlay for roundness
    safe(function () {
      if (ball.holed) return;
      var rad = pos(ball.radius * vs, 0.5);
      ctx.save();
      ctx.beginPath(); ctx.arc(ball.x, ball.y, rad, 0, Math.PI * 2); ctx.clip();
      var g = ctx.createRadialGradient(
        ball.x + LIGHT.x * rad * 0.7, ball.y + LIGHT.y * rad * 0.7, pos(rad * 0.1, 0.05),
        ball.x, ball.y, rad);
      g.addColorStop(0, 'rgba(255,255,255,0.50)');
      g.addColorStop(0.45, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(8,16,26,0.28)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(ball.x, ball.y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  };

  window.graphicsEnhanceLoaded = true;
})();
