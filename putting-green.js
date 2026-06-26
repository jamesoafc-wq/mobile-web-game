// ============================================================================
// putting-green.js  ·  endless putting practice
// ----------------------------------------------------------------------------
// Generates a fresh green with a new slope (heightPoints), pin and ball start
// each time you hole out, looping continuously. No scoring. Uses the GreenField
// slope system so the moving slope-lines read correctly.
// ============================================================================

(function () {
  'use strict';
  if (typeof applyCourseV045 === 'undefined') return;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  // a large oval green filling the middle of the canvas
  function greenPoly(cx, cy, rx, ry, wobble) {
    var pts = [];
    for (var i = 0; i < 18; i++) {
      var a = (i / 18) * Math.PI * 2;
      var w = 1 + (Math.sin(a * 3 + wobble) * 0.06);
      pts.push({ x: cx + Math.cos(a) * rx * w, y: cy + Math.sin(a) * ry * w });
    }
    return pts;
  }

  function makeHole() {
    var cx = 210, cy = 360, rx = 150, ry = 250;
    var green = greenPoly(cx, cy, rx, ry, rnd(0, 6));
    var ring = greenPoly(cx, cy, rx + 14, ry + 14, rnd(0, 6));
    // pin somewhere in the upper half, start in the lower half
    var cup = { x: rnd(cx - rx * 0.5, cx + rx * 0.5), y: rnd(cy - ry * 0.55, cy - ry * 0.1), r: 4.2 };
    var start = { x: rnd(cx - rx * 0.5, cx + rx * 0.5), y: rnd(cy + ry * 0.2, cy + ry * 0.6) };
    // random slope: 3-4 height control points across the green
    var hp = [];
    var n = 3 + (Math.random() < 0.5 ? 0 : 1);
    for (var i = 0; i < n; i++) {
      hp.push({ x: rnd(cx - rx, cx + rx), y: rnd(cy - ry, cy + ry), h: rnd(-1, 1) });
    }
    // ensure a little tilt near the cup so putts break
    hp.push({ x: cup.x + rnd(-40, 40), y: cup.y + rnd(-40, 40), h: rnd(0.4, 1) });
    return {
      id: 1, name: 'Putting Green', par: 2, courseTheme: 'masters', isPutt: true, isRange: true,
      start: start, cup: cup,
      green: green, greenRing: ring,
      fairway: ring,            // so off-green still reads as short grass
      tee: [], bunkers: [], water: [], trees: [], props: [],
      slopeZones: [], heightPoints: hp,
      themeExtras: []
    };
  }

  function loadNew() {
    var holes = []; for (var i = 0; i < 18; i++) { var hh = makeHole(); hh.id = i + 1; holes.push(hh); }
    var course = {
      id: 'putting', theme: 'masters', name: 'Putting Green', isRange: true, isPutt: true,
      holes: holes
    };
    applyCourseV045(course);
    if (typeof resetRoundHoleV035 === 'function') resetRoundHoleV035(0);
    // force putter
    try { if (typeof selectClubByType === 'function') selectClubByType('putt'); } catch (e) {}
  }

  function start() {
    loadNew();
    if (typeof hideCourseMenuV045 === 'function') hideCourseMenuV045();
    if (typeof updateHud === 'function') updateHud();
    active = true;
  }

  var active = false;

  // when the ball is holed on the putting green, regenerate a new green
  if (typeof maybeHoleOut === 'function') {
    var beforePutt = maybeHoleOut;
    maybeHoleOut = function maybeHoleOutPutt() {
      var wasPutt = (typeof hole !== 'undefined' && hole && hole.isPutt);
      beforePutt.apply(this, arguments);
      if (active && wasPutt && ball && ball.holed) {
        // brief celebratory pause then a fresh green
        setTimeout(function () { loadNew(); }, 700);
      }
    };
  }

  // leaving to the menu stops the loop
  if (typeof showCourseMenuV045 === 'function') {
    var beforeShow = showCourseMenuV045;
    showCourseMenuV045 = function () { active = false; beforeShow.apply(this, arguments); };
  }

  window.PuttingGreen = { start: start };
  window.puttingGreenLoaded = true;
})();
