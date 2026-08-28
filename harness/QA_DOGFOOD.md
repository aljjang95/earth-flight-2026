# QA Dogfood — Ace Horizon World Combat 2.1.1

## Objective
Convert EARTH FLIGHT into a **world-travel + live fighter-jet combat** web game with production-grade graphics and play, inside a Grok 4.7 product harness (supervisor heartbeats the orchestrator, self-improvement / release-patch loop). See `prd/world-combat.md`.

## v1.3.4 dogfood (pre-patch)

| Sev | Finding |
| --- | --- |
| P0 | Shop buttons used `.mode-btn` and could set `gameMode` to `undefined` |
| P0 | Combat camera set to third, then immediately overwritten to first |
| P0 | Enemies did **not** fire visible guns or missiles (RNG hitscan only) |
| P1 | Cesium ion token required to play |
| P1 | Same Cesium Air GLB for player and every enemy |
| P1 | Duplicate 98KB `index.html` / `play.html` |
| P1 | Leftover Vite `src/counter.ts` |
| P2 | Contrail entity spam; no world circuit; no missile warning / flares |

## v2.1.0 dogfood (browser)

| Sev | Finding |
| --- | --- |
| P0 | Shot down in ~5s with 0 kills (wave-1 3-ship spawned in gun range, lethal DPS) |
| P0 | `?qa=1` could leave hangar overlay on top of combat |
| P1 | Jets looked translucent (Cesium MIX blend) |
| P1 | Software GL ~20–28fps; quality stayed medium; improve interval 8s never fired before death |
| P2 | Ease-AI required aliveTime > 6s so a 5s death never patched |

## v2.1.1 patch loop

| Check | Result |
| --- | --- |
| 16-theater circuit Seoul → Sydney | code + `npm test` |
| Enemy guns / missiles / flares | code |
| Afterburner exhaust + wreckage | code |
| Opaque PBR jets + silhouette | code |
| Spawn protect + 1km intercept | code |
| `?qa=1` hangar lock (`mission-live`) | code |
| Software GL → low / 30fps | `gfx` unit tests |
| Self-improve 3.2s + FPS floor 30 | unit tests |
| Supervisor heartbeat dock | in-game always on |
| Playable without ion token | Esri imagery |

## v2.1.1 browser dogfood (2026-08-28)

Hangar `http://localhost:5173/` — globe without ion token; 16 chips; Tokyo / NYC / Seoul flyTo; heartbeat `SV HB#… orch=ok 28fps low` (SwiftShader correctly booted low).

Combat `http://localhost:5173/?qa=1` — hangar locked off (`mission-live`); 3rd-person jet over Seoul Esri; WAVE 1 **E2**; survived **90s+** with HP ~90–100 (was ~5s / 0 kills on 2.1.0); guns tracers + flares; `window.__ACE_HEARTBEAT.version === "2.1.1"`, `software: true`, `quality: "low"`. `patchGen` stayed 0 because quality was already floor.

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm test
npm run qa           # orchestrator once
npm run harness      # supervisor + orchestrator heartbeat
```
