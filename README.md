# EARTH FLIGHT v2.1.1 — Ace Horizon World Combat

Real-Earth CesiumJS fighter combat. Fly a world circuit and fight live enemy jets.

## Play

```bash
npm install
npm run dev          # http://localhost:5173
# http://localhost:5173/?qa=1  skip hangar, Seoul combat + heartbeat dock
npm test             # math / self-improve / orchestrator
npm run harness      # supervisor heartbeat loop
```

Cesium ion token is **optional**. Without it you take off on Esri World Imagery. Paste a token for photorealistic 3D cities.

## World Circuit (16 theaters)

서울 → 도쿄 → 홍콩 → 싱가포르 → 두바이 → 카이로 → 이스탄불 → 파리 → 런던 → 뉴욕 → 시카고 → 샌프란시스코 → 리우 → 케이프타운 → 모스크바 → 시드니

Clear 3 waves to transit. Campaign, single-theater combat, and free flight.

## Combat

- Live enemy guns + missiles, player flares / RWR
- Progressive lock, skills, potions, afterburner exhaust, wreckage
- Ace Combat chase camera (C for cockpit)
- Supervisor auto-quality + self-improve (AI / lock cone / spawn range)

## Grok 4.7 harness

Supervisor heartbeats the orchestrator. In-game `window.__ACE_HEARTBEAT` plus `npm run harness`.

## Controls

A/D bank · W/S pitch · Space guns · M missile · G flare · F skill · 1 potion · P pause · C camera · stick / mouse drag

## License

MIT
