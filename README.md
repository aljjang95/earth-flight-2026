# EARTH FLIGHT v1.3.3 — Ace Horizon

Real-Earth Cesium flight combat. Continuous release train.

## Run
```bash
npm install && npx vite --host 127.0.0.1 --port 5173
```
Cesium ion token required.

## 1.3.3 — Combat feel + lock skill + camera (시니어 디렉터 패치)
- **Progressive missile lock**: nose-cone (~22°) build-up, LOCKING % → hard LOCK at 82%. Soft fire without lock is weak/dumb.
- **WAVE CLEAR breathing**: 1.15s hold + banner before next spawn (no instant swarm).
- **Tighter combat chase cam**: dist 58→42, height 12→9, lookAhead tighter (hero framing).
- **Lock box**: corner brackets + live KM range, scales with lockProg, gold when hard-locked.
- **Mission counter**: 적기 n/goal on HUD.
- **Closer enemy merge**: spawn 420m→260m base (dogfight not spec-fight).
- **Afterburner FOV punch** + stronger boost vignette.
- **Gun aim-assist** slightly tighter (skill ceiling).
- Keeps 1.3.2 hard neutral lock (left-drift fix).

## 1.3.2
- Hard neutral lock / left-drift residual fix (Android stick + pad noise)

## Stack (1.3)
- 6 craft + unique skills · Guns · Homing missiles · Ranked waves · Boss · Combos
- Gold / Diamonds / Pilot XP / Potions · Mobile · Solar noon

## Controls
A/D · W/S · Space · M · F · 1 · P · C · virtual stick / mouse drag

## Train
1.3.3 ← 1.3.2 ← 1.3.1 ← 1.3.0 ← …
