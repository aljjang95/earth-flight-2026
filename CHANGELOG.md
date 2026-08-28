# Changelog

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
