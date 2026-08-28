/** Pure Grok 4.7 self-improvement planner. No Cesium — unit-tested. */

export type Quality = "high" | "medium" | "low";

export interface ImproveMetrics {
  fps: number;
  quality: Quality;
  autoQuality: boolean;
  flying: boolean;
  aliveTime: number;
  dead: boolean;
  damageTaken: number;
  aiMul: number;
  spawnMul: number;
  lockCone: number;
  lockAttempts: number;
  locks: number;
  kills: number;
}

export interface Patch {
  id: string;
  reason: string;
  quality?: Quality;
  aiMul?: number;
  spawnMul?: number;
  lockCone?: number;
}

export function proposePatches(m: ImproveMetrics): Patch[] {
  if (!m.flying) return [];
  const patches: Patch[] = [];

  if (m.autoQuality && m.fps > 2) {
    if (m.fps < 26 && m.quality !== "low") {
      patches.push({
        id: "quality-down",
        reason: `fps ${m.fps | 0} < 26`,
        quality: m.quality === "high" ? "medium" : "low",
      });
    } else if (m.fps > 50 && m.quality !== "high") {
      patches.push({
        id: "quality-up",
        reason: `fps ${m.fps | 0} headroom`,
        quality: m.quality === "low" ? "medium" : "high",
      });
    }
  }

  if (m.dead && m.aliveTime > 6 && m.aliveTime < 28 && m.aiMul > 0.72) {
    patches.push({
      id: "ease-ai",
      reason: "early death",
      aiMul: Math.max(0.72, +(m.aiMul - 0.12).toFixed(2)),
      spawnMul: Math.min(1.25, +(m.spawnMul + 0.08).toFixed(2)),
    });
  }

  if (!m.dead && m.aliveTime > 48 && m.damageTaken < 10 && m.kills >= 3 && m.aiMul < 1.32) {
    patches.push({
      id: "tighten-ai",
      reason: "too easy",
      aiMul: Math.min(1.32, +(m.aiMul + 0.08).toFixed(2)),
    });
  }

  if (m.lockAttempts >= 5 && m.locks < 1 && m.lockCone < 0.48) {
    patches.push({
      id: "widen-lock",
      reason: "lock never acquired",
      lockCone: Math.min(0.48, +(m.lockCone + 0.04).toFixed(2)),
    });
  }

  return patches;
}

export function mergePatch(current: ImproveMetrics, patch: Patch): ImproveMetrics {
  return {
    ...current,
    quality: patch.quality ?? current.quality,
    aiMul: patch.aiMul ?? current.aiMul,
    spawnMul: patch.spawnMul ?? current.spawnMul,
    lockCone: patch.lockCone ?? current.lockCone,
  };
}
