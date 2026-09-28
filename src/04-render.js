/* ---------- 6. отрисовка ---------------------------------------------- */
const cv = $("cv");
const ctx = cv.getContext("2d");
let VW = 0, VH = 0, DPR = 1;

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = innerWidth; VH = innerHeight;
  cv.width = Math.floor(VW * DPR);
  cv.height = Math.floor(VH * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
addEventListener("resize", resize);

function poly(x, y, r, n, rot) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + i * TAU / n;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
function orbSprite(c, x, y, r, color, rot) {
  c.save();
  c.globalCompositeOperation = "lighter";
  c.drawImage(glow(color, 32), x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
  c.restore();
  c.fillStyle = "#0b1020";
  c.strokeStyle = color;
  c.lineWidth = 2;
  poly(x, y, r, 4, rot);
  c.fill(); c.stroke();
}

/* фон: две сетки с разным шагом — даёт ощущение движения по цеху */
function drawFloor(camX, camY) {
  /* палитра пола приходит от арены: квартал синий, цех рыжий, ядро сиреневое */
  const ar = g.arenaDef || ARENAS[0];
  const grd = ctx.createLinearGradient(0, 0, 0, VH);
  grd.addColorStop(0, ar.floor[0]);
  grd.addColorStop(1, ar.floor[1]);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VW, VH);

  const draw = (step, alpha, width) => {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = ar.grid;
    ctx.lineWidth = width;
    ctx.beginPath();
    const ox = -(camX % step) - step, oy = -(camY % step) - step;
    for (let x = ox; x < VW + step; x += step) { ctx.moveTo(Math.floor(x) + 0.5, 0); ctx.lineTo(Math.floor(x) + 0.5, VH); }
    for (let y = oy; y < VH + step; y += step) { ctx.moveTo(0, Math.floor(y) + 0.5); ctx.lineTo(VW, Math.floor(y) + 0.5); }
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  draw(64, 0.16, 1);
  draw(256, 0.3, 1);
}

function render() {
  const p = g.p;
  const sx = g.shake ? rnd(-g.shake, g.shake) : 0;
  const sy = g.shake ? rnd(-g.shake, g.shake) : 0;
  const camX = (p ? g.cam.x : 0) - VW / 2 + sx;
  const camY = (p ? g.cam.y : 0) - VH / 2 + sy;

  drawFloor(camX, camY);
  if (!p) return;

  ctx.save();
  ctx.translate(-camX, -camY);

  const L = camX - 80, R = camX + VW + 80, T = camY - 80, B = camY + VH + 80;
  const vis = (o, pad) => o.x > L - (pad || 0) && o.x < R + (pad || 0) && o.y > T - (pad || 0) && o.y < B + (pad || 0);

  /* мины */
  for (let i = 0; i < g.mines.length; i++) {
    const m = g.mines[i];
    if (!vis(m)) continue;
    const blink = m.life < 2 ? (Math.sin(g.time * 18) * 0.5 + 0.5) : 1;
    ctx.globalAlpha = 0.25 * blink;
    ctx.strokeStyle = m.color; ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.arc(m.x, m.y, m.rad, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = m.color;
    poly(m.x, m.y, 6, 3, g.time * 3);
    ctx.fill();
  }

  /* уличные неонки: столб с горящей головой */
  for (let i = 0; i < g.props.length; i++) {
    const pr = g.props[i];
    if (pr.dead || !vis(pr, 40)) continue;
    const pulse = 0.75 + 0.25 * Math.sin(g.time * 2.4 + pr.ph);
    const hot = pr.flash > 0;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.45 * pulse;
    ctx.drawImage(glow(hot ? "#ffffff" : "#ffd166", 32), pr.x - 40, pr.y - 46, 80, 80);
    ctx.restore();
    ctx.strokeStyle = hot ? "#ffffff" : "#8a6a2a";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(pr.x, pr.y + 16); ctx.lineTo(pr.x, pr.y - 2); ctx.stroke();
    ctx.fillStyle = hot ? "#ffffff" : "#1c1608";
    ctx.strokeStyle = hot ? "#ffffff" : "#ffd166";
    ctx.lineWidth = 2;
    poly(pr.x, pr.y - 10, 9, 6, Math.PI / 6);
    ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.ellipse(pr.x, pr.y + 17, 13, 4, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* кислотные лужи — лежат на полу под всеми */
  for (let i = 0; i < g.pools.length; i++) {
    const pl = g.pools[i];
    if (!vis(pl, pl.r)) continue;
    const k = clamp(pl.life / pl.max, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.16 + 0.14 * k;
    ctx.fillStyle = pl.color;
    ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.45 * k;
    ctx.strokeStyle = pl.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 9]);
    ctx.lineDashOffset = -g.time * 22;
    ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r * (0.96 + 0.04 * Math.sin(g.time * 5 + pl.x)), 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    /* пузырьки */
    ctx.globalAlpha = 0.5 * k;
    ctx.fillStyle = pl.color;
    for (let b = 0; b < 3; b++) {
      const a = g.time * (1.1 + b * 0.4) + b * 2.1 + pl.x * 0.01;
      const rr = pl.r * (0.3 + 0.4 * ((b + 1) / 3));
      ctx.beginPath();
      ctx.arc(pl.x + Math.cos(a) * rr, pl.y + Math.sin(a * 1.3) * rr * 0.6, 2.4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /* гравитационные колодцы — под всем остальным, как воронка в полу */
  for (let i = 0; i < g.wells.length; i++) {
    const wl = g.wells[i];
    if (!vis(wl, wl.r)) continue;
    const k = clamp(wl.life / wl.max, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    /* набитый колодец светится ярче — видно, что он сейчас бьёт сильнее */
    ctx.globalAlpha = 0.2 + 0.45 * k + Math.min(0.3, (wl.crowd || 0) * 0.012);
    ctx.drawImage(glow(wl.color, 32), wl.x - wl.r, wl.y - wl.r, wl.r * 2, wl.r * 2);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = wl.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.85;
    for (let r = 0; r < 3; r++) {
      const rr = wl.r * (0.34 + r * 0.31) * (0.86 + 0.14 * Math.sin(g.time * 6 + r));
      ctx.setLineDash([10, 12]);
      ctx.lineDashOffset = g.time * (70 + r * 45) * (r % 2 ? 1 : -1);
      ctx.beginPath(); ctx.arc(wl.x, wl.y, rr, 0, TAU); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#05060c";
    ctx.beginPath(); ctx.arc(wl.x, wl.y, wl.r * 0.15, 0, TAU); ctx.fill();
    if (wl.crowd > 3) {
      ctx.font = "600 14px 'IBM Plex Mono',monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = wl.color;
      ctx.fillText("×" + crowdMul(wl.crowd).toFixed(1), wl.x, wl.y - wl.r - 10);
      ctx.textAlign = "left";
    }
    ctx.restore();
  }

  /* кристаллы опыта */
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < g.gems.length; i++) {
    const q = g.gems[i];
    if (!vis(q)) continue;
    const s = 4 + Math.min(6, q.v) * 0.6;
    ctx.drawImage(glow("#b6ff3d", 32), q.x - s * 2.6, q.y - s * 2.6, s * 5.2, s * 5.2);
  }
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < g.gems.length; i++) {
    const q = g.gems[i];
    if (!vis(q)) continue;
    const s = 4 + Math.min(6, q.v) * 0.6;
    ctx.fillStyle = "#dcffa0";
    poly(q.x, q.y, s, 4, q.t * 2.2);
    ctx.fill();
  }

  /* добыча */
  for (let i = 0; i < g.drops.length; i++) {
    const d = g.drops[i];
    if (!vis(d)) continue;
    const bob = Math.sin(g.time * 4 + d.x) * 2;
    if (d.type === "chest") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(glow("#ffc23d", 32), d.x - 34, d.y - 34 + bob, 68, 68);
      ctx.restore();
      ctx.fillStyle = "#1a1408"; ctx.strokeStyle = "#ffc23d"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.rect(d.x - 11, d.y - 8 + bob, 22, 16); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(d.x - 11, d.y - 2 + bob); ctx.lineTo(d.x + 11, d.y - 2 + bob); ctx.stroke();
    } else {
      const col = d.type === "gold" ? "#ffc23d" : d.type === "magnet" ? "#3ee8ff" : "#ff2f6e";
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(glow(col, 32), d.x - 24, d.y - 24 + bob, 48, 48);
      ctx.restore();
      ctx.fillStyle = col;
      ctx.strokeStyle = col;
      if (d.type === "gold") { ctx.beginPath(); ctx.arc(d.x, d.y + bob, 5, 0, TAU); ctx.fill(); }
      else if (d.type === "magnet") {
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(d.x, d.y + 1 + bob, 7, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(d.x - 7, d.y + 1 + bob); ctx.lineTo(d.x - 7, d.y + 6 + bob); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(d.x + 7, d.y + 1 + bob); ctx.lineTo(d.x + 7, d.y + 6 + bob); ctx.stroke();
      }
      else { ctx.fillRect(d.x - 6, d.y - 2 + bob, 12, 4); ctx.fillRect(d.x - 2, d.y - 6 + bob, 4, 12); }
    }
  }

  /* следы взмахов */
  for (let i = 0; i < g.slashes.length; i++) {
    const s = g.slashes[i];
    const k = s.life / s.max;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = k * 0.75;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3 + 16 * (1 - k);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * (0.55 + 0.45 * (1 - k)), s.a - s.arc / 2, s.a + s.arc / 2);
    ctx.stroke();
    ctx.restore();
  }

  /* поля и орбиты, которые рисует само оружие */
  for (let i = 0; i < p.weapons.length; i++) {
    const w = p.weapons[i], def = WEAPONS[w.id];
    if (def.draw) def.draw(g, ctx, w);
  }

  /* враги */
  for (let i = 0; i < g.enemies.length; i++) {
    const e = g.enemies[i];
    if (e.dead || !vis(e, e.r * 2)) continue;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = e.boss ? 0.8 : e.elite ? 0.6 : 0.35;
    const gr = e.r * (e.boss ? 3.4 : 2.6);
    ctx.drawImage(glow(e.color, 32), e.x - gr, e.y - gr, gr * 2, gr * 2);
    ctx.restore();

    ctx.fillStyle = e.flash > 0 ? "#ffffff" : "#0b1020";
    ctx.strokeStyle = e.flash > 0 ? "#ffffff" : e.color;
    ctx.lineWidth = e.boss ? 3 : 2;
    poly(e.x, e.y, e.r, e.def.shape || 6, e.ang + (e.boss ? g.time * 0.6 : 0));
    ctx.fill(); ctx.stroke();
    if (e.boss) {
      ctx.globalAlpha = 0.6;
      poly(e.x, e.y, e.r * 0.55, 3, -e.ang - g.time * 1.4);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (e.elite) {
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      /* носителя сундука видно издалека: вторая вращающаяся рамка и значок */
      if (e.chest) {
        ctx.globalAlpha = 0.85;
        poly(e.x, e.y, e.r + 12, 4, g.time * 1.6);
        ctx.stroke();
        ctx.fillStyle = "#1a1408";
        ctx.beginPath(); ctx.rect(e.x - 8, e.y - e.r - 20, 16, 12); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(e.x - 8, e.y - e.r - 15); ctx.lineTo(e.x + 8, e.y - e.r - 15); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    /* полоска жизни только у крупных */
    if (!e.boss && e.hp < e.maxHp && e.r > 13) {
      const w = e.r * 2;
      ctx.fillStyle = "rgba(0,0,0,.6)";
      ctx.fillRect(e.x - w / 2, e.y - e.r - 9, w, 3);
      ctx.fillStyle = "#ff2f6e";
      ctx.fillRect(e.x - w / 2, e.y - e.r - 9, w * clamp(e.hp / e.maxHp, 0, 1), 3);
    }
  }

  /* разряды */
  for (let i = 0; i < g.zaps.length; i++) {
    const z = g.zaps[i];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = clamp(z.life / 0.16, 0, 1);
    ctx.strokeStyle = z.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(z.x1, z.y1);
    const seg = 4;
    for (let k = 1; k <= seg; k++) {
      const t = k / seg;
      const jx = k === seg ? 0 : rnd(-11, 11), jy = k === seg ? 0 : rnd(-11, 11);
      ctx.lineTo(lerp(z.x1, z.x2, t) + jx, lerp(z.y1, z.y2, t) + jy);
    }
    ctx.stroke();
    ctx.restore();
  }

  /* следы способностей: широкое свечение плюс белое ядро */
  for (let i = 0; i < g.beams.length; i++) {
    const b = g.beams[i];
    const k = clamp(b.life / b.max, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.strokeStyle = b.color;
    ctx.globalAlpha = k * 0.55;
    ctx.lineWidth = b.w * k;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.globalAlpha = k;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(1, b.w * k * 0.26);
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.restore();
  }

  /* диски-бумеранги */
  for (let i = 0; i < g.discs.length; i++) {
    const d = g.discs[i];
    if (!vis(d, 40)) continue;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(glow(d.color, 32), d.x - 30, d.y - 30, 60, 60);
    ctx.restore();
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.spin);
    ctx.strokeStyle = d.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* снаряды */
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < g.bullets.length; i++) {
    const b = g.bullets[i];
    if (!vis(b)) continue;
    ctx.drawImage(glow(b.color, 32), b.x - b.r * 3, b.y - b.r * 3, b.r * 6, b.r * 6);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.55, 0, TAU); ctx.fill();
  }
  for (let i = 0; i < g.missiles.length; i++) {
    const m = g.missiles[i];
    ctx.drawImage(glow(m.color, 32), m.x - 22, m.y - 22, 44, 44);
    ctx.save();
    ctx.translate(m.x, m.y); ctx.rotate(m.a);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, 3.5); ctx.lineTo(-5, -3.5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  for (let i = 0; i < g.ebullets.length; i++) {
    const b = g.ebullets[i];
    if (!vis(b)) continue;
    ctx.drawImage(glow(b.color, 32), b.x - b.r * 3.4, b.y - b.r * 3.4, b.r * 6.8, b.r * 6.8);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.5, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  /* игрок */
  const inv = p.inv > 0 && Math.sin(g.time * 40) > 0;
  if (p.dashT > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.35;
    for (let k = 1; k <= 4; k++) {
      ctx.drawImage(glow("#3ee8ff", 32), p.x - p.dvx * k * 0.014 - 26, p.y - p.dvy * k * 0.014 - 26, 52, 52);
    }
    ctx.restore();
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(glow(p.hitFlash > 0 ? "#ff2f6e" : "#3ee8ff", 32), p.x - 37, p.y - 37, 74, 74);
  ctx.restore();
  /* блик готовности: вспыхивает, разрастается и гаснет; у ульты — сильнее */
  let shipAlpha = 1;
  if (p.readyT > 0) {
    const k = clamp(p.readyT / p.readyMax, 0, 1);
    const wave = Math.sin(k * Math.PI);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.min(1, 0.6 * p.readyPow * wave);
    const s = (34 + 30 * (1 - k)) * (0.9 + 0.25 * p.readyPow);
    ctx.drawImage(glow(p.readyColor, 32), p.x - s, p.y - s, s * 2, s * 2);
    /* тонкое расходящееся кольцо — читается как «готово» */
    ctx.globalAlpha = Math.min(1, 0.5 * p.readyPow * wave);
    ctx.strokeStyle = p.readyColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 15 + 26 * (1 - k) * p.readyPow, 0, TAU);
    ctx.stroke();
    ctx.restore();
    /* и сам корпус коротко мерцает прозрачностью */
    shipAlpha *= 1 - 0.55 * Math.abs(Math.sin(k * Math.PI * 3));
  }
  if (p.dimT > 0) shipAlpha *= 0.4;
  if (!inv) {
    ctx.save();
    ctx.globalAlpha = shipAlpha;
    ctx.translate(p.x, p.y); ctx.rotate(p.face);
    ctx.fillStyle = p.hitFlash > 0 ? "#ff2f6e" : "#0d1220";
    ctx.strokeStyle = p.hitFlash > 0 ? "#fff" : "#7df1ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 0); ctx.lineTo(-6.4, 7.2); ctx.lineTo(-3.2, 0); ctx.lineTo(-6.4, -7.2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  /* частицы */
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < g.parts.length; i++) {
    const q = g.parts[i];
    const k = q.life / q.max;
    ctx.globalAlpha = clamp(k, 0, 1);
    if (q.ring) {
      ctx.strokeStyle = q.color;
      ctx.lineWidth = 3 * k;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1.15 - k * 0.55), 0, TAU); ctx.stroke();
    } else {
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  /* цифры урона: криты крупнее, с обводкой и коротким подскоком */
  ctx.textAlign = "center";
  for (let i = 0; i < g.nums.length; i++) {
    const n = g.nums[i];
    if (!vis(n)) continue;
    const crit = n.crit;
    ctx.globalAlpha = clamp(n.life / (crit ? 0.95 : 0.7), 0, 1);
    ctx.font = crit ? "700 19px 'Chakra Petch',sans-serif" : "600 13px 'IBM Plex Mono',monospace";
    const y = crit ? n.y - (0.95 - n.life) * 16 : n.y;
    if (crit) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(8,10,18,.85)";
      ctx.strokeText(n.v, n.x, y);
    }
    ctx.fillStyle = n.color;
    ctx.fillText(n.v, n.x, y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  ctx.restore();

  /* откуда через пару секунд придёт большая волна */
  if (g.warn) {
    const k = clamp(g.warn.t / WAVE_WARN, 0, 1);
    const rad = Math.min(VW, VH) * 0.42 + 40 * (1 - k);
    ctx.save();
    ctx.translate(VW / 2, VH / 2);
    ctx.rotate(g.warn.a);
    ctx.globalAlpha = 0.3 + 0.45 * Math.abs(Math.sin(g.time * 9));
    ctx.strokeStyle = "#ff2f6e";
    ctx.lineCap = "round";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 0, rad, -0.5, 0.5); ctx.stroke();
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      const r = rad - 26 - i * 19;
      ctx.beginPath();
      ctx.moveTo(r, -21); ctx.lineTo(r - 15, 0); ctx.lineTo(r, 21);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* виньетка при низком здоровье */
  const hpk = p.hp / p.maxHp;
  if (hpk < 0.35) {
    const a = (0.35 - hpk) / 0.35;
    const gr = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.25, VW / 2, VH / 2, Math.max(VW, VH) * 0.7);
    gr.addColorStop(0, "rgba(255,47,110,0)");
    gr.addColorStop(1, "rgba(255,47,110," + (a * 0.45 * (0.7 + 0.3 * Math.sin(g.time * 6))).toFixed(3) + ")");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, VW, VH);
  }
}
