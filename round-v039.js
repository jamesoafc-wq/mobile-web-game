// v0.39 top score tracker and hole-out celebration.

let holeResultSplashV039 = null;
let autoAdvanceTimerV039 = null;

const topTrackerV039 = document.createElement('div');
topTrackerV039.className = 'score-track-v039';
topTrackerV039.style.margin = '7px auto 0';
topTrackerV039.style.padding = '7px 8px 8px';
topTrackerV039.style.borderRadius = '13px';
topTrackerV039.style.background = 'rgba(4,12,6,.55)';
topTrackerV039.style.border = '1px solid rgba(222,255,210,.14)';
topTrackerV039.style.boxShadow = '0 8px 20px rgba(0,0,0,.12)';
topTrackerV039.style.maxWidth = '390px';
topTrackerV039.style.width = '100%';
const topPanelV039 = document.querySelector('.top-panel');
if (topPanelV039) topPanelV039.insertAdjacentElement('afterend', topTrackerV039);

function trackerCellColourV039(score, par) {
  if (score == null) return 'rgba(232,246,222,.72)';
  const diff = score - par;
  if (diff < 0) return '#9cf28f';
  if (diff > 0) return '#ffd074';
  return '#eef8d8';
}

function renderTopScoreTrackerV039() {
  const holesDone = roundScoresV035.filter(v => v != null).length;
  const totalScore = roundScoreTextV035(getRoundScoreV035());
  const totalStrokes = roundCompletedStrokesV035();
  topTrackerV039.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:8px;">
      <span style="font:900 11px system-ui;color:#eef8d8;letter-spacing:.02em;">ROUND TRACKER</span>
      <span style="font:900 12px system-ui;color:#eef8d8;">${totalScore} · ${totalStrokes} strokes · ${holesDone}/9</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(9,1fr);gap:3px;"></div>
  `;
  const grid = topTrackerV039.lastElementChild;
  for (let i = 0; i < 9; i++) {
    const par = ROUND_HOLES_V035[i].par;
    const score = roundScoresV035[i];
    const isCurrent = i === roundHoleIndexV035 && !roundCompleteV035;
    const value = score == null ? `P${par}` : roundScoreTextV035(score - par);
    const cell = document.createElement('div');
    cell.style.minHeight = '28px';
    cell.style.borderRadius = '8px';
    cell.style.display = 'flex';
    cell.style.flexDirection = 'column';
    cell.style.alignItems = 'center';
    cell.style.justifyContent = 'center';
    cell.style.border = isCurrent ? '1px solid rgba(238,248,216,.78)' : '1px solid rgba(238,248,216,.12)';
    cell.style.background = isCurrent ? 'rgba(238,248,216,.18)' : 'rgba(255,255,255,.055)';
    cell.innerHTML = `<span style="font:850 9px system-ui;color:rgba(232,246,222,.58);line-height:1;">${i + 1}</span><strong style="font:950 11px system-ui;color:${trackerCellColourV039(score, par)};line-height:1.2;">${value}</strong>`;
    grid.appendChild(cell);
  }
}

const updateHudBeforeV039 = updateHud;
updateHud = function updateHudV039() {
  updateHudBeforeV039();
  renderTopScoreTrackerV039();
};

function resultSplashTextV039(strokesTaken, par) {
  if (strokesTaken === 1) return 'Hole in One!';
  const diff = strokesTaken - par;
  if (diff <= -3) return 'Albatross!';
  if (diff === -2) return 'Eagle!';
  if (diff === -1) return 'Birdie!';
  if (diff === 0) return 'Par!';
  if (diff === 1) return 'Bogey!';
  if (diff === 2) return 'Double Bogey!';
  return `+${diff}`;
}

function startHoleResultSplashV039() {
  const title = resultSplashTextV039(strokes, hole.par);
  holeResultSplashV039 = {
    title,
    subtitle: `Hole ${roundHoleIndexV035 + 1} · ${strokes} on a par ${hole.par}`,
    startedAt: performance.now()
  };
  if (autoAdvanceTimerV039) clearTimeout(autoAdvanceTimerV039);
  autoAdvanceTimerV039 = setTimeout(() => {
    holeResultSplashV039 = null;
    if (ball && ball.holed) goNextHoleV035();
    updateHud();
  }, 3100);
}

const maybeHoleOutBeforeV039 = maybeHoleOut;
maybeHoleOut = function maybeHoleOutV039() {
  const didHole = maybeHoleOutBeforeV039();
  if (didHole && !holeResultSplashV039) startHoleResultSplashV039();
  return didHole;
};

function drawHoleResultSplashV039() {
  if (!holeResultSplashV039) return;
  const elapsed = performance.now() - holeResultSplashV039.startedAt;
  const intro = clamp(elapsed / 420, 0, 1);
  const scale = 0.86 + intro * 0.14;
  const alpha = clamp(elapsed / 320, 0, 1);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(3,9,4,.68)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height * 0.36);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(7,16,8,.9)';
  roundRect(ctx, -158, -58, 316, 116, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(238,248,216,.22)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4ffd7';
  ctx.font = '950 32px system-ui';
  ctx.fillText(holeResultSplashV039.title, 0, -12);
  ctx.fillStyle = 'rgba(232,246,222,.86)';
  ctx.font = '850 13px system-ui';
  ctx.fillText(holeResultSplashV039.subtitle, 0, 28);
  ctx.restore();
}

const drawBeforeV039 = draw;
draw = function drawV039() {
  drawBeforeV039();
  drawHoleResultSplashV039();
};

const resetRoundHoleBeforeV039 = resetRoundHoleV035;
resetRoundHoleV035 = function resetRoundHoleV039(index = roundHoleIndexV035) {
  holeResultSplashV039 = null;
  if (autoAdvanceTimerV039) clearTimeout(autoAdvanceTimerV039);
  autoAdvanceTimerV039 = null;
  resetRoundHoleBeforeV039(index);
  renderTopScoreTrackerV039();
};

const drawOverlayBeforeBuildV039 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV039() {
  drawOverlayBeforeBuildV039();
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
  ctx.fillText('v0.39', x, y + 0.5);
  ctx.restore();
};

renderTopScoreTrackerV039();
updateHud();
