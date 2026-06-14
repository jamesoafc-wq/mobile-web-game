// v0.49 restore classic course cards and add Exit to menu in the ball drop-up.

const renderMenuBeforeV049 = renderCourseMenuV045;

function renderClassicOnlyMenuV049() {
  courseMenuV045.innerHTML = '';
  const shell = document.createElement('div');
  shell.style.width = 'min(100%, 540px)';
  shell.style.maxHeight = 'calc(100dvh - 28px)';
  shell.style.overflow = 'auto';
  shell.innerHTML = `
    <div style="margin-bottom:14px;text-align:center;">
      <div style="font:950 24px system-ui;color:#eef8d8;letter-spacing:.02em;">Choose Course</div>
      <div style="font:750 12px system-ui;color:rgba(232,246,222,.72);margin-top:4px;">Classic course cards restored.</div>
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

renderCourseMenuV045 = renderClassicOnlyMenuV049;

function exitToCourseMenuV049() {
  if (typeof ballMenuPanelV040 !== 'undefined') ballMenuPanelV040.classList.remove('open');
  if (typeof ballToggleV040 !== 'undefined') ballToggleV040.setAttribute('aria-expanded', 'false');
  if (typeof menuOpenV045 !== 'undefined') menuOpenV045 = true;
  if (typeof courseMenuV045 !== 'undefined') {
    courseMenuV045.style.display = 'grid';
    renderCourseMenuV045();
  }
}

function addExitButtonToBallMenuV049() {
  if (typeof ballMenuPanelV040 === 'undefined') return;
  if (ballMenuPanelV040.querySelector('[data-exit-menu-v049="true"]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Exit to menu';
  button.dataset.exitMenuV049 = 'true';
  button.addEventListener('click', exitToCourseMenuV049);
  ballMenuPanelV040.appendChild(button);
}

addExitButtonToBallMenuV049();
setTimeout(addExitButtonToBallMenuV049, 0);
setTimeout(addExitButtonToBallMenuV049, 250);
renderCourseMenuV045();

const drawOverlayBeforeBuildV049 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV049() {
  drawOverlayBeforeBuildV049();
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
  ctx.fillText('v0.49', x, y + 0.5);
  ctx.restore();
};
