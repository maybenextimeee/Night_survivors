/* ---------- 9. сенсорное управление ------------------------------------
   Плавающий джойстик + кнопки навыка, ульты, рывка и паузы. Кнопки ничего
   не знают о бое: они нажимают те же «клавиши», что и клавиатура (keys /
   pressed), поэтому игровая логика одна на оба способа управления.

   Режим включается сам: по первому касанию, по сенсорному экрану или по
   типу устройства из SDK. Нажал физическую клавишу — вернулся десктоп.  */
const STICK_R = 56;           // радиус хода ручки, px
const STICK_DEAD = 0.14;      // мёртвая зона: лёгкое касание не двигает героя

const Touch = {
  on: false,
  stickId: null, ox: 0, oy: 0,
  axis: { x: 0, y: 0 },

  init() {
    const coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
    const fine = window.matchMedia && matchMedia("(pointer: fine)").matches;
    if (coarse && !fine) this.enable(true);
    this.bindButtons();
    /* джойстик ловим на всём документе: он появляется там, куда поставил
       палец, — так игрой можно управлять одной рукой (пункт 1.10.4) */
    document.addEventListener("touchstart", e => this.start(e), { passive: false });
    document.addEventListener("touchmove", e => this.move(e), { passive: false });
    document.addEventListener("touchend", e => this.end(e), { passive: false });
    document.addEventListener("touchcancel", e => this.end(e), { passive: false });
    /* физическая клавиатура — значит, играют на компьютере */
    addEventListener("keydown", () => { if (this.on) this.enable(false); });
  },
  /* после SDK: тип устройства от Яндекса точнее любых догадок */
  detect() {
    const d = Platform.device;
    if (d === "mobile" || d === "tablet") this.enable(true);
  },
  enable(on) {
    if (this.on === on) return;
    this.on = on;
    document.body.classList.toggle("touch", on);
    this.reset();
  },
  reset() {
    this.stickId = null;
    this.axis.x = this.axis.y = 0;
    $("stick").classList.remove("on");
    keys.q = false;
  },

  /* ---- джойстик ---- */
  start(e) {
    if (!this.on) this.enable(true);
    if (g.state !== "play" || this.stickId !== null) return;
    const tch = e.changedTouches[0];
    const el = e.target;
    /* по кнопкам и по экранам меню джойстик не начинаем */
    if (el.closest && (el.closest(".tbtn") || el.closest(".screen.on"))) return;
    e.preventDefault();             // без «мыши» вдогонку и без прокрутки
    this.stickId = tch.identifier;
    this.ox = tch.clientX; this.oy = tch.clientY;
    const st = $("stick");
    st.style.left = this.ox + "px";
    st.style.top = this.oy + "px";
    st.firstElementChild.style.transform = "translate(-50%,-50%)";
    st.classList.add("on");
  },
  move(e) {
    if (this.stickId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const tch = e.changedTouches[i];
      if (tch.identifier !== this.stickId) continue;
      e.preventDefault();
      const dx = tch.clientX - this.ox, dy = tch.clientY - this.oy;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dx / len, ny = dy / len;
      const k = Math.min(1, len / STICK_R);
      /* аналоговый вектор: чуть отклонил — идёшь медленнее, у края — в полную */
      const m = k < STICK_DEAD ? 0 : (k - STICK_DEAD) / (1 - STICK_DEAD);
      this.axis.x = nx * m; this.axis.y = ny * m;
      $("stick").firstElementChild.style.transform =
        "translate(calc(-50% + " + (nx * k * STICK_R) + "px),calc(-50% + " + (ny * k * STICK_R) + "px))";
    }
  },
  end(e) {
    if (this.stickId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier !== this.stickId) continue;
      this.stickId = null;
      this.axis.x = this.axis.y = 0;
      $("stick").classList.remove("on");
    }
  },

  /* ---- кнопки ----
     touchstart с preventDefault: иначе браузер следом пришлёт «клик мышью»
     и навык улетел бы в точку касания, а не в ближайшего врага. */
  bindButtons() {
    const hold = (id, down, up) => {
      const el = $(id);
      el.addEventListener("touchstart", e => { e.preventDefault(); e.stopPropagation(); el.classList.add("down"); down(); }, { passive: false });
      const rel = e => { e.preventDefault(); el.classList.remove("down"); if (up) up(); };
      el.addEventListener("touchend", rel, { passive: false });
      el.addEventListener("touchcancel", rel, { passive: false });
      el.addEventListener("click", e => { e.preventDefault(); down(); if (up) setTimeout(up, 120); });
    };
    /* навык держится как клавиша Q: пока держишь, заряды уходят сами */
    hold("tSkill", () => { keys.q = true; }, () => { keys.q = false; });
    hold("tUlt", () => { pressed.e = true; });
    hold("tDash", () => { pressed[" "] = true; });
    hold("tPause", () => { pressed.escape = true; });
  },

  /* полоски зарядов и откаты на кнопках — раз в кадр, только в сенсорном режиме */
  sync(p) {
    const segs = $("tCharges").children;
    for (let i = 0; i < segs.length; i++) {
      const f = clamp(p.abCharge - i, 0, 1);
      segs[i].firstChild.style.transform = "scaleX(" + f + ")";
    }
    $("tSkill").classList.toggle("dim", p.abCharge < 1);
    $("tUlt").classList.toggle("ready", p.abCharge >= AB_CHARGES);
    const dashReady = p.dashCd <= 0 && p.dashT <= 0;
    $("tDash").classList.toggle("dim", !dashReady);
    $("tDashCd").textContent = dashReady ? "" : p.dashCd.toFixed(1);
  }
};

/* Куда целиться без мыши: в ближайшего врага в разумном радиусе, а если
   рядом никого — вперёд по ходу движения. */
function touchAim(p) {
  const e = nearestEnemy(g, p.x, p.y, 560);
  if (e) return { x: e.x, y: e.y };
  return { x: p.x + Math.cos(p.face) * 300, y: p.y + Math.sin(p.face) * 300 };
}
