// graphics-overhaul-v071.js
// Visual overhaul patch: Illustrated Course Renderer + Animated Living Course + Sprite Props.
// Load AFTER all existing game scripts.
// Visual-only overlay: no gameplay physics or UI layout changes.

(function () {
  if (window.graphicsOverhaulV071Loaded) return;
  window.graphicsOverhaulV071Loaded = true;

  const state = {
    ambientSeed: 0,
    lastCourseKey: '',
    particles: []
  };

  function now() { return performance.now ? performance.now() : Date.now(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(seed) {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }
  function rgba(hex, alpha) {
    if (typeof rgbaV057 === 'function') return rgbaV057(hex, alpha);
    const h = String(hex || '#ffffff').replace('#', '');
    const s = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padStart(6, '0').slice(0, 6);
    const n = parseInt(s, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }
  function activeCourseKey() {
    try {
      if (typeof activeCourseV045 !== 'undefined' && activeCourseV045 && activeCourseV045.id) return String(activeCourseV045.id).toLowerCase();
      if (typeof selectedCourseV045 !== 'undefined' && selectedCourseV045 && selectedCourseV045.id) return String(selectedCourseV045.id).toLowerCase();
    } catch (_) {}
    try {
      if (typeof themeForHoleV046 === 'function' && typeof hole !== 'undefined') {
        const t = themeForHoleV046(hole) || {};
        return String(t.id || t.key || t.name || 'willow').toLowerCase();
      }
    } catch (_) {}
    return 'willow';
  }

  function profile() {
    const key = activeCourseKey();
    const common = {
      lightAngle: -0.65,
      shadow: 'rgba(8,14,10,0.18)',
      cupGlow: '#efffc7',
      fairwayStripeA: 'rgba(255,255,255,0.12)',
      fairwayStripeB: 'rgba(24,58,20,0.05)',
      greenShade: 'rgba(28,70,34,0.12)',
      waterShine: '#d9fbff'
    };
    if (key.includes('coral')) return {
      ...common,
      key,
      roughDust: '#e8c98d',
      accent: '#ffca93',
      leaf: '#ffdb9f',
      fairwayStripeA: 'rgba(255,244,190,0.14)',
      fairwayStripeB: 'rgba(105,88,42,0.05)',
      waterShine: '#bafefd',
      waterEdge: '#0f7f88',
      treeFill: '#38a37a'
    };
    if (key.includes('dune')) return {
      ...common,
      key,
      roughDust: '#efd083',
      accent: '#f1c36f',
      leaf: '#f2d494',
      fairwayStripeA: 'rgba(255,242,186,0.13)',
      fairwayStripeB: 'rgba(120,96,40,0.06)',
      waterShine: '#d5f2ff',
      waterEdge: '#5a8d93',
      treeFill: '#7ba06b'
    };
    if (key.includes('pine')) return {
      ...common,
      key,
      roughDust: '#8ec28c',
      accent: '#9ad8a0',
      leaf: '#bfd9bf',
      fairwayStripeA: 'rgba(222,244,214,0.12)',
      fairwayStripeB: 'rgba(18,52,32,0.06)',
      waterShine: '#d8ffff',
      waterEdge: '#1d5b5a',
      treeFill: '#3f7958'
    };
    if (key.includes('silver')) return {
      ...common,
      key,
      roughDust: '#b9dbe0',
      accent: '#b2ddff',
      leaf: '#d8f5ff',
      fairwayStripeA: 'rgba(228,250,255,0.13)',
      fairwayStripeB: 'rgba(42,72,89,0.06)',
      waterShine: '#ecffff',
      waterEdge: '#2d7a90',
      treeFill: '#5a94a2'
    };
    return {
      ...common,
      key: 'willow',
      roughDust: '#bfe59f',
      accent: '#d8f89a',
      leaf: '#daf4a8',
      waterShine: '#d7fbff',
      waterEdge: '#236c5b',
      treeFill: '#4f9d57'
    };
  }

  function gather(names) {
    if (typeof hole === 'undefined' || !hole) return [];
    const out = [];
    names.forEach(name => {
      const v = hole[name];
      if (Array.isArray(v)) out.push(...v);
      else if (v) out.push(v);
    });
    return out;
  }

  function beginFeaturePath(feature) {
    if (!feature) return false;
    const points = feature.points || feature.poly || feature.path;
    if (Array.isArray(points) && points.length >= 3) {
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = Number(p.x ?? p[0]);
        const y = Number(p.y ?? p[1]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      return 'shape';
    }
    const x = Number(feature.x ?? feature.cx);
    const y = Number(feature.y ?? feature.cy);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      const rx = Number(feature.rx || feature.r || feature.radius || feature.w || feature.width || 16);
      const ry = Number(feature.ry || feature.r || feature.radius || feature.h || feature.height || rx * 0.7);
      ctx.beginPath();
      ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), Number(feature.rot || feature.rotation || 0), 0, Math.PI * 2);
      return 'shape';
    }
    if (Number.isFinite(feature.x1) && Number.isFinite(feature.y1) && Number.isFinite(feature.x2) && Number.isFinite(feature.y2)) {
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.moveTo(feature.x1, feature.y1);
      ctx.lineTo(feature.x2, feature.y2);
      ctx.lineWidth = Number(feature.width || feature.w || 18);
      return 'stroke';
    }
    return false;
  }

  function withClip(feature, fn) {
    const mode = beginFeaturePath(feature);
    if (!mode) return;
    ctx.save();
    if (mode === 'shape') ctx.clip();
    fn(mode);
    ctx.restore();
  }

  function longStripePass(angle, spacing, color, width) {
    const w = canvas.width, h = canvas.height;
    const d = Math.sqrt(w * w + h * h) * 1.3;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (let x = -d; x < d; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, -d);
      ctx.lineTo(x, d);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSunWash(p) {
    const g = ctx.createLinearGradient(0, canvas.height * 0.1, canvas.width, canvas.height);
    g.addColorStop(0, 'rgba(255,255,255,0.05)');
    g.addColorStop(0.35, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.05)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const v = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.48, canvas.height * 0.2, canvas.width * 0.5, canvas.height * 0.5, canvas.height * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawRoughPainterly(p) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    longStripePass(-0.42, 18, rgba(p.roughDust, 0.08), 1.2);
    longStripePass(0.83, 28, 'rgba(0,0,0,0.025)', 1.0);
    for (let i = 0; i < 44; i++) {
      const x = (i * 79 + 33) % canvas.width;
      const y = (i * 127 + 19) % canvas.height;
      ctx.fillStyle = rgba(p.roughDust, 0.045);
      ctx.beginPath();
      ctx.ellipse(x, y, 14 + (i % 4) * 6, 4 + (i % 3) * 2, (i % 7) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawIllustratedFairways(p) {
    const fairways = gather(['fairway', 'fairways']);
    fairways.forEach((f, idx) => {
      withClip(f, () => {
        ctx.save();
        ctx.globalCompositeOperation = 'soft-light';
        const ang = idx % 2 ? -0.20 : 0.18;
        longStripePass(ang, 22, p.fairwayStripeA, 2.0);
        longStripePass(ang + 1.3, 38, p.fairwayStripeB, 1.2);

        const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
        g.addColorStop(0, 'rgba(255,255,255,0.04)');
        g.addColorStop(1, 'rgba(0,0,0,0.05)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      });

      const mode = beginFeaturePath(f);
      if (mode) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 2.8;
        ctx.stroke();
        beginFeaturePath(f);
        ctx.strokeStyle = 'rgba(10,34,12,0.08)';
        ctx.lineWidth = 5.5;
        ctx.stroke();
        ctx.restore();
      }
    });
  }

  function drawIllustratedGreens() {
    const greens = gather(['green', 'greens']);
    greens.forEach((g, idx) => {
      const mode = beginFeaturePath(g);
      if (!mode) return;
      ctx.save();
      if (mode === 'shape') {
        ctx.strokeStyle = 'rgba(235,255,228,0.22)';
        ctx.lineWidth = 3.5;
        ctx.stroke();
        beginFeaturePath(g);
        ctx.strokeStyle = 'rgba(28,72,36,0.11)';
        ctx.lineWidth = 7;
        ctx.stroke();

        beginFeaturePath(g);
        ctx.clip();
        ctx.globalCompositeOperation = 'soft-light';
        longStripePass(0.28, 13, 'rgba(230,255,220,0.11)', 1.0);
        longStripePass(-0.9, 20, 'rgba(28,70,36,0.045)', 1.0);

        const cupX = typeof hole !== 'undefined' && hole.cup ? hole.cup.x : (g.x || canvas.width * 0.55);
        const cupY = typeof hole !== 'undefined' && hole.cup ? hole.cup.y : (g.y || canvas.height * 0.26);
        const grad = ctx.createRadialGradient(cupX, cupY, 0, cupX, cupY, 60);
        grad.addColorStop(0, 'rgba(255,255,200,0.07)');
        grad.addColorStop(1, 'rgba(255,255,200,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 4; i++) {
          ctx.strokeStyle = `rgba(35,90,44,${0.07 - i * 0.011})`;
          ctx.lineWidth = 1;
          const x = Number(g.x || cupX);
          const y = Number(g.y || cupY);
          const rx = Number(g.rx || g.r || g.radius || 30) * (0.42 + i * 0.15);
          const ry = Number(g.ry || g.r || g.radius || 24) * (0.40 + i * 0.12);
          ctx.beginPath();
          ctx.ellipse(x, y, rx, ry, idx * 0.07, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    });
  }

  function drawIllustratedBunkers() {
    const bunkers = gather(['bunker', 'bunkers', 'sand']);
    bunkers.forEach((b, idx) => {
      const mode = beginFeaturePath(b);
      if (!mode) return;
      ctx.save();
      if (mode === 'shape') {
        ctx.strokeStyle = 'rgba(96,66,30,0.22)';
        ctx.lineWidth = 4;
        ctx.stroke();
        beginFeaturePath(b);
        ctx.strokeStyle = 'rgba(255,236,195,0.13)';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        beginFeaturePath(b);
        ctx.clip();
        const x = Number(b.x || b.cx || canvas.width * 0.5);
        const y = Number(b.y || b.cy || canvas.height * 0.5);
        const grad = ctx.createRadialGradient(x - 6, y - 5, 2, x, y, Math.max(26, Number(b.rx || b.r || 22) * 1.4));
        grad.addColorStop(0, 'rgba(255,245,218,0.22)');
        grad.addColorStop(1, 'rgba(145,102,50,0.03)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - 70, y - 70, 140, 140);

        ctx.strokeStyle = 'rgba(122,89,49,0.17)';
        ctx.lineWidth = 0.9;
        for (let yy = y - 34; yy < y + 34; yy += 7) {
          ctx.beginPath();
          ctx.moveTo(x - 44, yy + Math.sin(yy * 0.09 + idx) * 1.5);
          ctx.quadraticCurveTo(x, yy + 2.8, x + 44, yy + Math.cos(yy * 0.08 + idx) * 1.3);
          ctx.stroke();
        }
      }
      ctx.restore();
    });
  }

  function drawIllustratedWater(p) {
    const waters = gather(['water', 'waters', 'streams', 'creek']);
    const t = now() / 850;
    waters.forEach((w, idx) => {
      const mode = beginFeaturePath(w);
      if (!mode) return;
      ctx.save();
      if (mode === 'shape') {
        ctx.strokeStyle = rgba(p.waterEdge, 0.28);
        ctx.lineWidth = 4.2;
        ctx.stroke();
        beginFeaturePath(w);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1.3;
        ctx.stroke();
        beginFeaturePath(w);
        ctx.clip();
      }

      const cx = Number(w.x || w.cx || canvas.width * 0.5);
      const cy = Number(w.y || w.cy || canvas.height * 0.5);
      const rx = Math.max(28, Number(w.rx || w.r || w.radius || 24));
      const ry = Math.max(16, Number(w.ry || w.r || w.radius || 18));
      const grad = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
      grad.addColorStop(0, 'rgba(255,255,255,0.05)');
      grad.addColorStop(0.4, 'rgba(15,40,50,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.08)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - rx - 30, cy - ry - 30, rx * 2 + 60, ry * 2 + 60);

      ctx.strokeStyle = rgba(p.waterShine, 0.18);
      ctx.lineWidth = 1.05;
      for (let i = -3; i < 4; i++) {
        ctx.beginPath();
        const yy = cy + i * 8 + Math.sin(t + i + idx) * 2.1;
        ctx.ellipse(cx + Math.cos(t + i * 0.7) * 2.2, yy, rx * (0.48 + (i + 4) * 0.035), Math.max(1.1, ry * 0.09), 0.02 * i, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function initialiseAmbientParticles(p) {
    const key = p.key;
    if (state.lastCourseKey === key && state.particles.length) return;
    state.lastCourseKey = key;
    state.particles = [];
    const count = key.includes('dune') ? 14 : key.includes('pine') ? 10 : key.includes('silver') ? 10 : 12;
    for (let i = 0; i < count; i++) {
      state.particles.push({
        seed: i + 1 + state.ambientSeed,
        x: rand(i * 3.1 + 9.2) * canvas.width,
        y: rand(i * 5.7 + 2.3) * canvas.height,
        size: 2 + rand(i * 1.3 + 7.9) * 3,
        speed: 0.08 + rand(i * 2.8 + 1.1) * 0.14
      });
    }
    state.ambientSeed += 1;
  }

  function drawAmbientLife(p) {
    initialiseAmbientParticles(p);
    const t = now() * 0.001;
    ctx.save();

    if (p.key.includes('dune')) {
      state.particles.forEach((pt, i) => {
        const x = (pt.x + t * (12 + i * 0.7)) % (canvas.width + 40) - 20;
        const y = pt.y + Math.sin(t + i) * 4;
        ctx.strokeStyle = 'rgba(244,221,145,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 6, y - 1);
        ctx.lineTo(x + 6, y + 1);
        ctx.stroke();
      });
    } else if (p.key.includes('pine')) {
      for (let i = 0; i < 3; i++) {
        const y = canvas.height * (0.22 + i * 0.22) + Math.sin(t * 0.4 + i) * 6;
        const g = ctx.createLinearGradient(0, y, canvas.width, y + 18);
        g.addColorStop(0, 'rgba(215,235,228,0)');
        g.addColorStop(0.15, 'rgba(215,235,228,0.05)');
        g.addColorStop(0.7, 'rgba(215,235,228,0.03)');
        g.addColorStop(1, 'rgba(215,235,228,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, y - 8, canvas.width, 26);
      }
    } else if (p.key.includes('silver')) {
      const waters = gather(['water', 'waters', 'streams', 'creek']);
      waters.slice(0, 4).forEach((w, idx) => {
        const cx = Number(w.x || w.cx || canvas.width * 0.5);
        const cy = Number(w.y || w.cy || canvas.height * 0.5);
        const gx = cx + Math.sin(t * 1.4 + idx) * 12;
        const gy = cy + Math.cos(t * 1.1 + idx) * 7;
        ctx.fillStyle = 'rgba(235,255,255,0.13)';
        ctx.beginPath();
        ctx.ellipse(gx, gy, 2.8, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      state.particles.forEach((pt, i) => {
        const x = (pt.x + Math.sin(t * 0.45 + i) * 18 + t * 3.8) % (canvas.width + 26) - 13;
        const y = (pt.y + Math.cos(t * 0.35 + i) * 10 + Math.sin(t + i) * 2) % canvas.height;
        ctx.fillStyle = rgba(p.leaf, p.key.includes('coral') ? 0.07 : 0.09);
        ctx.beginPath();
        ctx.ellipse(x, y, pt.size, pt.size * 0.45, i * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
  }

  function drawShadow(x, y, rx, ry, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.shadowBlur = 5;
    ctx.shadowColor = `rgba(0,0,0,${alpha})`;
    ctx.fillStyle = `rgba(8,12,8,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x + 5, y + 8, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawDeciduousTree(x, y, scale, p) {
    drawShadow(x, y, 10 * scale, 5 * scale, 0.15);
    ctx.fillStyle = '#5a3e24';
    ctx.fillRect(x - 1.2 * scale, y + 2 * scale, 2.4 * scale, 7 * scale);
    ['#3b8c46', p.treeFill || '#4b9b54', '#67b35e'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + (i - 1) * 4 * scale, y - 1 * scale, 6.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(x - 2 * scale, y - 4 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPineTree(x, y, scale) {
    drawShadow(x, y, 8 * scale, 4.5 * scale, 0.16);
    ctx.fillStyle = '#5b4124';
    ctx.fillRect(x - 1.2 * scale, y + 3 * scale, 2.4 * scale, 7 * scale);
    ctx.fillStyle = '#356c4e';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y - 10 * scale + i * 4.2 * scale);
      ctx.lineTo(x - (8 - i * 1.6) * scale, y - 1 * scale + i * 4.2 * scale);
      ctx.lineTo(x + (8 - i * 1.6) * scale, y - 1 * scale + i * 4.2 * scale);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawPalmTree(x, y, scale) {
    drawShadow(x, y, 10 * scale, 4.5 * scale, 0.16);
    ctx.strokeStyle = '#72512b';
    ctx.lineWidth = 2.1 * scale;
    ctx.beginPath();
    ctx.moveTo(x - 1 * scale, y + 8 * scale);
    ctx.quadraticCurveTo(x + 0.2 * scale, y + 2 * scale, x + 2 * scale, y - 5 * scale);
    ctx.stroke();
    ctx.strokeStyle = '#2d9c70';
    ctx.lineWidth = 1.5 * scale;
    for (let i = 0; i < 5; i++) {
      const a = -1.7 + i * 0.55;
      ctx.beginPath();
      ctx.moveTo(x + 2 * scale, y - 5 * scale);
      ctx.quadraticCurveTo(x + Math.cos(a) * 8 * scale, y - 11 * scale + Math.sin(a) * 3 * scale, x + Math.cos(a) * 12 * scale, y - 6 * scale + Math.sin(a) * 4 * scale);
      ctx.stroke();
    }
  }

  function drawRock(x, y, scale) {
    drawShadow(x, y, 7 * scale, 3.8 * scale, 0.12);
    ctx.fillStyle = '#8d8f8d';
    ctx.beginPath();
    ctx.moveTo(x - 7 * scale, y + 2 * scale);
    ctx.lineTo(x - 2 * scale, y - 6 * scale);
    ctx.lineTo(x + 6 * scale, y - 4 * scale);
    ctx.lineTo(x + 8 * scale, y + 3 * scale);
    ctx.lineTo(x + 1 * scale, y + 6 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.moveTo(x - 2 * scale, y - 5 * scale);
    ctx.lineTo(x + 3 * scale, y - 4 * scale);
    ctx.lineTo(x + 0.5 * scale, y - 1 * scale);
    ctx.closePath();
    ctx.fill();
  }

  function drawCart(x, y, scale, accent) {
    drawShadow(x, y, 8 * scale, 4 * scale, 0.13);
    ctx.fillStyle = '#f0f0ea';
    ctx.fillRect(x - 8 * scale, y - 5 * scale, 16 * scale, 8 * scale);
    ctx.fillStyle = accent || '#8ccf68';
    ctx.fillRect(x - 7 * scale, y - 4 * scale, 14 * scale, 3 * scale);
    ctx.fillStyle = '#2d2d2d';
    [[-5, 4], [5, 4]].forEach(([ox, oy]) => {
      ctx.beginPath();
      ctx.arc(x + ox * scale, y + oy * scale, 2.2 * scale, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawBridge(x, y, w, h) {
    drawShadow(x, y, w * 0.5, h * 0.3, 0.10);
    ctx.fillStyle = '#7b5c38';
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.strokeStyle = 'rgba(235,216,180,0.22)';
    ctx.lineWidth = 1;
    for (let xx = x - w / 2 + 3; xx < x + w / 2 - 2; xx += 5) {
      ctx.beginPath();
      ctx.moveTo(xx, y - h / 2);
      ctx.lineTo(xx, y + h / 2);
      ctx.stroke();
    }
  }

  function drawSign(x, y, scale) {
    drawShadow(x, y, 4 * scale, 2 * scale, 0.1);
    ctx.strokeStyle = '#6f5130';
    ctx.lineWidth = 1.4 * scale;
    ctx.beginPath();
    ctx.moveTo(x, y + 6 * scale);
    ctx.lineTo(x, y - 2 * scale);
    ctx.stroke();
    ctx.fillStyle = '#f7f1da';
    ctx.fillRect(x - 5 * scale, y - 8 * scale, 10 * scale, 6 * scale);
  }

  function inferPropType(prop, p) {
    const text = JSON.stringify(prop || {}).toLowerCase();
    if (text.includes('bridge')) return 'bridge';
    if (text.includes('cart')) return 'cart';
    if (text.includes('reed')) return 'reed';
    if (text.includes('rock') || text.includes('stone')) return 'rock';
    if (text.includes('sign')) return 'sign';
    if (text.includes('wall')) return 'wall';
    if (p.key.includes('dune') && (text.includes('cactus') || text.includes('desert'))) return 'cactus';
    return 'generic';
  }

  function drawPropSprites(p) {
    const trees = gather(['trees']);
    trees.forEach((tree, i) => {
      const x = Number(tree.x);
      const y = Number(tree.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const scale = clamp((Number(tree.r || tree.radius || tree.size || 12) / 12), 0.75, 1.45);
      if (p.key.includes('coral')) drawPalmTree(x, y, scale);
      else if (p.key.includes('pine')) drawPineTree(x, y, scale);
      else if (p.key.includes('dune') && i % 4 === 0) drawPalmTree(x, y, scale * 0.9);
      else drawDeciduousTree(x, y, scale, p);
    });

    const props = gather(['props', 'decorations', 'themeProps', 'rocks', 'reeds', 'walls']);
    props.forEach((prop, i) => {
      const x = Number(prop.x ?? prop.cx ?? (Number(prop.x1) + Number(prop.x2)) / 2);
      const y = Number(prop.y ?? prop.cy ?? (Number(prop.y1) + Number(prop.y2)) / 2);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const type = inferPropType(prop, p);
      const scale = clamp((Number(prop.size || prop.r || prop.radius || prop.w || prop.width || 10) / 12), 0.7, 1.6);
      if (type === 'cart') drawCart(x, y, scale, p.accent);
      else if (type === 'bridge') drawBridge(x, y, Number(prop.w || prop.width || 28), Number(prop.h || prop.height || 8));
      else if (type === 'sign') drawSign(x, y, scale);
      else if (type === 'rock' || type === 'wall') drawRock(x, y, scale);
      else if (type === 'reed') {
        drawShadow(x, y, 5 * scale, 2 * scale, 0.08);
        ctx.strokeStyle = '#7ea261';
        ctx.lineWidth = 1;
        for (let j = 0; j < 6; j++) {
          ctx.beginPath();
          ctx.moveTo(x + (j - 2) * 1.2, y + 5 * scale);
          ctx.quadraticCurveTo(x + (j - 2) * 1.5, y - 3 * scale, x + (j - 2) * 0.6, y - 6 * scale);
          ctx.stroke();
        }
      } else if (type === 'cactus') {
        drawShadow(x, y, 5 * scale, 2.5 * scale, 0.09);
        ctx.fillStyle = '#4d9862';
        ctx.fillRect(x - 2 * scale, y - 8 * scale, 4 * scale, 12 * scale);
        ctx.fillRect(x - 5 * scale, y - 4 * scale, 3 * scale, 7 * scale);
        ctx.fillRect(x + 2 * scale, y - 3 * scale, 3 * scale, 6 * scale);
      } else {
        // tasteful filler prop if no specific type is available
        if (p.key.includes('silver') && i % 3 === 0) drawRock(x, y, scale * 0.9);
      }
    });
  }

  function drawCupPolish(p) {
    if (typeof hole === 'undefined' || !hole.cup) return;
    const x = Number(hole.cup.x), y = Number(hole.cup.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const r = Number(hole.cup.r || 4);
    const wind = typeof windStateV057 !== 'undefined' ? windStateV057 : { mph: 0, angle: 0 };
    const flutter = Math.sin(now() / 140) * clamp(wind.mph / 28, 0.08, 0.8);

    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + 3, y - 1);
    ctx.lineTo(x + 13, y + 4);
    ctx.stroke();

    ctx.fillStyle = 'rgba(14,18,12,0.82)';
    ctx.beginPath();
    ctx.arc(x, y, r + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,255,240,0.55)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(x - 0.2, y - 0.1, r + 1.35, -0.2, Math.PI * 1.15);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(240,248,228,0.92)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 1);
    ctx.lineTo(x + 2, y - 23);
    ctx.stroke();

    ctx.fillStyle = p.key.includes('silver') ? 'rgba(83,170,255,0.92)' : 'rgba(255,87,72,0.92)';
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 23);
    ctx.quadraticCurveTo(x + 12 + flutter * 5, y - 21.5, x + 18 + flutter * 3, y - 17.4);
    ctx.quadraticCurveTo(x + 11, y - 15.5, x + 2, y - 15.8);
    ctx.closePath();
    ctx.fill();

    if (typeof isPuttingView === 'function' && isPuttingView()) {
      const pulse = 0.5 + Math.sin(now() / 540) * 0.5;
      ctx.strokeStyle = rgba(p.cupGlow, 0.18 + pulse * 0.08);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(x, y, r + 7 + pulse * 1.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (typeof drawCourse === 'function') {
    const drawCourseBefore = drawCourse;
    drawCourse = function drawCourseGraphicsOverhaulV071() {
      drawCourseBefore.apply(this, arguments);
      if (typeof ctx === 'undefined' || typeof canvas === 'undefined' || typeof hole === 'undefined' || !hole) return;
      const p = profile();
      drawSunWash(p);
      drawRoughPainterly(p);
      drawIllustratedFairways(p);
      drawIllustratedGreens();
      drawIllustratedBunkers();
      drawIllustratedWater(p);
      drawPropSprites(p);
      drawAmbientLife(p);
      drawCupPolish(p);
    };
  }

  window.graphicsOverhaulV071 = {
    profile,
    drawAmbientLife,
    drawPropSprites,
    drawIllustratedFairways,
    drawIllustratedGreens,
    drawIllustratedBunkers,
    drawIllustratedWater
  };
})();
