// v0.54 tighter putting zoom and course-themed canvas overscan fill.

const PUTTING_ZOOM_V054 = 1.9;

if (typeof originalPuttingCameraV053 === 'function') {
  originalPuttingCameraV053 = function originalPuttingCameraV054() {
    const targetX = lerp(ball.x, hole.cup.x, 0.3);
    const targetY = lerp(ball.y, hole.cup.y, 0.35);
    const zoom = PUTTING_ZOOM_V054;
    return {
      zoom,
      tx: canvas.width / 2 - targetX * zoom,
      ty: canvas.height * 0.56 - targetY * zoom
    };
  };
}

function roughBackgroundColorV054() {
  if (typeof themeForHoleV046 === 'function' && hole) {
    return themeForHoleV046(hole).rough;
  }
  return '#2b6635';
}

function fillCanvasOverscanV054() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = roughBackgroundColorV054();
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let y = 0; y < canvas.height; y += 13) {
    for (let x = (y % 26 ? 7 : 0); x < canvas.width; x += 20) {
      ctx.fillRect(x, y, 9, 2);
    }
  }
  ctx.restore();
}

const drawBeforeV054 = draw;
draw = function drawPuttingZoomBgV054() {
  const clearBeforeV054 = ctx.clearRect;
  ctx.clearRect = function clearAndFillCourseRoughV054(x, y, w, h) {
    clearBeforeV054.call(ctx, x, y, w, h);
    fillCanvasOverscanV054();
  };
  try {
    drawBeforeV054();
  } finally {
    ctx.clearRect = clearBeforeV054;
  }
};

const drawOverlayBeforeBuildV054 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV054() {
  drawOverlayBeforeBuildV054();
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
  ctx.fillText('v0.54', x, y + 0.5);
  ctx.restore();
};
