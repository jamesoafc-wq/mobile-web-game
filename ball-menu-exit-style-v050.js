// v0.50 style Exit to menu as a red danger action in the ball drop-up.

const exitStyleV050 = document.createElement('style');
exitStyleV050.textContent = `
  .ball-menu-v040 [data-exit-menu-v049="true"] {
    background: linear-gradient(180deg, rgba(255, 110, 110, 0.96), rgba(185, 43, 43, 0.96)) !important;
    border-color: rgba(255, 214, 214, 0.52) !important;
    color: #fff7f7 !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.24), 0 8px 18px rgba(95, 10, 10, .28) !important;
  }

  .ball-menu-v040 [data-exit-menu-v049="true"]:active {
    transform: translateY(1px) !important;
    filter: brightness(.96) !important;
  }
`;
document.head.appendChild(exitStyleV050);

function restyleExitButtonV050() {
  const button = document.querySelector('[data-exit-menu-v049="true"]');
  if (!button) return;
  button.style.fontWeight = '850';
}

restyleExitButtonV050();
setTimeout(restyleExitButtonV050, 0);
setTimeout(restyleExitButtonV050, 250);

const drawOverlayBeforeBuildV050 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV050() {
  drawOverlayBeforeBuildV050();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const x = canvas.width / 2;
  const y = 17;
  ctx.fillStyle = 'rgba(4,10,6,0.9)';
  roundRect(ctx, x - 24, y - 7, 48, 14, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(222,255,210,0.24)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(221,238,210,0.92)';
  ctx.font = '850 8.5px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('v0.50', x, y + 0.5);
  ctx.restore();
};
