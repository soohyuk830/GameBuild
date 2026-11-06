"use strict";

// Alpha bounds in the two atlases. Keep each crop separate from neighboring silhouettes.
const FOE_SPRITE_RECTS = {
  zombie: [40, 31, 172, 211],
  bat: [260, 52, 237, 162],
  skeleton: [522, 28, 207, 216],
  wraith: [765, 18, 174, 229],
  brute: [1006, 23, 219, 222],
  crawler: [23, 309, 211, 173],
  hound: [270, 298, 215, 179],
  slinger: [517, 282, 204, 207],
  hexer: [756, 265, 221, 229],
  frostfang: [1005, 293, 225, 190],
  bonebow: [52, 515, 182, 230],
  sentinel: [264, 520, 206, 223],
  spitter: [514, 529, 205, 205],
  nightfang: [755, 538, 221, 194],
  bulwark: [1005, 512, 228, 230],
  fuse: [27, 777, 204, 202],
  cultist: [279, 768, 202, 219],
  bombard: [530, 764, 222, 225],
  redguard: [753, 762, 194, 227],
  prowler: [1010, 780, 217, 197],
  pyre: [28, 1007, 181, 230],
  stormbow: [259, 1017, 240, 222],
  ironwall: [504, 1010, 220, 226],
  stalker: [758, 1049, 215, 179],
  doomfuse: [1004, 1019, 226, 220],
};

const BOSS_SPRITE_RECTS = {
  reaper: [32, 0, 675, 724],
  sovereign: [745, 0, 620, 724],
  bloodlord: [1450, 0, 697, 724],
};

const ENEMY_SPRITE_BOXES = {
  zombie: [45, 51], bat: [53, 33], skeleton: [50, 53], wraith: [48, 55], brute: [61, 60],
  rush: [53, 42], ranged: [52, 55], tank: [60, 63], bomber: [52, 52],
  reaper: [117, 125], sovereign: [111, 131], bloodlord: [145, 140],
};

const FOE_VARIANT_ART = {
  headhunter: { base: "slinger", box: [53, 57], tint: "sepia(.65) saturate(1.45)" },
  veil: { base: "wraith", box: [47, 54], tint: "grayscale(.6) hue-rotate(25deg)" },
  twinrot: { base: "spitter", box: [57, 58], tint: "hue-rotate(35deg) saturate(1.35)" },
  rotling: { base: "crawler", box: [32, 28], tint: "hue-rotate(32deg) saturate(1.45)" },
};

async function loadArtImage(path) {
  const image = new Image();
  image.src = path;
  await image.decode();
  return image;
}

async function loadEnemyAtlas(path, rectangles, sprites) {
  const image = await loadArtImage(path);
  const crops = { ...rectangles };
  for (const [kind, { base }] of Object.entries(FOE_VARIANT_ART)) {
    if (rectangles[base]) crops[kind] = rectangles[base];
  }
  for (const [kind, bounds] of Object.entries(crops)) {
    const [left, top, sourceWidth, sourceHeight] = bounds;
    const variant = FOE_VARIANT_ART[kind];
    const [maxWidth, maxHeight] = variant?.box ?? ENEMY_SPRITE_BOXES[kind] ?? ENEMY_SPRITE_BOXES[FOES[kind].role];
    const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    // Sample the atlas once at a resolution suitable for the largest canvas zoom.
    const sprite = document.createElement("canvas");
    sprite.width = Math.ceil(width * 3);
    sprite.height = Math.ceil(height * 3);
    const ctx = sprite.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    if (variant) ctx.filter = variant.tint;
    ctx.drawImage(image, left, top, sourceWidth, sourceHeight, 0, 0, sprite.width, sprite.height);
    sprites.set(kind, { sprite, width, height });
  }
}

async function paintGraveyard(ground) {
  const image = await loadArtImage("assets/graveyard-terrain.png");
  const ctx = ground.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, ground.width, ground.height);
  ctx.fillStyle = "#101a2834";
  ctx.fillRect(0, 0, ground.width, ground.height);
}

function drawEnemySprite(ctx, enemy, art, time, tick) {
  const { x, y, kind, def } = enemy;
  const airborne = kind === "bat" || kind === "wraith" || kind === "veil" || kind === "sovereign";
  const recovering = tick < enemy.recoverUntil;
  const casting = enemy.attack || enemy.skill || recovering;
  const rhythm = kind === "bat" ? 17 : def.bossName ? 4.8 : def.role === "rush" ? 12 : 8;
  const sway = Math.sin(time * rhythm + enemy.phase);
  const bob = airborne ? 4 + sway * 3.5 : casting ? 0 : Math.abs(sway) * 2.5;
  const stride = casting ? 0 : sway;
  const { sprite, width, height } = art;

  oval(ctx, x, y + 7, Math.min(width * .39, def.radius * 1.15), def.radius * .25, "#0b101bc1");
  ctx.save();
  ctx.translate(x, y + 9 - bob);
  ctx.rotate((recovering ? .12 : stride * .038) * enemy.facing);
  ctx.scale(enemy.facing * (1 + stride * (kind === "bat" ? .085 : .026)), recovering ? .91 : 1 - stride * .026);
  if (def.bossName) {
    ctx.shadowColor = `${def.color}8a`;
    ctx.shadowBlur = 8;
    ctx.filter = "drop-shadow(0 0 1px #eed0a1)";
  }
  if (tick < enemy.flash) ctx.filter = "brightness(1.38)";
  ctx.drawImage(sprite, -width / 2, -height, width, height);
  if (kind === "headhunter") {
    ctx.translate(width * .39, -height * (casting ? .62 : .35));
    ctx.rotate(casting ? -.25 : .45);
    drawCleaver(ctx);
  }
  if (kind === "twinrot") {
    for (const x of [-6, 6]) {
      const y = -height * .37;
      oval(ctx, x, y, 4.5, 5, "#232131");
      oval(ctx, x, y, 2.5, 3, "#cbed91");
    }
  }
  ctx.restore();
  if (enemy.attack?.beam && tick < enemy.attack.fireAt) drawLaserChargeOrb(ctx, enemy.attack, tick);
}
