// v0.59 crisp in-game DOM HUD and menu polish.

const crispHudV059 = document.createElement('div');
crispHudV059.className = 'crisp-hud-v059';
crispHudV059.style.cssText = [
  'position:fixed',
  'z-index:980',
  'display:flex',
  'flex-direction:column',
  'align-items:flex-end',
  'gap:6px',
  'pointer-events:none',
  'font-family:system-ui,-apple-system,Segoe UI,sans-serif'
].join(';');

document.body.appendChild(crispHudV059);

const scoreCardV059 = document.createElement('div');
scoreCardV059.style.cssText = [
  'min-width:76px',
  'border:1px solid rgba(238,248,216,.20)',
  'border-radius:18px',
  'padding:7px 10px',
  'background:linear-gradient(180deg,rgba(12,24,12,.92),rgba(4,10,6,.86))',
  'box-shadow:0 14px 34px rgba(0,0,0,.26),inset 0 1px 0 rgba(255,255,255,.08)',
  'color:#eef8d8',
  'text-align:right',
  'backdrop-filter:blur(12px)',
  '-webkit-backdrop-filter:blur(12px)'
].join(';');

const scoreLabelV059 = document.createElement('div');
scoreLabelV059.textContent = 'Round';
scoreLabelV059.style.cssText = 'font:850 9px system-ui;text-transform:uppercase;letter-spacing:.08em;color:rgba(232,246,222,.62);line-height:1;';
const scoreValueV059 = document.createElement('div');
scoreValueV059.style.cssText = 'font:950 22px/1.05 system-ui;letter-spacing:-.03em;margin-top:2px;';
scoreCardV059.append(scoreLabelV059, scoreValueV059);

const windCardV059 = document.createElement('div');
windCardV059.style.cssText = [
  'min-width:118px',
  'border:1px solid rgba(238,248,216,.17)',
  'border-radius:16px',
  'padding:7px 10px 8px',
  'background:linear-gradient(180deg,rgba(12,24,12,.84),rgba(4,10,6,.78))',
  'box-shadow:0 12px 28px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.07)',
  'color:#eef8d8',
  'text-align:right',
  'backdrop-filter:blur(12px)',
  '-webkit-backdrop-filter:blur(12px)'
].join(';');

const windMainV059 = document.createElement('div');
windMainV059.style.cssText = 'font:950 13px/1 system-ui;';
const windBandDomV059 = document.createElement('div');
windBandDomV059.style.cssText = 'font:850 9px/1 system-ui;margin-top:5px;letter-spacing:.05em;text-transform:uppercase;';
windCardV059.append(windMainV059, windBandDomV059);
crispHudV059.append(scoreCardV059, windCardV059);

function windBandLocalV059(mph) {
  if (typeof windBandV058 === 'function') return windBandV058(mph);
  if (mph < 3) return 'No Wind';
  if (mph < 10) return 'Medium Wind';
  if (mph < 17) return 'High Wind';
  return 'Storm';
}

function windArrowLocalV059() {
  if (typeof windArrowV058 === 'function') return windArrowV058();
  if (typeof windArrowV057 === 'function') return windArrowV057();
  return '→';
}

function updateCrispHudV059() {
  const score = typeof getRoundScoreV035 === 'function' ? getRoundScoreV035() : 0;
  const label = typeof roundScoreTextV035 === 'function' ? roundScoreTextV035(score) : String(score);
  scoreValueV059.textContent = label;
  scoreValueV059.style.color = score < 0 ? '#9cf28f' : score > 0 ? '#ffd074' : '#eef8d8';

  const mph = typeof windStateV057 !== 'undefined' ? windStateV057.mph : 0;
  const band = windBandLocalV059(mph);
  windMainV059.textContent = `${windArrowLocalV059()} ${mph} mph`;
  windBandDomV059.textContent = band;
  windBandDomV059.style.color = band === 'Storm' ? '#ffb7b7' : band === 'High Wind' ? '#ffd98a' : band === 'Medium Wind' ? '#d9f89a' : 'rgba(232,246,222,.66)';

  const menuOpen = typeof courseMenuV045 !== 'undefined' && getComputedStyle(courseMenuV045).display !== 'none';
  crispHudV059.style.display = menuOpen ? 'none' : 'flex';
}

function positionCrispHudV059() {
  const rect = canvas.getBoundingClientRect();
  crispHudV059.style.right = `${Math.max(10, window.innerWidth - rect.right + 12)}px`;
  crispHudV059.style.top = `${Math.max(10, rect.top + 12)}px`;
  updateCrispHudV059();
}

if (typeof drawCompactRoundScoreV040 === 'function') drawCompactRoundScoreV040 = function() {};
if (typeof drawCompactRoundScoreV044 === 'function') drawCompactRoundScoreV044 = function() {};

const drawBeforeCrispUiV059 = draw;
draw = function drawCrispUiV059() {
  drawBeforeCrispUiV059();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Remove the old canvas-drawn score/wind cards so the DOM cards are the only visible top UI.
  ctx.clearRect(canvas.width - 150, 44, 150, 68);
  ctx.restore();
  updateCrispHudV059();
};

function polishBallMenuV059() {
  if (typeof ballMenuPanelV040 === 'undefined' || typeof ballToggleV040 === 'undefined') return;
  ballMenuPanelV040.style.padding = '10px';
  ballMenuPanelV040.style.gap = '8px';
  ballMenuPanelV040.style.borderRadius = '18px';
  ballMenuPanelV040.style.background = 'linear-gradient(180deg,rgba(12,24,12,.94),rgba(4,10,6,.9))';
  ballMenuPanelV040.style.border = '1px solid rgba(238,248,216,.18)';
  ballMenuPanelV040.style.boxShadow = '0 18px 42px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.08)';
  ballMenuPanelV040.style.backdropFilter = 'blur(12px)';
  ballMenuPanelV040.style.webkitBackdropFilter = 'blur(12px)';

  ballMenuPanelV040.querySelectorAll('button').forEach(btn => {
    const danger = btn.dataset.exitMenuV049 === 'true';
    btn.style.border = danger ? '1px solid rgba(255,214,214,.52)' : '1px solid rgba(238,248,216,.16)';
    btn.style.borderRadius = '13px';
    btn.style.padding = '9px 12px';
    btn.style.minWidth = '126px';
    btn.style.font = '900 12px system-ui';
    btn.style.letterSpacing = '.01em';
    btn.style.textAlign = 'left';
    btn.style.color = danger ? '#fff7f7' : '#eef8d8';
    btn.style.background = danger ? 'linear-gradient(180deg,rgba(255,110,110,.96),rgba(185,43,43,.96))' : 'linear-gradient(180deg,rgba(238,248,216,.16),rgba(238,248,216,.08))';
    btn.style.boxShadow = danger ? 'inset 0 1px 0 rgba(255,255,255,.24),0 8px 18px rgba(95,10,10,.28)' : 'inset 0 1px 0 rgba(255,255,255,.10),0 8px 18px rgba(0,0,0,.18)';
  });

  ballToggleV040.style.width = '46px';
  ballToggleV040.style.height = '46px';
  ballToggleV040.style.border = '1px solid rgba(255,255,255,.38)';
  ballToggleV040.style.boxShadow = '0 12px 26px rgba(0,0,0,.30), inset -4px -5px 9px rgba(0,0,0,.16), inset 3px 3px 8px rgba(255,255,255,.85)';
}

const updateHudBeforeCrispUiV059 = updateHud;
updateHud = function updateHudCrispUiV059() {
  updateHudBeforeCrispUiV059();
  positionCrispHudV059();
  polishBallMenuV059();
};

const renderCourseMenuBeforeCrispUiV059 = renderCourseMenuV045;
renderCourseMenuV045 = function renderCourseMenuCrispUiV059() {
  renderCourseMenuBeforeCrispUiV059();
  updateCrispHudV059();
};

window.addEventListener('resize', positionCrispHudV059);
window.addEventListener('scroll', positionCrispHudV059, { passive: true });
setTimeout(() => { positionCrispHudV059(); polishBallMenuV059(); }, 0);
setTimeout(() => { positionCrispHudV059(); polishBallMenuV059(); }, 300);

const drawOverlayBeforeBuildV059 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayBuildV059() {
  drawOverlayBeforeBuildV059();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(4,10,6,0.9)';
  roundRect(ctx, canvas.width / 2 - 24, 10, 48, 14, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(221,238,210,0.92)';
  ctx.font = '850 8.5px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('v0.59', canvas.width / 2, 17.5);
  ctx.restore();
};
