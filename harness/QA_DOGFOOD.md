# QA Dogfood — Ace Horizon World Combat 2.1.0

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

## v2.1.0 patch loop

| Check | Result |
| --- | --- |
| 16-theater circuit Seoul → Sydney | code + `npm test` |
| Enemy guns / missiles / flares | code |
| Afterburner exhaust + wreckage | code |
| Self-improve proposePatches | unit tests |
| No double-fire M/G/F | orchestrator |
| Centered chase cam | orchestrator |
| `cancelFlight` theater chips | orchestrator |
| Supervisor heartbeat dock | in-game always on |
| Playable without ion token | Esri imagery |

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm test
npm run qa           # orchestrator once
npm run harness      # supervisor + orchestrator heartbeat
```
