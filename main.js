"use strict";

const ui = Object.fromEntries(
  ["field", "time-track", "time-fill", "time", "clock-label", "wave", "hp-value", "hp-fill", "kills", "augment-progress", "enemy-strength", "announcement", "boss-hud", "boss-deadline", "pause",
    "augments", "combo-status", "ability-keys", "sound-toggle", "overlay", "panel-title", "panel-tag", "panel-copy", "panel-stats", "panel-detail", "panel-hint", "primary",
    "draft-overlay", "draft-stage", "draft-options", "practice-start", "practice-reset", "practice-exit"]
    .map((id) => [id, document.getElementById(id)]),
);
const ctx = ui.field.getContext("2d", { alpha: false });
const battleAudio = new BattleAudio();
const ground = makeGraveyard();
const enemySprites = new Map();
paintGraveyard(ground).catch((error) => console.error("Graveyard terrain:", error));
loadEnemyAtlas("assets/graveyard-foes.png", FOE_SPRITE_RECTS, enemySprites).catch((error) => console.error("Enemy atlas:", error));
loadEnemyAtlas("assets/graveyard-bosses.png", BOSS_SPRITE_RECTS, enemySprites).catch((error) => console.error("Boss atlas:", error));
let sprite;
loadSprite().then((loaded) => { sprite = loaded; }).catch((error) => console.error("Player sprite:", error));

const keys = new Set();
const movementKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);
const abilityKeys = { ShiftLeft: "dash", ShiftRight: "dash", Space: "shield" };
const masteryKeys = Object.fromEntries(Object.entries(MASTERIES).flatMap(([id, { key }]) =>
  [[`Digit${key}`, id], [`Numpad${key}`, id]]));
const cooldownBadges = new Map();
const masteryBadges = new Map();
const bossRows = new Map();
const view = { width: 1, height: 1, dpr: 1, zoom: 1, x: 0, y: 0 };
let session;
let mode = "ready";
let lastFrame;
let accumulator = 0;
let lastHudKey = "";
let lastWave = "1";
let lastNotice;
let shotPointer = null;

const menuScene = new Survival(seededRandom(4431));
menuScene.enemies.length = 0;
const menuRandom = seededRandom(7831);
const menuFoes = ["zombie", "skeleton", "bat", "frostfang", "wraith", "bonebow", "brute", "fuse", "sentinel"];
for (let i = 0; i < 54; i++) {
  const angle = i * 2.39996;
  const distance = 134 + menuRandom() * 290;
  const enemy = menuScene.spawn(menuFoes[i % menuFoes.length], distance);
  enemy.x = menuScene.player.x + Math.cos(angle) * distance;
  enemy.y = menuScene.player.y + Math.sin(angle) * distance;
  enemy.facing = enemy.x > menuScene.player.x ? -1 : 1;
}
function resize() {
  const { width, height } = ui.field.getBoundingClientRect();
  view.width = Math.max(1, width);
  view.height = Math.max(1, height);
  view.dpr = Math.min(2, window.devicePixelRatio || 1);
  ui.field.width = Math.round(view.width * view.dpr);
  ui.field.height = Math.round(view.height * view.dpr);
  view.zoom = Math.max(width / WORLD.width, height / WORLD.height, clamp(Math.min(width / 785, height / 650), .67, 1.38));
}
window.addEventListener("resize", resize);
resize();

function timeText(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function augmentIcon(augment) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${augment.icon}"/></svg>`;
}

function refreshAugments() {
  ui.augments.replaceChildren();
  ui["ability-keys"].replaceChildren();
  cooldownBadges.clear();
  masteryBadges.clear();
  for (const [id, rank] of session?.augments ?? []) {
    const augment = AUGMENTS[id];
    const mastery = MASTERIES[id];
    const slot = document.createElement("span");
    slot.className = "weapon";
    slot.style.setProperty("--augment-color", augment.color);
    slot.title = `${augment.name} ${rank}단계${augment.key ? ` (${augment.key})` : ""}`;
    if (rank >= MASTERY_RANK) slot.title += ` · ${mastery.name} [${mastery.key}]`;
    slot.setAttribute("role", "img");
    slot.setAttribute("aria-label", slot.title);
    slot.innerHTML = `${augmentIcon(augment)}<b class="weapon-rank">${rank}</b>`;
    if (augment.key) {
      const badge = document.createElement("span");
      badge.className = "weapon-cooldown";
      badge.hidden = true;
      slot.append(badge);
      cooldownBadges.set(id, badge);
      ui["ability-keys"].insertAdjacentHTML("beforeend",
        `<span class="hint-divider">/</span><kbd>${augment.key}</kbd> ${id === "dash" ? "대시" : "무적"}`);
    }
    if (rank >= MASTERY_RANK) {
      slot.classList.add("mastered");
      const badge = document.createElement("span");
      badge.className = "mastery-cooldown";
      badge.hidden = true;
      slot.insertAdjacentHTML("beforeend", `<kbd class="mastery-key">${mastery.key}</kbd>`);
      slot.append(badge);
      masteryBadges.set(id, { slot, badge });
    }
    ui.augments.append(slot);
  }
  for (let i = ui.augments.children.length; i < Object.keys(AUGMENTS).length; i++) {
    const slot = document.createElement("span");
    slot.className = "weapon";
    slot.setAttribute("aria-hidden", "true");
    ui.augments.append(slot);
  }
  const activeCombos = Object.entries(COMBOS).filter(([id]) => session?.hasCombo(id)).map(([, combo]) => combo.name);
  ui["combo-status"].hidden = !activeCombos.length;
  ui["combo-status"].textContent = activeCombos.join(" · ");
}
refreshAugments();

function refreshBossHud(run) {
  for (const [enemy, row] of bossRows) {
    if (run.enemies.includes(enemy)) continue;
    row.remove();
    bossRows.delete(enemy);
  }
  for (const enemy of run.enemies) {
    if (!enemy.def.bossName) continue;
    let row = bossRows.get(enemy);
    if (!row) {
      row = document.createElement("div");
      row.className = "boss-row";
      row.style.setProperty("--boss-color", enemy.def.color);
      const { color } = enemy.def.counter;
      row.innerHTML = `<span>${enemy.def.bossName}<b class="boss-opening" style="color:${color}" hidden></b></span><div class="boss-track"><div></div></div>`;
      ui["boss-hud"].append(row);
      bossRows.set(enemy, row);
    }
    const opening = row.firstElementChild.lastElementChild;
    const ticksLeft = enemy.recoverUntil - run.ticks;
    opening.hidden = ticksLeft <= 0;
    if (ticksLeft > 0) {
      const { label, damage } = enemy.def.counter;
      const text = `${label} · 피해 ×${damage} · ${(ticksLeft / TICKS_PER_SECOND).toFixed(1)}초`;
      if (opening.textContent !== text) opening.textContent = text;
    }
    row.lastElementChild.firstElementChild.style.transform = `scaleX(${enemy.hp / enemy.maxHp})`;
  }
  ui["boss-hud"].hidden = bossRows.size === 0;
  const nextBossMinute = Object.keys(BOSS_MINUTES).find((minute) => Number(minute) * 60 > run.seconds);
  const deadline = ui["boss-deadline"];
  deadline.hidden = bossRows.size === 0 || !nextBossMinute || run.enemyMultiplier > 1;
  if (!deadline.hidden) {
    const label = `${timeText(Math.ceil(Number(nextBossMinute) * 60 - run.seconds))} 내 미처치 시 모든 적 +30%`;
    if (deadline.textContent !== label) deadline.textContent = label;
  }
}

function refreshHud(run) {
  const left = run.practice ? RUN_SECONDS : Math.ceil(run.remaining);
  ui["time-track"].hidden = run.practice;
  ui["practice-reset"].hidden = !run.practice || mode !== "playing";
  ui["time-fill"].style.transform = `scaleX(${run.practice ? 1 : run.remaining / RUN_SECONDS})`;
  const p = run.player;
  const hp = Math.ceil(p.hp);
  const key = [run.practice, left, hp, p.maxHp, run.kills, run.wave, run.nextAugmentKills, run.enemyMultiplier].join("/");
  ui["hp-fill"].style.transform = `scaleX(${p.hp / p.maxHp})`;
  if (key !== lastHudKey) {
    lastHudKey = key;
    ui.announcement.hidden = run.practice;
    ui["clock-label"].textContent = run.practice ? "스킬 테스트" : "새벽까지";
    ui.time.textContent = run.practice ? "∞" : timeText(left);
    ui["time-track"].setAttribute("aria-valuenow", left);
    ui["time-track"].setAttribute("aria-valuetext", timeText(left));
    ui["hp-value"].textContent = `${hp} / ${p.maxHp}`;
    ui.kills.textContent = run.kills.toLocaleString("ko-KR");
    const toNextAugment = Math.max(0, run.nextAugmentKills - run.kills);
    ui["augment-progress"].hidden = run.draftIndex === 0;
    ui["augment-progress"].textContent = Number.isFinite(toNextAugment) ? `다음 증강 · ${toNextAugment}마리` : "증강 완료";
    ui["enemy-strength"].hidden = run.enemyMultiplier === 1;
    const waveLabel = run.practice ? "practice" : String(run.wave);
    if (waveLabel !== lastWave) {
      lastWave = waveLabel;
      ui.wave.innerHTML = run.practice ? "1–6 스킬 <i></i> R 초기화" : `WAVE ${String(run.wave).padStart(2, "0")} <i></i> 20`;
    }
  }
  for (const [id, badge] of cooldownBadges) {
    const seconds = Math.ceil(run.cooldown(id));
    badge.hidden = seconds === 0;
    if (badge.textContent !== String(seconds)) badge.textContent = seconds;
  }
  for (const [id, { slot, badge }] of masteryBadges) {
    const seconds = Math.ceil(run.masteryCooldown(id));
    const label = seconds >= 60 ? timeText(seconds).slice(1) : `${seconds}초`;
    badge.hidden = seconds === 0;
    if (badge.textContent !== label) badge.textContent = label;
    slot.classList.toggle("mastery-active", run.masteryActive(id));
  }
  if (run.notice !== lastNotice) {
    lastNotice = run.notice;
    ui.announcement.textContent = run.notice.text;
    ui.announcement.classList.toggle("boss-notice", Boolean(run.notice.boss));
  }
  ui.announcement.classList.toggle("visible", !run.practice && mode === "playing" && run.ticks - run.notice.tick < 155);
  refreshBossHud(run);
}

function stopShooting() {
  const pointerId = shotPointer?.id;
  shotPointer = null;
  if (pointerId !== undefined && ui.field.hasPointerCapture(pointerId)) ui.field.releasePointerCapture(pointerId);
}

function clearInput() {
  keys.clear();
  stopShooting();
}

function play() {
  mode = "playing";
  lastFrame = undefined;
  accumulator = 0;
  clearInput();
  ui.overlay.hidden = true;
  ui["draft-overlay"].hidden = true;
  ui.field.classList.add("playing");
  ui.pause.disabled = false;
  ui.primary.blur();
  ui["practice-start"].blur();
  ui["practice-reset"].blur();
  refreshHud(session);
}

function showDraft() {
  mode = "draft";
  clearInput();
  ui.overlay.hidden = true;
  ui.field.classList.remove("playing");
  ui.pause.disabled = true;
  ui["draft-stage"].textContent = session.draftIndex === 0 ? "시작 증강" : `${session.kills}마리 처치  ·  증강 ${session.draftIndex + 1}회차`;
  const cards = session.getAugmentOffers().map((id) => {
    const augment = AUGMENTS[id];
    const mastery = MASTERIES[id];
    const rank = session.rank(id);
    const synergy = Object.entries(COMBOS).find(([comboId, combo]) => !session.hasCombo(comboId) &&
      combo.augments.includes(id) && combo.augments.some((partner) => partner !== id && session.rank(partner)));
    const current = session.stats(id) ?? augment.base;
    const next = augment.ranks[rank];
    const stats = Object.entries(augment.labels).map(([stat, [label, unit]]) => {
      const value = current ? `${current[stat]}${unit} → ${next[stat]}${unit}` : `${next[stat]}${unit}`;
      return `<span class="draft-stat"><span>${label}</span><b>${value}</b></span>`;
    }).join("");
    const card = document.createElement("button");
    card.type = "button";
    card.className = "draft-card";
    card.style.setProperty("--augment-color", augment.color);
    card.toggleAttribute("data-upgrade", rank > 0);
    card.innerHTML = `
      <span class="draft-rank">${rank ? `${rank} → ${rank + 1}단계` : "신규"}</span>
      <span class="draft-icon">${augmentIcon(augment)}</span>
      <strong>${augment.name}</strong>
      <span class="draft-type">${augment.type}${augment.key ? ` · ${augment.key}` : ""}</span>
      <span class="draft-description">${augment.description}</span>
      <span class="draft-stats">${stats}</span>
      <span class="draft-mastery"><b>${rank + 1 === MASTERY_RANK ? "이번에 해금" : "5단계 해금"} · ${mastery.name} [${mastery.key}]</b>
        ${mastery.description} 재사용 ${mastery.cooldown >= 60 ? `${mastery.cooldown / 60}분` : `${mastery.cooldown}초`}.
      </span>
      ${synergy ? `<span class="draft-synergy"><b>${synergy[1].name}</b> ${synergy[1].detail}</span>` : ""}`;
    card.addEventListener("click", () => {
      if (mode !== "draft" || !session.pickAugment(id)) return;
      refreshAugments();
      play();
    });
    return card;
  });
  ui["draft-options"].replaceChildren(...cards);
  ui["draft-overlay"].hidden = false;
  ui["draft-overlay"].scrollTop = 0;
  cards[0].focus({ preventScroll: true });
  refreshHud(session);
}

const SCREENS = {
  ready: { title: document.title, button: "플레이" },
  paused: { tag: "PAUSED", title: "일시정지", copy: "생존을 이어갈 준비가 되셨나요?", button: "계속하기" },
  win: { tag: "SURVIVED", title: "새벽이 밝았습니다", copy: "20분 동안 살아남았습니다.", button: "다시 시작" },
  loss: { tag: "RUN ENDED", title: "망자에게 포위됐습니다", copy: "묘지의 밤이 다시 시작됩니다.", button: "다시 도전" },
};
const readyCopy = ui["panel-copy"].innerHTML;
const PRACTICE_PAUSE = {
  tag: "PRACTICE", title: "스킬 테스트", copy: "숫자 1–6으로 스킬을 사용하세요. R을 누르면 표적, 체력, 재사용 대기시간이 초기화됩니다.", button: "계속하기",
};
const COMPLETE_CLEAR = { tag: "ALL BOSSES DEFEATED", title: "완전 토벌", copy: "세 보스를 모두 처치하고 새벽까지 살아남았습니다.", button: "다시 시작" };
const RECORD_KEY = "midnight-survivors-record-v1";
let bestRecord = { seconds: 0, complete: false };
try {
  const saved = JSON.parse(localStorage.getItem(RECORD_KEY));
  if (saved && Number.isFinite(saved.seconds)) {
    bestRecord = { seconds: clamp(saved.seconds, 0, RUN_SECONDS), complete: saved.complete === true };
  }
} catch {
  // The current session still keeps its record when browser storage is unavailable.
}

function renderRunSummary(complete) {
  const seconds = Math.floor(session.seconds);
  bestRecord.seconds = Math.max(bestRecord.seconds, seconds);
  bestRecord.complete ||= complete;
  try {
    localStorage.setItem(RECORD_KEY, JSON.stringify(bestRecord));
  } catch {
    // The summary remains usable without storage.
  }

  const labels = [`생존 ${timeText(seconds)}`, `처치 ${session.kills.toLocaleString("ko-KR")}`, `최고 생존 ${timeText(bestRecord.seconds)}`];
  if (bestRecord.complete) labels.push("완전 토벌 달성");
  ui["panel-stats"].replaceChildren(...labels.map((label) => {
    const span = document.createElement("span");
    span.textContent = label;
    return span;
  }));
  const augments = [...session.augments].map(([id, rank]) => `${AUGMENTS[id].name} ${rank}단계`);
  const details = [
    ["처치한 보스", session.defeatedBosses.join(" · ") || "0 / 3"],
    ["마지막 피격", session.lastDamageSource || "피격 없음"],
    ["선택한 증강", augments.join(" · ")],
  ];
  ui["panel-detail"].replaceChildren(...details.map(([label, value]) => {
    const row = document.createElement("div");
    const name = document.createElement("b");
    const text = document.createElement("span");
    name.textContent = label;
    text.textContent = value;
    row.append(name, text);
    return row;
  }));
}

function showScreen(screen) {
  const complete = screen === "win" && Object.values(BOSS_MINUTES)
    .every((kind) => session.defeatedBosses.includes(FOES[kind].bossName));
  const practicePause = screen === "paused" && session?.practice;
  const content = practicePause ? PRACTICE_PAUSE : complete ? COMPLETE_CLEAR : SCREENS[screen];
  mode = screen;
  clearInput();
  ui.field.classList.remove("playing");
  refreshHud(session || menuScene);
  ui.overlay.dataset.screen = screen;
  ui.overlay.hidden = false;
  ui.pause.disabled = true;
  ui["panel-tag"].hidden = !content.tag;
  ui["panel-tag"].textContent = content.tag ?? "";
  ui["panel-title"].lang = screen === "ready" ? "en" : "ko";
  ui["panel-title"].textContent = content.title;
  if (screen === "ready") ui["panel-copy"].innerHTML = readyCopy;
  else ui["panel-copy"].textContent = content.copy;
  const showSummary = (screen === "win" || screen === "loss") && !session.practice;
  ui["panel-stats"].hidden = !showSummary;
  ui["panel-detail"].hidden = !showSummary;
  if (showSummary) renderRunSummary(complete);
  ui["panel-hint"].hidden = screen !== "ready";
  ui["practice-start"].hidden = screen !== "ready";
  ui["practice-exit"].hidden = !practicePause;
  ui.primary.firstChild.textContent = `${content.button} `;
  ui.primary.focus({ preventScroll: true });
}

function startPractice() {
  battleAudio.unlock();
  session = new Survival(Math.random, (cue) => battleAudio.play(cue), { practice: true });
  refreshAugments();
  play();
}

ui["practice-start"].addEventListener("click", startPractice);
ui["practice-reset"].addEventListener("click", startPractice);
ui["practice-exit"].addEventListener("click", () => {
  session = null;
  refreshAugments();
  showScreen("ready");
});

ui.primary.addEventListener("click", () => {
  battleAudio.unlock();
  if (mode === "paused") {
    play();
    return;
  }
  session = new Survival(Math.random, (cue) => battleAudio.play(cue));
  refreshAugments();
  showDraft();
});
ui.pause.addEventListener("click", () => showScreen("paused"));
ui["sound-toggle"].addEventListener("click", () => {
  const muted = battleAudio.toggle();
  const button = ui["sound-toggle"];
  const label = muted ? "효과음 켜기" : "효과음 끄기";
  button.setAttribute("aria-pressed", String(muted));
  button.setAttribute("aria-label", label);
  button.title = label;
});

function movement() {
  return {
    dx: Number(keys.has("KeyD")) - Number(keys.has("KeyA")),
    dy: Number(keys.has("KeyS")) - Number(keys.has("KeyW")),
  };
}

window.addEventListener("keydown", (event) => {
  if (mode !== "playing") return;
  if (session.practice && event.code === "KeyR") {
    event.preventDefault();
    if (!event.repeat) startPractice();
    return;
  }
  if (movementKeys.has(event.code)) {
    event.preventDefault();
    keys.add(event.code);
  }
  const ability = abilityKeys[event.code];
  const mastery = masteryKeys[event.code];
  if ((ability && session.rank(ability)) || (mastery && session.rank(mastery) >= MASTERY_RANK)) {
    event.preventDefault();
    if (!event.repeat) {
      const { dx, dy } = movement();
      if (mastery) session.activateMastery(mastery, dx, dy);
      else session.activate(ability, dx, dy);
      refreshHud(session);
    }
  }
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", clearInput);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && mode === "playing") showScreen("paused");
});
function shotAim() {
  if (!shotPointer) return null;
  const rect = ui.field.getBoundingClientRect();
  return { x: view.x + (shotPointer.x - rect.left) / view.zoom, y: view.y + (shotPointer.y - rect.top) / view.zoom };
}

ui.field.addEventListener("pointerdown", (event) => {
  if (mode !== "playing" || event.button !== 0 || event.pointerType !== "mouse" || shotPointer) return;
  shotPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  ui.field.setPointerCapture(event.pointerId);
  const aim = shotAim();
  session.shoot(aim.x, aim.y);
});
ui.field.addEventListener("pointermove", (event) => {
  if (event.pointerId !== shotPointer?.id) return;
  if (!(event.buttons & 1)) {
    stopShooting();
    return;
  }
  shotPointer.x = event.clientX;
  shotPointer.y = event.clientY;
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
  ui.field.addEventListener(type, (event) => {
    if (event.pointerId === shotPointer?.id) stopShooting();
  });
}

function drawScene(run, wallTime) {
  const { width, height, dpr, zoom } = view;
  const viewWidth = width / zoom;
  const viewHeight = height / zoom;
  const menu = mode === "ready";
  const p = run.player;
  const time = menu ? wallTime : run.seconds;
  const tick = menu ? Math.floor(wallTime * TICKS_PER_SECOND) : run.ticks;
  view.x = clamp(p.x - viewWidth * (menu && width >= 820 ? .32 : .5), 0, Math.max(0, WORLD.width - viewWidth));
  view.y = clamp(p.y - viewHeight * (menu && width < 820 ? .71 : .52), 0, Math.max(0, WORLD.height - viewHeight));
  const visible = (object, margin = 95) => object.x >= view.x - margin && object.x <= view.x + viewWidth + margin &&
    object.y >= view.y - margin && object.y <= view.y + viewHeight + margin;

  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, -view.x * dpr * zoom, -view.y * dpr * zoom);
  ctx.drawImage(ground, 0, 0);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const light of TORCHES) if (visible(light, 150)) torch(ctx, light.x, light.y, time);
  for (const stone of COVER) if (visible(stone)) drawCover(ctx, stone);
  if (run.blades.length) {
    const counter = tick < run.counterUntil;
    const empowered = run.masteryActive("orbit");
    ring(ctx, p.x, p.y, run.bladeRadius, empowered || counter ? "#e4b1ffe0" : "#bc81ee3d", empowered || counter ? 2.4 : 1.1);
    if (empowered) drawMasteryOrbit(ctx, run);
  }
  if (run.masteryActive("vitality")) drawMasteryHealing(ctx, p, time, true);
  if (run.masteryActive("regen")) drawMasteryHealing(ctx, p, time, false);
  for (const hazard of run.hazards) {
    if ((hazard.kind === "eruption" || hazard.kind === "blast") && visible(hazard)) drawHazard(ctx, hazard, tick);
  }
  for (const enemy of run.enemies) {
    if (enemy.attack && visible(enemy, enemy.attack.beam ? BOSS_LASER_REACH + 50 : 540)) drawBossAttack(ctx, enemy, tick);
    if (enemy.skill && visible(enemy, 430)) drawFoeWarning(ctx, enemy, tick);
    if (visible(enemy)) drawEnemyStatus(ctx, enemy, tick);
  }
  for (const effect of run.effects) {
    if (effect.kind === "dash-trail" && visible(effect, effect.radius)) drawEffect(ctx, effect, tick);
  }

  const actors = run.enemies.filter((enemy) => (enemy.opacity ?? 1) > 0 && visible(enemy));
  actors.push(p);
  actors.sort((a, b) => a.y - b.y);
  for (const actor of actors) {
    if (actor === p) {
      drawPlayer(ctx, p, time, menu ? 0 : tick, sprite, (run.masteryUntil.shield ?? 0) - tick);
      continue;
    }
    ctx.globalAlpha = actor.opacity ?? 1;
    if (enemySprites.has(actor.kind)) drawEnemySprite(ctx, actor, enemySprites.get(actor.kind), time, tick);
    else drawEnemy(ctx, actor, time, tick);
    if (tick < actor.recoverUntil) drawBossOpening(ctx, actor, tick);
    ctx.globalAlpha = 1;
  }
  if (!menu) {
    for (const actor of actors) {
      if (actor === p || actor.def.bossName || actor.hp <= 0) continue;
      ctx.globalAlpha = actor.opacity ?? 1;
      drawEnemyHealth(ctx, actor);
    }
    ctx.globalAlpha = 1;
  }
  for (const blade of run.blades) drawBlade(ctx, blade);
  for (const hazard of run.hazards) {
    if ("vx" in hazard && visible(hazard)) drawHazard(ctx, hazard, tick);
  }
  for (const bolt of run.bolts) if (visible(bolt)) drawBolt(ctx, bolt);
  for (const effect of run.effects) {
    if (effect.kind !== "dash-trail" && visible(effect, Math.max(200, effect.radius ?? 0))) drawEffect(ctx, effect, tick);
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const centerX = width / 2;
  const centerY = height / 2;
  const vignette = ctx.createRadialGradient(centerX, centerY, Math.min(width, height) * .24, centerX, centerY, Math.hypot(width, height) * .53);
  vignette.addColorStop(0, "#0c0a1600");
  vignette.addColorStop(1, "#080713b5");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function frame(timestamp) {
  const delta = lastFrame === undefined ? 0 : Math.min((timestamp - lastFrame) / 1000, .25);
  lastFrame = timestamp;
  if (mode === "playing") {
    accumulator += delta * TICKS_PER_SECOND;
    const { dx, dy } = movement();
    const aim = shotAim();
    while (accumulator >= 1 && !session.result && !session.choosingAugment) {
      session.step(dx, dy, aim);
      accumulator--;
    }
    if (session.result) showScreen(session.result);
    else if (session.choosingAugment) showDraft();
    else refreshHud(session);
  }
  drawScene(session || menuScene, timestamp / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
