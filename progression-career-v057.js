// v0.57 career mode, medals, trophies and handicap estimator.

const CAREER_KEY_V057 = 'tdg_career_profile_v057';
const ROUNDS_KEY_V057 = 'tdg_round_history_v057';
let roundRecordedTokenV057 = null;

function loadJsonV057(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}

function saveJsonV057(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function defaultCareerV057() {
  return { xp: 0, trophies: {}, medals: {}, custom: { ball: '#ffffff', trail: '#ffdd46', outfit: 'classic' } };
}

function loadCareerV057() {
  return { ...defaultCareerV057(), ...loadJsonV057(CAREER_KEY_V057, defaultCareerV057()) };
}

function saveCareerV057(profile) { saveJsonV057(CAREER_KEY_V057, profile); }
function loadRoundsV057() { return loadJsonV057(ROUNDS_KEY_V057, []); }
function saveRoundsV057(rounds) { saveJsonV057(ROUNDS_KEY_V057, rounds.slice(-30)); }

function careerLevelV057(xp) { return Math.floor(Math.sqrt(Math.max(0, xp) / 90)) + 1; }
function nextLevelXpV057(level) { return Math.pow(level, 2) * 90; }

function roundTokenV057() {
  return `${activeCourseIdV045 || 'course'}:${roundScoresV035.join('-')}:${roundCompletedStrokesV035()}`;
}

function medalForDiffV057(diff) {
  if (diff <= -4) return 'platinum';
  if (diff <= 0) return 'gold';
  if (diff <= 5) return 'silver';
  return 'bronze';
}

function medalRankV057(medal) { return ({ bronze: 1, silver: 2, gold: 3, platinum: 4 }[medal] || 0); }

function recordCompletedRoundV057(source) {
  if (!roundCompleteV035 || !roundScoresV035.every(v => v != null)) return;
  const token = roundTokenV057();
  if (roundRecordedTokenV057 === token) return;
  roundRecordedTokenV057 = token;

  const courseId = activeCourseIdV045 || 'willow';
  const courseName = activeCourseV045 ? activeCourseV045.name : 'Course';
  const par = roundTotalParV035();
  const strokesTaken = roundCompletedStrokesV035();
  const diff = strokesTaken - par;
  const medal = medalForDiffV057(diff);
  const birdies = roundScoresV035.reduce((sum, s, i) => sum + (s != null && s < ROUND_HOLES_V035[i].par ? 1 : 0), 0);
  const xpGain = Math.max(35, 90 - Math.max(diff, 0) * 3) + birdies * 10 + medalRankV057(medal) * 18;

  const profile = loadCareerV057();
  profile.xp += xpGain;
  const previousMedal = profile.medals[courseId];
  if (!previousMedal || medalRankV057(medal) > medalRankV057(previousMedal)) profile.medals[courseId] = medal;
  if (diff <= 0) profile.trophies[courseId] = true;
  saveCareerV057(profile);

  const rounds = loadRoundsV057();
  rounds.push({ courseId, courseName, par, strokes: strokesTaken, diff, medal, xpGain, at: Date.now() });
  saveRoundsV057(rounds);
}

const goNextHoleBeforeCareerV057 = goNextHoleV035;
goNextHoleV035 = function goNextHoleCareerV057() {
  const wasComplete = roundCompleteV035;
  goNextHoleBeforeCareerV057();
  if (!wasComplete && roundCompleteV035) recordCompletedRoundV057('complete');
};

function handicapEstimateV057() {
  const rounds = loadRoundsV057();
  if (rounds.length < 3) return null;
  const recent = rounds.slice(-20).map(r => r.diff).sort((a, b) => a - b);
  const take = Math.max(3, Math.ceil(recent.length * 0.4));
  const best = recent.slice(0, take);
  const avg = best.reduce((s, v) => s + v, 0) / best.length;
  return Math.round(avg * 10) / 10;
}

function courseUnlockTextV057(level) {
  const names = [];
  if (level >= 1) names.push('Willow Heath');
  if (level >= 2) names.push('Pine Ridge');
  if (level >= 3) names.push('Red Dunes');
  if (level >= 4) names.push('Coral Palms');
  if (level >= 5) names.push('Silver Creek');
  return names.join(' · ');
}

function careerPanelV057() {
  const profile = loadCareerV057();
  const rounds = loadRoundsV057();
  const level = careerLevelV057(profile.xp);
  const nextXp = nextLevelXpV057(level);
  const prevXp = nextLevelXpV057(level - 1);
  const progress = clamp((profile.xp - prevXp) / Math.max(1, nextXp - prevXp), 0, 1);
  const handicap = handicapEstimateV057();
  const trophies = Object.keys(profile.trophies || {}).length;
  const medalText = Object.entries(profile.medals || {}).map(([id, medal]) => `${id}: ${medal}`).join(' · ') || 'No medals yet';

  const box = document.createElement('div');
  box.style.cssText = 'margin:0 0 12px;padding:12px;border:1px solid rgba(238,248,216,.16);border-radius:18px;background:rgba(255,255,255,.07);color:#eef8d8;box-shadow:0 14px 34px rgba(0,0,0,.18);';
  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
      <div><div style="font:950 15px system-ui;">Career · Level ${level}</div><div style="font:750 11px system-ui;color:rgba(232,246,222,.68);">${profile.xp} XP · ${trophies} trophies</div></div>
      <div style="font:950 15px system-ui;color:#d9f89a;">${handicap == null ? 'HCP —' : `HCP ${handicap > 0 ? '+' : ''}${handicap}`}</div>
    </div>
    <div style="height:8px;margin:10px 0 8px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden;"><div style="width:${Math.round(progress * 100)}%;height:100%;background:linear-gradient(90deg,#d9f89a,#71d86d);"></div></div>
    <div style="font:750 11px/1.35 system-ui;color:rgba(232,246,222,.7);">Unlocked rewards: ${courseUnlockTextV057(level)}</div>
    <div style="font:700 10px/1.35 system-ui;color:rgba(232,246,222,.55);margin-top:4px;">Medals: ${medalText}</div>
    <div style="font:700 10px/1.35 system-ui;color:rgba(232,246,222,.55);margin-top:4px;">${rounds.length < 3 ? `${3 - rounds.length} more completed round${3 - rounds.length === 1 ? '' : 's'} for handicap estimate.` : `${rounds.length} completed rounds stored.`}</div>
  `;
  return box;
}

function injectCareerPanelV057() {
  if (!courseMenuV045 || !courseMenuV045.firstElementChild) return;
  const shell = courseMenuV045.firstElementChild;
  if (shell.querySelector('[data-career-panel-v057="true"]')) return;
  const panel = careerPanelV057();
  panel.dataset.careerPanelV057 = 'true';
  shell.insertBefore(panel, shell.children[1] || null);
}

const renderCourseMenuBeforeCareerV057 = renderCourseMenuV045;
renderCourseMenuV045 = function renderCourseMenuWithCareerV057() {
  renderCourseMenuBeforeCareerV057();
  injectCareerPanelV057();
};
renderCourseMenuV045();

const drawOverlayBeforeBuildV057Career = drawOverlayInfo;
drawOverlayInfo = function drawOverlayCareerV057() {
  drawOverlayBeforeBuildV057Career();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(4,10,6,0.9)';
  roundRect(ctx, canvas.width / 2 - 24, 10, 48, 14, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(221,238,210,0.92)';
  ctx.font = '850 8.5px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('v0.57', canvas.width / 2, 17.5);
  ctx.restore();
};
