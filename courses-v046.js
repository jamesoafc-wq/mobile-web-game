// v0.46 Patch 2: four new playable themed 18-hole courses.

function polyRectV046(cx, cy, w, h, rot = 0) {
  const hw = w / 2, hh = h / 2;
  const c = Math.cos(rot), s = Math.sin(rot);
  return [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(([x,y]) => ({ x: cx + x*c - y*s, y: cy + x*s + y*c }));
}

function makeStreamV046(y, thickness = 34, slant = 0) {
  return [
    { x: 0, y: y - thickness / 2 },
    { x: 420, y: y - thickness / 2 + slant },
    { x: 420, y: y + thickness / 2 + slant },
    { x: 0, y: y + thickness / 2 }
  ];
}

function addThemeExtrasV046(hole, theme, index) {
  hole.courseTheme = theme;
  hole.themeExtras = hole.themeExtras || [];
  hole.props = hole.props || [];
  hole.trees = hole.trees || [];
  hole.bunkers = hole.bunkers || [];

  const teeX = hole.start?.x || 210;
  const teeY = hole.start?.y || 646;

  if (theme === 'coral') {
    hole.water = (index % 3 === 0) ? makeStreamV046(430 - (index % 4) * 18, 46, index % 2 ? -28 : 20) : hole.water;
    hole.themeExtras.push({ type: 'cart', x: teeX + 56, y: teeY - 14, rot: -0.2 });
    hole.themeExtras.push({ type: 'palm', x: 54 + (index * 17) % 50, y: 150 + (index * 41) % 320, scale: 1.0 });
    hole.themeExtras.push({ type: 'palm', x: 350 - (index * 13) % 50, y: 170 + (index * 31) % 330, scale: 0.9 });
    if (index % 2 === 0) hole.bunkers.push(polyRectV046(118, 330 + (index % 4) * 22, 56, 26, .35));
  }

  if (theme === 'dunes') {
    hole.water = [];
    hole.bunkers.push(polyRectV046(100 + (index * 31) % 190, 360 + (index % 5) * 32, 68, 28, .45));
    hole.bunkers.push(polyRectV046(250 - (index * 17) % 120, 220 + (index % 4) * 36, 54, 24, -.25));
    hole.themeExtras.push({ type: 'cactus', x: 45 + (index * 29) % 70, y: 165 + (index * 53) % 370, scale: 1 });
    hole.themeExtras.push({ type: 'cactus', x: 340 - (index * 23) % 62, y: 210 + (index * 39) % 330, scale: .85 });
    hole.themeExtras.push({ type: 'rocks', x: 70 + (index * 37) % 280, y: 120 + (index * 19) % 500 });
  }

  if (theme === 'pine') {
    if (index % 2 === 0) hole.water = makeStreamV046(365 + (index % 5) * 18, 30, index % 3 ? 26 : -18);
    for (let t = 0; t < 5; t++) {
      hole.themeExtras.push({ type: 'pine', x: 36 + ((index * 41 + t * 29) % 70), y: 110 + t * 98, scale: .78 + (t % 2) * .12 });
      hole.themeExtras.push({ type: 'pine', x: 350 - ((index * 37 + t * 23) % 62), y: 136 + t * 92, scale: .82 });
    }
    if (index % 3 === 0) hole.props.push({ type: 'bridge_wood_small', x: 210, y: 365 + (index % 5) * 18, rotation: .08, scale: 1.2 });
  }

  if (theme === 'silver') {
    hole.water = (index % 4 !== 1) ? makeStreamV046(305 + (index % 6) * 32, 32 + (index % 2) * 10, index % 2 ? -22 : 22) : hole.water;
    hole.themeExtras.push({ type: 'cart', x: teeX - 58, y: teeY - 10, rot: 0.12 });
    hole.bunkers.push(polyRectV046(280 - (index * 19) % 145, 270 + (index % 5) * 38, 58, 24, -.4));
    hole.themeExtras.push({ type: 'reeds', x: 70 + (index * 43) % 260, y: 305 + (index % 6) * 32 });
    if (index % 2) hole.themeExtras.push({ type: 'wall', x: 65 + (index * 21) % 280, y: 520 - (index % 4) * 60, rot: .08 });
  }

  return hole;
}

function makeCourseHoleV046(id, par, theme, opts = {}) {
  let holeData;
  if (opts.par3) {
    holeData = makePar3HoleV036(id, !!opts.flip);
  } else {
    holeData = transformHoleV035(ROUND_BASE_HOLE_V035, {
      id,
      par,
      mirror: !!opts.mirror,
      amp: opts.amp || 0,
      phase: opts.phase || 0,
      tilt: opts.tilt || 0,
      tee: opts.tee || { x: 190 + ((id * 23) % 55), y: 642 + ((id % 3) * 8) },
      cupShift: opts.cupShift || { x: ((id * 13) % 42) - 21, y: ((id * 17) % 34) - 17 }
    });
  }
  holeData.id = id;
  holeData.name = `Hole ${id}`;
  if (!holeData.cup.r) holeData.cup.r = 4.2;
  return addThemeExtrasV046(holeData, theme, id);
}

function buildThemeCourseV046(theme, pattern) {
  return pattern.map((cfg, i) => makeCourseHoleV046(i + 1, cfg.par, theme, cfg));
}

const COURSE_PATTERN_V046 = [
  { par:4, amp:20, phase:.2, tilt:-12 },
  { par:4, mirror:true, amp:-28, phase:1.1, tilt:18 },
  { par:3, par3:true },
  { par:5, amp:44, phase:.7, tilt:30 },
  { par:4, mirror:true, amp:18, phase:2.2, tilt:-26 },
  { par:3, par3:true, flip:true },
  { par:5, amp:-38, phase:1.8, tilt:34 },
  { par:4, mirror:true, amp:34, phase:2.9, tilt:-10 },
  { par:4, amp:-18, phase:.4, tilt:14 },
  { par:4, mirror:true, amp:26, phase:1.6, tilt:-20 },
  { par:5, amp:-48, phase:2.5, tilt:38 },
  { par:3, par3:true },
  { par:4, amp:30, phase:3.1, tilt:-30 },
  { par:4, mirror:true, amp:-22, phase:.9, tilt:22 },
  { par:3, par3:true, flip:true },
  { par:5, amp:50, phase:1.4, tilt:36 },
  { par:4, mirror:true, amp:12, phase:2.6, tilt:-16 },
  { par:4, amp:-10, phase:1.2, tilt:8 }
];

function offsetPatternV046(seed) {
  return COURSE_PATTERN_V046.map((cfg, i) => ({
    ...cfg,
    amp: (cfg.amp || 0) + Math.sin(seed + i) * 14,
    phase: (cfg.phase || 0) + seed * .17,
    tilt: (cfg.tilt || 0) + Math.cos(seed + i * .6) * 8,
    mirror: i % 5 === 0 ? !cfg.mirror : cfg.mirror
  }));
}

function setCoursePlayableV046(id, theme, name, subtitle, difficulty, details, seed) {
  const course = getCourseByIdV045(id);
  course.status = 'PLAYABLE';
  course.name = name;
  course.subtitle = subtitle;
  course.difficulty = difficulty;
  course.details = details;
  course.holes = buildThemeCourseV046(theme, offsetPatternV046(seed));
}

setCoursePlayableV046('coral', 'coral', 'Coral Palms', 'Tropical water course · 18 holes', 4, 'Palm-lined holes, carts by the tees, lagoons and risk/reward carries.', 1.7);
setCoursePlayableV046('dunes', 'dunes', 'Red Dunes', 'Desert links · 18 holes', 3, 'No water, gravel rough, cacti, rocks and heavier bunker placement.', 2.8);
setCoursePlayableV046('pine', 'pine', 'Pine Ridge', 'Forest and streams · 18 holes', 3, 'Pine corridors, cooler turf, bridges and stream crossings.', 3.9);
setCoursePlayableV046('silver', 'silver', 'Silver Creek', 'Creekside championship · 18 holes', 4, 'Tighter fairways, golf carts near tees, reeds, stone walls and creek hazards.', 5.1);

const THEME_STYLE_V046 = {
  willow: { rough:'#2b6635', rough2:'rgba(9,39,16,.06)', fairway:'#7ec863', tee:'#72bb5b', fringe:'#88cf74', green:'#9fe27e', water:'#2b7cae', sand:'#d8be7a' },
  coral: { rough:'#1d8f74', rough2:'rgba(255,255,255,.06)', fairway:'#72d68a', tee:'#69c779', fringe:'#89dfa6', green:'#a5eba0', water:'#21aeb7', sand:'#efd38a' },
  dunes: { rough:'#b98549', rough2:'rgba(76,44,20,.10)', fairway:'#88b65d', tee:'#7fa956', fringe:'#9fc176', green:'#b8d986', water:'#2b7cae', sand:'#e6bf73' },
  pine: { rough:'#183d2b', rough2:'rgba(4,18,12,.16)', fairway:'#5faa68', tee:'#579b60', fringe:'#79bd77', green:'#91d887', water:'#2f8295', sand:'#ccb474' },
  silver: { rough:'#315f5b', rough2:'rgba(10,32,34,.12)', fairway:'#75bd76', tee:'#6aad6d', fringe:'#8fcf83', green:'#a4de89', water:'#5b9db5', sand:'#d5bf82' }
};

function themeForHoleV046(hole) {
  return THEME_STYLE_V046[hole.courseTheme] || THEME_STYLE_V046.willow;
}

function drawThemedRoughV046(ctx, W, H, theme) {
  ctx.fillStyle = theme.rough;
  ctx.fillRect(0, 0, W, H);
  for (let y = -8; y < H + 8; y += 12) {
    for (let x = -8; x < W + 8; x += 15) {
      const seed = (x * 17 + y * 31) % 19;
      ctx.fillStyle = theme.rough2;
      ctx.fillRect(x + ((y / 12) % 2) * 4, y, 9 + (seed % 4), 2.2);
    }
  }
}

function drawThemedFairwayV046(ctx, hole, theme) {
  drawPolygonFill(ctx, hole.fairway, theme.fairway, 'rgba(35,74,33,0.45)', 2.1);
  clipToPolygon(ctx, hole.fairway, () => {
    const bounds = polygonBounds(hole.fairway);
    for (let x = bounds.minX - 40; x <= bounds.maxX + 40; x += 28) {
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.fillRect(x, bounds.minY - 20, 12, bounds.maxY - bounds.minY + 40);
    }
  });
}

function drawThemedWaterV046(ctx, hole, timeMs, theme) {
  if (!hole.water || hole.water.length < 3) return;
  drawPolygonFill(ctx, hole.water, theme.water, 'rgba(10,48,66,0.7)', 2.3);
  clipToPolygon(ctx, hole.water, () => {
    const bounds = polygonBounds(hole.water);
    for (let y = bounds.minY; y < bounds.maxY; y += 9) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      for (let x = bounds.minX - 10; x <= bounds.maxX + 12; x += 8) {
        const wave = Math.sin((x + timeMs * 0.045) * 0.06 + y * 0.18) * 2.4;
        if (x === bounds.minX - 10) ctx.moveTo(x, y + wave); else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
  });
}

function drawThemedBunkersV046(ctx, hole, theme) {
  hole.bunkers.forEach((bunker, idx) => {
    drawPolygonFill(ctx, bunker, theme.sand, 'rgba(115,84,38,0.55)', 2);
    clipToPolygon(ctx, bunker, () => {
      const bounds = polygonBounds(bunker);
      for (let x = bounds.minX; x <= bounds.maxX; x += 12) {
        ctx.strokeStyle = 'rgba(113,86,38,0.13)';
        ctx.beginPath(); ctx.moveTo(x, bounds.minY - 5); ctx.lineTo(x + 18, bounds.maxY + 5); ctx.stroke();
      }
      for (let i = 0; i < 10; i++) {
        const px = bounds.minX + ((i * 19 + idx * 7) % Math.max(1, bounds.maxX - bounds.minX));
        const py = bounds.minY + ((i * 13 + idx * 11) % Math.max(1, bounds.maxY - bounds.minY));
        ctx.fillStyle = 'rgba(112,84,35,0.1)'; ctx.fillRect(px, py, 2, 1.4);
      }
    });
  });
}

function drawThemedGreenV046(ctx, hole, theme) {
  drawPolygonFill(ctx, hole.greenRing, theme.fringe, 'rgba(45,100,45,0.38)', 2);
  drawPolygonFill(ctx, hole.green, theme.green, 'rgba(56,120,47,0.45)', 2.2);
  clipToPolygon(ctx, hole.green, () => {
    for (let r = 12; r < 90; r += 13) {
      ctx.strokeStyle = 'rgba(255,255,255,0.055)';
      ctx.beginPath(); ctx.ellipse(hole.cup.x, hole.cup.y, r * 1.15, r * 0.78, -0.28, 0, Math.PI * 2); ctx.stroke();
    }
  });
}

function drawPalmV046(ctx, e) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.scale || 1, e.scale || 1);
  // ground shadow
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(2, 19, 16, 6, 0, 0, Math.PI*2); ctx.fill();
  // side-on trunk: a gentle curve, with banding texture
  ctx.strokeStyle = '#9a6b3c'; ctx.lineWidth = 5.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 19); ctx.quadraticCurveTo(-3, 0, -2, -20); ctx.stroke();
  ctx.strokeStyle = '#7d5430'; ctx.lineWidth = 5.5;
  for (var ty = 14; ty > -18; ty -= 6) {
    var tx = (ty > 0) ? (ty * -0.06) : (ty * -0.08);
    ctx.beginPath(); ctx.moveTo(tx - 2.4, ty); ctx.lineTo(tx + 2.4, ty - 1.2); ctx.stroke();
  }
  var crownX = -2, crownY = -21;
  // coconuts
  ctx.fillStyle = '#6e4a26';
  ctx.beginPath(); ctx.arc(crownX - 3, crownY + 3, 2.4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(crownX + 2, crownY + 4, 2.2, 0, Math.PI*2); ctx.fill();
  // fronds: arc OUTWARD from the crown and droop at the tips (side-on fan)
  var fronds = [-2.55, -1.95, -1.3, -0.55, -1.6, -2.25, -0.95];
  var palette = ['#2fa366', '#3dbb73', '#1f8a55'];
  for (var i = 0; i < fronds.length; i++) {
    var ang = fronds[i];
    var len = 20 + (i % 3) * 3;
    var ex = crownX + Math.cos(ang) * len;
    var ey = crownY + Math.sin(ang) * len + 6;        // +6 = droop at the tip
    var mx = crownX + Math.cos(ang) * len * 0.5;
    var my = crownY + Math.sin(ang) * len * 0.5 - 4;  // bow upward in the middle
    ctx.strokeStyle = palette[i % palette.length];
    ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(crownX, crownY); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(20,80,45,0.5)';
    for (var k = 0.35; k < 0.95; k += 0.3) {
      var lx = crownX + (mx - crownX) * 2 * k * (1 - k) + (ex - crownX) * k * k;
      var ly = crownY + (my - crownY) * 2 * k * (1 - k) + (ey - crownY) * k * k;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 3, ly + 3); ctx.stroke();
    }
  }
  ctx.restore();
}
function drawCactusV046(ctx, e) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.scale || 1, e.scale || 1);
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(0, 18, 16, 7, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#3f8b55'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0,18); ctx.lineTo(0,-20); ctx.stroke();
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-2,-4); ctx.lineTo(-17,-4); ctx.lineTo(-17,-17); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3,2); ctx.lineTo(18,2); ctx.lineTo(18,-10); ctx.stroke();
  ctx.restore();
}
function drawPineV046(ctx, e) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.scale || 1, e.scale || 1);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(0, 20, 18, 7, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#6d442b'; ctx.fillRect(-3, 2, 6, 20);
  ctx.fillStyle = '#1f5f3d'; [-20,-8,4].forEach((y,i)=>{ ctx.beginPath(); ctx.moveTo(0,y-22); ctx.lineTo(-20+i*3,y+10); ctx.lineTo(20-i*3,y+10); ctx.closePath(); ctx.fill(); });
  ctx.restore();
}
function drawCartV046(ctx, e) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot || 0);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, 10, 22, 8, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f2f3df'; roundRect(ctx, -19, -8, 38, 17, 6); ctx.fill();
  ctx.strokeStyle = '#6b745f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10,-8); ctx.lineTo(-5,-24); ctx.lineTo(10,-24); ctx.lineTo(16,-8); ctx.stroke();
  ctx.fillStyle = '#202820'; [-12,12].forEach(x=>{ ctx.beginPath(); ctx.arc(x, 9, 5, 0, Math.PI*2); ctx.fill(); });
  ctx.restore();
}
function drawRocksV046(ctx, e) { for (let i=0;i<4;i++) drawRock(ctx,{x:e.x+i*8-12,y:e.y+(i%2)*5,scale:.8}); }
function drawReedsV046(ctx, e) { drawReeds(ctx,{x:e.x,y:e.y,scale:1.2}); }
function drawWallV046(ctx, e) { drawStoneWallPreview(ctx,{x:e.x,y:e.y,rotation:e.rot||0,scale:1.2}); }

function drawThemeExtrasV046(ctx, hole) {
  (hole.themeExtras || []).forEach(e => {
    if (e.type === 'palm') drawPalmV046(ctx, e);
    else if (e.type === 'cactus') drawCactusV046(ctx, e);
    else if (e.type === 'pine') drawPineV046(ctx, e);
    else if (e.type === 'cart') drawCartV046(ctx, e);
    else if (e.type === 'rocks') drawRocksV046(ctx, e);
    else if (e.type === 'reeds') drawReedsV046(ctx, e);
    else if (e.type === 'wall') drawWallV046(ctx, e);
  });
}

const drawCourseBeforeV046 = drawCourse;
drawCourse = function drawCourseV046(ctx, hole, W, H, timeMs, showSlope) {
  const theme = themeForHoleV046(hole);
  drawThemedRoughV046(ctx, W, H, theme);
  drawThemedWaterV046(ctx, hole, timeMs, theme);
  drawThemedFairwayV046(ctx, hole, theme);
  drawPolygonFill(ctx, hole.tee, theme.tee, 'rgba(44,87,42,0.5)', 2);
  drawThemedBunkersV046(ctx, hole, theme);
  drawThemedGreenV046(ctx, hole, theme);
  drawTrees(ctx, hole);
  drawProps(ctx, hole);
  drawThemeExtrasV046(ctx, hole);
  drawCupAndFlag(ctx, hole);
  if (showSlope) drawSlopeRead(ctx, hole, timeMs);
};

if (typeof renderCourseMenuV045 === 'function') renderCourseMenuV045();

const drawOverlayBeforeBuildV046 = drawOverlayInfo;
drawOverlayInfo = function drawOverlayWithBuildV046() {
  drawOverlayBeforeBuildV046();
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
  ctx.fillText('v0.46', x, y + 0.5);
  ctx.restore();
};
