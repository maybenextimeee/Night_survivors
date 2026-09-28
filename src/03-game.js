/* ---------- 4. состояние забега --------------------------------------- */
const RUN_LEN = 900;          // 15 минут — полный забег, дальше выходит Жнец
const CHEST_FIRST = 45;       // первый сундук — через сорок пять секунд
const CHEST_EVERY = 45;       // дальше раз в сорок пять секунд…
const CHEST_RUSH = 600;       // …а с десятой минуты — почти вдвое чаще
const CHEST_FAST = 25;
const CHEST_GOLD_EVERY = 4;   // каждый четвёртый сундук — золотой
const WAVE_EVERY = 120;       // большая волна раз в две минуты
const WAVE_WARN = 2.5;        // столько секунд предупреждаем до её выхода
const RUSH_PER_KILL = 0.025;  // +2.5% скорости за врага, убитого активным навыком…
const RUSH_CAP = 0.3;         // …не выше +30%…
const RUSH_TIME = 1;          // …держится секунду после каста…
const RUSH_FADE = 0.8;        // …и гаснет за треть секунды
const ACCEL_RATE = 30;        // 1/с: скорость догоняет ввод за ~33 мс
const BRAKE_RATE = 24;        // торможение чуть мягче разгона — остаётся микронакат
const TURN_RATE = 30;         // рад/с: разворот на 180° примерно за 0.1 с
const AB_CHARGES = 3;         // столько зарядов копит активный навык
const AB_GAP = 0.22;          // минимум между кастами, чтобы очередь читалась
const FLASH_TIME = 0.4;       // блик готовности заряда
const FLASH_ULT = 0.6;        // блик готовности ульты — длиннее и ярче
const DIM_TIME = 0.22;        // «пусто»: иконка коротко тускнеет
const DIM_GAP = 0.5;          // и не мигает чаще этого, пока держишь кнопку
const REFUND_PER_KILL = 0.035; // столько заряда возвращает одно убийство навыком
const REFUND_SHARE = 0.45;     // но суммарно не больше 45% заряда за каст
const MAX_ENEMIES = 340;      // потолок толпы: выше начинает проседать кадр
const MAX_WEAPONS = 4;
const MAX_PASSIVES = 6;

const g = {
  state: "menu",              // menu | play | levelup | pause | end
  time: 0, dt: 0,
  p: null,
  enemies: [], bullets: [], ebullets: [], gems: [], drops: [], mines: [], missiles: [],
  parts: [], nums: [], slashes: [], zaps: [], beams: [], wells: [], props: [], pools: [], discs: [],
  grid: new Grid(56), pgrid: new Grid(96), propT: 0,
  cam: { x: 0, y: 0 }, shake: 0,
  kills: 0, gold: 0, bonus: 0, bossIdx: 0, boss: null,
  spawnAcc: 0, pendingUps: 0, won: false, damageDealt: 0,
  chestT: 0, chests: 0, reaper: false, autoPick: null,
  /* кто именно наносит урон прямо сейчас — источник пишется в статистику */
  dmgSource: null, dmgName: "", stats: {},
  waveT: 0, waveIdx: 0, waveHold: 0, warn: null,
  runProps: 0, runChests: 0, runBosses: 0, runMaxed: 0, rerolls: 0, unlockT: 0,
  quests: [], questBonus: 0, banishes: 0, banished: []
};
const scratch = [];
/* отдельный буфер: неонки задеваются изнутри циклов, которые уже идут по scratch */
const propScratch = [];

function makePlayer(charId) {
  const ch = CHARS.find(c => c.id === charId) || CHARS[0];
  const m = ch.mods || {};
  const p = {
    x: 0, y: 0, vx: 0, vy: 0, r: 13, face: -Math.PI / 2,
    level: 1, xp: 0, xpNext: 14,
    weapons: [], passives: {},
    dashT: 0, dashCd: 0, inv: 0, hitFlash: 0,
    ability: ABILITIES[save.ability] ? save.ability : "phantom",
    abCharge: 1, abLvl: 1, abRefund: 0, abGap: 0,  // заряды копятся, первый выдаём сразу
    chargeSeen: 1, dashSeen: false,                // для отлова момента готовности
    readyT: 0, readyMax: FLASH_TIME, readyPow: 1, readyColor: "#3ee8ff",
    dimT: 0, dimCd: 0,
    rush: 0, rushT: 0,
    char: ch, mods: m,
    revive: metaLvl("revive") > 0 ? 1 : 0,
    baseHp: 100 + metaLvl("hp") * 15 + (m.hp || 0)
  };
  p.maxHp = p.baseHp;
  p.hp = p.maxHp;
  addWeapon(p, ch.weapon);
  if (m.extraOrb && p.weapons[0]) p.weapons[0].lvl = 2;
  recalc(p);
  return p;
}

/* base — исходный вид оружия. После эволюции id меняется (blade → vortex),
   и без base набор карт считал бы «Плазморез» ещё не взятым. */
function addWeapon(p, id) { p.weapons.push({ id: id, base: id, lvl: 1, t: 0, ang: rnd(TAU), hits: new Map() }); }

/* пересчёт всех множителей: пассивки × мастерская × персонаж */
function recalc(p) {
  const L = k => p.passives[k] || 0;
  const m = p.mods;
  p.dmgMul = (1 + L("power") * 0.15) * (1 + metaLvl("dmg") * 0.06) * (m.dmg || 1);
  p.cdMul = Math.pow(0.92, L("haste")) * (m.cd || 1);
  p.areaMul = 1 + L("area") * 0.12;
  p.speed = 196 * (1 + L("boots") * 0.09) * (1 + metaLvl("spd") * 0.04) * (m.spd || 1);
  p.pickR = 78 * (1 + L("magnet") * 0.3) * (1 + metaLvl("mag") * 0.18);
  p.armor = L("armor") * 2 + metaLvl("armor");
  p.regen = metaLvl("regen") * 0.3;
  p.greedMul = (1 + L("greed") * 0.18) * (1 + metaLvl("greed") * 0.1) * (m.greed || 1)
    * (1 + metaLvl("curse") * 0.25);            // проклятие платит осколками за риск
  p.countBonus = L("dup") + metaLvl("echo");
  p.durMul = 1 + L("dura") * 0.15;
  p.xpMul = (1 + L("growth") * 0.1) * (1 + metaLvl("growth") * 0.04);
  p.luck = L("luck") * 0.06 + metaLvl("luck") * 0.05 + (m.luck || 0);
  p.areaMul *= (m.area || 1);
  p.dashCdMax = Math.max(0.7, 2.2 - metaLvl("dash") * 0.45);
  const newMax = p.baseHp + L("heart") * 22;
  if (newMax !== p.maxHp) { const d = newMax - p.maxHp; p.maxHp = newMax; if (d > 0) p.hp += d; }
  p.hp = Math.min(p.hp, p.maxHp);
}

function startRun() {
  g.state = "play";
  g.time = 0; g.kills = 0; g.gold = 0; g.bonus = 0; g.bossIdx = 0; g.boss = null;
  g.spawnAcc = 0; g.pendingUps = 0; g.won = false; g.shake = 0; g.damageDealt = 0;
  g.chestT = 0; g.chests = 0; g.reaper = false; g.autoPick = null;
  g.stats = {}; g.dmgSource = null; g.dmgName = "";
  g.waveT = WAVE_EVERY; g.waveIdx = 0; g.waveHold = 0; g.warn = null;
  g.runProps = 0; g.runChests = 0; g.runBosses = 0; g.runMaxed = 0;
  g.rerolls = metaLvl("reroll"); g.unlockT = 0;
  g.banishes = metaLvl("banish"); g.banished.length = 0;
  g.questBonus = 0;
  g.enemies.length = g.bullets.length = g.ebullets.length = g.gems.length = 0;
  g.drops.length = g.mines.length = g.missiles.length = 0;
  g.parts.length = g.nums.length = g.slashes.length = g.zaps.length = 0;
  g.beams.length = g.wells.length = g.props.length = 0;
  g.pools.length = g.discs.length = 0;
  g.propT = 1.5;
  g.p = makePlayer(save.char);
  g.cam.x = 0; g.cam.y = 0;
  save.runs++;
  writeSave();
  /* «Предзагрузка» из мастерской — бесплатные апгрейды на старте */
  g.pendingUps = metaLvl("start");
  g.quests = makeQuests();
  Sfx.init(); Sfx.resume();
  clearPressed();
  UI.enterPlay();
  UI.showQuestIntro();
  if (g.pendingUps > 0) openLevelUp();
}

/* ---------- вспомогательные боевые функции (их зовёт оружие) ----------- */
function nearestEnemy(gg, x, y, maxR) {
  let best = null, bd = maxR * maxR;
  const list = gg.enemies;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e.dead) continue;
    const d = dist2(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function randomEnemy(gg, maxR) {
  scratch.length = 0;
  const r2 = maxR * maxR;
  for (let i = 0; i < gg.enemies.length; i++) {
    const e = gg.enemies[i];
    if (!e.dead && dist2(gg.p.x, gg.p.y, e.x, e.y) < r2) scratch.push(e);
  }
  return scratch.length ? pick(scratch) : null;
}

/* сколько секунд копится один заряд навыка с учётом «Криоконтура» */
function abCdSec(p) { return ABILITIES[p.ability].s(p.abLvl).cd * p.cdMul; }

/* весь урон подписывается источником: из этого потом строится разбор забега */
function setSrc(id, name) { g.dmgSource = id; g.dmgName = name; }
function statOf(id, name) {
  let st = g.stats[id];
  if (!st) st = g.stats[id] = { name: name, dmg: 0, kills: 0 };
  if (name) st.name = name;
  return st;
}

function damageEnemy(e, dmg, dirX, dirY, kb, color) {
  if (e.dead) return;
  if (g.dmgSource) statOf(g.dmgSource, g.dmgName).dmg += Math.min(dmg, e.hp);  // без оверкилла
  e.hp -= dmg;
  g.damageDealt += dmg;
  e.flash = 0.09;
  if (kb && !e.boss) { e.kx += dirX * kb; e.ky += dirY * kb; }
  pushNum(e.x, e.y - e.r, Math.round(dmg), color || "#fff");
  if (e.hp <= 0) killEnemy(e); else if (Math.random() < 0.35) Sfx.hit();
}

function killEnemy(e) {
  e.dead = true;
  g.kills++;
  if (!e.boss && e.def) questProgress("kill", e.def.id, 1);
  if (g.dmgSource) statOf(g.dmgSource, g.dmgName).kills++;
  const pl = g.p;
  /* префикс, а не точное равенство: ульта пишется как "ab:<id>:ult" */
  if (pl && g.dmgSource && g.dmgSource.indexOf("ab:" + pl.ability) === 0) {
    /* срезал толпу активным навыком — короткий разгон, тем сильнее,
       чем больше положил за этот каст */
    pl.rush = Math.min(RUSH_CAP, pl.rush + RUSH_PER_KILL);
    pl.rushT = RUSH_TIME;
    /* и часть заряда обратно, но не больше бюджета за каст */
    if (pl.abRefund > 0) {
      const r = Math.min(REFUND_PER_KILL, pl.abRefund);
      pl.abRefund -= r;
      pl.abCharge = Math.min(AB_CHARGES, pl.abCharge + r);
    }
  }
  burst(e.x, e.y, e.color, e.boss ? 46 : 8, e.boss ? 5 : 2.4);
  Sfx.kill();
  if (e.boss) {
    g.boss = null;
    g.bonus += e.def.shards;
    g.runBosses++;
    g.shake = 22;
    for (let i = 0; i < 22; i++) dropGem(e.x + rnd(-70, 70), e.y + rnd(-70, 70), Math.ceil(e.def.xp / 22));
    for (let i = 0; i < 6; i++) g.drops.push({ x: e.x + rnd(-60, 60), y: e.y + rnd(-60, 60), r: 9, type: "gold", v: 10 });
    g.drops.push({ x: e.x, y: e.y, r: 14, type: "chest" });
    UI.toast("★ " + e.def.name + " ПОВЕРЖЕН");
    if (e.def.final) { g.won = true; endRun(true); }
    return;
  }
  dropGem(e.x, e.y, e.def.xp * (e.elite ? 4 : 1));
  /* сундук роняет только тот элитник, которого прислало расписание */
  if (e.chest) {
    g.drops.push({ x: e.x, y: e.y, r: e.gold ? 16 : 12, type: "chest", gold: !!e.gold });
  } else if (e.elite) {
    g.drops.push({ x: e.x, y: e.y, r: 8, type: "gold", v: 4 });
  } else if (Math.random() < 0.1) {
    g.drops.push({ x: e.x, y: e.y, r: 8, type: "gold", v: 1 });
  } else if (Math.random() < 0.018) {
    g.drops.push({ x: e.x, y: e.y, r: 9, type: "heal", v: 15 });
  }
}

/* ---------- уличные неонки -------------------------------------------- */
/* неонки стоят строго на узлах сетки пола — так квартал выглядит
   размеченным, а не засыпанным мусором */
function spawnProp() {
  if (g.props.length >= PROP.cap) return;
  const c = PROP.cell;
  for (let tries = 0; tries < 8; tries++) {
    const a = rnd(TAU), d = rnd(PROP.near, PROP.far);
    const x = Math.round((g.p.x + Math.cos(a) * d) / c) * c;
    const y = Math.round((g.p.y + Math.sin(a) * d) / c) * c;
    let busy = false;
    for (let i = 0; i < g.props.length; i++) {
      const o = g.props[i];
      if (!o.dead && o.x === x && o.y === y) { busy = true; break; }
    }
    if (busy) continue;
    g.props.push({ x: x, y: y, r: PROP.r, hp: PROP.hp, flash: 0, ph: rnd(TAU) });
    return;
  }
}

/* любой площадной урон задевает и неонки; seen не даёт лучу
   ударить одну и ту же дважды на соседних шагах */
function damageProps(x, y, r, dmg, seen) {
  if (!g.props.length) return;
  g.pgrid.query(x, y, r, propScratch);
  for (let i = 0; i < propScratch.length; i++) {
    const pr = propScratch[i];
    if (pr.dead || (seen && seen.has(pr))) continue;
    if (seen) seen.add(pr);
    pr.hp -= dmg;
    pr.flash = 0.1;
    if (pr.hp <= 0) breakProp(pr);
  }
}

function breakProp(pr) {
  pr.dead = true;
  g.runProps++;
  burst(pr.x, pr.y, "#ffd166", 16, 3);
  g.parts.push({ x: pr.x, y: pr.y, vx: 0, vy: 0, life: 0.3, max: 0.3, color: "#ffd166", size: 42, ring: true });
  Sfx.noise(0.16, 0.1, 2400);
  /* удача сдвигает бросок в сторону полезного дропа */
  let acc = 0;
  const roll = Math.max(0, Math.random() - (g.p ? g.p.luck * 0.5 : 0));
  for (let i = 0; i < PROP_DROPS.length; i++) {
    acc += PROP_DROPS[i].chance;
    if (roll > acc) continue;
    const d = PROP_DROPS[i];
    if (d.kind === "heal") g.drops.push({ x: pr.x, y: pr.y, r: 9, type: "heal", v: d.v });
    else if (d.kind === "gold") g.drops.push({ x: pr.x, y: pr.y, r: 8, type: "gold", v: d.v });
    else if (d.kind === "magnet") g.drops.push({ x: pr.x, y: pr.y, r: 11, type: "magnet" });
    break;
  }
}

/* чем плотнее набит колодец, тем больнее бьёт: +5% за каждого внутри,
   но не больше +120%, иначе одна воронка выносила бы всю волну */
const crowdMul = n => 1 + Math.min(1.2, n * 0.05);

/* рывок засасывает опыт вокруг: и обычный, и «Фантом» по всей линии */
function vacuumGems(x, y, r) {
  const r2 = r * r;
  for (let i = 0; i < g.gems.length; i++) {
    const q = g.gems[i];
    if (!q.magnet && dist2(q.x, q.y, x, y) < r2) q.magnet = true;
  }
}

/* магнит тянет к игроку всё, кроме сундуков — их надо забирать ногами */
function pullEverything() {
  for (let i = 0; i < g.gems.length; i++) g.gems[i].magnet = true;
  for (let i = 0; i < g.drops.length; i++) if (g.drops[i].type !== "chest") g.drops[i].magnet = true;
}

function dropGem(x, y, val) {
  if (g.gems.length > 320) { const old = g.gems.shift(); gainXp(old.v); }
  g.gems.push({ x: x + rnd(-6, 6), y: y + rnd(-6, 6), r: 5, v: val, t: 0 });
}

/* дуговой взмах: всё в секторе получает урон */
function swing(gg, angle, arc, range, dmg, kb, color) {
  const p = gg.p, half = arc / 2;
  gg.grid.query(p.x, p.y, range, scratch);
  for (let i = 0; i < scratch.length; i++) {
    const e = scratch[i];
    if (e.dead) continue;
    if (arc < TAU) {
      let d = Math.atan2(e.y - p.y, e.x - p.x) - angle;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      if (Math.abs(d) > half) continue;
    }
    const dx = e.x - p.x, dy = e.y - p.y, len = Math.hypot(dx, dy) || 1;
    damageEnemy(e, dmg, dx / len, dy / len, kb, color);
  }
  gg.slashes.push({ x: p.x, y: p.y, a: angle, arc: arc, r: range, life: 0.19, max: 0.19, color: color });
  damageProps(p.x, p.y, range, dmg);
}

/* урон по кругу; hits — карта «когда снова можно бить эту цель» */
function hitArea(gg, x, y, r, dmg, kb, hits, cool, color) {
  gg.grid.query(x, y, r, scratch);
  for (let i = 0; i < scratch.length; i++) {
    const e = scratch[i];
    if (e.dead) continue;
    if (hits) {
      const t = hits.get(e);
      if (t !== undefined && t > gg.time) continue;
      hits.set(e, gg.time + cool);
    }
    const dx = e.x - x, dy = e.y - y, len = Math.hypot(dx, dy) || 1;
    damageEnemy(e, dmg, dx / len, dy / len, kb, color);
  }
  damageProps(x, y, r, dmg);
}

/* урон вдоль отрезка: идём по нему шагами и собираем цели через сетку,
   Set не даёт ударить одного врага дважды на соседних шагах */
function lineHit(gg, x1, y1, x2, y2, w, dmg, kb, color) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const n = Math.max(1, Math.ceil(len / Math.max(20, w * 0.6)));
  const seen = new Set();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const sx = x1 + dx * t, sy = y1 + dy * t;
    gg.grid.query(sx, sy, w, scratch);
    for (let k = 0; k < scratch.length; k++) {
      const e = scratch[k];
      if (e.dead || seen.has(e)) continue;
      seen.add(e);
      damageEnemy(e, dmg, dx / len, dy / len, kb, color);
    }
    damageProps(sx, sy, w, dmg, seen);
  }
}

function shoot(gg, x, y, a, sp, dmg, pierce, color, size) {
  const b = {
    x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: size || 4,
    dmg: dmg, pierce: pierce, life: 1.5, color: color, hit: null, bounce: 0,
    src: gg.dmgSource, srcName: gg.dmgName
  };
  gg.bullets.push(b);
  return b;
}

function chainZap(gg, first, jumps, dmg, range, color, pull) {
  let cur = first;
  const seen = [];
  let fromX = gg.p.x, fromY = gg.p.y;
  for (let j = 0; j <= jumps && cur; j++) {
    gg.zaps.push({ x1: fromX, y1: fromY, x2: cur.x, y2: cur.y, life: 0.16, color: color });
    damageEnemy(cur, dmg, 0, 0, 0, color);
    if (pull && !cur.boss) {
      const dx = gg.p.x - cur.x, dy = gg.p.y - cur.y, l = Math.hypot(dx, dy) || 1;
      cur.kx += dx / l * 260; cur.ky += dy / l * 260;
    }
    seen.push(cur);
    fromX = cur.x; fromY = cur.y;
    let best = null, bd = (range * 0.75) * (range * 0.75);
    gg.grid.query(fromX, fromY, range * 0.75, scratch);
    for (let i = 0; i < scratch.length; i++) {
      const e = scratch[i];
      if (e.dead || seen.indexOf(e) >= 0) continue;
      const d = dist2(fromX, fromY, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    cur = best;
  }
}

function launchMissile(gg, target, dmg, rad, sp, color) {
  const a = rnd(TAU);
  gg.missiles.push({
    x: gg.p.x, y: gg.p.y, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130,
    target: target, dmg: dmg, rad: rad, sp: sp, life: 4, r: 5, color: color, a: a,
    src: gg.dmgSource, srcName: gg.dmgName
  });
}

/* бумеранг: уходит по прямой, тормозит и возвращается к игроку */
function launchDisc(gg, a, dmg, reach, sp, color) {
  gg.discs.push({
    x: gg.p.x, y: gg.p.y, a: a, dmg: dmg, reach: reach, sp: sp, color: color,
    back: false, t: 0, r: 16, spin: 0, hits: new Map(),
    src: gg.dmgSource, srcName: gg.dmgName
  });
}

function explode(x, y, rad, dmg, color) {
  hitArea(g, x, y, rad, dmg, 220, null, 0, color);
  g.parts.push({ x: x, y: y, vx: 0, vy: 0, life: 0.3, max: 0.3, color: color, size: rad, ring: true });
  burst(x, y, color, 14, 3.2);
  g.shake = Math.max(g.shake, 6);
  Sfx.noise(0.22, 0.13, 700);
}

function burst(x, y, color, n, sp) {
  for (let i = 0; i < n; i++) {
    const a = rnd(TAU), s = rnd(40, 40 + sp * 60);
    g.parts.push({
      x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: rnd(0.25, 0.6), max: 0.6, color: color, size: rnd(1.5, 3.4)
    });
  }
}
function pushNum(x, y, v, color) {
  if (g.nums.length > 90) g.nums.shift();
  g.nums.push({ x: x + rnd(-7, 7), y: y, v: v, life: 0.7, color: color });
}

/* ---------- боссы: поведение ------------------------------------------ */
function eshoot(x, y, a, sp, dmg, color, r) {
  g.ebullets.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: r || 7, dmg: dmg, life: 5, color: color || "#ff2f6e" });
}
function bossRadial(gg, e, dt, period, count, sp) {
  e.tRad = (e.tRad === undefined ? period : e.tRad) - dt;
  if (e.tRad > 0) return;
  e.tRad = period;
  const off = rnd(TAU);
  for (let i = 0; i < count; i++) eshoot(e.x, e.y, off + i * TAU / count, sp, e.dmg * 0.5, "#ff5fa8");
  Sfx.blip(220, 0.2, "square", 0.08, -80);
}
function bossSpiral(gg, e, dt, period, sp) {
  e.tSpi = (e.tSpi === undefined ? period : e.tSpi) - dt;
  if (e.tSpi > 0) return;
  e.tSpi = period;
  e.spiA = (e.spiA || 0) + 0.42;
  eshoot(e.x, e.y, e.spiA, sp, e.dmg * 0.45, "#ffc23d", 6);
  eshoot(e.x, e.y, e.spiA + Math.PI, sp, e.dmg * 0.45, "#ffc23d", 6);
}
function bossCharge(gg, e, dt, period, sp) {
  e.tChg = (e.tChg === undefined ? period : e.tChg) - dt;
  if (e.tChg > 0) return;
  e.tChg = period;
  const a = Math.atan2(gg.p.y - e.y, gg.p.x - e.x);
  e.chargeT = 0.85;
  e.cvx = Math.cos(a) * sp; e.cvy = Math.sin(a) * sp;
  Sfx.blip(110, 0.4, "sawtooth", 0.12, 120);
}
function bossSummon(gg, e, dt, period, n) {
  e.tSum = (e.tSum === undefined ? period : e.tSum) - dt;
  if (e.tSum > 0) return;
  e.tSum = period;
  for (let i = 0; i < n; i++) {
    const a = rnd(TAU);
    spawnEnemy(ENEMIES[0], e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90);
  }
}

/* ---------- спавн ------------------------------------------------------ */
function difficulty() {
  const m = g.time / 60;
  const curseMul = 1 + metaLvl("curse") * 0.12;
  return {
    hp: (1 + m * 0.95 + m * m * 0.32) * curseMul,
    dmg: (1 + m * 0.32) * curseMul,
    spd: 1 + Math.min(0.45, m * 0.048),
    rate: Math.min(18, 2.6 + m * 1.6)
  };
}
function spawnEnemy(def, x, y, forceElite) {
  if (g.enemies.length >= MAX_ENEMIES) return null;
  const d = difficulty();
  const elite = forceElite || Math.random() < 0.045 + (g.p ? g.p.luck : 0);
  const e = {
    def: def, x: x, y: y, r: def.r * (elite ? 1.5 : 1), color: elite ? "#ffc23d" : def.color,
    hp: def.hp * d.hp * (elite ? 5 : 1), maxHp: def.hp * d.hp * (elite ? 5 : 1),
    spd: def.spd * d.spd, dmg: def.dmg * d.dmg, elite: elite,
    kx: 0, ky: 0, flash: 0, dead: false, ang: 0, fire: def.fire ? rnd(def.fire) : 0
  };
  g.enemies.push(e);
  return e;
}
/* точка на периметре прямоугольника чуть за краем экрана: круг радиусом
   с большую сторону оставлял углы пустыми и тормозил начало забега */
function spawnRing() {
  const w2 = innerWidth * 0.5 + 70, h2 = innerHeight * 0.5 + 70;
  const t = rnd(4 * (w2 + h2));
  let x, y;
  if (t < 2 * w2) { x = t - w2; y = -h2; }
  else if (t < 2 * w2 + 2 * h2) { x = w2; y = t - 2 * w2 - h2; }
  else if (t < 4 * w2 + 2 * h2) { x = t - 2 * w2 - 2 * h2 - w2; y = h2; }
  else { x = -w2; y = t - 4 * w2 - 2 * h2 - h2; }
  return { x: g.p.x + x, y: g.p.y + y };
}
/* случайный враг из уже открытых по времени */
function unlockedPick() {
  const pool = [];
  for (let i = 0; i < ENEMIES.length; i++) {
    const def = ENEMIES[i];
    if (g.time < def.from) continue;
    for (let k = 0; k < def.w; k++) pool.push(def);
  }
  return pick(pool);
}

function spawnBoss(def) {
  const d = difficulty();
  const pos = spawnRing();
  const hp = def.reaper ? def.hp : def.hp * (1 + g.time / 450);
  const b = {
    def: def, boss: true, x: pos.x, y: pos.y, r: def.r, color: def.color,
    hp: hp, maxHp: hp, spd: def.spd, dmg: def.reaper ? def.dmg : def.dmg * d.dmg,
    kx: 0, ky: 0, flash: 0, dead: false, ang: 0
  };
  g.enemies.push(b);
  g.boss = b;
  g.shake = def.reaper ? 34 : 16;
  Sfx.boss();
  UI.toast("⚠ " + def.name);
}

function director(dt) {
  /* Жнец пришёл — квартал пуст, добавлять больше некого */
  if (g.reaper) return;

  /* неонки подсыпаются вокруг игрока, чтобы всегда было что ломать */
  g.propT -= dt;
  if (g.propT <= 0) { g.propT = PROP.every; spawnProp(); }

  /* большая волна: сперва предупреждение с направления, потом сама толпа */
  if (g.warn) {
    g.warn.t -= dt;
    if (g.warn.t <= 0) {
      const w = g.warn;
      g.warn = null;
      const rad = Math.max(innerWidth, innerHeight) * 0.62;
      for (let i = 0; i < w.n; i++) {
        const a = w.a + rnd(-0.55, 0.55);
        const d = rad + rnd(0, 260);
        spawnEnemy(unlockedPick(), g.p.x + Math.cos(a) * d, g.p.y + Math.sin(a) * d);
      }
      g.shake = Math.max(g.shake, 14);
      Sfx.boss();
    }
  } else {
    g.waveT -= dt;
    if (g.waveT <= 0) {
      /* с боссом на экране волну придерживаем, но не дольше двух отсрочек —
         иначе неубитый босс отменял бы волны до конца забега */
      if (g.boss && g.waveHold < 2) { g.waveT = 15; g.waveHold++; }
      else {
        g.waveT = WAVE_EVERY;
        g.waveHold = 0;
        g.waveIdx++;
        const n = Math.min(120, 30 + Math.floor(g.time / 60) * 3);
        g.warn = { a: rnd(TAU), t: WAVE_WARN, n: n };
        UI.toast("⚠ БОЛЬШАЯ ВОЛНА");
        Sfx.blip(140, 0.5, "square", 0.12, -40);
      }
    }
  }

  /* сундук приходит по расписанию на спине отдельного элитника,
     а не сыплется с каждого — иначе билд закрывается к пятой минуте */
  if (g.time >= CHEST_FIRST) {
    g.chestT -= dt;
    if (g.chestT <= 0) {
      g.chestT = g.time >= CHEST_RUSH ? CHEST_FAST : CHEST_EVERY;
      const pos = spawnRing();
      const e = spawnEnemy(unlockedPick(), pos.x, pos.y, true);
      if (e) {
        g.chests++;
        e.chest = true;
        /* каждый четвёртый несёт золотой — он даёт сразу несколько апгрейдов */
        e.gold = g.chests % CHEST_GOLD_EVERY === 0;
        if (e.gold) e.r *= 1.25;
      }
    }
  }

  /* босс по расписанию */
  if (g.bossIdx < BOSSES.length && g.time >= BOSSES[g.bossIdx].t) {
    const def = BOSSES[g.bossIdx++];
    if (def.reaper) {
      /* ночь пережита: забег засчитан ещё до того, как Жнец кого-то тронет */
      g.won = true;
      g.reaper = true;
      for (let i = 0; i < g.enemies.length; i++) {
        const e = g.enemies[i];
        if (!e.dead) { burst(e.x, e.y, e.color, 5, 2); e.dead = true; }
      }
      g.ebullets.length = 0;
      g.boss = null;
      UI.toast("★ ТЫ ДОЖИЛ ДО РАССВЕТА");
      spawnBoss(def);
      return;
    }
    spawnBoss(def);
  }
  if (g.boss && g.enemies.length > MAX_ENEMIES * 0.7) return;

  const d = difficulty();
  g.spawnAcc += dt * d.rate;
  while (g.spawnAcc >= 1) {
    g.spawnAcc -= 1;
    const def = unlockedPick();
    const pos = spawnRing();
    if (def.pack) {
      for (let i = 0; i < def.pack; i++) spawnEnemy(def, pos.x + rnd(-70, 70), pos.y + rnd(-70, 70));
    } else spawnEnemy(def, pos.x, pos.y);
  }
}

/* ---------- опыт и уровни --------------------------------------------- */
function gainXp(v) {
  const p = g.p;
  p.xp += v * p.greedMul * p.xpMul;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level++;
    p.xpNext = Math.round(10 + 7 * p.level + p.level * p.level * 0.62);
    g.pendingUps++;
  }
  if (g.pendingUps > 0 && g.state === "play") openLevelUp();
}

/* набор из трёх карт */
/* выбор без повторов с учётом веса: редкие предметы попадаются реже */
function pickWeighted(pool, n) {
  const src = pool.slice(), out = [];
  while (out.length < n && src.length) {
    let total = 0;
    for (let i = 0; i < src.length; i++) total += src[i].weight;
    let r = Math.random() * total, idx = src.length - 1;
    for (let i = 0; i < src.length; i++) { r -= src[i].weight; if (r <= 0) { idx = i; break; } }
    out.push(src[idx]);
    src.splice(idx, 1);
  }
  return out;
}

function buildCards() {
  const p = g.p, out = [];
  const pool = [];
  for (let i = 0; i < p.weapons.length; i++) {
    const w = p.weapons[i], def = WEAPONS[w.id];
    if (w.lvl < def.max && g.banished.indexOf("w:" + w.base) < 0)
      pool.push({ kind: "wup", id: w.id, w: w, def: def, weight: (RARITY.w[w.base] || 60) * RARITY_OWNED });
  }
  if (p.weapons.length < MAX_WEAPONS) {
    for (const id in WEAPONS) {
      const def = WEAPONS[id];
      if (def.evolved) continue;
      if (!isUnlocked("w:" + id)) continue;
      if (g.banished.indexOf("w:" + id) >= 0) continue;
      if (p.weapons.some(w => w.base === id)) continue;   // сверяем базовый вид, не текущий
      pool.push({ kind: "wnew", id: id, def: def, weight: RARITY.w[id] || 60 });
    }
  }
  if (p.abLvl < ABILITIES[p.ability].max && g.banished.indexOf("ab") < 0)
    pool.push({ kind: "abup", id: p.ability, def: ABILITIES[p.ability], lvl: p.abLvl, weight: RARITY_ABILITY });
  const pk = Object.keys(p.passives).length;
  for (const id in PASSIVES) {
    const def = PASSIVES[id], lvl = p.passives[id] || 0;
    if (!isUnlocked("p:" + id)) continue;
    if (g.banished.indexOf("p:" + id) >= 0) continue;
    if (lvl >= def.max) continue;
    if (lvl === 0 && pk >= MAX_PASSIVES) continue;
    pool.push({
      kind: lvl ? "pup" : "pnew", id: id, def: def, lvl: lvl,
      weight: (RARITY.p[id] || 60) * (lvl ? RARITY_OWNED : 1)
    });
  }
  const picked = pickWeighted(pool, 3);
  for (let i = 0; i < picked.length && out.length < 3; i++) out.push(picked[i]);
  /* когда качать больше нечего, остаются ровно два запасных варианта */
  const spare = spareCards();
  for (let i = 0; i < spare.length && out.length < 3; i++) out.push(spare[i]);
  return out.slice(0, 3);
}

function spareCards() {
  return [
    { kind: "heal", def: { name: "Ремкомплект", ico: "heal", color: "#ff2f6e", text: "Восстановить 40 здоровья." } },
    { kind: "gold", def: { name: "Осколки", ico: "gold", color: "#ffc23d", text: "+25 осколков к добыче." } }
  ];
}
const onlySpares = cards => cards.length === 2 && cards.every(c => c.kind === "heal" || c.kind === "gold");

function openLevelUp() {
  /* выбор запомнен и предлагают только запасные карты — применяем молча */
  while (g.pendingUps > 0 && g.autoPick) {
    const cards = buildCards();
    if (!onlySpares(cards)) break;
    applyCard(cards.find(x => x.kind === g.autoPick) || cards[0]);
  }
  if (g.pendingUps <= 0) {
    if (g.state !== "end") g.state = "play";
    UI.hideCards();
    clearPressed();
    return;
  }
  g.state = "levelup";
  Sfx.lvl();
  UI.showCards(buildCards());
}

/* переброс набора карт — трата из запаса, накопленного в мастерской */
function doReroll() {
  if (g.state !== "levelup" || g.rerolls <= 0) return;
  g.rerolls--;
  Sfx.pick();
  UI.showCards(buildCards());
}

/* эволюция приходит из сундука, а не с карты: выкачанное оружие плюс
   нужный имплант на 4+ уровне превращаются в усиленную форму */
function evolveReady(p) {
  for (let i = 0; i < p.weapons.length; i++) {
    const w = p.weapons[i], def = WEAPONS[w.id];
    if (def.evoTo && w.lvl >= def.max && (p.passives[def.evoNeed] || 0) >= 4) return w;
  }
  return null;
}
function tryEvolve() {
  const p = g.p, w = evolveReady(p);
  if (!w) return false;
  const def = WEAPONS[WEAPONS[w.id].evoTo];
  w.id = WEAPONS[w.id].evoTo;
  w.lvl = 1;
  w.t = 0;
  w.hits = new Map();
  questProgress("evolve", w.base, 1);
  recalc(p);
  UI.syncRack();
  UI.toast("✦ " + def.name.toUpperCase());
  Sfx.evo();
  g.shake = Math.max(g.shake, 14);
  burst(p.x, p.y, "#ffc23d", 34, 4);
  return true;
}

function takeCard(c) {
  if (c.kind === "heal" || c.kind === "gold") g.autoPick = UI.rememberOn() ? c.kind : null;
  applyCard(c);
  openLevelUp();
}

function applyCard(c) {
  const p = g.p;
  if (c.kind === "wup") {
    c.w.lvl++;
    if (c.w.lvl >= WEAPONS[c.w.id].max) g.runMaxed++;
  }
  else if (c.kind === "wnew") { addWeapon(p, c.id); questProgress("weapon", c.id, 1); }
  else if (c.kind === "abup") { p.abLvl++; UI.syncSkill(); }
  else if (c.kind === "pup" || c.kind === "pnew") { p.passives[c.id] = (p.passives[c.id] || 0) + 1; }
  else if (c.kind === "heal") { p.hp = Math.min(p.maxHp, p.hp + 40); }
  else if (c.kind === "gold") { g.gold += 25; }
  recalc(p);
  g.pendingUps--;
  UI.syncRack();
}

/* ---------- урон по игроку -------------------------------------------- */
function hurtPlayer(dmg) {
  const p = g.p;
  if (p.inv > 0 || p.dashT > 0) return;
  const real = Math.max(1, dmg - p.armor);
  p.hp -= real;
  p.inv = 0.55;
  p.hitFlash = 0.3;
  g.shake = Math.max(g.shake, 9);
  Sfx.hurt();
  pushNum(p.x, p.y - 20, Math.round(real), "#ff2f6e");
  if (p.hp <= 0) {
    if (p.revive > 0) {
      p.revive--;
      p.hp = p.maxHp * 0.5;
      p.inv = 2.5;
      UI.toast("РЕЗЕРВНАЯ КОПИЯ");
      Sfx.win();
      /* расчистить экран, чтобы не убили мгновенно */
      hitArea(g, p.x, p.y, 300, 999, 400, null, 0, "#fff");
      g.ebullets.length = 0;
    } else {
      p.hp = 0;
      endRun(g.won);        // ночь уже пережита — Жнец не отбирает победу
    }
  }
}


/* ---------- задания на забег ------------------------------------------
   Три штуки на старте, висят до конца. Берём только то, что уже открыто,
   иначе выпадет задание на недоступное оружие.                          */
function enemyIcon(def, color) {
  const n = def.shape || 6, pts = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * TAU / n;
    pts.push((12 + Math.cos(a) * 8).toFixed(1) + "," + (12 + Math.sin(a) * 8).toFixed(1));
  }
  return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="' + color +
    '" stroke-width="1.8" stroke-linejoin="round"><polygon points="' + pts.join(" ") + '"/></svg>';
}

function makeQuests() {
  const p = g.p, pool = [];
  for (let i = 0; i < ENEMIES.length; i++) {
    const def = ENEMIES[i];
    if (def.from > RUN_LEN * 0.6) continue;          // кого не успеешь встретить — не предлагаем
    pool.push({
      kind: "kill", key: def.id, name: def.name, color: def.color, icon: enemyIcon(def, def.color),
      goal: pick(QUEST_KILL_GOALS), reward: QUEST_REWARD.kill, label: "Убей"
    });
  }
  for (const id in WEAPONS) {
    const def = WEAPONS[id];
    if (def.evolved || !isUnlocked("w:" + id)) continue;
    if (p.weapons.some(w => w.base === id)) continue;
    pool.push({
      kind: "weapon", key: id, name: def.name, color: def.color, icon: svg(ICONS[def.ico], def.color),
      goal: 1, reward: QUEST_REWARD.weapon, label: "Возьми"
    });
  }
  for (const id in WEAPONS) {
    const def = WEAPONS[id];
    if (def.evolved || !def.evoTo) continue;
    if (!isUnlocked("w:" + id) || !isUnlocked("p:" + def.evoNeed)) continue;
    const evo = WEAPONS[def.evoTo];
    pool.push({
      kind: "evolve", key: id, name: evo.name, color: "#ffc23d", icon: svg(ICONS[evo.ico], "#ffc23d"),
      goal: 1, reward: QUEST_REWARD.evolve, label: "Собери"
    });
  }
  shuffle(pool);
  /* по одному каждого вида, остальное добираем чем есть */
  const out = [];
  ["kill", "weapon", "evolve"].forEach(k => {
    const q = pool.find(x => x.kind === k && out.indexOf(x) < 0);
    if (q) out.push(q);
  });
  for (let i = 0; i < pool.length && out.length < 3; i++)
    if (out.indexOf(pool[i]) < 0) out.push(pool[i]);
  const list = out.slice(0, 3);
  list.forEach(q => { q.have = 0; q.done = false; });
  return list;
}

function questProgress(kind, key, amount) {
  for (let i = 0; i < g.quests.length; i++) {
    const q = g.quests[i];
    if (q.done || q.kind !== kind || q.key !== key) continue;
    q.have += amount || 1;
    if (q.have >= q.goal) {
      q.have = q.goal;
      q.done = true;
      g.questBonus += q.reward;
      g.gold += q.reward;
      UI.toast("✔ ЗАДАНИЕ · +" + q.reward + " ◈");
      Sfx.ultReady();
    }
  }
}

/* ---------- изгнание карты --------------------------------------------- */
function cardKey(c) {
  if (c.kind === "wup" || c.kind === "wnew") return "w:" + (c.w ? c.w.base : c.id);
  if (c.kind === "pup" || c.kind === "pnew") return "p:" + c.id;
  if (c.kind === "abup") return "ab";
  return null;
}
function canBanish(c) { return g.banishes > 0 && cardKey(c) !== null; }
function banishCard(c) {
  const key = cardKey(c);
  if (!key || g.banishes <= 0) return;
  g.banishes--;
  g.banished.push(key);
  Sfx.empty();
  UI.toast("ИЗГНАНО: " + c.def.name.toUpperCase());
  UI.showCards(buildCards());
}

/* ---------- открытия --------------------------------------------------
   Считаем от накопленной статистики плюс текущий забег: открытие прилетает
   сразу в бою. В endRun забег сперва вливается в totals, а счётчики
   обнуляются — поэтому двойного счёта не происходит.                     */
function unlockStats() {
  const t = save.total;
  return {
    kills: t.kills + g.kills,
    props: t.props + g.runProps,
    chests: t.chests + g.runChests,
    bosses: t.bosses + g.runBosses,
    maxed: t.maxed + g.runMaxed,
    shards: save.shards,
    time: Math.max(save.best, g.time),
    level: Math.max(save.bestLevel || 0, g.p ? g.p.level : 0)
  };
}
function checkUnlocks() {
  const s = unlockStats();
  let opened = 0;
  for (let i = 0; i < UNLOCKS.length; i++) {
    const u = UNLOCKS[i];
    if (isUnlocked(u.id) || u.cur(s) < u.goal) continue;
    save.unlocked.push(u.id);
    opened++;
    UI.toast("★ ОТКРЫТО: " + u.name.toUpperCase());
    Sfx.evo();
  }
  if (opened) writeSave();
  return opened;
}

/* ---------- конец забега ---------------------------------------------- */
function endRun(won) {
  if (g.state === "end") return;
  g.state = "end";
  const p = g.p;
  const mins = g.time / 60;
  const base = g.gold + Math.floor(g.kills * 0.35) + Math.floor(mins * 12) + p.level * 3 + g.bonus;
  const total = Math.max(1, Math.round(base * p.greedMul * (won ? 1.5 : 1)));
  save.shards += total;
  if (g.time > save.best) save.best = g.time;
  if (g.kills > save.bestKills) save.bestKills = g.kills;
  if (p.level > (save.bestLevel || 0)) save.bestLevel = p.level;
  if (won) save.wins++;
  /* забег вливается в общую статистику, счётчики обнуляются */
  const t = save.total;
  t.kills += g.kills; t.props += g.runProps; t.chests += g.runChests;
  t.bosses += g.runBosses; t.maxed += g.runMaxed;
  g.runProps = g.runChests = g.runBosses = g.runMaxed = 0;
  writeSave();
  checkUnlocks();
  if (won) Sfx.win(); else Sfx.die();
  UI.showEnd(won, {
    time: g.time, kills: g.kills, level: p.level, gold: g.gold,
    bonus: g.bonus, quests: g.questBonus, mins: mins, total: total, greed: p.greedMul
  });
}

/* ---------- главный апдейт -------------------------------------------- */
function update(dt) {
  const p = g.p;
  g.time += dt;
  if (g.shake > 0) g.shake = Math.max(0, g.shake - dt * 42);

  /* --- игрок --- */
  const ax = axis();
  if (p.dashT > 0) {
    p.dashT -= dt;
    p.x += p.dvx * dt; p.y += p.dvy * dt;
    vacuumGems(p.x, p.y, 250);          // прошёл сквозь толпу — забрал их опыт
  } else {
    /* скорость догоняет ввод, а не прыгает следом за ним: клавиш по-прежнему
       четыре, но вектор между ними проходит все промежуточные углы, поэтому
       повороты идут дугой, а не восемью фиксированными направлениями */
    const sp = p.speed * (1 + p.rush);
    const moving = ax.x !== 0 || ax.y !== 0;
    const k = 1 - Math.exp(-(moving ? ACCEL_RATE : BRAKE_RATE) * dt);
    p.vx += (ax.x * sp - p.vx) * k;
    p.vy += (ax.y * sp - p.vy) * k;
    if (Math.abs(p.vx) < 1.5) p.vx = 0;
    if (Math.abs(p.vy) < 1.5) p.vy = 0;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.dashCd > 0) p.dashCd -= dt;
    if ((tookKey(" ") || tookKey("shift")) && p.dashCd <= 0) {
      p.dashT = 0.17; p.dashCd = p.dashCdMax;
      const a = (p.vx || p.vy) ? Math.atan2(p.vy, p.vx) : p.face;
      p.dvx = Math.cos(a) * 1180; p.dvy = Math.sin(a) * 1180;
      Sfx.dash();
      for (let i = 0; i < 10; i++) g.parts.push({ x: p.x, y: p.y, vx: rnd(-60, 60), vy: rnd(-60, 60), life: 0.3, max: 0.3, color: "#3ee8ff", size: rnd(1, 3) });
    }
  }
  /* нос доворачивается к фактическому движению с конечной скоростью —
     иначе оружие, которое бьёт «по ходу», щёлкало бы по тем же восьми углам */
  if (p.vx || p.vy) {
    const want = Math.atan2(p.vy, p.vx);
    let d = want - p.face;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    p.face += clamp(d, -TURN_RATE * dt, TURN_RATE * dt);
  }

  /* активная способность: ЛКМ (или Q) в сторону курсора. Кнопку можно
     держать — уйдёт сама, как только откатится. */
  const ab = ABILITIES[p.ability];
  const cdSec = abCdSec(p);
  if (p.abCharge < AB_CHARGES) p.abCharge = Math.min(AB_CHARGES, p.abCharge + dt / cdSec);
  const wx = g.cam.x - VW / 2 + mouse.x, wy = g.cam.y - VH / 2 + mouse.y;
  /* пауза между кастами: иначе три заряда уходят в один кадр, и вместо
     быстрой очереди получается один невидимый залп */
  if (p.abGap > 0) p.abGap -= dt;
  if (p.abGap > 0) { /* ждём */ }
  /* ПКМ тратит все три заряда на усиленную версию навыка */
  else if (p.abCharge >= AB_CHARGES && (mouse.right || tookKey("e") || tookKey("у"))) {
    p.abCharge = 0;
    p.abRefund = 0;                          // ульта зарядом не возвращается
    p.abGap = AB_GAP;
    setSrc("ab:" + p.ability + ":ult", ab.name + " · ульта");
    ab.ult.cast(g, wx, wy, p.abLvl);
    setSrc(null, "");
    UI.toast("✦ " + ab.ult.short);
  } else if (p.abCharge >= 1 && (mouse.down || keys.q || keys["й"])) {
    p.abCharge -= 1;
    p.abRefund = REFUND_SHARE;               // бюджет возврата в долях заряда
    p.abGap = AB_GAP;
    setSrc("ab:" + p.ability, ab.name);
    ab.cast(g, wx, wy, p.abLvl);
    setSrc(null, "");
  } else if (p.abCharge < 1 && (mouse.down || keys.q || keys["й"]) && p.dimCd <= 0) {
    /* жмёшь, а зарядов нет — иконка тускнеет, чтобы было понятно почему */
    p.dimT = DIM_TIME;
    p.dimCd = DIM_GAP;
    Sfx.empty();
  }
  if (p.rushT > 0) p.rushT -= dt;                       // секунду держим на полную
  else if (p.rush > 0) p.rush = Math.max(0, p.rush - RUSH_FADE * dt);
  if (p.rush > 0) {
    if (p.rush > 0.04 && (ax.x || ax.y) && Math.random() < 0.5)
      g.parts.push({
        x: p.x - ax.x * 15, y: p.y - ax.y * 15, vx: -ax.x * 95, vy: -ax.y * 95,
        life: 0.24, max: 0.24, color: "#b6ff3d", size: rnd(1.4, 3)
      });
  }
  if (p.inv > 0) p.inv -= dt;
  if (p.hitFlash > 0) p.hitFlash -= dt;
  if (p.regen) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

  /* камера с лёгким запаздыванием */
  g.cam.x = lerp(g.cam.x, p.x, 1 - Math.pow(0.0015, dt));
  g.cam.y = lerp(g.cam.y, p.y, 1 - Math.pow(0.0015, dt));

  /* --- сетка для быстрых запросов --- */
  g.grid.clear();
  for (let i = 0; i < g.enemies.length; i++) if (!g.enemies[i].dead) g.grid.add(g.enemies[i]);
  g.pgrid.clear();
  for (let i = 0; i < g.props.length; i++) {
    const pr = g.props[i];
    if (pr.flash > 0) pr.flash -= dt;
    if (Math.abs(pr.x - p.x) > PROP.cull || Math.abs(pr.y - p.y) > PROP.cull) { pr.dead = true; continue; }
    g.pgrid.add(pr);
  }

  director(dt);

  /* --- оружие --- */
  for (let i = 0; i < p.weapons.length; i++) {
    const w = p.weapons[i];
    setSrc("w:" + w.base, WEAPONS[w.id].name);
    WEAPONS[w.id].tick(g, w, dt);
  }
  setSrc(null, "");

  /* --- враги --- */
  const despawn = Math.max(innerWidth, innerHeight) * 1.6;
  for (let i = 0; i < g.enemies.length; i++) {
    const e = g.enemies[i];
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt;
    const dx = p.x - e.x, dy = p.y - e.y;
    const len = Math.hypot(dx, dy) || 1;
    e.ang = Math.atan2(dy, dx);

    if (e.boss) {
      e.def.ai(g, e, dt);
      if (e.chargeT > 0) {
        e.chargeT -= dt;
        e.x += e.cvx * dt; e.y += e.cvy * dt;
      } else {
        e.x += dx / len * e.spd * dt;
        e.y += dy / len * e.spd * dt;
      }
    } else {
      let sx = dx / len, sy = dy / len;
      if (e.def.ranged) {
        /* держит дистанцию и плюётся */
        if (len < e.def.ranged * 0.8) { sx = -sx; sy = -sy; }
        else if (len < e.def.ranged) { const t = sx; sx = -sy; sy = t; }
        e.fire -= dt;
        if (e.fire <= 0 && len < e.def.ranged * 1.4) {
          e.fire = e.def.fire;
          eshoot(e.x, e.y, Math.atan2(dy, dx), 230, e.dmg, "#ff5fa8", 6);
        }
      }
      e.x += sx * e.spd * dt;
      e.y += sy * e.spd * dt;
      /* расталкивание, чтобы толпа не схлопывалась в точку */
      if (!e.def.phase) {
        g.grid.neighbours(e, scratch);
        for (let k = 0; k < scratch.length; k++) {
          const o = scratch[k];
          if (o === e || o.dead || o.boss) continue;
          const ox = e.x - o.x, oy = e.y - o.y;
          const dd = ox * ox + oy * oy, need = (e.r + o.r) * 0.82;
          if (dd > 0.01 && dd < need * need) {
            const l = Math.sqrt(dd);
            const push = (need - l) / l * 0.5;
            e.x += ox * push; e.y += oy * push;
          }
        }
      }
      /* слишком далеко — переставляем к другому краю, чтобы не терять волну */
      if (Math.abs(e.x - p.x) > despawn || Math.abs(e.y - p.y) > despawn) {
        const pos = spawnRing();
        e.x = pos.x; e.y = pos.y;
      }
    }
    /* отдача от попаданий */
    if (e.kx || e.ky) {
      e.x += e.kx * dt; e.y += e.ky * dt;
      const damp = Math.pow(0.0008, dt);
      e.kx *= damp; e.ky *= damp;
      if (Math.abs(e.kx) < 2) e.kx = 0;
      if (Math.abs(e.ky) < 2) e.ky = 0;
    }
    /* контактный урон */
    const rr = e.r + p.r;
    if (dist2(e.x, e.y, p.x, p.y) < rr * rr) hurtPlayer(e.dmg);
  }

  /* --- снаряды игрока --- */
  for (let i = 0; i < g.bullets.length; i++) {
    const b = g.bullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0) { b.dead = true; continue; }
    /* рикошет: отражаем от краёв видимой области, пока есть отскоки */
    if (b.bounce > 0) {
      const l = g.cam.x - VW / 2 + 12, r = g.cam.x + VW / 2 - 12;
      const t = g.cam.y - VH / 2 + 12, bo = g.cam.y + VH / 2 - 12;
      let hitEdge = false;
      if (b.x < l && b.vx < 0) { b.x = l; b.vx = -b.vx; hitEdge = true; }
      else if (b.x > r && b.vx > 0) { b.x = r; b.vx = -b.vx; hitEdge = true; }
      if (b.y < t && b.vy < 0) { b.y = t; b.vy = -b.vy; hitEdge = true; }
      else if (b.y > bo && b.vy > 0) { b.y = bo; b.vy = -b.vy; hitEdge = true; }
      if (hitEdge) { b.bounce--; b.hit = null; burst(b.x, b.y, b.color, 4, 1.6); }
    }
    setSrc(b.src, b.srcName);
    g.grid.query(b.x, b.y, b.r + 4, scratch);
    for (let k = 0; k < scratch.length; k++) {
      const e = scratch[k];
      if (e.dead || e === b.hit) continue;
      const l = Math.hypot(b.vx, b.vy) || 1;
      damageEnemy(e, b.dmg, b.vx / l, b.vy / l, 60, b.color);
      b.hit = e;
      if (--b.pierce <= 0) { b.dead = true; break; }
    }
    if (!b.dead) damageProps(b.x, b.y, b.r + 6, b.dmg);
    setSrc(null, "");
  }
  /* --- снаряды врагов --- */
  for (let i = 0; i < g.ebullets.length; i++) {
    const b = g.ebullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0) { b.dead = true; continue; }
    const rr = b.r + p.r;
    if (dist2(b.x, b.y, p.x, p.y) < rr * rr) { hurtPlayer(b.dmg); b.dead = true; }
  }
  /* --- ракеты --- */
  for (let i = 0; i < g.missiles.length; i++) {
    const m = g.missiles[i];
    m.life -= dt;
    setSrc(m.src, m.srcName);
    if (m.life <= 0) { m.dead = true; explode(m.x, m.y, m.rad, m.dmg, m.color); setSrc(null, ""); continue; }
    if (!m.target || m.target.dead) m.target = nearestEnemy(g, m.x, m.y, 900);
    if (m.target) {
      const want = Math.atan2(m.target.y - m.y, m.target.x - m.x);
      let d = want - m.a;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      m.a += clamp(d, -7 * dt, 7 * dt);
    }
    m.vx = Math.cos(m.a) * m.sp; m.vy = Math.sin(m.a) * m.sp;
    m.x += m.vx * dt; m.y += m.vy * dt;
    if (Math.random() < 0.6) g.parts.push({ x: m.x, y: m.y, vx: rnd(-16, 16), vy: rnd(-16, 16), life: 0.25, max: 0.25, color: m.color, size: rnd(1, 2.4) });
    if (m.target && !m.target.dead) {
      const rr = m.r + m.target.r;
      if (dist2(m.x, m.y, m.target.x, m.target.y) < rr * rr) { m.dead = true; explode(m.x, m.y, m.rad, m.dmg, m.color); }
    }
    setSrc(null, "");
  }
  /* --- мины --- */
  for (let i = 0; i < g.mines.length; i++) {
    const m = g.mines[i];
    m.life -= dt;
    if (m.arm > 0) { m.arm -= dt; continue; }
    setSrc(m.src, m.srcName);
    if (m.life <= 0) { m.dead = true; explode(m.x, m.y, m.rad, m.dmg, m.color); setSrc(null, ""); continue; }
    g.grid.query(m.x, m.y, m.r + 12, scratch);
    if (scratch.length) { m.dead = true; explode(m.x, m.y, m.rad, m.dmg, m.color); }
    setSrc(null, "");
  }
  /* --- диски-бумеранги --- */
  for (let i = 0; i < g.discs.length; i++) {
    const d = g.discs[i];
    setSrc(d.src, d.srcName);
    d.spin += dt * 16;
    if (!d.back) {
      /* на пути «туда» диск мягко доворачивает к ближайшему: без этого
         веер из двух-трёх дисков пролетает мимо одиночной цели */
      const tgt = nearestEnemy(g, d.x, d.y, 420);
      if (tgt) {
        const want = Math.atan2(tgt.y - d.y, tgt.x - d.x);
        let diff = want - d.a;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        d.a += clamp(diff, -2.6 * dt, 2.6 * dt);
      }
      d.x += Math.cos(d.a) * d.sp * dt;
      d.y += Math.sin(d.a) * d.sp * dt;
      d.t += d.sp * dt;
      if (d.t >= d.reach) d.back = true;
    } else {
      /* домой летит уже к текущей позиции игрока, а не к точке запуска */
      const dx = p.x - d.x, dy = p.y - d.y, l = Math.hypot(dx, dy) || 1;
      d.x += dx / l * d.sp * 1.25 * dt;
      d.y += dy / l * d.sp * 1.25 * dt;
      if (l < 22) d.dead = true;
    }
    if (d.hits.size > 200) d.hits.clear();
    hitArea(g, d.x, d.y, d.r * p.areaMul, d.dmg, 70, d.hits, 0.4, d.color);
    damageProps(d.x, d.y, d.r, d.dmg);
    setSrc(null, "");
  }
  /* --- кислотные лужи --- */
  for (let i = 0; i < g.pools.length; i++) {
    const pl = g.pools[i];
    pl.life -= dt;
    pl.t -= dt;
    if (pl.life <= 0) { pl.dead = true; continue; }
    if (pl.t <= 0) {
      pl.t = pl.tick;
      setSrc(pl.src, pl.srcName);
      hitArea(g, pl.x, pl.y, pl.r, pl.dmg, 0, null, 0, pl.color);
      setSrc(null, "");
    }
  }

  /* --- гравитационные колодцы --- */
  for (let i = 0; i < g.wells.length; i++) {
    const wl = g.wells[i];
    wl.life -= dt;
    wl.t -= dt;
    setSrc(wl.src, wl.srcName);
    if (wl.life <= 0) {
      wl.dead = true;
      explode(wl.x, wl.y, wl.r * 1.15, wl.blast * crowdMul(wl.crowd || 0), wl.color);
      setSrc(null, "");
      continue;
    }
    g.grid.query(wl.x, wl.y, wl.r, scratch);
    let crowd = 0;
    for (let k = 0; k < scratch.length; k++) {
      const e = scratch[k];
      if (e.dead) continue;
      crowd++;                                  // босс в счёт идёт, но с места его не сдвинуть
      if (e.boss) continue;
      const dx = wl.x - e.x, dy = wl.y - e.y, l = Math.hypot(dx, dy) || 1;
      e.x += dx / l * 170 * dt;
      e.y += dy / l * 170 * dt;
    }
    wl.crowd = crowd;
    if (wl.t <= 0) {
      wl.t = 0.25;
      hitArea(g, wl.x, wl.y, wl.r, wl.dmg * crowdMul(crowd), 0, null, 0, wl.color);
    }
    setSrc(null, "");
  }
  /* --- следы лучей --- */
  for (let i = 0; i < g.beams.length; i++) {
    const b = g.beams[i];
    b.life -= dt;
    if (b.life <= 0) b.dead = true;
  }

  /* --- кристаллы опыта --- */
  const pr = p.pickR, pr2 = pr * pr;
  for (let i = 0; i < g.gems.length; i++) {
    const q = g.gems[i];
    q.t += dt;
    const d = dist2(q.x, q.y, p.x, p.y);
    if (d < pr2 || q.magnet) {
      const dx = p.x - q.x, dy = p.y - q.y, l = Math.hypot(dx, dy) || 1;
      /* по магниту тянем тем быстрее, чем дальше лежит — иначе дальний
         край карты собирался бы полминуты */
      const pull = q.magnet ? Math.max(1200, l * 1.8) : 240 + (1 - clamp(l / pr, 0, 1)) * 620;
      q.x += dx / l * pull * dt; q.y += dy / l * pull * dt;
      if (l < 20) { q.dead = true; gainXp(q.v); if (Math.random() < 0.25) Sfx.pick(); }
    }
  }
  /* --- прочая добыча --- */
  for (let i = 0; i < g.drops.length; i++) {
    const d = g.drops[i];
    const dd = dist2(d.x, d.y, p.x, p.y);
    if (dd < pr2 || d.magnet) {
      const dx = p.x - d.x, dy = p.y - d.y, l = Math.hypot(dx, dy) || 1;
      const sp = d.magnet ? Math.max(1200, l * 1.8) : 420;
      d.x += dx / l * sp * dt; d.y += dy / l * sp * dt;
      if (l < 24) {
        d.dead = true;
        if (d.type === "gold") { g.gold += d.v; Sfx.coin(); }
        else if (d.type === "magnet") { pullEverything(); Sfx.evo(); UI.toast("МАГНИТ"); }
        else if (d.type === "heal") { p.hp = Math.min(p.maxHp, p.hp + d.v); Sfx.pick(); UI.toast("+" + d.v + " HP"); }
        else if (d.type === "chest") {
          const golden = !!d.gold;
          g.gold += golden ? 30 : 12;
          g.runChests++;
          /* сундук сперва пытается эволюционировать оружие; золотой сверх
             того сыплет апгрейдами, обычный — ровно одним */
          const evolved = tryEvolve();
          const ups = golden ? (evolved ? 2 : 3) : (evolved ? 0 : 1);
          if (ups > 0) {
            g.pendingUps += ups;
            UI.toast(golden ? "★ ЗОЛОТОЙ СУНДУК" : "СУНДУК");
            if (g.state === "play") openLevelUp();
          }
        }
      }
    }
  }
  /* --- визуал --- */
  for (let i = 0; i < g.parts.length; i++) {
    const q = g.parts[i];
    q.life -= dt;
    if (q.life <= 0) { q.dead = true; continue; }
    if (!q.ring) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.94; q.vy *= 0.94; }
  }
  for (let i = 0; i < g.nums.length; i++) { const n = g.nums[i]; n.life -= dt; n.y -= 34 * dt; if (n.life <= 0) n.dead = true; }
  for (let i = 0; i < g.slashes.length; i++) { const s = g.slashes[i]; s.life -= dt; if (s.life <= 0) s.dead = true; }
  for (let i = 0; i < g.zaps.length; i++) { const z = g.zaps[i]; z.life -= dt; if (z.life <= 0) z.dead = true; }

  /* короткий блик на иконке героя, когда накопился заряд навыка или
     откатился рывок — сверяем с прошлым кадром, поэтому ловится и возврат
     заряда за убийства, а не только обычное накопление */
  if (p.readyT > 0) p.readyT -= dt;
  if (p.dimT > 0) p.dimT -= dt;
  if (p.dimCd > 0) p.dimCd -= dt;
  const nowCharges = Math.floor(p.abCharge);
  if (nowCharges > p.chargeSeen) {
    if (nowCharges >= AB_CHARGES) {
      /* ульта готова — вспышка заметно ярче и длиннее обычного заряда */
      p.readyT = p.readyMax = FLASH_ULT;
      p.readyPow = 1.8;
      p.readyColor = "#ffc23d";
      Sfx.ultReady();
    } else {
      p.readyT = p.readyMax = FLASH_TIME;
      p.readyPow = 1;
      p.readyColor = ABILITIES[p.ability].color;
      Sfx.ready();
    }
  }
  p.chargeSeen = nowCharges;
  const dashBusy = p.dashCd > 0;
  if (!dashBusy && p.dashSeen) {
    p.readyT = p.readyMax = FLASH_TIME;
    p.readyPow = 0.85;
    p.readyColor = "#3ee8ff";
    Sfx.ready();
  }
  p.dashSeen = dashBusy;

  g.unlockT -= dt;
  if (g.unlockT <= 0) { g.unlockT = 1; checkUnlocks(); }

  compact();
}

const LISTS = ["enemies", "bullets", "ebullets", "gems", "drops", "mines", "missiles", "parts", "nums", "slashes", "zaps", "beams", "wells", "props", "pools", "discs"];
function compact() {
  for (let i = 0; i < LISTS.length; i++) {
    const key = LISTS[i], arr = g[key];
    let n = 0;
    for (let k = 0; k < arr.length; k++) if (!arr[k].dead) arr[n++] = arr[k];
    arr.length = n;
  }
}
