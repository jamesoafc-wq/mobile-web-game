// ============================================================================
// shot-shaping.js  ·  on-bar draw/fade control + reworked progressive flight
// ----------------------------------------------------------------------------
// Shape is chosen ON the strike meter: Draw / Straight / Fade segments sit on
// the strike panel, and picking one OFFSETS the sweet zone left/right. Striking
// the offset zone cleanly delivers that shape; the curve itself is produced by
// engine-core's getFullShotShapeFromStrike (intended offset + accidental miss),
// so there is a single source of curve — no double counting.
//
// This module owns: (1) the shape state + on-bar selector hit-testing & drawing,
// and (2) the reworked flight integrator (progressive, asymmetric curve that
// finishes offline, blended naturally with wind). Loads AFTER the v065 flight
// overlay so its updateFlight sits on top.
// ============================================================================

(function () {
  'use strict';

  // -1 = draw (left), 0 = straight, +1 = fade (right) — RH golfer convention
  var SHAPE = { value: 0 };
  function clampN(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // segment rects on the strike panel (computed each draw from the panel rect)
  var segRects = [];

  // ---- draw the on-bar shape selector + hit testing -------------------------
  // We hook the canvas draw to paint the three segments above the meter, and
  // hook pointerdown (capture) to catch taps on them before the strike-tap.
  function drawShapeSegments() {
    try {
      if (typeof pendingShot === 'undefined' || !pendingShot) { segRects = []; return; }
      if (typeof getSkillPanelRect !== 'function' || typeof ctx === 'undefined') return;
      var panel = getSkillPanelRect();
      var labels = [['-1', 'Draw'], ['0', 'Straight'], ['1', 'Fade']];
      var gap = 6, segW = (panel.w - 44 - gap * 2) / 3, segH = 22;
      var y = panel.y + panel.h - segH - 8;
      var x0 = panel.x + 22;
      segRects = [];
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (var i = 0; i < 3; i++) {
        var x = x0 + i * (segW + gap);
        var active = String(SHAPE.value) === labels[i][0];
        ctx.fillStyle = active ? '#3fae5e' : 'rgba(255,255,255,0.08)';
        roundRectLocal(ctx, x, y, segW, segH, 7); ctx.fill();
        if (active) { ctx.strokeStyle = 'rgba(255,226,122,0.8)'; ctx.lineWidth = 1.5; ctx.stroke(); }
        ctx.fillStyle = active ? '#fff' : 'rgba(238,248,216,0.8)';
        ctx.font = '800 11px system-ui';
        ctx.fillText(labels[i][1], x + segW / 2, y + segH / 2 + 0.5);
        segRects.push({ x: x, y: y, w: segW, h: segH, val: parseInt(labels[i][0], 10) });
      }
      ctx.restore();
    } catch (e) {}
  }
  function roundRectLocal(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  // paint segments right after the rest of the frame
  if (typeof draw === 'function') {
    var _draw = draw;
    draw = function shotShapeDraw() {
      var r = _draw.apply(this, arguments);
      drawShapeSegments();
      return r;
    };
  }

  // intercept taps on the segments BEFORE the strike-tap fires
  if (typeof canvas !== 'undefined' && canvas) {
    canvas.addEventListener('pointerdown', function (event) {
      try {
        if (typeof pendingShot === 'undefined' || !pendingShot || !segRects.length) return;
        var rect = canvas.getBoundingClientRect();
        var sx = (event.clientX - rect.left) * (canvas.width / rect.width);
        var sy = (event.clientY - rect.top) * (canvas.height / rect.height);
        for (var i = 0; i < segRects.length; i++) {
          var s = segRects[i];
          if (sx >= s.x && sx <= s.x + s.w && sy >= s.y && sy <= s.y + s.h) {
            SHAPE.value = s.val;
            // live-update the active pending shot so the sweet zone shifts now
            pendingShot.shapeCenter = 0.5 + s.val * 0.16;
            pendingShot.shapeValue = s.val;
            try { if (window.GolfAudio) GolfAudio.play('select'); } catch (e) {}
            event.preventDefault();
            event.stopImmediatePropagation();   // don't let this tap strike the ball
            return;
          }
        }
      } catch (e) {}
    }, true);   // capture phase: runs before engine-core's strike handler
  }

  // ---- reworked flight integrator (progressive curve + natural wind blend) --
  // Supersedes flight-curve-overlay-v065's updateFlight. Curve comes solely from
  // shot.finalCurvePixels (intended shape + accidental miss, already combined by
  // getFullShotShapeFromStrike) rendered progressively so it ends offline.
  if (typeof updateFlight === 'function') {
    var _clamp = (typeof clamp === 'function') ? clamp : clampN;
    var _lerp = (typeof lerp === 'function') ? lerp : function (a, b, t) { return a + (b - a) * t; };
    updateFlight = function updateFlightShaped() {
      if (!ball.flight) return;
      var shot = ball.flight;
      var trackingDriver = typeof driverTrailActiveV038 !== 'undefined' && driverTrailActiveV038 && shot.clubKey === 'driver';
      if (trackingDriver && typeof driverTrailV038 !== 'undefined') driverTrailV038.push({ x: ball.x, y: ball.y, t: performance.now() });

      shot.progress += 1;
      var t = _clamp(shot.progress / shot.duration, 0, 1);
      var ease = 1 - Math.pow(1 - t, 2);
      var arc = Math.sin(t * Math.PI);

      // integrate along the STRAIGHT base line, add curve progressively
      var ex = (typeof shot.baseEndX === 'number') ? shot.baseEndX : shot.endX;
      var ey = (typeof shot.baseEndY === 'number') ? shot.baseEndY : shot.endY;
      var baseX = _lerp(shot.startX, ex, ease);
      var baseY = _lerp(shot.startY, ey, ease);
      var perpX = -Math.sin(shot.angle);
      var perpY = Math.cos(shot.angle);

      // total curve (intended + accidental), rendered progressively: starts ~
      // straight, accelerates, finishes offline like a real worked shot.
      var curve = (shot.finalCurvePixels || 0);
      var shapeProg = Math.pow(t, 1.7);
      var lateralShape = curve * shapeProg;

      // wind (v065 model): drift + air curve, building late
      var windX = 0, windY = 0, windCurveX = 0, windCurveY = 0;
      if (shot.windV063) {
        var smooth = t * t * (3 - 2 * t);
        var airCurve = Math.sin(t * Math.PI) * 0.35 + smooth * 0.65;
        windX = shot.windV063.driftX * smooth;
        windY = shot.windV063.driftY * smooth;
        windCurveX = shot.windV063.lateralX * airCurve;
        windCurveY = shot.windV063.lateralY * airCurve;
      }

      // one blended path: shape (along shot perpendicular) + wind (world space)
      ball.x = _clamp(baseX + perpX * lateralShape + windX + windCurveX, 18, canvas.width - 18);
      ball.y = _clamp(baseY + perpY * lateralShape + windY + windCurveY, 24, canvas.height - 18);
      ball.visualScale = 1 + arc * shot.height;

      if (trackingDriver && typeof driverTrailV038 !== 'undefined') driverTrailV038.push({ x: ball.x, y: ball.y, t: performance.now() });

      if (t >= 1) {
        var rollAngle = (shot.windV063 ? shot.windV063.rollAngle : shot.angle) + curve * 0.0017;
        ball.flight = null;
        ball.visualScale = 1;
        if (trackingDriver) {
          driverTrailActiveV038 = false;
          if (typeof driverTrailUntilV038 !== 'undefined') driverTrailUntilV038 = performance.now() + 1650;
        }
        if (typeof startLandingRoll === 'function') startLandingRoll(rollAngle, getLie(), shot.carryYards, shot.clubKey);
      }
    };
  }

  window.ShotShape = SHAPE;
  window.shotShapingLoaded = true;
})();
