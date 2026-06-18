// ============================================================================
// dev-tools.js  ·  hidden developer tools (loads last)
// ----------------------------------------------------------------------------
// Only activates when the page URL contains ?dev=1 (or #dev). Adds a small
// fixed-position panel with testing shortcuts. Invisible to normal players.
//   • Max Level — jump past level 52 + coins (unlocks every course & cosmetic)
//   • Reset — wipe progression back to a fresh start
// ============================================================================

(function () {
  'use strict';
  var on = /[?&]dev=1\b/.test(location.search) || /\bdev\b/.test(location.hash);
  if (!on) return;
  if (!window.Progress) return;

  function mkBtn(label, bg, onClick) {
    var b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'display:block;width:100%;margin:4px 0;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);' +
      'background:' + bg + ';color:#fff;font:800 12px system-ui;cursor:pointer;';
    b.addEventListener('click', onClick);
    return b;
  }

  function refreshMenu() {
    try { if (typeof renderCourseMenuV045 === 'function') renderCourseMenuV045(); } catch (e) {}
    try { if (typeof updateHud === 'function') updateHud(); } catch (e) {}
  }

  var panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;top:8px;left:8px;z-index:99999;width:140px;padding:8px;' +
    'background:rgba(12,18,14,.92);border:1px solid rgba(255,226,122,.4);border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.4);';
  var title = document.createElement('div');
  title.textContent = 'DEV TOOLS';
  title.style.cssText = 'font:900 10px system-ui;color:#ffe27a;letter-spacing:1px;margin-bottom:4px;text-align:center;';
  panel.appendChild(title);

  var lvlLabel = document.createElement('div');
  lvlLabel.style.cssText = 'font:750 10px system-ui;color:#cfe0c8;text-align:center;margin-bottom:6px;';
  function updateLabel() {
    try { lvlLabel.textContent = 'Lv ' + Progress.level().level + ' · ' + Progress.coins() + '◉'; } catch (e) {}
  }
  updateLabel();
  panel.appendChild(lvlLabel);

  panel.appendChild(mkBtn('Max Level', 'linear-gradient(135deg,#3fae5e,#1f7a3f)', function () {
    Progress._devMaxAll(); updateLabel(); refreshMenu();
  }));
  panel.appendChild(mkBtn('Reset Progress', 'linear-gradient(135deg,#b83232,#7a2020)', function () {
    if (Progress._reset) Progress._reset(); updateLabel(); refreshMenu();
  }));

  // collapse/expand so it doesn't block the view
  var collapsed = false;
  var toggle = mkBtn('— hide', 'rgba(255,255,255,.12)', function () {
    collapsed = !collapsed;
    [lvlLabel, panel.children[2], panel.children[3]].forEach(function (el) {
      if (el) el.style.display = collapsed ? 'none' : '';
    });
    toggle.textContent = collapsed ? '+ dev' : '— hide';
  });
  panel.appendChild(toggle);

  function attach() {
    if (document.body) document.body.appendChild(panel);
    else setTimeout(attach, 50);
  }
  attach();

  window.devToolsLoaded = true;
})();
