// Tiny visible build marker. Bump this label whenever the playable build changes.
const GAME_BUILD_LABEL = 'v0.32';
const GAME_BUILD_TAG = 'livelier-putting-soft-slope-arrows';

const drawOverlayInfoBeforeVersionBadge = drawOverlayInfo;
drawOverlayInfo = function drawOverlayInfoWithVersionBadge() {
  drawOverlayInfoBeforeVersionBadge();

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const label = GAME_BUILD_LABEL;
  const x = canvas.width / 2;
  const y = 17;
  const w = 44;
  const h = 14;

  ctx.fillStyle = 'rgba(4, 10, 6, 0.72)';
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(222,255,210,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(221,238,210,0.78)';
  ctx.font = '850 8.5px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + 0.5);

  ctx.restore();
};
