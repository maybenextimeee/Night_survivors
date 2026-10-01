/* ---------- 7. интерфейс ----------------------------------------------- */
const UI = {
  screens: {
    menu: $("scrMenu"), help: $("scrHelp"), shop: $("scrShop"), chars: $("scrChars"),
    class: $("scrClass"), level: $("scrLevel"), pause: $("scrPause"), end: $("scrEnd"),
    collection: $("scrCollection"), arena: $("scrArena"), ach: $("scrAch"), revive: $("scrRevive")
  },
  achQ: [], achBusy: false,
  cards: [],
  show(name) {
    for (const k in this.screens) this.screens[k].classList.toggle("on", k === name);
    this.current = name;
  },
  hideAll() { this.show(""); },

  /* Панель заданий висит под левым блоком HUD. Высота блока меняется:
     узкое окно переносит статистику в несколько строк, появляется «Разгон».
     Раскладку читаем только когда изменилось то, что влияет на перенос, —
     не каждый кадр. */
  placeQuests() {
    const key = innerWidth + "|" + !$("rushStat").hidden + "|" + $("sKills").textContent.length +
      "|" + $("sGold").textContent.length + "|" + $("sChest").textContent.length;
    if (key === this._qTopKey) return;
    this._qTopKey = key;
    const left = document.querySelector(".topbar > div");
    $("quests").style.top = Math.max(104, left.getBoundingClientRect().bottom + 10) + "px";
  },
  enterPlay() {
    this._qTopKey = "";
    this.hideAll();
    $("hud").classList.add("on");
    $("rack").classList.add("on");
    $("dash").classList.add("on");
    $("skill").classList.add("on");
    $("quests").classList.add("on");
    this.syncSkill();
    this.syncRack();
    this._lvlSeen = null;
    this.buildQuests();
    this.buildTimeline();
  },
  leavePlay() {
    Touch.reset();
    $("hud").classList.remove("on");
    $("rack").classList.remove("on");
    $("dash").classList.remove("on");
    $("skill").classList.remove("on");
    $("quests").classList.remove("on");
    $("questIntro").classList.remove("on");
    $("bossBar").classList.remove("on");
  },

  /* тосты лезут поверх боя, поэтому их не больше трёх и без повторов подряд */
  toast(txt) {
    const box = $("toast");
    const last = box.lastElementChild;
    if (last && last.textContent === txt) return;
    const el = document.createElement("div");
    el.className = "tst";
    el.textContent = txt;
    box.appendChild(el);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => el.remove(), 1800);
  },

  syncHud() {
    const p = g.p;
    if (!p) return;
    $("clock").textContent = fmtTime(g.time);
    $("sKills").textContent = fmtNum(g.kills);
    $("sGold").textContent = fmtNum(g.gold);
    $("sWave").textContent = Math.floor(g.time / 60) + 1;
    /* до следующего сундука: золотой подсвечиваем заранее, чтобы было за чем бежать */
    const cl = chestLeft();
    $("sChest").textContent = t("{0} с", cl > 9.95 ? Math.ceil(cl) : cl.toFixed(1));
    $("chestStat").classList.toggle("gold", chestGoldNext());
    this.syncTimeline();
    const hk = clamp(p.hp / p.maxHp, 0, 1);
    const pct = (hk * 100).toFixed(2) + "%";
    $("hpFill").style.width = pct;
    /* та же ширина, но у «призрака» в CSS задержка — он отстаёт и показывает,
       сколько сняли последним ударом */
    $("hpGhost").style.width = pct;
    $("hpTxt").textContent = Math.ceil(p.hp) + " / " + Math.round(p.maxHp);
    const vial = $("hpVial");
    vial.classList.toggle("mid", hk < 0.5);
    vial.classList.toggle("low", hk < 0.25);
    /* плашку уровня трогаем только когда уровень реально сменился,
       иначе вспышка перезапускалась бы каждый кадр */
    if (p.level !== this._lvlSeen) {
      const el = $("lvlTxt");
      el.textContent = p.level;
      $("xpMax").textContent = "/ " + p.xpNext;
      if (this._lvlSeen != null) {
        el.classList.remove("up");
        void el.offsetWidth;
        el.classList.add("up");
      }
      this._lvlSeen = p.level;
    }
    $("xpFill").style.transform = "scaleX(" + clamp(p.xp / p.xpNext, 0, 1) + ")";
    $("xpNum").textContent = Math.floor(p.xp);
    const bb = $("bossBar");
    if (g.boss && !g.boss.dead) {
      bb.classList.add("on");
      $("bossName").textContent = g.boss.def.name;
      $("bossFill").style.transform = "scaleX(" + clamp(g.boss.hp / g.boss.maxHp, 0, 1) + ")";
    } else bb.classList.remove("on");
    $("dashKey").classList.toggle("rdy", p.dashCd <= 0 && p.dashT <= 0);
    $("dashKey").textContent = p.dashCd > 0 ? p.dashCd.toFixed(1) : "SPACE";
    const rush = p.rush > 0.005;
    $("rushStat").hidden = !rush;
    if (rush) $("sRush").textContent = "+" + Math.round(p.rush * 100) + "%";
    /* три сегмента заряда: заполненные горят, текущий растёт */
    const segs = $("skillCharges").children;
    for (let i = 0; i < segs.length; i++) {
      const f = clamp(p.abCharge - i, 0, 1);
      segs[i].firstChild.style.width = (f * 100) + "%";
      segs[i].classList.toggle("full", f >= 1);
    }
    const ready = p.abCharge >= AB_CHARGES;
    $("skill").classList.toggle("ready", ready);
    $("skillKey").classList.toggle("rdy", p.abCharge >= 1);
    $("skillKey").textContent = p.abCharge >= 1 ? t("ЛКМ") : (abCdSec(p) * (1 - p.abCharge)).toFixed(1);
    if (Touch.on) Touch.sync(p);
    this.placeQuests();
    this.syncQuests();
  },

  /* линейка забега строится один раз: расписание боссов у арены своё */
  buildTimeline() {
    const el = $("timeline");
    this._cyc = -1;
    let h = '<i class="tfill" id="tlFill"></i>';
    this._marks = [];
    for (let i = 0; i < g.bosses.length; i++) {
      const b = g.bosses[i];
      const x = clamp(b.t / RUN_LEN, 0, 1) * 100;
      const fin = b.finalBoss || b.reaper;
      h += '<span class="bm' + (fin ? " fin" : "") + '" style="left:' + x.toFixed(2) +
        '%" title="' + b.name + " · " + fmtTime(b.t) + '"></span>';
      this._marks.push(b);
    }
    el.innerHTML = h;
    this._mEls = el.querySelectorAll(".bm");
    this._tlFill = $("tlFill");
    this._tlNext = -1;
  },
  syncTimeline() {
    if (!this._mEls) return;
    /* в бесконечности линейка показывает текущий круг, а не весь забег */
    const ct = g.time - g.cycle * RUN_LEN;
    this._tlFill.style.width = (clamp(ct / RUN_LEN, 0, 1) * 100).toFixed(2) + "%";
    if (g.cycle !== this._cyc) {
      this._cyc = g.cycle;
      const tag = $("cycTag");
      tag.hidden = g.cycle < 1;
      tag.textContent = t("КРУГ {0}", g.cycle + 1);
      this._tlNext = -2;                        // после смены круга метки пересчитываем
    }
    /* классы трогаем только когда ближайший босс сменился */
    let next = -1;
    for (let i = 0; i < this._marks.length; i++) if (ct < this._marks[i].t) { next = i; break; }
    if (next === this._tlNext) return;
    this._tlNext = next;
    for (let i = 0; i < this._mEls.length; i++) {
      this._mEls[i].classList.toggle("past", ct >= this._marks[i].t);
      this._mEls[i].classList.toggle("next", i === next);
    }
  },

  /* стойка всегда показывает все слоты: занятые и пустые под рамкой */
  syncRack() {
    const p = g.p;
    if (!p) return;
    let hw = "";
    for (let i = 0; i < MAX_WEAPONS; i++) {
      const w = p.weapons[i];
      if (!w) { hw += '<div class="slot empty"></div>'; continue; }
      const def = WEAPONS[w.id];
      const ready = def.evoTo && w.lvl >= def.max && (p.passives[def.evoNeed] || 0) >= 4;
      hw += '<div class="slot' + (def.evolved ? " evo" : "") + (ready ? " evoready" : "") + '">' +
        svg(ICONS[def.ico], def.color) +
        '<span class="nm">' + def.name + "</span>" +
        (def.evolved ? '<span class="pips"><i class="f"></i><i class="f"></i><i class="f"></i></span>'
          : '<span class="pips">' + pips(w.lvl, def.max) + "</span>") +
        "</div>";
    }
    let hp = "";
    const pids = Object.keys(p.passives);
    for (let i = 0; i < MAX_PASSIVES; i++) {
      const id = pids[i];
      if (!id) { hp += '<div class="slot empty"></div>'; continue; }
      const def = PASSIVES[id];
      hp += '<div class="slot pas">' + svg(ICONS[def.ico], def.color) +
        '<span class="nm">' + def.name + "</span>" +
        '<span class="pips">' + pips(p.passives[id], def.max) + "</span></div>";
    }
    $("rackW").innerHTML = hw;
    $("rackP").innerHTML = hp;
  },

  showPause() {
    const p = g.p;
    $("questPause").innerHTML = g.quests.length
      ? g.quests.map(q => this.questRow(q)).join("") : "";
    if (p) {
      const pct = v => Math.round(v * 100) + "%";
      const rows = [
        [t("Урон"), "×" + p.dmgMul.toFixed(2)],
        [t("Откат"), "−" + Math.round((1 - p.cdMul) * 100) + "%"],
        [t("Площадь"), "×" + p.areaMul.toFixed(2)],
        [t("Длительность"), "×" + p.durMul.toFixed(2)],
        [t("Скорость"), Math.round(p.speed) + t(" px/с")],
        [t("Броня"), "−" + p.armor.toFixed(0)],
        [t("Регенерация"), p.regen.toFixed(1) + t("/с")],
        [t("Радиус сбора"), Math.round(p.pickR) + " px"],
        [t("Добыча"), "×" + p.greedMul.toFixed(2)],
        [t("Опыт"), "×" + p.xpMul.toFixed(2)],
        [t("Снарядов"), "+" + p.countBonus],
        [t("Урон ульты"), "×" + p.ultMul.toFixed(2)],
        [t("Удача"), "+" + pct(p.luck)]
      ];
      $("pauseStats").innerHTML = rows.map(r => "<div><span>" + r[0] + "</span><b>" + r[1] + "</b></div>").join("");
    } else $("pauseStats").innerHTML = "";
    this.show("pause");
  },

  /* ---- задания забега ---- */
  questRow(q, cls) {
    const pct = Math.round(q.have / q.goal * 100);
    /* полторы секунды после выполнения строка горит — это видно боковым зрением */
    const fresh = q.done && q.doneAt != null && g.time - q.doneAt < 1.6;
    return '<div class="qrow' + (q.done ? " done" : "") + (fresh ? " fresh" : "") + (cls || "") + '" style="border-left-color:' + q.color + '">' +
      q.icon +
      '<span class="qt"><span class="qn">' + q.label + " " + q.name + "</span>" +
      '<span class="qbar"><i style="width:' + pct + '%;background:' + q.color + '"></i></span></span>' +
      '<span class="qv">' + (q.done ? "✔" : q.have + "/" + q.goal) + "</span></div>";
  },
  /* ключ строки включает флаг вспышки — иначе она осталась бы висеть
     до следующего изменения прогресса */
  qkey(q) {
    const fresh = q.done && q.doneAt != null && g.time - q.doneAt < 1.6;
    return q.have + "/" + q.done + "/" + (fresh ? 1 : 0);
  },
  buildQuests() {
    if (!g.quests.length) { $("quests").innerHTML = ""; return; }
    this._qcache = g.quests.map(q => this.qkey(q));
    $("quests").innerHTML = g.quests.map(q => this.questRow(q)).join("");
  },
  /* задание закрылось в момент, когда панель спрятана заставкой —
     показываем её досрочно, чтобы вспышку было куда положить */
  flashQuest() {
    if ($("questIntro").classList.contains("on")) {
      $("questIntro").classList.remove("on");
      $("quests").style.opacity = "";
    }
    this.buildQuests();
  },
  syncQuests() {
    if (!g.quests.length) return;
    const now = g.quests.map(q => this.qkey(q));
    if (this._qcache && now.join("|") === this._qcache.join("|")) return;  // без нужды DOM не трогаем
    this.buildQuests();
  },
  showQuestIntro() {
    if (!g.quests.length) return;
    $("questIntroRow").innerHTML = g.quests.map(q =>
      '<div class="qi-card" style="border-left-color:' + q.color + '">' + q.icon +
      '<span class="qi-t"><span class="qi-l">' + q.label + "</span>" +
      '<span class="qi-n">' + q.name + (q.kind === "kill" ? " ×" + q.goal : "") + "</span>" +
      '<span class="qi-r">+' + cur(q.reward) + "</span></span></div>").join("");
    const el = $("questIntro");
    el.classList.remove("on");
    void el.offsetWidth;                       // перезапуск анимации
    el.classList.add("on");
    /* пока задания показываются крупно, угловая панель прячется —
       иначе заставка наезжает на неё и обе читаются плохо */
    $("quests").style.opacity = "0";
    clearTimeout(this._qiT);
    this._qiT = setTimeout(() => {
      el.classList.remove("on");
      $("quests").style.opacity = "";
    }, 3400);
  },

  syncSkill() {
    const p = g.p;
    if (!p) return;
    const ab = ABILITIES[p.ability];
    $("skillIco").innerHTML = svg(ICONS[ab.ico], ab.color);
    $("skillName").textContent = ab.name;
    $("skillPips").innerHTML = pips(p.abLvl, ab.max);
    $("ultKey").textContent = ab.ult.short + t(" · ПКМ");
    $("tSkillName").textContent = ab.name.toUpperCase();
  },

  /* ---- выбор арены ---- */
  showArenas() {
    const row = $("arenaRow");
    row.innerHTML = "";
    ARENAS.forEach((ar, i) => {
      const open = arenaUnlocked(i);
      const done = save.arenaDone.indexOf(ar.id) >= 0;
      const mods = arenaMods(ar.id);
      const anyMod = done && (mods.hyper || mods.endless);
      /* карточка — div, а не button: внутри живут свои кнопки-галочки,
         а кнопка в кнопке ломает и разметку, и клавиатуру */
      const el = document.createElement("div");
      el.className = "arena" + (open ? "" : " lock") + (done ? " done" : "") +
        (anyMod ? " modded" : "") + (save.arena === i && open ? " sel" : "");
      el.style.setProperty("--ac", ar.accent);
      if (open) { el.tabIndex = 0; el.setAttribute("role", "button"); }
      const mobs = ar.roster.slice(0, 4).map(id => ENEMY_BY_ID[id])
        .filter(Boolean).map(d => '<i style="color:' + d.color + '"></i>').join("");
      const last = i === ARENAS.length - 1;
      /* галочки появляются только на пройденной арене */
      const modBox = !done ? "" : '<span class="amods">' + ARENA_MODS.map(m =>
        '<button class="mod' + (mods[m.id] ? " on" : "") + '" data-m="' + m.id +
        '" title="' + m.d + '"><span class="box"></span><b>' + m.short + "</b>" + m.name +
        "</button>").join("") + "</span>";
      const hint = anyMod ? '<span class="modhint">' +
        ARENA_MODS.filter(m => mods[m.id]).map(m => m.short + " " + m.d).join("<br>") + "</span>" : "";
      el.innerHTML =
        '<span class="tag">' + ar.tag + "</span>" +
        '<span class="nm">' + ar.name + "</span>" +
        '<span class="ds">' + (open ? ar.d : t("Закрой «{0}», чтобы попасть сюда.", ARENAS[i - 1].name)) + "</span>" +
        '<span class="mt"><span>' + t("Сложность") + ' <b>×' + (ar.mult * (mods.hyper && done ? ARENA_MODS[0].hp : 1)).toFixed(2) + "</b></span>" +
        "<span>" + t("Боссов") + " <b>" + BOSSES.filter(b => b.arena === i).length + "</b></span>" +
        "<span>" + (mods.endless && done ? "<b>" + t("Без Жнеца") + "</b>" : last ? "<b>" + t("Финал игры") + "</b>" : t("Финал") + " <b>" + t("Жнец") + "</b>") + "</span>" +
        '<span class="prev">' + mobs + "</span></span>" + modBox + hint;
      if (done) el.querySelectorAll(".mod").forEach(b => b.addEventListener("click", e => {
        e.stopPropagation();                    // щелчок по галочке не стартует арену
        this.toggleMod(ar.id, b.dataset.m);
      }));
      if (open) {
        el.addEventListener("click", () => this.pickArena(i));
        el.addEventListener("keydown", e => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.pickArena(i); }
        });
      }
      row.appendChild(el);
    });
    this.syncBoard();
    this.show("arena");
    setTimeout(() => { const b = row.querySelector(".arena:not(.lock)"); if (b) b.focus(); }, 30);
  },
  toggleMod(arenaId, modId) {
    const m = save.mods[arenaId] || (save.mods[arenaId] = {});
    m[modId] = !m[modId];
    if (modId === "endless" && m.endless) this.lbArena = arenaId;
    writeSave();
    Sfx.init(); Sfx.resume(); Sfx.pick();
    this.showArenas();
  },

  /* ---- таблица рекордов бесконечности ----
     Видна, пока хоть на одной пройденной арене стоит «Бесконечность».
     Вкладки — все арены, где бесконечность вообще доступна. */
  syncBoard() {
    const panel = $("lbPanel");
    const avail = ARENAS.filter((a, i) => modsAllowed(i));
    const on = avail.filter(a => arenaMods(a.id).endless);
    if (!on.length) { panel.hidden = true; return; }
    if (!this.lbArena || !avail.some(a => a.id === this.lbArena))
      this.lbArena = (on.find(a => ARENAS.indexOf(a) === save.arena) || on[0]).id;
    panel.hidden = false;
    $("lbTabs").innerHTML = avail.map(a =>
      '<button data-a="' + a.id + '" style="--ac:' + a.accent + '"' +
      (a.id === this.lbArena ? ' class="on"' : "") + ">" + a.name + "</button>").join("");
    $("lbTabs").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      this.lbArena = b.dataset.a;
      Sfx.pick();
      this.syncBoard();
    }));
    this.renderBoard(this.lbArena);
  },
  async renderBoard(arenaId) {
    const body = $("lbBody"), foot = $("lbFoot");
    const pb = Platform.personalBest(arenaId);
    const mine = save.records[arenaId] || [];
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const row = (rank, name, score, me, ava) =>
      '<div class="lbrow' + (rank <= 3 ? " r" + rank : "") + (me ? " me" : "") + '">' +
      '<span class="rk">#' + rank + "</span>" +
      '<span class="av">' + (ava ? '<img src="' + esc(ava) + '" alt="">' : esc((name || "?").charAt(0).toUpperCase())) + "</span>" +
      '<span class="nm">' + esc(name || t("Игрок скрыт")) + "</span>" +
      '<span class="sc">' + fmtTime(score) + "</span></div>";

    /* без SDK — честно говорим, где живёт общая таблица, и показываем свои */
    if (!Platform.yandex) {
      body.innerHTML = mine.length
        ? mine.map((v, i) => row(i + 1, t("Ты"), v, true, "")).join("")
        : '<div class="lbmsg">' + t("Здесь пока пусто. Включи «Бесконечность» и продержись подольше.") + "</div>";
      foot.innerHTML = "<span>" + t("Общая таблица игроков — в версии на Яндекс Играх. Тут твои лучшие забеги.") + "</span>";
      return;
    }
    body.innerHTML = '<div class="lbmsg">' + t("Загружаю таблицу…") + "</div>";
    const data = await Platform.board(arenaId);
    if (this.lbArena !== arenaId) return;              // пока грузилось, переключили вкладку
    if (!data.ok) {
      body.innerHTML = '<div class="lbmsg">' + t("Таблица сейчас недоступна. Попробуй чуть позже.") + "</div>";
    } else if (!data.rows.length) {
      body.innerHTML = '<div class="lbmsg">' + t("Рекордов пока нет — стань первым.") + "</div>";
    } else {
      /* топ, а ниже — своя строка, если сам в топ не попал */
      const top = data.rows.filter(r => r.rank <= LB_TOP);
      const rest = data.rows.filter(r => r.rank > LB_TOP && r.me);
      body.innerHTML = top.map(r => row(r.rank, r.name, r.score, r.me, r.avatar)).join("") +
        (rest.length ? '<div class="lbgap">⋯</div>' + rest.map(r => row(r.rank, r.name, r.score, true, r.avatar)).join("") : "");
    }
    foot.innerHTML = Platform.authorized
      ? "<span>" + t("Твой рекорд:") + " <b>" + (pb ? fmtTime(pb) : "—") + "</b>" +
        (data.ok && data.userRank ? " · " + t("место") + " <b>#" + data.userRank + "</b>" : "") + "</span>"
      : "<span>" + t("Твой рекорд:") + " <b>" + (pb ? fmtTime(pb) : "—") + '</b></span><span class="sp"></span>' +
        "<span>" + t("Войди, чтобы попасть в таблицу и сохранять прогресс на всех устройствах") + "</span>" +
        '<button id="bLbLogin">' + t("Войти через Яндекс") + "</button>";
    const lb = $("bLbLogin");
    if (lb) lb.addEventListener("click", () => this.login());
  },
  pickArena(i) {
    if (!arenaUnlocked(i)) return;
    save.arena = i;
    writeSave();
    Sfx.pick();
    this.showClassPick();
  },

  /* ---- достижения ---- */
  achFilter: { st: "all", rar: -1 },
  buildAchFilters() {
    const f = this.achFilter;
    const got = id => save.ach.indexOf(id) >= 0;
    const nGot = ACHIEVEMENTS.filter(a => got(a.id)).length;
    let h = "";
    const btn = (key, val, label, count, color) =>
      '<button data-k="' + key + '" data-v="' + val + '"' +
      (f[key] === val ? ' class="on"' : "") +
      (color ? ' style="--rr:' + color + '"' : "") + ">" + label +
      (count == null ? "" : "<i>" + count + "</i>") + "</button>";
    h += btn("st", "all", t("Все"), ACHIEVEMENTS.length);
    h += btn("st", "got", t("Получено"), nGot);
    h += btn("st", "left", t("Закрыто"), ACHIEVEMENTS.length - nGot);
    h += '<span class="sep"></span>';
    h += btn("rar", -1, t("Любая"));
    ACH_RARITY.forEach((r, i) =>
      h += btn("rar", i, r.name, ACHIEVEMENTS.filter(a => a.rar === i).length, r.color));
    $("achFilters").innerHTML = h;
    $("achFilters").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.k;
      f[k] = k === "rar" ? +b.dataset.v : b.dataset.v;
      Sfx.init(); Sfx.resume(); Sfx.pick();
      this.buildAch();
    }));
  },
  buildAch() {
    const grid = $("achGrid");
    this.buildAchFilters();
    const f = this.achFilter;
    /* сначала полученные, дальше по редкости — список читается как витрина */
    const list = ACHIEVEMENTS.slice().sort((a, b) => {
      const ga = save.ach.indexOf(a.id) >= 0, gb = save.ach.indexOf(b.id) >= 0;
      if (ga !== gb) return ga ? -1 : 1;
      return a.rar - b.rar;
    }).filter(a => {
      const got = save.ach.indexOf(a.id) >= 0;
      if (f.st === "got" && !got) return false;
      if (f.st === "left" && got) return false;
      return f.rar < 0 || a.rar === f.rar;
    });
    $("achBarFill").style.width = (save.ach.length / ACHIEVEMENTS.length * 100).toFixed(1) + "%";
    if (!list.length) {
      grid.innerHTML = '<div class="none">' + t("Под этот фильтр ничего не подходит.") + "</div>";
      $("achCount").textContent = save.ach.length + " / " + ACHIEVEMENTS.length;
      return;
    }
    grid.innerHTML = list.map(a => {
      const got = save.ach.indexOf(a.id) >= 0;
      const r = ACH_RARITY[a.rar];
      return '<div class="achit ' + (got ? "got" : "locked") + '" style="--rar:' + r.color + '">' +
        svg(ICONS[a.ico], got ? r.color : "#4a5573") +
        '<span class="tx"><span class="nm">' + a.name + "</span>" +
        '<span class="sub">' + a.d + "</span></span>" +
        '<span class="rr">' + r.name + "</span></div>";
    }).join("");
    $("achCount").textContent = save.ach.length + " / " + ACHIEVEMENTS.length;
    $("achBarFill").style.width = (save.ach.length / ACHIEVEMENTS.length * 100).toFixed(1) + "%";
  },

  /* всплывашка в углу: по одной за раз, очередь не глотается */
  achPop(a) {
    this.achQ.push(a);
    this.achNext();
  },
  achNext() {
    if (this.achBusy || !this.achQ.length) return;
    const a = this.achQ.shift();
    const r = ACH_RARITY[a.rar];
    const el = $("achPop");
    el.style.setProperty("--rar", r.color);
    $("achIco").innerHTML = svg(ICONS[a.ico], r.color);
    $("achRar").textContent = t("{0} достижение", r.name);
    $("achName").textContent = a.name;
    $("achDesc").textContent = a.d;
    el.classList.remove("on");
    void el.offsetWidth;                       // перезапуск анимации
    el.classList.add("on");
    this.achBusy = true;
    Sfx.ach();
    clearTimeout(this._achT);
    this._achT = setTimeout(() => {
      el.classList.remove("on");
      this.achBusy = false;
      this.achNext();
    }, 4700);
  },

  /* выбор активной способности перед стартом забега */
  showClassPick() {
    const row = $("classRow");
    row.innerHTML = "";
    ABILITY_LIST.forEach((id, i) => {
      const ab = ABILITIES[id];
      const el = document.createElement("button");
      el.className = "card" + (save.ability === id ? " sel" : "");
      el.innerHTML =
        '<div class="top">' + svg(ICONS[ab.ico], ab.color) +
        '<div><div class="role">' + ab.role + '</div><div class="nm">' + ab.name + "</div></div></div>" +
        '<div class="desc">' + ab.text + ' <b style="color:' + ab.color + '">' + ab.hint + "</b><br><br>" +
        '<span style="color:var(--gold)">' + t("Ульта") + " · " + ab.ult.name + ":</span> " + ab.ult.text + "</div>" +
        '<div class="foot"><span class="cd">' + t("ЗАРЯД {0} С · ДО УР. {1}", ab.s(1).cd.toFixed(1), ab.max) + '</span>' +
        '<span class="key">' + (i + 1) + "</span></div>";
      el.addEventListener("click", () => this.pickClass(id));
      row.appendChild(el);
    });
    this.show("class");
    setTimeout(() => { const b = row.firstChild; if (b) b.focus(); }, 30);
  },
  pickClass(id) {
    save.ability = id;
    writeSave();
    Sfx.init(); Sfx.resume(); Sfx.pick();
    startRun();
  },

  rememberOn() {
    return $("remember").classList.contains("on") && $("rememberBox").checked;
  },

  showCards(cards) {
    this.cards = cards;
    $("luLvl").textContent = g.p.level;
    /* галочка нужна только на экране с двумя запасными картами */
    const spares = onlySpares(cards);
    $("remember").classList.toggle("on", spares);
    if (spares) $("rememberBox").checked = !!g.autoPick;
    const row = $("cardRow");
    row.innerHTML = "";
    cards.forEach((c, i) => {
      const def = c.def;
      const el = document.createElement("button");
      /* рамка по редкости: чем реже предмет, тем заметнее */
      const rw = c.kind === "wup" || c.kind === "wnew" ? RARITY.w[c.w ? c.w.base : c.id]
        : c.kind === "pup" || c.kind === "pnew" ? RARITY.p[c.id] : null;
      const tier = rw == null ? "" : rw >= 90 ? " rare-1" : rw >= 60 ? " rare-2" : " rare-3";
      el.className = "card" + (c.kind === "wnew" || c.kind === "pnew" ? " new" : "") +
        (c.kind === "pup" || c.kind === "pnew" ? " pas" : "") + tier +
        (canBanish(c) ? " canban" : "");
      const kind = c.kind === "wnew" ? t("Новое оружие")
          : c.kind === "wup" ? t("Оружие · ур. {0}", c.w.lvl + 1)
            : c.kind === "abup" ? t("Способность · ур. {0}", c.lvl + 1)
              : c.kind === "pnew" ? t("Новый навык")
                : c.kind === "pup" ? t("Навык · ур. {0}", c.lvl + 1)
                  : t("Находка");
      let desc = def.text;
      if (c.kind === "wup" && def.up) desc = def.text + " <b style='color:" + def.color + "'>" + def.up(c.w.lvl + 1) + "</b>";
      if (c.kind === "abup") desc = def.text + " <b style='color:" + def.color + "'>" + def.up(c.lvl + 1) + "</b>";
      if (c.kind === "pup" || c.kind === "pnew") desc = def.text + " <b style='color:" + def.color + "'>" + t("Итого:") + " " + def.val(c.lvl + 1) + "</b>";
      let foot = "";
      if (c.kind === "wup") foot = '<span class="pips">' + pips(c.w.lvl + 1, def.max) + "</span>";
      else if (c.kind === "abup" || c.kind === "pup" || c.kind === "pnew") foot = '<span class="pips">' + pips(c.lvl + 1, def.max) + "</span>";
      el.innerHTML =
        '<div class="top">' + svg(ICONS[def.ico], def.color) +
        '<div><div class="kind">' + kind + '</div><div class="nm">' + def.name + "</div></div></div>" +
        '<div class="desc">' + desc + "</div>" +
        '<div class="foot">' + foot + '<span class="key">' + (i + 1) + "</span></div>" +
        (canBanish(c) ? '<span class="ban" title="' + t("Изгнать до конца забега") + '">✕</span>' : "");
      el.addEventListener("click", ev => {
        if (ev.target.classList.contains("ban")) { ev.stopPropagation(); banishCard(c); return; }
        takeCard(c);
      });
      row.appendChild(el);
    });
    const bh = $("banishHint");
    bh.classList.toggle("on", g.banishes > 0 && !spares);
    $("banishLeft").textContent = g.banishes;
    const rr = $("rerollBtn");
    rr.classList.toggle("on", g.rerolls > 0 && !spares);
    $("rerollLeft").textContent = g.rerolls;
    this.show("level");
    setTimeout(() => { const b = row.firstChild; if (b) b.focus(); }, 30);
  },
  hideCards() { this.hideAll(); },

  showEnd(won, s) {
    this.leavePlay();
    $("endEyebrow").textContent = won ? t("Забег закрыт") : t("Забег окончен");
    $("endTitle").textContent = won ? t("Ты дожил до рассвета") : t("Ты проиграл");
    const rows = [
      [t("Продержался"), fmtTime(s.time)],
      [t("Убито"), fmtNum(s.kills)],
      [t("Уровень"), s.level],
      [t("Собрано осколков"), fmtNum(s.gold)],
      [t("Премия за боссов"), fmtNum(s.bonus)],
      [t("Премия за задания"), fmtNum(s.quests)],
      [t("Множитель добычи"), "×" + s.greed.toFixed(2)]
    ];
    if (s.cycle > 0) rows.splice(1, 0, [t("Кругов пройдено"), s.cycle]);
    if (s.mods > 1.001) rows.push([t("Модификаторы арены"), "×" + s.mods.toFixed(2)]);
    if (s.crits) rows.splice(3, 0, [t("Пробоев брони"), fmtNum(s.crits)]);
    if (won) rows.push([t("Бонус за победу"), "×1.50"]);
    let h = "";
    for (const r of rows) h += '<div class="l">' + r[0] + '</div><div class="v">' + r[1] + "</div>";
    h += "<hr>";
    h += '<div class="l tot">' + t("Итого осколков") + '</div><div class="v tot">+' + cur(s.total) + "</div>";
    $("endTbl").innerHTML = h;
    /* бесконечность: показываем личный рекорд и куда ушёл результат */
    const rec = $("endRec");
    rec.hidden = !s.endless;
    if (s.endless && s.rec) {
      rec.innerHTML = (s.rec.best ? '<span class="new">' + t("НОВЫЙ РЕКОРД") + "</span>" : "") +
        "<span>" + t("Рекорд бесконечности:") + " <b>" + fmtTime(Math.max(s.time, s.rec.prev)) + "</b></span>" +
        (Platform.yandex
          ? "<span>" + (Platform.authorized ? t("· результат отправлен в таблицу") : t("· войди через Яндекс, чтобы попасть в таблицу")) + "</span>"
          : "");
    }
    /* реклама за награду — только на Яндексе и только если есть что удваивать;
       размер настраивается флагом reward_mul */
    this._reward = Math.round(s.total * REMOTE.rewardMul);
    const rb = $("bReward");
    rb.hidden = !Platform.yandex || this._reward <= 0;
    rb.disabled = false;
    rb.innerHTML = t("Смотреть рекламу: ещё +") + cur(this._reward);
    this.buildRunAch(s.ach);
    this.buildBreakdown();
    this.show("end");
    this.syncShards();
  },
  showRevive() {
    $("bRevive").disabled = false;
    this.show("revive");
  },
  watchRevive() {
    const b = $("bRevive");
    if (b.disabled || g.state !== "revive") return;
    b.disabled = true;
    Platform.rewarded(() => { this._revived = true; }, got => {
      if (got && this._revived) { this._revived = false; adRevive(); }
      else b.disabled = false;       // закрыл раньше — можно попробовать ещё раз или сдаться
    });
  },
  giveUp() {
    if (g.state !== "revive") return;
    endRun(g.won);
  },
  claimReward() {
    const rb = $("bReward");
    if (rb.disabled || !this._reward) return;
    rb.disabled = true;
    const amount = this._reward;
    Platform.rewarded(() => {
      save.shards += amount;
      save.total.earned += amount;
      writeSave();
      Platform.pushCloud(true);
    }, got => {
      if (got) {
        this._reward = 0;
        rb.innerHTML = t("Награда получена: +") + cur(amount);
        this.toast(t("+{0} ОСКОЛКОВ", fmtNum(amount)));
        Sfx.coin();
        this.syncShards();
      } else rb.disabled = false;   // закрыл раньше времени — кнопка снова доступна
    });
  },
  async login() {
    const ok = await Platform.login();
    this.syncShards();
    if (ok) this.toast(t("ВХОД ВЫПОЛНЕН"));
    if (this.current === "arena") this.showArenas();
  },

  /* что открылось именно за этот забег: всплывашки в бою легко пропустить */
  buildRunAch(ids) {
    const box = $("endAch");
    const list = (ids || []).map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean);
    box.classList.toggle("on", list.length > 0);
    if (!list.length) { box.innerHTML = ""; return; }
    box.innerHTML = '<div class="eh">' + t("Достижений за забег: {0}", list.length) + "</div>" +
      '<div class="er">' + list.map(a => {
        const r = ACH_RARITY[a.rar];
        return '<div class="ea" style="--rar:' + r.color + '">' + svg(ICONS[a.ico], r.color) +
          '<span class="t"><span class="r">' + r.name + "</span>" +
          '<span class="n">' + a.name + "</span></span></div>";
      }).join("") + "</div>";
  },

  /* разбор забега: сколько урона и убийств принесло каждое оружие */
  buildBreakdown() {
    const rows = [];
    for (const id in g.stats) {
      const s = g.stats[id];
      if (s.dmg < 1 && !s.kills) continue;
      rows.push({ name: s.name || id, dmg: s.dmg, kills: s.kills, ab: id.indexOf("ab:") === 0 });
    }
    rows.sort((a, b) => b.dmg - a.dmg);
    const box = $("endBreak");
    if (!rows.length) { box.innerHTML = ""; return; }
    const total = rows.reduce((s, r) => s + r.dmg, 0) || 1;
    let h = '<div class="bhead"><span>' + t("Источник") + "</span><span>" + t("Урон") + "</span><span>" + t("Доля") + "</span><span>" + t("Убийств") + "</span></div>";
    for (const r of rows) {
      const pct = r.dmg / total * 100;
      h += '<div class="brow' + (r.ab ? " ab" : "") + '">' +
        '<span class="bn">' + r.name + "</span>" +
        '<span class="bv">' + fmtNum(r.dmg) + "</span>" +
        '<span class="bp"><i style="width:' + pct.toFixed(1) + '%"></i><em>' + pct.toFixed(1) + "%</em></span>" +
        '<span class="bv">' + r.kills + "</span></div>";
    }
    box.innerHTML = h;
  },

  syncShards() {
    this.syncColCount();
    $("kShards").innerHTML = cur(save.shards);
    $("shopShards").innerHTML = cur(save.shards);
    $("charShards").innerHTML = cur(save.shards);
    $("kAch").textContent = save.ach.length + " / " + ACHIEVEMENTS.length;
    const ch = CHARS.find(c => c.id === save.char);
    $("kChar").textContent = ch ? ch.name : "—";
    this.buildDossier();
  },

  /* Досье: то же сохранение, но в лицо — иначе главное меню было просто
     столбиком кнопок, а цифры прятались по вложенным экранам. */
  buildDossier() {
    const prof = $("mProfile");
    prof.hidden = !Platform.yandex;
    if (Platform.yandex) {
      const auth = Platform.authorized;
      prof.classList.toggle("on", auth);
      $("pName").textContent = auth ? (Platform.name || t("Игрок")) : t("Гость");
      $("pSub").textContent = auth
        ? t("Прогресс в облаке Яндекса — доступен на всех устройствах")
        : t("Войди, чтобы сохранять прогресс на всех устройствах и попасть в таблицу рекордов");
      $("pAva").innerHTML = auth && Platform.avatar ? '<img src="' + Platform.avatar + '" alt="">'
        : (auth ? (Platform.name || "И").charAt(0).toUpperCase() : "?");
      $("bLogin").hidden = auth;
    }
    const news = $("mNews");
    news.hidden = !REMOTE.news;
    news.textContent = REMOTE.news;
    $("mShards").innerHTML = cur(save.shards, "big");
    const tot = save.total;
    const rows = [
      [t("Забегов"), fmtNum(save.runs)],
      [t("Побед"), fmtNum(save.wins)],
      [t("Лучшее время"), save.best ? fmtTime(save.best) : "—"],
      [t("Макс. уровень"), fmtNum(save.bestLevel || 0)],
      [t("Убийств всего"), fmtNum(tot.kills)],
      [t("Боссов"), fmtNum(tot.bosses)]
    ];
    $("mStats").innerHTML = rows.map(r =>
      "<div><span>" + r[0] + "</span><b>" + r[1] + "</b></div>").join("");
    $("mArenas").innerHTML = ARENAS.map((ar, i) => {
      const open = arenaUnlocked(i), done = save.arenaDone.indexOf(ar.id) >= 0;
      const m = arenaMods(ar.id);
      const marks = done ? ARENA_MODS.filter(x => m[x.id]).map(x => x.short).join(" ") : "";
      return '<div class="' + (done ? "done" : open ? "" : "lock") + '" style="--ac:' + ar.accent + '">' +
        '<span class="an">' + ar.name + "</span>" +
        (marks ? '<span class="mk">' + marks + "</span>" : "") +
        '<span class="as">' + (done ? t("пройдена") : open ? t("открыта") : t("закрыта")) + "</span></div>";
    }).join("");
    $("bestTxt").textContent = save.beaten
      ? t("Игра пройдена. Первоисточник уничтожен.")
      : save.best ? t("Лучший результат: {0} · {1} убийств", fmtTime(save.best), fmtNum(save.bestKills))
        : t("Ни одного забега — самое время начать.");
  },

  buildShop() {
    const grid = $("shopGrid");
    grid.innerHTML = "";
    META.forEach(u => {
      const lvl = metaLvl(u.id);
      const max = lvl >= u.max;
      const cost = max ? 0 : u.cost(lvl);
      const poor = !max && save.shards < cost;
      const el = document.createElement("button");
      el.className = "up" + (max ? " max" : "") + (poor ? " poor" : "");
      el.disabled = max || poor;
      el.innerHTML = '<div class="h"><span class="nm">' + u.name + "</span>" +
        '<span class="cost">' + (max ? t("МАКС") : cur(cost, poor ? "mute" : "")) + "</span></div>" +
        '<div class="d">' + u.d(Math.min(u.max, lvl + (max ? 0 : 1))) + "</div>" +
        '<div class="lv"><span class="pips">' + pipsFlex(lvl, u.max) + "</span>" +
        '<span class="lvn">' + lvl + " / " + u.max + "</span></div>";
      el.addEventListener("click", () => {
        const l = metaLvl(u.id);
        if (l >= u.max) return;
        const c = u.cost(l);
        if (save.shards < c) return;
        save.shards -= c;
        save.meta[u.id] = l + 1;
        writeSave();
        Sfx.init(); Sfx.resume(); Sfx.coin();
        this.buildShop();
        this.syncShards();
      });
      grid.appendChild(el);
    });
  },

  /* коллекция: всё содержимое игры с отметкой «открыто» и условием */
  /* счётчик открытого для кнопки в меню — считает по тем же правилам */
  syncColCount() {
    let total = 0, got = 0;
    for (const id in WEAPONS) { if (WEAPONS[id].evolved) continue; total++; if (isUnlocked("w:" + id)) got++; }
    for (const id in PASSIVES) { total++; if (isUnlocked("p:" + id)) got++; }
    for (let i = 0; i < CHARS.length; i++) { total++; if (isUnlocked("c:" + CHARS[i].id)) got++; }
    $("kCol").textContent = got + " / " + total;
  },

  buildCollection() {
    const st = unlockStats();
    const unlockOf = id => UNLOCKS.find(x => x.id === id);
    const needOf = id => { const u = unlockOf(id); return u ? u.text : t("доступно сразу"); };
    const progOf = id => {
      const u = unlockOf(id);
      return u ? unlockProgress(u, st).text : "";
    };
    const item = (id, def, sub, extra) => {
      const open = isUnlocked(id);
      return '<div class="colit' + (open ? "" : " locked") + (extra || "") + '">' +
        svg(ICONS[def.ico], open ? def.color : "#4a5570") +
        '<span class="tx"><span class="nm">' + def.name + "</span>" +
        '<span class="sub">' + (open ? sub : needOf(id)) + "</span></span>" +
        '<span class="mark">' + (open ? "✓" : '<span class="prog">' + progOf(id) + "</span>") + "</span></div>";
    };

    let total = 0, got = 0, h = "";

    /* оружие: под каждым базовым — во что оно эволюционирует */
    let rows = "";
    for (const id in WEAPONS) {
      const def = WEAPONS[id];
      if (def.evolved) continue;
      total++; if (isUnlocked("w:" + id)) got++;
      const evo = def.evoTo ? WEAPONS[def.evoTo] : null;
      const sub = evo ? "→ " + evo.name + " · " + PASSIVES[def.evoNeed].name : t("без эволюции");
      rows += item("w:" + id, def, sub);
    }
    h += '<div class="colsec"><h3>' + t("Оружие") + '</h3><div class="colrow">' + rows + "</div></div>";

    rows = "";
    for (const id in PASSIVES) {
      const def = PASSIVES[id];
      total++; if (isUnlocked("p:" + id)) got++;
      rows += item("p:" + id, def, t("до ур. {0}", def.max));
    }
    h += '<div class="colsec"><h3>' + t("Импланты") + '</h3><div class="colrow">' + rows + "</div></div>";

    rows = "";
    for (let i = 0; i < CHARS.length; i++) {
      const c = CHARS[i];
      total++; if (isUnlocked("c:" + c.id)) got++;
      rows += item("c:" + c.id, { name: c.name, ico: WEAPONS[c.weapon].ico, color: WEAPONS[c.weapon].color },
        c.tag + " · " + WEAPONS[c.weapon].name);
    }
    h += '<div class="colsec"><h3>' + t("Операторы") + '</h3><div class="colrow">' + rows + "</div></div>";

    /* эволюции показываем отдельно: их не «открывают», их собирают в забеге */
    rows = "";
    for (const id in WEAPONS) {
      const def = WEAPONS[id];
      if (!def.evoTo) continue;
      const evo = WEAPONS[def.evoTo];
      rows += '<div class="colit evo">' + svg(ICONS[evo.ico], evo.color) +
        '<span class="tx"><span class="nm">' + evo.name + "</span>" +
        '<span class="sub">' + t("{0} макс. + {1} ур. 4", def.name, PASSIVES[def.evoNeed].name) + "</span></span>" +
        '<span class="mark" style="color:var(--gold)">✦</span></div>';
    }
    h += '<div class="colsec"><h3>' + t("Эволюции · собираются сундуком в забеге") + "</h3>" +
      '<div class="colrow">' + rows + "</div></div>";

    $("colGrid").innerHTML = h;
    $("colCount").textContent = got + " / " + total;
    $("kCol").textContent = got + " / " + total;
  },

  buildChars() {
    const grid = $("charGrid");
    grid.innerHTML = "";
    CHARS.forEach(c => {
      const need = UNLOCKS.find(u => u.id === "c:" + c.id);
      const opened = isUnlocked("c:" + c.id);
      const owned = opened && (c.price === 0 || (save.owned || []).indexOf(c.id) >= 0);
      const el = document.createElement("button");
      el.className = "chr" + (save.char === c.id ? " sel" : "");
      el.innerHTML = '<span class="tag">' + c.tag + "</span>" +
        '<span class="nm">' + c.name + "</span>" +
        '<span class="d">' + c.d + "</span>" +
        '<span class="d">' + t("Стартовый модуль:") + ' <b style="color:' + WEAPONS[c.weapon].color + '">' + WEAPONS[c.weapon].name + "</b></span>" +
        (owned ? '<span class="lock" style="color:var(--cyan)">' + (save.char === c.id ? t("◆ ВЫБРАН") : t("ДОСТУПЕН")) + "</span>"
          : !opened ? '<span class="lock">🔒 ' + (need ? need.text : t("ещё закрыт")) + "</span>"
            : '<span class="lock">🔒 ' + cur(c.price) + "</span>");
      el.addEventListener("click", () => {
        if (!opened) { this.toast(t("ЕЩЁ ЗАКРЫТО")); return; }
        if (owned) { save.char = c.id; Sfx.pick(); }
        else if (save.shards >= c.price) {
          save.shards -= c.price;
          save.owned = (save.owned || []).concat([c.id]);
          save.char = c.id;
          Sfx.evo();
          this.toast(t("НАНЯТ: {0}", c.name.toUpperCase()));
        } else { this.toast(t("НЕ ХВАТАЕТ ОСКОЛКОВ")); return; }
        writeSave();
        this.buildChars();
        this.syncShards();
      });
      grid.appendChild(el);
    });
  }
};

function pips(lvl, max) {
  let s = "";
  for (let i = 0; i < max; i++) s += '<i class="' + (i < lvl ? "f" : "") + '"></i>';
  return s;
}
function pipsFlex(lvl, max) {
  let s = "";
  for (let i = 0; i < max; i++) s += '<i class="' + (i < lvl ? "f" : "") + '"></i>';
  return s;
}

/* ---------- кнопки ----------------------------------------------------- */
function bind(id, fn) { $(id).addEventListener("click", fn); }
bind("rerollBtn", () => doReroll());
/* перед выбором способности теперь спрашиваем арену */
bind("bPlay", () => { Sfx.init(); Sfx.resume(); UI.showArenas(); });
bind("bArenaBack", () => UI.show("menu"));
bind("bAch", () => { UI.buildAch(); UI.show("ach"); });
bind("bAchBack", () => UI.show("menu"));
bind("bShop", () => { UI.buildShop(); UI.syncShards(); UI.show("shop"); });
bind("bChars", () => { UI.buildChars(); UI.syncShards(); UI.show("chars"); });
bind("bCollection", () => { UI.buildCollection(); UI.show("collection"); });
bind("bColBack", () => UI.show("menu"));
bind("bHelp", () => UI.show("help"));
bind("bHelpBack", () => UI.show("menu"));
bind("bShopBack", () => UI.show("menu"));
bind("bCharBack", () => UI.show("menu"));
bind("bResume", () => { g.state = "play"; UI.hideAll(); clearPressed(); });
bind("bQuit", () => {
  /* если забег уже засчитан (дожил до 15:00), выход из паузы закрывает его
     нормально — с осколками. Иначе это по-прежнему отказ без награды. */
  if (g.won) { g.state = "play"; endRun(true); return; }
  g.state = "menu"; g.p = null; UI.leavePlay(); UI.syncShards(); UI.show("menu");
});
/* между забегами — единственное место для полноэкранной рекламы:
   игрок сам нажал кнопку и ничего не теряет. Частоту режет платформа. */
function toMenu() { g.state = "menu"; g.p = null; UI.leavePlay(); UI.syncShards(); UI.show("menu"); }
bind("bAgain", () => Platform.interstitial(() => startRun()));
bind("bMenu", () => Platform.interstitial(toMenu));
bind("bReward", () => UI.claimReward());
document.querySelectorAll(".langsw button").forEach(b =>
  b.addEventListener("click", () => { Sfx.init(); Sfx.resume(); Sfx.pick(); I18N.choose(b.dataset.l); }));
bind("bRevive", () => UI.watchRevive());
bind("bGiveUp", () => UI.giveUp());
bind("bLogin", () => UI.login());

let wipeArmed = false;
bind("bWipe", () => {
  const b = $("bWipe");
  if (!wipeArmed) {
    wipeArmed = true;
    b.textContent = t("Точно? Нажми ещё раз");
    setTimeout(() => { wipeArmed = false; b.textContent = t("Сбросить прогресс"); }, 4000);
    return;
  }
  save = defaultSave();
  writeSave();
  wipeArmed = false;
  b.textContent = t("Сбросить прогресс");
  UI.buildShop();
  UI.syncShards();
  Platform.pushCloud(true);            // иначе облако вернуло бы старый прогресс
  UI.toast(t("ПРОГРЕСС СБРОШЕН"));
});

/* ---------- горячие клавиши ------------------------------------------- */
function hotkeys() {
  if (tookKey("m")) {
    const on = Sfx.toggle();
    save.sound = on; writeSave();
    UI.toast(on ? t("ЗВУК ВКЛ") : t("ЗВУК ВЫКЛ"));
  }
  const esc = tookKey("escape");
  const ent = tookKey("enter");
  switch (g.state) {
    case "menu":
      if (UI.current === "menu") { if (ent) { Sfx.init(); Sfx.resume(); UI.showArenas(); } }
      else if (UI.current === "arena") {
        if (esc) UI.show("menu");
        else for (let i = 0; i < ARENAS.length; i++)
          if (tookKey(String(i + 1))) { UI.pickArena(i); break; }
      }
      else if (UI.current === "class") {
        if (esc) UI.showArenas();
        else for (let i = 0; i < ABILITY_LIST.length; i++)
          if (tookKey(String(i + 1))) { UI.pickClass(ABILITY_LIST[i]); break; }
      }
      else if (esc) UI.show("menu");
      break;
    case "play":
      if (esc) { g.state = "pause"; UI.showPause(); }
      break;
    case "pause":
      if (esc || ent) { g.state = "play"; UI.hideAll(); clearPressed(); }
      break;
    case "levelup":
      if (tookKey("r")) { doReroll(); break; }
      for (let i = 0; i < 3; i++) if (tookKey(String(i + 1)) && UI.cards[i]) { takeCard(UI.cards[i]); break; }
      break;
    case "end":
      if (ent) Platform.interstitial(() => startRun());
      break;
    case "revive":
      if (ent) UI.watchRevive();
      else if (esc) UI.giveUp();
      break;
  }
}

/* ---------- главный цикл ---------------------------------------------- */
let lastT = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
  lastT = t;
  /* версия видна в меню, на паузе и в итогах, но не поверх боя */
  const showVer = g.state !== "play" && g.state !== "levelup";
  if (showVer !== UI._verShown) { UI._verShown = showVer; $("ver").hidden = !showVer; }
  /* реклама или платформенная пауза: мир стоит, картинка остаётся */
  const frozen = Platform.frozen;
  if (!frozen) hotkeys();
  if (g.state === "play" && g.p && !frozen) {
    update(dt);
    Sfx.music(dt, musicPush(), musicCfg());
    UI.syncHud();
  }
  /* выбор карты — тоже часть забега, а пауза, итоги и меню — нет */
  Platform.gameplay(!frozen && !!g.p && (g.state === "play" || g.state === "levelup"));
  render();
}
/* старт игры — в 06-platform.js: сначала ждём SDK и облачное сохранение
