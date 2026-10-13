/* ---------- 9. демо за главным меню -------------------------------------
   Пока открыто меню, за ним идёт настоящий бой: тот же update() и render(),
   только вместо игрока — бот. Видео тут не годится: ролик раздул бы
   index.html на мегабайты и устаревал бы с каждой правкой, а живой бой
   ничего не весит и всегда показывает текущую версию игры.
   Всё, что пишет в сохранение, интерфейс, звук и аналитику, на время кадра
   демо выключено флагом g.demo (hurtPlayer, endRun, checkUnlocks, checkAch,
   tryEvolve, UI.toast, Metrica) и Sfx.quiet. Сцены идут по кругу: начало
   забега → разгар → середина, каждый раз с новым оператором, навыком и
   набором оружия.                                                        */
const DEMO_SCENES = [
  /* начало: пара стволов, редкая толпа */
  { len: 18, time: 80, level: 4, weapons: 2, wlvl: [1, 2], passives: 1, plvl: [1, 1], evo: 0, ab: 1, crowd: 30 },
  /* разгар: полный набор, эволюции, плотная орда и волна посреди сцены */
  { len: 26, time: 700, level: 38, weapons: 4, wlvl: [8, 8], passives: 6, plvl: [4, 5], evo: 2, ab: 5, crowd: 150, wave: 9 },
  /* середина: билд собирается, толпа погуще */
  { len: 22, time: 330, level: 16, weapons: 3, wlvl: [3, 6], passives: 3, plvl: [2, 3], evo: 0, ab: 3, crowd: 60 }
];
const DEMO_MAX = 200;      // потолок толпы: меню не должно грузить слабые телефоны…
const DEMO_MAX_TOUCH = 110; // …а на телефоне меню закрывает почти весь экран
const DEMO_FADE = 0.7;     // затемнение на стыке сцен, секунды
const DEMO_DIM = 0.22;     // постоянное притемнение, чтобы меню читалось поверх боя
const DEMO_AVOID = 240;    // от врагов ближе этого бот уходит
const DEMO_CAST = [1.4, 3.2];  // пауза между кастами навыка, секунды
const demoNear = [];

const Demo = {
  live: false,             // идёт кадр демо: axis() отдаёт steer вместо клавиш
  steer: { x: 0, y: 0 },
  p: null, world: -1, scene: -1, t: 0, cap: DEMO_MAX,
  heading: 0, castT: 0, shown: false,

  /* демо — только в главном меню и его подэкранах, пока забега нет */
  wanted() { return g.state === "menu" && !g.p; },

  /* на время кадра мир принадлежит демо: игрок — бот, побочки выключены */
  enter() { g.p = this.p; g.demo = true; Sfx.quiet = true; this.live = true; },
  leave() { g.p = null; g.demo = false; Sfx.quiet = false; this.live = false; },

  /* новая сцена: мир с нуля, билд и толпа под этап забега */
  next() {
    this.scene = (this.scene + 1) % DEMO_SCENES.length;
    const sc = DEMO_SCENES[this.scene];
    const ch = pick(CHARS);
    resetWorld(ch.id);
    this.world = g.world;
    this.p = g.p;
    g.p = null;
    this.t = 0;
    this.heading = rnd(TAU);
    this.castT = rnd(DEMO_CAST[0], DEMO_CAST[1]);
    this.cap = Touch.on ? DEMO_MAX_TOUCH : DEMO_MAX;
    g.grid.clear();
    this.enter();
    /* модификаторы игрока демо не берёт, а Жнеца и финала не бывает:
       оба пишут в сохранение, и до них демо не доживает по времени */
    g.hyper = g.endless = false;
    g.bosses = BOSSES.filter(b => b.arena === g.arena && !b.reaper && !b.finalBoss);
    g.time = sc.time;
    g.bossIdx = g.bosses.filter(b => b.t <= sc.time).length;   // прошедших боссов не выпускаем разом
    g.waveT = sc.wave || WAVE_EVERY;
    g.chests = Math.floor(sc.time / CHEST_EVERY);
    g.chestT = rnd(6, 12);
    this.build(sc, ch);
    const p = this.p;
    const far = Math.max(VW, VH) * 0.7;
    const crowd = Math.min(sc.crowd, Math.round(this.cap * 0.75));
    for (let i = 0; i < crowd; i++) {
      const a = rnd(TAU), d = rnd(220, far);
      spawnEnemy(unlockedPick(), p.x + Math.cos(a) * d, p.y + Math.sin(a) * d);
    }
    this.leave();
  },

  /* билд под сцену: стартовое оружие оператора плюс случайные к нему */
  build(sc, ch) {
    const p = this.p;
    p.ability = pick(ABILITY_LIST);
    p.abLvl = sc.ab;
    p.level = sc.level;
    p.xpNext = Math.round(10 + 7 * p.level + p.level * p.level * 0.62);
    const pool = shuffle(Object.keys(WEAPONS).filter(id => !WEAPONS[id].evolved && id !== ch.weapon));
    while (p.weapons.length < sc.weapons && pool.length) addWeapon(p, pool.pop());
    let evo = sc.evo;
    for (let i = 0; i < p.weapons.length; i++) {
      const w = p.weapons[i], def = WEAPONS[w.id];
      w.lvl = Math.min(def.max, rndi(sc.wlvl[0], sc.wlvl[1] + 1));
      if (evo > 0 && def.evoTo) { evo--; w.id = def.evoTo; w.lvl = 1; }
    }
    const pas = shuffle(Object.keys(PASSIVES)).slice(0, sc.passives);
    for (let i = 0; i < pas.length; i++)
      p.passives[pas[i]] = Math.min(PASSIVES[pas[i]].max, rndi(sc.plvl[0], sc.plvl[1] + 1));
    recalc(p);
    p.hp = p.maxHp;
  },

  /* бот: уходит от толпы, по пути подбирает опыт, в остальное время
     бродит. Навык — в ближайшего, ульта — когда вокруг густо. */
  think(dt) {
    const p = this.p;
    let fx = 0, fy = 0, close = 0, near = null, nd = Infinity;
    g.grid.query(p.x, p.y, DEMO_AVOID, demoNear);
    for (let i = 0; i < demoNear.length; i++) {
      const e = demoNear[i];
      if (e.dead) continue;
      const dx = p.x - e.x, dy = p.y - e.y, d2 = dx * dx + dy * dy + 1;
      const w = (e.boss ? 5 : 1) / d2;
      fx += dx * w; fy += dy * w;
      if (d2 < 90 * 90) close++;
      if (d2 < nd) { nd = d2; near = e; }
    }
    /* ближайший кристалл тянет слабее, чем толкает толпа */
    let gem = null, gd = 260 * 260;
    for (let i = 0; i < g.gems.length; i++) {
      const q = g.gems[i], d2 = dist2(p.x, p.y, q.x, q.y);
      if (d2 < gd) { gd = d2; gem = q; }
    }
    if (gem) { const d = Math.sqrt(gd) + 1; fx += (gem.x - p.x) / d * 0.003; fy += (gem.y - p.y) / d * 0.003; }
    /* блуждание: курс плавно гуляет, чтобы бот не стоял и не ходил по прямой */
    this.heading += rnd(-2, 2) * dt;
    fx += Math.cos(this.heading) * 0.0035;
    fy += Math.sin(this.heading) * 0.0035;
    /* на полном ходу бот убегал от орды, и бой оставался за краем экрана.
       Поэтому спокойно он идёт вполсилы, а разгоняется, только когда зажат */
    const m = Math.hypot(fx, fy);
    const pace = Math.min(1, 0.45 + close * 0.15);
    this.steer.x = m ? fx / m * pace : 0;
    this.steer.y = m ? fy / m * pace : 0;
    if (close >= 4 && p.dashCd <= 0) pressed[" "] = true;   // зажали — рывок
    this.castT -= dt;
    const cast = { aim: null, ult: false };
    if (near && this.castT <= 0 && p.abCharge >= 1) {
      this.castT = rnd(DEMO_CAST[0], DEMO_CAST[1]);
      cast.aim = near;
      cast.ult = p.abCharge >= AB_CHARGES && demoNear.length >= 12;
    }
    return cast;
  },

  tick(dt) {
    /* настоящий забег занимал мир — начинаем показ заново */
    if (!this.p || this.world !== g.world) { this.scene = -1; this.next(); }
    else if (this.t >= DEMO_SCENES[this.scene].len) this.next();
    this.t += dt;
    this.enter();
    const cast = this.think(dt);
    /* мышь подменяем на кадр: прицел навыка берётся из её координат */
    const mx = mouse.x, my = mouse.y, md = mouse.down, mr = mouse.right;
    mouse.down = !!cast.aim && !cast.ult;
    mouse.right = cast.ult;
    if (cast.aim) { mouse.x = cast.aim.x - g.cam.x + VW / 2; mouse.y = cast.aim.y - g.cam.y + VH / 2; }
    update(dt);
    mouse.x = mx; mouse.y = my; mouse.down = md; mouse.right = mr;
    this.leave();
  },

  draw() {
    if (!this.p || this.world !== g.world) { render(); return; }
    this.enter();
    render();
    this.leave();
    /* притемнение поверх боя, а на стыке сцен — уход в чёрное и обратно */
    const len = DEMO_SCENES[this.scene].len;
    const k = clamp(Math.min(this.t, len - this.t) / DEMO_FADE, 0, 1);
    ctx.fillStyle = "rgba(4,6,12," + (DEMO_DIM + (1 - DEMO_DIM) * (1 - k)).toFixed(3) + ")";
    ctx.fillRect(0, 0, VW, VH);
  },

  /* класс на body: в демо экраны меню полупрозрачные, чтобы бой был виден */
  mark(on) {
    if (on === this.shown) return;
    this.shown = on;
    document.body.classList.toggle("demo", on);
  }
};
