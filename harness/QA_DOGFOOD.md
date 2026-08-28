# QA Dogfood — Ace Horizon World Combat

## Objective
Convert EARTH FLIGHT into a **world-travel + live fighter-jet combat** web game with production-grade graphics and play, inside a Grok 4.7 product harness (supervisor heartbeats the orchestrator, self-improvement / release-patch loop).

## v1.3.4 dogfood (pre-patch)

| Sev | Finding |
| --- | --- |
| P0 | Shop buttons used `.mode-btn` and could set `gameMode` to `undefined` |
| P0 | Combat camera set to third, then immediately overwritten to first |
| P0 | Enemies did **not** fire visible guns or missiles (RNG hitscan only) — not actual combat |
| P1 | Cesium ion token required to play |
| P1 | Same Cesium Air GLB for player and every enemy |
| P1 | Duplicate 98KB `index.html` / `play.html` |
| P1 | Leftover Vite `src/counter.ts` |
| P2 | Contrail entity spam (`setTimeout` remove) |
| P2 | No world-circuit campaign (only a city dropdown) |
| P2 | No missile warning / flares |
| P2 | Point bullets, no bloom/clouds/trails, weak HUD |

## v2.0.1 acceptance

1. Playable **without** an ion token (Esri World Imagery globe). Optional token upgrades photorealistic 3D cities.
2. **World Circuit** campaign: 12 theaters Seoul → Sydney with transit cinematics.
3. **Live dogfight**: enemy fighters fly, fire tracers, launch missiles; player can flare.
4. Distinct fighter meshes (procedural glTF), afterburn/boost, explosion FX, canvas HUD.
5. Supervisor heartbeat (`window.__ACE_HEARTBEAT` + `harness/state/heartbeat.json`).
6. Orchestrator static QA (`npm run qa`) passes.
7. Browser dogfood of takeoff + combat on `?qa=1`.

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm run qa           # orchestrator once
npm run harness      # supervisor + orchestrator heartbeat
```

## v2.0.0 browser dogfood (post-patch)

| Check | Result |
| --- | --- |
| Hangar living Earth (Esri globe, no token) | PASS |
| Theater chips fly camera Seoul → Tokyo → NYC | PASS |
| `/?qa=1` Seoul combat boot | PASS |
| Player tapered fighter visible in 3rd person | PASS |
| Enemy callsigns + closer bandits | PASS |
| Player yellow tracers / enemy return fire | PASS |
| A/D bank, FIRE not covered by skill stack | PASS |
| Orchestrator `npm run qa` | PASS |

Boot P0 (`$('#id')` / Ion terrain 401) patched in the release loop.

## v2.0.1 patch loop (graphics / play)

| Check | Result |
| --- | --- |
| Lofted fuselage + craft variants | PASS |
| Dual-cannon tracer streaks | PASS |
| Radar top-left, FIRE unobstructed | PASS |
| Enemy return fire | PASS |
| NYC dropdown camera fly | FAIL (stale flyTo cancel) |
| Missile / flare visibility | FAIL (lock-gated missile; short flares) |
| Combat FPS | 8–23 (high quality too heavy) |

## v2.0.2 patch loop

| Check | Result |
| --- | --- |
| NYC dropdown globe fly | PASS |
| Dumb-fire missile + MISSILE toast | PASS |
| Flares + FLARE toast | PASS |
| Gun tracer streaks | PASS |
| Default medium quality, ~28fps | PASS |
| Tokyo/NYC/Seoul **chips** snap globe | PASS (after cancelFlight / mid-click rebuild fix) |

Remaining non-blockers: photorealistic 3D cities still need an optional Cesium ion token; WebGL software-render deprecation on this VM.

## v3.0.0 combat feel

| Check | Result |
| --- | --- |
| GHOST-1 wingman + cyan HUD | (dogfood) |
| Theater weather / time of day | (dogfood) |
| Hangar 그래픽 preset persisted | (dogfood) |
| HIT marker + objective line | (dogfood) |
| Orchestrator `npm run qa` | (pending) |

