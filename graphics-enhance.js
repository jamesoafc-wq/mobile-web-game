// ============================================================================
// graphics-enhance.js  ·  Stage C — depth, lighting & shadows
// ----------------------------------------------------------------------------
// Loads LAST. Wraps the live drawCourse and drawBall to add dimensionality to
// the previously flat top-down rendering, WITHOUT touching the menu, HUD, round
// or course-data layers. Everything it does is additive compositing on top of
// the existing themed surfaces.
//
// Design direction: a single consistent sun from the top-left (warm key light),
// soft contact shadows that "lift" the green/bunkers/trees off the rough, gentle
// directional shading on each surface so it reads as a gradient rather than a
// flat fill, and — the thing that sells 3D most — a ball shadow that detaches
// and softens with flight height, then re-grounds on landing.
//
// All wrapping uses the same global-reassignment contract as the rest of the
// game (const before = fn; fn = wrapper). Pure rendering, no physics, no state.
// ============================================================================

(function () {
  // The world light direction (normalised), in canvas space. Top-left sun.
  const LIGHT = { x: -0.55, y: -0.83 };
  // How far surface shadows are cast (world px), opposite the light.
  const SHADOW_OFFSET = 6;

  // Guard: only enhance if the live rendering primitives exist.
  if (typeof drawCourse !== 'function' || typeof window.drawRoundedPolygon !== 'function') {
    // drawRoundedPolygon lives in shared.js; if anything is missing we no-op
    // rather than risk breaking the frame.
    return;
  }

  // --- helpers --------------------------------------------------------------
  function pathRoundedPolygon(ctx, points) {
    // Mirror of shared.js drawRoundedPolygon, but path-only (no fill/stroke),
    // so we can use it for clipping and shadow silhouettes.
    drawRoundedPolygon(ctx, points);
  }

  // Soft drop shadow cast by a polygon onto the ground beneath it.
  function castPolygonShadow(ctx, points, blur, alpha) {
    if (!points || points.length < 3) return;
    ctx.save();
    ctx.translate(-LIGHT.x * SHADOW_OFFSET, -LIGHT.y * SHADOW_OFFSET);
    ctx.shadowColor = `rgba(8, 26, 12, ${alpha})`;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(8,26,12,0.85)';
    pathRoundedPolygon(ctx, points);
    ctx.fill();
    ctx.restore();
  }

  // A directional sheen across a polygon: lighter toward the light, darker away.
  function shadePolygon(ctx, points) {
    if (!points || points.length < 3) return;
    const b = polygonBounds(points);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    const span = Math.max(b.maxX - b.minX, b.maxY - b.minY) || 1;
    const gx = cx + LIGHT.x * span * 0.6;
    const gy = cy + LIGHT.y * span * 0.6;
    const gx2 = cx - LIGHT.x * span * 0.6;
    const gy2 = cy - LIGHT.y * span * 0.6;
    const grad = ctx.createLinearGradient(gx, gy, gx2, gy2);
    grad.addColorStop(0, 'rgba(255,255,240,0.10)');
    grad.addColorStop(0.5, 'rgba(255,255,240,0.0)');
    grad.addColorStop(1, 'rgba(6,24,12,0.12)');
    ctx.save();
    pathRoundedPolygon(ctx, points);
    ctx.clip();
    ctx.fillStyle = grad;
    pathRoundedPolygon(ctx, points);
    ctx.fill();
    ctx.restore();
  }

  // ====================================================================
  // drawCourse wrapper: shadows UNDER, base render, shading + tree depth OVER
  // ====================================================================
  const drawCourseBeforeEnhance = drawCourse;
  drawCourse = function drawCourseEnhanced(ctx, hole, W, H, timeMs, showSlope) {
    // 1) Cast soft contact shadows beneath raised features, so the base render
    //    sits on top of them and looks grounded. Drawn before the surfaces.
    ctx.save();
    if (hole.bunkers) hole.bunkers.forEach(bk => castPolygonShadow(ctx, bk, 7, 0.18));
    if (hole.greenRing) castPolygonShadow(ctx, hole.greenRing, 10, 0.20);
    ctx.restore();

    // 2) The real, unmodified course render (themed surfaces, trees, props,
    //    cup, slope). Untouched.
    drawCourseBeforeEnhance(ctx, hole, W, H, timeMs, showSlope);

    // 3) Directional shading pass over the big surfaces for gradient depth.
    if (hole.fairway) shadePolygon(ctx, hole.fairway);
    if (hole.green) shadePolygon(ctx, hole.green);

    // 4) Re-ground the trees with a longer cast shadow + a lit-side rim, on top
    //    of the flat canopies the base renderer drew.
    if (hole.trees) drawTreeDepth(ctx, hole.trees, timeMs);
  };

  // Adds a cast shadow and a lit rim to each tree canopy (the base draws a flat
  // disc; this gives it a sun side and a ground shadow without replacing it).
  function drawTreeDepth(ctx, trees, timeMs) {
    trees.forEach(tree => {
      const r = (tree.r || 17) * (tree.scale || 1);
      const x = tree.x, y = tree.y;
      // Cast shadow on the ground, opposite the light, elongated.
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#0a1f0c';
      ctx.beginPath();
      ctx.ellipse(x - LIGHT.x * r * 0.9, y - LIGHT.y * r * 0.45 + r * 0.35,
                  r * 1.05, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Lit rim crescent on the sun side.
      ctx.save();
      pathClipCircle(ctx, x, y, r);
      const lg = ctx.createRadialGradient(
        x + LIGHT.x * r * 0.6, y + LIGHT.y * r * 0.6, r * 0.15,
        x, y, r);
      lg.addColorStop(0, 'rgba(190,235,150,0.38)');
      lg.addColorStop(0.6, 'rgba(120,190,95,0.0)');
      lg.addColorStop(1, 'rgba(8,28,12,0.28)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  function pathClipCircle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
  }

  // ====================================================================
  // drawBall wrapper: flight-responsive shadow + a soft 3D sphere shade.
  // The engine sets ball.visualScale = 1 + arc*height during flight; we read
  // that to recover apparent height so the shadow can detach and soften.
  // ====================================================================
  const drawBallBeforeEnhance = drawBall;
  drawBall = function drawBallEnhanced() {
    const vs = (ball && ball.visualScale) || 1;
    // Apparent height: how far above 1.0 the ball has scaled, normalised.
    const height = clamp(vs - 1, 0, 1.2);
    const aloft = height > 0.001;

    if (ball && !ball.holed) {
      // Ground shadow: offset toward the light's opposite as the ball rises,
      // larger and fainter the higher it is. When grounded it sits tight.
      const shX = ball.x - LIGHT.x * (10 + height * 46);
      const shY = ball.y - LIGHT.y * (10 + height * 46);
      const shR = ball.radius * (1.05 + height * 1.7);
      ctx.save();
      ctx.globalAlpha = aloft ? clamp(0.30 - height * 0.16, 0.08, 0.30) : 0.30;
      ctx.fillStyle = 'rgba(6,22,10,1)';
      ctx.beginPath();
      ctx.ellipse(aloft ? shX : ball.x, aloft ? shY : ball.y + 5,
                  shR, shR * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Let the existing (customisation-aware) ball renderer draw the ball body,
    // skin, and seam exactly as before — but suppress its own flat shadow by
    // covering nothing; we simply draw our richer shadow first (above) and then
    // overlay a spherical shade after for a rounder look.
    drawBallBeforeEnhance();

    if (ball && !ball.holed) {
      // Spherical shading: highlight toward the sun, terminator away from it.
      const rad = ball.radius * vs;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, rad, 0, Math.PI * 2);
      ctx.clip();
      const g = ctx.createRadialGradient(
        ball.x + LIGHT.x * rad * 0.7, ball.y + LIGHT.y * rad * 0.7, rad * 0.1,
        ball.x, ball.y, rad);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.0)');
      g.addColorStop(1, 'rgba(10,20,30,0.30)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(ball.x, ball.y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  };

  window.graphicsEnhanceLoaded = true;
})();
