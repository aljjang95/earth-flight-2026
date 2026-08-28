import { CRAFTS, THEATERS, VERSION } from "./config";
import type { CamMode, Enemy, Missile, Mode, Player, Tracer, Quality } from "./types";
import { loadSave } from "./save";
import type { SaveData } from "./types";

export const G = {
  version: VERSION,
  viewer: null as any,
  flying: false,
  paused: false,
  gameOver: false,
  menuOrbit: true,
  mode: "campaign" as Mode,
  cam: "third" as CamMode,
  difficulty: 1,
  theaterId: "seoul",
  campaignIndex: 0,
  tilesBackend: "imagery" as string,
  quality: "medium" as Quality,
  isMobile: false,
  ionToken: "",
  fps: 0,
  frames: 0,
  fpsT: 0,
  lastTs: 0,
  raf: 0,
  playerEntity: null as any,
  playerExhaust: null as any,
  trailEntity: null as any,
  playerTrail: [] as Array<[number, number, number]>,
  points: null as any,
  lines: null as any,
  clouds: null as any,
  player: {
    lon: 126.978,
    lat: 37.5665,
    alt: 900,
    heading: 1.4,
    pitch: -0.08,
    roll: 0,
    speed: 160,
    throttle: 0.72,
    stallSpeed: 32,
    hp: 110,
    maxHp: 110,
    g: 1,
    flares: 6,
  } as Player,
  enemies: [] as Enemy[],
  wingmen: [] as Enemy[],
  tracers: [] as Tracer[],
  missiles: [] as Missile[],
  wave: 0,
  waveGoal: 0,
  waveDown: 0,
  waveHold: 0,
  theaterWave: 0,
  kills: 0,
  aliveTime: 0,
  lockProg: 0,
  locked: null as Enemy | null,
  fireCd: 0,
  missileCd: 0,
  flareCd: 0,
  skillCd: 0,
  skillLeft: 0,
  boostMul: 1,
  damageMul: 1,
  cloaked: false,
  gunDmg: 15,
  speedMul: 1,
  turnMul: 1,
  activeSkill: "afterburn",
  killStreak: 0,
  killStreakT: 0,
  lastGround: null as number | null,
  groundTimer: 0,
  radio: "",
  radioT: 0,
  rwr: false,
  incoming: 0,
  hitMark: 0,
  objective: "",
  tutorial: false,
  save: loadSave() as SaveData,
  equipped: "sparrow",
  crafts: CRAFTS,
  theaters: THEATERS,
  transiting: false,
  prologue: false,
  menuFly: false,
};

export function resetCombatStats(): void {
  G.kills = 0;
  G.aliveTime = 0;
  G.wave = 0;
  G.theaterWave = 0;
  G.waveGoal = 0;
  G.waveDown = 0;
  G.waveHold = 0;
  G.lockProg = 0;
  G.locked = null;
  G.fireCd = 0;
  G.missileCd = 0;
  G.flareCd = 0;
  G.skillCd = 0;
  G.skillLeft = 0;
  G.boostMul = 1;
  G.damageMul = 1;
  G.cloaked = false;
  G.killStreak = 0;
  G.gameOver = false;
  G.paused = false;
  G.rwr = false;
  G.incoming = 0;
  G.hitMark = 0;
  G.objective = "";
  G.wingmen.length = 0;
}
