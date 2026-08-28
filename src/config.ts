import type { Craft, Rank, Theater } from "./types";

export const VERSION = "2.0.2";
export const TITLE = "EARTH FLIGHT";
export const SUBTITLE = "ACE HORIZON · WORLD COMBAT";

export const THEATERS: Theater[] = [
  {
    id: "seoul",
    name: "서울",
    region: "한반도",
    country: "대한민국",
    lon: 126.978,
    lat: 37.5665,
    heading: 1.4,
    briefing: "수도 상공에 적 전투기 편대가 침투했다. 한강 상공의 제공권을 확보하라.",
    enemyName: "침공 무인편대",
  },
  {
    id: "tokyo",
    name: "도쿄",
    region: "간토",
    country: "일본",
    lon: 139.6917,
    lat: 35.6895,
    heading: 0.8,
    briefing: "수도권 방공망이 뚫렸다. 도쿄 만 상공에서 요격하라.",
    enemyName: "태평양 침투기",
  },
  {
    id: "singapore",
    name: "싱가포르",
    region: "말라카",
    country: "싱가포르",
    lon: 103.8198,
    lat: 1.3521,
    heading: 0.4,
    briefing: "해협 상공을 봉쇄 중인 적 요격기를 격퇴하고 항로를 열어라.",
    enemyName: "해협 차단편대",
  },
  {
    id: "dubai",
    name: "두바이",
    region: "걸프",
    country: "UAE",
    lon: 55.2708,
    lat: 25.2048,
    heading: 1.1,
    briefing: "걸프 상공의 에이스 편대가 연안 도시를 위협한다. 교전 개시.",
    enemyName: "걸프 에이스",
  },
  {
    id: "cairo",
    name: "카이로",
    region: "나일",
    country: "이집트",
    lon: 31.2357,
    lat: 30.0444,
    heading: 0.2,
    briefing: "나일 델타 상공. 저고도 침투기를 요격하라.",
    enemyName: "델타 습격편대",
  },
  {
    id: "paris",
    name: "파리",
    region: "서유럽",
    country: "프랑스",
    lon: 2.3522,
    lat: 48.8566,
    heading: 0.4,
    briefing: "센 강 상공에 적 전투기가 출현했다. 수도를 사수하라.",
    enemyName: "서유럽 침공기",
  },
  {
    id: "london",
    name: "런던",
    region: "영불해협",
    country: "영국",
    lon: -0.1276,
    lat: 51.5074,
    heading: 0.3,
    briefing: "템스 상공. 해협을 넘어온 편대와 도그파이트를 벌여라.",
    enemyName: "해협 돌격편대",
  },
  {
    id: "nyc",
    name: "뉴욕",
    region: "대서양 관문",
    country: "미국",
    lon: -74.006,
    lat: 40.7128,
    heading: 0.6,
    briefing: "맨해튼 상공 제공권 전투. 항구로 접근하는 적기를 막아라.",
    enemyName: "대서양 편대",
  },
  {
    id: "chicago",
    name: "시카고",
    region: "오대호",
    country: "미국",
    lon: -87.6298,
    lat: 41.8781,
    heading: 0.9,
    briefing: "내륙 상공에서 적 에이스가 대기 중이다. 요격 후 서부로 진격하라.",
    enemyName: "내륙 에이스",
  },
  {
    id: "sf",
    name: "샌프란시스코",
    region: "태평양",
    country: "미국",
    lon: -122.4194,
    lat: 37.7749,
    heading: 1.0,
    briefing: "만 상공. 골든게이트를 기점으로 태평양 방면을 열어라.",
    enemyName: "태평양 전선기",
  },
  {
    id: "rio",
    name: "리우",
    region: "남아메리카",
    country: "브라질",
    lon: -43.1729,
    lat: -22.9068,
    heading: 0.5,
    briefing: "코파카바나 상공의 적 편대를 격추하고 남반구 전선을 유지하라.",
    enemyName: "남대서양 편대",
  },
  {
    id: "sydney",
    name: "시드니",
    region: "남반구",
    country: "호주",
    lon: 151.2093,
    lat: -33.8688,
    heading: 0.2,
    briefing: "최종 전구. 하버 상공에서 적 주력 에이스 편대와 결전하라.",
    enemyName: "종말 에이스",
  },
];

export const FREE_EXTRA: Theater[] = [
  { id: "daegu", name: "대구", region: "영남", country: "대한민국", lon: 128.6014, lat: 35.8714, heading: 0.9, briefing: "", enemyName: "" },
  { id: "anyang", name: "안양", region: "경기", country: "대한민국", lon: 126.9569, lat: 37.3943, heading: 0.4, briefing: "", enemyName: "" },
  { id: "busan", name: "부산", region: "남해", country: "대한민국", lon: 129.0756, lat: 35.1796, heading: 0.2, briefing: "", enemyName: "" },
  { id: "osaka", name: "오사카", region: "간사이", country: "일본", lon: 135.5023, lat: 34.6937, heading: 0.5, briefing: "", enemyName: "" },
  { id: "hk", name: "홍콩", region: "남중국", country: "중국", lon: 114.1694, lat: 22.3193, heading: 0.7, briefing: "", enemyName: "" },
  { id: "delhi", name: "델리", region: "남아시아", country: "인도", lon: 77.209, lat: 28.6139, heading: 0.3, briefing: "", enemyName: "" },
  { id: "istanbul", name: "이스탄불", region: "보스포루스", country: "튀르키예", lon: 28.9784, lat: 41.0082, heading: 0.6, briefing: "", enemyName: "" },
  { id: "la", name: "로스앤젤레스", region: "서부", country: "미국", lon: -118.2437, lat: 34.0522, heading: 1.2, briefing: "", enemyName: "" },
  { id: "capetown", name: "케이프타운", region: "희망봉", country: "남아공", lon: 18.4241, lat: -33.9249, heading: 0.4, briefing: "", enemyName: "" },
];

export const ALL_LOCATIONS: Theater[] = [...THEATERS, ...FREE_EXTRA];

export const CAMPAIGN = THEATERS.map((t) => t.id);

export const RANKS: Rank[] = [
  { name: "훈련", minWave: 1, enemyHp: 36, count: 3, spd: 1.0, goldMul: 1 },
  { name: "교전", minWave: 2, enemyHp: 48, count: 4, spd: 1.08, goldMul: 1.2 },
  { name: "전장", minWave: 4, enemyHp: 62, count: 5, spd: 1.18, goldMul: 1.5 },
  { name: "제공권", minWave: 7, enemyHp: 78, count: 6, spd: 1.3, goldMul: 1.85 },
  { name: "전설", minWave: 11, enemyHp: 96, count: 7, spd: 1.42, goldMul: 2.3 },
  { name: "종말", minWave: 16, enemyHp: 124, count: 8, spd: 1.55, goldMul: 3.0 },
];

export const CRAFTS: Craft[] = [
  {
    id: "sparrow",
    name: "스패로우",
    role: "훈련기",
    blurb: "기본기 · 애프터번",
    gold: 0,
    maxHp: 110,
    speedMul: 1,
    turnMul: 1,
    gunDmg: 15,
    skill: "afterburn",
    skillLabel: "애프터번",
    color: "#93c5fd",
  },
  {
    id: "kestrel",
    name: "케스트럴",
    role: "요격기",
    blurb: "선회 · 회피 특화",
    gold: 900,
    maxHp: 92,
    speedMul: 1.16,
    turnMul: 1.32,
    gunDmg: 17,
    skill: "evade",
    skillLabel: "회피기동",
    color: "#7dd3fc",
  },
  {
    id: "harrier",
    name: "해리어",
    role: "중장갑",
    blurb: "맷집 · 장갑판",
    gold: 2200,
    maxHp: 165,
    speedMul: 0.9,
    turnMul: 0.88,
    gunDmg: 16,
    skill: "plate",
    skillLabel: "장갑판",
    color: "#86efac",
  },
  {
    id: "viper",
    name: "바이퍼",
    role: "타격기",
    blurb: "유도탄 강화",
    gold: 4500,
    maxHp: 84,
    speedMul: 1.22,
    turnMul: 1.06,
    gunDmg: 19,
    skill: "missile",
    skillLabel: "더블 미사일",
    color: "#fca5a5",
  },
  {
    id: "wraith",
    name: "레이스",
    role: "은신",
    blurb: "레이더 소거 · 기습",
    gold: 0,
    diamond: 90,
    maxHp: 86,
    speedMul: 1.24,
    turnMul: 1.2,
    gunDmg: 14,
    skill: "cloak",
    skillLabel: "은신",
    color: "#94a3b8",
  },
  {
    id: "aegis",
    name: "이지스",
    role: "지원",
    blurb: "필드 수리 · 생존",
    gold: 2800,
    diamond: 25,
    maxHp: 132,
    speedMul: 0.97,
    turnMul: 0.98,
    gunDmg: 15,
    skill: "repair",
    skillLabel: "필드수리",
    color: "#e8c07a",
  },
];

export const CALLSIGNS = [
  "VIPER",
  "BANDIT",
  "FANG",
  "RAVEN",
  "WOLF",
  "SHARK",
  "GHOST",
  "MIG",
  "COBRA",
  "HAWK",
];

export function rankFor(w: number): Rank {
  let r = RANKS[0];
  for (const x of RANKS) if (w >= x.minWave) r = x;
  return r;
}

export function theaterById(id: string): Theater {
  return ALL_LOCATIONS.find((t) => t.id === id) || THEATERS[0];
}

export function craftById(id: string): Craft {
  return CRAFTS.find((c) => c.id === id) || CRAFTS[0];
}

export const WAVES_PER_THEATER = 3;
export const HARD_LOCK = 0.82;
export const LOCK_CONE = 0.36;
