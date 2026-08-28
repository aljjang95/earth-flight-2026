import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bearingTo, clamp, clockHour, distM, wrapDeg, wrapPi } from "../src/math.ts";

describe("flight math", () => {
  it("wraps angles", () => {
    assert.ok(Math.abs(wrapPi(Math.PI + 0.2) + (Math.PI - 0.2)) < 1e-9);
    assert.equal(wrapDeg(-10), 350);
  });

  it("bearing tokyo from seoul is roughly east", () => {
    const b = bearingTo(126.978, 37.5665, 139.6917, 35.6895);
    assert.ok(b > 0.8 && b < 1.8, String(b));
  });

  it("distance seoul-tokyo is ~1150km", () => {
    const d = distM(126.978, 37.5665, 0, 139.6917, 35.6895, 0);
    assert.ok(d > 1_050_000 && d < 1_250_000, String(d));
  });

  it("clockHour maps 90deg to 3 o'clock", () => {
    assert.equal(clockHour(Math.PI / 2), 3);
    assert.equal(clockHour(0), 12);
  });

  it("clamp", () => {
    assert.equal(clamp(5, 0, 3), 3);
    assert.equal(clamp(-1, 0, 3), 0);
  });
});
