import { ALL_LOCATIONS, theaterById } from "./config";
import { G } from "./state";
import { setMenuLook } from "./camera";

export function isMobile(): boolean {
  return matchMedia("(max-width: 768px), (pointer: coarse)").matches;
}

function esriLayer(): any {
  return new Cesium.ImageryLayer(
    new Cesium.UrlTemplateImageryProvider({
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      maximumLevel: 19,
      credit: "Esri, Maxar, Earthstar Geographics",
    }),
  );
}

export async function initViewer(): Promise<void> {
  G.isMobile = isMobile();
  G.quality = G.isMobile ? "medium" : "high";
  const token = G.ionToken.trim();
  if (token) Cesium.Ion.defaultAccessToken = token;

  const opts: Record<string, unknown> = {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    creditContainer: document.getElementById("mapCredit") || document.createElement("div"),
    requestRenderMode: false,
    targetFrameRate: G.isMobile ? 30 : 60,
    baseLayer: esriLayer(),
    msaaSamples: G.quality === "high" ? 4 : 1,
  };

  if (token) {
    try {
      opts.terrain = Cesium.Terrain.fromWorldTerrain();
    } catch {
      /* ellipsoid */
    }
  }

  G.viewer = new Cesium.Viewer("cesiumContainer", opts);
  const scene = G.viewer.scene;
  scene.screenSpaceCameraController.enableInputs = false;
  scene.globe.enableLighting = true;
  scene.globe.showGroundAtmosphere = true;
  scene.fog.enabled = true;
  scene.fog.density = 0.000012;
  scene.skyAtmosphere.brightnessShift = 0.12;
  scene.skyAtmosphere.saturationShift = 0.08;
  scene.globe.maximumScreenSpaceError = G.isMobile ? 2.8 : 1.4;
  scene.globe.tileCacheSize = G.isMobile ? 700 : 2200;
  try {
    scene.highDynamicRange = G.quality === "high";
  } catch {
    /* hdr optional */
  }
  try {
    const bloom = scene.postProcessStages.bloom;
    bloom.enabled = G.quality === "high";
    bloom.uniforms.contrast = 96;
    bloom.uniforms.brightness = -0.25;
    bloom.uniforms.delta = 0.9;
    bloom.uniforms.sigma = 3.2;
    bloom.uniforms.stepSize = 1.6;
    scene.postProcessStages.fxaa.enabled = true;
  } catch {
    /* post optional */
  }

  G.tilesBackend = "esri";
  applySolarNoon(127, 37.5);
  G.viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(20, 18, 18_500_000),
    orientation: { heading: 0.15, pitch: Cesium.Math.toRadians(-90), roll: 0 },
  });

  if (token) void tryPhotorealistic();
  spawnClouds(theaterById("seoul").lon, theaterById("seoul").lat);
}

export function applySolarNoon(lon: number, _lat: number): void {
  try {
    const now = new Date();
    const utcHour = (12 - lon / 15 + 24) % 24;
    const solar = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        Math.floor(utcHour),
        Math.floor((utcHour % 1) * 60),
      ),
    );
    G.viewer.clock.currentTime = Cesium.JulianDate.fromDate(solar);
    G.viewer.clock.shouldAnimate = false;
    G.viewer.scene.globe.enableLighting = true;
  } catch {
    /* clock optional */
  }
}

async function tryPhotorealistic(): Promise<void> {
  try {
    const tileset = await Promise.race([
      Cesium.createGooglePhotorealistic3DTileset({ onlyUsingWithGoogleGeocoder: false }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("tiles timeout")), 14000)),
    ]);
    if (!G.viewer || G.viewer.isDestroyed()) return;
    G.viewer.scene.primitives.add(tileset);
    tileset.maximumScreenSpaceError = G.isMobile ? 10 : 6;
    tileset.dynamicScreenSpaceError = true;
    G.tilesBackend = "photorealistic";
  } catch {
    G.tilesBackend = "esri+terrain";
  }
}

export function spawnClouds(lon: number, lat: number): void {
  if (G.quality === "low" || !G.viewer) return;
  try {
    if (G.clouds) {
      try {
        G.viewer.scene.primitives.remove(G.clouds);
      } catch {
        /* */
      }
    }
    const col = new Cesium.CloudCollection();
    const n = G.isMobile ? 12 : 28;
    for (let i = 0; i < n; i++) {
      const dlon = (Math.random() - 0.5) * 1.6;
      const dlat = (Math.random() - 0.5) * 1.2;
      col.add({
        position: Cesium.Cartesian3.fromDegrees(lon + dlon, lat + dlat, 1400 + Math.random() * 1600),
        scale: new Cesium.Cartesian2(420 + Math.random() * 700, 140 + Math.random() * 180),
        maximumSize: new Cesium.Cartesian3(55, 18, 16),
        slice: 0.28 + Math.random() * 0.25,
        brightness: 0.92 + Math.random() * 0.1,
      });
    }
    G.viewer.scene.primitives.add(col);
    G.clouds = col;
  } catch {
    G.clouds = null;
  }
}

export function lookAtTheater(id: string, height = 420_000, duration = 2.4): void {
  const t = theaterById(id);
  applySolarNoon(t.lon, t.lat);
  G.menuFly = true;
  G.viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(t.lon, t.lat, height),
    orientation: { heading: t.heading, pitch: Cesium.Math.toRadians(-42), roll: 0 },
    duration,
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    complete: () => {
      setMenuLook(t.lon, t.lat, height);
      G.menuFly = false;
    },
    cancel: () => {
      setMenuLook(t.lon, t.lat, height);
      G.menuFly = false;
    },
  });
}

export function resizeViewer(): void {
  if (!G.viewer || G.viewer.isDestroyed()) return;
  try {
    G.viewer.resize();
  } catch {
    /* */
  }
}

export async function transitCinematic(fromId: string, toId: string): Promise<void> {
  const from = theaterById(fromId);
  const to = theaterById(toId);
  G.transiting = true;
  const ov = document.getElementById("transit");
  const title = document.getElementById("transitTitle");
  const sub = document.getElementById("transitSub");
  if (ov) ov.classList.add("show");
  if (title) title.textContent = to.name;
  if (sub) sub.textContent = `${from.region}  →  ${to.region} · ${to.country}`;
  applySolarNoon(to.lon, to.lat);
  await fly(from.lon, from.lat, 3_800_000, 2.2);
  await fly(to.lon, to.lat, 3_800_000, 3.6);
  spawnClouds(to.lon, to.lat);
  await fly(to.lon, to.lat, 14_000, 2.4);
  if (ov) ov.classList.remove("show");
  G.transiting = false;
}

function fly(lon: number, lat: number, alt: number, duration: number): Promise<void> {
  return new Promise((resolve) => {
    G.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
      orientation: { heading: 0.2, pitch: Cesium.Math.toRadians(alt > 1e6 ? -88 : -28), roll: 0 },
      duration,
      complete: () => resolve(),
      cancel: () => resolve(),
    });
  });
}

export function locationOptionsHtml(): string {
  const camp = ALL_LOCATIONS.filter((t) => t.briefing);
  const extra = ALL_LOCATIONS.filter((t) => !t.briefing);
  let html = `<optgroup label="월드 서킷">`;
  for (const t of camp) html += `<option value="${t.id}">${t.name}, ${t.country}</option>`;
  html += `</optgroup><optgroup label="자유 전구">`;
  for (const t of extra) html += `<option value="${t.id}">${t.name}, ${t.country}</option>`;
  html += `</optgroup>`;
  return html;
}
