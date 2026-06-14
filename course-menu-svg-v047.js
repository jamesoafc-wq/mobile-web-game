// v0.47 reversible SVG course preview cards for the course menu.

const COURSE_PREVIEW_MODE_KEY_V047 = 'tdg_course_preview_mode_v047';

function getPreviewModeV047() {
  try { return localStorage.getItem(COURSE_PREVIEW_MODE_KEY_V047) || 'svg'; }
  catch { return 'svg'; }
}

function setPreviewModeV047(mode) {
  try { localStorage.setItem(COURSE_PREVIEW_MODE_KEY_V047, mode); } catch {}
}

function svgPaletteV047(course) {
  return {
    willow: { bg:'#224a2b', fairway:'#82ce65', green:'#a7e783', water:'#2b7cae', sand:'#d8be7a', accent:'#dff8c6' },
    coral: { bg:'#0c676e', fairway:'#77d98b', green:'#a9eca0', water:'#21b7c2', sand:'#efd38a', accent:'#ffe7a3' },
    dunes: { bg:'#b77b3d', fairway:'#91b960', green:'#bddb86', water:'#c28b4a', sand:'#e9c579', accent:'#ffe4a8' },
    pine: { bg:'#163926', fairway:'#62ad6a', green:'#93da86', water:'#2f8295', sand:'#ccb474', accent:'#cce7d5' },
    silver: { bg:'#2f5b60', fairway:'#77be78', green:'#a6df8a', water:'#5ca6bf', sand:'#d5bf82', accent:'#d8edf1' }
  }[course.id] || { bg:course.palette[0], fairway:course.palette[1], green:course.palette[2], water:'#2b7cae', sand:'#d8be7a', accent:'#eef8d8' };
}

function svgCoursePreviewV047(course) {
  const p = svgPaletteV047(course);
  const playable = course.holes.length > 0;
  const opacity = playable ? '1' : '.62';
  const common = `opacity="${opacity}"`;

  if (course.id === 'dunes') {
    return `
      <svg viewBox="0 0 220 88" role="img" aria-label="${course.name} preview" style="width:100%;height:86px;display:block;background:${p.bg};">
        <rect width="220" height="88" fill="${p.bg}"/>
        <path d="M34 84 C70 61, 64 35, 98 22 C126 11, 148 18, 186 4" fill="none" stroke="${p.fairway}" stroke-width="25" stroke-linecap="round" ${common}/>
        <ellipse cx="184" cy="11" rx="24" ry="15" fill="${p.green}" ${common}/>
        <ellipse cx="89" cy="54" rx="19" ry="8" fill="${p.sand}" transform="rotate(-25 89 54)" ${common}/>
        <ellipse cx="146" cy="26" rx="18" ry="7" fill="${p.sand}" transform="rotate(20 146 26)" ${common}/>
        <path d="M25 65 h11 M30 65 v-28 M30 48 h-12 v-12 M34 54 h12 v-13" stroke="#2e7c48" stroke-width="5" stroke-linecap="round" fill="none" ${common}/>
        <circle cx="55" cy="22" r="4" fill="#8d806e"/><circle cx="64" cy="28" r="3" fill="#8d806e"/><circle cx="49" cy="31" r="3" fill="#8d806e"/>
        <circle cx="184" cy="11" r="3.2" fill="rgba(0,0,0,.45)"/>
      </svg>`;
  }

  if (course.id === 'coral') {
    return `
      <svg viewBox="0 0 220 88" role="img" aria-label="${course.name} preview" style="width:100%;height:86px;display:block;background:${p.bg};">
        <rect width="220" height="88" fill="${p.bg}"/>
        <path d="M0 54 C45 39, 74 64, 112 43 C146 25, 175 36, 220 18 L220 43 C174 62, 140 50, 112 66 C74 86, 42 64, 0 81Z" fill="${p.water}" opacity=".78"/>
        <path d="M28 82 C58 62, 76 45, 105 34 C136 22, 157 19, 194 10" fill="none" stroke="${p.fairway}" stroke-width="23" stroke-linecap="round" ${common}/>
        <ellipse cx="193" cy="11" rx="22" ry="14" fill="${p.green}" ${common}/>
        <ellipse cx="131" cy="37" rx="15" ry="6" fill="${p.sand}" transform="rotate(-20 131 37)" ${common}/>
        <g ${common}><path d="M38 67 q5-18 0-33" stroke="#8a5e35" stroke-width="4" fill="none"/><path d="M38 35 l-18-9 M38 35 l18-10 M38 35 l-4-19 M38 35 l-15 5 M38 35 l16 6" stroke="#1f9d62" stroke-width="5" stroke-linecap="round"/></g>
        <g ${common}><rect x="50" y="61" width="30" height="13" rx="5" fill="#f1f2df"/><circle cx="58" cy="75" r="4" fill="#202820"/><circle cx="73" cy="75" r="4" fill="#202820"/></g>
        <circle cx="193" cy="11" r="3.2" fill="rgba(0,0,0,.45)"/>
      </svg>`;
  }

  if (course.id === 'pine') {
    return `
      <svg viewBox="0 0 220 88" role="img" aria-label="${course.name} preview" style="width:100%;height:86px;display:block;background:${p.bg};">
        <rect width="220" height="88" fill="${p.bg}"/>
        <path d="M0 40 C48 34, 78 53, 116 38 C155 22, 178 29, 220 18" fill="none" stroke="${p.water}" stroke-width="15" stroke-linecap="round" opacity=".75"/>
        <path d="M32 84 C66 65, 76 48, 105 37 C137 24, 157 21, 192 9" fill="none" stroke="${p.fairway}" stroke-width="22" stroke-linecap="round" ${common}/>
        <ellipse cx="192" cy="10" rx="22" ry="14" fill="${p.green}" ${common}/>
        <rect x="103" y="32" width="30" height="8" rx="4" fill="#8b6238" transform="rotate(-16 118 36)" ${common}/>
        <g ${common} fill="#1f5f3d"><path d="M24 32 l12-25 l12 25z"/><path d="M174 64 l12-25 l12 25z"/><path d="M52 68 l10-22 l10 22z"/></g>
        <ellipse cx="142" cy="28" rx="15" ry="6" fill="${p.sand}" transform="rotate(15 142 28)" ${common}/>
        <circle cx="192" cy="10" r="3.2" fill="rgba(0,0,0,.45)"/>
      </svg>`;
  }

  if (course.id === 'silver') {
    return `
      <svg viewBox="0 0 220 88" role="img" aria-label="${course.name} preview" style="width:100%;height:86px;display:block;background:${p.bg};">
        <rect width="220" height="88" fill="${p.bg}"/>
        <path d="M15 0 C38 26, 30 46, 65 68 C93 86, 139 82, 210 88" fill="none" stroke="${p.water}" stroke-width="17" stroke-linecap="round" opacity=".78"/>
        <path d="M35 82 C65 61, 76 46, 103 35 C135 21, 157 18, 190 10" fill="none" stroke="${p.fairway}" stroke-width="22" stroke-linecap="round" ${common}/>
        <ellipse cx="190" cy="10" rx="22" ry="14" fill="${p.green}" ${common}/>
        <ellipse cx="125" cy="38" rx="16" ry="6" fill="${p.sand}" transform="rotate(-18 125 38)" ${common}/>
        <rect x="52" y="61" width="31" height="13" rx="5" fill="#f1f2df" ${common}/>
        <path d="M72 28 h50" stroke="#b6b8bd" stroke-width="6" stroke-linecap="round" opacity=".7"/>
        <g stroke="#c6d9bd" stroke-width="2" ${common}><path d="M43 45 q-2-8 0-16"/><path d="M52 51 q2-10-1-18"/><path d="M62 57 q-1-8 1-15"/></g>
        <circle cx="190" cy="10" r="3.2" fill="rgba(0,0,0,.45)"/>
      </svg>`;
  }

  return `
    <svg viewBox="0 0 220 88" role="img" aria-label="${course.name} preview" style="width:100%;height:86px;display:block;background:${p.bg};">
      <rect width="220" height="88" fill="${p.bg}"/>
      <path d="M32 82 C61 62, 76 45, 106 34 C139 21, 158 18, 192 10" fill="none" stroke="${p.fairway}" stroke-width="24" stroke-linecap="round" ${common}/>
      <ellipse cx="192" cy="11" rx="23" ry="15" fill="${p.green}" ${common}/>
      <ellipse cx="137" cy="35" rx="16" ry="6" fill="${p.sand}" transform="rotate(-18 137 35)" ${common}/>
      <ellipse cx="79" cy="54" rx="14" ry="6" fill="${p.water}" opacity=".8"/>
      <g fill="#2f7d3f" ${common}><circle cx="35" cy="24" r="10"/><circle cx="54" cy="70" r="8"/><circle cx="177" cy="62" r="9"/></g>
      <circle cx="192" cy="11" r="3.2" fill="rgba(0,0,0,.45)"/>
    </svg>`;
}

function renderPreviewModeToggleV047(mode) {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.justifyContent = 'center';
  wrap.style.gap = '8px';
  wrap.style.margin = '10px 0 14px';
  ['svg', 'classic'].forEach(value => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = value === 'svg' ? 'Illustrated' : 'Classic';
    const selected = mode === value;
    btn.style.border = '1px solid rgba(238,248,216,.18)';
    btn.style.borderRadius = '999px';
    btn.style.padding = '7px 12px';
    btn.style.font = '850 11px system-ui';
    btn.style.color = selected ? '#071007' : '#eef8d8';
    btn.style.background = selected ? 'linear-gradient(180deg,#d9f89a,#92db61)' : 'rgba(255,255,255,.07)';
    btn.addEventListener('click', () => { setPreviewModeV047(value); renderCourseMenuV045(); });
    wrap.appendChild(btn);
  });
  return wrap;
}

function renderCourseMenuV047() {
  const mode = getPreviewModeV047();
  courseMenuV045.innerHTML = '';
  const shell = document.createElement('div');
  shell.style.width = 'min(100%, 540px)';
  shell.style.maxHeight = 'calc(100dvh - 28px)';
  shell.style.overflow = 'auto';

  const title = document.createElement('div');
  title.style.marginBottom = '0';
  title.style.textAlign = 'center';
  title.innerHTML = `
    <div style="font:950 24px system-ui;color:#eef8d8;letter-spacing:.02em;">Choose Course</div>
    <div style="font:750 12px system-ui;color:rgba(232,246,222,.72);margin-top:4px;">Toggle previews anytime — Classic keeps the previous card style.</div>
  `;
  shell.appendChild(title);
  shell.appendChild(renderPreviewModeToggleV047(mode));

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
    preview.style.position = 'relative';
    preview.style.height = mode === 'svg' ? '86px' : '74px';
    preview.style.overflow = 'hidden';

    if (mode === 'svg') {
      preview.innerHTML = svgCoursePreviewV047(course);
      const label = document.createElement('div');
      label.style.position = 'absolute';
      label.style.inset = '0';
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.justifyContent = 'space-between';
      label.style.gap = '10px';
      label.style.padding = '12px';
      label.style.background = 'linear-gradient(90deg, rgba(0,0,0,.38), rgba(0,0,0,.08) 62%, rgba(0,0,0,.32))';
      label.innerHTML = `
        <div style="min-width:0;">
          <div style="font:950 16px system-ui;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.38);">${course.name}</div>
          <div style="font:800 11px system-ui;color:rgba(255,255,255,.82);text-shadow:0 2px 8px rgba(0,0,0,.38);">${course.subtitle}</div>
        </div>
        <div style="font:900 10px system-ui;color:rgba(255,255,255,.92);text-align:right;text-shadow:0 2px 8px rgba(0,0,0,.38);">${course.status}</div>
      `;
      preview.appendChild(label);
    } else {
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
    }

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

renderCourseMenuV045 = renderCourseMenuV047;
renderCourseMenuV045();

const drawOverlayBeforeBuildV047 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV047() {
  drawOverlayBeforeBuildV047();
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
  ctx.fillText('v0.47', x, y + 0.5);
  ctx.restore();
};
