import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CAMPAIGN, RANKS, THEATERS, rankFor, theaterById } from "../src/config.ts";

describe("world circuit", () => {
  it("has 16 campaign theaters starting in Seoul and ending in Sydney", () => {
    assert.equal(CAMPAIGN.length, 16);
    assert.equal(CAMPAIGN[0], "seoul");
    assert.equal(CAMPAIGN[CAMPAIGN.length - 1], "sydney");
    assert.equal(THEATERS.length, 16);
  });

  it("visits every inhabited continent", () => {
    const ids = new Set(CAMPAIGN);
    for (const id of ["seoul", "tokyo", "hk", "dubai", "cairo", "paris", "nyc", "rio", "capetown", "moscow", "sydney"]) {
      assert.ok(ids.has(id), id);
    }
  });

  it("each theater has coordinates and a briefing", () => {
    for (const t of THEATERS) {
      assert.ok(t.briefing.length > 8, t.id);
      assert.ok(Math.abs(t.lat) < 80, t.id);
      assert.equal(theaterById(t.id).name, t.name);
    }
  });

  it("wave 1 is a two-ship intercept, not a merge in the player's face", () => {
    const r = rankFor(1);
    assert.equal(r.count, 2);
    assert.ok(r.enemyHp <= 36);
    assert.equal(RANKS[0].minWave, 1);
  });
});
