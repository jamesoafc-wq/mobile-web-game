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

  var MODE = 'quick';   // 'quick' | 'tournament' | 'career'
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
  var tournament = null;   // { courseId, hole, scores:[], par:[], total }

  function startTournament(course) {
    if (typeof applyCourseV045 === 'function') applyCourseV045(course);
    if (typeof resetRoundHoleV035 === 'function') resetRoundHoleV035(0);
    tournament = { courseId: course.id, courseName: course.name, hole: 0, scores: [], started: true, isCareer: false };
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
      tournament.hole++;
      if (tournament.hole >= 18) finishTournament();
    };
  }

  function finishTournament() {
    var t = tournament; tournament = null; window.__activeTournament = null;
    var totStrokes = 0, totPar = 0;
    t.scores.forEach(function (s) { totStrokes += s.strokes; totPar += s.par; });
    var toPar = totStrokes - totPar;
    // career rewards
    if (t.isCareer) {
      var c = career(); c.events++;
      var placed = toPar <= -4 ? 1 : (toPar <= 0 ? 2 : (toPar <= 6 ? 3 : 8));
      var fameGain = placed === 1 ? 5 : (placed === 2 ? 3 : (placed === 3 ? 2 : 1));
      c.fame += fameGain; c.skillPts += (placed <= 3 ? 2 : 1);
      if (placed === 1) { c.wins++; if (window.Achievements) Achievements.check('tournamentWin', {}); }
      c.seasonEvent++;
      // tour promotion
      for (var i = TOURS.length - 1; i >= 0; i--) { if (c.wins >= TOURS[i].need && i > c.tourIdx) { c.tourIdx = i; if (window.Achievements) Achievements.check('careerTour', { tour: i + 1 }); break; } }
      save(data);
      showTournamentResult(t, toPar, placed, fameGain);
    } else {
      if (window.Achievements) Achievements.check('roundEnd', { toPar: toPar });
      showTournamentResult(t, toPar, null, 0);
    }
  }

  function showTournamentResult(t, toPar, placed, fameGain) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(8,14,10,.92);display:flex;align-items:center;justify-content:center;';
    var card = document.createElement('div');
    card.style.cssText = 'max-width:340px;width:86%;background:linear-gradient(160deg,#1f6b38,#0e3a20);border:1px solid rgba(255,226,122,.4);border-radius:22px;padding:26px 22px;text-align:center;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.5);';
    var parStr = toPar === 0 ? 'Even par' : (toPar > 0 ? '+' + toPar : toPar) + ' to par';
    card.innerHTML = '<div style="font:950 22px system-ui;color:#ffe27a;">' + (placed === 1 ? '🏆 Tournament Won!' : (t.isCareer ? 'Event Complete' : 'Round Complete')) + '</div>' +
      '<div style="font:800 15px system-ui;margin-top:8px;">' + t.courseName + '</div>' +
      '<div style="font:950 34px system-ui;margin:14px 0;color:' + (toPar <= 0 ? '#9fe87a' : '#fff') + ';">' + parStr + '</div>' +
      (placed ? '<div style="font:850 13px system-ui;color:rgba(255,255,255,.85);">Finished position ' + placed + ' · +' + fameGain + ' fame</div>' : '') +
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
    // Driving range + pass-and-play toggle live at the top of Quick Play
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;margin-bottom:14px;';
    var range = document.createElement('button');
    range.innerHTML = '🏌️ Driving Range';
    range.style.cssText = 'flex:1;padding:12px;border:1px solid rgba(238,248,216,.18);border-radius:14px;background:rgba(255,255,255,.05);color:#eef8d8;font:900 13px system-ui;cursor:pointer;';
    range.addEventListener('click', function () { if (window.DrivingRange) DrivingRange.start(); });
    row.appendChild(range);
    var pvp = document.createElement('button');
    var on = !!data.passPlay;
    pvp.innerHTML = (on ? '👥 2-Player: ON' : '👤 2-Player: OFF');
    pvp.style.cssText = 'flex:1;padding:12px;border:1px solid ' + (on ? 'rgba(255,226,122,.5)' : 'rgba(238,248,216,.18)') + ';border-radius:14px;background:' + (on ? 'linear-gradient(135deg,#2a7d46,#155a30)' : 'rgba(255,255,255,.05)') + ';color:#eef8d8;font:900 13px system-ui;cursor:pointer;';
    pvp.addEventListener('click', function () { data.passPlay = !data.passPlay; save(data); window.__passPlay = data.passPlay; renderCourseMenuV045(); });
    row.appendChild(pvp);
    shell.insertBefore(row, shell.children[2] || null);
    // achievements panel at the bottom of quick play
    if (window.Achievements) {
      try { shell.appendChild(Achievements.buildPanel()); } catch (e) {}
    }
  }

  function tournamentContent(shell) {
    var intro = document.createElement('div');
    intro.style.cssText = 'margin-bottom:14px;color:rgba(232,246,222,.8);font:800 12px system-ui;';
    intro.textContent = 'Play a full 18-hole round. Lowest score to par wins. Pick a course:';
    shell.appendChild(intro);
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

  // ---- wrap the menu render: inject tabs + per-mode content ----
  var beforeRender = renderCourseMenuV045;
  renderCourseMenuV045 = function renderCourseMenuModes() {
    if (MODE === 'quick') {
      beforeRender.apply(this, arguments);
      try {
        var shell = courseMenuV045 && courseMenuV045.firstElementChild;
        if (shell) { shell.insertBefore(modeTabs(), shell.children[1] || null); quickExtras(shell); }
      } catch (e) {}
      return;
    }
    // tournament / career: render our own shell
    courseMenuV045.innerHTML = '';
    courseMenuV045.style.display = 'block';
    courseMenuV045.style.overflowY = 'auto';
    var shell = document.createElement('div');
    shell.style.cssText = 'max-width:460px;margin:0 auto;padding:18px 16px 40px;';
    var title = document.createElement('div');
    title.innerHTML = '<div style="font:950 22px system-ui;color:#eef8d8;">' + (MODE === 'tournament' ? 'Tournament' : 'Career') + '</div>';
    title.style.marginBottom = '14px';
    shell.appendChild(title);
    shell.appendChild(modeTabs());
    if (MODE === 'tournament') tournamentContent(shell);
    else careerContent(shell);
    courseMenuV045.appendChild(shell);
  };

  window.__passPlay = !!data.passPlay;
  window.GameModes = { startTournament: startTournament, startCareerEvent: startCareerEvent, career: career, setMode: function (m) { MODE = m; } };
  window.gameModesLoaded = true;
})();
