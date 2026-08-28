import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergePatch, proposePatches, type ImproveMetrics } from "../src/selfImprove.ts";

function base(over: Partial<ImproveMetrics> = {}): ImproveMetrics {
  return {
    fps: 55,
    quality: "medium",
    autoQuality: true,
    flying: true,
    aliveTime: 20,
    dead: false,
    damageTaken: 12,
    aiMul: 1,
    spawnMul: 1,
    lockCone: 0.36,
    lockAttempts: 1,
    locks: 1,
    kills: 2,
    ...over,
  };
}

describe("self-improve patches", () => {
  it("does nothing when not flying", () => {
    assert.equal(proposePatches(base({ flying: false, fps: 10 })).length, 0);
  });

  it("drops quality when fps is under 30", () => {
    const p = proposePatches(base({ fps: 28, quality: "medium" }));
    assert.equal(p[0]?.id, "quality-down");
    assert.equal(p[0]?.quality, "low");
  });

  it("raises quality when there is headroom", () => {
    const p = proposePatches(base({ fps: 58, quality: "medium" }));
    assert.equal(p[0]?.id, "quality-up");
    assert.equal(p[0]?.quality, "high");
  });

  it("eases AI after an early death including sub-6s losses", () => {
    const p = proposePatches(base({ dead: true, aliveTime: 5, fps: 40 }));
    const ease = p.find((x) => x.id === "ease-ai");
    assert.ok(ease);
    assert.ok((ease?.aiMul ?? 1) < 1);
    assert.ok((ease?.spawnMul ?? 1) > 1);
  });

  it("tightens AI when the sortie's too easy", () => {
    const p = proposePatches(base({ aliveTime: 60, damageTaken: 4, kills: 6, fps: 40 }));
    assert.equal(p.find((x) => x.id === "tighten-ai")?.aiMul, 1.08);
  });

  it("widens lock cone if lock never comes", () => {
    const p = proposePatches(base({ lockAttempts: 8, locks: 0, fps: 40 }));
    assert.equal(p.find((x) => x.id === "widen-lock")?.lockCone, 0.4);
  });

  it("mergePatch applies fields", () => {
    const next = mergePatch(base(), { id: "x", reason: "t", aiMul: 0.8, quality: "low" });
    assert.equal(next.aiMul, 0.8);
    assert.equal(next.quality, "low");
  });
});
