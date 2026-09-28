/* ---------- 3. контент: оружие, навыки, враги, мастерская -------------- */

/* иконки — инлайновый SVG, никаких картинок */
function svg(inner, color) {
  return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="' + (color || "#3ee8ff") +
    '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
}
const ICONS = {
  blade: '<path d="M4 20 L16 8 L20 4 L18 10 L8 20 Z"/><path d="M4 20 l3 0"/>',
  orbit: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="3.5" r="1.8"/><circle cx="20.5" cy="12" r="1.8"/><circle cx="12" cy="20.5" r="1.8"/>',
  shotgun: '<path d="M3 12 h8"/><path d="M12 5 l8 3"/><path d="M12 12 h9"/><path d="M12 19 l8 -3"/>',
  chain: '<path d="M13 2 L5 13 h6 l-2 9 L19 10 h-6 z"/>',
  mines: '<circle cx="12" cy="14" r="5"/><path d="M12 4 v3 M4 9 l2.5 2 M20 9 l-2.5 2 M12 24 v-1"/>',
  aura: '<circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="12" r="6.5" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="10" stroke-dasharray="2 4"/>',
  missile: '<path d="M12 2 c3 4 4 8 4 12 l-4 4 l-4 -4 c0 -4 1 -8 4 -12z"/><path d="M8 14 l-3 4 M16 14 l3 4"/>',
  power: '<path d="M12 3 l7 4 v6 c0 4 -3 7 -7 8 c-4 -1 -7 -4 -7 -8 V7z"/><path d="M9 12 l2 2 l4 -4"/>',
  haste: '<path d="M4 8 h9 M4 12 h6 M4 16 h9"/><path d="M15 5 l5 7 l-5 7"/>',
  area: '<circle cx="12" cy="12" r="8" stroke-dasharray="4 3"/><path d="M12 8 v8 M8 12 h8"/>',
  boots: '<path d="M7 4 v9 l-2 4 v3 h9 v-3 l3 -3 v-4 l-4 -6z"/>',
  magnet: '<path d="M6 5 v8 a6 6 0 0 0 12 0 V5 h-4 v8 a2 2 0 0 1 -4 0 V5z"/>',
  heart: '<path d="M12 20 C6 15 3 12 3 8.5 A4.5 4.5 0 0 1 12 6 a4.5 4.5 0 0 1 9 2.5 C21 12 18 15 12 20z"/>',
  armor: '<path d="M12 3 l8 3 v7 c0 4 -4 7 -8 8 c-4 -1 -8 -4 -8 -8 V6z"/>',
  greed: '<circle cx="12" cy="12" r="8"/><path d="M12 8 v8 M9.5 10 h4 a1.6 1.6 0 0 1 0 3 h-3 a1.6 1.6 0 0 0 0 3 h4"/>',
  heal: '<path d="M12 5 v14 M5 12 h14"/>',
  gold: '<circle cx="12" cy="12" r="7"/><path d="M12 6 l1.8 4 h4.2 l-3.4 2.6 1.3 4.4 L12 14.4 8.1 17 l1.3 -4.4 L6 10h4.2z"/>',
  phantom: '<path d="M4 20 L20 4"/><path d="M20 4 l-6.5 .6 M20 4 l-.6 6.5"/><path d="M4 13 h4 M4 16.5 h6.5"/>',
  railgun: '<path d="M2 12 h13"/><circle cx="19" cy="12" r="2.6"/><path d="M6 8 v8 M10 9.5 v5"/>',
  singularity: '<circle cx="12" cy="12" r="2.6"/><path d="M12 3.5 a8.5 8.5 0 0 1 8 5.8"/><path d="M12 20.5 a8.5 8.5 0 0 1 -8 -5.8"/><circle cx="12" cy="12" r="6.6" stroke-dasharray="3 4"/>',
  dup: '<path d="M4 8 h9 v9 h-9z"/><path d="M8 5 h9 v9"/>',
  dura: '<circle cx="12" cy="12" r="8"/><path d="M12 7 v5 l3.5 2.5"/>',
  luck: '<path d="M12 3 l2.5 5.6 L20.5 9 l-4.4 4 1.2 6-5.3-3-5.3 3 1.2-6L3.5 9l6-.4z"/>',
  growth: '<path d="M4 19 L10 11 l4 4 L20 5"/><path d="M20 10 V5 h-5"/>',
  flechette: '<path d="M3 21 L21 3"/><path d="M21 3 l-5 .8 M21 3 l-.8 5"/><path d="M6 14 l4 4 M10 10 l4 4"/>',
  disc: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.2"/><path d="M12 4.5 v3 M12 16.5 v3 M4.5 12 h3 M16.5 12 h3"/>',
  acid: '<path d="M12 3 c3.5 5 6 8 6 10.5 a6 6 0 0 1 -12 0 C6 11 8.5 8 12 3z"/><path d="M9.5 13.5 a2.5 2.5 0 0 0 2.5 2.5"/>',
  ricochet: '<path d="M3 6 L10 13 L4 19"/><path d="M21 6 L14 13 L20 19"/><circle cx="12" cy="4" r="1.6"/>'
};

/* --- активная способность: выбирается перед забегом, бьёт по ЛКМ --------
   Откат считается вместе с общим множителем отката, поэтому «Криоконтур»
   разгоняет и её тоже. Урон масштабируется от множителей игрока, чтобы
   способность не выдыхалась к пятнадцатой минуте.                        */
const ABILITIES = {
  phantom: {
    id: "phantom", name: "Фантом", role: "Клинок", ico: "phantom", color: "#3ee8ff", max: 5,
    text: "Мгновенный рывок к курсору сквозь строй. В полёте ты неуязвим и рассекаешь всех на пути.",
    hint: "Побег из окружения и разрез толпы одним движением.",
    s: l => ({ dmg: 48 + 15 * l, cd: 3.6 - 0.25 * l, reach: 340 + 20 * l }),
    up: l => "+15 урона, −0.25 с отката, +20 дальности",
    cast(g, tx, ty, lvl) {
      const p = g.p, st = this.s(lvl);
      const a = Math.atan2(ty - p.y, tx - p.x);
      const reach = Math.min(st.reach, Math.hypot(tx - p.x, ty - p.y) + 110);
      const x2 = p.x + Math.cos(a) * reach, y2 = p.y + Math.sin(a) * reach;
      lineHit(g, p.x, p.y, x2, y2, 60 * p.areaMul, st.dmg * p.dmgMul, 300, this.color);
      g.beams.push({ x1: p.x, y1: p.y, x2: x2, y2: y2, w: 30, life: 0.32, max: 0.32, color: this.color });
      /* опыт убитых по дороге летит к тебе — собираем вдоль всей линии */
      for (let i = 0; i <= 4; i++)
        vacuumGems(p.x + (x2 - p.x) * i / 4, p.y + (y2 - p.y) * i / 4, 190);
      p.x = x2; p.y = y2; p.face = a;
      p.inv = Math.max(p.inv, 0.45);
      burst(x2, y2, this.color, 20, 3.2);
      g.shake = Math.max(g.shake, 7);
      Sfx.dash(); Sfx.slash();
    },
    ult: {
      name: "Фантомный рой", short: "РОЙ",
      text: "Пять рывков подряд по ближайшим целям, без пауз и без права тебя тронуть.",
      cast(g, tx, ty, lvl) {
        const p = g.p, st = ABILITIES.phantom.s(lvl);
        p.inv = Math.max(p.inv, 0.9);
        let ax = tx, ay = ty;
        for (let hop = 0; hop < 5; hop++) {
          const e = hop === 0 ? null : nearestEnemy(g, p.x, p.y, 900);
          if (e) { ax = e.x; ay = e.y; }
          const a = Math.atan2(ay - p.y, ax - p.x);
          const reach = Math.min(st.reach, Math.hypot(ax - p.x, ay - p.y) + 130);
          const x2 = p.x + Math.cos(a) * reach, y2 = p.y + Math.sin(a) * reach;
          lineHit(g, p.x, p.y, x2, y2, 78 * p.areaMul, st.dmg * p.dmgMul, 340, "#ffc23d");
          g.beams.push({ x1: p.x, y1: p.y, x2: x2, y2: y2, w: 38, life: 0.5, max: 0.5, color: "#ffc23d" });
          for (let i = 0; i <= 4; i++)
            vacuumGems(p.x + (x2 - p.x) * i / 4, p.y + (y2 - p.y) * i / 4, 230);
          p.x = x2; p.y = y2; p.face = a;
          burst(x2, y2, "#ffc23d", 16, 3.4);
        }
        g.shake = Math.max(g.shake, 20);
        Sfx.evo();
      }
    }
  },
  railgun: {
    id: "railgun", name: "Рейлган", role: "Стрелок", ico: "railgun", color: "#ffc23d", max: 5,
    text: "Пробойный луч через весь экран в сторону курсора. Прошивает всё подряд, не теряя силы.",
    hint: "Снимает элиту и подрезает боссу здоровье на дистанции.",
    s: l => ({ dmg: 105 + 35 * l, cd: 4.2 - 0.3 * l, w: 26 + 4 * l }),
    up: l => "+35 урона, −0.3 с отката, +4 к ширине луча",
    cast(g, tx, ty, lvl) {
      const p = g.p, st = this.s(lvl);
      const a = Math.atan2(ty - p.y, tx - p.x);
      const len = 1000 * p.areaMul;
      const x2 = p.x + Math.cos(a) * len, y2 = p.y + Math.sin(a) * len;
      lineHit(g, p.x, p.y, x2, y2, st.w * p.areaMul, st.dmg * p.dmgMul, 220, this.color);
      g.beams.push({ x1: p.x, y1: p.y, x2: x2, y2: y2, w: st.w * 0.8, life: 0.45, max: 0.45, color: this.color });
      p.face = a;
      g.shake = Math.max(g.shake, 13);
      Sfx.noise(0.3, 0.15, 3200);
      Sfx.blip(190, 0.34, "sawtooth", 0.12, -130);
    },
    ult: {
      name: "Веерный залп", short: "ЗАЛП",
      text: "Пять лучей веером вместо одного, каждый шире и злее обычного.",
      cast(g, tx, ty, lvl) {
        const p = g.p, st = ABILITIES.railgun.s(lvl);
        const base = Math.atan2(ty - p.y, tx - p.x);
        const len = 1100 * p.areaMul;
        for (let i = 0; i < 5; i++) {
          const a = base + (i / 4 - 0.5) * 1.1;
          const x2 = p.x + Math.cos(a) * len, y2 = p.y + Math.sin(a) * len;
          lineHit(g, p.x, p.y, x2, y2, st.w * 1.25 * p.areaMul, st.dmg * 0.85 * p.dmgMul, 260, "#ffc23d");
          g.beams.push({ x1: p.x, y1: p.y, x2: x2, y2: y2, w: st.w * 1.2, life: 0.6, max: 0.6, color: "#ffc23d" });
        }
        p.face = base;
        g.shake = Math.max(g.shake, 26);
        Sfx.noise(0.5, 0.2, 3400);
        Sfx.evo();
      }
    }
  },
  singularity: {
    id: "singularity", name: "Сингулярность", role: "Оператор поля", ico: "singularity", color: "#a86bff", max: 5,
    text: "Гравитационный колодец в точке курсора: стягивает толпу, жжёт её и в конце схлопывается взрывом. Бьёт тем больнее, чем больше врагов внутри — +5% за каждого, до +120%.",
    hint: "Чем гуще толпа, тем выгоднее воронка.",
    s: l => ({ dmg: 7 + 2.5 * l, blast: 45 + 15 * l, r: 120 + 10 * l, cd: 3.3 - 0.2 * l, life: 1 }),
    up: l => "+2.5 урона за тик, +15 к взрыву, +10 радиуса, −0.2 с отката",
    cast(g, tx, ty, lvl) {
      const p = g.p, st = this.s(lvl);
      const dx = tx - p.x, dy = ty - p.y;
      const d = Math.hypot(dx, dy) || 1, max = 470;
      const x = d > max ? p.x + dx / d * max : tx;
      const y = d > max ? p.y + dy / d * max : ty;
      g.wells.push({
        x: x, y: y, r: st.r * p.areaMul, life: st.life * p.durMul, max: st.life * p.durMul, t: 0,
        dmg: st.dmg * p.dmgMul, blast: st.blast * p.dmgMul, color: this.color,
        src: g.dmgSource, srcName: g.dmgName
      });
      Sfx.blip(90, 0.7, "sine", 0.15, 200);
    },
    ult: {
      name: "Коллапс", short: "КОЛЛАПС",
      text: "Воронка вдвое шире, держится вдвое дольше и схлопывается втрое сильнее.",
      cast(g, tx, ty, lvl) {
        const p = g.p, st = ABILITIES.singularity.s(lvl);
        const dx = tx - p.x, dy = ty - p.y;
        const d = Math.hypot(dx, dy) || 1, max = 470;
        const x = d > max ? p.x + dx / d * max : tx;
        const y = d > max ? p.y + dy / d * max : ty;
        /* радиус, длительность и число целей перемножаются, поэтому множители
           здесь скромные — иначе ульта выходит в 30 раз сильнее обычного каста */
        const life = st.life * 1.6;
        g.wells.push({
          x: x, y: y, r: st.r * 1.45 * p.areaMul, life: life, max: life, t: 0,
          dmg: st.dmg * 1.1 * p.dmgMul, blast: st.blast * 1.8 * p.dmgMul, color: "#ffc23d",
          src: g.dmgSource, srcName: g.dmgName
        });
        g.shake = Math.max(g.shake, 18);
        Sfx.blip(60, 1.2, "sine", 0.2, 260);
        Sfx.evo();
      }
    }
  }
};
const ABILITY_LIST = ["phantom", "railgun", "singularity"];

/* --- уличные неонки: ломаются от любого урона по площади ---------------
   Таблица дропа читается сверху вниз накопительным шансом.              */
const PROP = { hp: 30, r: 14, every: 6, cap: 10, near: 300, far: 820, cull: 1700, cell: 256 };
const PROP_DROPS = [
  { kind: "none", chance: 0.55 },
  { kind: "heal", chance: 0.30, v: 15 },
  { kind: "gold", chance: 0.10, v: 2 },
  { kind: "magnet", chance: 0.05 }
];

/* --- оружие -----------------------------------------------------------
   tick(g, w, dt) вызывается каждый кадр; оружие само считает свой откат.
   Каждое поле stats зависит от уровня, все множители игрока — в g.p.     */
const WEAPONS = {
  blade: {
    name: "Плазморез", ico: "blade", max: 8, evoTo: "vortex", evoNeed: "power",
    color: "#3ee8ff",
    text: "Дуга раскалённой плазмы по ходу движения. Режет всех, кто попал в сектор.",
    up: l => "+" + (l === 2 ? "урон и дуга" : l === 4 ? "скорость взмаха" : l % 2 ? "урон" : "дальность"),
    s: l => ({ dmg: 11 + 4.5 * l, cd: 0.95 - 0.055 * l, arc: 1.5 + 0.14 * l, range: 84 + 9 * l, kb: 130 }),
    tick(g, w, dt) {
      w.t -= dt;
      if (w.t > 0) return;
      const s = this.s(w.lvl);
      w.t = s.cd * g.p.cdMul;
      const range = s.range * g.p.areaMul;
      const a = g.p.face;
      swing(g, a, s.arc, range, s.dmg * g.p.dmgMul, s.kb, this.color);
      Sfx.slash();
    }
  },
  vortex: {
    name: "Циклотрон", ico: "blade", max: 1, evolved: true, color: "#ffc23d",
    text: "Плазморез уходит вразнос: полный оборот вокруг тебя, без слепых зон.",
    s: () => ({ dmg: 52, cd: 0.5, arc: TAU, range: 168, kb: 190 }),
    tick(g, w, dt) {
      w.t -= dt;
      if (w.t > 0) return;
      const s = this.s();
      w.t = s.cd * g.p.cdMul;
      swing(g, g.p.face, s.arc, s.range * g.p.areaMul, s.dmg * g.p.dmgMul, s.kb, this.color);
      Sfx.slash();
    }
  },

  orbit: {
    name: "Дроны", ico: "orbit", max: 8, evoTo: "swarmdrones", evoNeed: "area",
    color: "#b6ff3d",
    text: "Боевые дроны висят на орбите и вскрывают всё, до чего дотянутся.",
    up: l => l % 2 ? "+урон" : "+1 дрон",
    s: l => ({ dmg: 9 + 3.2 * l, count: 2 + ((l / 2) | 0), rad: 68 + 4 * l, spin: 1.7 + 0.07 * l }),
    tick(g, w, dt) {
      const s = this.s(w.lvl);
      w.ang = (w.ang || 0) + s.spin * dt;
      if (!w.hits) w.hits = new Map();
      /* карта «когда снова бить эту цель» держит ссылки на убитых — чистим */
      if (w.hits.size > 300) w.hits.clear();
      const rad = s.rad * g.p.areaMul;
      const cnt = s.count + g.p.countBonus;
      for (let i = 0; i < cnt; i++) {
        const a = w.ang + i * TAU / cnt;
        const x = g.p.x + Math.cos(a) * rad, y = g.p.y + Math.sin(a) * rad;
        hitArea(g, x, y, 13 * g.p.areaMul, s.dmg * g.p.dmgMul, 90, w.hits, 0.45, this.color);
      }
    },
    draw(g, ctx, w) {
      const s = this.s(w.lvl), rad = s.rad * g.p.areaMul;
      const cnt = s.count + g.p.countBonus;
      for (let i = 0; i < cnt; i++) {
        const a = (w.ang || 0) + i * TAU / cnt;
        orbSprite(ctx, g.p.x + Math.cos(a) * rad, g.p.y + Math.sin(a) * rad, 7 * g.p.areaMul, this.color, a * 2);
      }
    }
  },
  swarmdrones: {
    name: "Рой", ico: "orbit", max: 1, evolved: true, color: "#ffc23d",
    text: "Восемь дронов на широкой орбите. Подходить к тебе стало смертельно.",
    s: () => ({ dmg: 44, count: 8, rad: 128, spin: 2.9 }),
    tick(g, w, dt) { WEAPONS.orbit.tick.call(this, g, w, dt); },
    draw(g, ctx, w) { WEAPONS.orbit.draw.call(this, g, ctx, w); }
  },

  shotgun: {
    name: "Лазерган", ico: "shotgun", max: 8, evoTo: "flak", evoNeed: "haste",
    color: "#ff8a4d",
    text: "Веер лазерных импульсов в ближайшую цель. Луч прошивает первого насквозь.",
    up: l => l % 2 ? "+луч" : "+урон и скорострельность",
    s: l => ({ dmg: 7 + 2.6 * l, n: 3 + ((l / 2) | 0), cd: 1.2 - 0.062 * l, spread: 0.52, sp: 580, pierce: 1 + ((l / 4) | 0) }),
    tick(g, w, dt) {
      w.t -= dt;
      if (w.t > 0) return;
      const e = nearestEnemy(g, g.p.x, g.p.y, 700);
      if (!e) { w.t = 0.1; return; }
      const s = this.s(w.lvl);
      w.t = s.cd * g.p.cdMul;
      const base = Math.atan2(e.y - g.p.y, e.x - g.p.x);
      const n = s.n + g.p.countBonus;
      for (let i = 0; i < n; i++) {
        const a = base + (i / Math.max(1, n - 1) - 0.5) * s.spread;
        shoot(g, g.p.x, g.p.y, a, s.sp, s.dmg * g.p.dmgMul, s.pierce, this.color, 4);
      }
      Sfx.shoot();
    }
  },
  flak: {
    name: "Призма", ico: "shotgun", max: 1, evolved: true, color: "#ffc23d",
    text: "Луч расщепляется на одиннадцать. Перед тобой сплошная световая стена.",
    s: () => ({ dmg: 24, n: 11, cd: 0.42, spread: 0.85, sp: 660, pierce: 3 }),
    tick(g, w, dt) { WEAPONS.shotgun.tick.call(this, g, w, dt); }
  },

  chain: {
    name: "Дуга", ico: "chain", max: 8, evoTo: "storm", evoNeed: "magnet",
    color: "#7fd4ff",
    text: "Электродуга бьёт ближайшего и перескакивает на соседей.",
    up: l => l % 2 ? "+урон" : "+1 переход",
    s: l => ({ dmg: 15 + 5.5 * l, jumps: 2 + ((l / 2) | 0), cd: 1.7 - 0.09 * l, range: 250 }),
    tick(g, w, dt) {
      w.t -= dt;
      if (w.t > 0) return;
      const s = this.s(w.lvl);
      const first = nearestEnemy(g, g.p.x, g.p.y, s.range * g.p.areaMul);
      if (!first) { w.t = 0.12; return; }
      w.t = s.cd * g.p.cdMul;
      chainZap(g, first, s.jumps, s.dmg * g.p.dmgMul, s.range * g.p.areaMul, this.color);
      Sfx.blip(880, 0.08, "sawtooth", 0.06, -400);
    }
  },
  storm: {
    name: "Ионный шторм", ico: "chain", max: 1, evolved: true, color: "#ffc23d",
    text: "Дуга не гаснет: восемь переходов, и всех задетых стягивает к тебе.",
    s: () => ({ dmg: 46, jumps: 8, cd: 0.75, range: 330 }),
    tick(g, w, dt) {
      w.t -= dt;
      if (w.t > 0) return;
      const s = this.s();
      const first = nearestEnemy(g, g.p.x, g.p.y, s.range);
      if (!first) { w.t = 0.12; return; }
      w.t = s.cd * g.p.cdMul;
      chainZap(g, first, s.jumps, s.dmg * g.p.dmgMul, s.range, this.color, true);
      Sfx.blip(880, 0.12, "sawtooth", 0.07, -500);
    }
  },

  mines: {
    name: "Наномины", ico: "mines", max: 8, evoTo: "minefield", evoNeed: "armor",
    color: "#ff5fa8",
    text: "Рассыпает за тобой рой зарядов. Детонируют от чужого движения.",
    up: l => l % 2 ? "+урон" : "+радиус взрыва",
    s: l => ({ dmg: 30 + 9 * l, cd: 1.7 - 0.07 * l, rad: 54 + 5 * l, life: 9 }),
    tick(g, w, dt) {
      w.t -= dt;
      if (w.t > 0) return;
      const s = this.s(w.lvl);
      w.t = s.cd * g.p.cdMul;
      g.mines.push({
        x: g.p.x, y: g.p.y, r: 9, rad: s.rad * g.p.areaMul, dmg: s.dmg * g.p.dmgMul,
        life: s.life * g.p.durMul, arm: 0.35, color: this.color, src: g.dmgSource, srcName: g.dmgName
      });
    }
  },
  minefield: {
    name: "Периметр", ico: "mines", max: 1, evolved: true, color: "#ffc23d",
    text: "Заряды сыплются втрое чаще и рвутся так, что слышит весь квартал.",
    s: () => ({ dmg: 120, cd: 0.6, rad: 118, life: 11 }),
    tick(g, w, dt) { WEAPONS.mines.tick.call(this, g, w, dt); }
  },

  aura: {
    name: "Излучатель", ico: "aura", max: 8, evoTo: "reactor", evoNeed: "heart",
    color: "#a86bff",
    text: "Постоянное поле вокруг тебя выжигает всё, что подошло вплотную.",
    up: l => l % 2 ? "+урон" : "+радиус",
    s: l => ({ dps: 10 + 4.5 * l, rad: 76 + 7 * l, tick: 0.3 }),
    tick(g, w, dt) {
      const s = this.s(w.lvl);
      w.t -= dt;
      if (w.t > 0) return;
      w.t = s.tick;
      hitArea(g, g.p.x, g.p.y, s.rad * g.p.areaMul, s.dps * s.tick * g.p.dmgMul, 20, null, 0, this.color, true);
    },
    draw(g, ctx, w) {
      const s = this.s(w.lvl), r = s.rad * g.p.areaMul;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.1 + 0.05 * Math.sin(g.time * 4);
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(g.p.x, g.p.y, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = this.color; ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]); ctx.lineDashOffset = -g.time * 30;
      ctx.beginPath(); ctx.arc(g.p.x, g.p.y, r, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  },
  reactor: {
    name: "Реактор", ico: "aura", max: 1, evolved: true, color: "#ffc23d",
    text: "Излучатель выходит на полную мощность и латает тебя, пока враги горят.",
    s: () => ({ dps: 62, rad: 168, tick: 0.25 }),
    tick(g, w, dt) {
      WEAPONS.aura.tick.call(this, g, w, dt);
      g.p.hp = Math.min(g.p.maxHp, g.p.hp + 1.2 * dt);
    },
    draw(g, ctx, w) { WEAPONS.aura.draw.call(this, g, ctx, w); }
  },

  missile: {
    name: "Ракеты", ico: "missile", max: 8, evoTo: "barrage", evoNeed: "boots",
    color: "#ffd166",
    text: "Самонаводящиеся заряды уходят в случайные цели и рвутся при попадании.",
    up: l => l % 2 ? "+урон" : "+1 ракета",
    s: l => ({ dmg: 20 + 7 * l, n: 1 + ((l / 2) | 0), cd: 1.5 - 0.06 * l, rad: 44, sp: 300 }),
    tick(g, w, dt) {
      w.t -= dt;
      if (w.t > 0) return;
      const s = this.s(w.lvl);
      w.t = s.cd * g.p.cdMul;
      let fired = 0;
      const n = s.n + g.p.countBonus;
      for (let i = 0; i < n; i++) {
        const e = randomEnemy(g, 640);
        if (!e) break;
        launchMissile(g, e, s.dmg * g.p.dmgMul, s.rad * g.p.areaMul, s.sp, this.color);
        fired++;
      }
      if (!fired) w.t = 0.15; else Sfx.blip(420, 0.14, "triangle", 0.05, 220);
    }
  },
  barrage: {
    name: "Шквал", ico: "missile", max: 1, evolved: true, color: "#ffc23d",
    text: "Пять ракет залпом, без пауз. Квартал превращается в фейерверк.",
    s: () => ({ dmg: 78, n: 5, cd: 0.85, rad: 82, sp: 340 }),
    tick(g, w, dt) { WEAPONS.missile.tick.call(this, g, w, dt); }
  },

  /* --- оружие, открывающееся по ходу игры --------------------------- */
  flechette: {
    name: "Флешетты", ico: "flechette", max: 8, evoTo: "needlestorm", evoNeed: "dup",
    color: "#7fd4ff",
    text: "Очередь игл строго по ходу движения. Бьёт часто и прошивает первого.",
    up: l => l % 2 ? "+урон" : "+1 игла",
    s: l => ({ dmg: 5 + 2.1 * l, n: 2 + ((l / 2) | 0), cd: 0.58 - 0.032 * l, spread: 0.17, sp: 720, pierce: 1 + ((l / 5) | 0) }),
    tick(g, w, dt) {
      w.t -= dt;
      if (w.t > 0) return;
      const s = this.s(w.lvl), p = g.p;
      w.t = s.cd * p.cdMul;
      const n = s.n + p.countBonus;
      for (let i = 0; i < n; i++) {
        const a = p.face + (n === 1 ? 0 : (i / (n - 1) - 0.5) * s.spread);
        shoot(g, p.x, p.y, a, s.sp, s.dmg * p.dmgMul, s.pierce, this.color, 3);
      }
      Sfx.blip(880, 0.035, "square", 0.03, -260);
    }
  },
  needlestorm: {
    name: "Ливень", ico: "flechette", max: 1, evolved: true, color: "#ffc23d",
    text: "Иглы идут сплошной стеной. Впереди тебя больше ничего не живёт.",
    s: () => ({ dmg: 26, n: 9, cd: 0.26, spread: 0.5, sp: 780, pierce: 3 }),
    tick(g, w, dt) { WEAPONS.flechette.tick.call(this, g, w, dt); }
  },

  disc: {
    name: "Диск", ico: "disc", max: 8, evoTo: "sawblade", evoNeed: "dura",
    color: "#b6ff3d",
    text: "Пила уходит в ближайшего врага и возвращается, кромсая всех на обоих ходах.",
    up: l => l % 3 === 0 ? "+1 диск" : "+урон и дальность",
    s: l => ({ dmg: 12 + 4.6 * l, n: 1 + ((l / 3) | 0), cd: 1.6 - 0.085 * l, reach: 240 + 14 * l, sp: 430 }),
    tick(g, w, dt) {
      w.t -= dt;
      if (w.t > 0) return;
      const s = this.s(w.lvl), p = g.p;
      const e = nearestEnemy(g, p.x, p.y, 760);
      if (!e) { w.t = 0.12; return; }
      w.t = s.cd * p.cdMul;
      const base = Math.atan2(e.y - p.y, e.x - p.x);
      const n = s.n + p.countBonus;
      for (let i = 0; i < n; i++) {
        const a = base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * 0.7);
        launchDisc(g, a, s.dmg * p.dmgMul, s.reach * p.areaMul, s.sp, this.color);
      }
      Sfx.blip(300, 0.1, "sawtooth", 0.04, 140);
    }
  },
  sawblade: {
    name: "Пила", ico: "disc", max: 1, evolved: true, color: "#ffc23d",
    text: "Три тяжёлых полотна, каждое уходит дальше и возвращается быстрее.",
    s: () => ({ dmg: 46, n: 3, cd: 0.95, reach: 360, sp: 520 }),
    tick(g, w, dt) { WEAPONS.disc.tick.call(this, g, w, dt); }
  },

  acid: {
    name: "Кислота", ico: "acid", max: 8, evoTo: "solvent", evoNeed: "luck",
    color: "#9dff5e",
    text: "Разливает под ногами едкие лужи. Они не взрываются — они просто разъедают.",
    up: l => l % 2 ? "+урон" : "+радиус лужи",
    s: l => ({ dmg: 5 + 2 * l, r: 48 + 5 * l, life: 3, cd: 2.2 - 0.1 * l, tick: 0.4 }),
    tick(g, w, dt) {
      w.t -= dt;
      if (w.t > 0) return;
      const s = this.s(w.lvl), p = g.p;
      w.t = s.cd * p.cdMul;
      g.pools.push({
        x: p.x, y: p.y, r: s.r * p.areaMul, life: s.life * p.durMul, max: s.life * p.durMul,
        t: 0, tick: s.tick, dmg: s.dmg * p.dmgMul, color: this.color,
        src: g.dmgSource, srcName: g.dmgName
      });
      Sfx.noise(0.12, 0.05, 900);
    }
  },
  solvent: {
    name: "Растворитель", ico: "acid", max: 1, evolved: true, color: "#ffc23d",
    text: "Лужи шире, живучее и жгут так, что в них нельзя стоять даже боссу.",
    s: () => ({ dmg: 30, r: 108, life: 5.5, cd: 1.15, tick: 0.3 }),
    tick(g, w, dt) { WEAPONS.acid.tick.call(this, g, w, dt); }
  },

  ricochet: {
    name: "Рикошет", ico: "ricochet", max: 8, evoTo: "chaos", evoNeed: "growth",
    color: "#ff8ae0",
    text: "Заряд носится по экрану, отскакивая от его краёв, пока не выдохнется.",
    up: l => l % 3 === 0 ? "+1 заряд" : "+урон и отскоки",
    s: l => ({ dmg: 10 + 3.6 * l, n: 1 + ((l / 3) | 0), cd: 1.9 - 0.095 * l, bounce: 3 + ((l / 2) | 0), sp: 430, pierce: 3 + l }),
    tick(g, w, dt) {
      w.t -= dt;
      if (w.t > 0) return;
      const s = this.s(w.lvl), p = g.p;
      w.t = s.cd * p.cdMul;
      const n = s.n + p.countBonus;
      for (let i = 0; i < n; i++) {
        const a = rnd(TAU);
        const b = shoot(g, p.x, p.y, a, s.sp, s.dmg * p.dmgMul, s.pierce, this.color, 5);
        b.bounce = s.bounce;
        b.life = 7;
      }
      Sfx.blip(520, 0.07, "triangle", 0.04, 200);
    }
  },
  chaos: {
    name: "Хаос", ico: "ricochet", max: 1, evolved: true, color: "#ffc23d",
    text: "Четыре заряда, десять отскоков каждый. Экран превращается в мясорубку.",
    s: () => ({ dmg: 38, n: 4, cd: 1.1, bounce: 10, sp: 480, pierce: 14 }),
    tick(g, w, dt) { WEAPONS.ricochet.tick.call(this, g, w, dt); }
  }
};

/* --- пассивные навыки -------------------------------------------------- */
const PASSIVES = {
  power: { name: "Овердрайв", ico: "power", max: 5, color: "#ff8a4d", text: "+15% ко всему урону.", val: l => "+" + l * 15 + "% урона" },
  haste: { name: "Криоконтур", ico: "haste", max: 5, color: "#3ee8ff", text: "Оружие перезаряжается на 8% быстрее.", val: l => "−" + Math.round((1 - Math.pow(0.92, l)) * 100) + "% отката" },
  area: { name: "Резонатор", ico: "area", max: 5, color: "#a86bff", text: "+12% к площади и дальности атак.", val: l => "+" + l * 12 + "% области" },
  boots: { name: "Сервоприводы", ico: "boots", max: 5, color: "#b6ff3d", text: "+9% к скорости бега.", val: l => "+" + l * 9 + "% скорости" },
  magnet: { name: "Гравизахват", ico: "magnet", max: 5, color: "#7fd4ff", text: "+30% к радиусу сбора кристаллов.", val: l => "+" + l * 30 + "% сбора" },
  heart: { name: "Биостим", ico: "heart", max: 5, color: "#ff2f6e", text: "+22 к максимуму здоровья и столько же лечит.", val: l => "+" + l * 22 + " HP" },
  armor: { name: "Нанопанцирь", ico: "armor", max: 5, color: "#8b96af", text: "Снимает 2 единицы с каждого удара по тебе.", val: l => "−" + l * 2 + " урона по тебе" },
  greed: { name: "Дата-майнер", ico: "greed", max: 5, color: "#ffc23d", text: "+18% опыта и осколков.", val: l => "+" + l * 18 + "% добычи" },
  dup: { name: "Дублер", ico: "dup", max: 2, color: "#3ee8ff", text: "Оружие выпускает на один снаряд больше.", val: l => "+" + l + " снаряд" + (l > 1 ? "а" : "") },
  dura: { name: "Стабилизатор", ico: "dura", max: 5, color: "#a86bff", text: "Мины, поля и воронки держатся на 15% дольше.", val: l => "+" + l * 15 + "% длительности" },
  luck: { name: "Талисман", ico: "luck", max: 5, color: "#ffc23d", text: "+6% к шансу элитного врага и к удачному дропу из неонок.", val: l => "+" + l * 6 + "% удачи" },
  growth: { name: "Апгрейд-чип", ico: "growth", max: 5, color: "#b6ff3d", text: "+10% получаемого опыта.", val: l => "+" + l * 10 + "% опыта" }
};

/* --- враги ------------------------------------------------------------- */
const ENEMIES = [
  { id: "crawler", name: "Ползун", hp: 25, spd: 57, dmg: 10, r: 11, xp: 1, color: "#64d2ff", shape: 3, from: 0, w: 10 },
  { id: "runner", name: "Бегун", hp: 24, spd: 134, dmg: 9, r: 9, xp: 1, color: "#ff8a4d", shape: 4, from: 60, w: 7 },
  { id: "brute", name: "Дробила", hp: 195, spd: 49, dmg: 24, r: 20, xp: 5, color: "#a86bff", shape: 6, from: 140, w: 4 },
  { id: "shooter", name: "Плевок", hp: 62, spd: 53, dmg: 14, r: 12, xp: 3, color: "#ff5fa8", shape: 5, from: 200, w: 4, ranged: 300, fire: 2.1 },
  { id: "swarm", name: "Мошка", hp: 16, spd: 113, dmg: 7, r: 7, xp: 1, color: "#b6ff3d", shape: 3, from: 280, w: 6, pack: 10 },
  { id: "ghost", name: "Тень", hp: 122, spd: 93, dmg: 19, r: 14, xp: 4, color: "#7f8cff", shape: 4, from: 380, w: 5, phase: true },

  /* --- обитатели второй арены: литейный цех --- */
  { id: "slag", name: "Шлак", hp: 46, spd: 62, dmg: 14, r: 13, xp: 2, color: "#ff9a3c", shape: 5, from: 0, w: 9 },
  { id: "welder", name: "Сварщик", hp: 88, spd: 74, dmg: 17, r: 12, xp: 3, color: "#ffd166", shape: 3, from: 90, w: 6 },
  { id: "hulk", name: "Ковш", hp: 320, spd: 38, dmg: 30, r: 24, xp: 9, color: "#ff6b3d", shape: 6, from: 170, w: 3 },
  { id: "spitter", name: "Литейщик", hp: 96, spd: 44, dmg: 16, r: 13, xp: 4, color: "#ff4d6d", shape: 5, from: 220, w: 4, ranged: 320, fire: 1.8 },

  /* --- обитатели третьей арены: ядро сети --- */
  { id: "shard", name: "Осколок", hp: 70, spd: 128, dmg: 16, r: 9, xp: 2, color: "#7df1ff", shape: 4, from: 0, w: 8 },
  { id: "warden", name: "Ключник", hp: 410, spd: 46, dmg: 34, r: 22, xp: 11, color: "#c77dff", shape: 6, from: 120, w: 4 },
  { id: "glitch", name: "Сбой", hp: 150, spd: 104, dmg: 22, r: 13, xp: 5, color: "#ff2fd0", shape: 3, from: 90, w: 6, phase: true },
  { id: "turret", name: "Ретранслятор", hp: 180, spd: 30, dmg: 20, r: 15, xp: 6, color: "#ff5fa8", shape: 5, from: 200, w: 4, ranged: 360, fire: 1.5 }
];
const ENEMY_BY_ID = {};
ENEMIES.forEach(e => { ENEMY_BY_ID[e.id] = e; });

const BOSSES = [
  /* --- арена 1: неоновый квартал --- */
  {
    arena: 0, t: 240, name: "НАДЗИРАТЕЛЬ", hp: 2500, r: 42, spd: 52, dmg: 26, xp: 60, color: "#ff2f6e", shards: 40,
    ai: (g, e, dt) => { bossRadial(g, e, dt, 3.6, 12, 210); bossCharge(g, e, dt, 5.5, 430); }
  },
  {
    arena: 0, t: 480, name: "ПОЖИРАТЕЛЬ", hp: 7000, r: 52, spd: 46, dmg: 32, xp: 140, color: "#ff2f6e", shards: 90,
    ai: (g, e, dt) => { bossSpiral(g, e, dt, 0.13, 240); bossSummon(g, e, dt, 6, 5); bossCharge(g, e, dt, 7, 420); }
  },
  {
    arena: 0, t: 720, name: "ПОЛНОЧЬ", hp: 15000, r: 62, spd: 50, dmg: 40, xp: 400, color: "#ff2f6e", shards: 260,
    ai: (g, e, dt) => { bossSpiral(g, e, dt, 0.1, 265); bossRadial(g, e, dt, 4.2, 22, 200); bossSummon(g, e, dt, 7, 7); bossCharge(g, e, dt, 5.2, 470); }
  },

  /* --- арена 2: литейный цех --- */
  {
    arena: 1, t: 240, name: "ДОМЕННАЯ", hp: 3400, r: 44, spd: 50, dmg: 30, xp: 70, color: "#ff8a3c", shards: 55,
    ai: (g, e, dt) => { bossRadial(g, e, dt, 3, 14, 230); bossCharge(g, e, dt, 5, 460); }
  },
  {
    arena: 1, t: 480, name: "КОВШЕВОЙ", hp: 9500, r: 56, spd: 44, dmg: 36, xp: 170, color: "#ff8a3c", shards: 120,
    ai: (g, e, dt) => { bossSpiral(g, e, dt, 0.11, 260); bossSummon(g, e, dt, 5.5, 6); bossCharge(g, e, dt, 6, 450); }
  },
  {
    arena: 1, t: 720, name: "РАЗЛИВЩИК", hp: 20000, r: 64, spd: 52, dmg: 46, xp: 460, color: "#ff8a3c", shards: 340,
    ai: (g, e, dt) => { bossSpiral(g, e, dt, 0.09, 280); bossRadial(g, e, dt, 3.6, 24, 215); bossSummon(g, e, dt, 6, 8); bossCharge(g, e, dt, 4.6, 500); }
  },

  /* --- арена 3: ядро сети --- */
  {
    arena: 2, t: 240, name: "БРАНДМАУЭР", hp: 4600, r: 46, spd: 54, dmg: 34, xp: 85, color: "#c77dff", shards: 75,
    ai: (g, e, dt) => { bossRadial(g, e, dt, 2.7, 16, 250); bossCharge(g, e, dt, 4.6, 490); }
  },
  {
    arena: 2, t: 480, name: "ДЕМОН СЕТИ", hp: 13000, r: 58, spd: 48, dmg: 42, xp: 210, color: "#c77dff", shards: 160,
    ai: (g, e, dt) => { bossSpiral(g, e, dt, 0.09, 280); bossSummon(g, e, dt, 5, 7); bossCharge(g, e, dt, 5.5, 480); }
  },
  {
    arena: 2, t: 720, name: "АРХИВАРИУС", hp: 27000, r: 66, spd: 54, dmg: 52, xp: 560, color: "#c77dff", shards: 430,
    ai: (g, e, dt) => { bossSpiral(g, e, dt, 0.08, 300); bossRadial(g, e, dt, 3.2, 26, 230); bossSummon(g, e, dt, 5.5, 9); bossCharge(g, e, dt, 4.2, 520); }
  },
  /* финальный босс всей игры: после него забег не кончается, а уходит в бесконечный */
  {
    arena: 2, t: 900, name: "ПЕРВОИСТОЧНИК", hp: 120000, r: 82, spd: 58, dmg: 70, xp: 1500,
    color: "#ff2fd0", shards: 1500, finalBoss: true,
    ai: (g, e, dt) => {
      bossSpiral(g, e, dt, 0.06, 320);
      bossRadial(g, e, dt, 2.6, 30, 250);
      bossSummon(g, e, dt, 4.5, 10);
      bossCharge(g, e, dt, 3.8, 560);
    }
  },

  /* Жнец: приходит на пятнадцатой минуте первых двух арен, когда забег
     уже засчитан. Здоровье у него есть, но убить его — задача для безумного
     билда; касание убивает наповал, броня не спасает. */
  {
    arena: -1, t: 900, name: "ЖНЕЦ", hp: 160000, r: 50, spd: 265, dmg: 99999, xp: 0, color: "#ff2f6e",
    shards: 900, final: true, reaper: true,
    ai: () => { }        // ничего не стреляет — просто догоняет и снимает с одного касания
  }
];

/* --- арены --------------------------------------------------------------
   У каждой свой набор врагов, свои боссы, палитра пола и множитель
   сложности. Открываются по очереди: прошёл предыдущую — доступна следующая. */
const ARENAS = [
  {
    id: "quarter", name: "Неоновый квартал", tag: "Начало",
    d: "Спальный район, который в полночь остался без сети. Знакомая публика из подсетей.",
    roster: ["crawler", "runner", "brute", "shooter", "swarm", "ghost"],
    mult: 1, floor: ["#0a0e1a", "#05070e"], grid: "#2a3e63", accent: "#3ee8ff"
  },
  {
    id: "foundry", name: "Литейный цех", tag: "Жарко",
    d: "Старое производство под кварталом. Здесь всё раскалено, и местные крепче.",
    roster: ["slag", "welder", "hulk", "spitter", "runner", "swarm"],
    mult: 1.35, floor: ["#1a0c06", "#0b0503"], grid: "#7a3a16", accent: "#ff8a3c"
  },
  {
    id: "core", name: "Ядро сети", tag: "Финал",
    d: "То, откуда всё лезло. На пятнадцатой минуте выходит Первоисточник — конец истории.",
    roster: ["shard", "warden", "glitch", "turret", "ghost", "swarm"],
    mult: 1.8, floor: ["#0d0618", "#05030d"], grid: "#5b2a86", accent: "#c77dff"
  }
];

/* --- достижения --------------------------------------------------------
   Каждое проверяется по одному снимку статистики (см. achStats в 03-game.js),
   так что порядок в списке ни на что не влияет — можно свободно добавлять.
   rar: 0 обычное · 1 редкое · 2 эпическое · 3 легендарное                 */
const ACH_RARITY = [
  { name: "Обычное", color: "#8fa3c8" },
  { name: "Редкое", color: "#3ee8ff" },
  { name: "Эпическое", color: "#c77dff" },
  { name: "Легендарное", color: "#ffc23d" }
];
const ACHIEVEMENTS = [
  /* --- обычные: попадаются в первые же забеги --- */
  { id: "a:first", rar: 0, ico: "blade", name: "Первый контакт", d: "Убей 100 врагов", f: s => s.kills >= 100 },
  { id: "a:min5", rar: 0, ico: "haste", name: "Пять минут", d: "Продержись 5:00 за один забег", f: s => s.best >= 300 },
  { id: "a:glass", rar: 0, ico: "area", name: "Бей стекло", d: "Разбей 50 неонок", f: s => s.props >= 50 },
  { id: "a:chest", rar: 0, ico: "gold", name: "Подарок", d: "Подбери 10 сундуков", f: s => s.chests >= 10 },
  { id: "a:lvl15", rar: 0, ico: "growth", name: "Пятнадцатый", d: "Возьми 15-й уровень", f: s => s.level >= 15 },
  { id: "a:quest5", rar: 0, ico: "luck", name: "По заданию", d: "Выполни 5 заданий забега", f: s => s.quests >= 5 },

  /* --- редкие: требуют осознанной игры --- */
  { id: "a:min10", rar: 1, ico: "haste", name: "Десять минут", d: "Продержись 10:00 за один забег", f: s => s.best >= 600 },
  { id: "a:boss10", rar: 1, ico: "missile", name: "Смотрящий", d: "Убей 10 боссов", f: s => s.bosses >= 10 },
  { id: "a:evo1", rar: 1, ico: "dup", name: "Слияние", d: "Собери первую эволюцию", f: s => s.evos >= 1 },
  { id: "a:max5", rar: 1, ico: "power", name: "До упора", d: "Выкачай 5 оружий до максимума", f: s => s.maxed >= 5 },
  { id: "a:quest25", rar: 1, ico: "luck", name: "Исполнитель", d: "Выполни 25 заданий забега", f: s => s.quests >= 25 },
  { id: "a:char4", rar: 1, ico: "phantom", name: "Смена состава", d: "Открой четвёртого оператора", f: s => s.chars >= 4 },
  { id: "a:kills5k", rar: 1, ico: "shotgun", name: "Пять тысяч", d: "Убей 5 000 врагов всего", f: s => s.kills >= 5000 },
  { id: "a:w10", rar: 1, ico: "orbit", name: "Арсенал", d: "Открой 10 видов оружия", f: s => s.weapons >= 10 },

  /* --- эпические: уже надо разбираться в билдах --- */
  { id: "a:arena1", rar: 2, ico: "armor", name: "Квартал зачищен", d: "Закрой Неоновый квартал", f: s => s.done.indexOf("quarter") >= 0 },
  { id: "a:arena2", rar: 2, ico: "acid", name: "Цех остыл", d: "Закрой Литейный цех", f: s => s.done.indexOf("foundry") >= 0 },
  { id: "a:evo5", rar: 2, ico: "dura", name: "Коллекционер форм", d: "Собери 5 разных эволюций", f: s => s.evos >= 5 },
  { id: "a:lvl40", rar: 2, ico: "growth", name: "Сороковой", d: "Возьми 40-й уровень", f: s => s.level >= 40 },
  { id: "a:metaMax", rar: 2, ico: "railgun", name: "Мастер цеха", d: "Выкачай улучшение мастерской до максимума", f: s => s.metaMax },
  { id: "a:clean5", rar: 2, ico: "heart", name: "Ни царапины", d: "Продержись первые 5:00 забега без урона", f: s => s.clean5 },
  { id: "a:shards50k", rar: 2, ico: "greed", name: "Скупщик", d: "Заработай 50 000 осколков всего", f: s => s.earned >= 50000 },
  { id: "a:kills50k", rar: 2, ico: "flechette", name: "Полсотни тысяч", d: "Убей 50 000 врагов всего", f: s => s.kills >= 50000 },

  /* --- легендарные: конец игры и около --- */
  { id: "a:arena3", rar: 3, ico: "singularity", name: "Ядро вскрыто", d: "Закрой Ядро сети", f: s => s.done.indexOf("core") >= 0 },
  { id: "a:final", rar: 3, ico: "singularity", name: "Первоисточник", d: "Убей финального босса игры", f: s => s.beaten },
  { id: "a:evoAll", rar: 3, ico: "disc", name: "Полный набор", d: "Собери все эволюции", f: s => s.evos >= s.evoTotal },
  { id: "a:reaper", rar: 3, ico: "ricochet", name: "Жнец жнеца", d: "Убей Жнеца", f: s => s.reaperKill },
  { id: "a:min20", rar: 3, ico: "haste", name: "Двадцать минут", d: "Продержись 20:00 за один забег", f: s => s.best >= 1200 },
  { id: "a:colAll", rar: 3, ico: "magnet", name: "Всё открыто", d: "Собери всю коллекцию", f: s => s.colDone },
  { id: "a:boss100", rar: 3, ico: "missile", name: "Охотник на титанов", d: "Убей 100 боссов", f: s => s.bosses >= 100 },
  { id: "a:cursed", rar: 3, ico: "aura", name: "Под проклятием", d: "Закрой любую арену с проклятием 3+", f: s => s.curseWin >= 3 }
];

/* --- мастерская: постоянные улучшения ---------------------------------- */
const META = [
  { id: "dmg", name: "Калибровка", max: 5, cost: l => [40, 80, 150, 260, 420][l], d: l => "+" + (l * 6) + "% урона на весь забег" },
  { id: "hp", name: "Экзоскелет", max: 5, cost: l => [35, 70, 130, 230, 380][l], d: l => "+" + (l * 15) + " к стартовому здоровью" },
  { id: "armor", name: "Нанопластины", max: 3, cost: l => [90, 200, 400][l], d: l => "−" + l + " урона с каждого удара" },
  { id: "spd", name: "Антиграв", max: 4, cost: l => [50, 110, 210, 360][l], d: l => "+" + (l * 4) + "% скорости бега" },
  { id: "mag", name: "Гравикатушка", max: 4, cost: l => [40, 85, 160, 280][l], d: l => "+" + (l * 18) + "% радиуса сбора" },
  { id: "regen", name: "Наноремонт", max: 4, cost: l => [70, 150, 280, 460][l], d: l => "+" + (l * 0.3).toFixed(1) + " HP в секунду" },
  { id: "dash", name: "Форсаж", max: 3, cost: l => [80, 170, 320][l], d: l => "−" + (l * 0.45).toFixed(2) + " с к откату рывка" },
  { id: "greed", name: "Скан трофеев", max: 5, cost: l => [45, 95, 170, 300, 500][l], d: l => "+" + (l * 10) + "% осколков за забег" },
  { id: "start", name: "Предзагрузка", max: 3, cost: l => [120, 260, 500][l], d: l => "Начинаешь забег с " + l + " апгрейдом(ами)" },
  { id: "luck", name: "Радар", max: 3, cost: l => [110, 240, 450][l], d: l => "+" + (l * 5) + "% шанс элитного врага с сундуком" },
  { id: "revive", name: "Резервная копия", max: 1, cost: () => 650, d: () => "Один раз за забег поднимает с 50% здоровья" },
  { id: "reroll", name: "Реролл", max: 3, cost: l => [120, 260, 480][l], d: l => l + " переброса набора карт за забег" },
  { id: "banish", name: "Изгнание", max: 3, cost: l => [140, 300, 540][l], d: l => "Можно выкинуть " + l + " предмет(а) из набора карт за забег" },
  { id: "growth", name: "Нейролинк", max: 5, cost: l => [60, 130, 240, 400, 620][l], d: l => "+" + (l * 4) + "% опыта за забег" },
  { id: "echo", name: "Эхо", max: 2, cost: l => [1200, 2200][l], d: l => "+" + l + (l === 1 ? " снаряд" : " снаряда") + " всему оружию со снарядами" },
  { id: "cool", name: "Турбина", max: 3, cost: l => [150, 320, 560][l], d: l => "−" + Math.round((1 - Math.pow(0.92, l)) * 100) + "% отката всему оружию и навыку" },
  { id: "curse", name: "Проклятие", max: 4, cost: l => [90, 180, 330, 560][l], d: l => "Враги на " + (l * 12) + "% злее, но осколков на " + (l * 25) + "% больше" }
];

/* --- редкость: вес предмета в наборе карт -------------------------------
   Чем выше число, тем чаще предмет попадается. Стартовое оружие самое
   частое, поздние открытия — редкие, чтобы они ощущались находкой.      */
const RARITY = {
  w: {
    blade: 100, orbit: 100, shotgun: 100,
    chain: 80, mines: 80, aura: 70, missile: 60,
    flechette: 70, disc: 60, acid: 50, ricochet: 40
  },
  p: {
    power: 100, haste: 90, area: 90, heart: 90,
    boots: 80, magnet: 80, armor: 70,
    greed: 60, dura: 60, growth: 60, luck: 50, dup: 40
  }
};
const RARITY_OWNED = 1.4;   // уже взятое качать предлагают охотнее
const RARITY_ABILITY = 55;  // вес карты прокачки активного навыка

/* --- что открывается по ходу игры ---------------------------------------
   Условия считаются от накопленной статистики плюс текущего забега, чтобы
   открытие прилетало сразу в бою, а не только на экране итогов.          */
const UNLOCKS = [
  { id: "p:armor", kind: "Имплант", name: "Нанопанцирь", cur: s => s.time, goal: 120, fmt: "t", text: "Продержись 2:00 за забег" },
  { id: "w:aura", kind: "Оружие", name: "Излучатель", cur: s => s.props, goal: 25, text: "Разбей 25 неонок" },
  { id: "p:greed", kind: "Имплант", name: "Дата-майнер", cur: s => s.shards, goal: 400, text: "Накопи 400 осколков" },
  { id: "w:flechette", kind: "Оружие", name: "Флешетты", cur: s => s.level, goal: 8, text: "Достигни 8 уровня" },
  { id: "c:scout", kind: "Оператор", name: "Скаут", cur: s => s.time, goal: 420, fmt: "t", text: "Продержись 7:00 за забег" },
  { id: "p:dup", kind: "Имплант", name: "Дублер", cur: s => s.maxed, goal: 1, text: "Прокачай оружие до максимума" },
  { id: "w:missile", kind: "Оружие", name: "Ракеты", cur: s => s.bosses, goal: 1, text: "Убей первого босса" },
  { id: "w:disc", kind: "Оружие", name: "Диск", cur: s => s.chests, goal: 3, text: "Открой 3 сундука" },
  { id: "p:dura", kind: "Имплант", name: "Стабилизатор", cur: s => s.time, goal: 300, fmt: "t", text: "Продержись 5:00 за забег" },
  { id: "w:acid", kind: "Оружие", name: "Кислота", cur: s => s.kills, goal: 2000, text: "Убей 2000 врагов" },
  { id: "c:chemist", kind: "Оператор", name: "Химик", cur: s => s.props, goal: 100, text: "Разбей 100 неонок" },
  { id: "p:luck", kind: "Имплант", name: "Талисман", cur: s => s.props, goal: 60, text: "Разбей 60 неонок" },
  { id: "p:growth", kind: "Имплант", name: "Апгрейд-чип", cur: s => s.level, goal: 16, text: "Достигни 16 уровня" },
  { id: "w:ricochet", kind: "Оружие", name: "Рикошет", cur: s => s.time, goal: 540, fmt: "t", text: "Продержись 9:00 за забег" },
  { id: "c:lucky", kind: "Оператор", name: "Фартовый", cur: s => s.chests, goal: 10, text: "Открой 10 сундуков" }
];
/* прогресс условия: сколько набрано из нужного, в пригодном для показа виде */
function unlockProgress(u, s) {
  const cur = Math.min(u.cur(s), u.goal);
  const fmt = v => u.fmt === "t" ? fmtTime(v) : Math.floor(v);
  return { cur: cur, done: cur >= u.goal, text: fmt(cur) + " / " + fmt(u.goal) };
}

/* --- задания на забег ---------------------------------------------------
   Три штуки выдаются случайно на старте и висят весь забег. Считают только
   то, что уже открыто, иначе можно получить задание на недоступное.     */
const QUEST_REWARD = { kill: 30, weapon: 40, evolve: 70 };
const QUEST_KILL_GOALS = [120, 160, 200, 250];

/* --- персонажи --------------------------------------------------------- */
const CHARS = [
  {
    id: "shift", name: "Ронин", price: 0, weapon: "blade", tag: "Универсал",
    d: "Уличный боец с плазморезом. Ничего лишнего — крепкий баланс.",
    mods: {}
  },
  {
    id: "engineer", name: "Техник", price: 300, weapon: "orbit", tag: "Оборона",
    d: "Начинает с дронами и лишним дроном сверху. Бьёт слабее, но живёт дольше.",
    mods: { dmg: 0.88, hp: 30, extraOrb: 1 }
  },
  {
    id: "sparks", name: "Вольт", price: 700, weapon: "chain", tag: "Темп",
    d: "Дуга вживлена с рождения, откаты на 12% быстрее. Здоровья заметно меньше.",
    mods: { cd: 0.88, hp: -25, spd: 1.06 }
  },
  {
    id: "scout", name: "Скаут", price: 0, weapon: "flechette", tag: "Скорость",
    d: "Бегает на 14% быстрее всех и сыплет иглами. Живучесть — не его сильная сторона.",
    mods: { spd: 1.14, hp: -20 }
  },
  {
    id: "chemist", name: "Химик", price: 0, weapon: "acid", tag: "Площадь",
    d: "Разливает кислоту и накрывает на 18% большую площадь. Бьёт при этом слабее.",
    mods: { area: 1.18, dmg: 0.9, hp: 10 }
  },
  {
    id: "lucky", name: "Фартовый", price: 0, weapon: "ricochet", tag: "Удача",
    d: "Элита лезет к нему чаще, неонки щедрее, и осколков он уносит на 15% больше.",
    mods: { luck: 0.12, greed: 1.15, hp: -10 }
  }
];
