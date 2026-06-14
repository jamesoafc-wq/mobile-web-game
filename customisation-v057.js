// v0.57 player customisation: ball colour, trail colour and outfit skin.

const CUSTOM_OPTIONS_V057 = {
  balls: [
    ['#ffffff', 'Classic'], ['#9fe8ff', 'Ice'], ['#ffd36b', 'Gold'], ['#ff8dcb', 'Pink'], ['#98f28c', 'Lime']
  ],
  trails: [
    ['#ffdd46', 'Yellow'], ['#65e8ff', 'Cyan'], ['#ff7a7a', 'Red'], ['#b68cff', 'Violet'], ['#7cff95', 'Green']
  ],
  outfits: [['classic', 'Classic'], ['tour', 'Tour'], ['retro', 'Retro'], ['night', 'Night']]
};

function currentCustomV057() {
  const profile = loadCareerV057();
  profile.custom = profile.custom || defaultCareerV057().custom;
  return profile.custom;
}

function saveCustomV057(partial) {
  const profile = loadCareerV057();
  profile.custom = { ...(profile.custom || defaultCareerV057().custom), ...partial };
  saveCareerV057(profile);
}

function hexToRgbV057(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

function rgbaV057(hex, a) {
  const c = hexToRgbV057(hex);
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

function optionButtonV057(group, value, label, selected, colour) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.style.cssText = 'border:1px solid rgba(238,248,216,.16);border-radius:999px;padding:7px 9px;font:850 10px system-ui;color:#eef8d8;background:rgba(255,255,255,.07);';
  if (colour) b.style.boxShadow = `inset 0 -3px 0 ${colour}`;
  if (selected) {
    b.style.background = 'linear-gradient(180deg,#d9f89a,#92db61)';
    b.style.color = '#071007';
  }
  b.addEventListener('click', () => {
    saveCustomV057({ [group]: value });
    renderCourseMenuV045();
  });
  return b;
}

function customPanelV057() {
  const c = currentCustomV057();
  const box = document.createElement('div');
  box.dataset.customPanelV057 = 'true';
  box.style.cssText = 'margin:0 0 12px;padding:12px;border:1px solid rgba(238,248,216,.16);border-radius:18px;background:rgba(255,255,255,.055);color:#eef8d8;';
  box.innerHTML = `<div style="font:950 15px system-ui;margin-bottom:8px;">Player customisation</div>`;

  const rows = [
    ['ball', 'Ball', CUSTOM_OPTIONS_V057.balls],
    ['trail', 'Trail', CUSTOM_OPTIONS_V057.trails],
    ['outfit', 'Skin', CUSTOM_OPTIONS_V057.outfits]
  ];

  rows.forEach(([key, title, opts]) => {
    const row = document.createElement('div');
    row.style.marginTop = '8px';
    const label = document.createElement('div');
    label.textContent = title;
    label.style.cssText = 'font:850 10px system-ui;color:rgba(232,246,222,.62);margin-bottom:5px;letter-spacing:.04em;text-transform:uppercase;';
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
    opts.forEach(([value, text]) => buttons.appendChild(optionButtonV057(key, value, text, c[key] === value, key === 'outfit' ? null : value)));
    row.append(label, buttons);
    box.appendChild(row);
  });
  return box;
}

function injectCustomPanelV057() {
  const shell = courseMenuV045 && courseMenuV045.firstElementChild;
  if (!shell || shell.querySelector('[data-custom-panel-v057="true"]')) return;
  const afterCareer = shell.querySelector('[data-career-panel-v057="true"]');
  const panel = customPanelV057();
  if (afterCareer && afterCareer.nextSibling) shell.insertBefore(panel, afterCareer.nextSibling);
  else shell.insertBefore(panel, shell.children[1] || null);
}

const renderCourseMenuBeforeCustomV057 = renderCourseMenuV045;
renderCourseMenuV045 = function renderCourseMenuCustomV057() {
  renderCourseMenuBeforeCustomV057();
  injectCustomPanelV057();
};
renderCourseMenuV045();

const drawBallBeforeCustomV057 = drawBall;
drawBall = function drawBallCustomV057() {
  const c = currentCustomV057();
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(ball.x, ball.y + 5, ball.radius * 1.1, ball.radius * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.ball || '#ffffff';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius * ball.visualScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = c.outfit === 'tour' ? 1.4 : 1;
  ctx.strokeStyle = c.outfit === 'night' ? '#111' : c.outfit === 'retro' ? '#d06a2e' : 'rgba(0,0,0,0.16)';
  ctx.stroke();
  if (c.outfit !== 'classic') {
    ctx.strokeStyle = c.outfit === 'tour' ? '#111' : c.outfit === 'night' ? '#d9f89a' : '#fff1b6';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.beginPath();
  ctx.arc(ball.x - 1.3, ball.y - 1.6, Math.max(1.3, ball.radius * 0.24), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

if (typeof drawDriverTrailV038 === 'function') {
  drawDriverTrailV038 = function drawDriverTrailCustomV057() {
    const now = performance.now();
    if (driverTrailV038.length < 2) return;
    if (!driverTrailActiveV038 && now > driverTrailUntilV038) return;
    const colour = currentCustomV057().trail || '#ffdd46';
    const cam = getCamera();
    ctx.save();
    ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.tx, cam.ty);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgbaV057(colour, .28);
    ctx.lineWidth = 5.4;
    ctx.beginPath();
    driverTrailV038.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.strokeStyle = rgbaV057(colour, .88);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    driverTrailV038.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.restore();
  };
}
