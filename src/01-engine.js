"use strict";
/* =========================================================================
   NIGHT SURVIVORS — survivors-like, чистый JS + Canvas 2D, без зависимостей.
   Разделы: 0 утилиты · 1 звук · 2 сохранение · 3 контент · 4 сущности
            5 игра · 6 отрисовка · 7 интерфейс
   ========================================================================= */

/* ---------- 0. утилиты ---------------------------------------------- */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b));
const pick = arr => arr[(Math.random() * arr.length) | 0];
const dist2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };
const fmtTime = s => {
  s = Math.max(0, Math.floor(s));
  return String((s / 60) | 0).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
};
const $ = id => document.getElementById(id);

/* Версия игры: меняется с каждым изменением, пишется в углу меню и в
   CHANGELOG.md. Её же ставь в поле «Версия» черновика на Яндекс Играх. */
const GAME_VERSION = "0.9.0";

/* ---------- удалённая конфигурация -------------------------------------
   Значения по умолчанию. На Яндекс Играх их можно переопределить флагами
   в Консоли (вкладка «Флаги») без перезаливки архива — см. 06-platform.js
   и docs/RELEASE-YANDEX.md. Здесь всё уже в нужных типах. */
const REMOTE = {
  xpMul: 1,            // множитель опыта
  shardMul: 1,         // множитель осколков за забег
  enemyHpMul: 1,       // множитель здоровья врагов
  enemyDmgMul: 1,      // множитель урона врагов
  chestEvery: 45,      // интервал сундуков до 10:00, секунды
  rewardMul: 1,        // реклама за награду: сколько ещё «итогов забега» даёт
  adBetweenRuns: true, // полноэкранная реклама между забегами
  adRevive: true,      // воскрешение за рекламу
  reviveHp: 0.5,       // с какой долей здоровья поднимает
  news: ""             // строка-объявление в главном меню (пусто — не показываем)
};

/* Крупные числа разделяем тонким пробелом: обычный неразрывный из
   toLocaleString в моноширинном шрифте выглядит дырой. */
const fmtNum = n => Math.round(n).toLocaleString(
  typeof I18N !== "undefined" && I18N.lang === "en" ? "en-US" : "ru-RU").replace(/ /g, " ");

/* Фирменный осколок вместо знака «◈»: тот терялся среди цифр и выглядел
   как опечатка. Цвет наследуется через currentColor, поэтому одна и та же
   разметка годится и для золотого баланса, и для приглушённой цены. */
const SHARD = '<svg class="shd" viewBox="0 0 16 20" fill="none" aria-hidden="true">' +
  '<path d="M8 .8 15.2 6v8L8 19.2.8 14V6z" fill="currentColor" opacity=".16"/>' +
  '<path d="M8 .8 15.2 6v8L8 19.2.8 14V6z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
  '<path d="M8 .8v18.4M.8 6l7.2 4 7.2-4" stroke="currentColor" stroke-width=".9" opacity=".5"/></svg>';
/* цена/баланс одним куском: иконка + число с разделителями */
const cur = (n, cls) => '<span class="cur' + (cls ? " " + cls : "") + '">' +
  SHARD + '<b>' + fmtNum(n) + '</b></span>';
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

/* кэш «свечения»: заранее отрисованные радиальные градиенты. Тысячу
   shadowBlur в кадр рисовать нельзя, а drawImage готового спрайта — дёшево. */
const glowCache = new Map();
function glow(color, size) {
  const key = color + "|" + size;
  let c = glowCache.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = c.height = size * 2;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(size, size, 0, size, size, size);
  grd.addColorStop(0, color);
  grd.addColorStop(0.3, color);
  grd.addColorStop(1, "transparent");
  g.globalAlpha = 0.5;
  g.fillStyle = grd;
  g.fillRect(0, 0, size * 2, size * 2);
  glowCache.set(key, c);
  return c;
}
function drawGlow(ctx, x, y, size, color, alpha) {
  const s = glow(color, 32);
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  ctx.drawImage(s, x - size, y - size, size * 2, size * 2);
  ctx.globalAlpha = 1;
}

/* равномерная сетка: без неё расталкивание 400 врагов — 160k проверок в кадр */
class Grid {
  constructor(cell) { this.cell = cell; this.map = new Map(); }
  clear() { this.map.clear(); }
  add(e) {
    const k = ((e.x / this.cell) | 0) + "," + ((e.y / this.cell) | 0);
    let b = this.map.get(k);
    if (!b) { b = []; this.map.set(k, b); }
    b.push(e);
  }
  neighbours(e, out) {
    out.length = 0;
    const cx = (e.x / this.cell) | 0, cy = (e.y / this.cell) | 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const b = this.map.get((cx + i) + "," + (cy + j));
      if (b) for (let k = 0; k < b.length; k++) out.push(b[k]);
    }
    return out;
  }
  /* всё, что пересекает круг (x,y,r) */
  query(x, y, r, out) {
    out.length = 0;
    const c = this.cell;
    const x0 = ((x - r) / c) | 0, x1 = ((x + r) / c) | 0;
    const y0 = ((y - r) / c) | 0, y1 = ((y + r) / c) | 0;
    for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
      const b = this.map.get(i + "," + j);
      if (!b) continue;
      for (let k = 0; k < b.length; k++) {
        const e = b[k], rr = r + e.r;
        if (dist2(x, y, e.x, e.y) <= rr * rr) out.push(e);
      }
    }
    return out;
  }
}

/* ---------- 1. звук: всё синтезируется, ни одного файла --------------- */
const Sfx = {
  ctx: null, master: null, musicGain: null, on: true, timer: 0, step: 0,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.on = false; return; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.on ? 0.5 : 0;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.18;
    this.musicGain.connect(this.master);
    /* контекст создаётся по первому клику — если в этот момент звук уже
       держат (реклама на старте, окно без фокуса), сразу его усыпляем */
    if (this.held) this.ctx.suspend();
  },
  /* held — звук заглушён извне: вкладка скрыта, окно без фокуса, идёт
     реклама. Пока держится, нажатия клавиш контекст не будят. */
  held: false,
  resume() { if (this.ctx && !this.held && this.ctx.state === "suspended") this.ctx.resume(); },
  hold(on) {
    this.held = on;
    if (!this.ctx) return;
    if (on) { if (this.ctx.state === "running") this.ctx.suspend(); }
    else if (this.ctx.state === "suspended") this.ctx.resume();
  },
  toggle() {
    this.on = !this.on;
    if (this.master) this.master.gain.value = this.on ? 0.5 : 0;
    return this.on;
  },
  /* базовый «блип»: осциллятор + огибающая */
  blip(freq, dur, type, vol, slide, dest) {
    if (!this.ctx || !this.on) return;
    type = type || "square"; vol = vol === undefined ? 0.18 : vol;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, freq) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime, n = Math.max(1, (this.ctx.sampleRate * dur) | 0);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq || 900;
    const g = this.ctx.createGain(); g.gain.value = vol === undefined ? 0.2 : vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },
  seq(notes, gap, fn) { for (let i = 0; i < notes.length; i++) setTimeout(fn.bind(null, notes[i], i), i * gap); },
  shoot() { this.blip(660, 0.06, "square", 0.05, -300); },
  slash() { this.noise(0.09, 0.06, 2600); },
  hit() { this.blip(rnd(180, 240), 0.04, "square", 0.03, -60); },
  kill() { this.noise(0.1, 0.07, 1400); },
  hurt() { this.blip(150, 0.22, "sawtooth", 0.16, -90); this.noise(0.16, 0.12, 500); },
  pick() { this.blip(1180, 0.045, "triangle", 0.04, 260); },
  lvl() { this.seq([0, 1, 2, 3], 70, (n) => this.blip(520 * Math.pow(1.26, n), 0.16, "triangle", 0.12)); },
  evo() { this.seq([0, 1, 2, 3, 4, 5], 60, (n) => this.blip(400 * Math.pow(1.2, n), 0.3, "sawtooth", 0.09)); },
  boss() { this.blip(70, 1.1, "sawtooth", 0.22, -25); this.noise(0.9, 0.18, 260); },
  coin() { this.blip(1400, 0.07, "square", 0.05, 500); },
  dash() { this.noise(0.14, 0.08, 1800); },
  /* готовность: тихий высокий щелчок, чтобы не следить за углом экрана */
  ready() { this.blip(1560, 0.05, "triangle", 0.035, 180); },
  ach() { this.blip(784, 0.16, "sine", 0.05); setTimeout(() => this.blip(1175, 0.3, "sine", 0.045), 110); },
  /* крит: короткий яркий щелчок поверх обычного попадания */
  crit() { this.blip(1760, 0.06, "square", 0.045, 520); },
  cycle() {
    this.seq([0, 1, 2], 150, n => this.blip(220 / Math.pow(1.22, n), 0.6, "sawtooth", 0.14, -30));
    this.noise(1.1, 0.16, 300);
  },
  ultReady() { this.blip(1420, 0.07, "triangle", 0.055, 120); setTimeout(() => this.blip(2130, 0.09, "triangle", 0.05, 160), 70); },
  empty() { this.blip(220, 0.06, "square", 0.03, -70); },
  die() { this.seq([0, 1, 2, 3, 4], 130, (n) => this.blip(360 / (1 + n * 0.35), 0.34, "sawtooth", 0.15, -70)); },
  win() { this.seq([0, 4, 7, 12, 16, 19], 140, (n) => this.blip(330 * Math.pow(2, n / 12), 0.5, "triangle", 0.12)); },
  /* фон: медленное басовое остинато, слои добавляются по мере накала */
  /* тональность, лад и темп приходят от арены — см. ARENAS[].music */
  music(dt, intensity, m) {
    if (!this.ctx || !this.on) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    const beat = (m && m.beat) || 0.34;
    this.timer = beat;
    const root = (m && m.root) || 55;
    const scale = (m && m.scale) || [0, 3, 5, 7, 10, 12, 15];
    const wave = (m && m.wave) || "sawtooth";
    const lead = (m && m.lead) || "square";
    const s = this.step++;
    if (s % 4 === 0) this.blip(root * Math.pow(2, (s % 32 < 16 ? 0 : 3) / 12), beat * 2.4, wave, 0.1, 0, this.musicGain);
    if (s % 2 === 0) this.noise(0.04, 0.02 + intensity * 0.015, 6000);
    if (intensity > 0.25 && s % 4 === 2)
      this.blip(root * 4 * Math.pow(2, scale[(s * 3) % scale.length] / 12), beat * 0.8, lead, 0.03, 0, this.musicGain);
    if (intensity > 0.6 && s % 8 === 5)
      this.blip(root * 8 * Math.pow(2, scale[(s * 5) % scale.length] / 12), beat * 0.5, "triangle", 0.025, 0, this.musicGain);
  }
};

/* ---------- 2. сохранение -------------------------------------------- */
const SAVE_KEY = "nightshift.save.v1";
const DEF_TOTAL = () => ({ kills: 0, props: 0, chests: 0, bosses: 0, maxed: 0, quests: 0, earned: 0 });
const defaultSave = () => ({
  shards: 0, meta: {}, owned: [], best: 0, bestKills: 0, bestLevel: 0, wins: 0, runs: 0,
  char: "shift", ability: "phantom", sound: true,
  unlocked: [], total: DEF_TOTAL(),
  /* арены: какая выбрана и какие уже закрыты (дошёл до 15:00) */
  arena: 0, arenaDone: [], beaten: false,
  /* модификаторы по аренам: { quarter: { hyper: true, endless: false }, … } */
  mods: {},
  /* достижения и список уже собранных эволюций — по ним считаются ачивки */
  ach: [], evoSeen: [],
  /* личные рекорды бесконечности по аренам: { quarter: [секунды, …] } */
  records: {},
  /* номер правки: растёт с каждой записью, по нему выбираем между
     локальным и облачным сохранением, когда остальное равно */
  rev: 0
});
let save = defaultSave();

/* Приводит сохранение любого происхождения (localStorage, облако Яндекса,
   старая версия игры) к текущей форме: недостающие поля — по умолчанию. */
function normalizeSave(raw) {
  const s = Object.assign(defaultSave(), raw && typeof raw === "object" ? raw : {});
  if (!s.meta || typeof s.meta !== "object") s.meta = {};
  if (!Array.isArray(s.unlocked)) s.unlocked = [];
  s.total = Object.assign(DEF_TOTAL(), s.total && typeof s.total === "object" ? s.total : {});
  if (!Array.isArray(s.arenaDone)) s.arenaDone = [];
  if (!s.mods || typeof s.mods !== "object") s.mods = {};
  if (!Array.isArray(s.ach)) s.ach = [];
  if (!Array.isArray(s.evoSeen)) s.evoSeen = [];
  if (!s.records || typeof s.records !== "object") s.records = {};
  if (typeof s.arena !== "number") s.arena = 0;
  if (typeof s.rev !== "number") s.rev = 0;
  return s;
}
function loadSave() {
  let raw = null;
  try {
    const txt = localStorage.getItem(SAVE_KEY);
    /* пустое хранилище тоже сбрасывает состояние, иначе повторный вызов
       тащил бы за собой прежний прогресс */
    raw = txt ? JSON.parse(txt) : null;
  } catch (e) { /* приватный режим или битые данные — играем с нуля */ }
  save = normalizeSave(raw);
}
/* Какое из двух сохранений «дальше»: сначала по заработанным за всё время
   осколкам (растут только от игры), потом по числу забегов, потом по
   номеру правки — он ловит покупки в мастерской. Положительное — a впереди. */
function compareSaves(a, b) {
  const ea = (a.total && a.total.earned) || 0, eb = (b.total && b.total.earned) || 0;
  if (ea !== eb) return ea - eb;
  if ((a.runs || 0) !== (b.runs || 0)) return (a.runs || 0) - (b.runs || 0);
  return (a.rev || 0) - (b.rev || 0);
}

/* базовый набор доступен сразу, остальное копится в save.unlocked */
const BASE_UNLOCKED = [
  "w:blade", "w:orbit", "w:shotgun", "w:chain", "w:mines",
  "p:power", "p:haste", "p:area", "p:boots", "p:magnet", "p:heart",
  "c:shift", "c:engineer", "c:sparks"
];
function isUnlocked(id) { return BASE_UNLOCKED.indexOf(id) >= 0 || save.unlocked.indexOf(id) >= 0; }
function writeSave() {
  save.rev = (save.rev || 0) + 1;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { }
  /* в облако — с задержкой: у Яндекса лимит 100 записей за 5 минут */
  if (typeof Platform !== "undefined") Platform.queueCloud();
}
const metaLvl = id => save.meta[id] || 0;

/* ---------- ввод ------------------------------------------------------ */
/* Клавиши берём по физическому положению (e.code), а не по символу:
   иначе на русской раскладке WASD превращается в ЦФЫВ, на других — во что
   угодно. Яндекс Игры требуют, чтобы управление не зависело от раскладки
   (пункт 1.6.2.4), поэтому дальше по коду везде латинские имена. */
function keyName(e) {
  const c = e.code || "";
  if (c.indexOf("Key") === 0) return c.slice(3).toLowerCase();
  if (c.indexOf("Digit") === 0) return c.slice(5);
  if (/^Numpad\d$/.test(c)) return c.slice(6);
  if (c === "Space") return " ";
  if (c === "ShiftLeft" || c === "ShiftRight") return "shift";
  if (c === "Escape") return "escape";
  if (c === "Enter" || c === "NumpadEnter") return "enter";
  if (c.indexOf("Arrow") === 0) return "arrow" + c.slice(5).toLowerCase();
  return (e.key || "").toLowerCase();
}
const keys = Object.create(null);
const pressed = Object.create(null);
addEventListener("keydown", e => {
  const k = keyName(e);
  if (!keys[k]) pressed[k] = true;
  keys[k] = true;
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].indexOf(k) >= 0) e.preventDefault();
  Sfx.resume();
});
addEventListener("keyup", e => { keys[keyName(e)] = false; });
addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
function tookKey(k) { if (pressed[k]) { pressed[k] = false; return true; } return false; }
function clearPressed() { for (const k in pressed) pressed[k] = false; }
/* мышь — прицел активной способности. Зажатую кнопку не сбрасываем: пока
   держишь, способность уходит сама, как только откатится. mousedown ловим
   только на самом холсте, чтобы клики по меню и картам не расходовали её. */
const mouse = { x: 0, y: 0, down: false, right: false };
addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
addEventListener("mousedown", e => {
  if (!e.target || e.target.id !== "cv") return;
  if (e.button !== 0 && e.button !== 2) return;
  mouse.x = e.clientX; mouse.y = e.clientY;
  if (e.button === 2) mouse.right = true; else mouse.down = true;
  Sfx.resume();
});
addEventListener("mouseup", e => { if (e.button === 2) mouse.right = false; else mouse.down = false; });
addEventListener("blur", () => { mouse.down = mouse.right = false; });
/* по правой кнопке уходит ульта, а контекстное меню в игре не нужно нигде —
   Яндекс отдельно проверяет, что клик по полю его не открывает (1.6.2.7) */
addEventListener("contextmenu", e => e.preventDefault());

function axis() {
  /* палец на джойстике главнее клавиш: вектор уже аналоговый */
  if (typeof Touch !== "undefined" && Touch.stickId !== null) return { x: Touch.axis.x, y: Touch.axis.y };
  let x = 0, y = 0;
  if (keys.a || keys.arrowleft) x -= 1;
  if (keys.d || keys.arrowright) x += 1;
  if (keys.w || keys.arrowup) y -= 1;
  if (keys.s || keys.arrowdown) y += 1;
  if (x && y) { const k = Math.SQRT1_2; x *= k; y *= k; }
  return { x: x, y: y };
}
