// v0.52 shot-to-shot camera framing: show the relevant section of the hole after each shot.

function sectionCameraTargetV052() {
  if (!ball || !hole) return { zoom: 1, tx: 0, ty: 0 };

  if (typeof isPuttingView === 'function' && isPuttingView()) {
    const targetX = lerp(ball.x, hole.cup.x, 0.3);
    const targetY = lerp(ball.y, hole.cup.y, 0.35);
    const zoom = 1.68;
    return {
      zoom,
      tx: canvas.width / 2 - targetX * zoom,
      ty: canvas.height * 0.56 - targetY * zoom
    };
  }

  // Tee and reset positions still get the fuller hole view.
  if (strokes <= 0 && !ball.moving && !ball.flight) {
    return { zoom: 1, tx: 0, ty: 0 };
  }

  const distanceToCup = dist(ball.x, ball.y, hole.cup.x, hole.cup.y);
  const progressUpCourse = clamp((650 - ball.y) / 520, 0, 1);
  const zoom = distanceToCup < 150 ? 1.46 : lerp(1.18, 1.34, progressUpCourse);

  // Look slightly ahead toward the hole, so a ball halfway up the course shows mostly that half
  // plus enough surrounding context to plan the next shot.
  const lookAhead = distanceToCup < 140 ? 0.36 : 0.28;
  const targetX = lerp(ball.x, hole.cup.x, lookAhead);
  const targetY = lerp(ball.y, hole.cup.y, lookAhead);

  const minTx = canvas.width - canvas.width * zoom;
  const minTy = canvas.height - canvas.height * zoom;
  return {
    zoom,
    tx: clamp(canvas.width / 2 - targetX * zoom, minTx, 0),
    ty: clamp(canvas.height * 0.55 - targetY * zoom, minTy, 0)
  };
}

const getCameraBeforeV052 = getCamera;
getCamera = function getCameraShotFramingV052() {
  if (typeof cameraStateV051 === 'undefined') return sectionCameraTargetV052();

  const now = performance.now();
  const target = sectionCameraTargetV052();

  if (!cameraStateV051.current) cameraStateV051.current = { ...target };

  if (cameraStateV051.intro) {
    const introT = easeCameraV051((now - cameraStateV051.intro.startedAt) / cameraStateV051.introDuration);
    const from = cameraStateV051.intro.from;
    const cam = {
      zoom: lerp(from.zoom, target.zoom, introT),
      tx: lerp(from.tx, target.tx, introT),
      ty: lerp(from.ty, target.ty, introT)
    };
    cameraStateV051.current = cam;
    if (introT >= 1) cameraStateV051.intro = null;
    return cam;
  }

  const speed = ball.moving || ball.flight ? 0.075 : (isPuttingView() ? 0.16 : 0.12);
  cameraStateV051.current = {
    zoom: lerp(cameraStateV051.current.zoom, target.zoom, speed),
    tx: lerp(cameraStateV051.current.tx, target.tx, speed),
    ty: lerp(cameraStateV051.current.ty, target.ty, speed)
  };
  return cameraStateV051.current;
};

const drawOverlayBeforeBuildV052 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV052() {
  drawOverlayBeforeBuildV052();
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
  ctx.fillText('v0.52', x, y + 0.5);
  ctx.restore();
};
