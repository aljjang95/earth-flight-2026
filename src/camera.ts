import { G } from "./state";

let menuHeading = 0.2;
let menuLat = 18;
let menuLon = 22;
let menuAlt = 16_800_000;

export function setMenuLook(lon: number, lat: number, alt = 16_800_000): void {
  menuLon = lon;
  menuLat = lat;
  menuAlt = alt;
}

export function updateMenuCamera(dt: number): void {
  if (!G.viewer || G.flying || G.transiting || G.menuFly) return;
  menuHeading += menuAlt > 8_000_000 ? 0.035 * dt : 0.012 * dt;
  const pitch = menuAlt > 8_000_000 ? -88 : -42;
  try {
    G.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(menuLon, menuLat, menuAlt),
      orientation: {
        heading: menuHeading * 0.15,
        pitch: Cesium.Math.toRadians(pitch),
        roll: 0,
      },
    });
  } catch {
    /* */
  }
}

export function updateCamera(): void {
  const viewer = G.viewer;
  const p = G.player;
  if (!viewer || !G.playerEntity) return;
  const pos = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt);
  const cam = viewer.camera;
  const frustum = cam.frustum;

  if (G.cam === "first") {
    G.playerEntity.show = false;
    if (G.playerExhaust) G.playerExhaust.show = false;
    const punch = G.boostMul > 1.1 ? 7 : 0;
    if (frustum.fov != null) frustum.fov = Cesium.Math.toRadians(68 + Math.min(12, p.speed / 24) + punch);
    frustum.near = 0.35;
    const frame = Cesium.Transforms.headingPitchRollToFixedFrame(
      pos,
      new Cesium.HeadingPitchRoll(p.heading, p.pitch, p.roll),
    );
    const eye = Cesium.Matrix4.multiplyByPoint(frame, new Cesium.Cartesian3(2.4, 0, 1.15), new Cesium.Cartesian3());
    const dir = Cesium.Matrix4.multiplyByPointAsVector(
      frame,
      new Cesium.Cartesian3(1, 0, G.mode === "free" ? -0.22 : -0.12),
      new Cesium.Cartesian3(),
    );
    Cesium.Cartesian3.normalize(dir, dir);
    const up = Cesium.Matrix4.multiplyByPointAsVector(frame, Cesium.Cartesian3.UNIT_Z, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(up, up);
    cam.lookAtTransform(Cesium.Matrix4.IDENTITY);
    cam.setView({ destination: eye, orientation: { direction: dir, up } });
    document.getElementById("cockpit")?.classList.add("show");
  } else {
    G.playerEntity.show = true;
    if (G.playerExhaust) G.playerExhaust.show = true;
    if (frustum.fov != null) frustum.fov = Cesium.Math.toRadians(58 + (G.boostMul > 1.1 ? 4 : 0));
    frustum.near = 0.6;
    const camRoll = p.roll * 0.38;
    const camPitch = Math.max(-0.34, Math.min(0.1, p.pitch * 0.22 - 0.16));
    const frame = Cesium.Transforms.headingPitchRollToFixedFrame(
      pos,
      new Cesium.HeadingPitchRoll(p.heading, camPitch, camRoll),
    );
    const dist = G.mode === "free" ? 86 : 52;
    const height = G.mode === "free" ? 24 : 14;
    const eye = Cesium.Matrix4.multiplyByPoint(frame, new Cesium.Cartesian3(-dist, 0, height), new Cesium.Cartesian3());
    const lookAt = Cesium.Matrix4.multiplyByPoint(frame, new Cesium.Cartesian3(20, 0, -5), new Cesium.Cartesian3());
    const dir = Cesium.Cartesian3.subtract(lookAt, eye, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(dir, dir);
    const up = Cesium.Matrix4.multiplyByPointAsVector(frame, Cesium.Cartesian3.UNIT_Z, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(up, up);
    cam.lookAtTransform(Cesium.Matrix4.IDENTITY);
    cam.setView({ destination: eye, orientation: { direction: dir, up } });
    document.getElementById("cockpit")?.classList.remove("show");
  }
}

export function toggleCamera(): void {
  G.cam = G.cam === "first" ? "third" : "first";
  const btn = document.getElementById("cameraModeBtn");
  if (btn) btn.textContent = G.cam === "first" ? "3인칭" : "1인칭";
}
