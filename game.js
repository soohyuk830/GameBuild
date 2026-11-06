"use strict";

const TICKS_PER_SECOND = 60;
const WAVE_SECONDS = 60;
const WAVE_COUNT = 20;
const RUN_SECONDS = WAVE_SECONDS * WAVE_COUNT;
const FIRST_AUGMENT_COST = 18;
const AUGMENT_COST_INCREASE = 14;
const OVERDUE_BOSS_MULTIPLIER = 1.3;
const BASE_HP = 100;
const MANUAL_MIN_COOLDOWN_TICKS = 12;
const MANUAL_DAMAGE = 29;
const MANUAL_PIERCE_DAMAGE = 19;
const PLAYER_BOLT_LIFETIME = 106;
const ENEMY_ARROW_LIFETIME = 174;
const BOSS_SHARD_LIFETIME = 255;
const STEALTH_TARGET_ALPHA = .18;
const DASH_DURATION_TICKS = 10;
const BREACH_SHOT_WINDOW = 80;
const ORBIT_COUNTER_TICKS = 30;
const HIT_IMMUNITY_TICKS = 48;
const BOSS_CHARGE_TICKS = 30;
const BOSS_CHARGE_STRIDE = 15;
const BOSS_VOLLEY_COUNT = 16;
const BOSS_LASER_WINDUP = 44;
const BOSS_LASER_DURATION = 28;
const BOSS_LASER_REACH = 960;
const BOSS_LASER_RADIUS = 14;
const BOSS_LASER_DAMAGE = 34;
const BOSS_MINUTES = { 5: "reaper", 10: "sovereign", 15: "bloodlord" };
const BOSS_CORE_RADIUS = 18;
const ASSAULT_SETUP_TICKS = 150;
const ERUPTION_DURATION = 36;
const WORLD = { width: 2440, height: 1840 };
const TAU = Math.PI * 2;
const COVER = [
  { x: 840, y: 1070, width: 76, height: 28 },
  { x: 1600, y: 755, width: 30, height: 76 },
  { x: 1360, y: 1300, width: 68, height: 28 },
];

const AUGMENTS = {
  auto: {
    name: "월광탄", type: "자동 공격", color: "#9fe5ff",
    description: "가까운 적을 향해 마력탄을 자동으로 발사합니다.",
    icon: "M3 21 14 6l7-3-3 7L3 21Zm9-7 6-4M16 8l-1-4M8 17l-4 1",
    labels: { cooldown: ["발사 간격", "초"], damage: ["피해", ""] },
    ranks: [
      { cooldown: 0.9, damage: 15 }, { cooldown: 0.72, damage: 20 }, { cooldown: 0.59, damage: 26 },
      { cooldown: 0.47, damage: 32 }, { cooldown: 0.37, damage: 39 },
    ],
  },
  dash: {
    name: "그림자 대시", type: "이동", color: "#d3aaff", key: "Shift",
    description: "이동 방향으로 돌진하며 적의 접촉 피해를 피합니다. 멈춰 있으면 마지막 이동 방향으로 돌진합니다.",
    icon: "m13 3-7 10h6l-1 8 8-11h-6l1-7ZM3 7h4M2 17h5",
    labels: { cooldown: ["재사용 대기시간", "초"] },
    ranks: [{ cooldown: 11 }, { cooldown: 8 }, { cooldown: 6.5 }, { cooldown: 5.5 }, { cooldown: 4.5 }],
  },
  shield: {
    name: "달빛 장막", type: "방어", color: "#ffe0a6", key: "Space",
    description: "장막이 유지되는 동안 피해를 받지 않습니다.",
    icon: "M12 2 3 6v5c0 5 4 9 9 11 5-2 9-6 9-11V6l-9-4Zm0 5v9m-4-5h8",
    labels: { duration: ["무적 시간", "초"], cooldown: ["재사용 대기시간", "초"] },
    ranks: [
      { duration: 1.75, cooldown: 27 }, { duration: 2, cooldown: 25 }, { duration: 2.35, cooldown: 23 },
      { duration: 2.7, cooldown: 21 }, { duration: 3.1, cooldown: 19 },
    ],
  },
  orbit: {
    name: "공전 부메랑", type: "자동 공격", color: "#f0b5ff",
    description: "몸 주위를 도는 부메랑이 닿은 적에게 피해를 줍니다.",
    icon: "M12 12c-1-6 4-9 8-8-2 3-4 7-8 8Zm0 0c6 1 7 7 4 10-1-4-4-6-4-10Zm0 0c-5 4-9 1-10-3 4 1 7 0 10 3Z",
    labels: { count: ["부메랑", "개"], damage: ["타격 피해", ""] },
    ranks: [
      { count: 1, damage: 16 }, { count: 2, damage: 21 }, { count: 3, damage: 27 },
      { count: 4, damage: 34 }, { count: 5, damage: 40 },
    ],
  },
  vitality: {
    name: "생명의 그릇", type: "최대 체력", color: "#ff9eaf",
    description: "최대 체력이 늘어나고, 늘어난 만큼 즉시 회복합니다.",
    icon: "M12 21 4 13C-1 8 5 2 10 6l2 2 2-2c5-4 11 2 6 7l-8 8Zm-6-9h3l2-3 2 6 2-3h3",
    labels: { maxHp: ["최대 체력", ""] },
    base: { maxHp: BASE_HP },
    ranks: [{ maxHp: 120 }, { maxHp: 144 }, { maxHp: 172 }, { maxHp: 204 }, { maxHp: 240 }],
  },
  regen: {
    name: "새벽의 숨결", type: "체력 회복", color: "#a8edc8",
    description: "전투 중 체력을 지속적으로 회복합니다.",
    icon: "M12 3C9 8 5 11 5 15a7 7 0 0 0 14 0c0-4-4-7-7-12Zm0 9v7m-3.5-3.5h7",
    labels: { perSecond: ["초당 회복", " HP"] },
    base: { perSecond: 0 },
    ranks: [{ perSecond: .2 }, { perSecond: .35 }, { perSecond: .5 }, { perSecond: .7 }, { perSecond: .9 }],
  },
};

const MASTERY_RANK = 5;
const MASTERIES = {
  auto: {
    key: "1", name: "월광 폭우", cooldown: 30, shots: 50, shotInterval: 2, range: 520, damage: 18,
    description: "몸에서 세 갈래로 마력탄 50발을 빠르게 연사합니다. 탄이 곡선을 그리며 주변 적을 추적합니다.",
  },
  dash: {
    key: "2", name: "그림자 질주", cooldown: 30, duration: 4, reach: 1.8, damage: 42,
    description: "4초간 대시 거리가 1.8배가 되고 Shift로 연속 대시할 수 있습니다. 지나친 적에게 대시당 피해 42를 줍니다.",
  },
  shield: {
    key: "3", name: "달빛 파쇄", cooldown: 30, duration: 2, radius: 225, damage: 130,
    description: "2초간 무적이 됩니다. 장막이 깨지면 원형 충격파가 퍼져 피해 130을 줍니다.",
  },
  orbit: {
    key: "4", name: "폭주 월륜", cooldown: 30, duration: 6, size: 1.6, speed: 1.7, radiusBonus: 55,
    description: "6초간 부메랑 크기가 1.6배, 회전 속도가 1.7배가 되고 궤도가 넓어집니다.",
  },
  vitality: {
    key: "5", name: "생명의 쇄도", cooldown: 180, duration: 3, heal: .35,
    description: "3초에 걸쳐 최대 체력의 35%를 회복합니다.",
  },
  regen: {
    key: "6", name: "새벽의 재생", cooldown: 180, duration: 3, heal: .35,
    description: "3초에 걸쳐 최대 체력의 35%를 회복합니다.",
  },
};

const FOES = {
  zombie: { name: "망자", hp: 46, speed: 61, radius: 15, damage: 13, color: "#9fc083" },
  bat: { name: "묘지 박쥐", hp: 27, speed: 100, radius: 12, damage: 10, color: "#bd89eb" },
  skeleton: { name: "해골 전사", hp: 72, speed: 81, radius: 16, damage: 18, color: "#e2d6ae" },
  wraith: { name: "묘지 망령", hp: 64, speed: 116, radius: 14, damage: 21, color: "#6edccc" },
  brute: { name: "묘지 거인", hp: 137, speed: 62, radius: 22, damage: 27, color: "#d9939f" },
  reaper: {
    bossName: "묘지의 집행자", pattern: "charge", windup: 55, delay: 190, range: 365,
    hp: 2400, speed: 83, radius: 30, damage: 27, color: "#ff9c93",
    counter: { label: "돌진 후 빈틈", ticks: 108, damage: 1.85, color: "#ffd19a" },
  },
  sovereign: {
    bossName: "망령 군주", pattern: "laser", alternate: "volley", windup: 49, delay: 195, range: 560,
    hp: 4700, speed: 99, radius: 33, damage: 32, color: "#9effe9",
    counter: { label: "코어 노출", ticks: 144, damage: 2.5, color: "#9fffea" },
  },
  bloodlord: {
    bossName: "피의 성주", pattern: "eruption", windup: 61, delay: 165, range: 640,
    hp: 7900, speed: 115, radius: 39, damage: 37, color: "#ff90ce",
    counter: { label: "혈문 균열", ticks: 120, damage: 2.05, color: "#ffadd5" },
  },
};

const AUGMENT_LIMIT = Object.values(AUGMENTS).reduce((total, augment) => total + augment.ranks.length, 0);
const COMBOS = {
  breach: { name: "돌파 사격", augments: ["dash", "auto"], detail: "대시 직후 기본탄 한 발이 적 한 마리를 더 관통합니다." },
  counter: { name: "월륜 반격", augments: ["shield", "orbit"], detail: "장막이 끝나면 부메랑이 바깥으로 펼쳐져 맞힌 적을 밀어냅니다." },
};

const FOE_ROLES = {
  rush: { radius: 13, range: 128, windup: 31, duration: 18, delay: 146 },
  ranged: { radius: 15, range: 330, windup: 35, delay: 158 },
  tank: { radius: 22, armor: 0.19 },
  bomber: { radius: 15, range: 86, windup: 49, blastRadius: 78 },
  stealth: { radius: 14, revealRadius: 155, hideRadius: 215 },
  split: { radius: 19, child: "rotling" },
};

// Each wave debuts at least one foe. Their colors and silhouettes identify their attacks.
const WAVE_DEBUTS = [
  ["zombie", "bat"],
  ["crawler"], ["hound"], ["slinger"], ["hexer", "headhunter"],
  ["frostfang"], ["bonebow"], ["sentinel", "veil"], ["spitter"], ["nightfang", "twinrot"],
  ["bulwark", "fuse"], ["cultist"], ["bombard"], ["redguard"], ["prowler"],
  ["pyre"], ["stormbow"], ["ironwall"], ["stalker"], ["doomfuse"],
];

// Kind, name, role, base HP, speed, damage, accent, and an optional skill modifier.
const WAVE_FOES = [
  ["crawler", "묘지 추적자", "rush", 33, 92, 11, "#a9d491"],
  ["hound", "잿빛 사냥개", "rush", 41, 100, 12, "#e1ae85", { duration: 21 }],
  ["slinger", "뼛조각 투척수", "ranged", 38, 70, 11, "#ffcf83"],
  ["hexer", "자줏빛 주술사", "ranged", 42, 66, 12, "#d099ff", { delay: 132 }],
  ["frostfang", "서리 송곳니", "rush", 45, 103, 13, "#91d9ff", { windup: 27 }],
  ["bonebow", "해골 궁수", "ranged", 44, 74, 12, "#e7deb1", { range: 385 }],
  ["sentinel", "묘지 방패병", "tank", 83, 55, 16, "#8facc0", { armor: 0.14 }],
  ["spitter", "독안개 토사수", "ranged", 47, 73, 12, "#b7ef74", { shots: 2 }],
  ["nightfang", "밤그림자 발톱", "rush", 53, 106, 14, "#9d9fff", { duration: 22 }],
  ["bulwark", "철갑 거인", "tank", 116, 58, 20, "#a7d9e1", { armor: 0.25 }],
  ["fuse", "화약 운반병", "bomber", 42, 87, 19, "#ffad63"],
  ["cultist", "핏빛 사수", "ranged", 51, 75, 13, "#ff829d", { shots: 2 }],
  ["bombard", "역병 자폭병", "bomber", 48, 91, 22, "#a8e25f", { blastRadius: 91 }],
  ["redguard", "진홍 방패병", "tank", 110, 65, 22, "#ed9395", { armor: 0.22 }],
  ["prowler", "황혼 추적자", "rush", 61, 109, 16, "#ffbc87", { windup: 24 }],
  ["pyre", "청염 자폭병", "bomber", 54, 96, 23, "#7cdffc", { windup: 39 }],
  ["stormbow", "폭풍 궁수", "ranged", 56, 77, 14, "#83dfff", { shots: 3 }],
  ["ironwall", "흑철 파수꾼", "tank", 134, 63, 24, "#b7a4ee", { armor: 0.28 }],
  ["stalker", "공허 추적자", "rush", 68, 112, 18, "#ef8ed7", { duration: 23 }],
  ["doomfuse", "종말 자폭병", "bomber", 61, 98, 26, "#ff7775", { blastRadius: 103 }],
  ["headhunter", "선도 투척병", "ranged", 44, 71, 14, "#fac588", { lead: true, range: 385, windup: 40, delay: 187, projectileSpeed: 4.8 }],
  ["veil", "안개 잠복자", "stealth", 42, 98, 14, "#aeceea"],
  ["twinrot", "쌍핵 부패체", "split", 75, 66, 17, "#d5c472"],
  ["rotling", "부패 파편", "rush", 22, 105, 10, "#c5e09f"],
];
for (const [appearance, [kind, name, role, hp, speed, damage, color, skill]] of WAVE_FOES.entries()) {
  FOES[kind] = { ...FOE_ROLES[role], ...skill, name, role, hp, speed, damage, color, appearance };
}

// [Enemies per group, ticks between groups] for waves 1–20.
const WAVE_PACING = [
  [4, 59], [4, 56], [4, 54], [4, 52], [4, 50],
  [5, 61], [5, 59], [5, 57], [5, 56], [5, 54],
  [5, 53], [5, 52], [5, 51], [5, 50], [5, 49],
  [6, 57], [6, 56], [6, 55], [6, 54], [6, 52],
];

// Shield the rear line with a vanguard, while a second lane tries to cut off the escape.
const ASSAULTS = [
  { at: 35, seconds: 12, angle: 0, front: ["zombie", "zombie", "zombie"], flank: ["bat"] },
  { at: 188, seconds: 14, angle: -Math.PI / 2, front: ["hound"], rear: ["slinger", "slinger"], flank: ["hound"] },
  { at: 382, seconds: 12, angle: Math.PI, front: ["zombie", "frostfang"], rear: ["bonebow"], flank: ["hound", "frostfang"] },
  { at: 620, seconds: 14, angle: 0, front: ["bulwark", "bulwark"], rear: ["headhunter", "cultist"], flank: ["fuse"] },
  { at: 918, seconds: 13, angle: Math.PI / 2, front: ["redguard", "prowler"], rear: ["headhunter", "hexer"], flank: ["pyre", "prowler"] },
  { at: 1140, seconds: 15, angle: 0, front: ["ironwall", "ironwall"], rear: ["stormbow", "stormbow"], flank: ["doomfuse", "skeleton"] },
  { at: 1160, seconds: 15, angle: Math.PI, front: ["redguard", "skeleton"], rear: ["headhunter"], flank: ["stalker", "pyre", "stalker"] },
  { at: 1180, seconds: 20, angle: -Math.PI / 2, front: ["ironwall", "ironwall"], rear: ["cultist", "stormbow"], flank: ["doomfuse", "stalker"] },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function distanceSquared(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function spawnPoint(origin, radius, angle) {
  let x = origin.x + Math.cos(angle) * radius;
  let y = origin.y + Math.sin(angle) * radius;
  if (x < 26 || x > WORLD.width - 26) x = 2 * origin.x - x;
  if (y < 26 || y > WORLD.height - 26) y = 2 * origin.y - y;
  return { x: clamp(x, 20, WORLD.width - 20), y: clamp(y, 20, WORLD.height - 20) };
}

function assaultLane(origin, angle, front, rear = []) {
  const back = spawnPoint(origin, 650, angle);
  const dx = (back.x - origin.x) / 650;
  const dy = (back.y - origin.y) / 650;
  const row = (kinds, distance) => kinds.map((kind, i) => {
    const offset = (i - (kinds.length - 1) / 2) * 55;
    return {
      kind,
      x: clamp(origin.x + dx * distance - dy * offset, 26, WORLD.width - 26),
      y: clamp(origin.y + dy * distance + dx * offset, 26, WORLD.height - 26),
    };
  });
  return [...row(front, 540), ...row(rear, 650)];
}

function bossCore(enemy) {
  return { x: enemy.x, y: enemy.y - 43 };
}

function shotHitsCover(x, y, radius) {
  return COVER.some((stone) => Math.abs(x - stone.x) <= stone.width / 2 + radius &&
    Math.abs(y - stone.y) <= stone.height / 2 + radius);
}

function laserBeam(enemy, player) {
  const centerY = enemy.y - 11;
  const angle = Math.atan2(player.y - centerY, player.x - enemy.x);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const muzzleOffset = enemy.def.radius * .7;
  const x = clamp(enemy.x + dx * muzzleOffset, 0, WORLD.width);
  const y = clamp(centerY + dy * muzzleOffset, 0, WORLD.height);
  const horizontalEdge = dx > 0 ? WORLD.width : 0;
  const verticalEdge = dy > 0 ? WORLD.height : 0;
  const horizontalReach = dx === 0 ? Infinity : (horizontalEdge - x) / dx;
  const verticalReach = dy === 0 ? Infinity : (verticalEdge - y) / dy;
  const length = Math.max(0, Math.min(BOSS_LASER_REACH, horizontalReach, verticalReach));
  return { x, y, dx, dy, length, endX: x + dx * length, endY: y + dy * length };
}

function crowdPushWeight(enemy) {
  if (enemy.attack?.beam) return 0;
  return enemy.def.bossName ? 0.15 : 1;
}

class Survival {
  constructor(random = Math.random, playSound = null, { practice = false } = {}) {
    this.random = random;
    this.playSound = playSound;
    this.practice = practice;
    this.ticks = 0;
    this.wave = 1;
    this.kills = 0;
    this.defeatedBosses = [];
    this.lastDamageSource = "";
    this.draftIndex = 0;
    this.nextAugmentKills = 0;
    this.augmentCost = FIRST_AUGMENT_COST;
    this.augments = new Map();
    this.augmentOffers = null;
    this.breachUntil = 0;
    this.counterUntil = 0;
    this.bladeRadius = 67;
    this.bladeAngle = 0;
    this.bladeSize = 1;
    this.masteryUntil = {};
    this.masteryUsedAt = {};
    this.shieldWave = null;
    this.enemyMultiplier = 1;
    this.result = "";
    this.notice = { text: "WAVE 01  ·  망자들의 습격", tick: 0 };
    this.nextAssault = 0;
    this.assault = null;
    this.player = {
      x: WORLD.width / 2, y: WORLD.height / 2, hp: BASE_HP, maxHp: BASE_HP,
      speed: 202, radius: 18, immunity: 0, shieldUntil: 0,
      gait: 0, motion: 0, leanX: 0, leanY: 0, facing: 1,
    };
    this.facing = { x: 1, y: 0 };
    this.dash = { x: 0, y: 0, until: 0 };
    this.usedAt = { manual: -Infinity, auto: -Infinity, dash: -Infinity, shield: -Infinity };
    this.enemies = [];
    this.pendingSplits = [];
    this.bolts = [];
    this.hazards = [];
    this.effects = [];
    this.blades = [];
    this.spawnAt = 18;
    if (practice) this.setupPractice();
    else for (let i = 0; i < 20; i++) this.spawn(i % 3 === 0 ? "bat" : "zombie", 275 + this.random() * 180);
  }

  setupPractice() {
    this.nextAugmentKills = Infinity;
    this.spawnAt = Infinity;
    for (const id of Object.keys(AUGMENTS)) this.augments.set(id, MASTERY_RANK);
    this.blades = Array.from({ length: this.stats("orbit").count }, () => ({}));
    this.updateBlades();
    this.player.maxHp = this.stats("vitality").maxHp;
    this.player.hp = Math.round(this.player.maxHp * .25);

    const targets = ["skeleton", "zombie", "sentinel", "brute", "bonebow"];
    const distances = [145, 208, 325];
    for (let i = 0; i < 15; i++) {
      const tier = i % distances.length;
      const target = this.spawn(targets[i % targets.length], distances[tier], i * TAU / 15);
      target.maxHp = 180 + tier * 40;
      target.hp = target.maxHp;
    }
  }

  get seconds() { return this.ticks / TICKS_PER_SECOND; }
  get remaining() { return RUN_SECONDS - this.seconds; }
  get manualCooldownTicks() {
    if (this.practice) return TICKS_PER_SECOND;
    const remainingFraction = this.remaining / RUN_SECONDS;
    return Math.round(MANUAL_MIN_COOLDOWN_TICKS + (TICKS_PER_SECOND - MANUAL_MIN_COOLDOWN_TICKS) * remainingFraction ** 3);
  }
  get choosingAugment() { return !this.result && this.kills >= this.nextAugmentKills; }

  rank(id) { return this.augments.get(id) ?? 0; }
  stats(id) { return AUGMENTS[id].ranks[this.rank(id) - 1]; }
  hasCombo(id) { return COMBOS[id].augments.every((augment) => this.rank(augment) > 0); }

  getAugmentOffers() {
    if (!this.choosingAugment) return [];
    if (this.augmentOffers) return this.augmentOffers;
    const available = Object.keys(AUGMENTS).filter((id) => this.rank(id) < AUGMENTS[id].ranks.length);
    if (this.draftIndex === 0) return available;
    const offers = [];
    const take = (pool) => {
      const eligible = pool.filter((id) => available.includes(id) && !offers.includes(id));
      if (eligible.length) offers.push(eligible[Math.floor(this.random() * eligible.length)]);
    };
    take(available.filter((id) => this.rank(id) > 0));
    const partners = Object.values(COMBOS)
      .filter((combo) => combo.augments.some((id) => this.rank(id) > 0))
      .flatMap((combo) => combo.augments.filter((id) => this.rank(id) === 0));
    if (partners.length) take(partners);
    else take(["regen", "vitality"]);
    while (offers.length < Math.min(3, available.length)) take(available);
    this.augmentOffers = offers;
    return offers;
  }

  pickAugment(id) {
    if (!this.getAugmentOffers().includes(id)) return false;
    const rank = this.rank(id) + 1;
    if (rank > AUGMENTS[id].ranks.length) return false;
    this.augments.set(id, rank);
    this.augmentOffers = null;
    this.draftIndex++;
    this.nextAugmentKills += this.augmentCost;
    this.augmentCost += AUGMENT_COST_INCREASE + Math.max(0, this.draftIndex - 4) * 4;
    if (this.draftIndex === AUGMENT_LIMIT) this.nextAugmentKills = Infinity;
    if (id === "vitality") {
      const p = this.player;
      const { maxHp } = this.stats(id);
      p.hp += maxHp - p.maxHp;
      p.maxHp = maxHp;
    }
    if (id === "orbit") {
      this.blades.push({});
      this.updateBlades();
    }
    return true;
  }

  cooldown(id) {
    const stats = this.stats(id);
    if (!stats) return Infinity;
    if (id === "dash" && this.masteryActive(id)) return 0;
    return Math.max(0, Math.round(stats.cooldown * TICKS_PER_SECOND) - (this.ticks - this.usedAt[id])) / TICKS_PER_SECOND;
  }

  masteryActive(id) { return this.ticks < this.masteryUntil[id]; }

  masteryCooldown(id) {
    if (this.rank(id) < MASTERY_RANK) return Infinity;
    const elapsed = this.ticks - (this.masteryUsedAt[id] ?? -Infinity);
    return Math.max(0, MASTERIES[id].cooldown - elapsed / TICKS_PER_SECOND);
  }

  activateMastery(id, dx = 0, dy = 0) {
    if (this.result || this.choosingAugment || this.masteryCooldown(id) > 0) return false;
    const skill = MASTERIES[id];
    const player = this.player;
    if (skill.heal && player.hp >= player.maxHp) return false;
    if (id === "auto") {
      if (!this.moonTargets().length) return false;
      this.moonHeading = Math.atan2(this.facing.y, this.facing.x);
      this.masteryUntil.auto = this.ticks + skill.shots * skill.shotInterval;
    } else {
      this.masteryUntil[id] = this.ticks + skill.duration * TICKS_PER_SECOND;
      if (id === "dash") this.activate("dash", dx, dy);
      if (id === "orbit") this.updateBlades();
    }
    this.masteryUsedAt[id] = this.ticks;
    this.effects.push({ kind: "mastery-cast", x: player.x, y: player.y - 8, color: AUGMENTS[id].color, tick: this.ticks, life: 26 });
    this.playSound?.(`mastery-${id}`);
    return true;
  }

  activate(id, dx = 0, dy = 0) {
    if (id !== "dash" && id !== "shield") return false;
    if (this.result || this.choosingAugment || this.cooldown(id) > 0) return false;
    if (id === "dash") {
      if (this.ticks < this.dash.until) return false;
      const length = Math.hypot(dx, dy);
      const direction = length ? { x: dx / length, y: dy / length } : this.facing;
      const empowered = this.masteryActive("dash");
      this.dash = { ...direction, until: this.ticks + DASH_DURATION_TICKS, hits: empowered ? new Set() : null };
      if (this.hasCombo("breach")) this.breachUntil = this.dash.until + BREACH_SHOT_WINDOW;
      if (empowered) {
        const { x, y } = this.player;
        this.dash.trail = { kind: "dash-trail", x, y, endX: x, endY: y, tick: this.ticks, life: 25, radius: 300 };
        this.effects.push(this.dash.trail);
        this.playSound?.("dash-sweep");
        return true;
      }
    } else {
      this.player.shieldUntil = this.ticks + Math.round(this.stats(id).duration * TICKS_PER_SECOND);
    }
    this.usedAt[id] = this.ticks;
    return true;
  }

  step(dx, dy, aim = null) {
    if (this.result || this.choosingAugment) return;

    this.ticks++;
    if (!this.practice && this.ticks >= RUN_SECONDS * TICKS_PER_SECOND) {
      this.result = "win";
      return;
    }

    const wave = this.practice ? this.wave : 1 + Math.floor(this.ticks / (WAVE_SECONDS * TICKS_PER_SECOND));
    if (wave !== this.wave) {
      this.wave = wave;
      const boss = BOSS_MINUTES[wave - 1];
      const overdue = boss && this.enemies.some((enemy) => enemy.def.bossName && enemy.hp > 0);
      if (overdue) this.strengthenEnemies();
      if (boss) {
        this.spawn(boss, 365);
        this.playSound?.("boss");
      }
      const debut = WAVE_DEBUTS[wave - 1];
      for (const kind of debut) this.spawn(kind, 305 + this.random() * 85);
      const label = boss ? FOES[boss].bossName : `WAVE ${String(wave).padStart(2, "0")}`;
      const names = debut.map((kind) => FOES[kind].name).join(" · ");
      this.notice = { text: `${label}  ·  ${overdue ? "보스 중첩" : names}`, tick: this.ticks, boss: Boolean(boss) };
    }
    if (this.choosingAugment) return;
    if (!this.practice) this.updateAssault();

    const player = this.player;
    const input = Math.hypot(dx, dy);
    if (input) this.facing = { x: dx / input, y: dy / input };
    const dashing = this.ticks <= this.dash.until;
    const dashSpeed = this.dash.hits ? 950 * MASTERIES.dash.reach : 950;
    const stride = (dashing ? dashSpeed : player.speed / Math.max(input, 1)) / TICKS_PER_SECOND;
    if (dashing && this.ticks % 2 === 0) {
      this.effects.push({ kind: "dash", x: player.x, y: player.y, tick: this.ticks, life: 15, empowered: Boolean(this.dash.hits) });
    }
    const nextX = clamp(player.x + (dashing ? this.dash.x : dx) * stride, 34, WORLD.width - 34);
    const nextY = clamp(player.y + (dashing ? this.dash.y : dy) * stride, 34, WORLD.height - 34);
    const traveledX = nextX - player.x;
    const traveledY = nextY - player.y;
    const traveled = Math.hypot(traveledX, traveledY);
    if (dashing && this.dash.trail) {
      this.dash.trail.endX = nextX;
      this.dash.trail.endY = nextY;
      if (traveled > 0) this.hitDashPath(traveledX, traveledY, traveled);
    }
    player.x = nextX;
    player.y = nextY;
    player.travelX = traveledX;
    player.travelY = traveledY;
    player.gait = (player.gait + traveled * TAU / 56) % TAU;
    player.motion += (Math.min(1, traveled * TICKS_PER_SECOND / player.speed) - player.motion) * .24;
    player.leanX += (traveledX / Math.max(traveled, 1) - player.leanX) * .21;
    player.leanY += (traveledY / Math.max(traveled, 1) - player.leanY) * .21;
    if (Math.abs(traveledX) > .2) player.facing = Math.sign(traveledX);
    if ((this.ticks === player.shieldUntil || this.ticks === this.masteryUntil.shield) && this.hasCombo("counter")) {
      this.counterUntil = this.ticks + ORBIT_COUNTER_TICKS;
    }
    const bladeSpeed = this.masteryActive("orbit") ? MASTERIES.orbit.speed : 1;
    this.bladeAngle += 3.1 * bladeSpeed / TICKS_PER_SECOND;
    this.updateBlades();
    this.effects = this.effects.filter((effect) => this.ticks - effect.tick < effect.life);

    if (this.ticks >= this.spawnAt) this.spawnGroup();
    if (aim) this.shoot(aim.x, aim.y);
    if (this.cooldown("auto") === 0) this.autoFire();
    this.advanceMasteries();
    this.moveBolts();
    this.moveEnemies();
    for (const { kind, origin, angle } of this.pendingSplits) {
      this.spawn(kind, 20, angle, origin);
      this.spawn(kind, 20, angle + Math.PI, origin);
    }
    this.pendingSplits.length = 0;
    this.moveHazards();
    if (player.hp <= 0) this.result = "loss";
  }

  hitDashPath(dx, dy, distance) {
    const p = this.player;
    const hits = this.dash.hits;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0 || hits.has(enemy) || (enemy.opacity ?? 1) <= STEALTH_TARGET_ALPHA) continue;
      const x = enemy.x - p.x;
      const y = enemy.y - p.y;
      const projection = clamp((x * dx + y * dy) / distance ** 2, 0, 1);
      if ((x - dx * projection) ** 2 + (y - dy * projection) ** 2 > (enemy.def.radius + p.radius) ** 2) continue;
      hits.add(enemy);
      this.hit(enemy, MASTERIES.dash.damage, { vx: dx / distance, vy: dy / distance });
      this.masteryImpact(enemy, "#edafff", Math.atan2(dy, dx));
    }
  }

  moonTargets() {
    const { range } = MASTERIES.auto;
    return this.enemies.filter((enemy) => enemy.hp > 0 &&
      (enemy.opacity ?? 1) > STEALTH_TARGET_ALPHA && distanceSquared(this.player, enemy) <= range ** 2);
  }

  fireMoonShot(index) {
    const p = this.player;
    const { damage } = MASTERIES.auto;
    const targets = this.moonTargets();
    const target = targets.length ? targets[Math.floor(this.random() * targets.length)] : null;
    const lane = index % 3;
    const angle = this.moonHeading + lane * TAU / 3 + Math.sin(index * .12) * .23;
    const bolt = this.launchBolt(p.x + Math.cos(angle), p.y + Math.sin(angle), damage, true, false, { lane, target });
    this.effects.push({ kind: "moon-muzzle", x: bolt.x, y: bolt.y, angle, lane, tick: this.ticks, life: 11 });
    if (index % 6 === 0) this.playSound?.("moon-stream");
  }

  advanceMasteries() {
    const p = this.player;
    if (this.masteryActive("auto")) {
      const age = this.ticks - this.masteryUsedAt.auto - 1;
      const { shotInterval } = MASTERIES.auto;
      if (age >= 0 && age % shotInterval === 0) this.fireMoonShot(age / shotInterval);
    }
    let healing = this.stats("regen")?.perSecond ?? 0;
    for (const id of ["vitality", "regen"]) {
      const skill = MASTERIES[id];
      if (this.ticks <= this.masteryUntil[id]) healing += p.maxHp * skill.heal / skill.duration;
    }
    if (healing && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + healing / TICKS_PER_SECOND);

    const { radius, damage } = MASTERIES.shield;
    if (this.ticks === this.masteryUntil.shield) {
      this.shieldWave = { kind: "shield-wave", x: p.x, y: p.y, tick: this.ticks, life: 30, radius, hits: new Set() };
      this.effects.push(this.shieldWave);
      this.playSound?.("shield-shatter");
    }
    const wave = this.shieldWave;
    if (!wave) return;
    const age = this.ticks - wave.tick;
    const inner = age * radius / wave.life;
    const outer = (age + 1) * radius / wave.life;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0 || wave.hits.has(enemy) || (enemy.opacity ?? 1) <= STEALTH_TARGET_ALPHA) continue;
      const distance = Math.hypot(enemy.x - wave.x, enemy.y - wave.y);
      if (distance - enemy.def.radius > outer || distance + enemy.def.radius < inner) continue;
      wave.hits.add(enemy);
      this.hit(enemy, damage);
      this.masteryImpact(enemy, "#ffd18e", Math.atan2(enemy.y - wave.y, enemy.x - wave.x));
    }
    if (age + 1 === wave.life) this.shieldWave = null;
  }

  updateAssault() {
    const next = ASSAULTS[this.nextAssault];
    if (next && this.ticks >= next.at * TICKS_PER_SECOND - ASSAULT_SETUP_TICKS) {
      const { angle, at, seconds, front, rear, flank } = next;
      this.assault = {
        startsAt: at * TICKS_PER_SECOND,
        endsAt: (at + seconds) * TICKS_PER_SECOND,
        members: [
          ...assaultLane(this.player, angle, front, rear),
          ...assaultLane(this.player, angle + Math.PI / 2, flank),
        ],
      };
      this.nextAssault++;
    }
    if (this.ticks === this.assault?.startsAt) {
      this.spawnAt = this.ticks;
    }
    if (this.ticks >= this.assault?.endsAt) this.assault = null;
  }

  spawnGroup() {
    const [count, interval] = WAVE_PACING[this.wave - 1];
    const cap = 66 + this.wave * 7;
    this.spawnAt = this.ticks + interval;
    if (this.assault && this.ticks >= this.assault.startsAt) {
      const members = this.assault.members
        .filter((member) => distanceSquared(this.player, member) >= 145 ** 2);
      if (this.enemies.length + members.length > cap + count * 2) return;
      for (const member of members) this.spawnEnemy(member.kind, member);
      return;
    }

    const roster = ["zombie", "bat", "zombie", "bat", ...WAVE_DEBUTS.slice(Math.max(1, this.wave - 4), this.wave).flat()];
    if (this.wave >= 6) roster.push("skeleton");
    if (this.wave >= 9) roster.push("wraith");
    if (this.wave >= 13) roster.push("brute");
    if (this.wave >= 10) roster.push("headhunter", "veil", "twinrot");
    for (let i = 0; i < count && this.enemies.length < cap; i++) {
      this.spawn(roster[Math.floor(this.random() * roster.length)], 330 + this.random() * 220);
    }
  }

  spawn(kind, radius, angle = this.random() * TAU, origin = this.player) {
    return this.spawnEnemy(kind, spawnPoint(origin, radius, angle));
  }

  spawnEnemy(kind, { x, y }) {
    const def = FOES[kind];
    const baseHp = def.bossName ? def.hp : def.hp * (1 + (this.wave - 1) * 0.046);
    const hp = Math.round(baseHp * this.enemyMultiplier);
    const enemy = {
      kind, def, hp, maxHp: hp,
      x, y,
      facing: 1, phase: this.random() * TAU,
      speed: (def.bossName ? def.speed : def.speed * (1 + (this.wave - 1) * 0.017) * (0.92 + this.random() * 0.16)) * this.enemyMultiplier,
      damage: def.bossName ? def.damage : Math.round(def.damage * (1 + (this.wave - 1) * 0.012)),
      flash: -10, bladeHit: -100,
      power: this.enemyMultiplier,
    };
    if (def.bossName) {
      enemy.attackAt = this.ticks + 95;
      enemy.attack = null;
      enemy.nextPattern = def.pattern;
      enemy.recoverUntil = 0;
    }
    if (def.armor) enemy.guardAngle = Math.atan2(this.player.y - y, this.player.x - x);
    if (def.revealRadius) enemy.opacity = 0;
    if (def.role && def.windup) enemy.skillAt = this.ticks + 70 + Math.floor(enemy.phase * 12);
    this.enemies.push(enemy);
    return enemy;
  }

  strengthenEnemies() {
    if (this.enemyMultiplier > 1) return;
    this.enemyMultiplier = OVERDUE_BOSS_MULTIPLIER;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const maxHp = Math.round(enemy.maxHp * this.enemyMultiplier);
      enemy.hp *= maxHp / enemy.maxHp;
      enemy.maxHp = maxHp;
      enemy.speed *= this.enemyMultiplier;
      enemy.power = this.enemyMultiplier;
    }
  }

  updateBlades() {
    const p = this.player;
    const counterPhase = Math.max(0, this.counterUntil - this.ticks) / ORBIT_COUNTER_TICKS;
    const empowered = this.masteryActive("orbit");
    this.bladeSize = empowered ? MASTERIES.orbit.size : 1;
    this.bladeRadius = 67 + Math.sin(counterPhase * Math.PI) * 87 + (empowered ? MASTERIES.orbit.radiusBonus : 0);
    this.blades.forEach((blade, i) => {
      blade.angle = this.bladeAngle + i * TAU / this.blades.length;
      blade.size = this.bladeSize;
      blade.x = p.x + Math.cos(blade.angle) * this.bladeRadius;
      blade.y = p.y + Math.sin(blade.angle) * this.bladeRadius;
    });
  }

  shoot(x, y) {
    if (this.result || this.choosingAugment || this.ticks - this.usedAt.manual < this.manualCooldownTicks) return false;
    const p = this.player;
    if (x === p.x && y === p.y) return false;
    const breach = this.breachUntil > this.ticks;
    this.launchBolt(x, y, MANUAL_DAMAGE, false, breach);
    this.breachUntil = 0;
    this.usedAt.manual = this.ticks;
    this.playSound?.(breach ? "breach" : "shot");
    return true;
  }

  launchBolt(x, y, damage, auto, breach = false, moon = null) {
    const p = this.player;
    const direction = Math.atan2(y - p.y, x - p.x);
    const vx = Math.cos(direction);
    const vy = Math.sin(direction);
    const bolt = {
      x: p.x + vx * (moon ? 22 : 14), y: p.y + vy * (moon ? 19 : 14) - (moon ? 9 : 0),
      vx, vy, damage, auto, breach, pierces: auto ? 0 : (breach ? 2 : 1), targets: [], age: 0, spent: false, moon,
    };
    if (moon) moon.trail = [];
    this.bolts.push(bolt);
    return bolt;
  }

  autoFire() {
    const p = this.player;
    let best = 450 ** 2;
    let target = null;
    for (const enemy of this.enemies) {
      if ((enemy.opacity ?? 1) <= STEALTH_TARGET_ALPHA) continue;
      const distance = distanceSquared(p, enemy);
      if (distance >= best) continue;
      best = distance;
      target = enemy;
    }
    if (!target) return;
    this.launchBolt(target.x, target.y, this.stats("auto").damage, true);
    this.usedAt.auto = this.ticks;
  }

  moveBolts() {
    for (const bolt of this.bolts) {
      bolt.age++;
      if (bolt.moon) this.steerMoonBolt(bolt);
      const speed = bolt.moon ? Math.min(17, 6 + bolt.age * .55) : 10;
      bolt.x += bolt.vx * speed;
      bolt.y += bolt.vy * speed;
      if (bolt.moon) {
        if (bolt.x < 2 || bolt.x > WORLD.width - 2) bolt.vx *= -1;
        if (bolt.y < 2 || bolt.y > WORLD.height - 2) bolt.vy *= -1;
        bolt.x = clamp(bolt.x, 2, WORLD.width - 2);
        bolt.y = clamp(bolt.y, 2, WORLD.height - 2);
      }
      if (shotHitsCover(bolt.x, bolt.y, 3)) {
        bolt.spent = true;
        this.effects.push({ kind: "cover", x: bolt.x, y: bolt.y, tick: this.ticks, life: 15 });
        continue;
      }
      for (const enemy of this.enemies) {
        if (enemy.hp <= 0 || (enemy.opacity ?? 1) <= STEALTH_TARGET_ALPHA || bolt.targets.includes(enemy)) continue;
        const hitsBody = distanceSquared(bolt, enemy) <= (enemy.def.radius + 7) ** 2;
        const hitsOpenCore = !hitsBody && enemy.kind === "sovereign" && this.ticks < enemy.recoverUntil &&
          distanceSquared(bolt, bossCore(enemy)) <= BOSS_CORE_RADIUS ** 2;
        if (!hitsBody && !hitsOpenCore) continue;
        this.hit(enemy, bolt.damage, bolt);
        if (bolt.moon) this.masteryImpact(bolt, "#a9e4ff", Math.atan2(bolt.vy, bolt.vx));
        if (bolt.pierces && !enemy.def.bossName) {
          bolt.pierces--;
          bolt.targets.push(enemy);
          bolt.damage = MANUAL_PIERCE_DAMAGE;
          continue;
        }
        bolt.spent = true;
        break;
      }
    }
    this.bolts = this.bolts.filter((bolt) => !bolt.spent && bolt.age < (bolt.moon ? 75 : PLAYER_BOLT_LIFETIME) &&
      bolt.x >= 0 && bolt.x <= WORLD.width && bolt.y >= 0 && bolt.y <= WORLD.height);
  }

  steerMoonBolt(bolt) {
    const moon = bolt.moon;
    moon.trail.push({ x: bolt.x, y: bolt.y });
    if (moon.trail.length > 12) moon.trail.shift();

    if (moon.target && (moon.target.hp <= 0 || (moon.target.opacity ?? 1) <= STEALTH_TARGET_ALPHA)) moon.target = null;
    if (!moon.target && bolt.age % 9 === 0) {
      const targets = this.moonTargets();
      if (targets.length) moon.target = targets[Math.floor(this.random() * targets.length)];
    }

    const heading = Math.atan2(bolt.vy, bolt.vx);
    const target = moon.target;
    const goal = target ? Math.atan2(target.y - bolt.y, target.x - bolt.x) : heading + .08;
    const difference = goal - heading;
    const turn = bolt.age <= 4 ? .025 : Math.min(.23, .075 + bolt.age * .007);
    const direction = heading + clamp(Math.atan2(Math.sin(difference), Math.cos(difference)), -turn, turn);
    bolt.vx = Math.cos(direction);
    bolt.vy = Math.sin(direction);
  }

  masteryImpact({ x, y }, color, angle) {
    this.effects.push({ kind: "mastery-impact", x, y: y - 3, color, angle, tick: this.ticks, life: 17 });
  }

  moveBoss(enemy, dx, dy, distance) {
    const { def } = enemy;
    if (this.ticks < enemy.recoverUntil) return true;
    if (!enemy.attack) {
      if (this.ticks < enemy.attackAt || distance > def.range) return false;
      const pattern = enemy.nextPattern;
      const windup = pattern === "laser" ? BOSS_LASER_WINDUP : def.windup;
      const fireAt = this.ticks + windup;
      enemy.attack = { pattern, angle: Math.atan2(dy, dx), fireAt, windup, connected: false };
      if (pattern === "laser") {
        enemy.attack.beam = laserBeam(enemy, this.player);
        enemy.facing = enemy.attack.beam.dx < 0 ? -1 : 1;
        this.playSound?.("charge");
      } else {
        this.playSound?.("warning");
      }
      if (pattern === "eruption") this.markEruptions(enemy.attack);
      return true;
    }

    const { angle, fireAt, pattern, beam } = enemy.attack;
    if (this.ticks < fireAt) return true;
    if (beam && this.ticks < fireAt + BOSS_LASER_DURATION) {
      if (this.ticks === fireAt) this.playSound?.("laser");
      const offsetX = this.player.x - beam.x;
      const offsetY = this.player.y - beam.y;
      const projection = clamp(offsetX * beam.dx + offsetY * beam.dy, 0, beam.length);
      const missX = offsetX - projection * beam.dx;
      const missY = offsetY - projection * beam.dy;
      if (missX ** 2 + missY ** 2 < (BOSS_LASER_RADIUS + this.player.radius) ** 2) {
        enemy.attack.connected = true;
        this.hurtPlayer(BOSS_LASER_DAMAGE, "망령 군주의 차징 레이저");
      }
      return true;
    }
    if (pattern === "charge" && this.ticks < fireAt + BOSS_CHARGE_TICKS) {
      const r = enemy.def.radius;
      const stride = BOSS_CHARGE_STRIDE * enemy.power;
      enemy.x = clamp(enemy.x + Math.cos(angle) * stride, r, WORLD.width - r);
      enemy.y = clamp(enemy.y + Math.sin(angle) * stride, r, WORLD.height - r);
      enemy.facing = Math.cos(angle) < 0 ? -1 : 1;
      return true;
    }
    if (pattern === "eruption" && this.ticks < fireAt + ERUPTION_DURATION) return true;
    if (pattern === "volley") {
      for (let i = 0; i < BOSS_VOLLEY_COUNT; i++) {
        const direction = angle + i * TAU / BOSS_VOLLEY_COUNT;
        const vx = Math.cos(direction), vy = Math.sin(direction);
        this.hazards.push({
          kind: "shard", x: enemy.x + vx * 25, y: enemy.y + vy * 25, vx: vx * 3.1, vy: vy * 3.1,
          radius: 7, damage: 24, source: "망령 군주의 탄막", until: this.ticks + BOSS_SHARD_LIFETIME,
        });
      }
    }
    const recover = pattern !== "volley" && !enemy.attack.connected;
    enemy.attack = null;
    if (def.alternate) enemy.nextPattern = pattern === def.pattern ? def.alternate : def.pattern;
    enemy.attackAt = this.ticks + def.delay;
    if (recover) enemy.recoverUntil = this.ticks + def.counter.ticks;
    return recover;
  }

  markEruptions(attack) {
    const { fireAt } = attack;
    const { x, y } = this.player;
    for (const distance of [0, 120, 230]) {
      this.hazards.push({
        kind: "eruption",
        x: clamp(x + this.facing.x * distance, 40, WORLD.width - 40),
        y: clamp(y + this.facing.y * distance, 40, WORLD.height - 40),
        radius: distance === 0 ? 82 : 72, damage: 34, source: "피의 성주의 지면 폭발",
        markedAt: this.ticks, fireAt, until: fireAt + ERUPTION_DURATION, attack,
      });
    }
  }

  moveFoeSkill(enemy, dx, dy, distance) {
    const { def } = enemy;
    if (!def.windup) return false;

    if (!enemy.skill) {
      if (this.ticks >= enemy.skillAt && distance <= def.range) {
        enemy.facing = dx < 0 ? -1 : 1;
        let angle = Math.atan2(dy, dx);
        if (def.lead) {
          const { x, y, travelX, travelY, speed } = this.player;
          const vx = travelX ?? 0;
          const vy = travelY ?? 0;
          const stride = speed / TICKS_PER_SECOND;
          const leadTicks = Math.min(62, distance / def.projectileSpeed + def.windup * .55);
          const prediction = leadTicks * stride / Math.max(stride, Math.hypot(vx, vy));
          const targetX = clamp(x + vx * prediction, 34, WORLD.width - 34);
          const targetY = clamp(y + vy * prediction, 34, WORLD.height - 34);
          angle = Math.atan2(targetY - enemy.y, targetX - enemy.x);
        }
        enemy.skill = { angle, fireAt: this.ticks + def.windup };
        if (def.role === "bomber") this.playSound?.("fuse");
        return true;
      }
      return def.role === "ranged" && distance <= def.range - 35;
    }

    const { angle, fireAt } = enemy.skill;
    if (this.ticks < fireAt) return true;
    if (def.role === "rush" && this.ticks < fireAt + def.duration) {
      const stride = 7 * enemy.power;
      enemy.x = clamp(enemy.x + Math.cos(angle) * stride, 20, WORLD.width - 20);
      enemy.y = clamp(enemy.y + Math.sin(angle) * stride, 20, WORLD.height - 20);
      return true;
    }
    if (def.role === "ranged") {
      const shots = def.shots ?? 1;
      const speed = def.projectileSpeed ?? 4;
      for (let i = 0; i < shots; i++) {
        const direction = angle + (i - (shots - 1) / 2) * .19;
        const vx = Math.cos(direction), vy = Math.sin(direction);
        this.hazards.push({
          kind: def.lead ? "cleaver" : "arrow", x: enemy.x + vx * 16, y: enemy.y + vy * 16,
          vx: vx * speed, vy: vy * speed, radius: def.lead ? 7 : 5,
          color: def.color, damage: enemy.damage, source: `${def.name}의 ${def.lead ? "투척" : "사격"}`,
          until: this.ticks + ENEMY_ARROW_LIFETIME,
        });
      }
    }
    if (def.role === "bomber") {
      this.playSound?.("blast");
      this.hazards.push({
        kind: "blast", x: enemy.x, y: enemy.y, radius: def.blastRadius,
        damage: enemy.damage, color: def.color, source: `${def.name}의 폭발`, fireAt: this.ticks, until: this.ticks + 20,
      });
      enemy.hp = 0;
      return true;
    }
    enemy.skill = null;
    enemy.skillAt = this.ticks + def.delay;
    return true;
  }

  moveHazards() {
    const p = this.player;
    this.hazards = this.hazards.filter((hazard) => {
      if (this.ticks >= hazard.until) return false;
      if ("vx" in hazard) {
        hazard.x += hazard.vx;
        hazard.y += hazard.vy;
        if (hazard.x < 0 || hazard.x > WORLD.width || hazard.y < 0 || hazard.y > WORLD.height) return false;
        if (hazard.kind !== "shard" && shotHitsCover(hazard.x, hazard.y, hazard.radius)) {
          this.effects.push({ kind: "cover", x: hazard.x, y: hazard.y, tick: this.ticks, life: 15 });
          return false;
        }
        if (distanceSquared(p, hazard) > (p.radius + hazard.radius) ** 2) return true;
        this.hurtPlayer(hazard.damage, hazard.source);
        return false;
      }
      if (this.ticks >= hazard.fireAt && distanceSquared(p, hazard) < hazard.radius ** 2) {
        if (hazard.attack) hazard.attack.connected = true;
        this.hurtPlayer(hazard.damage, hazard.source);
      }
      return true;
    });
  }

  hurtPlayer(damage, source) {
    const p = this.player;
    if (p.hp <= 0 || this.masteryActive("shield") || this.ticks < Math.max(p.immunity, p.shieldUntil)) return false;
    p.hp = Math.max(0, p.hp - Math.round(damage * this.enemyMultiplier));
    this.lastDamageSource = source || "적의 공격";
    this.playSound?.("hurt");
    p.immunity = this.ticks + HIT_IMMUNITY_TICKS;
    this.effects.push({ kind: "hurt", x: p.x, y: p.y, tick: this.ticks, life: 24 });
    return true;
  }

  moveEnemies() {
    const p = this.player;
    const orbit = this.stats("orbit");
    const dashing = this.ticks <= this.dash.until;
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      if (enemy.hp <= 0) continue;
      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const distance = Math.hypot(dx, dy);
      if (enemy.def.revealRadius) {
        if (distance <= enemy.def.revealRadius) enemy.revealed = true;
        if (distance >= enemy.def.hideRadius) enemy.revealed = false;
        enemy.opacity = clamp(enemy.opacity + (enemy.revealed ? .16 : -.035), 0, 1);
      }
      const usingSkill = this.practice || (enemy.def.bossName ? this.moveBoss(enemy, dx, dy, distance) : this.moveFoeSkill(enemy, dx, dy, distance));
      if (enemy.hp <= 0) continue;
      if (!usingSkill) {
        if (enemy.def.armor) {
          const delta = Math.atan2(dy, dx) - enemy.guardAngle;
          enemy.guardAngle += clamp(Math.atan2(Math.sin(delta), Math.cos(delta)), -.028, .028);
          enemy.facing = Math.cos(enemy.guardAngle) < 0 ? -1 : 1;
        } else {
          enemy.facing = dx < 0 ? -1 : 1;
        }
        const step = enemy.speed / TICKS_PER_SECOND / Math.max(1, distance);
        enemy.x += dx * step;
        enemy.y += dy * step;
      }

      for (let j = 0; j < i; j++) {
        const other = this.enemies[j];
        if (other.hp <= 0) continue;
        const spacing = (enemy.def.radius + other.def.radius) * 0.74;
        const ex = enemy.x - other.x;
        const ey = enemy.y - other.y;
        const gap = ex * ex + ey * ey;
        if (gap >= spacing * spacing || gap < 0.0001) continue;
        const length = Math.sqrt(gap);
        const push = (spacing - length) * 0.21 / length;
        const enemyShare = crowdPushWeight(enemy);
        const otherShare = crowdPushWeight(other);
        enemy.x += ex * push * enemyShare;
        enemy.y += ey * push * enemyShare;
        other.x -= ex * push * otherShare;
        other.y -= ey * push * otherShare;
      }

      if (orbit && (enemy.opacity ?? 1) > STEALTH_TARGET_ALPHA && this.ticks - enemy.bladeHit >= 19 &&
          this.blades.some((blade) => distanceSquared(blade, enemy) < (enemy.def.radius + 14 * this.bladeSize) ** 2)) {
        enemy.bladeHit = this.ticks;
        this.hit(enemy, orbit.damage);
        if (this.masteryActive("orbit")) this.masteryImpact(enemy, "#e9aaff", this.bladeAngle + Math.PI / 2);
        if (this.ticks < this.counterUntil && !enemy.def.bossName && enemy.hp > 0) {
          const pushX = enemy.x - p.x;
          const pushY = enemy.y - p.y;
          const push = 27 / Math.max(1, Math.hypot(pushX, pushY));
          enemy.x = clamp(enemy.x + pushX * push, 20, WORLD.width - 20);
          enemy.y = clamp(enemy.y + pushY * push, 20, WORLD.height - 20);
        }
      }
      if (!this.practice && enemy.hp > 0 && distanceSquared(p, enemy) < (p.radius + enemy.def.radius) ** 2) {
        const charging = enemy.attack?.pattern === "charge" && this.ticks >= enemy.attack.fireAt;
        if (charging) enemy.attack.connected = true;
        if (!dashing) {
          const name = enemy.def.bossName ?? enemy.def.name;
          this.hurtPlayer(enemy.damage, `${name}의 ${charging ? "돌진" : "접촉 공격"}`);
        }
      }
    }
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
  }

  hit(enemy, damage, bolt = null) {
    if (enemy.hp <= 0) return;
    if (enemy.def.armor) {
      const frontHit = !bolt || -bolt.vx * Math.cos(enemy.guardAngle) - bolt.vy * Math.sin(enemy.guardAngle) > .24;
      if (frontHit) damage = Math.max(1, Math.round(damage * (1 - enemy.def.armor)));
    }
    if (this.ticks < enemy.recoverUntil) damage = Math.round(damage * enemy.def.counter.damage);
    enemy.hp -= damage;
    enemy.flash = this.ticks + 6;
    const killed = enemy.hp <= 0;
    this.effects.push({
      kind: killed ? "burst" : "hit", x: enemy.x, y: enemy.y - 9, damage, color: enemy.def.color,
      radius: enemy.def.radius, seed: this.random() * TAU, tick: this.ticks,
      life: killed ? 28 + Math.round(enemy.def.radius * 0.5) : 21,
    });
    if (killed) {
      this.kills++;
      if (enemy.def.child) {
        this.pendingSplits.push({ kind: enemy.def.child, origin: { x: enemy.x, y: enemy.y }, angle: enemy.phase });
      }
      if (enemy.def.bossName) this.defeatedBosses.push(enemy.def.bossName);
      this.playSound?.(enemy.def.bossName ? "bossDown" : "kill");
    }
  }
}
