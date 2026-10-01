/* ---------- 10. локализация: русский и английский ----------------------
   Исходный язык игры — русский, он прямо в коде. Английский накладывается
   поверх тремя способами:
     • t("русская строка", ...) — строки интерфейса из JS, ключ = сама строка;
     • EN_CONTENT — поля контента (оружие, враги, достижения…) подменяются
       на месте, так что остальной код читает def.name как раньше;
     • translateDom — статичная разметка: текстовые узлы ищутся в EN_UI.
   Язык выбирается автоматически (язык портала Яндекса или браузера, пункт
   2.14), а в меню есть ручной переключатель — выбор хранится в save.lang. */

/* языки, для которых показываем русскую версию */
const RU_LANGS = ["ru", "be", "kk", "uz", "ky", "tg"];

function t(key) {
  let s = I18N.lang === "en" && EN_UI[key] != null ? EN_UI[key] : key;
  for (let i = 1; i < arguments.length; i++) s = s.split("{" + (i - 1) + "}").join(arguments[i]);
  return s;
}

const I18N = {
  lang: "ru",
  detect() {
    if (save.lang === "ru" || save.lang === "en") return save.lang;
    const l = (Platform.yandex ? Platform.lang : (navigator.language || "ru")).slice(0, 2).toLowerCase();
    return RU_LANGS.indexOf(l) >= 0 ? "ru" : "en";
  },
  set(lang) {
    lang = lang === "en" ? "en" : "ru";
    const changed = lang !== this.lang;
    this.lang = lang;
    document.documentElement.lang = lang;
    applyContent(lang);
    translateDom(document.body);
    document.querySelectorAll(".langsw button").forEach(b =>
      b.classList.toggle("on", b.dataset.l === lang));
    if (changed && typeof UI !== "undefined") {
      UI.syncShards();
      if (g.p) { UI.syncSkill(); UI.syncRack(); }
    }
  },
  /* ручной выбор из меню — запоминается и побеждает автоопределение */
  choose(lang) {
    save.lang = lang;
    writeSave();
    this.set(lang);
  }
};

/* ---- статичная разметка ---- */
const _domOrig = new WeakMap();
function translateDom(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => {
      const p = n.parentNode;
      if (!p || p.closest && p.closest("script,style,[data-noi18n]")) return NodeFilter.FILTER_REJECT;
      return /\S/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    if (!_domOrig.has(n)) _domOrig.set(n, n.nodeValue);
    const orig = _domOrig.get(n);
    const key = orig.replace(/\s+/g, " ").trim();
    if (I18N.lang === "en" && EN_UI[key] != null) {
      const lead = orig.match(/^\s*/)[0], tail = orig.match(/\s*$/)[0];
      n.nodeValue = lead + EN_UI[key] + tail;
    } else n.nodeValue = orig;
  }
  root.querySelectorAll("[aria-label]").forEach(el => {
    if (!el.dataset.ruLabel) el.dataset.ruLabel = el.getAttribute("aria-label");
    const ru = el.dataset.ruLabel;
    el.setAttribute("aria-label", I18N.lang === "en" && EN_UI[ru] ? EN_UI[ru] : ru);
  });
}

/* ---- контент ----
   Русские значения сохраняются в __ru при первой подмене, обратный
   переход их возвращает. Вложенная ульта обрабатывается отдельно. */
function patchObj(obj, en, lang) {
  if (!obj || !en) return;
  if (!obj.__ru) {
    obj.__ru = {};
    for (const k in en) if (k !== "ult") obj.__ru[k] = obj[k];
  }
  for (const k in en) {
    if (k === "ult") { patchObj(obj.ult, en.ult, lang); continue; }
    obj[k] = lang === "en" ? en[k] : obj.__ru[k];
  }
}
function applyContent(lang) {
  const E = EN_CONTENT;
  for (const id in E.weapons) patchObj(WEAPONS[id], E.weapons[id], lang);
  for (const id in E.passives) patchObj(PASSIVES[id], E.passives[id], lang);
  for (const id in E.abilities) patchObj(ABILITIES[id], E.abilities[id], lang);
  ENEMIES.forEach(e => patchObj(e, E.enemies[e.id] && { name: E.enemies[e.id] }, lang));
  BOSSES.forEach(b => {
    const ru = b.__ru ? b.__ru.name : b.name;
    patchObj(b, E.bosses[ru] && { name: E.bosses[ru] }, lang);
  });
  ARENAS.forEach(a => patchObj(a, E.arenas[a.id], lang));
  ARENA_MODS.forEach(m => patchObj(m, E.mods[m.id], lang));
  ACH_RARITY.forEach((r, i) => patchObj(r, { name: E.rarity[i] }, lang));
  ACHIEVEMENTS.forEach(a => patchObj(a, E.ach[a.id], lang));
  META.forEach(m => patchObj(m, E.meta[m.id], lang));
  UNLOCKS.forEach(u => patchObj(u, E.unlocks[u.id], lang));
  CHARS.forEach(c => patchObj(c, E.chars[c.id], lang));
}

/* ---------------------------------------------------------------------
   Переводы. Ключи интерфейса — точные русские строки из t() и разметки:
   поменял русскую строку в коде — поменяй и ключ здесь. */
const EN_UI = {
  /* --- бой и тосты --- */
  "★ {0} ПОВЕРЖЕН": "★ {0} DEFEATED",
  "★ ПЕРВОИСТОЧНИК УНИЧТОЖЕН": "★ THE SOURCE IS DESTROYED",
  "НОЧЬ ПРОДОЛЖАЕТСЯ": "THE NIGHT GOES ON",
  "⚠ БОЛЬШАЯ ВОЛНА": "⚠ BIG WAVE",
  "★ ТЫ ДОЖИЛ ДО РАССВЕТА": "★ YOU MADE IT TO DAWN",
  "◈ КРУГ {0} · ВРАГИ КРЕПЧЕ": "◈ LAP {0} · ENEMIES TOUGHER",
  "Ремкомплект": "Repair Kit",
  "Восстановить 40 здоровья.": "Restore 40 health.",
  "Осколки": "Shards",
  "+25 осколков к добыче.": "+25 shards to your haul.",
  "РЕЗЕРВНАЯ КОПИЯ": "BACKUP COPY",
  "ВОСКРЕШЕНИЕ": "REVIVED",
  "Убей": "Kill",
  "Возьми": "Get",
  "Собери": "Build",
  "✔ ЗАДАНИЕ · +{0} ОСКОЛКОВ": "✔ OBJECTIVE · +{0} SHARDS",
  "ИЗГНАНО: {0}": "BANISHED: {0}",
  "★ ОТКРЫТО: {0}": "★ UNLOCKED: {0}",
  "{0} · ульта": "{0} · ult",
  "МАГНИТ": "MAGNET",
  "★ ЗОЛОТОЙ СУНДУК": "★ GOLDEN CHEST",
  "СУНДУК": "CHEST",
  "{0} с": "{0} s",
  "ЛКМ": "LMB",
  "КРУГ {0}": "LAP {0}",

  /* --- пауза: характеристики --- */
  "Урон": "Damage",
  "Откат": "Cooldown",
  "Площадь": "Area",
  "Длительность": "Duration",
  "Скорость": "Speed",
  " px/с": " px/s",
  "Броня": "Armor",
  "Регенерация": "Regeneration",
  "/с": "/s",
  "Радиус сбора": "Pickup radius",
  "Добыча": "Loot",
  "Опыт": "Experience",
  "Снарядов": "Projectiles",
  "Урон ульты": "Ult damage",
  "Удача": "Luck",
  " · ПКМ": " · RMB",

  /* --- арены и таблица рекордов --- */
  "Закрой «{0}», чтобы попасть сюда.": "Clear “{0}” to get here.",
  "Сложность": "Difficulty",
  "Боссов": "Bosses",
  "Без Жнеца": "No Reaper",
  "Финал игры": "Game finale",
  "Финал": "Finale",
  "Жнец": "Reaper",
  "Игрок скрыт": "Hidden player",
  "Ты": "You",
  "Здесь пока пусто. Включи «Бесконечность» и продержись подольше.": "Nothing here yet. Turn on “Endless” and hold out as long as you can.",
  "Общая таблица игроков — в версии на Яндекс Играх. Тут твои лучшие забеги.": "The shared leaderboard lives in the Yandex Games version. Here are your best runs.",
  "Загружаю таблицу…": "Loading leaderboard…",
  "Таблица сейчас недоступна. Попробуй чуть позже.": "The leaderboard is unavailable right now. Try again a bit later.",
  "Рекордов пока нет — стань первым.": "No records yet — be the first.",
  "Твой рекорд:": "Your best:",
  "место": "rank",
  "Войди, чтобы попасть в таблицу и сохранять прогресс на всех устройствах": "Sign in to get on the leaderboard and keep your progress on every device",
  "Войти через Яндекс": "Sign in with Yandex",

  /* --- достижения --- */
  "Все": "All",
  "Получено": "Earned",
  "Закрыто": "Locked",
  "Любая": "Any",
  "Под этот фильтр ничего не подходит.": "Nothing matches this filter.",
  "{0} достижение": "{0} achievement",

  /* --- карты и выбор способности --- */
  "Ульта": "Ult",
  "ЗАРЯД {0} С · ДО УР. {1}": "CHARGE {0} S · UP TO LV. {1}",
  "Новое оружие": "New weapon",
  "Оружие · ур. {0}": "Weapon · lv. {0}",
  "Способность · ур. {0}": "Ability · lv. {0}",
  "Новый навык": "New implant",
  "Навык · ур. {0}": "Implant · lv. {0}",
  "Находка": "Find",
  "Итого:": "Total:",
  "Изгнать до конца забега": "Banish for the rest of the run",

  /* --- итоги забега --- */
  "Забег закрыт": "Run cleared",
  "Забег окончен": "Run over",
  "Ты дожил до рассвета": "You made it to dawn",
  "Ты проиграл": "You lost",
  "Продержался": "Survived",
  "Убито": "Killed",
  "Уровень": "Level",
  "Собрано осколков": "Shards collected",
  "Премия за боссов": "Boss bonus",
  "Премия за задания": "Objective bonus",
  "Множитель добычи": "Loot multiplier",
  "Кругов пройдено": "Laps completed",
  "Модификаторы арены": "Arena modifiers",
  "Пробоев брони": "Armor breaches",
  "Бонус за победу": "Victory bonus",
  "Итого осколков": "Total shards",
  "НОВЫЙ РЕКОРД": "NEW RECORD",
  "Рекорд бесконечности:": "Endless record:",
  "· результат отправлен в таблицу": "· sent to the leaderboard",
  "· войди через Яндекс, чтобы попасть в таблицу": "· sign in with Yandex to get on the leaderboard",
  "Смотреть рекламу: ещё +": "Watch an ad: another +",
  "Награда получена: +": "Reward received: +",
  "+{0} ОСКОЛКОВ": "+{0} SHARDS",
  "Достижений за забег: {0}": "Achievements this run: {0}",
  "Источник": "Source",
  "Доля": "Share",
  "Убийств": "Kills",

  /* --- профиль и досье --- */
  "ВХОД ВЫПОЛНЕН": "SIGNED IN",
  "Игрок": "Player",
  "Гость": "Guest",
  "Прогресс в облаке Яндекса — доступен на всех устройствах": "Progress is in the Yandex cloud — available on every device",
  "Войди, чтобы сохранять прогресс на всех устройствах и попасть в таблицу рекордов": "Sign in to keep your progress on every device and get on the leaderboard",
  "Забегов": "Runs",
  "Побед": "Wins",
  "Лучшее время": "Best time",
  "Макс. уровень": "Max level",
  "Убийств всего": "Total kills",
  "пройдена": "cleared",
  "открыта": "open",
  "закрыта": "locked",
  "Игра пройдена. Первоисточник уничтожен.": "Game complete. The Source is destroyed.",
  "Лучший результат: {0} · {1} убийств": "Best result: {0} · {1} kills",
  "Ни одного забега — самое время начать.": "No runs yet — perfect time to start.",

  /* --- мастерская, коллекция, операторы --- */
  "МАКС": "MAX",
  "доступно сразу": "available from the start",
  "без эволюции": "no evolution",
  "Оружие": "Weapons",
  "до ур. {0}": "up to lv. {0}",
  "Импланты": "Implants",
  "Операторы": "Operators",
  "{0} макс. + {1} ур. 4": "{0} max + {1} lv. 4",
  "Эволюции · собираются сундуком в забеге": "Evolutions · assembled by a chest during a run",
  "Стартовый модуль:": "Starting module:",
  "◆ ВЫБРАН": "◆ SELECTED",
  "ДОСТУПЕН": "AVAILABLE",
  "ещё закрыт": "still locked",
  "ЕЩЁ ЗАКРЫТО": "STILL LOCKED",
  "НАНЯТ: {0}": "HIRED: {0}",
  "НЕ ХВАТАЕТ ОСКОЛКОВ": "NOT ENOUGH SHARDS",
  "Точно? Нажми ещё раз": "Sure? Press again",
  "Сбросить прогресс": "Reset progress",
  "ПРОГРЕСС СБРОШЕН": "PROGRESS RESET",
  "ЗВУК ВКЛ": "SOUND ON",
  "ЗВУК ВЫКЛ": "SOUND OFF",

  /* --- статичная разметка --- */
  "УБИЙСТВ": "KILLS",
  "ОСКОЛКИ": "SHARDS",
  "ВОЛНА": "WAVE",
  "РАЗГОН": "RUSH",
  "Задания на забег": "Run objectives",
  "РЫВОК": "DASH",
  "УЛЬТА": "ULT",
  "НАВЫК": "SKILL",
  "Забег начинается в полночь": "The run starts at midnight",
  "В полночь квартал уходит в офлайн, и неон остаётся один на один с тем, что выросло в его подсетях. Импланты стреляют сами — твоя работа продержаться пятнадцать минут.":
    "At midnight the quarter goes offline, and the neon is left alone with whatever grew in its subnets. Your implants fire on their own — your job is to last fifteen minutes.",
  "Начать забег": "Start run",
  "Мастерская": "Workshop",
  "Коллекция": "Collection",
  "Достижения": "Achievements",
  "Управление": "Controls",
  "Прогресс сохраняется в этом браузере": "Progress is saved in this browser",
  "Войти": "Sign in",
  "Досье оператора": "Operator dossier",
  "Осколков в банке": "Shards banked",
  "Арены": "Arenas",
  "Инструктаж": "Briefing",
  "Назад": "Back",
  "Постоянные улучшения": "Permanent upgrades",
  "Что уже добыто": "What you've found",
  "Куда идём": "Where to",
  "Арена": "Arena",
  "∞ Рекорды бесконечности": "∞ Endless records",
  "Что уже сделано": "What you've done",
  "Кто выходит на забег": "Who's heading out",
  "Способность на забег — выбери одну": "Ability for this run — pick one",
  "Бьёт по": "Fires on",
  "в сторону курсора ·": "toward the cursor ·",
  "назад": "back",
  "— выбери одно": "— pick one",
  "Крестик на карте — изгнать предмет до конца забега · осталось": "The cross on a card banishes that item for the rest of the run · left:",
  "Переброс": "Reroll",
  "Запомнить выбор и брать его дальше, пока не появится что-то новое": "Remember this choice and keep taking it until something new shows up",
  "Забег приостановлен": "Run paused",
  "Пауза": "Pause",
  "Продолжить": "Resume",
  "Бросить забег": "Abandon run",
  "Последний шанс": "Last chance",
  "Тебя погасили": "You got switched off",
  "Можно вернуться в бой: посмотри рекламу — и поднимешься с частью здоровья, а всё вокруг отбросит взрывом. Только один раз за забег.":
    "You can get back in the fight: watch an ad and you'll get up with part of your health while a blast throws everything around you back. Only once per run.",
  "Смотреть рекламу и воскреснуть": "Watch an ad and revive",
  "Завершить забег": "End run",
  "Ещё раз": "Again",
  "В меню": "Menu"
};

const EN_CONTENT = {
  weapons: {
    blade: { name: "Plasma Cutter", text: "An arc of searing plasma along your path. Cuts everyone caught in the sector.",
      up: l => "+" + (l === 2 ? "damage and arc" : l === 4 ? "swing speed" : l % 2 ? "damage" : "range") },
    vortex: { name: "Cyclotron", text: "The plasma cutter goes haywire: a full spin around you, no blind spots." },
    orbit: { name: "Drones", text: "Combat drones hold orbit and shred anything they can reach.",
      up: l => l % 2 ? "+damage" : "+1 drone" },
    swarmdrones: { name: "Swarm", text: "Eight drones on a wide orbit. Getting close to you is now lethal." },
    shotgun: { name: "Lasergun", text: "A fan of laser pulses at the nearest target. The beam pierces the first one.",
      up: l => l % 2 ? "+beam" : "+damage and fire rate" },
    flak: { name: "Prism", text: "The beam splits into eleven. A solid wall of light in front of you." },
    chain: { name: "Arc", text: "An electric arc hits the nearest enemy and jumps to its neighbours.",
      up: l => l % 2 ? "+damage" : "+1 jump" },
    storm: { name: "Ion Storm", text: "The arc never fades: eight jumps, and everyone hit is pulled toward you." },
    mines: { name: "Nanomines", text: "Scatters a swarm of charges behind you. They go off when anything else moves near them.",
      up: l => l % 2 ? "+damage" : "+blast radius" },
    minefield: { name: "Perimeter", text: "Charges drop three times as often and blow so hard the whole quarter hears it." },
    aura: { name: "Emitter", text: "A constant field around you burns anything that comes too close.",
      up: l => l % 2 ? "+damage" : "+radius" },
    reactor: { name: "Reactor", text: "The emitter runs at full power and patches you up while enemies burn." },
    missile: { name: "Missiles", text: "Homing charges fly at random targets and explode on impact.",
      up: l => l % 2 ? "+damage" : "+1 missile" },
    barrage: { name: "Barrage", text: "Five missiles in one salvo, no pauses. The quarter turns into fireworks." },
    flechette: { name: "Flechettes", text: "A stream of needles straight along your path. Hits often and pierces the first target.",
      up: l => l % 2 ? "+damage" : "+1 needle" },
    needlestorm: { name: "Downpour", text: "Needles come as a solid wall. Nothing ahead of you survives." },
    disc: { name: "Disc", text: "A saw flies into the nearest enemy and comes back, shredding everyone both ways.",
      up: l => l % 3 === 0 ? "+1 disc" : "+damage and range" },
    sawblade: { name: "Buzzsaw", text: "Three heavy blades, each flying farther and returning faster." },
    acid: { name: "Acid", text: "Spills corrosive puddles under your feet. They don't explode — they just eat away.",
      up: l => l % 2 ? "+damage" : "+puddle radius" },
    solvent: { name: "Solvent", text: "Puddles are wider, last longer and burn so hard even a boss can't stand in them." },
    ricochet: { name: "Ricochet", text: "A charge zips around the screen, bouncing off its edges until it runs out.",
      up: l => l % 3 === 0 ? "+1 charge" : "+damage and bounces" },
    chaos: { name: "Chaos", text: "Four charges, ten bounces each. The screen turns into a meat grinder." }
  },
  passives: {
    power: { name: "Overdrive", text: "+15% to all damage.", val: l => "+" + l * 15 + "% damage" },
    haste: { name: "Cryoloop", text: "Weapons recharge 8% faster.", val: l => "−" + Math.round((1 - Math.pow(0.92, l)) * 100) + "% cooldown" },
    area: { name: "Resonator", text: "+12% to attack area and range.", val: l => "+" + l * 12 + "% area" },
    boots: { name: "Servos", text: "+9% movement speed.", val: l => "+" + l * 9 + "% speed" },
    magnet: { name: "Gravgrip", text: "+30% crystal pickup radius.", val: l => "+" + l * 30 + "% pickup" },
    heart: { name: "Biostim", text: "+22 max health, and heals the same amount.", val: l => "+" + l * 22 + " HP" },
    armor: { name: "Nanoshell", text: "Blocks 2 damage from every hit you take.", val: l => "−" + l * 2 + " damage taken" },
    greed: { name: "Data Miner", text: "+18% experience and shards.", val: l => "+" + l * 18 + "% loot" },
    dup: { name: "Duplicator", text: "Weapons fire one extra projectile.", val: l => "+" + l + (l > 1 ? " projectiles" : " projectile") },
    dura: { name: "Stabilizer", text: "Mines, fields and vortices last 15% longer.", val: l => "+" + l * 15 + "% duration" },
    luck: { name: "Talisman", text: "+6% elite chance and better drops from neon signs.", val: l => "+" + l * 6 + "% luck" },
    growth: { name: "Upgrade Chip", text: "+10% experience gained.", val: l => "+" + l * 10 + "% XP" }
  },
  abilities: {
    phantom: {
      name: "Phantom", role: "Blade",
      text: "An instant dash toward the cursor straight through the crowd. You're invulnerable mid-flight and slice everyone in your way.",
      hint: "Escape a surround and cut through a crowd in one move.",
      up: () => "+15 damage, −0.25 s cooldown, +20 range",
      ult: { name: "Phantom Swarm", short: "SWARM", text: "Five dashes in a row at the nearest targets — no pauses, and nothing can touch you." }
    },
    railgun: {
      name: "Railgun", role: "Shooter",
      text: "A piercing beam across the whole screen toward the cursor. Punches through everything without losing power.",
      hint: "Picks off elites and chips away at bosses from range.",
      up: () => "+35 damage, −0.3 s cooldown, +4 beam width",
      ult: { name: "Fan Salvo", short: "SALVO", text: "Five beams in a fan instead of one, each wider and meaner than usual." }
    },
    singularity: {
      name: "Singularity", role: "Field operator",
      text: "A gravity well at the cursor: pulls the crowd in, burns it and collapses with a blast. Hits harder the more enemies are inside — +5% each, up to +120%.",
      hint: "The thicker the crowd, the better the vortex.",
      up: () => "+2.5 damage per tick, +15 blast, +10 radius, −0.2 s cooldown",
      ult: { name: "Collapse", short: "COLLAPSE", text: "A vortex twice as wide that lasts twice as long and collapses three times harder." }
    }
  },
  enemies: {
    crawler: "Crawler", runner: "Runner", brute: "Brute", shooter: "Spitter", swarm: "Gnat", ghost: "Shade",
    slag: "Slag", welder: "Welder", hulk: "Ladle", spitter: "Caster",
    shard: "Splinter", warden: "Keymaster", glitch: "Glitch", turret: "Relay"
  },
  /* боссы без id — ключом служит русское имя */
  bosses: {
    "НАДЗИРАТЕЛЬ": "OVERSEER", "ПОЖИРАТЕЛЬ": "DEVOURER", "ПОЛНОЧЬ": "MIDNIGHT",
    "ДОМЕННАЯ": "BLAST FURNACE", "КОВШЕВОЙ": "CRUCIBLE", "РАЗЛИВЩИК": "SMELTER",
    "БРАНДМАУЭР": "FIREWALL", "ДЕМОН СЕТИ": "NET DAEMON", "АРХИВАРИУС": "ARCHIVIST",
    "ПЕРВОИСТОЧНИК": "THE SOURCE", "ЖНЕЦ": "REAPER"
  },
  arenas: {
    quarter: { name: "Neon Quarter", tag: "Start", d: "A sleeping district that lost the network at midnight. Familiar faces from the subnets." },
    foundry: { name: "The Foundry", tag: "Hot", d: "An old factory beneath the quarter. Everything here is red-hot, and the locals are tougher." },
    core: { name: "Network Core", tag: "Finale", d: "Where it all crawled out from. At minute fifteen the Source emerges — the end of the story." }
  },
  mods: {
    hyper: { name: "Hyper", d: "Every enemy is much tougher, faster and comes in thicker waves. But shards are doubled." },
    endless: { name: "Endless", d: "The Reaper never comes. Every 15 minutes a new lap begins: the boss schedule repeats and enemies get tougher than in the previous lap." }
  },
  rarity: ["Common", "Rare", "Epic", "Legendary"],
  ach: {
    "a:first": { name: "First Contact", d: "Kill 100 enemies" },
    "a:min5": { name: "Five Minutes", d: "Survive 5:00 in a single run" },
    "a:glass": { name: "Break the Glass", d: "Smash 50 neon signs" },
    "a:chest": { name: "Gift", d: "Pick up 10 chests" },
    "a:lvl15": { name: "Fifteenth", d: "Reach level 15" },
    "a:quest5": { name: "On Assignment", d: "Complete 5 run objectives" },
    "a:min10": { name: "Ten Minutes", d: "Survive 10:00 in a single run" },
    "a:boss10": { name: "Watcher", d: "Kill 10 bosses" },
    "a:evo1": { name: "Fusion", d: "Assemble your first evolution" },
    "a:max5": { name: "Maxed Out", d: "Max out 5 weapons" },
    "a:quest25": { name: "Executor", d: "Complete 25 run objectives" },
    "a:char4": { name: "Roster Change", d: "Unlock a fourth operator" },
    "a:kills5k": { name: "Five Thousand", d: "Kill 5,000 enemies in total" },
    "a:w10": { name: "Arsenal", d: "Unlock 10 kinds of weapons" },
    "a:arena1": { name: "Quarter Cleared", d: "Clear the Neon Quarter" },
    "a:arena2": { name: "Foundry Cooled", d: "Clear the Foundry" },
    "a:evo5": { name: "Form Collector", d: "Assemble 5 different evolutions" },
    "a:lvl40": { name: "Fortieth", d: "Reach level 40" },
    "a:metaMax": { name: "Workshop Master", d: "Max out a workshop upgrade" },
    "a:clean5": { name: "Not a Scratch", d: "Survive the first 5:00 of a run without taking damage" },
    "a:shards50k": { name: "Hoarder", d: "Earn 50,000 shards in total" },
    "a:kills50k": { name: "Fifty Thousand", d: "Kill 50,000 enemies in total" },
    "a:arena3": { name: "Core Breached", d: "Clear the Network Core" },
    "a:final": { name: "The Source", d: "Kill the game's final boss" },
    "a:evoAll": { name: "Full Set", d: "Assemble every evolution" },
    "a:reaper": { name: "Reaper's Reaper", d: "Kill the Reaper" },
    "a:min20": { name: "Twenty Minutes", d: "Survive 20:00 in a single run" },
    "a:colAll": { name: "Everything Unlocked", d: "Complete the whole collection" },
    "a:boss100": { name: "Titan Hunter", d: "Kill 100 bosses" },
    "a:cursed": { name: "Under the Curse", d: "Clear any arena with Curse 3+" }
  },
  meta: {
    dmg: { name: "Calibration", d: l => "+" + (l * 6) + "% damage for the whole run" },
    hp: { name: "Exoskeleton", d: l => "+" + (l * 15) + " starting health" },
    armor: { name: "Nanoplates", d: l => "−" + l + " damage from every hit" },
    spd: { name: "Antigrav", d: l => "+" + (l * 4) + "% movement speed" },
    mag: { name: "Gravcoil", d: l => "+" + (l * 18) + "% pickup radius" },
    regen: { name: "Nanorepair", d: l => "+" + (l * 0.3).toFixed(1) + " HP per second" },
    dash: { name: "Afterburner", d: l => "−" + (l * 0.45).toFixed(2) + " s dash cooldown" },
    greed: { name: "Loot Scanner", d: l => "+" + (l * 10) + "% shards per run" },
    luck: { name: "Radar", d: l => "+" + (l * 5) + "% chance of an elite carrying a chest" },
    revive: { name: "Backup Copy", d: () => "Once per run, brings you back with 50% health" },
    reroll: { name: "Reroll", d: l => l + (l === 1 ? " card reroll" : " card rerolls") + " per run" },
    banish: { name: "Banish", d: l => "Remove " + l + (l === 1 ? " item" : " items") + " from the card pool per run" },
    growth: { name: "Neurolink", d: l => "+" + (l * 4) + "% experience per run" },
    echo: { name: "Echo", d: l => "+" + l + (l === 1 ? " projectile" : " projectiles") + " for every projectile weapon" },
    cool: { name: "Turbine", d: l => "−" + Math.round((1 - Math.pow(0.92, l)) * 100) + "% cooldown for all weapons and the ability" },
    siege: { name: "Sapper", d: l => "+" + (l * 5) + "% damage to bosses" },
    crit: { name: "Breach", d: l => l * 5 + "% chance to breach armor: double damage" },
    curse: { name: "Curse", d: l => "Enemies are " + (l * 12) + "% meaner, but you get " + (l * 25) + "% more shards" }
  },
  unlocks: {
    "p:armor": { kind: "Implant", name: "Nanoshell", text: "Survive 2:00 in a run" },
    "w:aura": { kind: "Weapon", name: "Emitter", text: "Smash 25 neon signs" },
    "p:greed": { kind: "Implant", name: "Data Miner", text: "Bank 400 shards" },
    "w:flechette": { kind: "Weapon", name: "Flechettes", text: "Reach level 8" },
    "c:scout": { kind: "Operator", name: "Scout", text: "Survive 7:00 in a run" },
    "p:dup": { kind: "Implant", name: "Duplicator", text: "Max out a weapon" },
    "w:missile": { kind: "Weapon", name: "Missiles", text: "Kill your first boss" },
    "w:disc": { kind: "Weapon", name: "Disc", text: "Open 3 chests" },
    "p:dura": { kind: "Implant", name: "Stabilizer", text: "Survive 5:00 in a run" },
    "w:acid": { kind: "Weapon", name: "Acid", text: "Kill 2000 enemies" },
    "c:chemist": { kind: "Operator", name: "Chemist", text: "Smash 100 neon signs" },
    "p:luck": { kind: "Implant", name: "Talisman", text: "Smash 60 neon signs" },
    "p:growth": { kind: "Implant", name: "Upgrade Chip", text: "Reach level 16" },
    "w:ricochet": { kind: "Weapon", name: "Ricochet", text: "Survive 9:00 in a run" },
    "c:lucky": { kind: "Operator", name: "Lucky", text: "Open 10 chests" }
  },
  chars: {
    shift: { name: "Ronin", tag: "All-rounder", d: "A street fighter with a plasma cutter. Nothing extra — solid balance." },
    engineer: { name: "Technician", tag: "Defense", d: "Starts with drones plus one extra drone. Hits weaker but lives longer." },
    sparks: { name: "Volt", tag: "Tempo", d: "Born with the arc implanted, cooldowns 12% faster. Noticeably less health." },
    scout: { name: "Scout", tag: "Speed", d: "Runs 14% faster than anyone and sprays needles. Not built to take hits." },
    chemist: { name: "Chemist", tag: "Area", d: "Spills acid and covers 18% more area. Hits weaker, though." },
    lucky: { name: "Lucky", tag: "Luck", d: "Elites show up more often, neon signs are more generous, and 15% more shards come home." }
  }
};
