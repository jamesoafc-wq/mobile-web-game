// ============================================================================
// ground-marks.js  ·  pitch marks & divots (loads after engine-core)
// ----------------------------------------------------------------------------
// Leaves marks in the turf based on CLUB + SURFACE, for the current hole:
//   * DIVOT at the strike point when a full-swing club (driver/woods/irons/
//     wedges) is played from grass (tee/fairway/rough) — a torn scrape with a
//     little kicked-up turf, oriented along the swing.
//   * PITCH MARK where a lofted approach LANDS on the green/fringe — a small
//     indented crescent (ball depression).
//   * No marks from the putter, from sand (the bunker render owns that), or on
//     water.
//
// Marks are stored per hole and cleared when the hole resets. Rendered just
// after the course surfaces so the ball and props sit on top. Purely cosmetic.
// ============================================================================

(function () {
  'use strict';

  var marks = [];          // {x, y, ang, type:'divot'|'pitch', surf, scale}
  var MAX = 60;            // cap so a hole never accumulates too many

  function add(m) {
    marks.push(m);
    if (marks.length > MAX) marks.shift();
  }
  function clearMarks() { marks.length = 0; }

  // ---- DIVOT at strike origin (wrap resolveSkillShot) ----------------------
  // At the moment a full shot is resolved, the ball is still at the strike
  // point; record a divot there if it's a grass lie and a swinging club.
  if (typeof resolveSkillShot === 'function') {
    var beforeResolve = resolveSkillShot;
    resolveSkillShot = function resolveSkillShotWithDivot() {
      try {
        if (ball && !ball.holed && typeof getLie === 'function') {
          var lie = getLie();
          var club = clubs[selectedClub];
          var swinging = club && club.type === 'full';
          if (swinging && (lie === 'fairway' || lie === 'rough' || lie === 'tee')) {
            var ang = (typeof drag !== 'undefined' && drag) ? drag.angle : -1.57;
            add({ x: ball.x, y: ball.y, ang: ang, type: 'divot', surf: lie,
                  scale: (selectedClub === 'driver' || selectedClub === 'wood3') ? 0.8 : 1.1 });
          }
        }
      } catch (e) {}
      return beforeResolve();
    };
  }

  // ---- PITCH MARK at landing (wrap startLandingRoll) -----------------------
  if (typeof startLandingRoll === 'function') {
    var beforeLanding = startLandingRoll;
    startLandingRoll = function startLandingRollWithPitch(angle, lie, carryYards, clubKey) {
      try {
        if ((lie === 'green' || lie === 'fringe') && ball) {
          var club = clubs[clubKey];
          // higher-lofted clubs leave a deeper pitch mark; long clubs skid less
          var loft = club ? (club.flightHeight || 0.2) : 0.2;
          add({ x: ball.x, y: ball.y, ang: angle, type: 'pitch', surf: lie,
                scale: 0.7 + loft * 1.6 });
        }
      } catch (e) {}
      return beforeLanding(angle, lie, carryYards, clubKey);
    };
  }

  // ---- clear on hole reset --------------------------------------------------
  if (typeof resetRoundHoleV035 === 'function') {
    var beforeReset = resetRoundHoleV035;
    resetRoundHoleV035 = function resetRoundHoleClearMarks(i) {
      clearMarks();
      return beforeReset(i);
    };
  }

  // ---- rendering ------------------------------------------------------------
  function drawDivot(ctx, m) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.ang);
    var s = m.scale || 1;
    // torn dark scrape
    ctx.fillStyle = (m.surf === 'rough') ? 'rgba(40,60,28,0.5)' : 'rgba(70,52,30,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.5 * s, 2.4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // kicked-up turf flecks ahead of the divot
    ctx.fillStyle = 'rgba(95,140,70,0.55)';
    for (var i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(4 * s + i * 2.2 * s, (i - 1) * 1.6 * s, 1.1 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPitch(ctx, m) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.ang);
    var s = m.scale || 1;
    // shallow indentation: darker crescent on the impact side, light rim opposite
    ctx.fillStyle = 'rgba(40,80,40,0.30)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.2 * s, 2.4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,55,25,0.34)';
    ctx.beginPath();
    ctx.arc(-1 * s, 0, 1.7 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,255,205,0.22)';
    ctx.beginPath();
    ctx.arc(1.4 * s, 0, 1.1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawMarks(ctx) {
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      if (m.type === 'divot') drawDivot(ctx, m); else drawPitch(ctx, m);
    }
  }

  // Hook into the course render: draw marks right after drawCourse so they sit
  // on the turf but under the ball/props. We wrap drawCourse (whatever it
  // currently is) and append the marks pass.
  if (typeof drawCourse === 'function') {
    var beforeCourse = drawCourse;
    drawCourse = function drawCourseWithMarks(ctx, hole, W, H, t, showSlope) {
      beforeCourse(ctx, hole, W, H, t, showSlope);
      try { drawMarks(ctx); } catch (e) {}
    };
  }

  window.GroundMarks = { add: add, clear: clearMarks, all: function () { return marks; } };
  window.groundMarksLoaded = true;
})();
