import { G } from "./state";
import type { Enemy } from "./types";
import { bearingTo, clockHour, distM, leadPoint, moveBody, wrapPi } from "./math";

export function updateEnemy(
  e: Enemy,
  dt: number,
  fire: { gun: (en: Enemy) => void; missile: (en: Enemy) => void },
): void {
  const p = G.player;
  let focus = { lon: p.lon, lat: p.lat, alt: p.alt, heading: p.heading, speed: p.speed, cloak: G.cloaked };
  if (e.hunt === "wingman") {
    const w = G.wingmen.find((x) => !x.dead);
    if (w) focus = { lon: w.lon, lat: w.lat, alt: w.alt, heading: w.heading, speed: w.speed, cloak: false };
  } else if (e.hunt === "city") {
    const city = G.grounds.find((g) => g.kind === "city" && !g.dead);
    if (city) focus = { lon: city.lon, lat: city.lat, alt: 160, heading: 0, speed: 0, cloak: false };
  }
  const d = distM(e.lon, e.lat, e.alt, focus.lon, focus.lat, focus.alt);
  const brg = bearingTo(e.lon, e.lat, focus.lon, focus.lat);
  const ata = wrapPi(brg - e.heading);
  const aspect = wrapPi(bearingTo(focus.lon, focus.lat, e.lon, e.lat) - focus.heading);

  const turn = e.kind === "ace" ? 1.55 : e.kind === "leader" ? 1.32 : 1.18;
  const gunRange = e.kind === "ace" ? 1500 : 1250;

  if (e.hp < e.maxHp * 0.22 && d < 700) e.ai = "break";
  else if (Math.abs(ata) < 0.22 && d < gunRange) e.ai = "guns";
  else if (d < 260) e.ai = "break";
  else if (d > 4200) e.ai = "rejoin";
  else if (Math.abs(aspect) < 0.5 && d < 900 && Math.abs(ata) > 1.2) e.ai = "break";
  else e.ai = "intercept";

  let desired = brg;
  let desiredPitch = 0;
  const dAlt = focus.alt - e.alt;

  if (e.ai === "intercept") {
    const leadT = Math.min(1.1, d / 3800);
    const lp = leadPoint(focus.lon, focus.lat, focus.heading, focus.speed, leadT);
    desired = bearingTo(e.lon, e.lat, lp.lon, lp.lat);
    desiredPitch = Math.max(-0.45, Math.min(0.38, dAlt * 0.0007));
    e.speed = (92 + Math.min(70, d * 0.004)) * e.spdMul;
  } else if (e.ai === "guns") {
    desired = brg;
    desiredPitch = Math.max(-0.4, Math.min(0.32, Math.atan2(dAlt, Math.max(80, d))));
    e.speed = (100 + focus.speed * 0.25) * e.spdMul;
    e.gunCd -= dt;
    if (e.gunCd <= 0 && Math.abs(ata) < 0.28 && d < gunRange && (!focus.cloak || d < 260)) {
      fire.gun(e);
      e.gunCd = e.kind === "ace" ? 0.09 : 0.13;
    }
  } else if (e.ai === "break") {
    desired = e.heading + (ata >= 0 ? 1.4 : -1.4);
    desiredPitch = 0.22;
    e.speed = 88 * e.spdMul;
  } else if (e.ai === "rejoin") {
    desired = brg;
    desiredPitch = 0.12;
    e.speed = 130 * e.spdMul;
  }

  const dh = wrapPi(desired - e.heading);
  e.heading += Math.max(-turn, Math.min(turn, dh * 2.1)) * dt;
  e.heading = Math.atan2(Math.sin(e.heading), Math.cos(e.heading));
  e.roll = Math.max(-1.05, Math.min(1.05, dh * 1.05));
  e.pitch += (desiredPitch - e.pitch) * Math.min(1, 3.2 * dt);
  moveBody(e, dt);
  if (e.alt < 90) e.alt = 90;
  if (e.alt > 9000) e.alt = 9000;

  if (e.friendly) return;

  e.mslCd -= dt;
  if (
    e.mslCd <= 0 &&
    d > 520 &&
    d < 2800 &&
    Math.abs(ata) < 0.38 &&
    (e.kind !== "bandit" || G.wave >= 2)
  ) {
    fire.missile(e);
    e.mslCd = e.kind === "leader" ? 7.5 : e.kind === "ace" ? 9 : 13;
  }

  const dPlayer = distM(e.lon, e.lat, e.alt, p.lon, p.lat, p.alt);
  if (dPlayer < 14000) {
    const hour = clockHour(wrapPi(bearingTo(p.lon, p.lat, e.lon, e.lat) - p.heading));
    if (dPlayer < 1800 && G.radioT <= 0) {
      G.radio =
        `${e.callsign} ${hour}시` + (e.alt > p.alt + 80 ? " 하이" : e.alt < p.alt - 80 ? " 로우" : "");
      G.radioT = 2.4;
    }
  }
}

export function updateWingman(
  w: Enemy,
  dt: number,
  fire: { gun: (en: Enemy) => void },
): void {
  const foes = G.enemies.filter((e) => !e.dead);
  let tgt: Enemy | null = null;
  let best = 1e12;
  for (const e of foes) {
    const d = distM(w.lon, w.lat, w.alt, e.lon, e.lat, e.alt);
    if (d < best) {
      best = d;
      tgt = e;
    }
  }
  const p = G.player;
  const side = w.callsign.includes("2") ? -1 : 1;
  if (G.aliveTime < 4 || !tgt || best > 1400) {
    const slot = 50 / 111320;
    const wantLon = p.lon + Math.sin(p.heading + side * 0.9) * slot;
    const wantLat = p.lat + Math.cos(p.heading + side * 0.9) * slot;
    const brg = bearingTo(w.lon, w.lat, wantLon, wantLat);
    const dh = wrapPi(brg - w.heading);
    w.heading += Math.max(-1.2, Math.min(1.2, dh * 2)) * dt;
    w.roll = dh * 0.8;
    w.pitch += ((p.pitch - w.pitch) * 2 + (p.alt + (side > 0 ? 12 : 6) - w.alt) * 0.0005) * dt;
    w.speed = p.speed * 0.98;
    w.heading += wrapPi(p.heading - w.heading) * 1.4 * dt;
    moveBody(w, dt);
    return;
  }
  const brg = bearingTo(w.lon, w.lat, tgt.lon, tgt.lat);
  const ata = wrapPi(brg - w.heading);
  const dh = wrapPi(brg - w.heading);
  w.heading += Math.max(-1.5, Math.min(1.5, dh * 2.2)) * dt;
  w.roll = Math.max(-1, Math.min(1, dh));
  const dAlt = tgt.alt - w.alt;
  w.pitch += (Math.max(-0.4, Math.min(0.35, dAlt * 0.0008)) - w.pitch) * 3 * dt;
  w.speed = 110 * w.spdMul;
  moveBody(w, dt);
  if (w.alt < 90) w.alt = 90;
  w.gunCd -= dt;
  if (w.gunCd <= 0 && Math.abs(ata) < 0.32 && best < 1400) {
    fire.gun(w);
    w.gunCd = 0.11;
  }
}
