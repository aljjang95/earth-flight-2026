import { ALL_LOCATIONS, theaterById } from "./config";
import { G } from "./state";
import { setMenuLook } from "./camera";

let flyGen = 0;

export function isMobile(): boolean {
  return matchMedia("(max-width: 768px), (pointer: coarse)").matches;
}

function esriLayer(): any {
  return new Cesium.ImageryLayer(
    new Cesium.UrlTemplateImageryProvider({
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      maximumLevel: 19,
      enablePickFeatures: false,
      credit: "Esri, Maxar, Earthstar Geographics",
    }),
  );
}

export async function initViewer(): Promise<void> {
  G.isMobile = isMobile();
  G.quality = G.save.quality || "high";
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
    targetFrameRate: 60,
    baseLayer: esriLayer(),
    msaaSamples: 1,
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
  try {
    scene.globe.baseColor = Cesium.Color.fromCssColorString("#061018");
  } catch {
    /* */
  }
  try {
    scene.globe.showWaterEffect = true;
  } catch {
    /* water optional */
  }
  try {
    scene.globe.atmosphereLightIntensity = 10;
    scene.globe.dynamicAtmosphereLighting = true;
  } catch {
    /* atmosphere optional */
  }
  scene.fog.enabled = true;
  scene.fog.density = 0.000006;
  try {
    scene.fog.minimumBrightness = 0.42;
  } catch {
    /* */
  }
  scene.skyAtmosphere.brightnessShift = 0.22;
  scene.skyAtmosphere.saturationShift = 0.12;
  scene.globe.maximumScreenSpaceError = G.isMobile ? 2.0 : 1.25;
  scene.globe.tileCacheSize = G.isMobile ? 900 : 1800;
  try {
    scene.globe.preloadAncestors = true;
    scene.globe.preloadSiblings = true;
    scene.globe.loadingDescendantLimit = 12;
  } catch {
    /* */
  }
  try {
    scene.highDynamicRange = false;
  } catch {
    /* hdr optional */
  }
  try {
    const bloom = scene.postProcessStages.bloom;
    bloom.enabled = false;
    bloom.uniforms.contrast = 92;
    bloom.uniforms.brightness = -0.12;
    bloom.uniforms.delta = 0.9;
    bloom.uniforms.sigma = 2.6;
    bloom.uniforms.stepSize = 1.1;
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
  applyQuality(G.quality);
  await waitForGlobe(2800);
}

export function applyQuality(q: "high" | "medium" | "low"): void {
  G.quality = q;
  if (!G.viewer || G.viewer.isDestroyed()) return;
  const scene = G.viewer.scene;
  const mobile = G.isMobile;
  scene.globe.maximumScreenSpaceError =
    q === "high" ? (mobile ? 1.55 : 1.12) : q === "medium" ? (mobile ? 1.9 : 1.48) : mobile ? 2.6 : 2.25;
  try {
    G.viewer.targetFrameRate = q === "high" ? 60 : q === "medium" ? 50 : 30;
  } catch {
    /* */
  }
  try {
    scene.msaaSamples = 1;
  } catch {
    /* */
  }
  try {
    scene.globe.tileCacheSize = q === "high" ? (mobile ? 1200 : 2200) : q === "medium" ? (mobile ? 900 : 1600) : 700;
    scene.globe.preloadAncestors = true;
    scene.globe.preloadSiblings = q !== "low";
    scene.globe.loadingDescendantLimit = q === "high" ? 16 : q === "medium" ? 10 : 4;
  } catch {
    /* */
  }
  try {
    scene.highDynamicRange = false;
  } catch {
    /* */
  }
  try {
    const bloom = scene.postProcessStages.bloom;
    bloom.enabled = q === "high";
    scene.postProcessStages.fxaa.enabled = true;
  } catch {
    /* */
  }
  try {
    // Lighting stays on at every preset — unlit ellipsoid is the olive-clay look.
    scene.globe.enableLighting = true;
    scene.globe.showWaterEffect = q !== "low";
    scene.globe.showGroundAtmosphere = !G.flying;
  } catch {
    /* */
  }
  try {
    scene.fog.enabled = !G.flying;
  } catch {
    /* */
  }
  if (q === "low" && G.clouds) {
    try {
      scene.primitives.remove(G.clouds);
    } catch {
      /* */
    }
    G.clouds = null;
  }
}

/** Close-range combat: drop ground haze so Esri city tiles are not olive soup. */
export function setNearCameraVisuals(near: boolean): void {
  if (!G.viewer || G.viewer.isDestroyed()) return;
  const scene = G.viewer.scene;
  try {
    scene.globe.showGroundAtmosphere = !near;
    scene.fog.enabled = !near;
  } catch {
    /* */
  }
}

export function waitForGlobe(ms = 2800): Promise<void> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const tick = () => {
      try {
        if (G.viewer && !G.viewer.isDestroyed() && G.viewer.scene.globe.tilesLoaded) {
          resolve();
          return;
        }
      } catch {
        /* */
      }
      if (performance.now() - t0 > ms) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

/** Re-apply globe loaders after takeoff so city tiles fill the chase camera. */
export function warmGlobe(): void {
  if (!G.viewer || G.viewer.isDestroyed()) return;
  applyQuality(G.quality);
}

export function applySolarNoon(lon: number, _lat: number, localHour = 12): void {
  try {
    const utcHour = (localHour - lon / 15 + 24) % 24;
    const now = new Date();
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

export function applyTheaterMood(id: string): void {
  const t = theaterById(id);
  const hour = t.weather === "night" ? 4 : t.weather === "haze" ? 16.5 : t.weather === "storm" ? 14 : 12;
  applySolarNoon(t.lon, t.lat, hour);
  if (!G.viewer) return;
  try {
    const fog =
      t.weather === "storm" ? 0.000012 : t.weather === "haze" ? 0.000008 : t.weather === "night" ? 0.000007 : 0.000005;
    G.viewer.scene.fog.density = fog;
    G.viewer.scene.skyAtmosphere.brightnessShift = t.weather === "night" ? -0.06 : 0.2;
    G.viewer.scene.skyAtmosphere.saturationShift = t.weather === "storm" ? -0.04 : 0.12;
  } catch {
    /* mood optional */
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
    tileset.maximumScreenSpaceError = G.isMobile ? 8 : 4;
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
    const n = G.quality === "high" ? 12 : G.quality === "medium" ? 7 : 0;
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
  applyTheaterMood(id);
  const gen = ++flyGen;
  G.menuFly = true;
  setMenuLook(t.lon, t.lat, height);
  const dest = Cesium.Cartesian3.fromDegrees(t.lon, t.lat, height);
  const overview = Cesium.Cartesian3.fromDegrees(t.lon, t.lat, Math.max(height * 8, 3_200_000));
  const close = { heading: t.heading, pitch: Cesium.Math.toRadians(-42), roll: 0 };
  try {
    G.viewer.camera.setView({
      destination: overview,
      orientation: { heading: t.heading, pitch: Cesium.Math.toRadians(-70), roll: 0 },
    });
  } catch {
    /* */
  }
  try {
    G.viewer.camera.flyTo({
      destination: dest,
      orientation: close,
      duration,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
      complete: () => {
        if (gen === flyGen) G.menuFly = false;
      },
      cancel: () => {
        if (gen === flyGen) G.menuFly = false;
      },
    });
  } catch {
    G.viewer.camera.setView({ destination: dest, orientation: close });
    G.menuFly = false;
  }
  window.setTimeout(() => {
    if (gen === flyGen && G.menuFly) G.menuFly = false;
  }, Math.ceil(duration * 1000) + 400);
}

export function syncHangarTheater(): void {
  if (G.flying || G.transiting) return;
  const sel = document.getElementById("locationSelect") as HTMLSelectElement | null;
  if (!sel?.value || sel.value === G.theaterId) return;
  G.theaterId = sel.value;
  const t = theaterById(sel.value);
  const brief = document.getElementById("briefPreview");
  if (brief) brief.textContent = t.briefing || `${t.name} · 자유 비행 가능`;
  lookAtTheater(sel.value, 480_000, 2.3);
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
  applyTheaterMood(toId);
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
