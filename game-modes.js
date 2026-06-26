// ============================================================================
// game-modes.js  ·  top-level modes: Quick Play / Tournament / Career
// ----------------------------------------------------------------------------
// Restructures the course menu into mode tabs and adds Tournament + Career
// systems plus a Driving Range button and pass-and-play for Quick Play. All
// additive: wraps the existing photo menu render, reuses course launching.
// ============================================================================

(function () {
  'use strict';
  if (typeof renderCourseMenuV045 !== 'function' || typeof COURSES_V045 === 'undefined') return;

  var MODE = 'home';   // 'home' | 'quick' | 'tournament' | 'career'
  var LS = 'golfModes_v1';
  function load() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(LS, JSON.stringify(s)); } catch (e) {} }
  var data = load();

  // ---------- CAREER data model ----------
  // Tours (ladder), fame/popularity, season schedule, simple skill tree.
  var TOURS = [
    { id: 'amateur', name: 'Amateur Tour', need: 0, reward: 'Rookie status', icon: '🥉' },
    { id: 'challenger', name: 'Challenger Tour', need: 6, reward: 'Sponsor interest', icon: '🥈' },
    { id: 'pro', name: 'Pro Tour', need: 16, reward: 'Pro contracts', icon: '🥇' },
    { id: 'masters', name: 'Masters Circuit', need: 30, reward: 'Legend status', icon: '🏆' }
  ];
  var SKILLS = [
    { id: 'power', name: 'Power', desc: 'Longer carry', max: 5 },
    { id: 'accuracy', name: 'Accuracy', desc: 'Tighter shot dispersion', max: 5 },
    { id: 'wind', name: 'Wind Read', desc: 'Less wind effect', max: 5 },
    { id: 'putting', name: 'Putting', desc: 'Truer roll', max: 5 },
    { id: 'nerve', name: 'Nerve', desc: 'Bigger sweet zone', max: 5 }
  ];
  function career() {
    if (!data.career) data.career = { fame: 0, tourIdx: 0, wins: 0, events: 0, skillPts: 0, skills: {}, seasonEvent: 0 };
    return data.career;
  }
  function fameToStars(f) { return Math.floor(f); }

  // ---------- TOURNAMENT state ----------
  var tournament = null;   // { courseId, hole, scores:[], par:[], total, ai:[] }
  var TOUR_DIFF = data.tourDiff || 'amateur';   // amateur | pro | championship
  var DIFF_CFG = {
    amateur:     { label: 'Amateur', avg: 2.2, spread: 2.6, names: ['Sam', 'Jo', 'Alex', 'Casey'] },
    pro:         { label: 'Pro', avg: 0.4, spread: 1.8, names: ['M. Reyes', 'T. Cole', 'K. Larsson', 'D. Park'] },
    championship:{ label: 'Championship', avg: -1.2, spread: 1.4, names: ['V. Rossi', 'L. Stone', 'R. Aoki', 'B. Hale'] }
  };
  function makeAIField() {
    var cfg = DIFF_CFG[TOUR_DIFF] || DIFF_CFG.amateur;
    return cfg.names.map(function (n) { return { name: n, scores: [], toPar: 0 }; });
  }
  // simulate one AI hole score relative to par
  function aiHoleScore(par) {
    var cfg = DIFF_CFG[TOUR_DIFF] || DIFF_CFG.amateur;
    var g = (Math.random() + Math.random() + Math.random()) / 3;   // ~normal 0..1
    var rel = Math.round((g - 0.5) * cfg.spread * 2 + cfg.avg / 18 * 4);
    rel = Math.max(-1, Math.min(3, rel));   // clamp birdie..triple per hole-ish
    return par + rel;
  }

  function startTournament(course) {
    window.__forceSpectators = true;   // crowds at every tournament venue
    if (typeof applyCourseV045 === 'function') applyCourseV045(course);
    if (typeof resetRoundHoleV035 === 'function') resetRoundHoleV035(0);
    tournament = { courseId: course.id, courseName: course.name, hole: 0, scores: [], started: true, isCareer: false, ai: makeAIField(), myToPar: 0 };
    window.__activeTournament = tournament;
    if (typeof hideCourseMenuV045 === 'function') hideCourseMenuV045();
    if (typeof updateHud === 'function') updateHud();
  }

  // hook hole-out to advance tournament / career rounds and tally scores
  if (typeof maybeHoleOut === 'function') {
    var beforeModes = maybeHoleOut;
    maybeHoleOut = function maybeHoleOutModes() {
      var wasHoled = false;
      beforeModes.apply(this, arguments);
      if (!tournament || !ball || !ball.holed) return;
      if (typeof strokes === 'undefined') return;
      var par = (typeof hole !== 'undefined' && hole) ? hole.par : 4;
      tournament.scores.push({ strokes: strokes, par: par });
      tournament.myToPar += (strokes - par);
      // simulate the AI field for this hole
      if (tournament.ai) tournament.ai.forEach(function (a) { var s = aiHoleScore(par); a.scores.push(s); a.toPar += (s - par); });
      tournament.hole++;
      showLeaderboardToast();
      if (tournament.hole >= 18) finishTournament();
    };
  }

  function leaderboardRows() {
    var field = [{ name: 'You', toPar: tournament.myToPar, me: true }];
    (tournament.ai || []).forEach(function (a) { field.push({ name: a.name, toPar: a.toPar }); });
    field.sort(function (a, b) { return a.toPar - b.toPar; });
    return field;
  }
  function fmtPar(p) { return p === 0 ? 'E' : (p > 0 ? '+' + p : '' + p); }
  function showLeaderboardToast() {
    try {
      var rows = leaderboardRows();
      var el = document.createElement('div');
      el.style.cssText = 'position:fixed;right:10px;top:96px;z-index:100000;background:rgba(8,14,10,.9);border:1px solid rgba(255,226,122,.4);' +
        'border-radius:12px;padding:10px 12px;color:#fff;font:800 11px system-ui;box-shadow:0 8px 22px rgba(0,0,0,.4);min-width:130px;opacity:0;transition:opacity .3s;';
      var html = '<div style="color:#ffe27a;font-weight:950;margin-bottom:5px;">Leaderboard · H' + tournament.hole + '</div>';
      rows.forEach(function (r, i) {
        html += '<div style="display:flex;justify-content:space-between;gap:10px;color:' + (r.me ? '#ffe27a' : 'rgba(255,255,255,.85)') + ';">' +
          '<span>' + (i + 1) + '. ' + r.name + '</span><span>' + fmtPar(r.toPar) + '</span></div>';
      });
      el.innerHTML = html;
      document.body.appendChild(el);
      requestAnimationFrame(function () { el.style.opacity = '1'; });
      setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 300); }, 2600);
    } catch (e) {}
  }

  function finishTournament() {
    var t = tournament; tournament = null; window.__activeTournament = null;
    var totStrokes = 0, totPar = 0;
    t.scores.forEach(function (s) { totStrokes += s.strokes; totPar += s.par; });
    var toPar = totStrokes - totPar;
    // final placement vs the AI field
    var field = [{ name: 'You', toPar: toPar, me: true }];
    (t.ai || []).forEach(function (a) { field.push({ name: a.name, toPar: a.toPar }); });
    field.sort(function (a, b) { return a.toPar - b.toPar; });
    var placed = field.findIndex(function (r) { return r.me; }) + 1;
    t.finalField = field;
    // career rewards
    if (t.isCareer) {
      var c = career(); c.events++;
      var fameGain = placed === 1 ? 5 : (placed === 2 ? 3 : (placed <= 4 ? 2 : 1));
      c.fame += fameGain; c.skillPts += (placed <= 3 ? 2 : 1);
      if (placed === 1) { c.wins++; if (window.Achievements) Achievements.check('tournamentWin', {}); }
      c.seasonEvent++;
      for (var i = TOURS.length - 1; i >= 0; i--) { if (c.wins >= TOURS[i].need && i > c.tourIdx) { c.tourIdx = i; if (window.Achievements) Achievements.check('careerTour', { tour: i + 1 }); break; } }
      save(data);
      showTournamentResult(t, toPar, placed, fameGain);
    } else {
      if (window.Achievements) { Achievements.check('roundEnd', { toPar: toPar }); if (placed === 1) Achievements.check('tournamentWin', {}); }
      showTournamentResult(t, toPar, placed, 0);
    }
  }

  function showTournamentResult(t, toPar, placed, fameGain) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(8,14,10,.92);display:flex;align-items:center;justify-content:center;';
    var card = document.createElement('div');
    card.style.cssText = 'max-width:340px;width:86%;background:linear-gradient(160deg,#1f6b38,#0e3a20);border:1px solid rgba(255,226,122,.4);border-radius:22px;padding:24px 22px;text-align:center;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.5);max-height:86vh;overflow-y:auto;';
    var parStr = toPar === 0 ? 'Even par' : (toPar > 0 ? '+' + toPar : toPar) + ' to par';
    var lbHtml = '';
    if (t.finalField) {
      lbHtml = '<div style="text-align:left;margin-top:14px;background:rgba(0,0,0,.2);border-radius:12px;padding:10px 12px;">';
      t.finalField.forEach(function (r, i) {
        lbHtml += '<div style="display:flex;justify-content:space-between;font:850 12px system-ui;padding:3px 0;color:' + (r.me ? '#ffe27a' : 'rgba(255,255,255,.85)') + ';">' +
          '<span>' + (i + 1) + '. ' + r.name + (i === 0 ? ' 🏆' : '') + '</span><span>' + fmtPar(r.toPar) + '</span></div>';
      });
      lbHtml += '</div>';
    }
    card.innerHTML = '<div style="font:950 22px system-ui;color:#ffe27a;">' + (placed === 1 ? '🏆 Tournament Won!' : (t.isCareer ? 'Event Complete' : 'Round Complete')) + '</div>' +
      '<div style="font:800 15px system-ui;margin-top:8px;">' + t.courseName + '</div>' +
      '<div style="font:950 32px system-ui;margin:12px 0 4px;color:' + (toPar <= 0 ? '#9fe87a' : '#fff') + ';">' + parStr + '</div>' +
      '<div style="font:850 13px system-ui;color:rgba(255,255,255,.85);">Finished ' + (placed ? 'position ' + placed : '') + (fameGain ? ' · +' + fameGain + ' fame' : '') + '</div>' +
      lbHtml +
      '<button style="margin-top:18px;width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#ffe27a,#ffb347);color:#0c2a14;font:950 14px system-ui;cursor:pointer;">Back to menu</button>';
    card.querySelector('button').addEventListener('click', function () {
      ov.remove();
      if (typeof showCourseMenuV045 === 'function') showCourseMenuV045();
      else if (typeof renderCourseMenuV045 === 'function') { renderCourseMenuV045(); if (typeof courseMenuV045 !== 'undefined' && courseMenuV045) courseMenuV045.style.display = 'block'; }
    });
    ov.appendChild(card); document.body.appendChild(ov);
  }

  // career event start (a tournament flagged as career, on the current tour's course)
  function startCareerEvent() {
    var c = career();
    var playable = COURSES_V045.filter(function (cc) { return cc.holes && cc.holes.length && (!window.Progress || Progress.courseUnlocked(cc.id)); });
    if (!playable.length) playable = COURSES_V045.filter(function (cc) { return cc.holes && cc.holes.length; });
    var course = playable[c.seasonEvent % playable.length];
    window.__forceSpectators = true;   // crowds at career events too
    if (typeof applyCourseV045 === 'function') applyCourseV045(course);
    if (typeof resetRoundHoleV035 === 'function') resetRoundHoleV035(0);
    tournament = { courseId: course.id, courseName: course.name, hole: 0, scores: [], started: true, isCareer: true };
    window.__activeTournament = tournament;
    if (typeof hideCourseMenuV045 === 'function') hideCourseMenuV045();
    if (typeof updateHud === 'function') updateHud();
  }

  // ---------- MENU UI: mode tabs + per-mode content ----------
  function modeTabs() {
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:6px;margin-bottom:16px;background:rgba(0,0,0,.25);padding:5px;border-radius:14px;';
    [['quick', '▶ Quick Play'], ['tournament', '🏆 Tournament'], ['career', '📈 Career']].forEach(function (m) {
      var b = document.createElement('button');
      var active = MODE === m[0];
      b.textContent = m[1];
      b.style.cssText = 'flex:1;padding:10px 6px;border:none;border-radius:10px;cursor:pointer;font:900 12px system-ui;' +
        (active ? 'background:linear-gradient(135deg,#3fae5e,#1f7a3f);color:#fff;' : 'background:transparent;color:rgba(232,246,222,.6);');
      b.addEventListener('click', function () { MODE = m[0]; renderCourseMenuV045(); });
      bar.appendChild(b);
    });
    return bar;
  }

  function quickExtras(shell) {
    // 2-player toggle stays in Quick Play
    var pvp = document.createElement('button');
    var on = !!data.passPlay;
    pvp.innerHTML = (on ? '👥 2-Player: ON' : '👤 2-Player: OFF');
    pvp.style.cssText = 'display:block;width:100%;margin-bottom:14px;padding:12px;border:1px solid ' + (on ? 'rgba(255,226,122,.5)' : 'rgba(238,248,216,.18)') + ';border-radius:14px;background:' + (on ? 'linear-gradient(135deg,#2a7d46,#155a30)' : 'rgba(255,255,255,.05)') + ';color:#eef8d8;font:900 13px system-ui;cursor:pointer;';
    pvp.addEventListener('click', function () { data.passPlay = !data.passPlay; save(data); window.__passPlay = data.passPlay; renderCourseMenuV045(); });
    shell.insertBefore(pvp, shell.children[2] || null);
  }

  function practiceContent(shell) {
    var intro = document.createElement('div');
    intro.style.cssText = 'margin-bottom:14px;color:rgba(232,246,222,.8);font:800 12px system-ui;';
    intro.textContent = 'Warm up with no scoring. Pick a practice mode:';
    shell.appendChild(intro);
    var range = document.createElement('button');
    range.style.cssText = 'display:block;width:100%;margin-bottom:10px;padding:18px 16px;border:1px solid rgba(238,248,216,.18);border-radius:16px;background:linear-gradient(135deg,#2a7d46,#155a30);color:#fff;font:900 15px system-ui;text-align:left;cursor:pointer;';
    range.innerHTML = '🏌️ Driving Range<div style="font:750 11px system-ui;color:rgba(255,255,255,.78);margin-top:3px;">Repeated tee shots, fresh wind each drive</div>';
    range.addEventListener('click', function () { if (window.DrivingRange) DrivingRange.start(); });
    shell.appendChild(range);
    var putt = document.createElement('button');
    putt.style.cssText = 'display:block;width:100%;margin-bottom:10px;padding:18px 16px;border:1px solid rgba(238,248,216,.18);border-radius:16px;background:linear-gradient(135deg,#3a7d8c,#1d5773);color:#fff;font:900 15px system-ui;text-align:left;cursor:pointer;';
    putt.innerHTML = '⛳ Putting Green<div style="font:750 11px system-ui;color:rgba(255,255,255,.78);margin-top:3px;">A new green, slope &amp; pin every hole-out</div>';
    putt.addEventListener('click', function () { if (window.PuttingGreen) PuttingGreen.start(); });
    shell.appendChild(putt);
  }

  function tournamentContent(shell) {
    var intro = document.createElement('div');
    intro.style.cssText = 'margin-bottom:12px;color:rgba(232,246,222,.8);font:800 12px system-ui;';
    intro.textContent = 'Play a full 18-hole round against a simulated field. Pick difficulty, then a course:';
    shell.appendChild(intro);
    // difficulty selector
    var diffRow = document.createElement('div');
    diffRow.style.cssText = 'display:flex;gap:6px;margin-bottom:14px;';
    ['amateur', 'pro', 'championship'].forEach(function (d) {
      var b = document.createElement('button');
      var active = TOUR_DIFF === d;
      b.textContent = DIFF_CFG[d].label;
      b.style.cssText = 'flex:1;padding:9px 4px;border:1px solid ' + (active ? 'rgba(255,226,122,.6)' : 'rgba(238,248,216,.16)') + ';border-radius:10px;cursor:pointer;font:900 11px system-ui;' +
        (active ? 'background:linear-gradient(135deg,#3fae5e,#1f7a3f);color:#fff;' : 'background:rgba(255,255,255,.04);color:rgba(232,246,222,.6);');
      b.addEventListener('click', function () { TOUR_DIFF = d; data.tourDiff = d; save(data); renderCourseMenuV045(); });
      diffRow.appendChild(b);
    });
    shell.appendChild(diffRow);
    COURSES_V045.forEach(function (course) {
      if (!course.holes || !course.holes.length) return;
      if (window.Progress && !Progress.courseUnlocked(course.id)) return;
      var b = document.createElement('button');
      b.style.cssText = 'display:block;width:100%;margin-bottom:8px;padding:14px 16px;border:1px solid rgba(238,248,216,.16);border-radius:14px;background:rgba(255,255,255,.05);color:#eef8d8;font:900 14px system-ui;text-align:left;cursor:pointer;';
      b.innerHTML = course.name + ' <span style="float:right;color:#ffe27a;">Play ▶</span>';
      b.addEventListener('click', function () { startTournament(course); });
      shell.appendChild(b);
    });
  }

  function careerContent(shell) {
    var c = career();
    var tour = TOURS[c.tourIdx];
    var box = document.createElement('div');
    box.style.cssText = 'margin-bottom:16px;padding:16px;border-radius:18px;background:linear-gradient(150deg,#1f6b38,#0e3a20);border:1px solid rgba(255,226,122,.35);color:#fff;';
    box.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
      '<div style="font:950 17px system-ui;">' + tour.icon + ' ' + tour.name + '</div>' +
      '<div style="font:900 13px system-ui;color:#ffe27a;">⭐ ' + c.fame + ' fame</div></div>' +
      '<div style="font:800 12px system-ui;color:rgba(255,255,255,.8);margin-top:6px;">Wins: ' + c.wins + ' · Events: ' + c.events + ' · Season event ' + ((c.seasonEvent % 6) + 1) + '/6</div>';
    var play = document.createElement('button');
    play.textContent = '▶ Play next event';
    play.style.cssText = 'margin-top:12px;width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#ffe27a,#ffb347);color:#0c2a14;font:950 14px system-ui;cursor:pointer;';
    play.addEventListener('click', startCareerEvent);
    box.appendChild(play);
    shell.appendChild(box);

    // tour ladder
    var ladder = document.createElement('div');
    ladder.style.cssText = 'margin-bottom:16px;';
    ladder.innerHTML = '<div style="font:950 14px system-ui;color:#eef8d8;margin-bottom:8px;">Tour Ladder</div>';
    TOURS.forEach(function (tr, i) {
      var reached = i <= c.tourIdx;
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;padding:9px 12px;border-radius:10px;margin-bottom:5px;font:800 12px system-ui;' +
        'background:' + (reached ? 'rgba(63,174,94,.18)' : 'rgba(255,255,255,.04)') + ';color:' + (reached ? '#d9f89a' : 'rgba(232,246,222,.5)') + ';';
      row.innerHTML = '<span>' + tr.icon + ' ' + tr.name + '</span><span>' + (reached ? '✓' : tr.need + ' wins') + '</span>';
      ladder.appendChild(row);
    });
    shell.appendChild(ladder);

    // skill tree
    var skills = document.createElement('div');
    skills.innerHTML = '<div style="font:950 14px system-ui;color:#eef8d8;margin-bottom:4px;display:flex;justify-content:space-between;"><span>Skills</span><span style="color:#ffe27a;">' + c.skillPts + ' pts</span></div>';
    SKILLS.forEach(function (sk) {
      var lvl = c.skills[sk.id] || 0;
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:10px;margin-bottom:5px;background:rgba(255,255,255,.04);';
      var pips = ''; for (var i = 0; i < sk.max; i++) pips += '<span style="color:' + (i < lvl ? '#ffe27a' : 'rgba(255,255,255,.18)') + ';">●</span>';
      row.innerHTML = '<div><div style="font:900 12px system-ui;color:#eef8d8;">' + sk.name + '</div><div style="font:750 10px system-ui;color:rgba(232,246,222,.6);">' + sk.desc + '</div></div>' +
        '<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:11px;letter-spacing:1px;">' + pips + '</span></div>';
      if (c.skillPts > 0 && lvl < sk.max) {
        var up = document.createElement('button');
        up.textContent = '+';
        up.style.cssText = 'margin-left:8px;width:26px;height:26px;border:none;border-radius:8px;background:linear-gradient(135deg,#3fae5e,#1f7a3f);color:#fff;font:950 16px system-ui;cursor:pointer;';
        up.addEventListener('click', function () { c.skills[sk.id] = (c.skills[sk.id] || 0) + 1; c.skillPts--; save(data); renderCourseMenuV045(); });
        row.lastElementChild.appendChild(up);
      }
      skills.appendChild(row);
    });
    shell.appendChild(skills);
  }

  // a back button for sub-pages
  function backBar(toMode) {
    var b = document.createElement('button');
    b.innerHTML = '‹ Back';
    b.style.cssText = 'margin-bottom:14px;padding:8px 16px;border:1px solid rgba(238,248,216,.2);border-radius:10px;background:rgba(255,255,255,.05);color:#eef8d8;font:900 13px system-ui;cursor:pointer;';
    b.addEventListener('click', function () { MODE = toMode || 'home'; renderCourseMenuV045(); });
    return b;
  }

  // big mode button for the home page — photo banner behind, dark scrim for text
  function modeButton(label, sub, icon, grad, onClick, bgImg) {
    var b = document.createElement('button');
    b.style.cssText = 'position:relative;display:block;width:100%;margin-bottom:12px;padding:22px 18px;border:1px solid rgba(255,226,122,.3);border-radius:18px;cursor:pointer;text-align:left;overflow:hidden;' +
      'background:' + grad + ';color:#fff;box-shadow:0 8px 22px rgba(0,0,0,.26);transition:transform .15s;min-height:84px;';
    if (bgImg) {
      var bg = document.createElement('div');
      bg.style.cssText = 'position:absolute;inset:0;background-image:url("' + bgImg + '");background-size:cover;background-position:center;opacity:0;transition:opacity .35s;';
      var im = new Image(); im.onload = function () { bg.style.opacity = '1'; }; im.src = bgImg;
      var scrim = document.createElement('div');
      scrim.style.cssText = 'position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,18,10,.82) 0%,rgba(8,18,10,.5) 55%,rgba(8,18,10,.25) 100%);';
      b.appendChild(bg); b.appendChild(scrim);
    }
    var content = document.createElement('div');
    content.style.cssText = 'position:relative;z-index:1;';
    content.innerHTML = '<div style="font:950 19px system-ui;display:flex;align-items:center;gap:10px;text-shadow:0 1px 4px rgba(0,0,0,.5);">' + icon + ' ' + label + '</div>' +
      '<div style="font:800 12px system-ui;color:rgba(255,255,255,.9);margin-top:4px;text-shadow:0 1px 3px rgba(0,0,0,.5);">' + sub + '</div>';
    b.appendChild(content);
    b.addEventListener('click', onClick);
    b.addEventListener('mouseenter', function () { this.style.transform = 'translateY(-2px)'; });
    b.addEventListener('mouseleave', function () { this.style.transform = 'none'; });
    return b;
  }

  // secondary tile (practice / shop / awards) — optional photo background
  function secondaryTile(label, icon, onClick, bgImg) {
    var b = document.createElement('button');
    b.style.cssText = 'position:relative;flex:1;min-width:0;padding:14px 8px;border:1px solid rgba(238,248,216,.16);border-radius:14px;background:rgba(255,255,255,.05);color:#eef8d8;font:900 12px system-ui;cursor:pointer;overflow:hidden;min-height:72px;';
    if (bgImg) {
      var bg = document.createElement('div');
      bg.style.cssText = 'position:absolute;inset:0;background-image:url("' + bgImg + '");background-size:cover;background-position:center;opacity:0;transition:opacity .35s;';
      var im = new Image(); im.onload = function () { bg.style.opacity = '1'; }; im.src = bgImg;
      var scrim = document.createElement('div');
      scrim.style.cssText = 'position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,18,10,.35),rgba(8,18,10,.72));';
      b.appendChild(bg); b.appendChild(scrim);
    }
    var content = document.createElement('div');
    content.style.cssText = 'position:relative;z-index:1;';
    content.innerHTML = '<div style="font-size:20px;text-shadow:0 1px 3px rgba(0,0,0,.6);">' + icon + '</div><div style="margin-top:4px;text-shadow:0 1px 3px rgba(0,0,0,.6);">' + label + '</div>';
    b.appendChild(content);
    b.addEventListener('click', onClick);
    return b;
  }

  function xpHeader() {
    if (!window.Progress) return null;
    var li = Progress.level();
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:16px;padding:14px 16px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(238,248,216,.14);';
    var pct = li.next ? Math.round((li.xpIntoLevel / li.next) * 100) : 100;
    wrap.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
      '<span style="font:950 15px system-ui;color:#eef8d8;">Level ' + li.level + '</span>' +
      '<span style="font:900 12px system-ui;color:#ffe27a;">◉ ' + Progress.coins() + ' · ★ ' + (Progress.totalStars ? Progress.totalStars() : 0) + '</span></div>' +
      '<div style="height:8px;border-radius:6px;background:rgba(0,0,0,.3);margin-top:8px;overflow:hidden;">' +
      '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#3fae5e,#ffe27a);"></div></div>';
    return wrap;
  }

  function homePage() {
    courseMenuV045.innerHTML = '';
    courseMenuV045.style.display = 'block';
    courseMenuV045.style.overflowY = 'auto';
    var shell = document.createElement('div');
    shell.style.cssText = 'max-width:460px;margin:0 auto;padding:20px 16px 40px;';
    var title = document.createElement('div');
    title.innerHTML = '<div style="font:950 26px system-ui;color:#eef8d8;">Top-Down Golf</div>' +
      '<div style="font:750 12px system-ui;color:rgba(232,246,222,.7);margin-top:2px;">Choose a mode</div>';
    title.style.marginBottom = '18px';
    shell.appendChild(title);

    var xh = xpHeader(); if (xh) shell.appendChild(xh);

    // three primary mode buttons (banner pics can replace these later)
    shell.appendChild(modeButton('Quick Play', 'Jump into any course, hole by hole', '▶',
      'linear-gradient(135deg,#3fae5e,#1f7a3f)', function () { MODE = 'quick'; renderCourseMenuV045(); }, 'mode-quick.png'));
    shell.appendChild(modeButton('Tournament', '18 holes vs a simulated field', '🏆',
      'linear-gradient(135deg,#3a7d8c,#1d5773)', function () { MODE = 'tournament'; renderCourseMenuV045(); }, 'mode-tournament.png'));
    shell.appendChild(modeButton('Career', 'Climb the tours, build your fame', '📈',
      'linear-gradient(135deg,#8a5a2a,#5a3a18)', function () { MODE = 'career'; renderCourseMenuV045(); }, 'mode-career.png'));

    // secondary row: practice / shop / achievements
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;margin-top:8px;';
    row.appendChild(secondaryTile('Practice', '🏌️', function () { MODE = 'practice'; renderCourseMenuV045(); }, 'tile-practice.png'));
    row.appendChild(secondaryTile('Shop', '🛍️', function () { MODE = 'shop'; renderCourseMenuV045(); }, 'tile-shop.png'));
    row.appendChild(secondaryTile('Awards', '🏅', function () { MODE = 'awards'; renderCourseMenuV045(); }, 'tile-awards.png'));
    shell.appendChild(row);

    // daily challenge sits on the home page too
    if (window.Daily) {
      try {
        var d = document.createElement('div'); d.style.marginTop = '12px';
        shell.appendChild(d);
      } catch (e) {}
    }
    courseMenuV045.appendChild(shell);
    // let daily-challenge inject its card
    try { if (typeof injectDailyExternal === 'function') injectDailyExternal(); } catch (e) {}
  }

  function simplePage(titleText, builder, backTo) {
    courseMenuV045.innerHTML = '';
    courseMenuV045.style.display = 'block';
    courseMenuV045.style.overflowY = 'auto';
    var shell = document.createElement('div');
    shell.style.cssText = 'max-width:460px;margin:0 auto;padding:18px 16px 40px;';
    shell.appendChild(backBar(backTo || 'home'));
    var title = document.createElement('div');
    title.innerHTML = '<div style="font:950 22px system-ui;color:#eef8d8;">' + titleText + '</div>';
    title.style.marginBottom = '14px';
    shell.appendChild(title);
    builder(shell);
    courseMenuV045.appendChild(shell);
  }

  // ---- wrap the menu render: route by MODE ----
  var beforeRender = renderCourseMenuV045;
  renderCourseMenuV045 = function renderCourseMenuModes() {
    if (MODE === 'home') { window.__forceSpectators = false; homePage(); return; }
    if (MODE === 'quick') {
      window.__forceSpectators = false;
      beforeRender.apply(this, arguments);
      try {
        var shell = courseMenuV045 && courseMenuV045.firstElementChild;
        if (shell) {
          shell.insertBefore(backBar('home'), shell.firstChild);
          quickExtras(shell);
          // remove the locker/shop from quick play (it has its own Shop page)
          var lk = shell.querySelector('[data-locker]'); if (lk) lk.remove();
        }
      } catch (e) {}
      return;
    }
    if (MODE === 'shop') {
      // render the normal menu, then strip everything except the locker
      beforeRender.apply(this, arguments);
      try {
        var shell2 = courseMenuV045 && courseMenuV045.firstElementChild;
        if (shell2) {
          var locker = shell2.querySelector('[data-locker]');
          courseMenuV045.innerHTML = '';
          var wrap = document.createElement('div');
          wrap.style.cssText = 'max-width:460px;margin:0 auto;padding:18px 16px 40px;';
          wrap.appendChild(backBar('home'));
          var t = document.createElement('div'); t.innerHTML = '<div style="font:950 22px system-ui;color:#eef8d8;">Shop</div>'; t.style.marginBottom = '8px';
          wrap.appendChild(t);
          if (locker) wrap.appendChild(locker);
          else wrap.innerHTML += '<div style="color:rgba(232,246,222,.7);font:800 12px system-ui;">Shop unavailable.</div>';
          courseMenuV045.appendChild(wrap);
        }
      } catch (e) {}
      return;
    }
    if (MODE === 'tournament') { simplePage('Tournament', tournamentContent, 'home'); return; }
    if (MODE === 'career') { simplePage('Career', careerContent, 'home'); return; }
    if (MODE === 'practice') { simplePage('Practice', practiceContent, 'home'); return; }
    if (MODE === 'awards') { simplePage('Achievements', function (shell) { if (window.Achievements) shell.appendChild(Achievements.buildPanel()); }, 'home'); return; }
    homePage();
  };

  window.__passPlay = !!data.passPlay;
  window.GameModes = { startTournament: startTournament, startCareerEvent: startCareerEvent, career: career, setMode: function (m) { MODE = m; } };
  window.gameModesLoaded = true;
})();
