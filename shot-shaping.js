// ============================================================================
// shot-shaping.js  ·  intentional draw / fade + reworked natural flight curve
// ----------------------------------------------------------------------------
// Replaces the old symmetric "bulge" curve with a PROGRESSIVE, asymmetric shape
// that starts ~straight, bends increasingly through the flight, and finishes
// offline — like a real worked shot. Intentional shape (player-selected) and
// accidental shape (strike-meter mishit) combine, and both blend with wind in a
// single late-building lateral so the whole flight reads as one natural curve.
//
// Loads AFTER wind-no-snap-v063.js so its updateFlight wrapper sits on top.
// All wrapped in try/catch; "Straight" + no mishit reproduces prior behaviour.
// ============================================================================

(function () {
  'use strict';

  // -1 = draw (curves left), 0 = straight, +1 = fade (curves right) for a RH golfer
  var SHAPE = { value: 0 };
  var LABELS = { '-1': 'Draw', '0': 'Straight', '1': 'Fade' };

  function clampN(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---- selector UI ----------------------------------------------------------
  function buildBar() {
    var host = document.getElementById('shotShapeBar');
    if (!host) return;
    host.innerHTML = '';
    host.style.cssText = 'display:flex;gap:6px;justify-content:center;margin:8px auto 0;max-width:320px;';
    [['-1', '↩ Draw'], ['0', '• Straight'], ['1', 'Fade ↪']].forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.shape = opt[0];
      b.dataset.noTick = '1';
      b.textContent = opt[1];
      styleSeg(b, String(SHAPE.value) === opt[0]);
      b.addEventListener('click', function () {
        SHAPE.value = parseInt(opt[0], 10);
        refresh();
        try { if (window.GolfAudio) GolfAudio.play('select'); } catch (e) {}
      });
      host.appendChild(b);
    });
  }
  function styleSeg(b, active) {
    b.style.cssText = 'flex:1;padding:9px 4px;border-radius:10px;cursor:pointer;font:900 12px system-ui;' +
      'border:1px solid ' + (active ? 'rgba(255,226,122,.7)' : 'rgba(255,255,255,.16)') + ';' +
      'background:' + (active ? 'linear-gradient(135deg,#3fae5e,#1f7a3f)' : 'rgba(255,255,255,.06)') + ';' +
      'color:' + (active ? '#fff' : 'rgba(238,248,216,.8)') + ';transition:all .15s;';
  }
  function refresh() {
    var host = document.getElementById('shotShapeBar');
    if (!host) return;
    [].forEach.call(host.querySelectorAll('button'), function (b) {
      styleSeg(b, String(SHAPE.value) === b.dataset.shape);
    });
  }

  // ---- inject the intended shape into the flight object ---------------------
  // We wrap resolveFullShot: after the base engine builds ball.flight, we attach
  // a shapeCurve target (signed pixels of intended finishing offset) plus a
  // small opposite "start bias" so a draw starts right and works back left.
  if (typeof resolveFullShot === 'function') {
    var _rfs = resolveFullShot;
    resolveFullShot = function (shot, marker) {
      var r = _rfs.apply(this, arguments);
      try {
        if (ball && ball.flight) {
          var club = (typeof clubs !== 'undefined') ? clubs[shot.clubKey] : null;
          // intended shape: scales with power and club (less on short clubs)
          var clubScale = club ? clampN((club.flightHeight || 0.5) + 0.25, 0.4, 1.1) : 0.8;
          var intended = SHAPE.value * (26 + (shot.power || 0.6) * 30) * clubScale;
          // career Accuracy makes intended shape more reliable (handled via the
          // accidental term already); here we just store the intent.
          ball.flight.shapeCurve = intended;
          ball.flight.shapeStartBias = -SHAPE.value * 0.45; // degrees, opposite lean
          // fold a tiny opposite start-line lean into the launch angle so the
          // ball works back toward target (only for an intentional shape)
          if (SHAPE.value !== 0 && typeof radians === 'function') {
            ball.flight.angle += radians(ball.flight.shapeStartBias);
          }
        }
      } catch (e) {}
      return r;
    };
  }

  // ---- reworked flight integrator (progressive curve + natural wind blend) --
  // Supersedes flight-curve-overlay-v065's updateFlight (the true active one).
  // Preserves its wind model, driver-trail tracking and wind-overlay refresh,
  // but swaps the curve for a progressive intended+accidental shape that ends
  // offline, blended with wind into one natural arc.
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

      // integrate along the STRAIGHT base line so we can add curve progressively
      var ex = (typeof shot.baseEndX === 'number') ? shot.baseEndX : shot.endX;
      var ey = (typeof shot.baseEndY === 'number') ? shot.baseEndY : shot.endY;
      var baseX = _lerp(shot.startX, ex, ease);
      var baseY = _lerp(shot.startY, ey, ease);
      var perpX = -Math.sin(shot.angle);
      var perpY = Math.cos(shot.angle);

      // accidental curve (strike mishit) + intended shape (player draw/fade)
      var accidental = (shot.finalCurvePixels || 0);
      var intended = (shot.shapeCurve || 0);
      // progressive: starts ~straight, accelerates, finishes offline (real shape)
      var shapeProg = Math.pow(t, 1.7);
      var lateralShape = (intended + accidental) * shapeProg;

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
        var totalCurve = intended + accidental;
        var rollAngle = (shot.windV063 ? shot.windV063.rollAngle : shot.angle) + totalCurve * 0.0017;
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

  // rebuild the selector whenever a hole resets (the controls persist, but we
  // refresh state) and once on load.
  function init() { buildBar(); refresh(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.ShotShape = SHAPE;
  window.shotShapingLoaded = true;
})();
