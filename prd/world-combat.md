# Ace Horizon World Combat — Product requirements

## Goal
Convert EARTH FLIGHT into a **world-travel + live fighter-jet combat** web game, run inside a Grok 4.7 product harness (supervisor heartbeats the orchestrator, self-improvement / release-patch loop), with production-grade graphics and play.

## Modes
- **월드 서킷 (campaign)**: sequential theaters around Earth; 3 waves then cinematic transit.
- **전구 공중전 (combat)**: dogfight in a chosen city.
- **자유 비행 (free)**: sightseeing, no enemies.

## World circuit (16 theaters)
Seoul → Tokyo → Hong Kong → Singapore → Dubai → Cairo → Istanbul → Paris → London → New York → Chicago → San Francisco → Rio → Cape Town → Moscow → Sydney.

## Combat (must feel like a real dogfight)
- Enemy fighters fly, fire **visible** tracers, and launch **visible** missiles.
- Player guns, lock missiles, flares / RWR, skills, potions.
- Distinct fighter meshes, afterburner exhaust, wreckage, explosions.
- Default chase camera (Ace Combat), optional cockpit.

## Graphics
- Playable **without** a Cesium ion token (Esri World Imagery).
- Optional token upgrades photorealistic 3D cities + world terrain.
- Auto quality via supervisor (FPS) with high/medium/low: bloom, water, clouds, MSAA.
- Real GPUs boot **high**; SwiftShader/llvmpipe boot **low** at 30fps.
- Solar-noon lighting per theater, atmosphere, contrails.
- Wave-1 merge protection so the sortie starts as an intercept, not an ambush.

## Harness
- Supervisor writes heartbeat (`window.__ACE_HEARTBEAT` + `harness/state/heartbeat.json`).
- Orchestrator static QA (`npm run qa`) must pass.
- In-game self-improve loop patches AI lethality, spawn range, lock cone, and quality from telemetry.

## Play quality gates
- No shop/mode button collision.
- Combat camera is third-person by default (jet visible).
- M / G / F do not double-fire.
- Theater chips cancel in-flight globe camera and snap to that continent.
