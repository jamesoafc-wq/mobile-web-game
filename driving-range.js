// ============================================================================
// driving-range.js  ·  a practice range "course": one giant fairway, a few tees,
// distance signs, no scoring pressure. Uses the masters textures.
// ============================================================================

(function () {
  'use strict';
  if (typeof COURSES_V045 === 'undefined') return;

  // a single huge-fairway hole filling most of the canvas
  function rangeHole() {
    var h = {
      id: 1, name: 'Driving Range', par: 3, courseTheme: 'masters', isRange: true,
      start: { x: 210, y: 662 },
      cup: { x: 210, y: 150, r: 4.2 },
      // wide rectangular fairway spanning the canvas
      fairway: [
        { x: 60, y: 710 }, { x: 360, y: 710 }, { x: 360, y: 120 },
        { x: 60, y: 120 }
      ],
      // a target green up top
      greenRing: ringPoly(210, 150, 60, 44),
      green: ringPoly(210, 150, 50, 36),
      // a wide teeing ground across the bottom (start sits on it)
      tee: rect(210, 668, 200, 64),
      bunkers: [],
      water: [],
      trees: [],
      props: [],
      slopeZones: [],
      themeExtras: [
        { type: 'rangeSign', x: 110, y: 430, text: '100' },
        { type: 'rangeSign', x: 300, y: 330, text: '150' },
        { type: 'rangeSign', x: 130, y: 240, text: '200' },
        { type: 'rangeFlag', x: 210, y: 150 },
        { type: 'rangeFlag', x: 110, y: 300 },
        { type: 'rangeFlag', x: 310, y: 260 }
      ]
    };
    return h;
  }
  function ringPoly(cx, cy, rx, ry) {
    var pts = []; for (var i = 0; i < 14; i++) { var a = (i / 14) * Math.PI * 2; pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }); } return pts;
  }
  function rect(cx, cy, w, h) {
    return [{ x: cx - w / 2, y: cy + h / 2 }, { x: cx + w / 2, y: cy + h / 2 }, { x: cx + w / 2, y: cy - h / 2 }, { x: cx - w / 2, y: cy - h / 2 }];
  }

  var RANGE_COURSE = {
    id: 'range', theme: 'masters', name: 'Driving Range', subtitle: 'Practice · no scoring',
    difficulty: 0, palette: ['#37b85e', '#5fd07e', '#e8b6d0'], icon: '🏌️',
    details: 'Warm up and groove your swing — giant fairway, distance markers, no pressure.',
    isRange: true, unlockLevel: 1,
    holes: (function () { var hs = []; for (var i = 0; i < 18; i++) { var h = rangeHole(); h.id = i + 1; hs.push(h); } return hs; })()
  };

  // expose for the menu / mode router (not pushed into the normal course list,
  // launched via its own button)
  window.DrivingRange = {
    course: RANGE_COURSE,
    start: function () {
      if (typeof applyCourseV045 === 'function') applyCourseV045(RANGE_COURSE);
      if (typeof resetRoundHoleV035 === 'function') resetRoundHoleV035(0);
      if (typeof hideCourseMenuV045 === 'function') hideCourseMenuV045();
      if (typeof updateHud === 'function') updateHud();
      rangeActive = true;
      newDriveWind();
    }
  };

  var rangeActive = false;
  function newDriveWind() {
    if (typeof windStateV057 === 'undefined') return;
    var mph = Math.round(2 + Math.random() * 16);
    var ang = Math.random() * Math.PI * 2;
    windStateV057 = { angle: ang, mph: mph, label: (typeof windLabelV057 === 'function' ? windLabelV057(mph) : 'Wind'), difficulty: 2 };
  }

  // DRIVES ONLY: after each shot comes to rest, reset the ball to the tee and
  // roll a fresh wind, so it's a continuous series of tee shots (not a hole).
  if (typeof maybeHoleOut === 'function') {
    var beforeRangeHoleOut = maybeHoleOut;
    maybeHoleOut = function maybeHoleOutRange() {
      if (rangeActive && typeof hole !== 'undefined' && hole && hole.isRange && !hole.isPutt) {
        // suppress normal hole-out logic on the range; handle reset ourselves
        if (ball && !ball.flight && !ball.rolling && !ball.holed) {
          // ball at rest after a drive — reset to tee for the next drive
          if (typeof resetBallToTeeRange === 'function') resetBallToTeeRange();
          else resetRangeBall();
          return;
        }
      }
      beforeRangeHoleOut.apply(this, arguments);
    };
  }
  function resetRangeBall() {
    if (typeof ball === 'undefined' || !hole) return;
    setTimeout(function () {
      ball.x = hole.start.x; ball.y = hole.start.y;
      ball.flight = null; ball.rolling = false; ball.holed = false;
      if (typeof strokes !== 'undefined') strokes = 0;
      newDriveWind();
      if (typeof updateHud === 'function') updateHud();
    }, 900);
  }

  if (typeof showCourseMenuV045 === 'function') {
    var beforeShowRange = showCourseMenuV045;
    showCourseMenuV045 = function () { rangeActive = false; beforeShowRange.apply(this, arguments); };
  }

  // ---- render the range-only props (signs, flags) by wrapping theme extras ----
  if (typeof drawThemeExtrasV046 === 'function') {
    var beforeRange = drawThemeExtrasV046;
    drawThemeExtrasV046 = function drawThemeExtrasRange(ctx, hole) {
      beforeRange(ctx, hole);
      if (!hole || !hole.isRange || !hole.themeExtras) return;
      hole.themeExtras.forEach(function (e) {
        if (e.type === 'rangeSign') drawSign(ctx, e.x, e.y, e.text);
        else if (e.type === 'rangeFlag') drawTargetFlag(ctx, e.x, e.y);
      });
    };
  }
  function drawSign(ctx, x, y, text) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x, y + 8, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a5230'; ctx.fillRect(x - 1.5, y - 4, 3, 12);          // post
    ctx.fillStyle = '#f4ecd8'; ctx.fillRect(x - 11, y - 14, 22, 12);         // board
    ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 1; ctx.strokeRect(x - 11, y - 14, 22, 12);
    ctx.fillStyle = '#2a4a2a'; ctx.font = '900 9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y - 8);
    ctx.restore();
  }
  function drawTargetFlag(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 6, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();     // target ring
    ctx.strokeStyle = '#d94f4f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 14); ctx.stroke();
    ctx.fillStyle = '#d94f4f'; ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x + 9, y - 11); ctx.lineTo(x, y - 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  window.drivingRangeLoaded = true;
})();
