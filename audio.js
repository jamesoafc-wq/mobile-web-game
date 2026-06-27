// ============================================================================
// audio.js  ·  procedural Web Audio sound system (no audio files)
// ----------------------------------------------------------------------------
// Every sound is synthesized at runtime with oscillators + noise + envelopes,
// so nothing is added to the repo and there are no loading delays or licensing
// concerns. Hooks into existing globals using the wrap-don't-replace pattern;
// all wrappers are wrapped in try/catch so audio can never break gameplay.
//
// - Crowd reactions only fire when spectators are present (hole.spectators).
// - An ambient birdsong/wind bed is included but DEFAULTS OFF.
// - Master mute + volume persist to localStorage. Audio unlocks on first tap
//   (mobile browsers block sound until a user gesture).
// ============================================================================

(function () {
  'use strict';

  var LS = 'golfAudio_v1';
  var prefs = loadPrefs();
  function loadPrefs() {
    try { return Object.assign({ muted: false, volume: 0.8, ambient: false }, JSON.parse(localStorage.getItem(LS) || '{}')); }
    catch (e) { return { muted: false, volume: 0.8, ambient: false }; }
  }
  function savePrefs() { try { localStorage.setItem(LS, JSON.stringify(prefs)); } catch (e) {} }

  var AC = null, master = null, unlocked = false;
  var ambient = { on: false, nodes: [], timer: null };

  function ctx() {
    if (!AC) {
      try {
        var C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        AC = new C();
        master = AC.createGain();
        master.gain.value = prefs.muted ? 0 : prefs.volume;
        master.connect(AC.destination);
      } catch (e) { return null; }
    }
    return AC;
  }
  function unlock() {
    if (unlocked) return;
    var c = ctx();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    unlocked = true;
    if (prefs.ambient) startAmbient();
  }
  // unlock on the first user gesture (required by mobile browsers)
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, unlock, { once: false, passive: true });
  });

  function now() { return AC ? AC.currentTime : 0; }
  function setMaster() { if (master) master.gain.value = prefs.muted ? 0 : prefs.volume; }

  // ---- low-level synth helpers ---------------------------------------------
  // a short noise buffer (reused)
  var noiseBuf = null;
  function noise() {
    var c = ctx(); if (!c) return null;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 1.2, c.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var src = c.createBufferSource(); src.buffer = noiseBuf; src.loop = true; return src;
  }
  // env(gainNode, peak, attack, decay) — quick AD envelope from now
  function env(g, peak, attack, decay, t0) {
    var t = t0 || now();
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  // a tone burst
  function tone(freq, type, peak, attack, decay, t0, glideTo) {
    var c = ctx(); if (!c || prefs.muted) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    var t = t0 || now();
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t + attack + decay);
    env(g, peak, attack, decay, t);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + attack + decay + 0.05);
  }
  // a filtered noise burst
  function noiseBurst(peak, attack, decay, filterType, freq, q, t0) {
    var c = ctx(); if (!c || prefs.muted) return;
    var src = noise(); if (!src) return;
    var f = c.createBiquadFilter(), g = c.createGain();
    f.type = filterType || 'bandpass'; f.frequency.value = freq || 1200; if (q) f.Q.value = q;
    env(g, peak, attack, decay, t0);
    src.connect(f); f.connect(g); g.connect(master);
    var t = t0 || now();
    src.start(t); src.stop(t + attack + decay + 0.05);
  }

  // ---- the sound set --------------------------------------------------------
  var SND = {
    // club strike — pitched by club & power. driver = deep thwack, putter = tick
    strike: function (clubKey, power) {
      power = power || 0.6;
      if (clubKey === 'putter') {
        tone(420 + power * 120, 'triangle', 0.18, 0.004, 0.07);
        noiseBurst(0.10, 0.002, 0.05, 'highpass', 2600, 1, now());
        return;
      }
      var deep = clubKey === 'driver' ? 1 : (clubKey === 'wood3' ? 0.85 : 0.6);
      // crack: short bright noise burst
      noiseBurst(0.34 * (0.6 + power * 0.6), 0.002, 0.05, 'bandpass', 2000 - deep * 700, 0.8, now());
      // body thunk
      tone(150 + (1 - deep) * 180 + power * 60, 'square', 0.28 * (0.5 + power * 0.6), 0.004, 0.10 + deep * 0.05, now(), 90);
    },
    // gentle flight whoosh after a full shot
    whoosh: function (power) {
      var c = ctx(); if (!c || prefs.muted) return;
      var src = noise(); if (!src) return;
      var f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'bandpass'; f.frequency.setValueAtTime(500, now());
      f.frequency.exponentialRampToValueAtTime(1400, now() + 0.5);
      f.Q.value = 0.6;
      var t = now();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08 * (0.5 + (power || 0.6)), t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t); src.stop(t + 0.6);
    },
    // landing thud, varies by surface
    land: function (lie) {
      if (lie === 'water') return SND.splash();
      if (lie === 'sand') return SND.bunker();
      var soft = (lie === 'green' || lie === 'fringe');
      tone(soft ? 120 : 90, 'sine', soft ? 0.12 : 0.20, 0.003, soft ? 0.08 : 0.14, now(), 60);
      noiseBurst(soft ? 0.06 : 0.12, 0.002, 0.06, 'lowpass', soft ? 700 : 480, 0.7, now());
    },
    splash: function () {
      // descending filtered noise + a plop
      var c = ctx(); if (!c || prefs.muted) return;
      var src = noise(); if (!src) return;
      var f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'lowpass'; f.frequency.setValueAtTime(1800, now());
      f.frequency.exponentialRampToValueAtTime(300, now() + 0.4);
      var t = now();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.26, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t); src.stop(t + 0.5);
      tone(300, 'sine', 0.14, 0.005, 0.18, t + 0.02, 120);
    },
    bunker: function () {
      noiseBurst(0.18, 0.004, 0.16, 'highpass', 3200, 0.6, now());
      noiseBurst(0.10, 0.01, 0.12, 'bandpass', 1600, 0.5, now() + 0.01);
    },
    // faint rolling texture (called repeatedly while moving on grass)
    roll: function (speed) {
      noiseBurst(Math.min(0.05, 0.015 + speed * 0.04), 0.01, 0.09, 'bandpass', 900, 0.4, now());
    },
    // the money sound: cup rattle + drop
    cup: function () {
      var t = now();
      // rattle: a few quick pitched clicks
      for (var i = 0; i < 3; i++) tone(900 - i * 120, 'square', 0.10, 0.002, 0.03, t + i * 0.045);
      // drop into the hole
      tone(220, 'sine', 0.20, 0.004, 0.16, t + 0.16, 110);
      noiseBurst(0.08, 0.002, 0.06, 'lowpass', 500, 0.7, t + 0.16);
    },
    // UI
    tick: function () { tone(660, 'triangle', 0.08, 0.002, 0.04); },
    select: function () { tone(520, 'triangle', 0.09, 0.002, 0.05, now(), 720); },
    success: function () { var t = now();[523, 659, 784].forEach(function (f, i) { tone(f, 'triangle', 0.10, 0.003, 0.16, t + i * 0.08); }); },
    error: function () { tone(180, 'sawtooth', 0.12, 0.004, 0.18, now(), 120); },
    // crowd reactions (only used when spectators present)
    crowd: function (kind) {
      var c = ctx(); if (!c || prefs.muted) return;
      if (kind === 'groan') {
        var o = c.createOscillator(), g = c.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(180, now());
        o.frequency.exponentialRampToValueAtTime(90, now() + 0.6);
        env(g, 0.10, 0.08, 0.6); o.connect(g); g.connect(master);
        o.start(now()); o.stop(now() + 0.8);
        return;
      }
      // applause: shaped noise swell, bigger for 'cheer'
      var big = kind === 'cheer';
      var src = noise(); if (!src) return;
      var f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.5;
      var t = now(), dur = big ? 1.6 : 0.9, peak = big ? 0.22 : 0.13;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + (big ? 0.12 : 0.08));
      g.gain.exponentialRampToValueAtTime(peak * 0.6, t + dur * 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      // tremolo to suggest many hands clapping
      var lfo = c.createOscillator(), lfg = c.createGain();
      lfo.type = 'square'; lfo.frequency.value = big ? 13 : 9; lfg.gain.value = 0.5;
      lfo.connect(lfg); lfg.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t); src.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur + 0.05);
    }
  };

  // ---- ambient bed (birdsong + soft wind) — DEFAULT OFF ---------------------
  function startAmbient() {
    if (ambient.on || prefs.muted) return;
    var c = ctx(); if (!c) return;
    ambient.on = true;
    // soft wind: low-passed noise at low gain
    var src = noise(); if (!src) { ambient.on = false; return; }
    var f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0.035;
    src.connect(f); f.connect(g); g.connect(master); src.start();
    ambient.nodes = [src, g];
    // occasional birdsong chirps
    ambient.timer = setInterval(function () {
      if (prefs.muted || !ambient.on) return;
      if (Math.random() < 0.5) {
        var base = 1800 + Math.random() * 1400;
        var t = now();
        tone(base, 'sine', 0.05, 0.01, 0.07, t, base * 1.18);
        if (Math.random() < 0.6) tone(base * 1.1, 'sine', 0.04, 0.01, 0.06, t + 0.12, base * 0.95);
      }
    }, 2600);
  }
  function stopAmbient() {
    ambient.on = false;
    if (ambient.timer) { clearInterval(ambient.timer); ambient.timer = null; }
    ambient.nodes.forEach(function (n) { try { n.stop ? n.stop() : (n.disconnect && n.disconnect()); } catch (e) {} });
    ambient.nodes = [];
  }

  // ===========================================================================
  // HOOKS — wrap existing globals (wrap-don't-replace)
  // ===========================================================================

  // strike sounds: wrap the resolvers
  if (typeof resolveFullShot === 'function') {
    var _rfs = resolveFullShot;
    resolveFullShot = function (shot, marker) {
      try { SND.strike(shot && shot.clubKey, shot && shot.power); SND.whoosh(shot && shot.power); } catch (e) {}
      return _rfs.apply(this, arguments);
    };
  }
  if (typeof resolvePutt === 'function') {
    var _rp = resolvePutt;
    resolvePutt = function (shot, marker) {
      try { SND.strike('putter', shot && shot.power); } catch (e) {}
      return _rp.apply(this, arguments);
    };
  }
  // landing sound by surface
  if (typeof startLandingRoll === 'function') {
    var _slr = startLandingRoll;
    startLandingRoll = function (angle, lie, carryYards, clubKey) {
      try { SND.land(lie); } catch (e) {}
      return _slr.apply(this, arguments);
    };
  }
  // water penalty splash (covers balls that roll in, not just land in)
  if (typeof applyPenalty === 'function') {
    var _ap = applyPenalty;
    applyPenalty = function (text) {
      try {
        if (/water/i.test(text || '')) {
          SND.splash();
          if (typeof hole !== 'undefined' && hole && hole.spectators) setTimeout(function () { SND.crowd('groan'); }, 350);
        }
      } catch (e) {}
      return _ap.apply(this, arguments);
    };
  }
  // cup drop + crowd reaction on hole-out
  if (typeof maybeHoleOut === 'function') {
    var _mho = maybeHoleOut;
    maybeHoleOut = function () {
      var wasHoled = (typeof ball !== 'undefined' && ball) ? ball.holed : false;
      var r = _mho.apply(this, arguments);
      try {
        if (!wasHoled && typeof ball !== 'undefined' && ball && ball.holed) {
          SND.cup();
          // crowd reaction tied to spectators + score
          if (typeof hole !== 'undefined' && hole && hole.spectators) {
            var par = hole.par || 4;
            var toPar = (typeof strokes !== 'undefined') ? strokes - par : 0;
            setTimeout(function () { SND.crowd(toPar <= -1 ? 'cheer' : (toPar <= 0 ? 'clap' : 'clap')); }, 220);
          }
        }
      } catch (e) {}
      return r;
    };
  }

  // roll texture + ambient management: wrap the per-frame draw
  var rollAccum = 0, lastBallMoving = false;
  if (typeof draw === 'function') {
    var _draw = draw;
    draw = function () {
      var r = _draw.apply(this, arguments);
      try {
        if (typeof ball !== 'undefined' && ball && ball.moving && !ball.flight) {
          var sp = Math.hypot(ball.vx || 0, ball.vy || 0);
          if (sp > 0.02) {
            rollAccum += 1;
            if (rollAccum % 6 === 0) SND.roll(Math.min(1, sp));
          }
        }
        lastBallMoving = (typeof ball !== 'undefined' && ball) ? ball.moving : false;
      } catch (e) {}
      return r;
    };
  }

  // UI ticks: only on menu buttons (not in-game canvas taps / shot controls)
  document.addEventListener('pointerdown', function (e) {
    try {
      var el = e.target;
      if (!el || !el.closest) return;
      var btn = el.closest('button, [role="button"]');
      if (!btn) return;
      // skip the strike/shot controls and the canvas area
      if (btn.closest('#course') || btn.id === 'strikeBtn' || btn.dataset.noTick) return;
      SND.tick();
    } catch (err) {}
  }, true);

  // ===========================================================================
  // SETTINGS UI — a small floating audio control + persistence
  // ===========================================================================
  function buildSettingsPanel() {
    var wrap = document.createElement('div');
    wrap.dataset.audioSettings = 'true';
    wrap.style.cssText = 'margin:0 0 14px;padding:14px 16px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(238,248,216,.16);';
    wrap.innerHTML = '<div style="font:950 14px system-ui;color:#eef8d8;margin-bottom:10px;">🔊 Sound</div>';
    wrap.appendChild(toggleRow('Sound effects', !prefs.muted, function (on) { prefs.muted = !on; savePrefs(); setMaster(); if (prefs.muted) stopAmbient(); else if (prefs.ambient) startAmbient(); }));
    wrap.appendChild(volumeRow());
    wrap.appendChild(toggleRow('Ambient (birds & wind)', prefs.ambient, function (on) { prefs.ambient = on; savePrefs(); if (on && !prefs.muted) { unlock(); startAmbient(); } else stopAmbient(); }));
    return wrap;
  }
  function toggleRow(label, on, cb) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 0;';
    row.innerHTML = '<span style="font:800 12px system-ui;color:#eef8d8;">' + label + '</span>';
    var sw = document.createElement('button');
    sw.style.cssText = 'width:46px;height:26px;border-radius:14px;border:none;cursor:pointer;position:relative;transition:background .2s;background:' + (on ? '#3fae5e' : 'rgba(255,255,255,.2)') + ';';
    var knob = document.createElement('span');
    knob.style.cssText = 'position:absolute;top:3px;left:' + (on ? '23px' : '3px') + ';width:20px;height:20px;border-radius:50%;background:#fff;transition:left .2s;';
    sw.appendChild(knob);
    sw.addEventListener('click', function () {
      on = !on;
      sw.style.background = on ? '#3fae5e' : 'rgba(255,255,255,.2)';
      knob.style.left = on ? '23px' : '3px';
      cb(on);
      if (on) SND.select();
    });
    row.appendChild(sw);
    return row;
  }
  function volumeRow() {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0;';
    row.innerHTML = '<span style="font:800 12px system-ui;color:#eef8d8;white-space:nowrap;">Volume</span>';
    var sl = document.createElement('input');
    sl.type = 'range'; sl.min = '0'; sl.max = '100'; sl.value = String(Math.round(prefs.volume * 100));
    sl.style.cssText = 'flex:1;accent-color:#3fae5e;';
    sl.addEventListener('input', function () { prefs.volume = (+sl.value) / 100; setMaster(); });
    sl.addEventListener('change', function () { savePrefs(); SND.tick(); });
    row.appendChild(sl);
    return row;
  }

  // public API
  window.GolfAudio = {
    play: function (name, a, b) { try { if (SND[name]) { unlock(); SND[name](a, b); } } catch (e) {} },
    buildSettingsPanel: buildSettingsPanel,
    setMuted: function (m) { prefs.muted = m; savePrefs(); setMaster(); },
    isMuted: function () { return prefs.muted; },
    prefs: prefs
  };
  window.audioLoaded = true;
})();
