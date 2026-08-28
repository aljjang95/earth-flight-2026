# EARTH FLIGHT v4.0.0 — Ace Horizon World Combat

Real-Earth world-travel fighter combat in the browser (CesiumJS).
Supervisor + orchestrator harness keeps a release-patch / self-improvement loop alive.

## Play

```bash
npm install
npm run dev
```

Open http://localhost:5173

- **월드 서킷**: 서울 → 도쿄 → 싱가포르 → 뭄바이 → 두바이 → 나이로비 → 카이로 → 로마 → 파리 → 런던 → 베를린 → 모스크바 → 뉴욕 → 시카고 → 밴쿠버 → 샌프란시스코 → 리우 → 시드니
- **전구 공중전**: 한 도시에서 웨이브 도그파이트 + GHOST-1 윙맨
- **자유 비행**: 전 세계 도시 위를 비행
- **그래픽**: 격납고에서 저/중/고 선택 (저장됨)

Cesium ion 토큰은 **선택**입니다. 없어도 Esri 위성 지구로 바로 이륙합니다. 토큰이 있으면 지형 + Photorealistic 3D 도시가 켜집니다.

## Combat

- 적 전투기가 **실제 기관포 탄흔**과 **유도탄**을 발사합니다
- `Space` 기관포 · `M` 유도탄 · `G` 플레어 · `F` 기체 스킬 · `C` 시점 · `P` 일시정지
- 락온 콘 + LOCKING% → hard LOCK, RWR 경고
- 전구별 날씨/시각, HIT 마커, 임무 목표 라인

## Harness

```bash
npm run qa        # orchestrator static QA
npm run harness   # supervisor heartbeats orchestrator
```

`/?qa=1` — skip hangar, start Seoul combat, show heartbeat dock.

## License

MIT
