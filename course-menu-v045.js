// v0.45 course select menu and 18-hole Willow Heath framework.

const COURSE_MENU_STORAGE_V045 = 'tdg_course_best_scores_v045';
let activeCourseIdV045 = 'willow';
let activeCourseV045 = null;
let menuOpenV045 = true;

function cloneCourseHoleV045(holeData) {
  return JSON.parse(JSON.stringify(holeData));
}

function buildWillowBackNineV045() {
  return [
    transformHoleV035(ROUND_BASE_HOLE_V035, { id: 10, par: 4, mirror: true, amp: 18, phase: 0.4, tilt: -14, cupShift: { x: 12, y: 2 } }),
    transformHoleV035(ROUND_BASE_HOLE_V035, { id: 11, par: 5, amp: 42, phase: 1.2, tilt: 28, tee: { x: 222, y: 660 }, cupShift: { x: -18, y: 4 } }),
    makePar3HoleV036(12, false),
    transformHoleV035(ROUND_BASE_HOLE_V035, { id: 13, par: 4, amp: -26, phase: 2.1, tilt: 18, tee: { x: 196, y: 640 }, cupShift: { x: 22, y: 10 } }),
    transformHoleV035(ROUND_BASE_HOLE_V035, { id: 14, par: 4, mirror: true, amp: 30, phase: 2.8, tilt: -24, cupShift: { x: -20, y: 12 } }),
    makePar3HoleV036(15, true),
    transformHoleV035(ROUND_BASE_HOLE_V035, { id: 16, par: 5, amp: -44, phase: 0.9, tilt: 36, tee: { x: 205, y: 660 }, cupShift: { x: 18, y: -2 } }),
    transformHoleV035(ROUND_BASE_HOLE_V035, { id: 17, par: 4, mirror: true, amp: -18, phase: 3.2, tee: { x: 236, y: 636 }, cupShift: { x: -8, y: 22 } }),
    transformHoleV035(ROUND_BASE_HOLE_V035, { id: 18, par: 4, amp: 10, phase: 1.7, tilt: -10, tee: { x: 210, y: 646 }, cupShift: { x: 0, y: 0 } })
  ];
}

const WILLOW_FRONT_NINE_V045 = ROUND_HOLES_V035.slice(0, 9).map(cloneCourseHoleV045);
const WILLOW_HOLES_V045 = WILLOW_FRONT_NINE_V045.concat(buildWillowBackNineV045());
WILLOW_HOLES_V045.forEach((h, i) => { h.id = i + 1; h.name = `Hole ${i + 1}`; if (!h.cup.r) h.cup.r = 4.2; });

const COURSES_V045 = [
  {
    id: 'willow',
    name: 'Willow Heath',
    subtitle: 'Classic parkland · expanded 18',
    difficulty: 2,
    status: 'PLAYABLE',
    palette: ['#2f7d3f', '#9ddf7c', '#d8f6cb'],
    icon: '🌳',
    details: 'Balanced fairways, light water, friendly greens.',
    holes: WILLOW_HOLES_V045
  },
  {
    id: 'coral',
    name: 'Coral Palms',
    subtitle: 'Tropical water course',
    difficulty: 4,
    status: 'COMING NEXT',
    palette: ['#117f7a', '#50d0a3', '#ffd96c'],
    icon: '🌴',
    details: 'Palms, carts, bright lagoons and risk/reward water carries.',
    holes: []
  },
  {
    id: 'dunes',
    name: 'Red Dunes',
    subtitle: 'Desert links',
    difficulty: 3,
    status: 'COMING NEXT',
    palette: ['#b86f35', '#e6b366', '#f2d392'],
    icon: '🏜️',
    details: 'Gravel rough, cacti, dry washes and bunker-heavy approaches.',
    holes: []
  },
  {
    id: 'pine',
    name: 'Pine Ridge',
    subtitle: 'Forest and streams',
    difficulty: 3,
    status: 'COMING NEXT',
    palette: ['#183b2b', '#2b7657', '#9fd5c0'],
    icon: '🌲',
    details: 'Cooler greens, pine corridors and stream crossings.',
    holes: []
  },
  {
    id: 'silver',
    name: 'Silver Creek',
    subtitle: 'Creekside championship',
    difficulty: 4,
    status: 'COMING NEXT',
    palette: ['#284c52', '#87b8a5', '#d8e9f0'],
    icon: '💧',
    details: 'Narrow parkland, carts near tees, strategic creeks and bunkers.',
    holes: []
  }
];

function getCourseByIdV045(id) {
  return COURSES_V045.find(course => course.id === id) || COURSES_V045[0];
}

function loadBestScoresV045() {
  try { return JSON.parse(localStorage.getItem(COURSE_MENU_STORAGE_V045) || '{}'); }
  catch { return {}; }
}

function saveBestScoresV045(scores) {
  try { localStorage.setItem(COURSE_MENU_STORAGE_V045, JSON.stringify(scores)); } catch {}
}

function courseParV045(course) {
  return course.holes.reduce((sum, h) => sum + h.par, 0);
}

function bestScoreLabelV045(course) {
  const best = loadBestScoresV045()[course.id];
  if (typeof best !== 'number') return 'Best: —';
  const diff = best - courseParV045(course);
  return `Best: ${best} (${roundScoreTextV035(diff)})`;
}

function saveBestIfNeededV045(course) {
  if (!course || !course.holes.length) return;
  const strokes = roundCompletedStrokesV035();
  const scores = loadBestScoresV045();
  if (typeof scores[course.id] !== 'number' || strokes < scores[course.id]) {
    scores[course.id] = strokes;
    saveBestScoresV045(scores);
  }
}

function applyCourseV045(course) {
  activeCourseV045 = course;
  activeCourseIdV045 = course.id;
  ROUND_HOLES_V035.length = 0;
  course.holes.forEach(h => ROUND_HOLES_V035.push(cloneCourseHoleV045(h)));
  roundScoresV035 = Array(course.holes.length).fill(null);
  roundCompleteV035 = false;
  resetRoundHoleV035(0);
  menuOpenV045 = false;
  courseMenuV045.style.display = 'none';
  updateHud();
}

function resetRoundForCourseV045(index = 0) {
  roundScoresV035 = Array(ROUND_HOLES_V035.length).fill(null);
  roundCompleteV035 = false;
  resetRoundHoleV035(index);
}

const goNextHoleBeforeV045 = goNextHoleV035;
goNextHoleV035 = function goNextHoleV045() {
  if (roundCompleteV035) {
    if (activeCourseV045) saveBestIfNeededV045(activeCourseV045);
    menuOpenV045 = true;
    courseMenuV045.style.display = 'grid';
    renderCourseMenuV045();
    return;
  }
  if (roundHoleIndexV035 >= ROUND_HOLES_V035.length - 1) {
    roundCompleteV035 = true;
    if (activeCourseV045) saveBestIfNeededV045(activeCourseV045);
    const par = activeCourseV045 ? courseParV045(activeCourseV045) : roundTotalParV035();
    message = `Round complete. ${roundCompletedStrokesV035()} strokes, ${roundScoreTextV035(roundCompletedStrokesV035() - par)} vs par ${par}.`;
    updateHud();
    return;
  }
  resetRoundHoleV035(roundHoleIndexV035 + 1);
};

roundTotalParV035 = function roundTotalParV045() {
  return ROUND_HOLES_V035.reduce((sum, h) => sum + h.par, 0);
};

function drawRoundScorecardV045() {
  if (!roundCompleteV035) return;
  const total = ROUND_HOLES_V035.length;
  const panelX = 24;
  const panelY = 82;
  const panelW = canvas.width - 48;
  const panelH = 515;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(4,10,6,0.92)';
  roundRect(ctx, panelX, panelY, panelW, panelH, 18); ctx.fill();
  ctx.strokeStyle = 'rgba(222,255,210,0.18)'; ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eef8d8'; ctx.font = '900 18px system-ui';
  ctx.fillText(activeCourseV045 ? activeCourseV045.name : 'Round Scorecard', canvas.width / 2, panelY + 30);
  const par = activeCourseV045 ? courseParV045(activeCourseV045) : roundTotalParV035();
  ctx.font = '800 12px system-ui'; ctx.fillStyle = 'rgba(232,246,222,0.78)';
  ctx.fillText(`${roundCompletedStrokesV035()} strokes · ${roundScoreTextV035(roundCompletedStrokesV035() - par)} vs par ${par}`, canvas.width / 2, panelY + 52);

  const colX = [panelX + 24, panelX + 192];
  const startY = panelY + 84;
  for (let section = 0; section < 2; section++) {
    const base = section * 9;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(232,246,222,0.66)'; ctx.font = '800 10px system-ui';
    ctx.fillText(section === 0 ? 'FRONT 9' : 'BACK 9', colX[section], startY - 18);
    for (let r = 0; r < 9; r++) {
      const i = base + r;
      if (i >= total) continue;
      const y = startY + r * 40;
      const h = ROUND_HOLES_V035[i];
      const score = roundScoresV035[i];
      const diff = score == null ? 0 : score - h.par;
      ctx.fillStyle = r % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.06)';
      roundRect(ctx, colX[section] - 8, y - 16, 142, 30, 8); ctx.fill();
      ctx.fillStyle = '#eef8d8'; ctx.font = '850 11px system-ui';
      ctx.fillText(`${i + 1}`, colX[section], y);
      ctx.fillText(`P${h.par}`, colX[section] + 34, y);
      ctx.fillText(score == null ? '-' : String(score), colX[section] + 72, y);
      ctx.fillStyle = diff < 0 ? '#9cf28f' : diff > 0 ? '#ffd074' : '#eef8d8';
      ctx.fillText(score == null ? '-' : roundScoreTextV035(diff), colX[section] + 104, y);
    }
  }
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(232,246,222,0.78)'; ctx.font = '800 11px system-ui';
  ctx.fillText('Tap Restart round to return to course select.', canvas.width / 2, panelY + panelH - 22);
  ctx.restore();
}

if (typeof drawRoundScorecardV036 === 'function') {
  drawRoundScorecardV036 = drawRoundScorecardV045;
}

const courseMenuV045 = document.createElement('div');
courseMenuV045.className = 'course-menu-v045';
courseMenuV045.style.position = 'fixed';
courseMenuV045.style.inset = '0';
courseMenuV045.style.zIndex = '2000';
courseMenuV045.style.display = 'grid';
courseMenuV045.style.placeItems = 'center';
courseMenuV045.style.padding = '18px';
courseMenuV045.style.background = 'radial-gradient(circle at 50% 0%, rgba(41,75,45,.98), rgba(5,12,6,.98) 70%)';
document.body.appendChild(courseMenuV045);

function difficultyDotsV045(level) {
  return '●'.repeat(level) + '○'.repeat(5 - level);
}

function renderCourseMenuV045() {
  courseMenuV045.innerHTML = '';
  const shell = document.createElement('div');
  shell.style.width = 'min(100%, 540px)';
  shell.style.maxHeight = 'calc(100dvh - 28px)';
  shell.style.overflow = 'auto';
  shell.innerHTML = `
    <div style="margin-bottom:14px;text-align:center;">
      <div style="font:950 24px system-ui;color:#eef8d8;letter-spacing:.02em;">Choose Course</div>
      <div style="font:750 12px system-ui;color:rgba(232,246,222,.72);margin-top:4px;">Patch 1: Willow Heath is now 18 holes. More full courses land in Patch 2.</div>
    </div>
  `;

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '1fr';
  grid.style.gap = '10px';

  COURSES_V045.forEach(course => {
    const playable = course.holes.length > 0;
    const card = document.createElement('button');
    card.type = 'button';
    card.disabled = !playable;
    card.style.width = '100%';
    card.style.border = '1px solid rgba(238,248,216,.16)';
    card.style.borderRadius = '18px';
    card.style.padding = '0';
    card.style.overflow = 'hidden';
    card.style.background = playable ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.035)';
    card.style.color = '#eef8d8';
    card.style.textAlign = 'left';
    card.style.opacity = playable ? '1' : '.68';
    card.style.boxShadow = playable ? '0 14px 34px rgba(0,0,0,.22)' : 'none';

    const preview = document.createElement('div');
    preview.style.height = '74px';
    preview.style.display = 'flex';
    preview.style.alignItems = 'center';
    preview.style.gap = '12px';
    preview.style.padding = '12px';
    preview.style.background = `linear-gradient(120deg, ${course.palette[0]}, ${course.palette[1]} 58%, ${course.palette[2]})`;
    preview.innerHTML = `
      <div style="font-size:34px;filter:drop-shadow(0 3px 7px rgba(0,0,0,.28));">${course.icon}</div>
      <div style="flex:1;min-width:0;">
        <div style="font:950 16px system-ui;color:#fff;">${course.name}</div>
        <div style="font:800 11px system-ui;color:rgba(255,255,255,.78);">${course.subtitle}</div>
      </div>
      <div style="font:900 10px system-ui;color:rgba(255,255,255,.9);text-align:right;">${course.status}</div>
    `;

    const body = document.createElement('div');
    body.style.padding = '10px 12px 12px';
    body.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
        <div style="font:850 12px system-ui;color:rgba(232,246,222,.82);">Difficulty ${difficultyDotsV045(course.difficulty)}</div>
        <div style="font:900 12px system-ui;color:${playable ? '#dff8c6' : 'rgba(232,246,222,.55)'};">${playable ? bestScoreLabelV045(course) : 'Best: —'}</div>
      </div>
      <div style="font:700 11px/1.3 system-ui;color:rgba(232,246,222,.62);margin-top:6px;">${course.details}</div>
    `;

    card.append(preview, body);
    if (playable) card.addEventListener('click', () => applyCourseV045(course));
    grid.appendChild(card);
  });

  shell.appendChild(grid);
  courseMenuV045.appendChild(shell);
}

renderCourseMenuV045();

const drawOverlayBeforeBuildV045 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV045() {
  drawOverlayBeforeBuildV045();
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
  ctx.fillText('v0.45', x, y + 0.5);
  ctx.restore();
};
