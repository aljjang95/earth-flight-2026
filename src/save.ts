import type { SaveData } from "./types";

const KEY = "earth-flight-progress-v3";
const LEGACY = ["earth-flight-progress-v2", "earth-flight-progress-v1"];

function empty(): SaveData {
  return {
    gold: 1600,
    xp: 0,
    level: 1,
    potions: 3,
    bestWave: 0,
    totalKills: 0,
    bestKills: 0,
    diamonds: 8,
    owned: ["sparrow"],
    equipped: "sparrow",
    theatersCleared: [],
  };
}

export function loadSave(): SaveData {
  try {
    let raw: Record<string, unknown> = {};
    const cur = localStorage.getItem(KEY);
    if (cur) raw = JSON.parse(cur);
    else {
      for (const k of LEGACY) {
        const s = localStorage.getItem(k);
        if (s) {
          raw = JSON.parse(s);
          break;
        }
      }
    }
    const base = empty();
    const owned = Array.isArray(raw.owned) && raw.owned.length ? (raw.owned as string[]) : ["sparrow"];
    return {
      gold: Math.max(0, Number(raw.gold) || base.gold),
      xp: Math.max(0, Number(raw.xp) || 0),
      level: Math.max(1, Number(raw.level) || 1),
      potions: Math.max(0, Number(raw.potions ?? base.potions)),
      bestWave: Math.max(0, Number(raw.bestWave) || 0),
      totalKills: Math.max(0, Number(raw.totalKills) || 0),
      bestKills: Math.max(0, Number(raw.bestKills) || 0),
      diamonds: Math.max(0, Number(raw.diamonds) || 0),
      owned,
      equipped: owned.includes(String(raw.equipped)) ? String(raw.equipped) : "sparrow",
      theatersCleared: Array.isArray(raw.theatersCleared) ? (raw.theatersCleared as string[]) : [],
    };
  } catch {
    return empty();
  }
}

export function writeSave(s: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore quota */
  }
}

export function xpNeed(lv: number): number {
  return 90 + (lv - 1) * 70;
}

export function addXp(s: SaveData, n: number): void {
  s.xp += n;
  while (s.xp >= xpNeed(s.level)) {
    s.xp -= xpNeed(s.level);
    s.level += 1;
  }
  writeSave(s);
}
