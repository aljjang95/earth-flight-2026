import { VERSION } from "./config";
import { G } from "./state";
import { theaterById } from "./config";
import { applyQuality } from "./world";

let qualityGrace = 0;
let lowHits = 0;
let highHits = 0;

export function tickHarness(dt: number): void {
  G.frames += 1;
  G.fpsT += dt;
  if (G.fpsT >= 0.5) {
    G.fps = G.frames / G.fpsT;
    G.frames = 0;
    G.fpsT = 0;
    if (G.flying) qualityGrace += 0.5;
    else {
      qualityGrace = 0;
      lowHits = 0;
      highHits = 0;
    }
    // Never auto-apply low: that turns the globe into unlit olive clay.
    // High may step to medium if the GPU is struggling; hangar choice is the floor.
    if (qualityGrace > 8 && G.fps > 2) {
      if (G.fps < 20) {
        lowHits += 1;
        highHits = 0;
      } else if (G.fps > 48) {
        highHits += 1;
        lowHits = 0;
      } else {
        lowHits = 0;
        highHits = 0;
      }
      if (lowHits >= 6 && G.quality === "high" && G.save.quality === "high") applyQuality("medium");
    }
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
    wingmen: G.wingmen.filter((w) => !w.dead).length,
    missiles: G.missiles.filter((m) => !m.dead).length,
    hp: Math.round(G.player.hp),
    kills: G.kills,
    backend: G.tilesBackend,
    quality: G.quality,
    supervisor: "alive",
    orchestrator: "self-improve",
  };
  window.__ACE_HEARTBEAT = beat;
  const dock = document.getElementById("harnessDock");
  if (dock && dock.classList.contains("show")) {
    dock.textContent = `HB ${beat.fps}fps · ${beat.theaterName} W${beat.wave} · E${beat.enemies} · HP${beat.hp} · ${String(beat.quality).toUpperCase()}`;
  }
}

export function snapshot(): Record<string, unknown> {
  return { ...(window.__ACE_HEARTBEAT || {}), version: VERSION };
}
