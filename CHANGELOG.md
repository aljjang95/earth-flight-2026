# Changelog

## [2.1.1] - 2026-08-28
### Play quality (release-patch loop)
- Spawn protection (2.8s MERGE SAFE), wave-1 two-ship intercept at ~1km, slower enemy guns.
- `?qa=1` hides the hangar immediately (`mission-live`) and starts Seoul on trainee difficulty.
- Software GL (SwiftShader/llvmpipe) boots low quality / 30fps; real GPUs boot high (MSAA 8, bloom, shadows).
- Self-improve every 3.2s, FPS floor 30, ease-AI on early death (including sub-6s).
- Opaque PBR jets (no ghost MIX), silhouette, tighter chase cam framing.

## [2.1.0] - 2026-08-28
### Added
- **Grok 4.7 product harness** in-game: supervisor heartbeat, orchestrator ack, self-improve patches (quality / AI / lock cone / spawn range).
- **16-theater world circuit** (Hong Kong, Istanbul, Cape Town, Moscow added to the campaign).
- Afterburner exhaust, falling wreckage, sun bloom, medium-quality bloom, 60fps desktop target.
- Centered Ace Combat chase camera; quality selector (auto/high/medium/low).
- Unit tests for math, world circuit, and self-improve planner. PRD in `prd/world-combat.md`.

### Fixed
- Missile / flare / skill no longer double-fire from overlapping key handlers.
- Theater globe `flyTo` now `cancelFlight()` before a new snap.
- First-person hides engine glow so it does not fill the cockpit.

## [2.0.2] - 2026-08-28
World combat rewrite (campaign transit, enemy guns/missiles, flares, lofted jets, Esri globe without ion token).

## [1.3.4] - 2026-08-24
Cinematic prologue, Daegu, progressive lock polish. Monolith retired in 2.x.
