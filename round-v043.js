// v0.43 force compact layout: lower club panel and keep one in-canvas score only.

const layoutStyleV043 = document.createElement('style');
layoutStyleV043.textContent = `
  .round-summary-v035,
  .round-tracker-v037,
  .score-track-v039 {
    display: none !important;
    height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }

  .actions {
    display: none !important;
  }

  .club-panel {
    bottom: 12px !important;
    margin-top: 0 !important;
    transform: none !important;
  }

  .club-panel button {
    min-height: 42px !important;
    padding-top: 10px !important;
    padding-bottom: 10px !important;
  }

  @media (max-width: 520px) {
    .club-panel {
      bottom: 8px !important;
    }

    .club-panel button {
      min-height: 39px !important;
      padding-top: 9px !important;
      padding-bottom: 9px !important;
    }
  }
`;
document.head.appendChild(layoutStyleV043);

function hideRoundTrackersV043() {
  ['.round-summary-v035', '.round-tracker-v037', '.score-track-v039'].forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('height', '0', 'important');
      el.style.setProperty('margin', '0', 'important');
      el.style.setProperty('padding', '0', 'important');
      el.style.setProperty('overflow', 'hidden', 'important');
    });
  });
}

if (typeof drawCompactRoundScoreV040 === 'function') {
  drawCompactRoundScoreV040 = function drawCompactRoundScoreSuppressedV043() {};
}

function drawTinyRoundScoreV043() {
  const score = typeof getRoundScoreV035 === 'function' ? getRoundScoreV035() : 0;
  const label = typeof roundScoreTextV035 === 'function' ? roundScoreTextV035(score) : String(score);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = '950 18px system-ui';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(4,10,6,.62)';
  ctx.strokeText(label, canvas.width - 12, 12);
  ctx.fillStyle = score < 0 ? '#9cf28f' : score > 0 ? '#ffd074' : '#eef8d8';
  ctx.fillText(label, canvas.width - 12, 12);
  ctx.restore();
}

function positionBallMenuV043() {
  if (typeof ballMenuWrapV040 === 'undefined') return;
  const canvasRect = canvas.getBoundingClientRect();
  const clubPanel = document.querySelector('.club-panel');
  const clubRect = clubPanel ? clubPanel.getBoundingClientRect() : null;
  const left = Math.max(8, canvasRect.left + 12);
  const top = clubRect ? Math.max(8, clubRect.top - 54) : Math.max(8, canvasRect.bottom - 108);

  ballMenuWrapV040.style.left = `${left}px`;
  ballMenuWrapV040.style.top = `${top}px`;
  ballMenuWrapV040.style.width = '42px';
  ballMenuWrapV040.style.height = '42px';
  ballMenuWrapV040.style.display = 'block';
  ballMenuWrapV040.style.flexDirection = 'initial';
  ballMenuWrapV040.style.gap = '0';

  if (typeof ballToggleV040 !== 'undefined') {
    ballToggleV040.style.position = 'absolute';
    ballToggleV040.style.left = '0';
    ballToggleV040.style.top = '0';
  }

  if (typeof ballMenuPanelV040 !== 'undefined') {
    ballMenuPanelV040.style.position = 'absolute';
    ballMenuPanelV040.style.left = '0';
    ballMenuPanelV040.style.bottom = '50px';
  }
}

if (typeof positionBallMenuV040 === 'function') positionBallMenuV040 = positionBallMenuV043;
if (typeof positionBallMenuV041 === 'function') positionBallMenuV041 = positionBallMenuV043;
if (typeof positionBallMenuV042 === 'function') positionBallMenuV042 = positionBallMenuV043;

const updateHudBeforeV043 = updateHud;
updateHud = function updateHudV043() {
  updateHudBeforeV043();
  hideRoundTrackersV043();
  positionBallMenuV043();
};

const drawBeforeV043 = draw;
draw = function drawV043() {
  hideRoundTrackersV043();
  drawBeforeV043();
  drawTinyRoundScoreV043();
};

window.addEventListener('resize', positionBallMenuV043);
window.addEventListener('scroll', positionBallMenuV043, { passive: true });
setTimeout(() => { hideRoundTrackersV043(); positionBallMenuV043(); }, 0);
setTimeout(() => { hideRoundTrackersV043(); positionBallMenuV043(); }, 250);

const drawOverlayBeforeBuildV043 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV043() {
  drawOverlayBeforeBuildV043();
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
  ctx.fillText('v0.43', x, y + 0.5);
  ctx.restore();
};

updateHud();
