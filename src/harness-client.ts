import { VERSION } from "./config";
import { G } from "./state";
import { theaterById } from "./config";
import { applyQuality } from "./world";
import { IMPROVE_INTERVAL, FPS_QUALITY_FLOOR } from "./gfx";
import { proposePatches, type ImproveMetrics, type Patch } from "./selfImprove";

function metrics(): ImproveMetrics {
  return {
    fps: G.fps,
    quality: G.quality,
    autoQuality: G.autoQuality,
    flying: G.flying,
    aliveTime: G.aliveTime,
    dead: G.gameOver,
    damageTaken: G.damageTaken,
    aiMul: G.aiMul,
    spawnMul: G.spawnMul,
    lockCone: G.lockCone,
    lockAttempts: G.lockAttempts,
    locks: G.locks,
    kills: G.kills,
  };
}

function applyPatch(p: Patch): void {
  G.patchGen += 1;
  G.patches = [...G.patches.slice(-7), `${p.id}:${p.reason}`];
  if (p.quality) applyQuality(p.quality);
  if (p.aiMul != null) G.aiMul = p.aiMul;
  if (p.spawnMul != null) G.spawnMul = p.spawnMul;
  if (p.lockCone != null) G.lockCone = p.lockCone;
  G.orchAck = Date.now();
}

export function tickHarness(dt: number): void {
  G.supervisorBeats += 1;
  G.frames += 1;
  G.fpsT += dt;
  if (G.fpsT >= 0.5) {
    G.fps = G.frames / G.fpsT;
    G.frames = 0;
    G.fpsT = 0;
    if (G.flying && G.autoQuality && G.fps > 2 && G.fps < FPS_QUALITY_FLOOR && G.quality !== "low") {
      applyPatch({
        id: "quality-down",
        reason: `fps ${G.fps | 0} < ${FPS_QUALITY_FLOOR}`,
        quality: G.quality === "high" ? "medium" : "low",
      });
    }
  }

  G.improveT += dt;
  const due = G.flying && G.improveT >= IMPROVE_INTERVAL;
  const deathTick = G.flying && G.gameOver && !G.deathImproved;
  if (due || deathTick) {
    G.improveT = 0;
    if (G.gameOver) G.deathImproved = true;
    const planned = proposePatches(metrics());
    for (const p of planned) applyPatch(p);
  }

  const beat = {
    t: Date.now(),
    version: VERSION,
    fps: Math.round(G.fps),
    flying: G.flying,
    paused: G.paused,
    mode: G.mode,
    theater: G.theaterId,
    theaterName: theaterById(G.theaterId).name,
    wave: G.wave,
    enemies: G.enemies.filter((e) => !e.dead).length,
    missiles: G.missiles.filter((m) => !m.dead).length,
    hp: Math.round(G.player.hp),
    kills: G.kills,
    backend: G.tilesBackend,
    supervisor: "alive",
    orchestrator: "self-improve",
    orchAck: G.orchAck,
    beats: G.supervisorBeats,
    patchGen: G.patchGen,
    patches: G.patches,
    quality: G.quality,
    aiMul: G.aiMul,
    software: G.softwareGL,
    spawnProtect: +G.spawnProtect.toFixed(1),
  };
  window.__ACE_HEARTBEAT = beat;
  const dock = document.getElementById("harnessDock");
  if (dock && dock.classList.contains("show")) {
    dock.textContent = `SV HB#${beat.beats} orch=ok ${beat.fps}fps ${beat.quality} · ${beat.theaterName} W${beat.wave} · E${beat.enemies} · P${beat.patchGen}`;
  }
}

export function snapshot(): Record<string, unknown> {
  return { ...(window.__ACE_HEARTBEAT || {}), version: VERSION };
}
