export type Mode = "free" | "combat" | "campaign";
export type EnemyKind = "bandit" | "ace" | "leader";
export type AiMode = "intercept" | "guns" | "break" | "extend" | "rejoin";
export type CamMode = "first" | "third";

export interface Theater {
  id: string;
  name: string;
  region: string;
  country: string;
  lon: number;
  lat: number;
  heading: number;
  briefing: string;
  enemyName: string;
}

export interface Craft {
  id: string;
  name: string;
  role: string;
  blurb: string;
  gold: number;
  diamond?: number;
  maxHp: number;
  speedMul: number;
  turnMul: number;
  gunDmg: number;
  skill: string;
  skillLabel: string;
  color: string;
}

export interface Pose {
  lon: number;
  lat: number;
  alt: number;
  heading: number;
  pitch: number;
  roll: number;
  speed: number;
}

export interface Player extends Pose {
  throttle: number;
  stallSpeed: number;
  hp: number;
  maxHp: number;
  g: number;
  flares: number;
}

export interface Enemy extends Pose {
  id: number;
  hp: number;
  maxHp: number;
  kind: EnemyKind;
  ai: AiMode;
  gunCd: number;
  mslCd: number;
  flareCd: number;
  entity: unknown;
  exhaust: unknown;
  dead: boolean;
  fallT: number;
  callsign: string;
  spdMul: number;
}

export interface Tracer {
  lon: number;
  lat: number;
  alt: number;
  heading: number;
  pitch: number;
  speed: number;
  t: number;
  life: number;
  fromPlayer: boolean;
  dmg: number;
  prim: unknown;
  line: unknown;
  trail: Array<[number, number, number]>;
}

export interface Missile {
  lon: number;
  lat: number;
  alt: number;
  heading: number;
  pitch: number;
  speed: number;
  t: number;
  fromPlayer: boolean;
  targetEnemy: Enemy | null;
  toPlayer: boolean;
  dmg: number;
  trail: Array<[number, number, number]>;
  entity: unknown;
  dead: boolean;
  flared: boolean;
}

export interface SaveData {
  gold: number;
  xp: number;
  level: number;
  potions: number;
  bestWave: number;
  totalKills: number;
  bestKills: number;
  diamonds: number;
  owned: string[];
  equipped: string;
  theatersCleared: string[];
}

export interface Rank {
  name: string;
  minWave: number;
  enemyHp: number;
  count: number;
  spd: number;
  goldMul: number;
}
