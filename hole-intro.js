// ============================================================================
// hole-intro.js  ·  clean hole title card (replaces the old cinematic flyover)
// ----------------------------------------------------------------------------
// On each new hole, briefly slide in a tidy card with the hole number, par and
// distance, then fade it out. No camera takeover, no sprinklers — just a crisp,
// modern intro that doesn't get in the way.
// ============================================================================

(function () {
  'use strict';

  function holeDistanceYards(h) {
    if (!h || !h.start || !h.cup) return null;
    var dx = h.cup.x - h.start.x, dy = h.cup.y - h.start.y;
    var px = Math.sqrt(dx * dx + dy * dy);
    var ypp = (typeof YARDS_PER_PIXEL !== 'undefined') ? YARDS_PER_PIXEL : 0.92;
    return Math.round(px * ypp);
  }

  function showCard(h) {
    if (!h || h.isRange) return;   // no card on range/putting practice
    try {
      var old = document.getElementById('holeCardV2'); if (old) old.remove();
      var num = (typeof roundHoleIndexV035 !== 'undefined') ? roundHoleIndexV035 + 1 : (h.id || 1);
      var yards = holeDistanceYards(h);
      var card = document.createElement('div');
      card.id = 'holeCardV2';
      card.style.cssText = 'position:fixed;left:50%;top:18%;transform:translateX(-50%) translateY(-10px);' +
        'z-index:99990;background:linear-gradient(135deg,rgba(31,107,56,.96),rgba(14,58,32,.96));' +
        'border:1px solid rgba(255,226,122,.45);border-radius:16px;padding:14px 22px;text-align:center;' +
        'box-shadow:0 12px 34px rgba(0,0,0,.4);opacity:0;transition:opacity .4s ease,transform .4s ease;pointer-events:none;';
      card.innerHTML =
        '<div style="font:950 12px system-ui;color:#ffe27a;letter-spacing:2px;">HOLE ' + num + '</div>' +
        '<div style="font:900 15px system-ui;color:#fff;margin-top:3px;">Par ' + (h.par || 4) +
        (yards ? '  ·  ' + yards + ' yds' : '') + '</div>';
      document.body.appendChild(card);
      requestAnimationFrame(function () { card.style.opacity = '1'; card.style.transform = 'translateX(-50%) translateY(0)'; });
      setTimeout(function () {
        card.style.opacity = '0'; card.style.transform = 'translateX(-50%) translateY(-10px)';
        setTimeout(function () { if (card.parentNode) card.remove(); }, 450);
      }, 1900);
    } catch (e) {}
  }

  if (typeof resetRoundHoleV035 === 'function') {
    var beforeReset = resetRoundHoleV035;
    resetRoundHoleV035 = function resetRoundHoleWithCard(i) {
      beforeReset(i);
      if (typeof hole !== 'undefined' && hole) showCard(hole);
    };
  }
  if (typeof hole !== 'undefined' && hole) showCard(hole);

  window.holeIntroLoaded = true;
})();
