// v0.44 move compact round score below the top overlay.

if (typeof drawTinyRoundScoreV043 === 'function') {
  drawTinyRoundScoreV043 = function drawTinyRoundScoreSuppressedV044() {};
}

function drawCompactRoundScoreV044() {
  const score = typeof getRoundScoreV035 === 'function' ? getRoundScoreV035() : 0;
  const label = typeof roundScoreTextV035 === 'function' ? roundScoreTextV035(score) : String(score);
  const x = canvas.width - 12;
  const y = 50;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = '950 18px system-ui';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(4,10,6,.62)';
  ctx.strokeText(label, x, y);
  ctx.fillStyle = score < 0 ? '#9cf28f' : score > 0 ? '#ffd074' : '#eef8d8';
  ctx.fillText(label, x, y);
  ctx.restore();
}

const drawBeforeV044 = draw;
draw = function drawV044() {
  drawBeforeV044();
  drawCompactRoundScoreV044();
};

const drawOverlayBeforeBuildV044 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV044() {
  drawOverlayBeforeBuildV044();
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
  ctx.fillText('v0.44', x, y + 0.5);
  ctx.restore();
};
