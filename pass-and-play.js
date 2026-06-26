// ============================================================================
// pass-and-play.js  ·  local 2-player alternating golf for Quick Play
// ----------------------------------------------------------------------------
// When window.__passPlay is on, two players alternate HOLES; each player's
// strokes are tracked and a small scorecard shows both totals. Additive: hooks
// hole-out to switch players and tally.
// ============================================================================

(function () {
  'use strict';
  var P = { active: false, turn: 0, names: ['P1', 'P2'], totals: [0, 0], thisHole: [null, null], holeIdx: 0 };

  function begin() {
    P.active = true; P.turn = 0; P.totals = [0, 0]; P.thisHole = [null, null]; P.holeIdx = 0;
  }
  function reset() { P.active = false; }

  if (typeof applyCourseV045 === 'function') {
    var beforeApply = applyCourseV045;
    applyCourseV045 = function applyCoursePassPlay(course) {
      beforeApply.apply(this, arguments);
      if (window.__passPlay && !(course && course.isRange)) begin();
      else reset();
    };
  }

  // BOTH players play every hole: on hole-out, record the current player's score.
  // If the other player hasn't played this hole yet, replay the SAME hole for
  // them. Once both have, advance to the next hole.
  if (typeof maybeHoleOut === 'function') {
    var beforePP = maybeHoleOut;
    maybeHoleOut = function maybeHoleOutPassPlay() {
      if (!P.active || !ball || !ball.holed || typeof strokes === 'undefined') { beforePP.apply(this, arguments); return; }
      // record this player's score for the current hole
      P.thisHole[P.turn] = strokes;
      P.totals[P.turn] += strokes;
      var other = 1 - P.turn;
      if (P.thisHole[other] === null) {
        // other player still needs to play THIS hole — replay it for them
        P.turn = other;
        var idx = (typeof roundHoleIndexV035 !== 'undefined') ? roundHoleIndexV035 : 0;
        setTimeout(function () {
          if (typeof resetRoundHoleV035 === 'function') resetRoundHoleV035(idx);
          showTurnBanner();
          if (typeof updateHud === 'function') updateHud();
        }, 600);
        // do NOT call the normal hole-out (which would advance the hole)
        return;
      }
      // both players done with this hole — reset for next and let normal advance
      P.thisHole = [null, null];
      P.turn = 0;
      P.holeIdx++;
      beforePP.apply(this, arguments);
      showTurnBanner();
    };
  }

  function showTurnBanner() {
    try {
      var el = document.createElement('div');
      el.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:100000;' +
        'background:rgba(8,14,10,.92);border:1px solid rgba(255,226,122,.5);border-radius:18px;padding:22px 30px;' +
        'color:#fff;font:950 20px system-ui;text-align:center;box-shadow:0 14px 40px rgba(0,0,0,.5);';
      el.innerHTML = '<div style="color:#ffe27a;font-size:13px;font-weight:800;">NEXT UP</div>' +
        '<div style="margin-top:6px;">' + P.names[P.turn] + '</div>' +
        '<div style="font:800 12px system-ui;color:rgba(255,255,255,.7);margin-top:8px;">Pass the device</div>';
      document.body.appendChild(el);
      setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 400); }, 1500);
    } catch (e) {}
  }

  // draw rolling 2-player totals top-right during play
  if (typeof drawOverlayInfo === 'function') {
    var beforeOverlay = drawOverlayInfo;
    drawOverlayInfo = function drawOverlayPassPlay() {
      beforeOverlay.apply(this, arguments);
      if (!P.active || typeof ctx === 'undefined' || typeof canvas === 'undefined') return;
      ctx.save();
      ctx.font = '800 12px system-ui'; ctx.textAlign = 'left';
      var bw = 120, bh = 50, bx = canvas.width - bw - 10, by = 88;
      ctx.fillStyle = 'rgba(8,14,10,.74)';
      roundRect(ctx, bx, by, bw, bh, 8); ctx.fill();
      ctx.fillStyle = '#ffe27a'; ctx.font = '900 10px system-ui';
      ctx.fillText('TOTALS', bx + 10, by + 14);
      ctx.font = '800 12px system-ui';
      for (var i = 0; i < 2; i++) {
        ctx.fillStyle = (i === P.turn) ? '#ffe27a' : 'rgba(255,255,255,.8)';
        ctx.fillText((i === P.turn ? '▶ ' : '   ') + P.names[i] + ': ' + P.totals[i], bx + 10, by + 30 + i * 15);
      }
      ctx.restore();
    };
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  window.PassPlay = P;
  window.passAndPlayLoaded = true;
})();
