// v0.58 wind rework: true in-flight drift, per-hole random wind, in-game score-side indicator.

function windBandV058(mph) {
  if (mph < 3) return 'No Wind';
  if (mph < 10) return 'Medium Wind';
  if (mph < 17) return 'High Wind';
  return 'Storm';
}

function randomWindForHoleV058() {
  const difficulty = activeCourseV045 && activeCourseV045.difficulty ? activeCourseV045.difficulty : 2;
  const noWindChance = clamp(0.22 - difficulty * 0.025, 0.06, 0.2);
  let mph = 0;
  if (Math.random() > noWindChance) {
    const bias = clamp(1.45 - difficulty * 0.17, 0.52, 1.28);
    const top = 5.5 + difficulty * 3.4;
    mph = Math.round(Math.pow(Math.random(), bias) * top + Math.random() * difficulty * 0.8);
    if (Math.random() < difficulty * 0.075) mph += Math.round(4 + Math.random() * 5);
  }
  mph = clamp(mph, 0, 24);
  windStateV057 = {
    angle: Math.random() * Math.PI * 2,
    mph,
    label: windBandV058(mph),
    difficulty
  };
}

randomWindForHoleV058();

const resetRoundHoleBeforeWindV058 = resetRoundHoleV035;
resetRoundHoleV035 = function resetRoundHoleWindV058(index = roundHoleIndexV035) {
  resetRoundHoleBeforeWindV058(index);
  randomWindForHoleV058();
  updateHud();
};

if (typeof applyCourseV045 === 'function') {
  const applyCourseBeforeWindV058 = applyCourseV045;
  applyCourseV045 = function applyCourseWindV058(course) {
    applyCourseBeforeWindV058(course);
    randomWindForHoleV058();
  };
}

const resolveSkillShotBaseV058 = typeof resolveSkillShotBeforeWindV057 === 'function' ? resolveSkillShotBeforeWindV057 : resolveSkillShot;
resolveSkillShot = function resolveSkillShotWindV058() {
  const shotInfo = pendingShot ? { clubKey: pendingShot.clubKey, power: pendingShot.power } : null;
  resolveSkillShotBaseV058();
  if (!shotInfo || !ball || !ball.flight) return;
  if (clubs[shotInfo.clubKey].type === 'putt' || windStateV057.mph <= 0) return;

  const influence = windStateV057.mph * (0.35 + shotInfo.power * 0.7);
  ball.flight.windV058 = {
    baseEndX: ball.flight.endX,
    baseEndY: ball.flight.endY,
    baseCurve: ball.flight.curvePixels || 0,
    driftX: Math.cos(windStateV057.angle) * influence,
    driftY: Math.sin(windStateV057.angle) * influence * 0.72,
    curve: Math.sin(windStateV057.angle) * windStateV057.mph * 1.15
  };
};

const updateFlightBeforeWindV058 = updateFlight;
updateFlight = function updateFlightWindV058() {
  if (ball && ball.flight && ball.flight.windV058) {
    const w = ball.flight.windV058;
    const nextT = clamp((ball.flight.progress + 1) / Math.max(1, ball.flight.duration), 0, 1);
    const ease = nextT * nextT * (3 - 2 * nextT);
    ball.flight.endX = clamp(w.baseEndX + w.driftX * ease, 24, canvas.width - 24);
    ball.flight.endY = clamp(w.baseEndY + w.driftY * ease, 40, canvas.height - 24);
    ball.flight.curvePixels = w.baseCurve + w.curve * ease;
  }
  updateFlightBeforeWindV058();
};

function removeWindMenuCardV058() {
  const card = courseMenuV045 && courseMenuV045.querySelector('[data-wind-panel-v057="true"]');
  if (card) card.remove();
}

const renderCourseMenuBeforeWindV058 = renderCourseMenuV045;
renderCourseMenuV045 = function renderCourseMenuNoWindCardV058() {
  renderCourseMenuBeforeWindV058();
  removeWindMenuCardV058();
};
removeWindMenuCardV058();

function windArrowV058() {
  const dirs = ['→','↘','↓','↙','←','↖','↑','↗'];
  const angle = ((windStateV057.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return dirs[Math.round(angle / (Math.PI * 2) * 8) % 8];
}

const drawOverlayBeforeWindV058 = typeof drawOverlayBeforeWindV057 === 'function' ? drawOverlayBeforeWindV057 : drawOverlayInfo;
drawOverlayInfo = function drawOverlayWindV058() {
  drawOverlayBeforeWindV058();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const panelW = 118;
  const panelH = 43;
  const x = canvas.width - panelW - 12;
  const y = 48;
  const band = windBandV058(windStateV057.mph);
  const arrow = windArrowV058();
  ctx.fillStyle = 'rgba(4,10,6,0.82)';
  roundRect(ctx, x, y, panelW, panelH, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(222,255,210,0.18)';
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#eef8d8';
  ctx.font = '950 13px system-ui';
  ctx.fillText(`${arrow} ${windStateV057.mph} mph`, x + panelW / 2, y + 16);
  ctx.fillStyle = band === 'Storm' ? '#ffb7b7' : band === 'High Wind' ? '#ffd98a' : band === 'Medium Wind' ? '#d9f89a' : 'rgba(232,246,222,.66)';
  ctx.font = '850 9px system-ui';
  ctx.fillText(band, x + panelW / 2, y + 32);

  ctx.fillStyle = 'rgba(4,10,6,0.9)';
  roundRect(ctx, canvas.width / 2 - 24, 10, 48, 14, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(221,238,210,0.92)';
  ctx.font = '850 8.5px system-ui';
  ctx.fillText('v0.58', canvas.width / 2, 17.5);
  ctx.restore();
};
