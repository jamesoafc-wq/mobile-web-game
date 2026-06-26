// ============================================================================
// pass-and-play.js  ·  local 2-player — BOTH players play every hole
// ----------------------------------------------------------------------------
// When window.__passPlay is on, both players play each hole before advancing.
// Player 1 plays the hole and taps "Next"; instead of advancing, the SAME hole
// replays for Player 2; after Player 2 taps "Next", the round advances. Rolling
// totals for both players show top-right. Additive: hooks goNextHoleV035.
// ============================================================================

(function () {
  'use strict';
  var P = { active: false, turn: 0, names: ['P1', 'P2'], totals: [0, 0], thisHole: [null, null] };

  function begin() { P.active = true; P.turn = 0; P.totals = [0, 0]; P.thisHole = [null, null]; }
  function reset() { P.active = false; }

  if (typeof applyCourseV045 === 'function') {
    var beforeApply = applyCourseV045;
    applyCourseV045 = function applyCoursePassPlay(course) {
      beforeApply.apply(this, arguments);
      if (window.__passPlay && !(course && course.isRange)) begin();
      else reset();
    };
  }

  // Record each player's strokes as they hole out (read at next-hole time).
  // We capture strokes when the hole is completed via maybeHoleOut.
  var lastStrokes = null;
  if (typeof maybeHoleOut === 'function') {
    var beforePP = maybeHoleOut;
    maybeHoleOut = function maybeHoleOutPassPlay() {
      var r = beforePP.apply(this, arguments);
      if (P.active && ball && ball.holed && typeof strokes !== 'undefined') lastStrokes = strokes;
      return r;
    };
  }

  // Hook the hole-advance: intercept to replay the same hole for player 2.
  if (typeof goNextHoleV035 === 'function') {
    var beforeNext = goNextHoleV035;
    goNextHoleV035 = function goNextHolePassPlay() {
      if (!P.active) { beforeNext.apply(this, arguments); return; }
      var idx = (typeof roundHoleIndexV035 !== 'undefined') ? roundHoleIndexV035 : 0;
      // record current player's score for this hole
      if (lastStrokes != null) { P.thisHole[P.turn] = lastStrokes; P.totals[P.turn] += lastStrokes; lastStrokes = null; }
      var other = 1 - P.turn;
      if (P.thisHole[other] === null) {
        // replay the SAME hole for the other player
        P.turn = other;
        if (typeof resetRoundHoleV035 === 'function') resetRoundHoleV035(idx);
        showTurnBanner();
        if (typeof updateHud === 'function') updateHud();
        return;
      }
      // both done this hole — reset trackers and advance for real
      P.thisHole = [null, null];
      P.turn = 0;
      beforeNext.apply(this, arguments);
      setTimeout(showTurnBanner, 50);
    };
  }

  function showTurnBanner() {
    try {
      var el = document.createElement('div');
      el.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:100000;' +
        'background:rgba(8,14,10,.92);border:1px solid rgba(255,226,122,.5);border-radius:18px;padding:20px 28px;' +
        'color:#fff;font:950 19px system-ui;text-align:center;box-shadow:0 14px 40px rgba(0,0,0,.5);';
      el.innerHTML = '<div style="color:#ffe27a;font-size:12px;font-weight:800;">NEXT UP</div>' +
        '<div style="margin-top:6px;">' + P.names[P.turn] + '</div>' +
        '<div style="font:800 11px system-ui;color:rgba(255,255,255,.7);margin-top:6px;">Pass the device</div>';
      document.body.appendChild(el);
      setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 400); }, 1400);
    } catch (e) {}
  }

  // rolling totals top-right
  if (typeof drawOverlayInfo === 'function') {
    var beforeOverlay = drawOverlayInfo;
    drawOverlayInfo = function drawOverlayPassPlay() {
      beforeOverlay.apply(this, arguments);
      if (!P.active || typeof ctx === 'undefined' || typeof canvas === 'undefined') return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      var bw = 118, bh = 50, bx = canvas.width - bw - 10, by = 88;
      ctx.fillStyle = 'rgba(8,14,10,.74)';
      rr(ctx, bx, by, bw, bh, 8); ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffe27a'; ctx.font = '900 10px system-ui';
      ctx.fillText('TOTALS', bx + 10, by + 15);
      ctx.font = '800 12px system-ui';
      for (var i = 0; i < 2; i++) {
        ctx.fillStyle = (i === P.turn) ? '#ffe27a' : 'rgba(255,255,255,.82)';
        ctx.fillText((i === P.turn ? '▶ ' : '   ') + P.names[i] + ': ' + P.totals[i], bx + 10, by + 31 + i * 15);
      }
      ctx.restore();
    };
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  window.PassPlay = P;
  window.passAndPlayLoaded = true;
})();
