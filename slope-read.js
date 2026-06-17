// ============================================================================
// slope-read.js  ·  Green-reading visualisation (loads LAST)
// ----------------------------------------------------------------------------
// Three layers, all sampled from the SAME height field the physics uses
// (GreenField), so what you see is exactly what the ball does:
//
//   1. HEAT-MAP  — the green is tinted by slope: warm (red/orange) where it
//      runs downhill, cool (blue) where it runs uphill, stronger = steeper.
//      This is the at-a-glance read of the whole surface, like a pro green book.
//   2. FAINT ARROWS — a sparse, low-opacity flow grid pointing downhill, as a
//      secondary reinforcement of direction (kept subtle so it doesn't clutter).
//   3. PREDICTED PUTT LINE — while you pull back with the putter, a dotted line
//      simulates the actual roll (same break + friction as the engine) and
//      shows where THIS putt will end up, curve included.
//
// Overrides drawSlopeRead (called in world space during putting view). Loads
// after every round-* file so this version wins. Pure rendering.
// ============================================================================

(function () {
  'use strict';
  if (!window.GreenField || typeof window.GreenField.greenSlope !== 'function') return;
  var GF = window.GreenField;

  function inGreen(hole, x, y) {
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
  function clipToGreen(ctx, hole) {
    if (typeof drawRoundedPolygon === 'function') drawRoundedPolygon(ctx, hole.green);
    else {
      ctx.beginPath();
      ctx.moveTo(hole.green[0].x, hole.green[0].y);
      for (var i = 1; i < hole.green.length; i++) ctx.lineTo(hole.green[i].x, hole.green[i].y);
      ctx.closePath();
    }
    ctx.clip();
  }

  // ---- LAYER 1: heat-map -----------------------------------------------------
  // We tint by the VERTICAL component of slope (downhill toward the player's
  // view = "fall line"), but to keep it intuitive on a top-down green we map the
  // slope magnitude to warmth and use the height itself for hue: lower ground
  // (where putts gather) reads warm, higher ground reads cool.
  function drawHeatMap(ctx, hole, timeMs) {
    var b = bounds(hole.green);
    var cell = 9;                          // sampling resolution (px)
    var t = (timeMs || 0) * 0.001;
    ctx.save();
    clipToGreen(ctx, hole);
    // height range across the green for normalisation
    var minH = Infinity, maxH = -Infinity, hs = [];
    for (var x = b.minX; x <= b.maxX; x += cell) {
      for (var y = b.minY; y <= b.maxY; y += cell) {
        var h = GF.sampleHeight(hole, x, y);
        hs.push({ x: x, y: y, h: h });
        if (h < minH) minH = h; if (h > maxH) maxH = h;
      }
    }
    var range = (maxH - minH) || 1;
    for (var i = 0; i < hs.length; i++) {
      var c = hs[i];
      var s = GF.greenSlope(hole, c.x, c.y);   // downhill direction + strength
      var steep = clamp(s.strength / 1.6, 0, 1);
      // 1) HEIGHT SHADE — dark green (high) to light green (low). Always drawn so
      // the whole green reads as a smooth elevation map.
      var hn = (c.h - minH) / range;           // 0 low .. 1 high
      // dark (high): ~hsl(135,45%,22%)  ->  light (low): ~hsl(120,55%,72%)
      var L = 70 - hn * 46;                     // lightness: high=low L (dark)
      var S = 42 + hn * 12;
      var Hh = 122 + hn * 12;
      ctx.fillStyle = 'hsla(' + Hh.toFixed(0) + ',' + S.toFixed(0) + '%,' + L.toFixed(0) + '%,' + (subtleMode ? 0.22 : 0.5) + ')';
      ctx.fillRect(c.x - cell / 2, c.y - cell / 2, cell + 0.7, cell + 0.7);

      // 2) CONVEYOR FLOW — within each cell, draw a short moving dash travelling
      // DOWNHILL, so slope direction is instantly readable. Speed & opacity scale
      // with steepness; flat areas show little/no motion.
      if (steep < 0.06) continue;
      var mag = s.strength || 1e-6;
      var ux = s.x / mag, uy = s.y / mag;       // unit downhill
      // phase scrolls along the downhill direction, offset per cell so the dashes
      // don't all march in lockstep
      var speed = 0.6 + steep * 1.8;
      var phase = (t * speed + (c.x * 0.05 + c.y * 0.07)) % 1;
      var off = (phase - 0.5) * cell;           // travel within the cell
      var fade = Math.sin(phase * Math.PI);     // fade in/out across the cell
      var dx = c.x + ux * off, dy = c.y + uy * off;
      var len = 2.4 + steep * 2.2;
      ctx.strokeStyle = 'rgba(245,255,235,' + (0.12 + steep * 0.5) * fade * (subtleMode ? 0.45 : 1) + ')';
      ctx.lineWidth = 1 + steep * 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(dx - ux * len, dy - uy * len);
      ctx.lineTo(dx + ux * len, dy + uy * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---- LAYER 2: faint flow arrows -------------------------------------------
  function drawArrows(ctx, hole, timeMs) {
    var b = bounds(hole.green);
    var step = 20;
    var t = (timeMs || 0) * 0.001;
    ctx.save();
    for (var gx = b.minX; gx <= b.maxX; gx += step) {
      for (var gy = b.minY; gy <= b.maxY; gy += step) {
        if (!inGreen(hole, gx, gy)) continue;
        var s = GF.greenSlope(hole, gx, gy);
        var mag = s.strength;
        if (mag < 1e-3) continue;
        var ux = s.x / mag, uy = s.y / mag;
        var steep = clamp(mag / 1.6, 0.1, 1);
        var phase = (t * (0.3 + steep * 0.4) + (gx * 0.013 + gy * 0.017)) % 1;
        var travel = (phase - 0.5) * step;
        var fade = Math.sin(phase * Math.PI);
        var cx = gx + ux * travel, cy = gy + uy * travel;
        if (!inGreen(hole, cx, cy)) continue;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.atan2(uy, ux));
        ctx.globalAlpha = (0.05 + steep * 0.12) * fade;   // faint
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 8px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u203a', 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // ---- LAYER 3: predicted putt line -----------------------------------------
  // Simulate the putt with the SAME launch + break + friction the engine uses,
  // so the dotted line curves exactly as the real ball will. Only shown while
  // pulling back with the putter on the green.
  function simulatePuttPath(hole, startX, startY, angle, power, lie) {
    var pts = [{ x: startX, y: startY }];
    // launch speed: mirror engine getPuttRollYards/getPuttLaunchSpeed
    var rollYards = (typeof getPuttRollYards === 'function')
      ? getPuttRollYards(lie, power, 1)
      : 60 * power;
    var speed = (typeof getPuttLaunchSpeed === 'function')
      ? getPuttLaunchSpeed(lie, rollYards)
      : rollYards / (YARDS_PER_PIXEL || 0.92) * 0.011;
    var vx = Math.cos(angle) * speed, vy = Math.sin(angle) * speed;
    var x = startX, y = startY;
    var fr = (typeof rollFriction === 'object' && rollFriction.green) ? rollFriction.green : 0.989;
    for (var step = 0; step < 600; step++) {
      x += vx; y += vy;
      var lieHere = (typeof getSurfaceAtPoint === 'function') ? getSurfaceAtPoint(hole, x, y) : 'green';
      // stop if we leave the puttable surface
      if (lieHere !== 'green' && lieHere !== 'fringe') { pts.push({ x: x, y: y }); break; }
      var spd = Math.hypot(vx, vy);
      if (spd > 0.004 && typeof greenBreakAccel === 'function') {
        var a = greenBreakAccel(hole, x, y, spd, vx, vy);
        vx += a.x; vy += a.y;
      }
      var f = (typeof rollFriction === 'object' && rollFriction[lieHere]) ? rollFriction[lieHere] : fr;
      vx *= f; vy *= f;
      if (step % 3 === 0) pts.push({ x: x, y: y });
      // cup capture: stop near the hole
      if (dist(x, y, hole.cup.x, hole.cup.y) < 4) { pts.push({ x: hole.cup.x, y: hole.cup.y }); break; }
      if (Math.hypot(vx, vy) < 0.025) { pts.push({ x: x, y: y }); break; }
    }
    return pts;
  }

  function drawPuttLine(ctx, hole) {
    if (typeof drag === 'undefined' || !drag) return;
    if (typeof selectedClub === 'undefined' || selectedClub !== 'putter') return;
    if (typeof ball === 'undefined' || !ball || ball.moving || ball.flight || ball.holed) return;
    if (typeof pendingShot !== 'undefined' && pendingShot) return;  // hide once timing the strike
    if (!drag.power || drag.power < 0.04) return;
    var lie = (typeof getLie === 'function') ? getLie() : 'green';
    if (lie !== 'green' && lie !== 'fringe') return;

    var path = simulatePuttPath(hole, ball.x, ball.y, drag.angle, drag.power, lie);
    if (path.length < 2) return;

    // Show only the EARLY part of the roll — enough to read the initial break
    // direction, but not a full autopilot to the cup. The player still has to
    // judge pace and how the line continues to curve. Fades out along its length.
    var show = Math.max(2, Math.floor(path.length * 0.45));
    ctx.save();
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 6]);
    for (var i = 1; i < show; i++) {
      var a = 0.7 * (1 - i / show);                 // fade toward the end
      ctx.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(path[i - 1].x, path[i - 1].y);
      ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ---- compose ---------------------------------------------------------------
  // A clean cup marker drawn ON TOP of the heat-map so the hole is always
  // obvious without hacking gaps into the grid: a soft halo to lift it off the
  // shaded green, a crisp dark hole with a white rim, then the flag.
  function drawCupOnTop(ctx, hole, timeMs) {
    var cx = hole.cup.x, cy = hole.cup.y;
    ctx.save();
    // soft halo so the hole pops against any shade
    var halo = ctx.createRadialGradient(cx, cy, 1, cx, cy, 16);
    halo.addColorStop(0, 'rgba(255,255,255,0.0)');
    halo.addColorStop(0.55, 'rgba(255,255,255,0.0)');
    halo.addColorStop(0.75, 'rgba(255,255,255,0.30)');
    halo.addColorStop(1, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill();
    // white rim + dark hole
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(cx, cy, 4.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0d1b12';
    ctx.beginPath(); ctx.arc(cx, cy, 3.1, 0, Math.PI * 2); ctx.fill();
    // flagstick + flag (gentle wave)
    var sway = Math.sin((timeMs || 0) * 0.003) * 2;
    ctx.strokeStyle = 'rgba(245,250,245,0.95)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 30); ctx.stroke();
    ctx.fillStyle = '#e23b3b';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 30);
    ctx.quadraticCurveTo(cx + 9 + sway, cy - 27, cx + 14 + sway, cy - 24);
    ctx.quadraticCurveTo(cx + 9 + sway, cy - 23, cx, cy - 21);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  var subtleMode = false;   // when true, draw a faint approach-aid version

  drawSlopeRead = function drawSlopeReadVisual(ctx, hole, timeMs, subtle) {
    if (!hole || !hole.green || !window.GreenField) return;
    subtleMode = !!subtle;
    try { drawHeatMap(ctx, hole, timeMs); } catch (e) {}
    if (!subtleMode) {
      // full reading (putting): arrows + predicted line + bold cup marker
      try { drawArrows(ctx, hole, timeMs); } catch (e) {}
      try { drawPuttLine(ctx, hole); } catch (e) {}
      try { drawCupOnTop(ctx, hole, timeMs); } catch (e) {}
    }
    subtleMode = false;
  };

  window.slopeReadVisualLoaded = true;
})();
