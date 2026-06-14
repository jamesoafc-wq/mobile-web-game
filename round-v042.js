// v0.42 lower club panel and keep ball-menu button fixed when opened.

const layoutStyleV042 = document.createElement('style');
layoutStyleV042.textContent = `
  .club-panel {
    margin-top: 20px !important;
  }

  .club-panel button {
    min-height: 44px !important;
  }
`;
document.head.appendChild(layoutStyleV042);

function positionBallMenuV042() {
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
    ballToggleV040.style.order = '0';
  }

  if (typeof ballMenuPanelV040 !== 'undefined') {
    ballMenuPanelV040.style.position = 'absolute';
    ballMenuPanelV040.style.left = '0';
    ballMenuPanelV040.style.bottom = '50px';
    ballMenuPanelV040.style.order = '0';
  }
}

if (typeof positionBallMenuV040 === 'function') {
  positionBallMenuV040 = positionBallMenuV042;
}
if (typeof positionBallMenuV041 === 'function') {
  positionBallMenuV041 = positionBallMenuV042;
}

const updateHudBeforeV042 = updateHud;
updateHud = function updateHudV042() {
  updateHudBeforeV042();
  positionBallMenuV042();
};

window.addEventListener('resize', positionBallMenuV042);
window.addEventListener('scroll', positionBallMenuV042, { passive: true });
setTimeout(positionBallMenuV042, 0);
setTimeout(positionBallMenuV042, 250);

const drawOverlayBeforeBuildV042 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV042() {
  drawOverlayBeforeBuildV042();
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
  ctx.fillText('v0.42', x, y + 0.5);
  ctx.restore();
};

updateHud();
