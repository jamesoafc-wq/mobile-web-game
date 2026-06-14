// v0.60 unified in-game UI bar and matching club controls. Does not resize or move the canvas/game tile.

const topBarV060 = document.createElement('div');
topBarV060.className = 'game-topbar-v060';
topBarV060.style.cssText = [
  'position:fixed',
  'z-index:995',
  'height:44px',
  'display:grid',
  'grid-template-columns:1.25fr .82fr 1fr 1.05fr',
  'align-items:center',
  'gap:0',
  'overflow:hidden',
  'pointer-events:none',
  'font-family:system-ui,-apple-system,Segoe UI,sans-serif',
  'color:#eef8d8',
  'background:linear-gradient(180deg,rgba(7,18,9,.94),rgba(3,9,5,.88))',
  'border:1px solid rgba(238,248,216,.18)',
  'box-shadow:0 13px 30px rgba(0,0,0,.30),inset 0 1px 0 rgba(255,255,255,.08)',
  'backdrop-filter:blur(12px)',
  '-webkit-backdrop-filter:blur(12px)'
].join(';');

document.body.appendChild(topBarV060);

function makeTopCellV060(key, title) {
  const cell = document.createElement('div');
  cell.dataset.key = key;
  cell.style.cssText = 'min-width:0;height:100%;padding:6px 9px;display:flex;flex-direction:column;justify-content:center;border-left:1px solid rgba(238,248,216,.10);';
  const small = document.createElement('div');
  small.className = 'game-topbar-label-v060';
  small.textContent = title;
  small.style.cssText = 'font:850 8px/1 system-ui;letter-spacing:.08em;text-transform:uppercase;color:rgba(232,246,222,.56);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  const main = document.createElement('div');
  main.className = 'game-topbar-main-v060';
  main.style.cssText = 'font:950 12px/1.18 system-ui;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px;';
  const sub = document.createElement('div');
  sub.className = 'game-topbar-sub-v060';
  sub.style.cssText = 'display:none;font:800 8px/1 system-ui;margin-top:2px;color:rgba(232,246,222,.58);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  cell.append(small, main, sub);
  topBarV060.appendChild(cell);
  return { cell, small, main, sub };
}

const holeCellV060 = makeTopCellV060('hole', 'Hole');
const scoreCellV060 = makeTopCellV060('score', 'Score');
const windCellV060 = makeTopCellV060('wind', 'Wind');
const lieCellV060 = makeTopCellV060('lie', 'Next shot');
holeCellV060.cell.style.borderLeft = '0';

function windBandUiV060(mph) {
  if (typeof windBandV058 === 'function') return windBandV058(mph);
  if (mph < 3) return 'No Wind';
  if (mph < 10) return 'Medium Wind';
  if (mph < 17) return 'High Wind';
  return 'Storm';
}

function windArrowUiV060() {
  if (typeof windArrowV058 === 'function') return windArrowV058();
  if (typeof windArrowV057 === 'function') return windArrowV057();
  return '→';
}

function topBarMenuOpenV060() {
  return typeof courseMenuV045 !== 'undefined' && getComputedStyle(courseMenuV045).display !== 'none';
}

function updateUnifiedTopBarV060() {
  if (typeof crispHudV059 !== 'undefined') crispHudV059.style.display = 'none';
  topBarV060.style.display = topBarMenuOpenV060() ? 'none' : 'grid';
  if (topBarMenuOpenV060()) return;

  const totalHoles = typeof ROUND_HOLES_V035 !== 'undefined' ? ROUND_HOLES_V035.length : 9;
  const holeNo = typeof roundHoleIndexV035 === 'number' ? roundHoleIndexV035 + 1 : 1;
  holeCellV060.main.textContent = `H${holeNo}/${totalHoles} · Par ${hole && hole.par ? hole.par : 4}`;

  const score = typeof getRoundScoreV035 === 'function' ? getRoundScoreV035() : 0;
  const label = typeof roundScoreTextV035 === 'function' ? roundScoreTextV035(score) : String(score);
  scoreCellV060.main.textContent = label;
  scoreCellV060.main.style.color = score < 0 ? '#9cf28f' : score > 0 ? '#ffd074' : '#eef8d8';

  const mph = typeof windStateV057 !== 'undefined' ? windStateV057.mph : 0;
  const band = windBandUiV060(mph);
  windCellV060.main.textContent = `${windArrowUiV060()} ${mph} mph`;
  windCellV060.sub.style.display = 'block';
  windCellV060.sub.textContent = band;
  windCellV060.sub.style.color = band === 'Storm' ? '#ffb7b7' : band === 'High Wind' ? '#ffd98a' : band === 'Medium Wind' ? '#d9f89a' : 'rgba(232,246,222,.62)';

  const lie = typeof getLie === 'function' ? getLie() : 'tee';
  const clubShort = typeof clubs !== 'undefined' && clubs[selectedClub] ? clubs[selectedClub].short : selectedClub;
  lieCellV060.main.textContent = `${clubShort} · ${surfaceLabels && surfaceLabels[lie] ? surfaceLabels[lie] : lie}`;
}

function positionUnifiedTopBarV060() {
  const rect = canvas.getBoundingClientRect();
  const inset = 7;
  topBarV060.style.left = `${rect.left + inset}px`;
  topBarV060.style.top = `${rect.top + inset}px`;
  topBarV060.style.width = `${Math.max(0, rect.width - inset * 2)}px`;
  updateUnifiedTopBarV060();
}

function tidyClubPanelV060() {
  const panel = document.querySelector('.club-panel');
  if (!panel) return;
  panel.style.background = 'linear-gradient(180deg,rgba(7,18,9,.94),rgba(3,9,5,.90))';
  panel.style.border = '1px solid rgba(238,248,216,.18)';
  panel.style.borderRadius = '8px';
  panel.style.boxShadow = '0 13px 30px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.08)';
  panel.style.backdropFilter = 'blur(10px)';
  panel.style.webkitBackdropFilter = 'blur(10px)';
  panel.style.padding = '5px';
  panel.style.gap = '4px';

  panel.querySelectorAll('button').forEach(btn => {
    const selected = btn.classList.contains('selected');
    btn.style.borderRadius = '5px';
    btn.style.minHeight = '32px';
    btn.style.font = '900 10px system-ui';
    btn.style.letterSpacing = '.02em';
    btn.style.textTransform = 'uppercase';
    btn.style.border = selected ? '1px solid rgba(230,255,179,.88)' : '1px solid rgba(238,248,216,.11)';
    btn.style.background = selected ? 'linear-gradient(180deg,#d9f89a,#8bdc60)' : 'linear-gradient(180deg,rgba(238,248,216,.11),rgba(238,248,216,.04))';
    btn.style.color = selected ? '#071007' : 'rgba(236,246,228,.84)';
    btn.style.boxShadow = selected ? '0 0 0 1px rgba(5,15,5,.24), inset 0 1px 0 rgba(255,255,255,.36)' : 'inset 0 1px 0 rgba(255,255,255,.06)';
  });
}

function polishBallMenuV060() {
  if (typeof ballMenuPanelV040 === 'undefined' || typeof ballToggleV040 === 'undefined') return;
  ballMenuPanelV040.style.borderRadius = '8px';
  ballMenuPanelV040.style.background = 'linear-gradient(180deg,rgba(7,18,9,.96),rgba(3,9,5,.92))';
  ballMenuPanelV040.style.border = '1px solid rgba(238,248,216,.18)';
  ballMenuPanelV040.style.boxShadow = '0 14px 34px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.08)';
  ballMenuPanelV040.style.padding = '8px';

  ballMenuPanelV040.querySelectorAll('button').forEach(btn => {
    const danger = btn.dataset.exitMenuV049 === 'true';
    btn.style.borderRadius = '5px';
    btn.style.font = '900 11px system-ui';
    btn.style.minWidth = '126px';
    btn.style.padding = '9px 12px';
    btn.style.border = danger ? '1px solid rgba(255,214,214,.46)' : '1px solid rgba(238,248,216,.13)';
    btn.style.background = danger ? 'linear-gradient(180deg,rgba(248,91,91,.96),rgba(171,36,36,.96))' : 'linear-gradient(180deg,rgba(238,248,216,.12),rgba(238,248,216,.05))';
    btn.style.color = danger ? '#fff7f7' : '#eef8d8';
  });
}

if (typeof drawOverlayInfo === 'function') {
  drawOverlayInfo = function drawOverlayInfoV060() {
    // Keep top gameplay UI in crisp DOM only. Putting read arrows still render from drawSlopeRead.
  };
}

const drawBeforeUnifiedUiV060 = typeof drawBeforeCrispUiV059 === 'function' ? drawBeforeCrispUiV059 : draw;
draw = function drawUnifiedUiV060() {
  drawBeforeUnifiedUiV060();
  updateUnifiedTopBarV060();
};

const updateHudBeforeUnifiedUiV060 = updateHud;
updateHud = function updateHudUnifiedUiV060() {
  updateHudBeforeUnifiedUiV060();
  positionUnifiedTopBarV060();
  tidyClubPanelV060();
  polishBallMenuV060();
};

const updateClubButtonsBeforeUnifiedUiV060 = updateClubButtons;
updateClubButtons = function updateClubButtonsUnifiedUiV060() {
  updateClubButtonsBeforeUnifiedUiV060();
  tidyClubPanelV060();
  updateUnifiedTopBarV060();
};

const renderCourseMenuBeforeUnifiedUiV060 = renderCourseMenuV045;
renderCourseMenuV045 = function renderCourseMenuUnifiedUiV060() {
  renderCourseMenuBeforeUnifiedUiV060();
  updateUnifiedTopBarV060();
};

window.addEventListener('resize', positionUnifiedTopBarV060);
window.addEventListener('scroll', positionUnifiedTopBarV060, { passive: true });
setTimeout(() => { positionUnifiedTopBarV060(); tidyClubPanelV060(); polishBallMenuV060(); }, 0);
setTimeout(() => { positionUnifiedTopBarV060(); tidyClubPanelV060(); polishBallMenuV060(); }, 300);
