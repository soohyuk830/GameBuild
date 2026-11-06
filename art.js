"use strict";

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function oval(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

function polygon(ctx, points, fill, stroke, width = 2) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = width;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function line(ctx, points, color, width = 1) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function ring(ctx, x, y, radius, color, width = 1, from = 0, to = TAU) {
  ctx.beginPath();
  ctx.arc(x, y, radius, from, to);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function glow(ctx, x, y, radius, color) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "transparent");
  oval(ctx, x, y, radius, radius, gradient);
}

function drawCover(ctx, { x, y, width, height }) {
  const left = x - width / 2;
  const right = x + width / 2;
  const top = y - height / 2;
  const bottom = y + height / 2;
  oval(ctx, x + 4, y + 6, width * .62, height * .62, "#0b11177a");
  polygon(ctx, [[left,top],[right,top],[right,bottom-4],[right-5,bottom],[left+2,bottom]], "#34383d", "#171b20", 2);
  polygon(ctx, [[left+3,top],[left+9,top-5],[right-6,top-5],[right-2,top+1],
    [right-3,bottom-7],[left+5,bottom-7]], "#62645f", "#353a3d", 1.4);
  line(ctx, [[left+8,top],[right-7,top],[right-8,bottom-10]], "#a4a095", 1.5);
  line(ctx, [[x-7,top-3],[x-2,y-5],[x-9,y+2],[x-4,bottom-8]], "#30363b", 1.5);
  line(ctx, [[left+3,bottom-6],[x-1,bottom-5],[right-7,bottom-6]], "#8c8065", 1.7);
}

function drawEnemyStatus(ctx, enemy, tick) {
  if (enemy.def.armor) {
    ring(ctx, enemy.x, enemy.y + 1, enemy.def.radius + 7, "#cfb078bc", 2.6, enemy.guardAngle - 1.33, enemy.guardAngle + 1.33);
  }
  if (tick < enemy.recoverUntil) {
    const { color } = enemy.def.counter;
    ring(ctx, enemy.x, enemy.y, enemy.def.radius + 8, `${color}e8`, 2.8);
    oval(ctx, enemy.x, enemy.y + 4, enemy.def.radius + 8, 13, `${color}29`);
  }
}

function drawBossOpening(ctx, enemy, tick) {
  const { color, ticks } = enemy.def.counter;
  const core = enemy.kind === "sovereign";
  const { x, y } = core ? bossCore(enemy) : { x: enemy.x, y: enemy.y - 52 };
  const radius = core ? BOSS_CORE_RADIUS : 16;
  const fraction = (enemy.recoverUntil - tick) / ticks;
  if (core) {
    glow(ctx, x, y, 39, "#64ffdcaa");
    polygon(ctx, [[x,y-12],[x+8,y],[x,y+12],[x-8,y]], "#d8fff3", "#1b766e", 2);
    line(ctx, [[x-19,y-14],[x-9,y-7],[x-13,y+2],[x-7,y+6]], "#bdffef", 1.7);
    line(ctx, [[x+18,y-9],[x+9,y-4],[x+14,y+5],[x+8,y+9]], "#bdffef", 1.7);
  } else {
    glow(ctx, x, y, 31, `${color}72`);
    polygon(ctx, [[x,y-8],[x+7,y],[x,y+8],[x-7,y]], color, "#341d27", 2);
  }
  ring(ctx, x, y, radius + 5, "#14111cdf", 3.8);
  ring(ctx, x, y, radius + 5, color, 2.1, -Math.PI / 2, fraction * TAU - Math.PI / 2);
}

function drawEnemyHealth(ctx, enemy) {
  const width = Math.min(29, 16 + enemy.def.radius * .55);
  const x = enemy.x - width / 2;
  const y = enemy.y + 13;
  const fraction = clamp(enemy.hp / enemy.maxHp, 0, 1);
  ctx.fillStyle = "#100c14d6";
  ctx.fillRect(x - 1, y - 1, width + 2, 5);
  ctx.fillStyle = fraction === 1 ? "#ee9a8ca6" : "#ff7867ed";
  ctx.fillRect(x, y, Math.max(1, width * fraction), 3);
}

function drawStone(ctx, x, y, random) {
  const w = 25 + random() * 10;
  const h = 30 + random() * 18;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((random() - 0.5) * 0.3);
  oval(ctx, 4, 5, w * .7, 11, "#0e1518b5");
  polygon(ctx, [[-w*.65,1],[w*.57,1],[w*.65,8],[-w*.6,8]], "#333840", "#12181d");
  polygon(ctx, [[-w/2,3],[-w/2,-h+11],[-w*.25,-h],[w*.18,-h-2],[w*.43,-h+5],[w*.48,3]], "#4b4953", "#17181f");
  line(ctx, [[-w*.38,-3],[-w*.37,-h+12],[-w*.18,-h+3],[w*.15,-h+1]], "#706775");
  line(ctx, [[0,-h+9],[0,-h+24]], "#8b7c85", 2);
  line(ctx, [[-6,-h+14],[6,-h+14]], "#8b7c85", 2);
  line(ctx, [[w*.43,-h+14],[w*.26,-h+19],[w*.31,-h+27]], "#22272f");
  ctx.restore();
}

function drawPine(ctx, x, y, size, tint) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  oval(ctx, 13, 5, 50, 18, "#070e12a8");
  polygon(ctx, [[-7,4],[-5,-45],[7,-45],[9,4],[15,10],[-13,10]], "#3b3134", "#101518");
  const shades = tint ? ["#19282b", "#203134", "#263739"] : ["#1a272a", "#212e32", "#27363a"];
  for (let tier = 0; tier < 3; tier++) {
    const z = -23 - tier * 23;
    const w = 46 - tier * 7;
    polygon(ctx, [[0,z-51],[-w*.62,z-21],[-w*.39,z-21],[-w,z-1],[-w*.47,z+1],[-w*.55,z+6],[-w*.1,z+3],[w*.42,z+6],[w*.38,z+1],[w,z-2],[w*.54,z-23],[w*.66,z-21]], shades[tier], "#10191e");
    line(ctx, [[-2,z-40],[-w*.44,z-20],[-w*.32,z-19],[-w*.75,z-5]], "#3f514d83");
  }
  ctx.restore();
}

function makeGraveyard() {
  const ground = document.createElement("canvas");
  ground.width = WORLD.width;
  ground.height = WORLD.height;
  const ctx = ground.getContext("2d");
  ctx.lineJoin = "round";
  ctx.fillStyle = "#23282d";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  const random = seededRandom(156311);
  const cx = WORLD.width / 2;
  const cy = WORLD.height / 2;
  const paved = (x, y) => Math.abs(x - cx) < 134 || Math.abs(y - cy) < 117 || Math.hypot(x - cx, y - cy) < 266;

  for (let i = 0; i < 14000; i++) {
    const x = random() * WORLD.width;
    const y = random() * WORLD.height;
    if (paved(x, y)) continue;
    if (i < 420) {
      oval(ctx, x, y, 10 + random() * 80, 5 + random() * 46, i % 2 ? "#30403b30" : "#493f422b");
      continue;
    }
    const tint = ["#34443f69", "#161d24a0", "#55514a57", "#41434c70"][i % 4];
    const width = random() * 4 + 1;
    line(ctx, [[x, y], [x + width, y - 1 - random() * 5]], tint);
  }

  for (let y = -18, row = 0; y < WORLD.height; y += 40, row++) {
    for (let x = row % 2 ? -31 : -3; x < WORLD.width; x += 59) {
      if (!paved(x + 30 + (random() - .5) * 22, y + 20)) continue;
      const w = 56 + random() * 2;
      const h = 36 + random() * 2;
      const color = ["#353642", "#31323c", "#3a3b47", "#323540", "#3b3945"][Math.floor(random() * 5)];
      polygon(ctx, [[x+5,y+1],[x+w-6,y+2],[x+w,y+7],[x+w-2,y+h-4],[x+w-9,y+h],[x+3,y+h-1],[x,y+11]], color, "#1a1d27");
      line(ctx, [[x+4,y+12],[x+7,y+5],[x+w-9,y+5]], "#4c4e594e");
      if (random() < .22) line(ctx, [[x+w-3,y+23],[x+w-17,y+20],[x+w-23,y+11],[x+w-34,y+9]], "#20222c", 1.4);
      if (random() < .12) oval(ctx, x+12, y+h-5, 8, 2, "#49534a6b");
    }
  }

  for (const radius of [128, 139, 236, 243]) ring(ctx, cx, cy, radius, "#9f829843", 1.7);
  for (let i = 0; i < 16; i++) {
    const a = i * TAU / 16;
    const x = cx + Math.cos(a) * 225;
    const y = cy + Math.sin(a) * 225;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    polygon(ctx, [[-6,0],[0,-4],[6,0],[0,4]], "#8d798568");
    ctx.restore();
  }
  ctx.save();
  ctx.translate(cx, cy);
  polygon(ctx, [[0,-110],[29,-31],[110,0],[29,31],[0,110],[-29,31],[-110,0],[-29,-31]], "#7a628321", "#9e7a9b43");
  ring(ctx, 0, 0, 59, "#9e7a9b43", 1.4);
  ctx.restore();

  const scenery = [];
  for (let i = 0; i < 335; i++) {
    const x = 26 + random() * (WORLD.width - 52);
    const y = 35 + random() * (WORLD.height - 70);
    if (paved(x, y) || Math.hypot(x - cx, y - cy) < 284) continue;
    const pine = i % 4 === 0 || x < 140 || x > WORLD.width - 140 || y < 90 || y > WORLD.height - 90;
    scenery.push({ x, y, pine, size: .55 + random() * .62, tint: i % 2 });
  }
  for (const [x, y, size] of [[-510,-135,1.27],[-370,-219,1.05],[518,-134,1.16],[357,341,1.22],[-516,306,1.32],[-391,367,1.08],[538,268,1.26]]) {
    scenery.push({ x: cx + x, y: cy + y, pine: true, size, tint: true });
  }
  scenery.sort((a, b) => a.y - b.y);
  for (const prop of scenery) {
    if (prop.pine) drawPine(ctx, prop.x, prop.y, prop.size, prop.tint);
    else drawStone(ctx, prop.x, prop.y, random);
  }

  for (let i = 0; i < 660; i++) {
    const x = random() * WORLD.width;
    const y = random() * WORLD.height;
    if (paved(x, y) && i % 5) continue;
    const s = 1 + random() * 4;
    polygon(ctx, [[x-s,y],[x-s/2,y-s],[x+s*.8,y-s*.7],[x+s,y+1],[x,y+s*.4]], "#4b4a50", "#171d23", .9);
  }
  return ground;
}

const TORCHES = [[-321,-253],[311,-246],[-326,225],[310,233],[-122,-464],[136,448],[-773,128],[795,-126]]
  .map(([x, y]) => ({ x: WORLD.width / 2 + x, y: WORLD.height / 2 + y }));

function torch(ctx, x, y, t) {
  const flicker = Math.sin(t * 13 + x) * 2;
  glow(ctx, x, y - 22, 102 + flicker * 3, "#e8813b48");
  oval(ctx, x + 4, y + 4, 12, 4, "#10131c");
  line(ctx, [[x,y+2],[x,y-28]], "#211c23", 6);
  line(ctx, [[x-1,y],[x-1,y-26]], "#786052", 2);
  polygon(ctx, [[x-8,y-31],[x+8,y-31],[x+5,y-25],[x-4,y-25]], "#9f6048", "#281f25");
  glow(ctx, x, y - 35, 21, "#ff9b4cb3");
  polygon(ctx, [[x-7,y-33],[x-9,y-39],[x-4,y-47],[x-3,y-42],[x+flicker,y-57],[x+6,y-46],[x+8,y-36],[x+4,y-31]], "#ff9a46");
  polygon(ctx, [[x-3,y-33],[x-4,y-39],[x+flicker*.4,y-45],[x+4,y-39],[x+3,y-33]], "#ffeb9b");
  oval(ctx, x+6*Math.sin(t*2+x), y-48-(t*17+x)%27, 1.1, 1.4, "#ffb569");
}

async function loadSprite() {
  const image = new Image();
  image.src = PLAYER_IMAGE;
  await image.decode();
  const mask = document.createElement("canvas");
  mask.width = image.width;
  mask.height = image.height;
  const ctx = mask.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, mask.width, mask.height);
  let left = mask.width, right = 0, top = mask.height, bottom = 0;
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      const offset = (y * mask.width + x) * 4;
      const r = data.data[offset], g = data.data[offset + 1], b = data.data[offset + 2];
      const low = Math.min(r, g, b);
      const high = Math.max(r, g, b);
      if (low >= 175 && high - low < 23) data.data[offset + 3] = 0;
      if (!data.data[offset + 3]) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  ctx.putImageData(data, 0, 0);
  return { image: mask, left, top, width: right - left + 1, height: bottom - top + 1 };
}

function drawPlayer(ctx, p, time, ticks, sprite, masteryShieldTicks) {
  const hop = Math.max(0, Math.sin(p.gait)) * p.motion;
  const landing = Math.max(0, Math.cos(p.gait)) * p.motion;
  const squash = landing * .14 - hop * .15;
  const lift = hop * 10 + Math.sin(time * 3.8) * (1 - p.motion);
  oval(ctx, p.x, p.y + 16, 26 - hop * 5, 7 - hop * 1.6, "#0b0c19c9");
  if (landing > .15) {
    const dustX = p.x - p.leanX * 24;
    const dustY = p.y + 14 - p.leanY * 17;
    ctx.save();
    ctx.globalAlpha = landing * .43;
    oval(ctx, dustX, dustY, 7, 2.6, "#aa9aab");
    oval(ctx, dustX - p.leanX * 9 - 4, dustY - p.leanY * 6, 3.5, 1.6, "#b9a4a9");
    oval(ctx, dustX + 6, dustY + 3, 2.2, 1.2, "#c5acb2");
    ctx.restore();
  }
  glow(ctx, p.x, p.y - lift, 43, "#b999de4d");
  if (ticks < p.shieldUntil || masteryShieldTicks > 0) {
    const radius = (masteryShieldTicks > 0 ? 46 : 38) + Math.sin(time * 11) * 2;
    glow(ctx, p.x, p.y - 7, radius * 1.6, "#ffd09a65");
    ring(ctx, p.x, p.y - 7, radius, "#ffe4aaab", 1.9);
    ring(ctx, p.x, p.y - 7, radius + 4, "#ffe7ba57", 1.1);
    if (masteryShieldTicks > 0) {
      const fraction = masteryShieldTicks / (MASTERIES.shield.duration * TICKS_PER_SECOND);
      const y = p.y - 7;
      ring(ctx, p.x, y, radius + 5, "#fff2c7", 2.5, -Math.PI / 2, -Math.PI / 2 + fraction * TAU);
      for (let i = 0; i < 8; i++) {
        const angle = i * TAU / 8 + time * .26;
        ring(ctx, p.x, y, radius - 4, "#ffbf6da9", 2.4, angle, angle + .39);
        if (fraction > .39 || i > (1 - fraction) * 8) continue;
        const cx = Math.cos(angle), cy = Math.sin(angle);
        const points = [0, 7, 13, 21].map((length, index) => {
          const offset = index % 2 ? 4 : -3;
          return [p.x + cx * (radius - length) - cy * offset, y + cy * (radius - length) + cx * offset];
        });
        line(ctx, points, "#ffdba5", 1.5);
      }
    }
  }
  ctx.save();
  if (ticks < p.immunity && ticks % 10 < 5) ctx.globalAlpha = .57;
  ctx.translate(p.x + p.leanX * p.motion * 2.5, p.y + 14 - lift);
  ctx.rotate(p.leanX * p.motion * .11);
  ctx.scale(p.facing * (1 + squash), 1 - squash);
  if (sprite) {
    const h = 57 * sprite.height / sprite.width;
    ctx.drawImage(sprite.image, sprite.left, sprite.top, sprite.width, sprite.height, -28.5, -h, 57, h);
  } else {
    oval(ctx, 0, -22, 26, 22, "#c9b4f5");
    oval(ctx, -6, -29, 1.5, 1.5, "#282232");
    oval(ctx, 6, -28, 1.5, 1.5, "#282232");
  }
  ctx.restore();
  ctx.fillStyle = "#100c18";
  ctx.fillRect(p.x - 19, p.y + 22, 38, 5);
  ctx.fillStyle = "#fb5e80";
  ctx.fillRect(p.x - 18, p.y + 23, 36 * p.hp / p.maxHp, 3);
}

function drawWaveFoe(ctx, def, body, swing, windingUp) {
  const ink = "#12131c";
  const crest = 3 + def.appearance % 5 * 1.7;
  const steel = "#384055";
  if (def.role === "rush") {
    const foot = swing * 5;
    line(ctx, [[-10,-3],[-15+foot,5],[ -20+foot,7]], "#766578", 5);
    line(ctx, [[8,-4],[10-foot,4],[17-foot,6]], body, 4);
    polygon(ctx, [[-19,-9],[-14,-17],[-3,-14],[7,-22],[14,-23-crest],[16,-16],[23,-12],[17,-5],[4,-4],[-5,1],[-14,-1]], body, ink, 2);
    line(ctx, [[-19,-11],[-25,-17+foot],[-29,-13+foot]], body, 3);
    line(ctx, [[9,-12],[16,-14],[19,-12]], "#fff2b0", 2.2);
    return;
  }

  const width = def.role === "tank" ? 17 : 11;
  line(ctx, [[-6,-3],[-9,6],[-10+swing*3,9]], steel, 6);
  line(ctx, [[6,-3],[9,6],[10-swing*3,9]], steel, 6);
  polygon(ctx, [[-width,1],[-width-3,-14],[-10,-21],[8,-22],[width+2,-14],[width,1]], steel, ink, 2);
  polygon(ctx, [[-10,-23],[-11,-32],[-4,-34-crest],[6,-33],[10,-26],[7,-19],[-5,-19]], body, ink, 2);
  line(ctx, [[-5,-26],[5,-27]], "#1e1725", 2.7);

  if (def.role === "ranged") {
    line(ctx, [[11,-6],[18,-11],[21,-19]], body, 4);
    const weaponX = 21 + crest * .45;
    line(ctx, [[weaponX,-33],[weaponX+6,-24],[weaponX+5,-12],[weaponX,-5]], body, 2.4);
    line(ctx, [[weaponX,-33],[weaponX-(windingUp ? 8 : 0),-19],[weaponX,-5]], "#e8e4d8", 1.1);
    if (windingUp) glow(ctx, weaponX, -19, 15, `${def.color}a8`);
  } else if (def.role === "tank") {
    polygon(ctx, [[4,-21],[24,-24],[29,-17],[27,-1],[16,8],[5,2]], "#242d3e", body, 2.8);
    line(ctx, [[17,-18],[17,2]], body, 2);
    line(ctx, [[9,-9],[24,-11]], body, 2);
  } else {
    oval(ctx, 7, -9, 12, 13, ink);
    oval(ctx, 7, -9, 9, 10, body);
    line(ctx, [[0,-12],[14,-12]], ink, 2.6);
    line(ctx, [[0,-5],[14,-5]], ink, 2.6);
    line(ctx, [[11,-21],[15,-27],[20,-28]], body, 2);
    if (windingUp) glow(ctx, 20, -28, 18, "#ff8d56c9");
  }
}

function drawFoeWarning(ctx, enemy, tick) {
  const { x, y, def, skill } = enemy;
  if (tick >= skill.fireAt) return;
  const progress = 1 - (skill.fireAt - tick) / def.windup;
  if (def.role === "bomber") {
    oval(ctx, x, y, def.blastRadius, def.blastRadius, "#ff713128");
    ring(ctx, x, y, def.blastRadius, "#ffc086cf", 2);
    ring(ctx, x, y, def.blastRadius * (.33 + progress * .66), "#ff794dbd", 1.5);
    return;
  }
  const reach = def.role === "rush" ? def.duration * 7 * enemy.power : 430;
  const shots = def.shots ?? 1;
  if (def.lead) {
    ctx.save();
    ctx.setLineDash([8, 9]);
  }
  for (let i = 0; i < shots; i++) {
    const direction = skill.angle + (i - (shots - 1) / 2) * .19;
    const endX = x + Math.cos(direction) * reach;
    const endY = y + Math.sin(direction) * reach;
    if (def.role === "rush") line(ctx, [[x,y],[endX,endY]], "#ff865832", def.radius * 2);
    line(ctx, [[x,y],[endX,endY]], `${def.color}a6`, 1.2 + progress);
  }
  if (def.lead) ctx.restore();
}

function drawEnemy(ctx, enemy, time, tick) {
  const { kind, x, y, def } = enemy;
  const swing = Math.sin(time * (kind === "bat" ? 14 : 7) + enemy.phase);
  const pale = tick < enemy.flash;
  const ink = "#12131c";
  const body = pale ? "#f9d8ee" : def.color;
  oval(ctx, x, y + 8, def.radius * .88, def.radius * .28, "#0d1019ba");
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(enemy.facing, 1);
  if (def.role) {
    drawWaveFoe(ctx, def, body, swing, Boolean(enemy.skill));
  } else if (kind === "bat") {
    ctx.translate(0, -11 + swing * 2);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      polygon(ctx, [[2,2],[8,-6],[17,-9-swing*6],[24,-5-swing*9],[21,6],[16,2],[12,9],[7,5]], pale ? body : "#74528e", ink);
      line(ctx, [[6,1],[13,-4],[20,-5-swing*8]], "#aa75b987");
      ctx.restore();
    }
    polygon(ctx, [[-6,-8],[-3,-3],[4,-3],[7,-8],[8,4],[2,9],[-6,7],[-8,2]], "#50365f", ink);
    oval(ctx, -3, 0, 1.5, 1.4, "#fbe481");
    oval(ctx, 3, 0, 1.5, 1.4, "#fbe481");
  } else if (kind === "wraith" || def.bossName) {
    const reaper = kind === "reaper";
    const sovereign = kind === "sovereign";
    const bloodlord = kind === "bloodlord";
    ctx.translate(0, -10 + swing * 3);
    const scale = def.bossName ? 2.05 + (def.radius - 30) * .035 : 1;
    ctx.scale(scale, scale);
    glow(ctx, 0, -5, 32, `${def.color}55`);
    if (bloodlord) {
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        polygon(ctx, [[2,9],[14,-12],[25,-24-swing*3],[33,-20],[29,2],[23,-3],[18,12],[12,8],[8,17]], "#7a2851", def.color, 1.45);
        line(ctx, [[5,6],[15,-8],[26,-21-swing*3]], "#ee6ba4", 1.4);
        ctx.restore();
      }
    }
    const robe = reaper ? "#6f3147" : bloodlord ? "#481e44" : "#2d6563";
    if (def.bossName) {
      ctx.shadowColor = def.color;
      ctx.shadowBlur = 15;
    }
    polygon(ctx, [[-13,12],[-17,-1],[-15,-15],[-8,-25],[2,-30],[11,-22],[16,-13],[17,6],[13,16],[5,10],[-4,17],[-3,7]], robe, def.bossName ? def.color : ink, def.bossName ? 1.8 : 2);
    ctx.shadowBlur = 0;
    polygon(ctx, [[-9,-10],[-7,-18],[1,-22],[9,-15],[9,-7],[2,-2],[-5,-4]], body, "#192335", 2.5);
    oval(ctx, -4, -11, 2.2, 3, ink);
    oval(ctx, 4, -11, 2.2, 3, ink);
    if (reaper) {
      line(ctx, [[10,12],[26,-30]], "#b97b8c", 3);
      polygon(ctx, [[25,-29],[16,-39],[2,-41],[9,-43],[21,-40],[31,-33]], "#ffe2e5", ink, 1.5);
    }
    if (sovereign) {
      polygon(ctx, [[-9,-25],[-12,-34],[-5,-31],[0,-40],[5,-31],[12,-35],[9,-25]], "#99ffe9", ink, 1.4);
      ring(ctx, 0, 0, 21, "#8ef4db9c", 1.2, .2, 2.9);
    }
    if (bloodlord) {
      polygon(ctx, [[-11,-22],[-15,-37],[-6,-31],[0,-34],[6,-31],[15,-37],[11,-22],[3,-26],[0,-21],[-3,-26]], "#ef88b7", ink, 1.4);
    }
  } else {
    const skeleton = kind === "skeleton";
    const brute = kind === "brute";
    const size = brute ? 1.36 : 1;
    ctx.scale(size, size);
    const foot = swing * 3;
    const leg = skeleton ? "#c8b895" : "#5a5357";
    line(ctx, [[-6,-3],[-7,3],[-7+foot,10]], ink, 7);
    line(ctx, [[6,-3],[7,3],[7-foot,10]], ink, 7);
    line(ctx, [[-6,-3],[-7,3],[-7+foot,9]], leg, 3.4);
    line(ctx, [[6,-3],[7,3],[7-foot,9]], leg, 3.4);
    const chest = skeleton ? "#6f665e" : brute ? "#70434f" : "#645156";
    polygon(ctx, [[-10,-15],[9,-16],[12,-6],[7,2],[-8,1],[-12,-6]], chest, ink);
    line(ctx, [[-10,-12],[-16,-7],[-17,-1+foot]], ink, 6);
    line(ctx, [[8,-12],[14,-9],[17,-5-foot]], ink, 6);
    line(ctx, [[-10,-12],[-16,-7],[-17,-1+foot]], body, 3);
    line(ctx, [[8,-12],[14,-9],[17,-5-foot]], body, 3);
    if (skeleton) {
      for (let i = 0; i < 3; i++) line(ctx, [[-6,-12+i*4],[0,-10+i*4],[6,-12+i*4]], "#dfd1ad", 1.7);
    } else {
      line(ctx, [[-5,-14],[-1,-8],[5,-9],[7,-5]], "#a77979", 1.6);
    }
    polygon(ctx, [[-10,-24],[-6,-30],[4,-31],[10,-26],[10,-18],[5,-13],[-4,-13],[-9,-17]], body, ink);
    if (!skeleton) line(ctx, [[-9,-25],[-5,-29],[2,-29],[4,-26]], "#4e6954", 2.2);
    oval(ctx, -4, -22, 2.2, 2.8, ink);
    oval(ctx, 4.5, -22, 2.3, 2.6, ink);
    if (!skeleton) {
      oval(ctx, -3.7, -22, .8, 1.1, "#ff876f");
      oval(ctx, 5, -22, .8, 1.1, "#ff876f");
    }
    line(ctx, [[-4,-16],[1,-16.5],[6,-17]], ink, 2.1);
  }
  ctx.restore();
  if (enemy.attack?.beam && tick < enemy.attack.fireAt) drawLaserChargeOrb(ctx, enemy.attack, tick);
}

function drawLaserChargeOrb(ctx, { beam, fireAt, windup }, tick) {
  const progress = 1 - (fireAt - tick) / windup;
  const { x, y } = beam;
  const orbRadius = 5 + progress * 11;
  glow(ctx, x, y, orbRadius * 2.8, "#ff345acb");
  ring(ctx, x, y, 25 - progress * 9, "#ff9eaa", 2);
  oval(ctx, x, y, orbRadius, orbRadius, "#ff5369");
  oval(ctx, x, y, orbRadius * .46, orbRadius * .46, "#fff0d7");
}

function drawBossLaser(ctx, attack, tick) {
  const { beam, fireAt, windup } = attack;
  const { x, y, endX, endY, dx, dy } = beam;
  const path = [[x, y], [endX, endY]];
  ctx.save();
  if (tick < fireAt) {
    const progress = 1 - (fireAt - tick) / windup;
    line(ctx, path, "#e9354d38", BOSS_LASER_RADIUS * 2);
    ctx.setLineDash([10, 7]);
    line(ctx, path, "#ff6570", 2 + progress);
  } else {
    const age = (tick - fireAt) / BOSS_LASER_DURATION;
    const pulse = .87 + .13 * Math.cos(age * TAU * 3);
    ctx.shadowColor = "#ff213e";
    ctx.shadowBlur = 18;
    line(ctx, path, "#e81940a6", BOSS_LASER_RADIUS * 2.8);
    ctx.shadowBlur = 0;
    line(ctx, path, "#f12640", BOSS_LASER_RADIUS * 2);
    line(ctx, path, "#ff665f", BOSS_LASER_RADIUS * pulse);
    line(ctx, path, "#ffe7b9", 4 * pulse);
    glow(ctx, x, y, 45, "#ff314dbd");
    glow(ctx, endX, endY, 50 * pulse, "#ff4f5ede");
    for (let i = -2; i <= 2; i++) {
      const offset = i * 13 * pulse;
      line(ctx, [[endX - dx * 12, endY - dy * 12],
        [endX + dx * 9 - dy * offset, endY + dy * 9 + dx * offset]], "#ff5a63", 2.6);
    }
  }
  ctx.restore();
}

function drawBossAttack(ctx, enemy, tick) {
  const { x, y, attack } = enemy;
  if (attack.beam) {
    drawBossLaser(ctx, attack, tick);
    return;
  }
  if (tick >= attack.fireAt) return;
  const progress = 1 - (attack.fireAt - tick) / attack.windup;
  ctx.save();
  if (attack.pattern === "charge") {
    const reach = BOSS_CHARGE_TICKS * BOSS_CHARGE_STRIDE * enemy.power;
    const dx = Math.cos(attack.angle) * reach;
    const dy = Math.sin(attack.angle) * reach;
    line(ctx, [[x,y],[x+dx,y+dy]], "#ff494b32", enemy.def.radius * 2);
    ctx.setLineDash([9, 8]);
    line(ctx, [[x,y],[x+dx,y+dy]], "#ffb3a2dc", 2);
  } else if (attack.pattern === "volley") {
    glow(ctx, x, y, 77, "#9effe966");
    ring(ctx, x, y, 55 - progress * 25, "#9effe9cb", 2.2);
    const reach = 66 + progress * 48;
    for (let i = 0; i < BOSS_VOLLEY_COUNT; i++) {
      const direction = attack.angle + i * TAU / BOSS_VOLLEY_COUNT;
      const dx = Math.cos(direction), dy = Math.sin(direction);
      line(ctx, [[x + dx * 31, y + dy * 31], [x + dx * reach, y + dy * reach]], "#9effe987", 1.4);
    }
  }
  ctx.restore();
}

function drawHazard(ctx, hazard, tick) {
  const { x, y, radius } = hazard;
  if (hazard.kind === "cleaver") {
    line(ctx, [[x-hazard.vx*5,y-hazard.vy*5],[x,y]], "#f8b0708a", 2.5);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tick * .26);
    drawCleaver(ctx);
    ctx.restore();
    return;
  }
  if (hazard.kind === "arrow") {
    line(ctx, [[x-hazard.vx*5,y-hazard.vy*5],[x,y]], hazard.color, 3.2);
    oval(ctx, x, y, 3.4, 3.4, "#fff1b5");
    return;
  }
  if (hazard.kind === "shard") {
    glow(ctx, x, y, 22, "#6bf5e38b");
    line(ctx, [[x-hazard.vx*5,y-hazard.vy*5],[x,y]], "#78d9dcbb", 4);
    polygon(ctx, [[x,y-7],[x+5,y],[x,y+7],[x-5,y]], "#dcfff5", "#60d9d1", 1.3);
    return;
  }
  if (hazard.kind === "blast") {
    const fade = Math.max(0, (hazard.until - tick) / (hazard.until - hazard.fireAt));
    ctx.save();
    ctx.globalAlpha = fade;
    glow(ctx, x, y, radius, `${hazard.color}e8`);
    ring(ctx, x, y, radius * (.65 + .35 * (1 - fade)), "#ffd5a5", 3);
    ctx.restore();
    return;
  }
  const active = tick >= hazard.fireAt;
  oval(ctx, x, y, radius, radius, active ? "#fb227b73" : "#e93c6c32");
  ring(ctx, x, y, radius, active ? "#ffc0df" : "#ff8fa5d2", active ? 3 : 2);
  if (active) {
    glow(ctx, x, y, radius, "#ffd4ee9c");
    ring(ctx, x, y, radius * .74, "#ff9dcebc", 2.4);
  } else {
    const progress = (tick - hazard.markedAt) / (hazard.fireAt - hazard.markedAt);
    ring(ctx, x, y, radius * (.26 + .7 * progress), "#ff9cbba9", 1.6);
  }
}

function drawCleaver(ctx) {
  line(ctx, [[-8,7],[3,-3]], "#b3835f", 3.5);
  polygon(ctx, [[-2,-2],[1,-8],[8,-10],[11,-7],[8,-2],[2,1]], "#ded2ad", "#392b30", 1.4);
  line(ctx, [[1,-7],[8,-9],[10,-7]], "#fff1cd", 1.3);
}

function drawBlade(ctx, blade) {
  ctx.save();
  ctx.translate(blade.x, blade.y);
  ctx.rotate(blade.angle * 2.5);
  ctx.scale(blade.size, blade.size);
  glow(ctx, 0, 0, 25, "#d264fc72");
  for (let i = 0; i < 3; i++) {
    ctx.rotate(TAU / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(2, -12, 19, -14);
    ctx.quadraticCurveTo(14, -7, 8, -2);
    ctx.quadraticCurveTo(5, 4, 0, 0);
    ctx.fillStyle = "#d6adfb";
    ctx.fill();
    ctx.strokeStyle = "#4b2d6b";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    line(ctx, [[5,-4],[11,-9],[16,-12]], "#faf1ff");
  }
  oval(ctx, 0, 0, 4, 4, "#f0c6ff");
  ctx.restore();
}

function drawMasteryOrbit(ctx, run) {
  const { player: p, bladeRadius } = run;
  ring(ctx, p.x, p.y, bladeRadius + 8, "#d181ff41", 1.4);
  for (const blade of run.blades) {
    ring(ctx, p.x, p.y, bladeRadius, "#ae60fa78", 11, blade.angle - .92, blade.angle);
    ring(ctx, p.x, p.y, bladeRadius, "#f2b4ffcd", 2.4, blade.angle - .59, blade.angle);
    ring(ctx, p.x, p.y, bladeRadius + 8, "#f5ddffc7", 1.4, blade.angle - .33, blade.angle + .03);
  }
}

function drawMasteryHealing(ctx, p, time, vitality) {
  const color = vitality ? "#ffd297" : "#a0ffcf";
  const tint = vitality ? "#ff72915d" : "#53ffc064";
  const radius = vitality ? 48 : 36;
  const y = p.y + 10;
  glow(ctx, p.x, y, radius * 1.5, tint);
  for (let i = 0; i < 3; i++) {
    const angle = time * (vitality ? -2 : 2.7) + i * TAU / 3;
    ring(ctx, p.x, y, radius, color, 2.2, angle, angle + .82);
  }
  for (let i = 0; i < 10; i++) {
    const phase = (time * .95 + i * .173) % 1;
    const angle = i * 2.39996 + time * 1.7;
    const x = p.x + Math.cos(angle) * radius * (1 - phase * .6);
    const height = y + Math.sin(angle) * radius * .57 - phase * 57;
    ctx.save();
    ctx.globalAlpha = Math.sin(phase * Math.PI);
    if (vitality) {
      oval(ctx, x, height, 2.3, 3.4, color);
    } else {
      line(ctx, [[x - 3,height],[x + 3,height]], color, 1.7);
      line(ctx, [[x,height - 3],[x,height + 3]], color, 1.7);
    }
    ctx.restore();
  }
}

const MOON_COLORS = ["#88c4ff", "#c4a5ff", "#87f8eb"];

function drawMoonBolt(ctx, bolt) {
  const { lane, trail } = bolt.moon;
  const color = MOON_COLORS[lane];
  if (trail.length) {
    const fade = ctx.createLinearGradient(trail[0].x, trail[0].y, bolt.x, bolt.y);
    fade.addColorStop(0, `${color}00`);
    fade.addColorStop(.5, `${color}65`);
    fade.addColorStop(1, color);
    const points = trail.map(({ x, y }) => [x, y]);
    points.push([bolt.x, bolt.y]);
    line(ctx, points, fade, 5.4);
    line(ctx, points, "#e4f8ff80", 1.25);
  }
  ctx.save();
  ctx.translate(bolt.x, bolt.y);
  ctx.rotate(Math.atan2(bolt.vy, bolt.vx));
  glow(ctx, 0, 0, 13, `${color}b8`);
  polygon(ctx, [[-7,0],[-2,-2.9],[6,0],[-2,2.9]], "#f3ffff", color, 1.2);
  ctx.restore();
}

function drawBolt(ctx, b) {
  if (b.moon) {
    drawMoonBolt(ctx, b);
    return;
  }
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(Math.atan2(b.vy, b.vx));
  const tail = ctx.createLinearGradient(-44, 0, 9, 0);
  tail.addColorStop(0, "transparent");
  tail.addColorStop(.65, b.breach ? "#efb9ffab" : b.auto ? "#5ebdff9c" : "#ff9c459c");
  tail.addColorStop(1, b.breach ? "#fff0b1" : b.auto ? "#b2f0ff" : "#ffd892");
  const width = b.breach ? 8 : 5;
  polygon(ctx, [[-44,0],[-8,-width],[9,0],[-8,width]], tail);
  line(ctx, [[-19,0],[5,0]], b.auto ? "#dffbff" : "#fff0cd", 1.6);
  ctx.restore();
}

function drawDeathBurst(ctx, { x, y, radius, color, seed }, age) {
  const spread = 1 - (1 - age) ** 3;
  const shockRadius = radius * (0.55 + spread * 2.5);
  ring(ctx, x, y, shockRadius, "#ffc19cbd", 2.6 - age * 1.8);
  ring(ctx, x, y, shockRadius * .76, `${color}99`, 1.5);

  if (age < .28) {
    const flash = 1 - age / .28;
    ctx.save();
    ctx.globalAlpha *= flash;
    glow(ctx, x, y, radius * 3.2, "#ff8c67e3");
    ctx.translate(x, y);
    ctx.rotate(seed);
    const size = radius * (0.65 + flash * 0.65);
    const corner = size * .24;
    polygon(ctx, [[-size,0],[-corner,-corner],[0,-size],[corner,-corner],
      [size,0],[corner,corner],[0,size],[-corner,corner]], "#fff2ce");
    ctx.restore();
  }

  const count = radius >= 30 ? 18 : 11;
  for (let i = 0; i < count; i++) {
    const angle = seed + i * 2.39996;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const distance = radius * (0.35 + spread * (1.25 + (i * 7 % 11) * 0.19));
    const px = x + dx * distance;
    const py = y + dy * distance;
    const length = (radius * .4 + i % 4 * 2) * (1 - age * .75);
    if (i % 3 === 0) {
      const width = length * .27;
      polygon(ctx, [[px,py],[px-dx*length-dy*width,py-dy*length+dx*width],
        [px-dx*length*.65+dy*width,py-dy*length*.65-dx*width]], color);
    } else {
      line(ctx, [[px-dx*length,py-dy*length],[px,py]], i % 2 ? "#ff9b69" : "#fff1c9", 2.1 - age);
    }
  }
}

function drawEffect(ctx, effect, tick) {
  const { x, y, kind } = effect;
  const age = (tick - effect.tick) / effect.life;
  if (age < 0 || age >= 1) return;
  ctx.save();
  ctx.globalAlpha = (1 - age) ** 1.4;
  if (kind === "dash") {
    glow(ctx, x, y - 7, (effect.empowered ? 39 : 27) + age * 7, "#c98affcf");
    oval(ctx, x, y - 7, 16, 11, effect.empowered ? "#f3ddffd0" : "#dcc1ff8f");
  } else if (kind === "dash-trail") {
    const dx = effect.endX - x, dy = effect.endY - y;
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      ctx.translate(x, y - 8);
      ctx.rotate(Math.atan2(dy, dx));
      const width = (1 - age) * 18;
      const color = ctx.createLinearGradient(0, 0, length, 0);
      color.addColorStop(0, "#8a43e22b");
      color.addColorStop(.52, "#bf6fff8d");
      color.addColorStop(1, "#f9cbffdf");
      polygon(ctx, [[0,0],[length * .38,-width],[length,0],[length * .58,width]], color);
      line(ctx, [[0,0],[length,0]], color, 5);
      line(ctx, [[length * .34,-width * .43],[length,-2]], "#f2b2ffc9", 1.65);
      line(ctx, [[length * .14,width * .36],[length,2]], "#e3a4ff99", 1.5);
    }
  } else if (kind === "mastery-cast") {
    const radius = 20 + age * 65;
    glow(ctx, x, y, radius, `${effect.color}72`);
    for (let i = 0; i < 6; i++) {
      const angle = i * TAU / 6 + age * 1.2;
      ring(ctx, x, y, radius, effect.color, 2.1, angle, angle + .54);
    }
  } else if (kind === "moon-muzzle" || kind === "mastery-impact") {
    const muzzle = kind === "moon-muzzle";
    const color = muzzle ? MOON_COLORS[effect.lane] : effect.color;
    const size = muzzle ? 9 : 15;
    ctx.translate(x, y);
    ctx.rotate(effect.angle);
    glow(ctx, 0, 0, size * 1.7, `${color}99`);
    line(ctx, [[-size * .48,0],[size * (1 + age),0]], color, 2.6);
    for (const side of [-1, 1]) {
      line(ctx, [[0,side * 2],[size * (.5 + age),side * size * (.35 + age)]], color, 1.55);
    }
  } else if (kind === "shield-wave") {
    const radius = effect.radius * (tick - effect.tick + 1) / effect.life;
    if (age < .36) glow(ctx, x, y, 65 + age * 90, "#ffce849b");
    ring(ctx, x, y, radius, "#ffad547a", 19);
    ring(ctx, x, y, radius, "#fff2cf", 3.8);
    ring(ctx, x, y, Math.max(1, radius - 17), "#ffd08abf", 2);
    for (let i = 0; i < 20; i++) {
      const angle = i * TAU / 20 + age * (i % 2 ? .41 : -.28);
      const distance = radius * (.58 + (i % 5) * .095);
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle + age * (i % 2 ? 6 : -5));
      const size = 4 + (i % 4) * 1.7;
      polygon(ctx, [[-size,0],[size * .7,-size * .48],[size,0],[size * .17,size * .58]],
        i % 3 ? "#ffd695b3" : "#fff5d5", "#fff2c9a8", 1);
      ctx.restore();
    }
  } else if (kind === "hurt") {
    ring(ctx, x, y, 19 + 32 * age, "#ff5a78", 3.5);
  } else if (kind === "cover") {
    ring(ctx, x, y, 3 + 13 * age, "#e0be86", 1.8);
    line(ctx, [[x-4-6*age,y+3],[x+4+4*age,y-6]], "#f9dc9e", 1.5);
  } else {
    const burst = kind === "burst";
    if (burst) {
      drawDeathBurst(ctx, effect, age);
    } else {
      for (let i = 0; i < 4; i++) {
        const angle = effect.seed + i * 2.4;
        const distance = (7 + i * 3) * (age * 2 + .15);
        const px = x + Math.cos(angle) * distance;
        const py = y + Math.sin(angle) * distance;
        line(ctx, [[px,py],[px+Math.cos(angle)*6,py+Math.sin(angle)*6]], i % 2 ? effect.color : "#fff2dc", 1.7);
      }
    }
    ctx.font = burst ? "bold 16px system-ui" : "bold 14px system-ui";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#18101d";
    ctx.lineWidth = 3;
    ctx.strokeText(effect.damage, x, y - 19 - age * 19);
    ctx.fillStyle = burst ? "#ffb271" : "#ffe5ae";
    ctx.fillText(effect.damage, x, y - 19 - age * 19);
  }
  ctx.restore();
}
