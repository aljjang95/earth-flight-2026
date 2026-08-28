import { CAMPAIGN, VERSION, craftById, theaterById } from "./config";
import { G, resetCombatStats } from "./state";
import { audio } from "./audio";
import { updateMenuCamera, updateCamera, toggleCamera } from "./camera";
import { updateFlight } from "./flight";
import { clearCombatEntities, spawnPlayerCraft, spawnWave, updateCombat, fireMissile, tryFlare, trySkill, tryPotion } from "./combat";
import { drawHud } from "./hud";
import { tickHarness } from "./harness-client";
import { bindInput, input } from "./input";
import { applySolarNoon, lookAtTheater, spawnClouds, syncHangarTheater } from "./world";
import { writeSave } from "./save";
import { ensurePointCollection } from "./fx";

const bound = { bound: false };

export function startLoop(): void {
  G.lastTs = performance.now();
  const loop = (now: number) => {
    G.raf = requestAnimationFrame(loop);
    const dt = Math.min((now - G.lastTs) / 1000, 0.05);
    G.lastTs = now;
    tickHarness(dt);
    if (G.menuOrbit && !G.flying) {
      syncHangarTheater();
      updateMenuCamera(dt);
      return;
    }
    if (!G.flying) return;
    if (!G.paused && !G.gameOver && !G.transiting) {
      updateFlight(dt);
      if (G.mode !== "free") updateCombat(dt);
    }
    updateCamera();
    drawHud();
    audio.update(G.player.speed, G.player.throttle);
  };
  G.raf = requestAnimationFrame(loop);
}

export function bindGameKeys(): void {
  window.addEventListener("keydown", (e) => {
    if (!G.flying) return;
    if (e.repeat) return;
    if (e.code === "KeyC") toggleCamera();
    if (e.code === "Escape" || e.code === "KeyP") {
      if (G.gameOver) return;
      G.paused = !G.paused;
      const pm = document.getElementById("pauseMenu");
      if (pm) pm.style.display = G.paused ? "flex" : "none";
    }
  });
}

export async function startMission(): Promise<void> {
  const t = theaterById(G.theaterId);
  const craft = craftById(G.save.equipped);
  G.equipped = craft.id;
  G.gunDmg = craft.gunDmg;
  G.speedMul = craft.speedMul;
  G.turnMul = craft.turnMul;
  G.activeSkill = craft.skill;
  G.player.maxHp = craft.maxHp + (G.save.level - 1) * 6;
  G.player.hp = G.player.maxHp;
  G.player.flares = 6;
  G.player.lon = t.lon;
  G.player.lat = t.lat;
  G.player.alt = G.mode === "free" ? 1100 : 880;
  G.player.heading = t.heading;
  G.player.pitch = G.mode === "free" ? -0.12 : -0.04;
  G.player.roll = 0;
  G.player.speed = 155;
  G.player.throttle = 0.74;
  resetCombatStats();
  applySolarNoon(t.lon, t.lat);
  spawnClouds(t.lon, t.lat);
  spawnPlayerCraft();
  ensurePointCollection();
  G.flying = true;
  G.menuOrbit = false;
  G.cam = G.mode === "free" ? "first" : "third";
  const camBtn = document.getElementById("cameraModeBtn");
  if (camBtn) camBtn.textContent = G.cam === "first" ? "3인칭" : "1인칭";

  document.getElementById("startOverlay")!.style.display = "none";
  document.getElementById("hud")!.style.display = "block";
  document.getElementById("hudCanvas")!.style.display = "block";
  document.getElementById("sideBtns")!.style.display = "flex";
  document.getElementById("stickPanel")!.style.display = "flex";
  document.getElementById("thrPanel")!.style.display = "flex";
  const combat = G.mode !== "free";
  document.getElementById("firePanel")!.style.display = combat ? "flex" : "none";
  document.getElementById("radar")!.style.display = combat ? "block" : "none";
  document.getElementById("actionPanel")!.style.display = combat ? "flex" : "none";
  document.getElementById("hudCanvas")!.style.pointerEvents = "none";

  const sk = document.getElementById("skillBtn");
  if (sk) sk.innerHTML = `<strong>F</strong>${craft.skillLabel}`;
  const pc = document.getElementById("potionCount");
  if (pc) pc.textContent = String(G.save.potions);
  const fc = document.getElementById("flareCount");
  if (fc) fc.textContent = String(G.player.flares);

  bindInput(bound);
  document.getElementById("cesiumContainer")?.focus();

  if (combat) {
    G.campaignIndex = Math.max(0, CAMPAIGN.indexOf(G.theaterId));
    spawnWave();
    const kt = document.getElementById("killToast");
    if (kt) {
      kt.textContent = G.mode === "campaign" ? `MISSION · ${t.name}` : "MISSION · 제공권 확보";
      kt.style.opacity = "1";
      setTimeout(() => {
        kt.style.opacity = "0";
      }, 1600);
    }
  }

  const hint = document.getElementById("controls-hint");
  if (hint) {
    hint.style.display = "block";
    hint.style.opacity = "1";
    setTimeout(() => {
      hint.style.opacity = "0";
    }, 6500);
  }
}

export function returnToBase(): void {
  G.paused = false;
  G.flying = false;
  G.gameOver = false;
  G.menuOrbit = true;
  clearCombatEntities();
  document.getElementById("pauseMenu")!.style.display = "none";
  document.getElementById("gameOver")!.style.display = "none";
  document.getElementById("hud")!.style.display = "none";
  document.getElementById("hudCanvas")!.style.display = "none";
  document.getElementById("firePanel")!.style.display = "none";
  document.getElementById("radar")!.style.display = "none";
  document.getElementById("actionPanel")!.style.display = "none";
  document.getElementById("stickPanel")!.style.display = "none";
  document.getElementById("thrPanel")!.style.display = "none";
  document.getElementById("sideBtns")!.style.display = "none";
  document.getElementById("cockpit")?.classList.remove("show");
  document.getElementById("startOverlay")!.style.display = "flex";
  lookAtTheater(G.theaterId, 16_800_000, 2);
  writeSave(G.save);
}

export function exposeAceApi(startQa: () => Promise<void>): void {
  const api = {
    version: VERSION,
    heartbeat: () => ({ ...(window.__ACE_HEARTBEAT || {}) }),
    getState: () => ({
      flying: G.flying,
      mode: G.mode,
      theater: G.theaterId,
      hp: G.player.hp,
      kills: G.kills,
      wave: G.wave,
      enemies: G.enemies.filter((e) => !e.dead).length,
    }),
    startQa,
    skipPrologue: () => {
      G.prologue = false;
    },
    setSteer: (v: number) => {
      input.stickSteer = v;
    },
    setPitch: (v: number) => {
      input.stickPitch = v;
    },
    setThrottle: (v: number) => {
      G.player.throttle = Math.max(0, Math.min(1, v));
    },
    fire: (on: boolean) => {
      input.firing = on;
    },
    missile: () => fireMissile(false),
    flare: () => tryFlare(),
    getHp: () => G.player.hp,
    getKills: () => G.kills,
    theater: (id: string) => {
      G.theaterId = id;
    },
    skill: () => trySkill(),
    potion: () => tryPotion(),
    patches: () => G.patches.slice(),
  };
  window.__ACE = api;
  window.__controlsTest = api;
}
