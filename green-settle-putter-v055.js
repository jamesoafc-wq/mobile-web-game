// v0.55 fix par-3 full-shot landings on green: settle first, then switch cleanly to putter.

const greenSettleStateV055 = {
  wasMoving: false,
  lastHoleIndex: -1
};

function autoSwitchToPutterOnGreenV055() {
  if (!ball || ball.holed || ball.moving || ball.flight || pendingShot) return;
  if (selectedClub === 'putter') return;
  const lie = getLie();
  if (lie !== 'green' && lie !== 'fringe') return;

  selectedClub = 'putter';
  updateClubButtons();
  message = 'On the green. Putter selected.';

  if (typeof cameraSettleStateV053 !== 'undefined') {
    cameraSettleStateV053.wasMoving = false;
    cameraSettleStateV053.settleDelayUntil = performance.now() + 120;
  }
  updateHud();
}

const updateHudBeforeV055 = updateHud;
updateHud = function updateHudGreenSettleV055() {
  updateHudBeforeV055();
  const movingNow = !!(ball && (ball.moving || ball.flight));
  const currentHole = typeof roundHoleIndexV035 === 'number' ? roundHoleIndexV035 : 0;
  if (greenSettleStateV055.lastHoleIndex !== currentHole) {
    greenSettleStateV055.wasMoving = movingNow;
    greenSettleStateV055.lastHoleIndex = currentHole;
    return;
  }

  if (greenSettleStateV055.wasMoving && !movingNow) {
    greenSettleStateV055.wasMoving = false;
    setTimeout(autoSwitchToPutterOnGreenV055, 40);
  } else {
    greenSettleStateV055.wasMoving = movingNow;
  }
};

const drawOverlayBeforeBuildV055 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV055() {
  drawOverlayBeforeBuildV055();
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
  ctx.fillText('v0.55', x, y + 0.5);
  ctx.restore();
};
