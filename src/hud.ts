import { G } from "./state";
import { HARD_LOCK, theaterById } from "./config";
import { bearingTo, distM, wrapDeg, wrapPi } from "./math";

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

export function bindHud(): void {
  canvas = document.getElementById("hudCanvas") as HTMLCanvasElement;
  if (!canvas) return;
  ctx = canvas.getContext("2d");
  resizeHud();
  window.addEventListener("resize", resizeHud);
}

export function resizeHud(): void {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function worldToScreen(lon: number, lat: number, alt: number): { x: number; y: number } | null {
  if (!G.viewer) return null;
  try {
    const pos = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    const win = new Cesium.Cartesian2();
    const ok = Cesium.SceneTransforms.worldToWindowCoordinates(G.viewer.scene, pos, win);
    if (!ok) return null;
    if (win.x < -40 || win.y < -40 || win.x > window.innerWidth + 40 || win.y > window.innerHeight + 40) return null;
    return { x: win.x, y: win.y };
  } catch {
    return null;
  }
}

export function drawHud(): void {
  if (!canvas || !ctx || !G.flying) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const c = ctx;
  c.clearRect(0, 0, w, h);
  const cyan = "#7dd3fc";
  const gold = "#fbbf24";
  const red = "#fb7185";
  c.lineWidth = 1.2;
  c.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
  c.shadowColor = "rgba(0,0,0,0.85)";
  c.shadowBlur = 6;

  const cx = w * 0.5;
  const cy = h * 0.48;
  const p = G.player;

  c.save();
  c.translate(cx, cy);
  c.rotate(p.roll);
  c.strokeStyle = cyan;
  c.globalAlpha = 0.85;
  for (let deg = -40; deg <= 40; deg += 10) {
    if (deg === 0) continue;
    const y = (-(p.pitch * 180) / Math.PI + deg) * 4.2;
    const len = deg % 20 === 0 ? 46 : 28;
    c.beginPath();
    c.moveTo(-len, y);
    c.lineTo(len, y);
    c.stroke();
    if (deg % 20 === 0) {
      c.fillStyle = cyan;
      c.globalAlpha = 0.9;
      c.fillText(String(-deg), len + 6, y + 4);
    }
  }
  c.beginPath();
  c.moveTo(-70, 0);
  c.lineTo(-18, 0);
  c.moveTo(18, 0);
  c.lineTo(70, 0);
  c.stroke();
  c.restore();

  c.strokeStyle = cyan;
  c.globalAlpha = 1;
  c.beginPath();
  c.arc(cx, cy, 9, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.moveTo(cx - 16, cy);
  c.lineTo(cx - 10, cy);
  c.moveTo(cx + 10, cy);
  c.lineTo(cx + 16, cy);
  c.moveTo(cx, cy - 16);
  c.lineTo(cx, cy - 10);
  c.stroke();

  const hdg = wrapDeg((p.heading * 180) / Math.PI);
  c.fillStyle = cyan;
  c.textAlign = "center";
  c.font = "13px ui-monospace, monospace";
  c.fillText(hdg.toFixed(0).padStart(3, "0") + "°", cx, 36);
  c.strokeStyle = "rgba(125,211,252,0.35)";
  c.beginPath();
  c.moveTo(cx - 120, 44);
  c.lineTo(cx + 120, 44);
  c.stroke();
  for (let d = -40; d <= 40; d += 10) {
    const tick = wrapDeg(hdg + d);
    const x = cx + d * 2.8;
    c.beginPath();
    c.moveTo(x, 44);
    c.lineTo(x, d % 20 === 0 ? 54 : 50);
    c.stroke();
    if (d % 20 === 0) {
      c.fillStyle = "rgba(125,211,252,0.8)";
      c.font = "10px ui-monospace, monospace";
      c.fillText(tick.toFixed(0).padStart(3, "0"), x, 66);
    }
  }

  box(c, 18, h * 0.38, 86, 54, cyan);
  c.fillStyle = cyan;
  c.textAlign = "left";
  c.font = "11px ui-monospace, monospace";
  c.fillText("SPD", 26, h * 0.38 + 16);
  c.font = "18px ui-monospace, monospace";
  c.fillText(String(Math.round(p.speed * 3.6)), 26, h * 0.38 + 40);

  box(c, w - 104, h * 0.38, 86, 54, cyan);
  c.textAlign = "right";
  c.font = "11px ui-monospace, monospace";
  c.fillText("ALT", w - 26, h * 0.38 + 16);
  c.font = "18px ui-monospace, monospace";
  c.fillText(String(Math.round(p.alt)), w - 26, h * 0.38 + 40);

  c.textAlign = "left";
  c.font = "12px ui-monospace, monospace";
  c.fillStyle = cyan;
  const th = theaterById(G.theaterId);
  c.fillText(`${th.name} · ${th.region}`, 16, 28);
  c.fillStyle = "rgba(226,232,240,0.75)";
  c.fillText(`THR ${Math.round(p.throttle * 100)}%   G ${p.g.toFixed(1)}   ${G.tilesBackend.toUpperCase()} · ${G.quality.toUpperCase()}`, 16, 46);

  const hpW = 168;
  const hpX = 16;
  const hpY = 58;
  c.strokeStyle = red;
  c.strokeRect(hpX, hpY, hpW, 8);
  c.fillStyle = p.hp / p.maxHp > 0.45 ? "#4ade80" : p.hp / p.maxHp > 0.22 ? gold : red;
  c.fillRect(hpX, hpY, hpW * Math.max(0, p.hp / p.maxHp), 8);
  c.fillStyle = "#e2e8f0";
  c.font = "11px ui-monospace, monospace";
  c.fillText(`HP ${Math.round(p.hp)}`, hpX, hpY + 22);
  if (G.spawnProtect > 0) {
    c.fillStyle = "#4ade80";
    c.fillText(`MERGE SAFE ${G.spawnProtect.toFixed(1)}s`, hpX, hpY + 70);
  }

  if (G.mode !== "free") {
    c.fillText(`WAVE ${G.wave}  ${G.waveDown}/${G.waveGoal || 0}  GOLD ${G.save.gold}`, hpX, hpY + 38);
    c.fillText(`FLARE ${G.player.flares}   MSL ${G.missileCd > 0 ? Math.ceil(G.missileCd) + "s" : "RDY"}`, hpX, hpY + 54);
  }

  if (G.radioT > 0 && G.radio) {
    c.fillStyle = gold;
    c.font = "14px ui-monospace, monospace";
    c.textAlign = "center";
    c.fillText(G.radio, cx, 88);
  }

  if (G.rwr) {
    c.strokeStyle = red;
    c.fillStyle = red;
    c.globalAlpha = 0.9 + Math.sin(performance.now() / 80) * 0.1;
    c.font = "bold 16px ui-monospace, monospace";
    c.textAlign = "center";
    c.fillText("! MISSILE  G 플레어 !", cx, h * 0.18);
    c.strokeRect(cx - 90, h * 0.18 - 22, 180, 32);
    c.globalAlpha = 1;
  }

  if (G.lockProg > 0.08 && G.locked && !G.locked.dead) {
    const s = worldToScreen(G.locked.lon, G.locked.lat, G.locked.alt);
    if (s) {
      const hard = G.lockProg >= HARD_LOCK;
      c.strokeStyle = hard ? gold : cyan;
      const sz = 28 + G.lockProg * 10;
      corners(c, s.x, s.y, sz);
      c.fillStyle = hard ? gold : cyan;
      c.font = "11px ui-monospace, monospace";
      c.textAlign = "center";
      const d = distM(p.lon, p.lat, p.alt, G.locked.lon, G.locked.lat, G.locked.alt);
      c.fillText(
        (hard ? "LOCK " : `LOCKING ${Math.round(G.lockProg * 100)}% `) +
          (d / 1000).toFixed(1) +
          "km  HP " +
          Math.max(0, Math.round(G.locked.hp)),
        s.x,
        s.y + sz + 16,
      );
      if (G.locked.callsign) {
        c.fillText(G.locked.callsign, s.x, s.y - sz - 8);
      }
    }
  }

  for (const e of G.enemies) {
    if (e.dead || e === G.locked) continue;
    const s = worldToScreen(e.lon, e.lat, e.alt);
    if (!s) continue;
    c.strokeStyle = e.kind === "leader" ? gold : red;
    c.globalAlpha = 0.75;
    c.strokeRect(s.x - 8, s.y - 8, 16, 16);
    c.globalAlpha = 0.9;
    c.fillStyle = e.kind === "leader" ? gold : red;
    c.font = "10px ui-monospace, monospace";
    c.textAlign = "center";
    c.fillText(e.callsign, s.x, s.y - 12);
    c.globalAlpha = 1;
  }

  for (const m of G.missiles) {
    if (m.dead) continue;
    const s = worldToScreen(m.lon, m.lat, m.alt);
    if (!s) continue;
    c.strokeStyle = m.toPlayer ? red : gold;
    c.beginPath();
    c.moveTo(s.x, s.y - 8);
    c.lineTo(s.x + 6, s.y);
    c.lineTo(s.x, s.y + 8);
    c.lineTo(s.x - 6, s.y);
    c.closePath();
    c.stroke();
  }

  const radar = document.getElementById("radar");
  if (radar && G.mode !== "free") {
    const range = 12000;
    const live: Array<{ e: (typeof G.enemies)[number]; x: number; y: number }> = [];
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = distM(p.lon, p.lat, p.alt, e.lon, e.lat, e.alt);
      if (d > range) continue;
      const brg = wrapPi(bearingTo(p.lon, p.lat, e.lon, e.lat) - p.heading);
      const r = (d / range) * 48;
      live.push({ e, x: 55 + Math.sin(brg) * r, y: 55 - Math.cos(brg) * r });
    }
    let dots = radar.querySelectorAll(".radar-dot");
    while (dots.length < live.length) {
      const dot = document.createElement("div");
      dot.className = "radar-dot";
      radar.appendChild(dot);
      dots = radar.querySelectorAll(".radar-dot");
    }
    dots.forEach((node, i) => {
      const dot = node as HTMLDivElement;
      if (i >= live.length) {
        dot.style.display = "none";
        return;
      }
      const item = live[i];
      dot.style.display = "block";
      dot.style.left = item.x + "px";
      dot.style.top = item.y + "px";
      if (item.e === G.locked) {
        dot.style.background = "#fde68a";
        dot.style.boxShadow = "0 0 8px #fde68a";
      } else if (item.e.kind === "leader") {
        dot.style.background = "#fbbf24";
        dot.style.boxShadow = "0 0 6px #fbbf24";
      } else {
        dot.style.background = "#f43f5e";
        dot.style.boxShadow = "0 0 6px #f43f5e";
      }
    });
  }

  c.textAlign = "left";
  c.fillStyle = "rgba(148,163,184,0.7)";
  c.font = "11px ui-monospace, monospace";
  c.fillText(`${G.fps | 0} FPS`, w - 72, h - 16);
}

function box(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  c.strokeStyle = color;
  c.globalAlpha = 0.35;
  c.strokeRect(x, y, w, h);
  c.globalAlpha = 1;
}

function corners(c: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const h = s / 2;
  const l = 10;
  c.beginPath();
  c.moveTo(x - h, y - h + l);
  c.lineTo(x - h, y - h);
  c.lineTo(x - h + l, y - h);
  c.moveTo(x + h - l, y - h);
  c.lineTo(x + h, y - h);
  c.lineTo(x + h, y - h + l);
  c.moveTo(x + h, y + h - l);
  c.lineTo(x + h, y + h);
  c.lineTo(x + h - l, y + h);
  c.moveTo(x - h + l, y + h);
  c.lineTo(x - h, y + h);
  c.lineTo(x - h, y + h - l);
  c.stroke();
}
