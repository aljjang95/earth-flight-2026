/** GPU / quality bootstrap — pure, unit-tested (no Cesium, no DOM). */

export type Quality = "high" | "medium" | "low";

export const IMPROVE_INTERVAL = 3.2;
export const FPS_QUALITY_FLOOR = 30;
export const FPS_QUALITY_HEADROOM = 50;

export function isSoftwareRenderer(renderer: string): boolean {
  const r = (renderer || "").toLowerCase();
  return (
    r.includes("swiftshader") ||
    r.includes("llvmpipe") ||
    r.includes("softpipe") ||
    r.includes("software") ||
    r.includes("mesa offscreen") ||
    r.includes("virgl") ||
    r.includes("angelium")
  );
}

export function bootQuality(opts: { software: boolean; mobile: boolean }): Quality {
  if (opts.software) return "low";
  if (opts.mobile) return "medium";
  return "high";
}

export function bootFrameRate(opts: { software: boolean; mobile: boolean; quality: Quality }): number {
  if (opts.software || opts.mobile || opts.quality === "low") return 30;
  return 60;
}
