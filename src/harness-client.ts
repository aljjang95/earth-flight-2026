import { VERSION } from "./config";
import { G } from "./state";
import { theaterById } from "./config";

export function tickHarness(dt: number): void {
  G.frames += 1;
  G.fpsT += dt;
  if (G.fpsT >= 0.5) {
    G.fps = G.frames / G.fpsT;
    G.frames = 0;
    G.fpsT = 0;
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
  };
  window.__ACE_HEARTBEAT = beat;
  const dock = document.getElementById("harnessDock");
  if (dock && dock.classList.contains("show")) {
    dock.textContent = `HB ${beat.fps}fps · ${beat.theaterName} W${beat.wave} · E${beat.enemies} · HP${beat.hp}`;
  }
}

export function snapshot(): Record<string, unknown> {
  return { ...(window.__ACE_HEARTBEAT || {}), version: VERSION };
}
