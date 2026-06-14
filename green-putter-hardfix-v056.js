// v0.56 hard fix: force a clean putter handoff after full-shot landings on par-3 greens.

let forcingPutterV056 = false;

function isGreenEnoughForPutterV056() {
  if (!ball || !hole) return false;
  const lie = getLie();
  if (lie === 'green' || lie === 'fringe') return true;

  // Fallback for generated par-3s where the visual green edge can be reached by a driver
  // but the sampled lie may not yet report green/fringe cleanly.
  if ((hole.par || 4) <= 3) {
    const d = dist(ball.x, ball.y, hole.cup.x, hole.cup.y);
    if (d < 54) return true;
  }
  return false;
}

function forcePutterIfSettledOnGreenV056(reason) {
  if (forcingPutterV056) return;
  if (!ball || ball.holed || ball.moving || ball.flight || pendingShot) return;
  if (selectedClub === 'putter') return;
  if (!isGreenEnoughForPutterV056()) return;

  forcingPutterV056 = true;
  selectedClub = 'putter';
  updateClubButtons();
  message = 'On the green. Putter selected.';
  if (clubEl) clubEl.textContent = clubs.putter.short;
  if (hintEl) hintEl.textContent = message;

  if (typeof cameraSettleStateV053 !== 'undefined') {
    cameraSettleStateV053.wasMoving = false;
    cameraSettleStateV053.settleDelayUntil = performance.now() + 80;
  }

  if (typeof cameraStateV051 !== 'undefined') {
    cameraStateV051.intro = null;
  }
  forcingPutterV056 = false;
}

const updateFlightBeforeV056 = updateFlight;
updateFlight = function updateFlightGreenHandoffV056() {
  updateFlightBeforeV056();
  setTimeout(() => forcePutterIfSettledOnGreenV056('flight'), 0);
};

const updateRollBeforeV056 = updateRoll;
updateRoll = function updateRollGreenHandoffV056() {
  updateRollBeforeV056();
  forcePutterIfSettledOnGreenV056('roll');
};

const updateHudBeforeV056 = updateHud;
updateHud = function updateHudGreenHandoffV056() {
  updateHudBeforeV056();
  forcePutterIfSettledOnGreenV056('hud');
};

const drawOverlayBeforeBuildV056 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV056() {
  drawOverlayBeforeBuildV056();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const x = canvas.width / 2;
  const y = 17;
  ctx.fillStyle = 'rgba(4,10,6,0.9)';
  roundRect(ctx, x - 24, y - 7, 48, 14, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(222,255,210,0.24)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(221,238,210,0.92)';
  ctx.font = '850 8.5px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('v0.56', x, y + 0.5);
  ctx.restore();
};
