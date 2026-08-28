# Changelog

## [2.0.2] - 2026-08-28
### Fixed
- Hangar theater fly no longer dies when a previous `flyTo` cancels (NYC/dropdown).
- Missiles dumb-fire without a hard lock so `M` always launches a visible dart + trail.
- Flares last longer and toast on deploy.
- Default Cesium quality is medium (no bloom/HDR/MSAA) with 30fps cap for playable dogfights; steps up if the GPU can.

## [2.0.1] - 2026-08-28
### Added
- Lofted fighter glTF (tapered fuselage, canopy, craft/bandit variants) plus missile dart mesh.
- Dual-cannon tracer streaks, engine glow, player contrail, visible flare sparks that decoy missiles.
- FPS-adaptive Cesium quality (`applyQuality`) so play stays smooth on weaker GPUs.
- Audio unlock on first pointer/key gesture; lock HUD shows LOCKING%.

### Fixed
- Radar no longer covers FIRE / flare / skill; radar dots are pooled instead of rebuilt every frame.
- Hangar theater chips fly the globe immediately; combat camera sits closer for a readable jet.

## [2.0.0] - 2026-08-28
### Added
- **World Circuit campaign**: 12 real-Earth theaters with transit cinematics (Seoul → Sydney).
- **Live fighter combat**: enemy jets fire visible tracers and homing missiles; player flares + RWR.
- **Custom fighter glTF** (distinct player / bandit / ace / leader silhouettes).
- Ace Combat-style **canvas HUD**, clouds, bloom/FXAA, explosion particles, missile glow trails.
- **Token-optional** Esri satellite globe so the game starts without Cesium ion signup.
- Grok 4.7 **product harness**: supervisor heartbeat + orchestrator self-improvement QA (`npm run qa`).
- Modular Vite + TypeScript source (`src/`).

### Fixed
- Shop buttons no longer steal combat/free mode (`mode-play` vs `mode-btn`).
- Default combat camera is a 3/4 chase view so the jet is visible; first-person optional.
- Duplicate `play.html` monolith replaced with a redirect into the live game.

## [1.3.4] - 2026-08-24
### Added
- Cinematic prologue, Daegu location, progressive lock polish, themed favicon.
