/* ---------- 8. платформа: Яндекс Игры или обычный браузер -------------
   Всё, что зависит от SDK Яндекс Игр, живёт здесь. Без SDK (GitHub Pages,
   файл с диска) каждый метод тихо деградирует: сохранение только в
   localStorage, рекорды только личные, реклама не показывается.

   Тег SDK (относительный путь, как требует документация) добавляет
   build.ps1 только в сборку для Яндекса (build/yandex). В index.html для
   Pages его нет: там такой файл отдал бы 404 и ошибку в консоли.       */

/* Технические названия лидербордов. Их нужно создать в Консоли
   разработчика ровно с такими именами, тип «время», сортировка по убыванию. */
const LB_BOARDS = { quarter: "endlessQuarter", foundry: "endlessFoundry", core: "endlessCore" };
const CLOUD_DEBOUNCE = 4000;   // setData: лимит 100 запросов за 5 минут
const LB_CACHE_MS = 60000;     // getEntries: лимит 20 запросов за 5 минут
const LB_TOP = 10;             // строк в таблице
const RECORDS_KEEP = 5;        // личных рекордов на арену

const Platform = {
  sdk: null, player: null,
  authorized: false, name: "", avatar: "", lang: "ru",
  holds: new Set(),            // почему сейчас заглушены звук и цикл
  playing: false,              // что последним сообщили в GameplayAPI
  syncPaused: false,           // открыт диалог выбора аккаунта — облако не трогаем
  lbCache: {},
  _cloudT: 0, _readySent: false,

  get yandex() { return !!this.sdk; },
  get frozen() { return this.holds.size > 0; },

  /* ---- запуск ---- */
  async init() {
    if (typeof YaGames === "undefined") return false;
    try { this.sdk = await YaGames.init(); } catch (e) { this.sdk = null; return false; }
    const sdk = this.sdk;
    /* язык портала (пункт 2.14). Игра пока только на русском, но язык
       читаем честно — когда появится перевод, переключение уже на месте */
    try { this.lang = (sdk.environment.i18n.lang || "ru").toLowerCase(); } catch (e) { }
    document.documentElement.lang = "ru";
    /* платформа просит паузу: реклама на старте, окно покупок, сворачивание */
    try {
      sdk.on("game_api_pause", () => this.hold("sdk"));
      sdk.on("game_api_resume", () => this.release("sdk"));
    } catch (e) { }
    /* Гость поиграл, потом вошёл — Яндекс сам спросит, какой прогресс
       оставить. Пока диалог открыт, облако не пишем; после — перечитываем. */
    try {
      sdk.on(sdk.EVENTS.ACCOUNT_SELECTION_DIALOG_OPENED, () => { this.syncPaused = true; });
      sdk.on(sdk.EVENTS.ACCOUNT_SELECTION_DIALOG_CLOSED, () => {
        this.syncPaused = false;
        this.loadPlayer(true);
      });
    } catch (e) { }
    try { this.device = sdk.deviceInfo && sdk.deviceInfo.type || ""; } catch (e) { }
    await Promise.all([this.loadPlayer(false), this.loadFlags()]);
    return true;
  },

  /* ---- удалённая конфигурация ----
     Флаги приходят строками. Каждый проверяем и зажимаем в разумные
     пределы: опечатка в Консоли не должна сломать игру у всех разом. */
  async loadFlags() {
    if (!this.sdk || !this.sdk.getFlags) return;
    const defaults = {};
    for (const k in FLAG_SPEC) defaults[k] = String(FLAG_SPEC[k].def());
    let flags;
    try { flags = await this.sdk.getFlags({ defaultFlags: defaults }); } catch (e) { return; }
    applyFlags(flags || {});
  },

  /* LoadingAPI.ready — ровно один раз, когда меню уже можно нажимать */
  ready() {
    if (this._readySent || !this.sdk) return;
    this._readySent = true;
    try { this.sdk.features.LoadingAPI && this.sdk.features.LoadingAPI.ready(); } catch (e) { }
  },

  /* разметка геймплея: зовётся каждый кадр, наружу уходят только смены */
  gameplay(on) {
    if (on === this.playing) return;
    this.playing = on;
    if (!this.sdk) return;
    try {
      const api = this.sdk.features.GameplayAPI;
      if (api) on ? api.start() : api.stop();
    } catch (e) { }
  },

  /* ---- пауза по внешним причинам ----
     Несколько источников могут держать паузу одновременно (вкладка скрыта
     и тут же пришла реклама) — отпускаем, только когда ушли все. */
  hold(reason) {
    this.holds.add(reason);
    Sfx.hold(true);
  },
  release(reason) {
    this.holds.delete(reason);
    if (!this.holds.size) Sfx.hold(false);
  },

  /* ---- игрок и облачные сохранения ---- */
  async loadPlayer(afterSwitch) {
    if (!this.sdk) return;
    try {
      this.player = await this.sdk.getPlayer();
      this.authorized = !!this.player.isAuthorized();
      this.name = this.authorized ? (this.player.getName() || "") : "";
      this.avatar = this.authorized ? (this.player.getPhoto("small") || "") : "";
    } catch (e) {
      this.player = null; this.authorized = false;
      return;
    }
    await this.pullCloud(afterSwitch);
    if (typeof UI !== "undefined") UI.syncShards();
  },

  /* Облако против локального: берём то, что дальше по прогрессу.
     После диалога выбора аккаунта облако главнее — игрок только что сам
     выбрал, какой прогресс оставить. */
  async pullCloud(cloudWins) {
    if (!this.player) return;
    let data = null;
    try { data = await this.player.getData(["save"]); } catch (e) { return; }
    const cloud = data && data.save && typeof data.save === "object" ? normalizeSave(data.save) : null;
    if (!cloud) { this.pushCloud(true); return; }       // первый вход — выгружаем то, что есть
    /* забег уже идёт — не подменяем сохранение под ногами, запишем своё в конце */
    if (g.state !== "menu") return;
    if (cloudWins || compareSaves(cloud, save) >= 0) {
      save = cloud;
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { }
      Sfx.on = save.sound !== false;
    } else this.pushCloud(true);
  },
  queueCloud() {
    if (!this.player || this.syncPaused) return;
    clearTimeout(this._cloudT);
    this._cloudT = setTimeout(() => this.pushCloud(false), CLOUD_DEBOUNCE);
  },
  pushCloud(flush) {
    clearTimeout(this._cloudT);
    if (!this.player || this.syncPaused) return;
    try {
      const r = this.player.setData({ save: save }, !!flush);
      if (r && r.catch) r.catch(() => { });
    } catch (e) { }
  },

  /* авторизация — только по кнопке и с объяснением, зачем (пункт 1.2.1) */
  async login() {
    if (!this.sdk) return false;
    try { await this.sdk.auth.openAuthDialog(); } catch (e) { return false; }
    await this.loadPlayer(false);
    this.lbCache = {};
    return this.authorized;
  },

  /* ---- рекорды бесконечности ----
     Личный список ведём всегда — он работает и без интернета, и без входа.
     В таблицу Яндекса результат уходит только у вошедших: setScore для
     гостей платформа не принимает. */
  submitEndless(arenaId, seconds) {
    const list = (save.records[arenaId] || []).slice();
    const best = list.length ? list[0] : 0;
    list.push(Math.floor(seconds));
    list.sort((a, b) => b - a);
    save.records[arenaId] = list.slice(0, RECORDS_KEEP);
    const isBest = seconds > best;
    const board = LB_BOARDS[arenaId];
    if (this.sdk && this.authorized && board) {
      delete this.lbCache[board];
      this.sdk.isAvailableMethod("leaderboards.setScore").then(ok => {
        if (ok) return this.sdk.leaderboards.setScore(board, Math.floor(seconds * 1000));
      }).catch(() => { });
    }
    return { best: isBest, prev: best };
  },
  personalBest(arenaId) {
    const list = save.records[arenaId];
    return list && list.length ? list[0] : 0;
  },

  /* Таблица: топ и место игрока. Кэшируем на минуту — у getEntries
     жёсткий лимит, а экран арен открывают часто. */
  async board(arenaId) {
    const name = LB_BOARDS[arenaId];
    if (!this.sdk || !name) return { ok: false, reason: "offline" };
    const hit = this.lbCache[name];
    if (hit && Date.now() - hit.t < LB_CACHE_MS) return hit.data;
    let res;
    try {
      res = await this.sdk.leaderboards.getEntries(name, {
        quantityTop: LB_TOP, includeUser: this.authorized, quantityAround: 1
      });
    } catch (e) { return { ok: false, reason: "error" }; }
    const me = this.authorized && this.player ? this.player.getUniqueID() : "";
    const rows = (res.entries || []).map(en => ({
      rank: en.rank,
      score: en.score / 1000,
      name: (en.player && en.player.publicName) || "",
      avatar: en.player && en.player.getAvatarSrc ? en.player.getAvatarSrc("small") : "",
      me: !!(en.player && me && en.player.uniqueID === me)
    }));
    const data = { ok: true, rows: rows, userRank: res.userRank || 0 };
    this.lbCache[name] = { t: Date.now(), data: data };
    return data;
  },

  /* ---- реклама ----
     Полноэкранная — только в логической паузе между забегами (пункт 4.4),
     частоту режет сама платформа. Звук на время показа глушим (пункт 4.7). */
  interstitial(done) {
    if (!this.sdk || !REMOTE.adBetweenRuns) { done(); return; }
    let fin = false;
    const finish = () => { if (fin) return; fin = true; this.release("ad"); done(); };
    try {
      this.sdk.adv.showFullscreenAdv({
        callbacks: { onOpen: () => this.hold("ad"), onClose: finish, onError: finish }
      });
    } catch (e) { finish(); }
  },
  /* реклама за награду — только по кнопке, где прямо написано, что и за что */
  rewarded(onReward, done) {
    if (!this.sdk) { done(false); return; }
    let fin = false, got = false;
    const finish = () => { if (fin) return; fin = true; this.release("ad"); done(got); };
    try {
      this.sdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => this.hold("ad"),
          onRewarded: () => { got = true; onReward(); },
          onClose: finish, onError: finish
        }
      });
    } catch (e) { finish(); }
  }
};

/* Имя флага в Консоли → поле REMOTE, тип и допустимые пределы. */
const num = (key, lo, hi) => ({
  def: () => REMOTE[key],
  set: v => { const n = parseFloat(String(v).replace(",", ".")); if (isFinite(n)) REMOTE[key] = clamp(n, lo, hi); }
});
const bool = key => ({
  def: () => (REMOTE[key] ? "1" : "0"),
  set: v => { const s = String(v).trim().toLowerCase(); REMOTE[key] = !(s === "0" || s === "false" || s === "off" || s === "нет"); }
});
const FLAG_SPEC = {
  xp_mul: num("xpMul", 0.25, 4),
  shard_mul: num("shardMul", 0.25, 5),
  enemy_hp_mul: num("enemyHpMul", 0.25, 4),
  enemy_dmg_mul: num("enemyDmgMul", 0.25, 4),
  chest_every: num("chestEvery", 15, 120),
  reward_mul: num("rewardMul", 0, 5),
  ad_between_runs: bool("adBetweenRuns"),
  ad_revive: bool("adRevive"),
  revive_hp: num("reviveHp", 0.1, 1),
  news: { def: () => REMOTE.news, set: v => { REMOTE.news = String(v || "").slice(0, 100); } }
};
function applyFlags(flags) {
  for (const k in FLAG_SPEC) if (flags[k] != null) FLAG_SPEC[k].set(flags[k]);
}

/* ---- фокус и вкладка ----
   Ушёл со вкладки или кликнул мимо окна игры — звук молчит (пункт 1.3),
   а идущий забег встаёт на паузу с меню: вернувшись, игрок сам решит,
   когда продолжать. */
function pauseForFocus() {
  if (g.state === "play") { g.state = "pause"; UI.showPause(); }
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    Platform.hold("hidden");
    pauseForFocus();
    Platform.pushCloud(true);          // закрывают вкладку — успеваем отправить
  } else Platform.release("hidden");
});
addEventListener("blur", () => { Platform.hold("blur"); pauseForFocus(); });
addEventListener("focus", () => Platform.release("blur"));

