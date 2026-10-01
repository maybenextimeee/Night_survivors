/* ---------- 10. старт --------------------------------------------------
   Порядок важен: сохранение → язык → меню на экран → SDK. Меню рисуем
   сразу на локальных данных, а когда SDK ответит, уточняем язык портала,
   подтягиваем облако и флаги и только тогда говорим платформе «готово». */
(async function boot() {
  loadSave();
  Sfx.on = save.sound !== false;
  $("ver").textContent = "v" + GAME_VERSION;
  I18N.set(I18N.detect());
  resize();
  Touch.init();
  UI.syncShards();
  UI.show("menu");
  requestAnimationFrame(frame);
  /* SDK может не ответить (нет сети, блокировщик) — дольше пяти секунд
     меню не держим, играем на локальном сохранении */
  await Promise.race([Platform.init(), new Promise(r => setTimeout(r, 5000))]);
  I18N.set(I18N.detect());
  Touch.detect();
  UI.syncShards();
  Platform.ready();
})();
