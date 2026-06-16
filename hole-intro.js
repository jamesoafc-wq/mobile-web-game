// ============================================================================
// hole-intro.js  ·  cinematic hole flyover + living course (loads last-ish)
// ----------------------------------------------------------------------------
// When a new hole begins, play a slow cinematic: the camera zooms in near the
// tee box and flies low down the hole to the green, then settles into the normal
// play view. While the intro plays, the hole feels ALIVE:
//   * a top-down golf cart drives down the fairway (as if someone heading to the
//     next hole),
//   * sprinklers pop up and spray along the fairway.
// Both vanish the instant the intro ends / the player starts the hole, so they
// never interfere with play.
//
// Implementation:
//   * Wrap getCamera: while the intro is active, return the interpolated
//     cinematic view; otherwise defer to the existing camera chain untouched.
//   * Wrap drawCourse: while the intro is active, draw the cart + sprinklers on
//     top of the course.
//   * Start the intro on hole reset; end it on first player input or when its
//     duration elapses.
// ============================================================================

(function () {
  'use strict';

  var INTRO_MS = 4200;            // total flyover duration (slow + cinematic)
  var intro = { active: false, start: 0, holeKey: null };

  function now() { return (performance && performance.now) ? performance.now() : Date.now(); }
  function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

  function startIntro() {
    if (!hole) return;
    intro.active = true;
    intro.start = now();
    intro.holeKey = (hole.id || 0) + ':' + hole.cup.x;
  }
  function endIntro() { intro.active = false; }
  function progress() { return ease((now() - intro.start) / INTRO_MS); }

  // ---- cinematic camera ----------------------------------------------------
  // Fly from a tight view near the tee to a tight view near the green, then in
  // the last beat pull back to the normal full view so the handoff is seamless.
  function introCamera() {
    var p = progress();
    var W = canvas.width, H = canvas.height;
    var tee = hole.start, cup = hole.cup;

    // focus point travels tee -> green along the hole
    var travel = ease(Math.min(1, p / 0.8));         // reach green by 80% through
    var fx = lerp(tee.x, cup.x, travel);
    var fy = lerp(tee.y, cup.y, travel);

    // zoom: start tight (1.7), ease toward the normal 1.0 over the flight, then
    // in the final 20% blend fully to the play view.
    var z = lerp(1.7, 1.05, travel);

    var cam = { zoom: z, tx: W / 2 - fx * z, ty: H / 2 - fy * z };

    if (p > 0.82) {
      // blend into the normal play camera for a smooth handoff
      var blend = ease((p - 0.82) / 0.18);
      var play = baseGetCamera();
      cam.zoom = lerp(cam.zoom, play.zoom, blend);
      cam.tx = lerp(cam.tx, play.tx, blend);
      cam.ty = lerp(cam.ty, play.ty, blend);
    }
    if (p >= 1) endIntro();
    return cam;
  }

  var baseGetCamera = (typeof getCamera === 'function') ? getCamera : function () { return { zoom: 1, tx: 0, ty: 0 }; };
  getCamera = function getCameraWithIntro() {
    if (intro.active && hole) {
      try { return introCamera(); } catch (e) { endIntro(); }
    }
    return baseGetCamera();
  };

  // ---- living-course décor (only during intro) -----------------------------
  function drawCart(ctx, hole, p) {
    // cart drives from near the tee down toward the green along the hole line
    var tee = hole.start, cup = hole.cup;
    var t = Math.min(1, p / 0.85);
    var cx = lerp(tee.x + 26, cup.x + 22, t);
    var cy = lerp(tee.y - 10, cup.y + 30, t);
    var ang = Math.atan2(cup.y - tee.y, cup.x - tee.x);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang + Math.PI / 2);   // align body to travel direction (top-down)
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(2, 3, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    // body
    ctx.fillStyle = '#e8eef2'; roundRectLocal(ctx, -6, -9, 12, 18, 3); ctx.fill();
    // roof
    ctx.fillStyle = 'rgba(245,250,255,0.85)'; roundRectLocal(ctx, -6.5, -4, 13, 8, 2); ctx.fill();
    // wheels
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(-7.5, -7, 2.5, 4); ctx.fillRect(5, -7, 2.5, 4);
    ctx.fillRect(-7.5, 4, 2.5, 4); ctx.fillRect(5, 4, 2.5, 4);
    ctx.restore();
  }
  function roundRectLocal(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawSprinklers(ctx, hole, p, timeMs) {
    if (!hole.fairway || hole.fairway.length < 3) return;
    var b = polygonBounds(hole.fairway);
    // a few sprinkler heads along the fairway centre, spraying rotating arcs
    var seed = Math.floor(hole.cup.x + hole.cup.y);
    var n = 4;
    for (var i = 0; i < n; i++) {
      var sy = lerp(b.minY + 40, b.maxY - 40, i / (n - 1));
      var sx = (b.minX + b.maxX) / 2 + Math.sin(i * 2.1 + seed) * (b.maxX - b.minX) * 0.18;
      // base
      ctx.fillStyle = 'rgba(60,70,60,0.8)';
      ctx.beginPath(); ctx.arc(sx, sy, 1.6, 0, Math.PI * 2); ctx.fill();
      // rotating spray fan
      var rot = timeMs * 0.004 + i * 1.3;
      ctx.strokeStyle = 'rgba(190,225,255,0.5)';
      ctx.lineWidth = 1;
      for (var a = 0; a < 5; a++) {
        var aa = rot + a * 0.22;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        var rr = 12 + Math.sin(timeMs * 0.01 + a) * 2;
        ctx.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr);
        ctx.stroke();
      }
      // droplet sparkle ring
      ctx.fillStyle = 'rgba(210,238,255,0.35)';
      for (var d = 0; d < 6; d++) {
        var da = rot * 1.3 + d;
        ctx.beginPath();
        ctx.arc(sx + Math.cos(da) * 10, sy + Math.sin(da) * 10, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (typeof drawCourse === 'function') {
    var beforeCourse = drawCourse;
    drawCourse = function drawCourseWithIntroDecor(ctx, hole, W, H, t, showSlope) {
      beforeCourse(ctx, hole, W, H, t, showSlope);
      if (intro.active && hole) {
        var p = progress();
        try { drawSprinklers(ctx, hole, p, t); drawCart(ctx, hole, p); } catch (e) {}
      }
    };
  }

  // ---- start on new hole, end on player input ------------------------------
  if (typeof resetRoundHoleV035 === 'function') {
    var beforeReset = resetRoundHoleV035;
    resetRoundHoleV035 = function resetRoundHoleWithIntro(i) {
      beforeReset(i);
      startIntro();
    };
  }
  // end the intro as soon as the player interacts with the course
  function killOnInput() { if (intro.active) endIntro(); }
  if (typeof canvas !== 'undefined' && canvas) {
    canvas.addEventListener('pointerdown', killOnInput, true);
  }
  // also allow a tap anywhere / club change to skip
  document.addEventListener('pointerdown', killOnInput, true);

  // kick off for the very first hole (in case reset already ran before we loaded)
  if (typeof hole !== 'undefined' && hole) startIntro();

  window.holeIntroLoaded = true;
})();
