import { CAMPAIGN, MISSION_KO, VERSION, WEATHER_KO, craftById, theaterById } from "./config";
import { G, resetCombatStats } from "./state";
import { audio } from "./audio";
import { updateMenuCamera, updateCamera, toggleCamera } from "./camera";
import { updateFlight } from "./flight";
import { clearCombatEntities, spawnPlayerCraft, spawnWave, spawnWingman, updateCombat, fireMissile, tryFlare, trySkill, tryPotion } from "./combat";
import { drawHud } from "./hud";
import { tickHarness } from "./harness-client";
import { bindInput, input } from "./input";
import { applyTheaterMood, lookAtTheater, spawnClouds, syncHangarTheater, warmGlobe, setNearCameraVisuals } from "./world";
import { writeSave } from "./save";
import { ensurePointCollection } from "./fx";
import { maybeStartTutorial, takePhoto } from "./tutorial";

const bound = { bound: false };

export function startLoop(): void {
  G.lastTs = performance.now();
  const loop = (now: number) => {
    G.raf = requestAnimationFrame(loop);
    const dt = Math.min((now - G.lastTs) / 1000, 0.05);
    G.lastTs = now;
    tickHarness(dt);
    if (G.menuOrbit && !G.flying && !G.prologue) {
      syncHangarTheater();
      updateMenuCamera(dt);
      return;
    }
    if (!G.flying) return;
    if (!G.paused && !G.gameOver && !G.transiting) {
      updateFlight(dt);
      if (G.mode !== "free") updateCombat(dt);
      if (G.introLook > 0 && G.fps >= 5) G.introLook = Math.max(0, G.introLook - dt);
    }
    if (!G.transiting) updateCamera();
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
    if (e.code === "KeyG") tryFlare();
    if (e.code === "KeyM") fireMissile(false);
    if (e.code === "KeyF") trySkill();
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
  G.player.alt = G.mode === "free" ? 1480 : 1280;
  G.player.heading = t.heading;
  G.player.pitch = G.mode === "free" ? -0.12 : -0.04;
  G.player.roll = 0;
  G.player.speed = 155;
  G.player.throttle = 0.74;
  resetCombatStats();
  G.introLook = 4.2;
  warmGlobe();
  applyTheaterMood(t.id);
  spawnClouds(t.lon, t.lat);
  setNearCameraVisuals(true);
  spawnPlayerCraft();
  if (G.mode !== "free") spawnWingman();
  ensurePointCollection();
  G.flying = true;
  G.menuOrbit = false;
  setNearCameraVisuals(true);
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
    showSortieCard(t);
  }

  const hint = document.getElementById("controls-hint");
  if (hint) {
    hint.style.display = "block";
    hint.style.opacity = "1";
    setTimeout(() => {
      hint.style.opacity = "0";
    }, 6500);
  }
  maybeStartTutorial();
}

function showSortieCard(t: ReturnType<typeof theaterById>): void {
  const el = document.getElementById("sortieCard");
  if (!el) return;
  const kicker = el.querySelector(".sc-kicker");
  const title = el.querySelector(".sc-title");
  const mission = el.querySelector(".sc-mission");
  if (kicker) kicker.textContent = G.mode === "campaign" ? "WORLD CIRCUIT" : "SORTIE";
  if (title) title.textContent = t.name;
  if (mission) mission.textContent = `${MISSION_KO[t.mission]} · ${WEATHER_KO[t.weather]} · ${t.country}`;
  el.classList.add("show");
  window.setTimeout(() => el.classList.remove("show"), 3200);
}

export function returnToBase(): void {
  G.paused = false;
  G.flying = false;
  G.gameOver = false;
  G.menuOrbit = true;
  G.introLook = 0;
  setNearCameraVisuals(false);
  const goTitle = document.querySelector("#gameOver h2");
  if (goTitle) goTitle.textContent = "격추당했습니다";
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
      wingmen: G.wingmen.filter((w) => !w.dead).length,
      grounds: G.grounds.filter((g) => !g.dead).length,
      medals: G.save.medals?.length || 0,
      objective: G.objective,
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
    photo: () => takePhoto(),
    getHp: () => G.player.hp,
    getKills: () => G.kills,
    theater: (id: string) => {
      G.theaterId = id;
    },
    skill: () => trySkill(),
    potion: () => tryPotion(),
  };
  window.__ACE = api;
  window.__controlsTest = api;
}
