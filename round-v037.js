// v0.37 final round polish: cup visibility, live tracker and driver flight trail.

ROUND_HOLES_V035.forEach(h => { if (!h.cup.r) h.cup.r = ROUND_BASE_HOLE_V035.cup.r || 4.2; });
if (hole && hole.cup && !hole.cup.r) hole.cup.r = ROUND_BASE_HOLE_V035.cup.r || 4.2;

const roundTrackerV037 = document.createElement('div');
roundTrackerV037.className = 'round-tracker-v037';
roundTrackerV037.style.display = 'grid';
roundTrackerV037.style.gridTemplateColumns = 'repeat(9, 1fr)';
roundTrackerV037.style.gap = '3px';
roundTrackerV037.style.margin = '7px 0 0';
roundTrackerV037.style.maxWidth = '330px';
document.querySelector('.top-panel > div:first-child').appendChild(roundTrackerV037);

function renderRoundTrackerV037() {
  roundTrackerV037.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    const score = roundScoresV035[i];
    const par = ROUND_HOLES_V035[i].par;
    const isCurrent = i === roundHoleIndexV035 && !roundCompleteV035;
    const text = score == null ? `${i + 1}` : roundScoreTextV035(score - par);
    cell.textContent = text;
    cell.title = `Hole ${i + 1} · Par ${par}${score == null ? '' : ` · ${score} strokes`}`;
    cell.style.height = '18px';
    cell.style.borderRadius = '6px';
    cell.style.display = 'flex';
    cell.style.alignItems = 'center';
    cell.style.justifyContent = 'center';
    cell.style.font = '850 10px system-ui';
    cell.style.border = isCurrent ? '1px solid rgba(238,248,216,.72)' : '1px solid rgba(238,248,216,.12)';
    cell.style.background = isCurrent ? 'rgba(238,248,216,.16)' : 'rgba(255,255,255,.055)';
    cell.style.color = score == null ? 'rgba(232,246,222,.72)' : score - par < 0 ? '#9cf28f' : score - par > 0 ? '#ffd074' : '#eef8d8';
    roundTrackerV037.appendChild(cell);
  }
}

const updateHudBeforeV037 = updateHud;
updateHud = function updateHudV037() {
  updateHudBeforeV037();
  if (hole && hole.cup && !hole.cup.r) hole.cup.r = ROUND_BASE_HOLE_V035.cup.r || 4.2;
  if (scoreCardLabelV035) scoreCardLabelV035.textContent = 'Round score';
  strokesEl.textContent = roundScoreTextV035(getRoundScoreV035());
  renderRoundTrackerV037();
};

let driverTrailV037 = [];
let driverTrailUntilV037 = 0;
let driverTrailHoleV037 = -1;

const resetRoundHoleBeforeV037 = resetRoundHoleV035;
resetRoundHoleV035 = function resetRoundHoleWithTrailV037(index = roundHoleIndexV035) {
  driverTrailV037 = [];
  driverTrailUntilV037 = 0;
  driverTrailHoleV037 = index;
  resetRoundHoleBeforeV037(index);
  if (hole && hole.cup && !hole.cup.r) hole.cup.r = ROUND_BASE_HOLE_V035.cup.r || 4.2;
};

const updateFlightBeforeV037 = updateFlight;
updateFlight = function updateFlightWithDriverTrailV037() {
  const tracking = ball && ball.flight && ball.flight.clubKey === 'driver' && strokes === 1;
  if (tracking) {
    if (driverTrailHoleV037 !== roundHoleIndexV035) {
      driverTrailV037 = [];
      driverTrailHoleV037 = roundHoleIndexV035;
    }
    driverTrailV037.push({ x: ball.x, y: ball.y, t: performance.now() });
    if (driverTrailV037.length > 80) driverTrailV037.shift();
  }

  updateFlightBeforeV037();

  if (tracking) {
    driverTrailV037.push({ x: ball.x, y: ball.y, t: performance.now() });
    if (!ball.flight) driverTrailUntilV037 = performance.now() + 1250;
  }
};

function drawDriverTrailV037() {
  const now = performance.now();
  if (driverTrailV037.length < 2) return;
  if (!ball.flight && now > driverTrailUntilV037) return;
  const cam = getCamera();
  ctx.save();
  ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.tx, cam.ty);
  ctx.strokeStyle = 'rgba(255,221,70,0.82)';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  driverTrailV037.forEach((p, idx) => {
    if (idx === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,245,142,0.28)';
  ctx.lineWidth = 5.2;
  ctx.stroke();
  ctx.restore();
}

const drawBeforeV037 = draw;
draw = function drawV037() {
  drawBeforeV037();
  drawDriverTrailV037();
};

const drawOverlayBeforeBuildV037 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV037() {
  drawOverlayBeforeBuildV037();
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
  ctx.fillText('v0.37', x, y + 0.5);
  ctx.restore();
};

if (roundHoleIndexV035 === 2 || roundHoleIndexV035 === 5) resetRoundHoleV035(roundHoleIndexV035);
updateHud();
