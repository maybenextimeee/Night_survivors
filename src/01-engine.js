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
  },
  resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },
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
  ultReady() { this.blip(1420, 0.07, "triangle", 0.055, 120); setTimeout(() => this.blip(2130, 0.09, "triangle", 0.05, 160), 70); },
  empty() { this.blip(220, 0.06, "square", 0.03, -70); },
  die() { this.seq([0, 1, 2, 3, 4], 130, (n) => this.blip(360 / (1 + n * 0.35), 0.34, "sawtooth", 0.15, -70)); },
  win() { this.seq([0, 4, 7, 12, 16, 19], 140, (n) => this.blip(330 * Math.pow(2, n / 12), 0.5, "triangle", 0.12)); },
  /* фон: медленное басовое остинато, слои добавляются по мере накала */
  music(dt, intensity) {
    if (!this.ctx || !this.on) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    const beat = 0.34;
    this.timer = beat;
    const root = 55, scale = [0, 3, 5, 7, 10, 12, 15];
    const s = this.step++;
    if (s % 4 === 0) this.blip(root * Math.pow(2, (s % 32 < 16 ? 0 : 3) / 12), beat * 2.4, "sawtooth", 0.1, 0, this.musicGain);
    if (s % 2 === 0) this.noise(0.04, 0.02 + intensity * 0.015, 6000);
    if (intensity > 0.25 && s % 4 === 2)
      this.blip(root * 4 * Math.pow(2, scale[(s * 3) % scale.length] / 12), beat * 0.8, "square", 0.03, 0, this.musicGain);
    if (intensity > 0.6 && s % 8 === 5)
      this.blip(root * 8 * Math.pow(2, scale[(s * 5) % scale.length] / 12), beat * 0.5, "triangle", 0.025, 0, this.musicGain);
  }
};

/* ---------- 2. сохранение -------------------------------------------- */
const SAVE_KEY = "nightshift.save.v1";
const defaultSave = () => ({
  shards: 0, meta: {}, owned: [], best: 0, bestKills: 0, bestLevel: 0, wins: 0, runs: 0,
  char: "shift", ability: "phantom", sound: true,
  unlocked: [], total: { kills: 0, props: 0, chests: 0, bosses: 0, maxed: 0 }
});
let save = defaultSave();
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    /* пустое хранилище тоже сбрасывает состояние, иначе повторный вызов
       тащил бы за собой прежний прогресс */
    save = raw ? Object.assign(defaultSave(), JSON.parse(raw)) : defaultSave();
  } catch (e) { /* приватный режим или битые данные — играем с нуля */ }
  if (!save.meta || typeof save.meta !== "object") save.meta = {};
  if (!Array.isArray(save.unlocked)) save.unlocked = [];
  if (!save.total || typeof save.total !== "object") save.total = { kills: 0, props: 0, chests: 0, bosses: 0, maxed: 0 };
}

/* базовый набор доступен сразу, остальное копится в save.unlocked */
const BASE_UNLOCKED = [
  "w:blade", "w:orbit", "w:shotgun",
  "p:power", "p:haste", "p:area", "p:boots", "p:magnet", "p:heart",
  "c:shift", "c:engineer", "c:sparks"
];
function isUnlocked(id) { return BASE_UNLOCKED.indexOf(id) >= 0 || save.unlocked.indexOf(id) >= 0; }
function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { }
}
const metaLvl = id => save.meta[id] || 0;

/* ---------- ввод ------------------------------------------------------ */
const keys = Object.create(null);
const pressed = Object.create(null);
addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  if (!keys[k]) pressed[k] = true;
  keys[k] = true;
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].indexOf(k) >= 0) e.preventDefault();
  Sfx.resume();
});
addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });
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
/* по правой кнопке уходит ульта — контекстное меню на холсте не нужно */
addEventListener("contextmenu", e => { if (e.target && e.target.id === "cv") e.preventDefault(); });

function axis() {
  let x = 0, y = 0;
  if (keys.a || keys.arrowleft || keys["ф"]) x -= 1;
  if (keys.d || keys.arrowright || keys["в"]) x += 1;
  if (keys.w || keys.arrowup || keys["ц"]) y -= 1;
  if (keys.s || keys.arrowdown || keys["ы"]) y += 1;
  if (x && y) { const k = Math.SQRT1_2; x *= k; y *= k; }
  return { x: x, y: y };
}
