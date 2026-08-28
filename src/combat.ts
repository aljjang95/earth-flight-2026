import { CAMPAIGN, CALLSIGNS, HARD_LOCK, LOCK_CONE, WAVES_PER_THEATER, craftById, rankFor, theaterById } from "./config";
import { G } from "./state";
import type { Enemy, Missile, Tracer } from "./types";
import { bearingTo, distM, moveBody, wrapPi } from "./math";
import { audio } from "./audio";
import { burstExplosion, ensurePointCollection } from "./fx";
import { addXp, writeSave } from "./save";
import { updateEnemy } from "./ai";
import { jetModelUri } from "./models";
import { transitCinematic, spawnClouds, applySolarNoon } from "./world";
import { input, keys } from "./input";

let eid = 1;

function addJet(color: string, getter: () => { lon: number; lat: number; alt: number; heading: number; pitch: number; roll: number }, scale: number): any {
  return G.viewer.entities.add({
    position: new Cesium.CallbackPositionProperty(() => {
      const p = getter();
      return Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt);
    }, false),
    orientation: new Cesium.CallbackProperty(() => {
      const p = getter();
      const c = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt);
      return Cesium.Transforms.headingPitchRollQuaternion(
        c,
        new Cesium.HeadingPitchRoll(p.heading, p.pitch, p.roll),
      );
    }, false),
    model: {
      uri: jetModelUri(color),
      minimumPixelSize: 92,
      maximumScale: 48000,
      scale,
      color: Cesium.Color.fromCssColorString(color),
      colorBlendMode: Cesium.ColorBlendMode.MIX,
      colorBlendAmount: 0.42,
    },
  });
}

export function spawnPlayerCraft(): void {
  const craft = craftById(G.equipped);
  G.playerEntity = addJet(craft.color, () => G.player, 4.15);
}

export function spawnWave(): void {
  G.wave += 1;
  G.theaterWave += 1;
  const rank = rankFor(Math.max(1, G.wave));
  const isBoss = G.theaterWave === WAVES_PER_THEATER || (G.wave > 0 && G.wave % 5 === 0);
  const n = isBoss ? Math.min(rank.count + 1, 7) : Math.min(rank.count, 6);
  G.waveGoal = n;
  G.waveDown = 0;
  G.lockProg = 0;
  G.locked = null;
  const hudWave = document.getElementById("hudWave");
  if (hudWave) hudWave.textContent = `${rank.name} ${G.wave}`;
  showBanner("INCOMING", `WAVE ${G.wave}`, rank.name + (isBoss ? " · ACE" : ""));
  if (isBoss) {
    const bb = document.getElementById("bossBanner");
    const sub = document.getElementById("bossSub");
    if (sub) sub.textContent = `${theaterById(G.theaterId).enemyName} · WAVE ${G.wave}`;
    if (bb) {
      bb.style.opacity = "1";
      setTimeout(() => {
        bb.style.opacity = "0";
      }, 2600);
    }
  }
  G.save.bestWave = Math.max(G.save.bestWave, G.wave);
  writeSave(G.save);

  const p = G.player;
  for (let i = 0; i < n; i++) {
    const slot = i / Math.max(1, n - 1);
    const pattern = i % 3;
    let hdg = p.heading;
    let meters = 520 + i * 90;
    if (pattern === 0) {
      hdg = p.heading + (slot - 0.5) * 0.35;
      meters = 480 + i * 70;
    } else if (pattern === 1) {
      hdg = p.heading + 1.15 + (Math.random() - 0.5) * 0.2;
      meters = 700 + i * 50;
    } else {
      hdg = p.heading - 1.15 + (Math.random() - 0.5) * 0.2;
      meters = 640 + i * 55;
    }
    const dist = meters / 111320;
    const kind = isBoss && i === 0 ? "leader" : isBoss || G.wave >= 8 ? "ace" : "bandit";
    const hp = rank.enemyHp * (kind === "leader" ? 2.2 : kind === "ace" ? 1.35 : 1) * (G.difficulty > 1 ? 1 + (G.difficulty - 1) * 0.28 : 1);
    const e: Enemy = {
      id: eid++,
      lon: p.lon + Math.sin(hdg) * dist,
      lat: p.lat + Math.cos(hdg) * dist * 0.85,
      alt: p.alt + (Math.random() - 0.3) * 180,
      heading: hdg + Math.PI + (Math.random() - 0.5) * 0.25,
      pitch: -0.04,
      roll: 0,
      speed: 120 * rank.spd,
      hp,
      maxHp: hp,
      kind,
      ai: "intercept",
      gunCd: 0.4 + Math.random() * 0.5,
      mslCd: 4 + Math.random() * 5,
      flareCd: 0,
      entity: null,
      dead: false,
      callsign: `${CALLSIGNS[i % CALLSIGNS.length]}-${(i + 1).toString().padStart(2, "0")}`,
      spdMul: rank.spd * (kind === "ace" ? 1.12 : 1),
    };
    const color = kind === "leader" ? "#fbbf24" : kind === "ace" ? "#ef4444" : "#f87171";
    e.entity = addJet(color, () => e, kind === "leader" ? 5.1 : 4.0);
    G.enemies.push(e);
  }
}

function showBanner(kicker: string, title: string, rank: string): void {
  const el = document.getElementById("waveBanner");
  const k = el?.querySelector(".wb-kicker");
  if (k) k.textContent = kicker;
  const t = document.getElementById("waveTitle");
  const r = document.getElementById("waveRank");
  if (t) t.textContent = title;
  if (r) r.textContent = rank;
  if (el) el.style.opacity = "1";
  setTimeout(() => {
    if (el) el.style.opacity = "0";
  }, 2200);
}

function spawnTracer(fromPlayer: boolean, lon: number, lat: number, alt: number, heading: number, pitch: number, speed: number, dmg: number): void {
  const pts = ensurePointCollection();
  const color = fromPlayer ? Cesium.Color.fromCssColorString("#fde68a") : Cesium.Color.fromCssColorString("#fb7185");
  const prim = pts.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
    pixelSize: fromPlayer ? 6 : 5,
    color,
    outlineColor: Cesium.Color.ORANGE,
    outlineWidth: 1,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  });
  const t: Tracer = { lon, lat, alt, heading, pitch, speed, t: 0, life: 1.35, fromPlayer, dmg, prim };
  G.tracers.push(t);
}

export function fireGun(): void {
  audio.gun();
  const p = G.player;
  let hdg = p.heading;
  let pit = p.pitch;
  if (G.locked && !G.locked.dead) {
    const brg = bearingTo(p.lon, p.lat, G.locked.lon, G.locked.lat);
    const dh = wrapPi(brg - p.heading);
    if (Math.abs(dh) < 0.3) hdg = p.heading + dh * 0.42;
    const d = distM(p.lon, p.lat, p.alt, G.locked.lon, G.locked.lat, G.locked.alt);
    pit = p.pitch + (Math.atan2(G.locked.alt - p.alt, Math.max(1, d)) - p.pitch) * 0.35;
  }
  spawnTracer(true, p.lon, p.lat, p.alt - 1, hdg, pit, p.speed + 420, G.gunDmg);
}

export function fireMissile(free = false): void {
  if (!free && G.missileCd > 0) return;
  const hard = G.lockProg >= HARD_LOCK && G.locked && !G.locked.dead;
  if (!free && !hard && G.lockProg < 0.34) {
    audio.gun();
    return;
  }
  if (!free) G.missileCd = hard ? 2.1 : 2.7;
  audio.missile();
  const p = G.player;
  const m: Missile = {
    lon: p.lon,
    lat: p.lat,
    alt: p.alt - 3,
    heading: p.heading,
    pitch: p.pitch,
    speed: p.speed + 210,
    t: 0,
    fromPlayer: true,
    targetEnemy: hard ? G.locked : G.locked && !G.locked.dead ? G.locked : null,
    toPlayer: false,
    dmg: hard ? 62 : 32,
    trail: [],
    entity: null,
    dead: false,
    flared: false,
  };
  m.entity = missileEntity(m, "#fbbf24");
  G.missiles.push(m);
}

export function fireEnemyGun(e: Enemy): void {
  spawnTracer(false, e.lon, e.lat, e.alt, e.heading, e.pitch, e.speed + 380, (7 + Math.random() * 6) * G.difficulty);
}

export function fireEnemyMissile(e: Enemy): void {
  audio.missile();
  G.rwr = true;
  G.incoming += 1;
  const m: Missile = {
    lon: e.lon,
    lat: e.lat,
    alt: e.alt,
    heading: e.heading,
    pitch: e.pitch,
    speed: e.speed + 190,
    t: 0,
    fromPlayer: false,
    targetEnemy: null,
    toPlayer: true,
    dmg: 22 * G.difficulty,
    trail: [],
    entity: null,
    dead: false,
    flared: false,
  };
  m.entity = missileEntity(m, "#fb7185");
  G.missiles.push(m);
}

function missileEntity(m: Missile, color: string): any {
  return G.viewer.entities.add({
    position: new Cesium.CallbackPositionProperty(() => Cesium.Cartesian3.fromDegrees(m.lon, m.lat, m.alt), false),
    point: {
      pixelSize: 10,
      color: Cesium.Color.fromCssColorString(color),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 1,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        if (m.trail.length < 2) return [Cesium.Cartesian3.fromDegrees(m.lon, m.lat, m.alt), Cesium.Cartesian3.fromDegrees(m.lon, m.lat, m.alt)];
        return m.trail.map((t) => Cesium.Cartesian3.fromDegrees(t[0], t[1], t[2]));
      }, false),
      width: 3.2,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.22,
        color: Cesium.Color.fromCssColorString(color).withAlpha(0.85),
      }),
    },
  });
}

export function tryFlare(): void {
  if (G.mode === "free" || G.gameOver || G.flareCd > 0 || G.player.flares <= 0) return;
  G.player.flares -= 1;
  G.flareCd = 2.6;
  audio.flare();
  const p = G.player;
  const back = p.heading + Math.PI;
  const flon = p.lon + Math.sin(back) * (40 / 111320);
  const flat = p.lat + Math.cos(back) * (40 / 111320);
  burstExplosion(flon, flat, p.alt - 8, 0.45);
  for (const m of G.missiles) {
    if (m.dead || !m.toPlayer) continue;
    const d = distM(m.lon, m.lat, m.alt, p.lon, p.lat, p.alt);
    if (d < 1100 && Math.random() < 0.78) {
      m.flared = true;
      m.toPlayer = false;
      G.incoming = Math.max(0, G.incoming - 1);
    }
  }
  const el = document.getElementById("flareCount");
  if (el) el.textContent = String(G.player.flares);
}

export function trySkill(): void {
  if (G.mode === "free" || G.gameOver || G.skillCd > 0) return;
  const sk = G.activeSkill;
  if (sk === "afterburn") {
    G.skillCd = 8;
    G.skillLeft = 3;
    G.boostMul = 1.58;
  } else if (sk === "evade") {
    G.skillCd = 10;
    G.skillLeft = 1.4;
    G.damageMul = 0.28;
  } else if (sk === "plate") {
    G.skillCd = 12;
    G.skillLeft = 4;
    G.damageMul = 0.48;
  } else if (sk === "missile") {
    G.skillCd = 7;
    G.skillLeft = 0.3;
    fireMissile(true);
    fireMissile(true);
  } else if (sk === "cloak") {
    G.skillCd = 14;
    G.skillLeft = 4.2;
    G.cloaked = true;
    G.damageMul = 0.55;
  } else if (sk === "repair") {
    G.skillCd = 16;
    G.skillLeft = 2.2;
    G.player.hp = Math.min(G.player.maxHp, G.player.hp + 34);
  } else {
    G.skillCd = 8;
    G.skillLeft = 3;
    G.boostMul = 1.55;
  }
  audio.gun();
}

export function tryPotion(): void {
  if (G.mode === "free" || G.gameOver || G.save.potions <= 0) return;
  G.save.potions -= 1;
  G.player.hp = Math.min(G.player.maxHp, G.player.hp + 42);
  writeSave(G.save);
  const el = document.getElementById("potionCount");
  if (el) el.textContent = String(G.save.potions);
  audio.hit();
}

export function killEnemy(e: Enemy): void {
  if (e.dead) return;
  e.dead = true;
  e.hp = 0;
  G.kills += 1;
  G.waveDown += 1;
  if (G.locked === e) {
    G.locked = null;
    G.lockProg = 0;
  }
  G.killStreak += 1;
  G.killStreakT = 3.2;
  const rank = rankFor(Math.max(1, G.wave));
  let gold = Math.round(40 * rank.goldMul * (1 + Math.min(0.5, (G.killStreak - 1) * 0.12)) * (0.85 + G.difficulty * 0.15));
  if (e.kind === "leader") {
    gold = Math.round(gold * 2.6);
    G.save.diamonds += 5;
  } else if (e.kind === "ace") gold = Math.round(gold * 1.4);
  G.save.gold += gold;
  G.save.totalKills += 1;
  addXp(G.save, 18 + (e.kind === "leader" ? 40 : 0));
  writeSave(G.save);
  audio.boom();
  burstExplosion(e.lon, e.lat, e.alt, e.kind === "leader" ? 1.6 : 1);
  toast(`${e.kind === "leader" ? "ACE " : ""}KILL +${gold}G`);
  if (G.killStreak >= 2) {
    const ct = document.getElementById("comboToast");
    if (ct) {
      ct.textContent = `x${G.killStreak} COMBO`;
      ct.style.opacity = "1";
      setTimeout(() => {
        ct.style.opacity = "0";
      }, 700);
    }
  }
  const host = document.getElementById("cesiumContainer");
  if (host) {
    host.classList.remove("shake");
    void host.offsetWidth;
    host.classList.add("shake");
  }
  if (e.entity) {
    try {
      G.viewer.entities.remove(e.entity);
    } catch {
      /* */
    }
    e.entity = null;
  }
}

export function damagePlayer(amount: number): void {
  if (G.gameOver) return;
  G.player.hp = Math.max(0, G.player.hp - amount * G.damageMul);
  const flash = document.getElementById("dmgFlash");
  if (flash) {
    flash.style.opacity = "1";
    setTimeout(() => {
      flash.style.opacity = "0";
    }, 110);
  }
  audio.hit();
  if (G.player.hp <= 0) {
    G.gameOver = true;
    burstExplosion(G.player.lon, G.player.lat, G.player.alt, 1.8);
    if (G.kills > (G.save.bestKills || 0)) {
      G.save.bestKills = G.kills;
      writeSave(G.save);
    }
    const go = document.getElementById("gameOver");
    const gk = document.getElementById("goKills");
    const gt = document.getElementById("goTime");
    const gs = document.getElementById("goStats");
    if (gk) gk.textContent = String(G.kills);
    if (gt) gt.textContent = String(Math.round(G.aliveTime));
    if (gs) gs.textContent = `GOLD ${G.save.gold} · DIA ${G.save.diamonds} · Lv.${G.save.level} · ${theaterById(G.theaterId).name}`;
    if (go) go.style.display = "flex";
  }
}

function toast(text: string): void {
  const el = document.getElementById("killToast");
  if (!el) return;
  el.textContent = text;
  el.style.opacity = "1";
  setTimeout(() => {
    el.style.opacity = "0";
  }, 900);
}

function updateLock(dt: number): void {
  const p = G.player;
  let cand: Enemy | null = null;
  let best = 1e12;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = distM(p.lon, p.lat, p.alt, e.lon, e.lat, e.alt);
    if (d > 3400) continue;
    const dh = wrapPi(bearingTo(p.lon, p.lat, e.lon, e.lat) - p.heading);
    if (Math.abs(dh) < LOCK_CONE && d < best) {
      best = d;
      cand = e;
    }
  }
  if (cand) {
    G.locked = cand;
    const dh = wrapPi(bearingTo(p.lon, p.lat, cand.lon, cand.lat) - p.heading);
    const center = 1 - Math.min(1, Math.abs(dh) / LOCK_CONE);
    const range = 1 - Math.min(1, best / 3400);
    const prev = G.lockProg;
    G.lockProg = Math.min(1, G.lockProg + (0.85 + center * 1.7 + range * 0.9) * dt);
    if (prev < HARD_LOCK && G.lockProg >= HARD_LOCK) audio.lock();
  } else {
    G.lockProg = Math.max(0, G.lockProg - 1.55 * dt);
    if (G.lockProg < 0.1) G.locked = null;
  }
}

function updateTracers(dt: number): void {
  const pts = G.points;
  for (let i = G.tracers.length - 1; i >= 0; i--) {
    const b = G.tracers[i];
    b.t += dt;
    if (b.t > b.life) {
      try {
        if (b.prim && pts) pts.remove(b.prim);
      } catch {
        /* */
      }
      G.tracers.splice(i, 1);
      continue;
    }
    moveBody(b, dt);
    if (b.prim) {
      try {
        (b.prim as { position: unknown }).position = Cesium.Cartesian3.fromDegrees(b.lon, b.lat, b.alt);
      } catch {
        /* */
      }
    }
    if (b.fromPlayer) {
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (distM(b.lon, b.lat, b.alt, e.lon, e.lat, e.alt) < 48) {
          e.hp -= b.dmg * (Math.random() < 0.12 ? 2 : 1);
          try {
            if (b.prim && pts) pts.remove(b.prim);
          } catch {
            /* */
          }
          G.tracers.splice(i, 1);
          if (e.hp <= 0) killEnemy(e);
          break;
        }
      }
    } else if (distM(b.lon, b.lat, b.alt, G.player.lon, G.player.lat, G.player.alt) < 38) {
      damagePlayer(b.dmg);
      try {
        if (b.prim && pts) pts.remove(b.prim);
      } catch {
        /* */
      }
      G.tracers.splice(i, 1);
    }
  }
}

function updateMissiles(dt: number): void {
  G.incoming = G.missiles.filter((m) => !m.dead && m.toPlayer).length;
  G.rwr = G.incoming > 0;
  for (let i = G.missiles.length - 1; i >= 0; i--) {
    const m = G.missiles[i];
    m.t += dt;
    if (m.t > 5.2 || m.dead) {
      removeMissile(m, i);
      continue;
    }
    if (m.fromPlayer && m.targetEnemy && !m.targetEnemy.dead) {
      steerTo(m, m.targetEnemy.lon, m.targetEnemy.lat, m.targetEnemy.alt, dt, 3.4);
    } else if (m.toPlayer && !m.flared) {
      steerTo(m, G.player.lon, G.player.lat, G.player.alt, dt, 2.6);
    } else if (m.flared) {
      m.pitch += 0.4 * dt;
      m.heading += 0.8 * dt;
    }
    moveBody(m, dt);
    m.trail.push([m.lon, m.lat, m.alt]);
    if (m.trail.length > 18) m.trail.shift();

    if (m.fromPlayer) {
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (distM(m.lon, m.lat, m.alt, e.lon, e.lat, e.alt) < 70) {
          e.hp -= m.dmg;
          burstExplosion(e.lon, e.lat, e.alt, 0.7);
          removeMissile(m, i);
          if (e.hp <= 0) killEnemy(e);
          break;
        }
      }
    } else if (!m.flared && distM(m.lon, m.lat, m.alt, G.player.lon, G.player.lat, G.player.alt) < 48) {
      damagePlayer(m.dmg);
      burstExplosion(G.player.lon, G.player.lat, G.player.alt, 0.8);
      removeMissile(m, i);
    }
  }
}

function steerTo(m: Missile, lon: number, lat: number, alt: number, dt: number, ag: number): void {
  const brg = bearingTo(m.lon, m.lat, lon, lat);
  const dh = wrapPi(brg - m.heading);
  m.heading += Math.max(-ag, Math.min(ag, dh * ag)) * dt;
  const d = distM(m.lon, m.lat, m.alt, lon, lat, alt);
  const elev = Math.atan2(alt - m.alt, Math.max(1, d));
  m.pitch += (elev - m.pitch) * Math.min(1, 4 * dt);
}

function removeMissile(m: Missile, i: number): void {
  m.dead = true;
  try {
    if (m.entity) G.viewer.entities.remove(m.entity);
  } catch {
    /* */
  }
  G.missiles.splice(i, 1);
}

async function onTheaterClear(): Promise<void> {
  const id = G.theaterId;
  if (!G.save.theatersCleared.includes(id)) G.save.theatersCleared.push(id);
  G.save.gold += 220;
  G.save.diamonds += 2;
  addXp(G.save, 80);
  writeSave(G.save);
  toast(`${theaterById(id).name} 확보`);
  if (G.mode !== "campaign") {
    G.waveHold = 1.4;
    return;
  }
  const idx = CAMPAIGN.indexOf(id);
  if (idx < 0 || idx >= CAMPAIGN.length - 1) {
    showBanner("WORLD CIRCUIT", "지구 제공권 확보", "CAMPAIGN CLEAR");
    G.waveHold = 2.2;
    return;
  }
  const next = CAMPAIGN[idx + 1];
  G.paused = true;
  await transitCinematic(id, next);
  G.theaterId = next;
  G.campaignIndex = idx + 1;
  G.theaterWave = 0;
  const t = theaterById(next);
  G.player.lon = t.lon;
  G.player.lat = t.lat;
  G.player.alt = 920;
  G.player.heading = t.heading;
  G.player.pitch = -0.04;
  G.player.roll = 0;
  applySolarNoon(t.lon, t.lat);
  spawnClouds(t.lon, t.lat);
  G.paused = false;
  showBanner("TRANSIT", t.name, t.briefing);
  G.waveHold = 1.2;
}

export function updateCombat(dt: number): void {
  G.aliveTime += dt;
  G.fireCd = Math.max(0, G.fireCd - dt);
  G.missileCd = Math.max(0, G.missileCd - dt);
  G.flareCd = Math.max(0, G.flareCd - dt);
  G.skillCd = Math.max(0, G.skillCd - dt);
  if (G.killStreakT > 0) {
    G.killStreakT -= dt;
    if (G.killStreakT <= 0) G.killStreak = 0;
  }
  if (G.radioT > 0) G.radioT -= dt;
  if (G.skillLeft > 0) {
    G.skillLeft = Math.max(0, G.skillLeft - dt);
    if (G.skillLeft <= 0) {
      G.boostMul = 1;
      G.damageMul = 1;
      G.cloaked = false;
    }
  }

  if ((input.firing || keys.has("Space")) && G.fireCd <= 0) {
    fireGun();
    G.fireCd = 0.085;
  }
  if (keys.has("KeyM")) {
    if (!input.missileHeld) fireMissile(false);
    input.missileHeld = true;
  } else input.missileHeld = false;
  if (keys.has("KeyF")) {
    if (!input.skillHeld) trySkill();
    input.skillHeld = true;
  } else input.skillHeld = false;
  if (keys.has("Digit1") || keys.has("KeyR")) {
    if (!input.potionHeld) tryPotion();
    input.potionHeld = true;
  } else input.potionHeld = false;
  if (keys.has("KeyG")) {
    if (!input.flareHeld) tryFlare();
    input.flareHeld = true;
  } else input.flareHeld = false;

  for (const e of G.enemies) {
    if (!e.dead) updateEnemy(e, dt, { gun: fireEnemyGun, missile: fireEnemyMissile });
  }
  updateLock(dt);
  updateTracers(dt);
  updateMissiles(dt);

  if (G.rwr) audio.rwr(performance.now());

  const sk = document.getElementById("skillBtn");
  if (sk) {
    sk.classList.toggle("ready", G.skillCd <= 0);
    const st = sk.querySelector("strong");
    if (st) st.textContent = G.skillCd > 0 ? `${Math.ceil(G.skillCd)}s` : "F";
  }
  const mb = document.getElementById("missileBtn");
  if (mb) {
    (mb as HTMLButtonElement).disabled = G.missileCd > 0;
    mb.textContent = G.missileCd > 0 ? `${Math.ceil(G.missileCd)}s` : "M";
  }
  const fb = document.getElementById("flareBtn");
  if (fb) {
    (fb as HTMLButtonElement).disabled = G.flareCd > 0 || G.player.flares <= 0;
    const fc = document.getElementById("flareCount");
    if (fc) fc.textContent = String(G.player.flares);
  }

  if (G.waveHold > 0) {
    G.waveHold -= dt;
    if (G.waveHold <= 0) {
      G.waveHold = 0;
      spawnWave();
    }
  } else if (G.enemies.length && G.enemies.every((e) => e.dead)) {
    const rank = rankFor(G.wave);
    const gold = Math.round((60 + G.wave * 14) * rank.goldMul);
    G.save.gold += gold;
    if (G.wave % 5 === 0) G.save.diamonds += 3;
    addXp(G.save, 42 + G.wave * 4);
    writeSave(G.save);
    toast(`WAVE CLEAR +${gold}G`);
    G.enemies.length = 0;
    if (G.theaterWave >= WAVES_PER_THEATER) {
      void onTheaterClear();
    } else {
      G.waveHold = 1.25;
    }
  }
}

export function clearCombatEntities(): void {
  for (const e of G.enemies) {
    try {
      if (e.entity) G.viewer.entities.remove(e.entity);
    } catch {
      /* */
    }
  }
  for (const m of G.missiles) {
    try {
      if (m.entity) G.viewer.entities.remove(m.entity);
    } catch {
      /* */
    }
  }
  G.enemies.length = 0;
  G.missiles.length = 0;
  G.tracers.length = 0;
  try {
    if (G.points) {
      G.viewer.scene.primitives.remove(G.points);
      G.points = null;
    }
  } catch {
    G.points = null;
  }
  if (G.playerEntity) {
    try {
      G.viewer.entities.remove(G.playerEntity);
    } catch {
      /* */
    }
    G.playerEntity = null;
  }
}
