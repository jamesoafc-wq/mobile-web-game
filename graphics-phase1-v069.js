// graphics-phase1-v069.js
// Phase 1 graphics polish: tree/prop shadows, ball/flight shadow, landing effects,
// tiny divots/pitch marks, and cup/flag polish.
// Designed as a drop-in script loaded AFTER your current game scripts.
// Visual-only: does not alter shot physics, wind, UI layout, or course tile sizing.

(function () {
  if (window.graphicsPhase1V069Loaded) return;
  window.graphicsPhase1V069Loaded = true;

  const MAX_FX = 80;
  const MAX_MARKS = 90;
  const landingFxV069 = [];
  const groundMarksV069 = [];

  function nowV069() {
    return performance.now ? performance.now() : Date.now();
  }

  function clampV069(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function rgbaV069(hex, alpha) {
    if (typeof rgbaV057 === 'function') return rgbaV057(hex, alpha);
    const h = String(hex || '#ffffff').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function currentThemeV069() {
    try {
      if (typeof themeForHoleV046 === 'function' && typeof hole !== 'undefined') return themeForHoleV046(hole) || {};
    } catch (_) {}
    return {};
  }

  function activeCourseKeyV069() {
    try {
      if (typeof activeCourseV045 !== 'undefined' && activeCourseV045 && activeCourseV045.id) return String(activeCourseV045.id).toLowerCase();
      if (typeof selectedCourseV045 !== 'undefined' && selectedCourseV045 && selectedCourseV045.id) return String(selectedCourseV045.id).toLowerCase();
      const t = currentThemeV069();
      return String(t.id || t.key || t.name || 'willow').toLowerCase();
    } catch (_) {
      return 'willow';
    }
  }

  function addFxV069(type, x, y, opts = {}) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    landingFxV069.push({ type, x, y, born: nowV069(), ...opts });
    while (landingFxV069.length > MAX_FX) landingFxV069.shift();
  }

  function addMarkV069(type, x, y, opts = {}) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    groundMarksV069.push({ type, x, y, born: nowV069(), rot: (Math.random() - 0.5) * 1.2, ...opts });
    while (groundMarksV069.length > MAX_MARKS) groundMarksV069.shift();
  }

  function isDivotClubV069(clubKey) {
    return /iron|wedge/i.test(String(clubKey || ''));
  }

  function recordLandingV069(angle, lie, carryYards, clubKey) {
    if (typeof ball === 'undefined') return;
    const x = ball.x;
    const y = ball.y;
    const key = String(clubKey || '');
    const landingLie = String(lie || '');
    const strength = clampV069((carryYards || 80) / 170, 0.35, 1.25);

    if (landingLie === 'water') {
      addFxV069('water', x, y, { strength, angle });
      return;
    }

    if (landingLie === 'sand') {
      addFxV069('sand', x, y, { strength, angle });
      return;
    }

    if (landingLie === 'green' || landingLie === 'fringe') {
      addFxV069('green', x, y, { strength, angle });
      if (key !== 'putter') addMarkV069('pitch', x, y, { strength, angle });
      return;
    }

    addFxV069(landingLie === 'rough' ? 'rough' : 'grass', x, y, { strength, angle });
    if (isDivotClubV069(key) && landingLie !== 'tee') {
      addMarkV069('divot', x, y, { strength, angle });
    }
  }

  if (typeof startLandingRoll === 'function') {
    const startLandingRollBeforeV069 = startLandingRoll;
    startLandingRoll = function startLandingRollGraphicsV069(angle, lie, carryYards, clubKey) {
      recordLandingV069(angle, lie, carryYards, clubKey);
      return startLandingRollBeforeV069.apply(this, arguments);
    };
  }

  if (typeof applyPenalty === 'function') {
    const applyPenaltyBeforeV069 = applyPenalty;
    applyPenalty = function applyPenaltyGraphicsV069(messageText) {
      if (typeof ball !== 'undefined') addFxV069('water', ball.x, ball.y, { strength: 1.05, angle: 0 });
      return applyPenaltyBeforeV069.apply(this, arguments);
    };
  }

  function drawSoftEllipseV069(x, y, rx, ry, color, blur = 0) {
    const oldBlur = ctx.shadowBlur;
    const oldColor = ctx.shadowColor;
    if (blur) {
      ctx.shadowBlur = blur;
      ctx.shadowColor = color;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = oldBlur;
    ctx.shadowColor = oldColor;
  }

  function drawObjectShadowV069(x, y, rx, ry, alpha = 0.18) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    drawSoftEllipseV069(x + 5.5, y + 7.5, rx, ry, `rgba(8,18,10,${alpha})`, 5);
    ctx.restore();
  }

  function drawTreeAndPropShadowsV069() {
    if (typeof ctx === 'undefined' || typeof hole === 'undefined') return;
    ctx.save();

    const trees = Array.isArray(hole.trees) ? hole.trees : [];
    trees.forEach(tree => {
      const x = Number(tree.x);
      const y = Number(tree.y);
      const r = Number(tree.r || tree.radius || tree.size || 13);
      if (Number.isFinite(x) && Number.isFinite(y)) drawObjectShadowV069(x, y, r * 0.9, r * 0.48, 0.16);
    });

    const propLists = ['props', 'rocks', 'reeds', 'palms', 'pines', 'walls'];
    propLists.forEach(name => {
      const list = Array.isArray(hole[name]) ? hole[name] : [];
      list.forEach(p => {
        const x = Number(p.x ?? p.cx ?? (p.x1 + p.x2) / 2);
        const y = Number(p.y ?? p.cy ?? (p.y1 + p.y2) / 2);
        const w = Number(p.w || p.width || p.r || p.radius || p.size || 10);
        const h = Number(p.h || p.height || p.r || p.radius || p.size || 8);
        if (Number.isFinite(x) && Number.isFinite(y)) drawObjectShadowV069(x, y, Math.max(5, w * 0.7), Math.max(3, h * 0.45), 0.13);
      });
    });

    // Bridges/carts/sign-like objects are sometimes kept inside hole.decorations or hole.themeProps.
    ['decorations', 'themeProps'].forEach(name => {
      const list = Array.isArray(hole[name]) ? hole[name] : [];
      list.forEach(p => {
        const x = Number(p.x ?? p.cx);
        const y = Number(p.y ?? p.cy);
        const w = Number(p.w || p.width || p.size || 12);
        const h = Number(p.h || p.height || p.size || 8);
        if (Number.isFinite(x) && Number.isFinite(y)) drawObjectShadowV069(x, y, w * 0.7, h * 0.45, 0.12);
      });
    });

    ctx.restore();
  }

  function drawCupAndFlagPolishV069() {
    if (typeof hole === 'undefined' || !hole.cup) return;
    const cup = hole.cup;
    const x = Number(cup.x);
    const y = Number(cup.y);
    const r = Number(cup.r || 4.2);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const wind = typeof windStateV057 !== 'undefined' ? windStateV057 : { mph: 0, angle: 0 };
    const flutter = Math.sin(nowV069() / 130 + wind.mph * 0.1) * clampV069(wind.mph / 26, 0.08, 0.75);
    const putting = typeof isPuttingView === 'function' ? isPuttingView() : false;

    ctx.save();

    if (putting) {
      const pulse = 0.5 + Math.sin(nowV069() / 520) * 0.5;
      ctx.strokeStyle = `rgba(210,255,220,${0.18 + pulse * 0.08})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, r + 7.5 + pulse * 1.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // flag shadow
    ctx.strokeStyle = 'rgba(5,10,6,0.18)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x + 3.5, y + 3.8);
    ctx.lineTo(x + 13, y + 8.5);
    ctx.stroke();

    // cup rim
    ctx.fillStyle = 'rgba(10,18,12,0.78)';
    ctx.beginPath();
    ctx.arc(x, y, r + 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(230,255,230,0.55)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(x - 0.3, y - 0.2, r + 1.35, -0.15, Math.PI * 1.18);
    ctx.stroke();

    // pole and fluttering flag
    ctx.strokeStyle = 'rgba(236,245,226,0.86)';
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 1);
    ctx.lineTo(x + 2, y - 23);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,93,82,0.9)';
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 23);
    ctx.quadraticCurveTo(x + 12 + flutter * 5, y - 20.5, x + 17 + flutter * 3, y - 16.5);
    ctx.quadraticCurveTo(x + 10 + flutter * 4, y - 15, x + 2, y - 15.8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawGroundMarksV069() {
    const now = nowV069();
    ctx.save();
    groundMarksV069.forEach(mark => {
      const age = now - mark.born;
      const fade = clampV069(1 - age / 130000, 0.18, 1);
      ctx.save();
      ctx.translate(mark.x, mark.y);
      ctx.rotate(mark.rot || 0);

      if (mark.type === 'divot') {
        const s = 1.8 + (mark.strength || 0.7) * 1.2;
        ctx.fillStyle = `rgba(45,47,24,${0.28 * fade})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 1.55, s * 0.58, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(125,105,55,${0.16 * fade})`;
        ctx.beginPath();
        ctx.ellipse(-0.5, -0.15, s * 1.05, s * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (mark.type === 'pitch') {
        const s = 2.4 + (mark.strength || 0.7) * 1.4;
        ctx.strokeStyle = `rgba(220,255,225,${0.18 * fade})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 1.2, s * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(30,70,38,${0.14 * fade})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.56, s * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
    ctx.restore();
  }

  function drawLandingFxV069() {
    const now = nowV069();
    ctx.save();

    for (let i = landingFxV069.length - 1; i >= 0; i -= 1) {
      const fx = landingFxV069[i];
      const age = now - fx.born;
      const life = fx.type === 'water' ? 1250 : fx.type === 'sand' ? 900 : 640;
      const t = age / life;
      if (t >= 1) {
        landingFxV069.splice(i, 1);
        continue;
      }
      const inv = 1 - t;
      const s = fx.strength || 0.8;
      const x = fx.x;
      const y = fx.y;

      if (fx.type === 'water') {
        ctx.strokeStyle = `rgba(190,245,255,${0.45 * inv})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(x, y, 5 + t * 20 * s, 2.5 + t * 9 * s, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${0.24 * inv})`;
        ctx.beginPath();
        ctx.ellipse(x + 1.5, y - 0.5, 2 + t * 8 * s, 1 + t * 4 * s, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (fx.type === 'sand') {
        for (let j = 0; j < 7; j += 1) {
          const a = (Math.PI * 2 * j) / 7 + (fx.angle || 0) * 0.3;
          ctx.fillStyle = `rgba(233,200,134,${0.25 * inv})`;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * t * 11 * s, y + Math.sin(a) * t * 6 * s, 2.5 * inv, 1.4 * inv, a, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (fx.type === 'green') {
        ctx.strokeStyle = `rgba(220,255,220,${0.24 * inv})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x, y, 4 + t * 9 * s, 2 + t * 4.8 * s, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const color = fx.type === 'rough' ? 'rgba(155,218,118,' : 'rgba(190,235,130,';
        for (let j = 0; j < 6; j += 1) {
          const a = (Math.PI * 2 * j) / 6 + (fx.angle || 0);
          ctx.fillStyle = `${color}${0.17 * inv})`;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * t * 7 * s, y + Math.sin(a) * t * 4 * s, 2.2 * inv, 0.9 * inv, a, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  function drawDynamicBallShadowV069() {
    if (typeof ball === 'undefined') return;
    const scale = Number(ball.visualScale || 1);
    const airborne = clampV069(scale - 1, 0, 2.2);
    const r = Number(ball.radius || 5);
    const alpha = clampV069(0.28 - airborne * 0.12, 0.07, 0.28);
    const rx = r * (1.15 + airborne * 1.15);
    const ry = r * (0.52 + airborne * 0.25);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    drawSoftEllipseV069(ball.x + airborne * 1.4, ball.y + 5 + airborne * 2.2, rx, ry, `rgba(4,10,6,${alpha})`, airborne > 0.15 ? 4 : 1.5);
    ctx.restore();
  }

  if (typeof drawCourse === 'function') {
    const drawCourseBeforeV069 = drawCourse;
    drawCourse = function drawCourseGraphicsPhase1V069() {
      drawCourseBeforeV069.apply(this, arguments);
      drawTreeAndPropShadowsV069();
      drawCupAndFlagPolishV069();
    };
  }

  if (typeof drawBall === 'function') {
    const drawBallBeforeV069 = drawBall;
    drawBall = function drawBallGraphicsPhase1V069() {
      drawGroundMarksV069();
      drawLandingFxV069();
      drawDynamicBallShadowV069();
      drawBallBeforeV069.apply(this, arguments);
    };
  }

  // Public debug hook, useful if you want to test visuals from the console.
  window.graphicsPhase1V069 = {
    addFx: addFxV069,
    addMark: addMarkV069
  };
})();
