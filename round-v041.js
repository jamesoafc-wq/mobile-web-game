// v0.41 club panel spacing and ball-menu placement.

const layoutStyleV041 = document.createElement('style');
layoutStyleV041.textContent = `
  .club-panel {
    margin-top: 12px !important;
    row-gap: 6px !important;
  }

  .club-panel button {
    min-height: 44px !important;
    padding-top: 11px !important;
    padding-bottom: 11px !important;
  }
`;
document.head.appendChild(layoutStyleV041);

function positionBallMenuV041() {
  if (typeof ballMenuWrapV040 === 'undefined') return;
  const canvasRect = canvas.getBoundingClientRect();
  const clubPanel = document.querySelector('.club-panel');
  const clubRect = clubPanel ? clubPanel.getBoundingClientRect() : null;
  const left = Math.max(8, canvasRect.left + 12);
  const top = clubRect ? Math.max(8, clubRect.top - 56) : Math.max(8, canvasRect.bottom - 112);
  ballMenuWrapV040.style.left = `${left}px`;
  ballMenuWrapV040.style.top = `${top}px`;
}

if (typeof positionBallMenuV040 === 'function') {
  positionBallMenuV040 = positionBallMenuV041;
}

const updateHudBeforeV041 = updateHud;
updateHud = function updateHudV041() {
  updateHudBeforeV041();
  positionBallMenuV041();
};

window.addEventListener('resize', positionBallMenuV041);
window.addEventListener('scroll', positionBallMenuV041, { passive: true });
setTimeout(positionBallMenuV041, 0);
setTimeout(positionBallMenuV041, 250);

const drawOverlayBeforeBuildV041 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV041() {
  drawOverlayBeforeBuildV041();
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
  ctx.fillText('v0.41', x, y + 0.5);
  ctx.restore();
};

updateHud();
