// graphics-phase23-v070.js
// Phase 2 + 3 graphics polish:
// layered grass, green detail, bunker polish, water shimmer, and course identity accents.
// Designed to load AFTER graphics-phase1-v069.js and all current game scripts.
// Visual-only: no shot physics, wind, UI layout, or tile-size changes.

(function () {
  if (window.graphicsPhase23V070Loaded) return;
  window.graphicsPhase23V070Loaded = true;

  function nowV070() {
    return performance.now ? performance.now() : Date.now();
  }

  function clampV070(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function rgbaV070(hex, alpha) {
    if (typeof rgbaV057 === 'function') return rgbaV057(hex, alpha);
    const h = String(hex || '#ffffff').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function themeV070() {
    try {
      if (typeof themeForHoleV046 === 'function' && typeof hole !== 'undefined') return themeForHoleV046(hole) || {};
    } catch (_) {}
    return {};
  }

  function courseKeyV070() {
    try {
      if (typeof activeCourseV045 !== 'undefined' && activeCourseV045 && activeCourseV045.id) return String(activeCourseV045.id).toLowerCase();
      if (typeof selectedCourseV045 !== 'undefined' && selectedCourseV045 && selectedCourseV045.id) return String(selectedCourseV045.id).toLowerCase();
      const t = themeV070();
      return String(t.id || t.key || t.name || 'willow').toLowerCase();
    } catch (_) {
      return 'willow';
    }
  }

  function pathFeatureV070(feature) {
    if (!feature) return false;
    const points = feature.points || feature.poly || feature.path;
    if (Array.isArray(points) && points.length >= 3) {
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = Number(p.x ?? p[0]);
        const y = Number(p.y ?? p[1]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      return true;
    }

    if (Number.isFinite(feature.x) && Number.isFinite(feature.y)) {
      const x = Number(feature.x);
      const y = Number(feature.y);
      const rx = Number(feature.rx || feature.r || feature.radius || feature.w || feature.width || 16);
      const ry = Number(feature.ry || feature.r || feature.radius || feature.h || feature.height || rx * 0.7);
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, Number(feature.rot || feature.rotation || 0), 0, Math.PI * 2);
      return true;
    }

    if (Number.isFinite(feature.x1) && Number.isFinite(feature.y1) && Number.isFinite(feature.x2) && Number.isFinite(feature.y2)) {
      const width = Number(feature.width || feature.w || 20);
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(feature.x1, feature.y1);
      ctx.lineTo(feature.x2, feature.y2);
      ctx.lineWidth = width;
      return 'stroke';
    }

    return false;
  }

  function featureListV070(names) {
    if (typeof hole === 'undefined') return [];
    const out = [];
    names.forEach(name => {
      const value = hole[name];
      if (Array.isArray(value)) out.push(...value);
      else if (value) out.push(value);
    });
    return out;
  }

  function clipFeatureAndDrawV070(feature, draw) {
    const result = pathFeatureV070(feature);
    if (!result) return;
    ctx.save();
    if (result === 'stroke') {
      ctx.strokeStyle = 'transparent';
      ctx.stroke();
      // Approximate line features with normal drawing but without clipping fallback.
      draw(false);
    } else {
      ctx.clip();
      draw(true);
    }
    ctx.restore();
  }

  function drawLongStripesV070(angle, spacing, color, alpha, width = 1.4) {
    const diag = Math.max(canvas.width, canvas.height) * 1.7;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.strokeStyle = color.replace('ALPHA', alpha);
    ctx.lineWidth = width;
    for (let x = -diag; x < diag; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, -diag);
      ctx.lineTo(x, diag);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRoughGrainV070() {
    const key = courseKeyV070();
    const color =
      key.includes('dune') ? 'rgba(245,210,110,ALPHA)' :
      key.includes('pine') ? 'rgba(150,205,150,ALPHA)' :
      key.includes('silver') ? 'rgba(185,220,218,ALPHA)' :
      key.includes('coral') ? 'rgba(236,208,138,ALPHA)' :
      'rgba(195,235,160,ALPHA)';

    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    drawLongStripesV070(-0.42, 18, color, 0.06, 1);
    drawLongStripesV070(0.78, 27, color, 0.035, 1);
    ctx.restore();
  }

  function drawFairwayPatternsV070() {
    const fairways = featureListV070(['fairway', 'fairways']);
    const key = courseKeyV070();
    const stripeColor =
      key.includes('dune') ? 'rgba(255,232,144,ALPHA)' :
      key.includes('pine') ? 'rgba(196,232,172,ALPHA)' :
      key.includes('silver') ? 'rgba(200,235,225,ALPHA)' :
      key.includes('coral') ? 'rgba(255,226,156,ALPHA)' :
      'rgba(218,255,176,ALPHA)';

    fairways.forEach((f, idx) => {
      clipFeatureAndDrawV070(f, () => {
        ctx.globalCompositeOperation = 'soft-light';
        drawLongStripesV070(idx % 2 ? -0.22 : 0.18, 22, stripeColor, 0.15, 2.2);
        drawLongStripesV070(idx % 2 ? 0.68 : -0.72, 38, 'rgba(32,75,32,ALPHA)', 0.035, 1);
      });
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawGreenDetailsV070() {
    const greens = featureListV070(['green', 'greens']);
    const t = nowV070() / 900;
    greens.forEach(g => {
      clipFeatureAndDrawV070(g, () => {
        ctx.save();
        ctx.globalCompositeOperation = 'soft-light';
        drawLongStripesV070(0.28, 13, 'rgba(235,255,225,ALPHA)', 0.13, 0.9);
        drawLongStripesV070(-0.88, 21, 'rgba(20,85,35,ALPHA)', 0.045, 0.8);
        ctx.restore();
      });

      const x = Number(g.x ?? (typeof hole !== 'undefined' && hole.cup ? hole.cup.x : 210));
      const y = Number(g.y ?? (typeof hole !== 'undefined' && hole.cup ? hole.cup.y : 210));
      const rx = Number(g.rx || g.r || g.radius || 32);
      const ry = Number(g.ry || g.r || g.radius || rx * 0.72);

      ctx.save();
      ctx.strokeStyle = 'rgba(230,255,220,0.20)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y, rx + 4, ry + 4, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(30,80,38,0.13)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.ellipse(x + Math.sin(t + i) * 1.8, y + Math.cos(t * 0.7 + i) * 1.2, rx * (0.36 + i * 0.13), ry * (0.30 + i * 0.11), 0.04 * i, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (typeof hole !== 'undefined' && hole.cup) {
        const cx = hole.cup.x;
        const cy = hole.cup.y;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 52);
        grad.addColorStop(0, 'rgba(255,255,210,0.06)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * 1.35, ry * 1.05, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawBunkerPolishV070() {
    const bunkers = featureListV070(['bunker', 'bunkers', 'sand']);
    bunkers.forEach((b, idx) => {
      const x = Number(b.x || b.cx || 0);
      const y = Number(b.y || b.cy || 0);
      const rx = Number(b.rx || b.r || b.radius || b.w || 18);
      const ry = Number(b.ry || b.r || b.radius || b.h || rx * 0.65);

      ctx.save();
      const path = pathFeatureV070(b);
      if (path && path !== 'stroke') {
        // inner lip shadow
        ctx.strokeStyle = 'rgba(90,58,28,0.22)';
        ctx.lineWidth = 3.2;
        ctx.stroke();

        ctx.clip();
        ctx.strokeStyle = 'rgba(122,91,48,0.20)';
        ctx.lineWidth = 0.75;
        ctx.rotate(Number(b.rot || b.rotation || 0) * 0.15);
        for (let yy = y - ry * 1.4 - 20; yy < y + ry * 1.4 + 20; yy += 7) {
          ctx.beginPath();
          ctx.moveTo(x - rx * 1.7 - 20, yy + Math.sin(yy * 0.12 + idx) * 1.6);
          ctx.quadraticCurveTo(x, yy + 3.2, x + rx * 1.7 + 20, yy + Math.cos(yy * 0.1) * 1.5);
          ctx.stroke();
        }
      }
      ctx.restore();
    });
  }

  function drawWaterAnimationV070() {
    const waters = featureListV070(['water', 'waters', 'streams', 'creek']);
    const key = courseKeyV070();
    const shimmer =
      key.includes('coral') ? 'rgba(155,255,250,ALPHA)' :
      key.includes('silver') ? 'rgba(210,245,255,ALPHA)' :
      key.includes('pine') ? 'rgba(185,235,230,ALPHA)' :
      'rgba(175,235,255,ALPHA)';
    const time = nowV070() / 650;

    waters.forEach((w, idx) => {
      const x = Number(w.x || w.cx || (w.x1 + w.x2) / 2 || 210);
      const y = Number(w.y || w.cy || (w.y1 + w.y2) / 2 || 210);
      const rx = Number(w.rx || w.r || w.radius || w.w || 28);
      const ry = Number(w.ry || w.r || w.radius || w.h || rx * 0.55);

      ctx.save();
      const path = pathFeatureV070(w);
      if (path && path !== 'stroke') {
        ctx.strokeStyle = 'rgba(5,38,46,0.18)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.clip();
      }
      ctx.strokeStyle = shimmer.replace('ALPHA', '0.20');
      ctx.lineWidth = 1;
      for (let i = -3; i < 4; i += 1) {
        ctx.beginPath();
        const yy = y + i * 8 + Math.sin(time + i + idx) * 2;
        ctx.ellipse(x + Math.cos(time + i) * 1.5, yy, rx * (0.55 + (i + 4) * 0.025), Math.max(1.2, ry * 0.08), 0.02 * i, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function drawCourseIdentityV070() {
    const key = courseKeyV070();
    ctx.save();

    if (key.includes('willow')) {
      ctx.fillStyle = 'rgba(200,245,150,0.12)';
      for (let i = 0; i < 16; i += 1) {
        const x = (i * 71 + 29) % canvas.width;
        const y = (i * 113 + 47) % canvas.height;
        ctx.beginPath();
        ctx.ellipse(x, y, 2.5, 1.1, i * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (key.includes('coral')) {
      ctx.globalCompositeOperation = 'soft-light';
      drawLongStripesV070(0.45, 26, 'rgba(255,185,115,ALPHA)', 0.075, 1.1);
    } else if (key.includes('dune')) {
      ctx.fillStyle = 'rgba(238,205,122,0.11)';
      for (let i = 0; i < 18; i += 1) {
        const x = (i * 59 + 34) % canvas.width;
        const y = (i * 97 + 12) % canvas.height;
        ctx.fillRect(x, y, 4, 1);
      }
    } else if (key.includes('pine')) {
      ctx.strokeStyle = 'rgba(28,58,42,0.11)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 22; i += 1) {
        const x = (i * 43 + 18) % canvas.width;
        const y = (i * 131 + 8) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(x - 3, y);
        ctx.lineTo(x + 4, y + 1.8);
        ctx.stroke();
      }
    } else if (key.includes('silver')) {
      ctx.strokeStyle = 'rgba(210,245,255,0.12)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 14; i += 1) {
        const x = (i * 67 + 21) % canvas.width;
        const y = (i * 89 + 39) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(x - 4, y);
        ctx.lineTo(x + 4, y + 0.5);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  if (typeof drawCourse === 'function') {
    const drawCourseBeforeV070 = drawCourse;
    drawCourse = function drawCourseGraphicsPhase23V070() {
      drawCourseBeforeV070.apply(this, arguments);
      if (typeof ctx === 'undefined' || typeof canvas === 'undefined') return;
      drawRoughGrainV070();
      drawFairwayPatternsV070();
      drawGreenDetailsV070();
      drawBunkerPolishV070();
      drawWaterAnimationV070();
      drawCourseIdentityV070();
    };
  }

  window.graphicsPhase23V070 = {
    drawRoughGrain: drawRoughGrainV070,
    drawFairwayPatterns: drawFairwayPatternsV070,
    drawGreenDetails: drawGreenDetailsV070,
    drawBunkerPolish: drawBunkerPolishV070,
    drawWaterAnimation: drawWaterAnimationV070
  };
})();
