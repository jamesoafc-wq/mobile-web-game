// ============================================================================
// putter-handoff-fix.js  ·  authoritative club auto-selection (loads after v055/v056)
// ----------------------------------------------------------------------------
// Owns ALL automatic club selection, replacing the buggy v055/v056 behaviour:
//
//   OLD BUGS:
//   * v055/v056 forced the putter EVERY FRAME while on the green, so the player
//     could never pick another club there (couldn't chip from a green edge).
//   * v056 also force-selected the putter within 54px of the cup REGARDLESS of
//     lie, trapping you with a putter when a tee shot rolled off a par-3 green.
//   * Neither ever switched AWAY from the putter when the ball left the green.
//
//   NEW BEHAVIOUR (auto-suggest once, then respect the player):
//   * When the ball comes to rest at a NEW spot, auto-select a sensible club
//     for that lie ONE TIME (putter on green/fringe; a playable club off it).
//   * After that, the player can freely change clubs — we never re-force on the
//     same resting position. The auto-select only re-arms when the ball moves
//     to a new rest (i.e. after the next shot or a new hole).
// ============================================================================

(function () {
  'use strict';

  // Neutralise the old per-frame forcing so it can't fight the player.
  if (typeof autoSwitchToPutterOnGreenV055 === 'function') {
    autoSwitchToPutterOnGreenV055 = function () {};
  }
  if (typeof forcePutterIfSettledOnGreenV056 === 'function') {
    forcePutterIfSettledOnGreenV056 = function () {};
  }
  if (typeof isGreenEnoughForPutterV056 === 'function') {
    isGreenEnoughForPutterV056 = function () {
      if (typeof ball === 'undefined' || !ball || typeof getLie !== 'function') return false;
      var lie = getLie();
      return lie === 'green' || lie === 'fringe';
    };
  }

  function clubForLie(lie) {
    if (lie === 'green' || lie === 'fringe') return 'putter';
    if (lie === 'sand') return 'wedgeS';
    if (lie === 'rough') return 'iron7';
    return 'wedgeP';
  }

  // Track the rest position we last auto-selected for, so we only auto-select
  // ONCE per resting spot and then leave the player's choice alone.
  var lastRestKey = null;
  var armed = false;        // becomes true while the ball is moving (re-arms auto-select)

  function restKey() {
    if (!ball) return null;
    return Math.round(ball.x) + ',' + Math.round(ball.y);
  }

  function autoSelectOnce() {
    if (typeof ball === 'undefined' || !ball) return;

    // While the ball is moving / flying, arm the next auto-select.
    if (ball.moving || ball.flight) { armed = true; return; }
    if (ball.holed) return;
    if (typeof pendingShot !== 'undefined' && pendingShot) return;
    if (typeof getLie !== 'function') return;

    var key = restKey();
    var lie = getLie();
    var want = clubForLie(lie);
    var onGreen = (lie === 'green' || lie === 'fringe');
    var curUsable = (typeof clubs !== 'undefined' && clubs[selectedClub] &&
                     clubs[selectedClub].carry && clubs[selectedClub].carry[lie] > 0);

    // CASE A — the selected club is WRONG for the lie and must be fixed every
    // time (never gated), so the player is never stuck:
    //   * putter selected anywhere off the green/fringe (it has tiny but
    //     non-zero carry there, so the carry table alone won't catch it), or
    //   * any club that literally cannot play the lie (carry <= 0, e.g. putter
    //     in sand).
    var putterOffGreen = (selectedClub === 'putter' && !onGreen);
    if (putterOffGreen || !curUsable) {
      applyClub(want, lie);
      lastRestKey = key;
      return;
    }

    // CASE B — convenience auto-suggest ONCE per new resting spot: when you
    // arrive on the green with a non-putter, offer the putter. Gated by armed +
    // new position so it fires once and then respects any manual change.
    if (armed && key !== lastRestKey) {
      if (onGreen && selectedClub !== 'putter') applyClub('putter', lie);
      lastRestKey = key;
      armed = false;
    }
  }

  function applyClub(next, lie) {
    if (next === selectedClub) return;
    selectedClub = next;
    if (typeof updateClubButtons === 'function') updateClubButtons();
    var label = (clubs[next] && clubs[next].short) || next;
    message = (lie === 'green' || lie === 'fringe')
      ? 'On the green — putter ready.'
      : 'Off the green — ' + label + ' selected.';
    if (typeof clubEl !== 'undefined' && clubEl) clubEl.textContent = label;
    if (typeof hintEl !== 'undefined' && hintEl) hintEl.textContent = message;
  }

  // Run the check after roll updates (cheap, idempotent). We deliberately do NOT
  // hook updateHud, so manual club selections (which call updateHud) are never
  // overridden.
  if (typeof updateRoll === 'function') {
    var beforeRoll = updateRoll;
    updateRoll = function updateRollClubAuto() {
      beforeRoll();
      autoSelectOnce();
    };
  }
  // Also re-arm when a new hole/shot resets the ball: hook resetRoundHoleV035.
  if (typeof resetRoundHoleV035 === 'function') {
    var beforeReset = resetRoundHoleV035;
    resetRoundHoleV035 = function resetRoundClubAuto(i) {
      beforeReset(i);
      lastRestKey = null; armed = true;
    };
  }

  window.putterHandoffFixLoaded = true;
})();
