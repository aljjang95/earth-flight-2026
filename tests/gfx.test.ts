import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bootFrameRate, bootQuality, isSoftwareRenderer } from "../src/gfx.ts";

describe("graphics bootstrap", () => {
  it("detects SwiftShader / llvmpipe as software GL", () => {
    assert.equal(isSoftwareRenderer("Google SwiftShader"), true);
    assert.equal(isSoftwareRenderer("llvmpipe (LLVM 15.0.7, 256 bits)"), true);
    assert.equal(isSoftwareRenderer("ANGLE (NVIDIA GeForce RTX 4080 Direct3D11)"), false);
    assert.equal(isSoftwareRenderer(""), false);
  });

  it("boots low quality on software GL and high on a real desktop GPU", () => {
    assert.equal(bootQuality({ software: true, mobile: false }), "low");
    assert.equal(bootQuality({ software: false, mobile: true }), "medium");
    assert.equal(bootQuality({ software: false, mobile: false }), "high");
  });

  it("caps software / low at 30fps and desktop high at 60", () => {
    assert.equal(bootFrameRate({ software: true, mobile: false, quality: "low" }), 30);
    assert.equal(bootFrameRate({ software: false, mobile: false, quality: "high" }), 60);
  });
});
