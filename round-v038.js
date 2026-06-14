// v0.38 driver tee-shot trail fix.
// Limits the yellow tracker to the opening driver tee shot and keeps the full path visible.

let driverTrailArmedV038 = false;
let driverTrailActiveV038 = false;
let driverTrailDoneHoleV038 = -1;
let driverTrailUntilV038 = 0;
let driverTrailV038 = [];

const resolveSkillShotBeforeV038 = resolveSkillShot;
resolveSkillShot = function resolveSkillShotV038() {
  const shouldArm = pendingShot && pendingShot.clubKey === 'driver' && pendingShot.lie === 'tee' && driverTrailDoneHoleV038 !== roundHoleIndexV035;
  driverTrailArmedV038 = !!shouldArm;
  resolveSkillShotBeforeV038();

  if (driverTrailArmedV038 && ball && ball.flight && ball.flight.clubKey === 'driver') {
    driverTrailActiveV038 = true;
    driverTrailDoneHoleV038 = roundHoleIndexV035;
    driverTrailUntilV038 = 0;
    const sx = ball.flight.startX ?? ball.x;
    const sy = ball.flight.startY ?? ball.y;
    driverTrailV038 = [{ x: sx, y: sy, t: performance.now() }];
  } else {
    driverTrailArmedV038 = false;
  }
};

const updateFlightBeforeV038 = updateFlight;
updateFlight = function updateFlightV038() {
  const wasTracking = driverTrailActiveV038 && ball && ball.flight && ball.flight.clubKey === 'driver';
  if (wasTracking) driverTrailV038.push({ x: ball.x, y: ball.y, t: performance.now() });

  updateFlightBeforeV038();

  if (typeof driverTrailV037 !== 'undefined') driverTrailV037 = [];
  if (typeof driverTrailUntilV037 !== 'undefined') driverTrailUntilV037 = 0;

  if (wasTracking) {
    driverTrailV038.push({ x: ball.x, y: ball.y, t: performance.now() });
    if (!ball.flight) {
      driverTrailActiveV038 = false;
      driverTrailUntilV038 = performance.now() + 1450;
    }
  }
};

const resetRoundHoleBeforeV038 = resetRoundHoleV035;
resetRoundHoleV035 = function resetRoundHoleV038(index = roundHoleIndexV035) {
  driverTrailArmedV038 = false;
  driverTrailActiveV038 = false;
  driverTrailUntilV038 = 0;
  driverTrailV038 = [];
  if (index !== roundHoleIndexV035) driverTrailDoneHoleV038 = -1;
  resetRoundHoleBeforeV038(index);
};

function drawDriverTrailV038() {
  const now = performance.now();
  if (driverTrailV038.length < 2) return;
  if (!driverTrailActiveV038 && now > driverTrailUntilV038) return;

  const cam = getCamera();
  ctx.save();
  ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.tx, cam.ty);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = 'rgba(255,245,142,0.3)';
  ctx.lineWidth = 5.4;
  ctx.beginPath();
  driverTrailV038.forEach((p, idx) => {
    if (idx === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,221,70,0.86)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  driverTrailV038.forEach((p, idx) => {
    if (idx === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.restore();
}

const drawBeforeV038 = draw;
draw = function drawV038() {
  if (typeof driverTrailV037 !== 'undefined') driverTrailV037 = [];
  drawBeforeV038();
  drawDriverTrailV038();
};

const drawOverlayBeforeBuildV038 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV038() {
  drawOverlayBeforeBuildV038();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const x = canvas.width / 2;
  const y = 17;
  const w = 48;
  const h = 14;
  ctx.fillStyle = 'rgba(4,10,6,0.9)';
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(222,255,210,0.24)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(221,238,210,0.92)';
  ctx.font = '850 8.5px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('v0.38', x, y + 0.5);
  ctx.restore();
};
