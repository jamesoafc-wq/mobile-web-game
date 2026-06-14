// v0.40 compact score and ball-menu controls.

function hideRoundClutterV040() {
  ['.round-summary-v035', '.round-tracker-v037', '.score-track-v039'].forEach(selector => {
    document.querySelectorAll(selector).forEach(el => { el.style.display = 'none'; });
  });
  const actions = document.querySelector('.actions');
  if (actions) actions.style.display = 'none';
}

hideRoundClutterV040();

const ballMenuWrapV040 = document.createElement('div');
ballMenuWrapV040.className = 'ball-menu-v040';
ballMenuWrapV040.style.position = 'fixed';
ballMenuWrapV040.style.zIndex = '1000';
ballMenuWrapV040.style.display = 'flex';
ballMenuWrapV040.style.flexDirection = 'column';
ballMenuWrapV040.style.alignItems = 'flex-start';
ballMenuWrapV040.style.gap = '8px';
ballMenuWrapV040.style.pointerEvents = 'auto';

const ballMenuPanelV040 = document.createElement('div');
ballMenuPanelV040.style.display = 'none';
ballMenuPanelV040.style.flexDirection = 'column';
ballMenuPanelV040.style.gap = '6px';
ballMenuPanelV040.style.padding = '8px';
ballMenuPanelV040.style.borderRadius = '14px';
ballMenuPanelV040.style.background = 'rgba(4,10,6,.86)';
ballMenuPanelV040.style.border = '1px solid rgba(222,255,210,.18)';
ballMenuPanelV040.style.boxShadow = '0 12px 30px rgba(0,0,0,.28)';
ballMenuPanelV040.style.order = '0';

function makeBallMenuButtonV040(label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = label;
  btn.style.border = '0';
  btn.style.borderRadius = '10px';
  btn.style.padding = '8px 12px';
  btn.style.minWidth = '112px';
  btn.style.background = 'rgba(238,248,216,.12)';
  btn.style.color = '#eef8d8';
  btn.style.font = '850 12px system-ui';
  btn.style.textAlign = 'left';
  return btn;
}

const resetBallV040 = makeBallMenuButtonV040('Reset ball');
const restartHoleV040 = makeBallMenuButtonV040('Restart hole');
ballMenuPanelV040.append(resetBallV040, restartHoleV040);

const ballToggleV040 = document.createElement('button');
ballToggleV040.type = 'button';
ballToggleV040.setAttribute('aria-label', 'Open ball menu');
ballToggleV040.style.width = '42px';
ballToggleV040.style.height = '42px';
ballToggleV040.style.borderRadius = '999px';
ballToggleV040.style.border = '1px solid rgba(8,20,8,.28)';
ballToggleV040.style.background = 'radial-gradient(circle at 32% 28%, #fff 0 18%, #e9eee4 30%, #ccd7c6 100%)';
ballToggleV040.style.boxShadow = '0 8px 20px rgba(0,0,0,.24), inset -4px -5px 9px rgba(0,0,0,.14)';
ballToggleV040.style.position = 'relative';
ballToggleV040.style.order = '1';
ballToggleV040.innerHTML = '<span style="position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(80,92,76,.42);left:15px;top:15px;"></span><span style="position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(80,92,76,.36);left:24px;top:18px;"></span><span style="position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(80,92,76,.32);left:18px;top:25px;"></span>';

ballMenuWrapV040.append(ballMenuPanelV040, ballToggleV040);
document.body.appendChild(ballMenuWrapV040);

function positionBallMenuV040() {
  const rect = canvas.getBoundingClientRect();
  ballMenuWrapV040.style.left = `${Math.max(8, rect.left + 12)}px`;
  ballMenuWrapV040.style.top = `${Math.max(8, rect.bottom - 54)}px`;
}

let ballMenuOpenV040 = false;
function setBallMenuOpenV040(open) {
  ballMenuOpenV040 = open;
  ballMenuPanelV040.style.display = open ? 'flex' : 'none';
}

ballToggleV040.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  setBallMenuOpenV040(!ballMenuOpenV040);
});

resetBallV040.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  setBallMenuOpenV040(false);
  resetShotButton.click();
});

restartHoleV040.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  setBallMenuOpenV040(false);
  if (typeof resetRoundHoleV035 === 'function') resetRoundHoleV035(roundHoleIndexV035);
  else resetHole();
});

document.addEventListener('click', () => setBallMenuOpenV040(false));
window.addEventListener('resize', positionBallMenuV040);
window.addEventListener('scroll', positionBallMenuV040, { passive: true });
positionBallMenuV040();

const updateHudBeforeV040 = updateHud;
updateHud = function updateHudV040() {
  updateHudBeforeV040();
  hideRoundClutterV040();
  positionBallMenuV040();
};

function drawCompactRoundScoreV040() {
  const score = typeof getRoundScoreV035 === 'function' ? getRoundScoreV035() : 0;
  const label = typeof roundScoreTextV035 === 'function' ? roundScoreTextV035(score) : String(score);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = '950 18px system-ui';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(4,10,6,.58)';
  ctx.strokeText(label, canvas.width - 12, 12);
  ctx.fillStyle = score < 0 ? '#9cf28f' : score > 0 ? '#ffd074' : '#eef8d8';
  ctx.fillText(label, canvas.width - 12, 12);
  ctx.restore();
}

const drawBeforeV040 = draw;
draw = function drawV040() {
  drawBeforeV040();
  drawCompactRoundScoreV040();
};

const drawOverlayBeforeBuildV040 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV040() {
  drawOverlayBeforeBuildV040();
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
  ctx.fillText('v0.40', x, y + 0.5);
  ctx.restore();
};

updateHud();
