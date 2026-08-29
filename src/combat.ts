import { CAMPAIGN, CALLSIGNS, HARD_LOCK, LOCK_CONE, WAVES_PER_THEATER, craftById, rankFor, theaterById } from "./config";
import { G } from "./state";
import type { Enemy, GroundTarget, Missile, Tracer } from "./types";
import { bearingTo, distM, moveBody, wrapPi } from "./math";
import { audio } from "./audio";
import { burstExplosion, ensurePointCollection, ensurePolylineCollection, hitSpark } from "./fx";
import { addXp, writeSave } from "./save";
import { updateEnemy, updateWingman } from "./ai";
import { jetModelUri, missileModelUri } from "./models";
import { transitCinematic, spawnClouds, applyTheaterMood } from "./world";
import { input, keys } from "./input";

let eid = 1;

type PoseGetter = () => { lon: number; lat: number; alt: number; heading: number; pitch: number; roll: number };

function addJet(
  color: string,
  getter: PoseGetter,
  scale: number,
  variant: string,
  label?: string,
): { jet: any; exhaust: any } {
  const tint = Cesium.Color.fromCssColorString(color);
  const jet = G.viewer.entities.add({
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
      uri: jetModelUri(color, variant),
      minimumPixelSize: 62,
      maximumScale: 16000,
      scale,
      color: tint,
      colorBlendMode: Cesium.ColorBlendMode.MIX,
      colorBlendAmount: 0.2,
      silhouetteColor: tint.withAlpha(0.72),
      silhouetteSize: 1.55,
    },
    point: {
      pixelSize: label ? 10 : 0,
      color: tint,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: label
      ? {
          text: label,
          font: "bold 15px sans-serif",
          fillColor: tint,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 4,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -36),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        }
      : undefined,
  });
  const exhaust = G.viewer.entities.add({
    position: new Cesium.CallbackPositionProperty(() => {
      const p = getter();
      const c = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt);
      const q = Cesium.Transforms.headingPitchRollQuaternion(
        c,
        new Cesium.HeadingPitchRoll(p.heading, p.pitch, p.roll),
      );
      const rot = Cesium.Matrix3.fromQuaternion(q);
      const back = Cesium.Matrix3.multiplyByVector(rot, new Cesium.Cartesian3(-11, 0, -0.6), new Cesium.Cartesian3());
      return Cesium.Cartesian3.add(c, back, new Cesium.Cartesian3());
    }, false),
    point: {
      pixelSize: 12,
      color: Cesium.Color.fromCssColorString("#ffb347"),
      outlineColor: Cesium.Color.fromCssColorString("#fff7ed"),
      outlineWidth: 1,
      scaleByDistance: new Cesium.NearFarScalar(60, 18, 14000, 3),
      disableDepthTestDistance: 80,
    },
  });
  return { jet, exhaust };
}

export function spawnPlayerCraft(): void {
  const craft = craftById(G.equipped);
  const spawned = addJet(craft.color, () => G.player, 4.2, craft.id);
  G.playerEntity = spawned.jet;
  G.playerExhaust = spawned.exhaust;
  G.playerTrail = [];
  if (G.trailEntity) {
    try {
      G.viewer.entities.remove(G.trailEntity);
    } catch {
      /* */
    }
  }
  G.trailEntity = G.viewer.entities.add({
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        if (G.playerTrail.length < 2) {
          const p = G.player;
          const a = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt);
          return [a, a];
        }
        return G.playerTrail.map((t) => Cesium.Cartesian3.fromDegrees(t[0], t[1], t[2]));
      }, false),
      width: 2.6,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.2,
        color: Cesium.Color.fromCssColorString("#e0f2fe").withAlpha(0.55),
      }),
    },
  });
}

function offsetFrom(p: { lon: number; lat: number; alt: number; heading: number }, hdgOff: number, meters: number, dAlt: number) {
  const h = p.heading + hdgOff;
  const d = meters / 111320;
  return {
    lon: p.lon + Math.sin(h) * d,
    lat: p.lat + Math.cos(h) * d * 0.85,
    alt: p.alt + dAlt,
  };
}

function makeWingman(callsign: string, hdgOff: number, meters: number, dAlt: number, color: string): Enemy {
  const p = G.player;
  const o = offsetFrom(p, hdgOff, meters, dAlt);
  const w: Enemy = {
    id: eid++,
    lon: o.lon,
    lat: o.lat,
    alt: o.alt,
    heading: p.heading,
    pitch: p.pitch,
    roll: 0,
    speed: p.speed,
    hp: 96,
    maxHp: 96,
    kind: "ace",
    ai: "intercept",
    gunCd: 0.25,
    mslCd: 99,
    flareCd: 0,
    entity: null,
    exhaust: null,
    dead: false,
    callsign,
    spdMul: 1.04,
    friendly: true,
  };
  const spawned = addJet(color, () => w, 4.6, "kestrel", callsign);
  w.entity = spawned.jet;
  w.exhaust = spawned.exhaust;
  G.wingmen.push(w);
  return w;
}

export function spawnWingman(): void {
  makeWingman("GHOST-1", Math.PI / 2 * 0.55, 48, 14, "#7dd3fc");
  makeWingman("GHOST-2", -Math.PI / 2 * 0.62, 44, 8, "#67e8f9");
  G.radio = "GHOST-1 / GHOST-2 편대 합류";
  G.radioT = 3.4;
}

export function spawnGroundTargets(): void {
  const p = G.player;
  const ahead = [380, 620, 860];
  for (let i = 0; i < 3; i++) {
    const h = p.heading + (i === 1 ? -0.16 : i === 2 ? 0.16 : 0);
    const pos = offsetFrom({ lon: p.lon, lat: p.lat, alt: p.alt, heading: h }, 0, ahead[i], 0);
    const g: GroundTarget = {
      id: eid++,
      lon: pos.lon,
      lat: pos.lat,
      alt: 48,
      hp: 110,
      maxHp: 110,
      kind: "site",
      entity: null,
      dead: false,
      label: `SITE-${i + 1}`,
    };
    g.entity = G.viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(g.lon, g.lat, 90),
      cylinder: {
        length: 180,
        topRadius: 22,
        bottomRadius: 48,
        material: Cesium.Color.fromCssColorString("#f97316").withAlpha(0.92),
        outline: true,
        outlineColor: Cesium.Color.WHITE,
      },
      label: {
        text: `▼ ${g.label} 파괴`,
        font: "bold 16px sans-serif",
        fillColor: Cesium.Color.fromCssColorString("#fed7aa"),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -64),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    G.grounds.push(g);
  }
}

export function spawnCityDefense(): void {
  const t = theaterById(G.theaterId);
  const g: GroundTarget = {
    id: eid++,
    lon: t.lon,
    lat: t.lat,
    alt: 20,
    hp: 170,
    maxHp: 170,
    kind: "city",
    entity: null,
    dead: false,
    label: t.name,
  };
  g.entity = G.viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(g.lon, g.lat, 30),
    ellipse: {
      semiMajorAxis: 420,
      semiMinorAxis: 420,
      material: Cesium.Color.fromCssColorString("#38bdf8").withAlpha(0.22),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString("#7dd3fc"),
      height: 24,
    },
    label: {
      text: `DEFEND ${t.name}`,
      font: "14px sans-serif",
      fillColor: Cesium.Color.fromCssColorString("#e0f2fe"),
      pixelOffset: new Cesium.Cartesian2(0, -36),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
  G.grounds.push(g);
}

function clearGrounds(): void {
  for (const g of G.grounds) {
    try {
      if (g.entity) G.viewer.entities.remove(g.entity);
    } catch {
      /* */
    }
  }
  G.grounds.length = 0;
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
  const th = theaterById(G.theaterId);
  if (G.theaterWave === 1) {
    if (th.mission === "strike") spawnGroundTargets();
    if (th.mission === "defend") spawnCityDefense();
  }
  G.objective =
    th.mission === "defend"
      ? "수도 방어 · 적기 전멸"
      : th.mission === "strike"
        ? "타격 · 지상 사이트 파괴"
        : th.mission === "escort"
          ? "편대 엄호 · 요격"
          : "요격 · 적기 전멸";
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
    let meters = 210 + i * 36 + Math.random() * 24;
    if (pattern === 0) {
      hdg = p.heading + (slot - 0.5) * 0.28;
      meters = 200 + i * 32;
    } else if (pattern === 1) {
      hdg = p.heading + 0.85 + (Math.random() - 0.5) * 0.15;
      meters = 260 + i * 30;
    } else {
      hdg = p.heading - 0.85 + (Math.random() - 0.5) * 0.15;
      meters = 250 + i * 30;
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
      exhaust: null,
      dead: false,
      callsign: `${CALLSIGNS[i % CALLSIGNS.length]}-${(i + 1).toString().padStart(2, "0")}`,
      spdMul: rank.spd * (kind === "ace" ? 1.12 : 1),
      hunt: th.mission === "escort" && i % 3 === 0 ? "wingman" : th.mission === "defend" && i % 2 === 0 ? "city" : "player",
    };
    const color = kind === "leader" ? "#fbbf24" : kind === "ace" ? "#ef4444" : "#f87171";
    const spawned = addJet(color, () => e, kind === "leader" ? 5.0 : 4.3, kind, e.callsign);
    e.entity = spawned.jet;
    e.exhaust = spawned.exhaust;
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

let barrel = 0;

type Spark = {
  lon: number;
  lat: number;
  alt: number;
  heading: number;
  pitch: number;
  speed: number;
  t: number;
  life: number;
  prim: any;
};
const flareSparks: Spark[] = [];

function spawnTracer(fromPlayer: boolean, lon: number, lat: number, alt: number, heading: number, pitch: number, speed: number, dmg: number): void {
  const pts = ensurePointCollection();
  const color = fromPlayer ? Cesium.Color.fromCssColorString("#fde68a") : Cesium.Color.fromCssColorString("#fb7185");
  const prim = pts.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
    pixelSize: fromPlayer ? 8 : 7,
    color,
    outlineColor: Cesium.Color.ORANGE,
    outlineWidth: 1,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  });
  let line: unknown = null;
  try {
    const lines = ensurePolylineCollection();
    line = lines.add({
      positions: [
        Cesium.Cartesian3.fromDegrees(lon, lat, alt),
        Cesium.Cartesian3.fromDegrees(lon, lat, alt),
      ],
      width: fromPlayer ? 3.4 : 2.8,
    });
    if (line && (line as { material?: unknown }).material) {
      (line as { material: unknown }).material = Cesium.Material.fromType("Color", { color: color.withAlpha(0.9) });
    }
  } catch {
    line = null;
  }
  const t: Tracer = {
    lon,
    lat,
    alt,
    heading,
    pitch,
    speed,
    t: 0,
    life: 1.45,
    fromPlayer,
    dmg,
    prim,
    line,
    trail: [[lon, lat, alt]],
  };
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
  const side = barrel ? 1 : -1;
  barrel ^= 1;
  const off = 14 / 111320;
  spawnTracer(
    true,
    p.lon + Math.sin(hdg + Math.PI / 2) * off * side,
    p.lat + Math.cos(hdg + Math.PI / 2) * off * side,
    p.alt - 1,
    hdg,
    pit,
    p.speed + 440,
    G.gunDmg,
  );
}

export function fireMissile(free = false): void {
  if (!free && G.missileCd > 0) return;
  const hard = G.lockProg >= HARD_LOCK && G.locked && !G.locked.dead;
  const soft = !!(G.locked && !G.locked.dead);
  if (!free) G.missileCd = hard ? 2.0 : 2.4;
  audio.missile();
  toast(hard ? "LOCK MISSILE" : "MISSILE");
  const p = G.player;
  const m: Missile = {
    lon: p.lon,
    lat: p.lat,
    alt: p.alt - 3,
    heading: p.heading,
    pitch: p.pitch,
    speed: p.speed + (hard ? 180 : 140),
    t: 0,
    fromPlayer: true,
    targetEnemy: hard || soft ? G.locked : null,
    toPlayer: false,
    dmg: hard ? 62 : 28,
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

export function fireWingmanGun(e: Enemy): void {
  spawnTracer(true, e.lon, e.lat, e.alt, e.heading, e.pitch, e.speed + 400, 9);
}

export function fireEnemyMissile(e: Enemy): void {
  audio.missile();
  const wing = e.hunt === "wingman" ? G.wingmen.find((w) => !w.dead) : null;
  if (wing) {
    const m: Missile = {
      lon: e.lon,
      lat: e.lat,
      alt: e.alt,
      heading: e.heading,
      pitch: e.pitch,
      speed: e.speed + 190,
      t: 0,
      fromPlayer: false,
      targetEnemy: wing,
      toPlayer: false,
      dmg: 22 * G.difficulty,
      trail: [],
      entity: null,
      dead: false,
      flared: false,
    };
    m.entity = missileEntity(m, "#fb7185");
    G.missiles.push(m);
    return;
  }
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
    orientation: new Cesium.CallbackProperty(() => {
      const c = Cesium.Cartesian3.fromDegrees(m.lon, m.lat, m.alt);
      return Cesium.Transforms.headingPitchRollQuaternion(c, new Cesium.HeadingPitchRoll(m.heading, m.pitch, 0));
    }, false),
    model: {
      uri: missileModelUri(color),
      minimumPixelSize: 36,
      maximumScale: 16000,
      scale: 3.8,
    },
    point: {
      pixelSize: 14,
      color: Cesium.Color.fromCssColorString(color),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        if (m.trail.length < 2) return [Cesium.Cartesian3.fromDegrees(m.lon, m.lat, m.alt), Cesium.Cartesian3.fromDegrees(m.lon, m.lat, m.alt)];
        return m.trail.map((t) => Cesium.Cartesian3.fromDegrees(t[0], t[1], t[2]));
      }, false),
      width: 5.2,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.28,
        color: Cesium.Color.fromCssColorString(color).withAlpha(0.9),
      }),
    },
  });
}

export function tryFlare(): void {
  if (G.mode === "free" || G.gameOver || G.flareCd > 0 || G.player.flares <= 0) return;
  G.player.flares -= 1;
  G.flareCd = 2.6;
  audio.flare();
  toast("FLARE");
  const p = G.player;
  const back = p.heading + Math.PI;
  const pts = ensurePointCollection();
  for (let i = 0; i < 14; i++) {
    const spread = (Math.random() - 0.5) * 1.1;
    const m = (18 + Math.random() * 50) / 111320;
    const prim = pts.add({
      position: Cesium.Cartesian3.fromDegrees(p.lon + Math.sin(back + spread) * m, p.lat + Math.cos(back + spread) * m, p.alt - 4),
      pixelSize: 16 + Math.random() * 10,
      color: Cesium.Color.fromCssColorString(Math.random() < 0.5 ? "#fb923c" : "#fde68a"),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    });
    flareSparks.push({
      lon: p.lon + Math.sin(back + spread) * m,
      lat: p.lat + Math.cos(back + spread) * m,
      alt: p.alt - 4,
      heading: back + spread,
      pitch: -0.35 - Math.random() * 0.2,
      speed: 18 + Math.random() * 22,
      t: 0,
      life: 3.6 + Math.random() * 0.8,
      prim,
    });
  }
  burstExplosion(p.lon + Math.sin(back) * (40 / 111320), p.lat + Math.cos(back) * (40 / 111320), p.alt - 8, 0.45);
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
  if (e.exhaust) {
    try {
      G.viewer.entities.remove(e.exhaust);
    } catch {
      /* */
    }
    e.exhaust = null;
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

export function killWingman(w: Enemy): void {
  if (w.dead) return;
  w.dead = true;
  w.hp = 0;
  audio.boom();
  burstExplosion(w.lon, w.lat, w.alt, 1.1);
  G.radio = "GHOST-1 격추";
  G.radioT = 3;
  toast("GHOST-1 DOWN");
  if (w.entity) {
    try {
      G.viewer.entities.remove(w.entity);
    } catch {
      /* */
    }
    w.entity = null;
  }
}

export function damageGround(g: GroundTarget, amount: number): void {
  if (g.dead || g.kind === "city") return;
  g.hp -= amount;
  G.hitMark = 0.22;
  hitSpark(g.lon, g.lat, g.alt + 40);
  if (g.hp <= 0) killGround(g);
}

export function damageCity(amount: number): void {
  const city = G.grounds.find((x) => x.kind === "city" && !x.dead);
  if (!city) return;
  city.hp = Math.max(0, city.hp - amount);
  if (city.hp > 0) return;
  city.dead = true;
  audio.boom();
  burstExplosion(city.lon, city.lat, 80, 2);
  toast("수도 함락");
  G.gameOver = true;
  const go = document.getElementById("gameOver");
  const gk = document.getElementById("goKills");
  const gt = document.getElementById("goTime");
  const gs = document.getElementById("goStats");
  if (gk) gk.textContent = String(G.kills);
  if (gt) gt.textContent = String(Math.round(G.aliveTime));
  if (gs) gs.textContent = `${theaterById(G.theaterId).name} 방어 실패 · GOLD ${G.save.gold}`;
  if (go) go.style.display = "flex";
}

export function killGround(g: GroundTarget): void {
  if (g.dead) return;
  g.dead = true;
  g.hp = 0;
  G.save.gold += 80;
  addXp(G.save, 22);
  writeSave(G.save);
  audio.boom();
  burstExplosion(g.lon, g.lat, g.alt + 40, 1.2);
  toast(`${g.label} 파괴 +80G`);
  if (g.entity) {
    try {
      G.viewer.entities.remove(g.entity);
    } catch {
      /* */
    }
    g.entity = null;
  }
  maybeFinishStrike();
}

function maybeFinishStrike(): void {
  const th = theaterById(G.theaterId);
  if (th.mission !== "strike") return;
  const sitesLeft = G.grounds.filter((x) => !x.dead && x.kind === "site").length;
  const airLeft = G.enemies.some((x) => !x.dead);
  if (sitesLeft === 0 && !airLeft && G.theaterWave >= WAVES_PER_THEATER) {
    void onTheaterClear();
  }
}

function syncObjective(): void {
  const th = theaterById(G.theaterId);
  const air = G.enemies.filter((x) => !x.dead).length;
  if (th.mission === "strike") {
    const sites = G.grounds.filter((x) => !x.dead && x.kind === "site").length;
    G.objective = `타격 · 사이트 ${sites} · 적기 ${air}`;
  } else if (th.mission === "defend") {
    const city = G.grounds.find((x) => x.kind === "city" && !x.dead);
    G.objective = `방어 · 수도 HP ${city ? Math.round(city.hp) : 0} · 적기 ${air}`;
  } else if (th.mission === "escort") {
    const w = G.wingmen.some((x) => !x.dead);
    G.objective = w ? `엄호 · GHOST-1 생존 · 적기 ${air}` : `엄호 실패 · 독력 요격 · 적기 ${air}`;
  } else {
    G.objective = `요격 · 적기 ${air}`;
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
  const lines = G.lines;
  for (let i = G.tracers.length - 1; i >= 0; i--) {
    const b = G.tracers[i];
    b.t += dt;
    if (b.t > b.life) {
      try {
        if (b.prim && pts) pts.remove(b.prim);
      } catch {
        /* */
      }
      try {
        if (b.line && lines) lines.remove(b.line);
      } catch {
        /* */
      }
      G.tracers.splice(i, 1);
      continue;
    }
    moveBody(b, dt);
    b.trail.push([b.lon, b.lat, b.alt]);
    if (b.trail.length > 5) b.trail.shift();
    if (b.prim) {
      try {
        (b.prim as { position: unknown }).position = Cesium.Cartesian3.fromDegrees(b.lon, b.lat, b.alt);
      } catch {
        /* */
      }
    }
    if (b.line) {
      try {
        (b.line as { positions: unknown }).positions = b.trail.map((t) => Cesium.Cartesian3.fromDegrees(t[0], t[1], t[2]));
      } catch {
        /* */
      }
    }
    if (b.fromPlayer) {
      let hit = false;
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (distM(b.lon, b.lat, b.alt, e.lon, e.lat, e.alt) < 48) {
          e.hp -= b.dmg * (Math.random() < 0.12 ? 2 : 1);
          G.hitMark = 0.28;
          hitSpark(e.lon, e.lat, e.alt);
          try {
            if (b.prim && pts) pts.remove(b.prim);
          } catch {
            /* */
          }
          try {
            if (b.line && lines) lines.remove(b.line);
          } catch {
            /* */
          }
          G.tracers.splice(i, 1);
          if (e.hp <= 0) killEnemy(e);
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (const g of G.grounds) {
          if (g.dead || g.kind !== "site") continue;
          if (distM(b.lon, b.lat, b.alt, g.lon, g.lat, g.alt + 40) < 85) {
            damageGround(g, b.dmg);
            try {
              if (b.prim && pts) pts.remove(b.prim);
            } catch {
              /* */
            }
            try {
              if (b.line && lines) lines.remove(b.line);
            } catch {
              /* */
            }
            G.tracers.splice(i, 1);
            break;
          }
        }
      }
    } else if (distM(b.lon, b.lat, b.alt, G.player.lon, G.player.lat, G.player.alt) < 38) {
      damagePlayer(b.dmg);
      hitSpark(G.player.lon, G.player.lat, G.player.alt);
      try {
        if (b.prim && pts) pts.remove(b.prim);
      } catch {
        /* */
      }
      try {
        if (b.line && lines) lines.remove(b.line);
      } catch {
        /* */
      }
      G.tracers.splice(i, 1);
    } else {
      for (const w of G.wingmen) {
        if (w.dead) continue;
        if (distM(b.lon, b.lat, b.alt, w.lon, w.lat, w.alt) < 42) {
          w.hp -= b.dmg;
          hitSpark(w.lon, w.lat, w.alt);
          try {
            if (b.prim && pts) pts.remove(b.prim);
          } catch {
            /* */
          }
          try {
            if (b.line && lines) lines.remove(b.line);
          } catch {
            /* */
          }
          G.tracers.splice(i, 1);
          if (w.hp <= 0) killWingman(w);
          break;
        }
      }
    }
  }
}

function updateMissiles(dt: number): void {
  G.incoming = G.missiles.filter((m) => !m.dead && m.toPlayer).length;
  G.rwr = G.incoming > 0;
  for (let i = G.missiles.length - 1; i >= 0; i--) {
    const m = G.missiles[i];
    m.t += dt;
    if (m.t > 6.4 || m.dead) {
      removeMissile(m, i);
      continue;
    }
    if (m.fromPlayer && m.targetEnemy && !m.targetEnemy.dead) {
      steerTo(m, m.targetEnemy.lon, m.targetEnemy.lat, m.targetEnemy.alt, dt, 3.4);
    } else if (m.targetEnemy && m.targetEnemy.friendly && !m.targetEnemy.dead) {
      steerTo(m, m.targetEnemy.lon, m.targetEnemy.lat, m.targetEnemy.alt, dt, 2.6);
    } else if (m.toPlayer && !m.flared) {
      steerTo(m, G.player.lon, G.player.lat, G.player.alt, dt, 2.6);
    } else if (m.flared) {
      const decoy = flareSparks[0];
      if (decoy) steerTo(m, decoy.lon, decoy.lat, decoy.alt, dt, 4.2);
      else {
        m.pitch += 0.4 * dt;
        m.heading += 0.8 * dt;
      }
    }
    moveBody(m, dt);
    m.trail.push([m.lon, m.lat, m.alt]);
    if (m.trail.length > 36) m.trail.shift();

    if (m.fromPlayer) {
      let hit = false;
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (distM(m.lon, m.lat, m.alt, e.lon, e.lat, e.alt) < 70) {
          e.hp -= m.dmg;
          burstExplosion(e.lon, e.lat, e.alt, 0.7);
          removeMissile(m, i);
          if (e.hp <= 0) killEnemy(e);
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (const g of G.grounds) {
          if (g.dead || g.kind !== "site") continue;
          if (distM(m.lon, m.lat, m.alt, g.lon, g.lat, g.alt + 40) < 95) {
            damageGround(g, m.dmg);
            burstExplosion(g.lon, g.lat, g.alt + 40, 0.8);
            removeMissile(m, i);
            break;
          }
        }
      }
    } else if (m.targetEnemy && m.targetEnemy.friendly && !m.targetEnemy.dead) {
      const w = m.targetEnemy;
      if (distM(m.lon, m.lat, m.alt, w.lon, w.lat, w.alt) < 48) {
        w.hp -= m.dmg;
        burstExplosion(w.lon, w.lat, w.alt, 0.7);
        removeMissile(m, i);
        if (w.hp <= 0) killWingman(w);
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

let theaterClearing = false;

async function onTheaterClear(): Promise<void> {
  if (theaterClearing || G.transiting) return;
  theaterClearing = true;
  const id = G.theaterId;
  const th = theaterById(id);
  if (!G.save.theatersCleared.includes(id)) G.save.theatersCleared.push(id);
  if (!G.save.medals) G.save.medals = [];
  const medal = `${id}:${th.mission}`;
  if (!G.save.medals.includes(medal)) G.save.medals.push(medal);
  if (th.mission === "escort" && G.wingmen.some((w) => !w.dead)) {
    const extra = `${id}:escort-save`;
    if (!G.save.medals.includes(extra)) G.save.medals.push(extra);
  }
  G.save.gold += 220;
  G.save.diamonds += 2;
  addXp(G.save, 80);
  writeSave(G.save);
  toast(`${th.name} 확보`);
  clearGrounds();
  if (G.mode !== "campaign") {
    G.waveHold = 1.4;
    theaterClearing = false;
    return;
  }
  const idx = CAMPAIGN.indexOf(id);
  if (idx < 0 || idx >= CAMPAIGN.length - 1) {
    showBanner("WORLD CIRCUIT", "지구 제공권 확보", "CAMPAIGN CLEAR");
    G.waveHold = 2.2;
    theaterClearing = false;
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
  applyTheaterMood(next);
  spawnClouds(t.lon, t.lat);
  if (G.wingmen.every((w) => w.dead)) spawnWingman();
  G.paused = false;
  showBanner("TRANSIT", t.name, t.briefing);
  G.waveHold = 1.2;
  theaterClearing = false;
}

function updateFlares(dt: number): void {
  const pts = G.points;
  for (let i = flareSparks.length - 1; i >= 0; i--) {
    const f = flareSparks[i];
    f.t += dt;
    if (f.t > f.life) {
      try {
        if (f.prim && pts) pts.remove(f.prim);
      } catch {
        /* */
      }
      flareSparks.splice(i, 1);
      continue;
    }
    moveBody(f, dt);
    if (f.prim) {
      try {
        f.prim.position = Cesium.Cartesian3.fromDegrees(f.lon, f.lat, f.alt);
        f.prim.pixelSize = 10 + (1 - f.t / f.life) * 14;
      } catch {
        /* */
      }
    }
  }
}

export function updateCombat(dt: number): void {
  G.aliveTime += dt;
  G.hitMark = Math.max(0, G.hitMark - dt);
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
  for (const w of G.wingmen) {
    if (!w.dead) updateWingman(w, dt, { gun: fireWingmanGun });
  }
  const city = G.grounds.find((g) => g.kind === "city" && !g.dead);
  if (city && !G.gameOver) {
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (distM(e.lon, e.lat, e.alt, city.lon, city.lat, city.alt) < 500) {
        damageCity(5.5 * dt * G.difficulty);
      }
    }
  }
  syncObjective();
  updateLock(dt);
  updateTracers(dt);
  updateMissiles(dt);
  updateFlares(dt);

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
    const th = theaterById(G.theaterId);
    const sitesLeft = G.grounds.filter((g) => !g.dead && g.kind === "site").length;
    if (G.theaterWave >= WAVES_PER_THEATER) {
      if (th.mission === "strike" && sitesLeft > 0) {
        syncObjective();
      } else {
        void onTheaterClear();
      }
    } else {
      G.waveHold = 1.25;
    }
  }
}

export function clearCombatEntities(): void {
  clearGrounds();
  for (const e of [...G.enemies, ...G.wingmen]) {
    try {
      if (e.entity) G.viewer.entities.remove(e.entity);
    } catch {
      /* */
    }
    try {
      if (e.exhaust) G.viewer.entities.remove(e.exhaust);
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
  G.wingmen.length = 0;
  G.missiles.length = 0;
  G.tracers.length = 0;
  flareSparks.length = 0;
  G.playerTrail = [];
  try {
    if (G.points) {
      G.viewer.scene.primitives.remove(G.points);
      G.points = null;
    }
  } catch {
    G.points = null;
  }
  try {
    if (G.lines) {
      G.viewer.scene.primitives.remove(G.lines);
      G.lines = null;
    }
  } catch {
    G.lines = null;
  }
  if (G.playerEntity) {
    try {
      G.viewer.entities.remove(G.playerEntity);
    } catch {
      /* */
    }
    G.playerEntity = null;
  }
  if (G.playerExhaust) {
    try {
      G.viewer.entities.remove(G.playerExhaust);
    } catch {
      /* */
    }
    G.playerExhaust = null;
  }
  if (G.trailEntity) {
    try {
      G.viewer.entities.remove(G.trailEntity);
    } catch {
      /* */
    }
    G.trailEntity = null;
  }
}
