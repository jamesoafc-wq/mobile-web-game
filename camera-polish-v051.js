// v0.51 camera polish: smooth zoom transitions and short hole intro flyovers.

const cameraStateV051 = {
  current: null,
  intro: null,
  introDuration: 1500
};

function easeCameraV051(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

function overviewCameraV051() {
  const zoom = 0.78;
  return {
    zoom,
    tx: canvas.width / 2 - 210 * zoom,
    ty: canvas.height / 2 - 380 * zoom
  };
}

const getCameraBeforeV051 = getCamera;
getCamera = function getCameraV051() {
  const target = getCameraBeforeV051();
  const now = performance.now();

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

  const speed = isPuttingView() ? 0.16 : 0.11;
  cameraStateV051.current = {
    zoom: lerp(cameraStateV051.current.zoom, target.zoom, speed),
    tx: lerp(cameraStateV051.current.tx, target.tx, speed),
    ty: lerp(cameraStateV051.current.ty, target.ty, speed)
  };
  return cameraStateV051.current;
};

function startHoleIntroV051() {
  cameraStateV051.current = overviewCameraV051();
  cameraStateV051.intro = {
    startedAt: performance.now(),
    from: overviewCameraV051(),
    holeNumber: typeof roundHoleIndexV035 === 'number' ? roundHoleIndexV035 + 1 : 1,
    courseName: typeof activeCourseV045 !== 'undefined' && activeCourseV045 ? activeCourseV045.name : 'Course',
    par: hole && hole.par ? hole.par : 4
  };
}

if (typeof resetRoundHoleV035 === 'function') {
  const resetRoundHoleBeforeV051 = resetRoundHoleV035;
  resetRoundHoleV035 = function resetRoundHoleCameraV051(index) {
    resetRoundHoleBeforeV051(index);
    startHoleIntroV051();
  };
}

if (typeof applyCourseV045 === 'function') {
  const applyCourseBeforeV051 = applyCourseV045;
  applyCourseV045 = function applyCourseCameraV051(course) {
    applyCourseBeforeV051(course);
    startHoleIntroV051();
  };
}

function drawHoleIntroV051() {
  if (!cameraStateV051.intro) return;
  // Legacy hole-number/par banner DISABLED — replaced by the clean hole card in
  // hole-intro.js. (Camera intro motion is kept; only this tile is suppressed.)
  return;
  /* eslint-disable no-unreachable */
  const elapsed = performance.now() - cameraStateV051.intro.startedAt;
  const t = elapsed / cameraStateV051.introDuration;
  const alpha = t < 0.18 ? t / 0.18 : t > 0.72 ? 1 - (t - 0.72) / 0.28 : 1;
  const y = 92 - easeCameraV051(Math.min(t, 1)) * 18;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.fillStyle = 'rgba(4,10,6,.78)';
  roundRect(ctx, 34, y, canvas.width - 68, 70, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(222,255,210,.18)';
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eef8d8';
  ctx.font = '950 18px system-ui';
  ctx.fillText(cameraStateV051.intro.courseName, canvas.width / 2, y + 28);
  ctx.font = '850 12px system-ui';
  ctx.fillStyle = 'rgba(232,246,222,.78)';
  ctx.fillText(`Hole ${cameraStateV051.intro.holeNumber} · Par ${cameraStateV051.intro.par}`, canvas.width / 2, y + 50);
  ctx.restore();
}

const drawBeforeV051 = draw;
draw = function drawCameraPolishV051() {
  drawBeforeV051();
  drawHoleIntroV051();
};

const drawOverlayBeforeBuildV051 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV051() {
  drawOverlayBeforeBuildV051();
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
  ctx.fillText('v0.51', x, y + 0.5);
  ctx.restore();
};

startHoleIntroV051();
