# EARTH FLIGHT v1.3.3 — Ace Horizon

Real-Earth Cesium flight combat. Continuous release train.

## Run

**Quick play:** open [`play.html`](./play.html) in a static server (full game is a single HTML file).

```bash
npm install && npx vite --host 127.0.0.1 --port 5173
# or: npx serve .
```
Cesium ion token required (paste on start screen — free at https://ion.cesium.com/tokens).

## 1.3.3 — Combat feel + lock skill + camera
- **Progressive missile lock**: nose-cone (~22°) build-up, LOCKING % → hard LOCK at 82%
- **WAVE CLEAR breathing**: 1.15s hold + banner before next spawn
- **Tighter combat chase cam**: dist 42, height 9
- **Lock box**: corner brackets + live KM range
- **Mission counter**: 적기 n/goal on HUD
- **Closer enemy merge**: spawn ~260m base
- **Afterburner FOV punch** + stronger boost vignette
- Keeps 1.3.2 hard neutral lock (left-drift fix)

## Stack
- 6 craft + unique skills · Guns · Homing missiles · Ranked waves · Boss · Combos
- Gold / Diamonds / Pilot XP / Potions · Mobile · Solar noon

## Controls
A/D · W/S · Space · M · F · 1 · P · C · virtual stick / mouse drag

## Train
1.3.3 ← 1.3.2 ← 1.3.1 ← 1.3.0 ← …

## License
MIT
