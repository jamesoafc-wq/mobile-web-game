// v0.57 wind system: per-hole wind, shot drift and difficulty flavour.

let windStateV057 = { angle: 0, mph: 0, label: 'Calm', difficulty: 1 };

function courseWindDifficultyV057() {
  const d = activeCourseV045 && activeCourseV045.difficulty ? activeCourseV045.difficulty : 2;
  return clamp(0.75 + d * 0.14, 0.85, 1.45);
}

function windLabelV057(mph) {
  if (mph < 4) return 'Calm';
  if (mph < 8) return 'Breeze';
  if (mph < 13) return 'Windy';
  return 'Gusty';
}

function generateWindV057() {
  const difficulty = courseWindDifficultyV057();
  const holeSeed = (roundHoleIndexV035 + 1) * 1.73 + (activeCourseIdV045 || 'willow').length * 0.41;
  const base = Math.abs(Math.sin(holeSeed) * 11.5 + Math.cos(holeSeed * 0.7) * 4.5);
  const mph = Math.round(clamp(base * difficulty, 1, 17));
  const angle = (holeSeed * 2.37) % (Math.PI * 2);
  windStateV057 = { angle, mph, label: windLabelV057(mph), difficulty };
}

generateWindV057();

const resetRoundHoleBeforeWindV057 = resetRoundHoleV035;
resetRoundHoleV035 = function resetRoundHoleWindV057(index = roundHoleIndexV035) {
  resetRoundHoleBeforeWindV057(index);
  generateWindV057();
  updateHud();
};

const applyCourseBeforeWindV057 = typeof applyCourseV045 === 'function' ? applyCourseV045 : null;
if (applyCourseBeforeWindV057) {
  applyCourseV045 = function applyCourseWindV057(course) {
    applyCourseBeforeWindV057(course);
    generateWindV057();
  };
}

const resolveSkillShotBeforeWindV057 = resolveSkillShot;
resolveSkillShot = function resolveSkillShotWindV057() {
  const shotInfo = pendingShot ? { clubKey: pendingShot.clubKey, lie: pendingShot.lie, power: pendingShot.power } : null;
  resolveSkillShotBeforeWindV057();
  if (!shotInfo || !ball || !ball.flight) return;
  if (clubs[shotInfo.clubKey].type === 'putt') return;
  const influence = windStateV057.mph * (0.45 + shotInfo.power * 0.65);
  const dx = Math.cos(windStateV057.angle) * influence;
  const dy = Math.sin(windStateV057.angle) * influence * 0.72;
  ball.flight.endX = clamp(ball.flight.endX + dx, 24, canvas.width - 24);
  ball.flight.endY = clamp(ball.flight.endY + dy, 40, canvas.height - 24);
  ball.flight.curvePixels = (ball.flight.curvePixels || 0) + Math.sin(windStateV057.angle) * windStateV057.mph * 1.4;
};

function windArrowV057() {
  const dirs = ['→','↘','↓','↙','←','↖','↑','↗'];
  const idx = Math.round((((windStateV057.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * 8) % 8;
  return dirs[idx];
}

function windPanelV057() {
  const box = document.createElement('div');
  box.dataset.windPanelV057 = 'true';
  box.style.cssText = 'margin:0 0 12px;padding:12px;border:1px solid rgba(238,248,216,.16);border-radius:18px;background:rgba(255,255,255,.05);color:#eef8d8;';
  box.innerHTML = `<div style="font:950 15px system-ui;">Weather & wind</div><div style="font:800 12px system-ui;color:rgba(232,246,222,.78);margin-top:5px;">Current course difficulty affects wind strength.</div><div style="font:900 13px system-ui;color:#d9f89a;margin-top:7px;">${windStateV057.label} · ${windStateV057.mph} mph ${windArrowV057()}</div>`;
  return box;
}

function injectWindPanelV057() {
  const shell = courseMenuV045 && courseMenuV045.firstElementChild;
  if (!shell || shell.querySelector('[data-wind-panel-v057="true"]')) return;
  const custom = shell.querySelector('[data-custom-panel-v057="true"]');
  const panel = windPanelV057();
  if (custom && custom.nextSibling) shell.insertBefore(panel, custom.nextSibling);
  else shell.insertBefore(panel, shell.children[1] || null);
}

const renderCourseMenuBeforeWindV057 = renderCourseMenuV045;
renderCourseMenuV045 = function renderCourseMenuWindV057() {
  renderCourseMenuBeforeWindV057();
  injectWindPanelV057();
};
renderCourseMenuV045();

const drawOverlayBeforeWindV057 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWindV057() {
  drawOverlayBeforeWindV057();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const text = `${windArrowV057()} ${windStateV057.mph} mph`;
  ctx.font = '850 10px system-ui';
  const w = Math.max(64, ctx.measureText(text).width + 20);
  const x = 12;
  const y = 14;
  ctx.fillStyle = 'rgba(4,10,6,0.78)';
  roundRect(ctx, x, y, w, 24, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(222,255,210,0.18)';
  ctx.stroke();
  ctx.fillStyle = '#eef8d8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + 12);
  ctx.restore();
};
