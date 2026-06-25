// ============================================================================
// pass-and-play.js  ·  local 2-player alternating golf for Quick Play
// ----------------------------------------------------------------------------
// When window.__passPlay is on, two players alternate HOLES; each player's
// strokes are tracked and a small scorecard shows both totals. Additive: hooks
// hole-out to switch players and tally.
// ============================================================================

(function () {
  'use strict';
  var P = { active: false, turn: 0, names: ['Player 1', 'Player 2'], totals: [0, 0], holesPlayed: [0, 0] };

  function begin() {
    P.active = true; P.turn = 0; P.totals = [0, 0]; P.holesPlayed = [0, 0];
  }
  function reset() { P.active = false; }

  // detect entering a normal course while pass-play is enabled
  if (typeof applyCourseV045 === 'function') {
    var beforeApply = applyCourseV045;
    applyCourseV045 = function applyCoursePassPlay(course) {
      beforeApply.apply(this, arguments);
      if (window.__passPlay && !(course && (course.isRange))) begin();
      else reset();
    };
  }

  // on hole-out, add the score to the current player and switch turns
  if (typeof maybeHoleOut === 'function') {
    var beforePP = maybeHoleOut;
    maybeHoleOut = function maybeHoleOutPassPlay() {
      beforePP.apply(this, arguments);
      if (!P.active || !ball || !ball.holed || typeof strokes === 'undefined') return;
      P.totals[P.turn] += strokes;
      P.holesPlayed[P.turn]++;
      P.turn = 1 - P.turn;
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

  // draw a tiny 2-player scorecard overlay during play
  if (typeof drawOverlayInfo === 'function') {
    var beforeOverlay = drawOverlayInfo;
    drawOverlayInfo = function drawOverlayPassPlay() {
      beforeOverlay.apply(this, arguments);
      if (!P.active || typeof ctx === 'undefined') return;
      ctx.save();
      ctx.font = '800 11px system-ui'; ctx.textAlign = 'left';
      var bx = 10, by = 96;
      ctx.fillStyle = 'rgba(8,14,10,.7)';
      ctx.fillRect(bx, by, 116, 44);
      for (var i = 0; i < 2; i++) {
        ctx.fillStyle = (i === P.turn) ? '#ffe27a' : 'rgba(255,255,255,.7)';
        ctx.fillText((i === P.turn ? '▶ ' : '   ') + P.names[i] + ': ' + P.totals[i], bx + 6, by + 16 + i * 18);
      }
      ctx.restore();
    };
  }

  window.PassPlay = P;
  window.passAndPlayLoaded = true;
})();
