import { G } from "./state";

export function sparkTexture(): string {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,210,90,0.95)");
  grd.addColorStop(0.65, "rgba(255,90,20,0.45)");
  grd.addColorStop(1, "rgba(255,40,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return c.toDataURL();
}

export function smokeTexture(): string {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(240,240,245,0.7)");
  grd.addColorStop(0.5, "rgba(160,170,180,0.35)");
  grd.addColorStop(1, "rgba(80,80,90,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return c.toDataURL();
}

let spark: string | null = null;

export function burstExplosion(lon: number, lat: number, alt: number, scale = 1): void {
  const viewer = G.viewer;
  if (!viewer || viewer.isDestroyed()) return;
  if (!spark) spark = sparkTexture();
  const pos = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
  if (G.quality !== "low") {
    try {
      const n = G.quality === "high" ? 40 : 22;
      const sys = viewer.scene.primitives.add(
        new Cesium.ParticleSystem({
          image: spark,
          startColor: Cesium.Color.fromCssColorString("#ffdd88").withAlpha(0.95),
          endColor: Cesium.Color.fromCssColorString("#ff3300").withAlpha(0),
          startScale: 3.5 * scale,
          endScale: 14 * scale,
          particleLife: 0.7,
          speed: 18 * scale,
          emitter: new Cesium.SphereEmitter(4 * scale),
          emissionRate: 0,
          bursts: [new Cesium.ParticleBurst({ time: 0, minimum: n * 0.7, maximum: n })],
          lifetime: 0.85,
          modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(pos),
          sizeInMeters: true,
        }),
      );
      window.setTimeout(() => {
        try {
          viewer.scene.primitives.remove(sys);
        } catch {
          /* gone */
        }
      }, 1200);
    } catch {
      /* particle optional */
    }
  }

  try {
    const flash = viewer.entities.add({
      position: pos,
      ellipsoid: {
        radii: new Cesium.Cartesian3(22 * scale, 22 * scale, 22 * scale),
        material: Cesium.Color.ORANGE.withAlpha(0.45),
      },
    });
    window.setTimeout(() => {
      try {
        viewer.entities.remove(flash);
      } catch {
        /* gone */
      }
    }, 280);
  } catch {
    /* entity optional */
  }
}

export function ensurePointCollection(): any {
  if (G.points && !G.points.isDestroyed?.()) return G.points;
  G.points = G.viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
  return G.points;
}

export function ensurePolylineCollection(): any {
  if (G.lines && !G.lines.isDestroyed?.()) return G.lines;
  G.lines = G.viewer.scene.primitives.add(new Cesium.PolylineCollection());
  return G.lines;
}

export function hitSpark(lon: number, lat: number, alt: number): void {
  const pts = ensurePointCollection();
  const prim = pts.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
    pixelSize: 11,
    color: Cesium.Color.fromCssColorString("#fff7ed"),
    outlineColor: Cesium.Color.ORANGE,
    outlineWidth: 1,
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  });
  window.setTimeout(() => {
    try {
      pts.remove(prim);
    } catch {
      /* */
    }
  }, 90);
}

export function hprFrame(lon: number, lat: number, alt: number, h: number, p: number, r: number): any {
  const pos = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
  return Cesium.Transforms.headingPitchRollToFixedFrame(pos, new Cesium.HeadingPitchRoll(h, p, r));
}
