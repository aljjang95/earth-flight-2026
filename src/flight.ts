import { damagePlayer } from "./combat";
import { G } from "./state";
import { clamp } from "./math";
import { input, keys, readStick } from "./input";

function sampleGround(): number | null {
  if (!G.viewer) return null;
  try {
    const g = G.viewer.scene.globe.getHeight(Cesium.Cartographic.fromDegrees(G.player.lon, G.player.lat));
    if (g != null && Number.isFinite(g)) return g;
  } catch {
    /* */
  }
  return null;
}

export function updateFlight(dt: number): void {
  const p = G.player;
  G.groundTimer += dt;
  if (G.groundTimer > 0.28) {
    G.groundTimer = 0;
    G.lastGround = sampleGround();
  }

  let { rollCmd, pitchCmd } = readStick();
  const DEAD = 0.12;
  if (Math.abs(rollCmd) < DEAD) rollCmd = 0;
  if (Math.abs(pitchCmd) < DEAD) pitchCmd = 0;

  if (!input.mouseHeld) {
    input.mouseSteer *= Math.exp(-12 * dt);
    input.mousePitch *= Math.exp(-12 * dt);
    if (Math.abs(input.mouseSteer) < 0.04) input.mouseSteer = 0;
    if (Math.abs(input.mousePitch) < 0.04) input.mousePitch = 0;
  }

  const keySteer = keys.has("KeyA") || keys.has("KeyD") || keys.has("ArrowLeft") || keys.has("ArrowRight");
  const keyPitch = keys.has("KeyW") || keys.has("KeyS") || keys.has("ArrowUp") || keys.has("ArrowDown");
  if (Math.abs(input.stickSteer) < 0.02 && !keySteer && !input.mouseHeld) {
    rollCmd = 0;
    input.stickSteer = 0;
    input.mouseSteer = 0;
  }
  if (Math.abs(input.stickPitch) < 0.02 && !keyPitch && !input.mouseHeld) {
    pitchCmd = 0;
    input.stickPitch = 0;
    input.mousePitch = 0;
  }

  const targetRoll = rollCmd * 1.05;
  const rollLerp = Math.abs(rollCmd) < 0.03 ? 26 : 11;
  p.roll += (targetRoll - p.roll) * (1 - Math.exp(-rollLerp * dt));
  if (Math.abs(rollCmd) < 0.03) {
    if (Math.abs(p.roll) < 0.04) p.roll = 0;
    else p.roll *= Math.exp(-18 * dt);
  }
  if (Math.abs(p.roll) < 0.005) p.roll = 0;

  const idle = Math.abs(pitchCmd) < 0.08;
  const trim = G.mode === "free" ? -0.1 : -0.02;
  const targetPitch = idle ? trim + pitchCmd * 0.28 : pitchCmd * 0.92;
  p.pitch += (targetPitch - p.pitch) * (1 - Math.exp(-8.5 * dt));
  p.pitch = clamp(p.pitch, -1.05, 0.72);

  let rudder = 0;
  if (keys.has("KeyQ")) rudder -= 1;
  if (keys.has("KeyE")) rudder += 1;
  if (keys.has("ShiftLeft") || keys.has("ShiftRight")) p.throttle = Math.min(1, p.throttle + 0.55 * dt);
  if (keys.has("ControlLeft") || keys.has("ControlRight")) p.throttle = Math.max(0, p.throttle - 0.55 * dt);
  p.throttle = clamp(p.throttle + input.touchThrottle * dt, 0, 1);

  const hi = clamp((p.alt - 60) / 1400, 0, 1);
  const vmax = 78 + hi * 175;
  const vmin = 38 + hi * 28;
  const pitchBoost = -p.pitch * (28 + hi * 52);
  const targetSpeed = vmin + p.throttle * (vmax - vmin) + pitchBoost;
  p.speed += (targetSpeed * G.boostMul * G.speedMul - p.speed) * (1 - Math.exp(-1.85 * dt));
  p.speed = clamp(p.speed, p.stallSpeed * 0.75, (vmax + 36) * G.boostMul * G.speedMul);

  const g = 9.81;
  const turnRate = (g * Math.tan(p.roll) * G.turnMul) / Math.max(p.speed, 34);
  p.heading += turnRate * dt + rudder * 0.62 * dt;
  p.heading = Math.atan2(Math.sin(p.heading), Math.cos(p.heading));
  p.g = clamp(1 / Math.max(0.25, Math.cos(p.roll)), 0.2, 9);

  const groundSpeed = p.speed * Math.cos(p.pitch);
  const R = 6378137;
  p.lat += ((groundSpeed * Math.cos(p.heading)) / R) * (180 / Math.PI) * dt;
  p.lon += ((groundSpeed * Math.sin(p.heading)) / (R * Math.cos((p.lat * Math.PI) / 180))) * (180 / Math.PI) * dt;
  p.lat = clamp(p.lat, -85, 85);
  p.alt += p.speed * Math.sin(p.pitch) * dt;

  const floor = (G.lastGround ?? 0) + 28;
  if (G.lastGround != null && p.alt < floor) {
    p.alt = floor;
    if (p.pitch < -0.05) p.pitch *= 0.2;
    if (G.mode !== "free" && p.speed > 40) {
      damagePlayer(10 * dt);
    }
  }
  if (p.alt > 12000) p.alt = 12000;

  const bv = document.getElementById("boostVignette");
  if (bv) bv.style.opacity = G.boostMul > 1.1 ? "1" : "0";
  G.playerTrail.push([p.lon, p.lat, p.alt]);
  if (G.playerTrail.length > 28) G.playerTrail.shift();
}
