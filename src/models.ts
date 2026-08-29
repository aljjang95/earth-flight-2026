const cache = new Map<string, string>();

export type JetVariant =
  | "sparrow"
  | "kestrel"
  | "harrier"
  | "viper"
  | "wraith"
  | "aegis"
  | "bandit"
  | "ace"
  | "leader";

function addTri(
  pos: number[],
  nrm: number[],
  idx: number[],
  a: number[],
  b: number[],
  c: number[],
): void {
  const ux = b[0] - a[0],
    uy = b[1] - a[1],
    uz = b[2] - a[2];
  const vx = c[0] - a[0],
    vy = c[1] - a[1],
    vz = c[2] - a[2];
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len;
  ny /= len;
  nz /= len;
  const i = pos.length / 3;
  pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  nrm.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  idx.push(i, i + 1, i + 2);
}

function addBox(
  pos: number[],
  nrm: number[],
  idx: number[],
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
): void {
  const x0 = cx - sx / 2,
    x1 = cx + sx / 2;
  const y0 = cy - sy / 2,
    y1 = cy + sy / 2;
  const z0 = cz - sz / 2,
    z1 = cz + sz / 2;
  const p = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ];
  const faces = [
    [0, 3, 2, 1],
    [4, 5, 6, 7],
    [0, 1, 5, 4],
    [3, 7, 6, 2],
    [0, 4, 7, 3],
    [1, 2, 6, 5],
  ];
  for (const f of faces) {
    addTri(pos, nrm, idx, p[f[0]], p[f[1]], p[f[2]]);
    addTri(pos, nrm, idx, p[f[0]], p[f[2]], p[f[3]]);
  }
}

function addLoft(
  pos: number[],
  nrm: number[],
  idx: number[],
  stations: Array<{ z: number; rx: number; ry: number; cy?: number }>,
  segs = 12,
): void {
  const rings: number[][][] = [];
  for (const s of stations) {
    const cy = s.cy ?? 0;
    const ring: number[][] = [];
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      ring.push([Math.cos(a) * s.rx, cy + Math.sin(a) * s.ry, s.z]);
    }
    rings.push(ring);
  }
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const j2 = (j + 1) % segs;
      addTri(pos, nrm, idx, rings[i][j], rings[i][j2], rings[i + 1][j2]);
      addTri(pos, nrm, idx, rings[i][j], rings[i + 1][j2], rings[i + 1][j]);
    }
  }
  const first = rings[0];
  const last = rings[rings.length - 1];
  const c0 = [0, stations[0].cy ?? 0, stations[0].z];
  const c1 = [0, stations[stations.length - 1].cy ?? 0, stations[stations.length - 1].z];
  for (let j = 0; j < segs; j++) {
    const j2 = (j + 1) % segs;
    addTri(pos, nrm, idx, c0, first[j2], first[j]);
    addTri(pos, nrm, idx, c1, last[j], last[j2]);
  }
}

function addSweptWing(
  pos: number[],
  nrm: number[],
  idx: number[],
  side: number,
  tipX: number,
  rootLE: number,
  tipLE: number,
  tipTE: number,
): void {
  const y0 = -0.05,
    y1 = 0.09;
  const rootX = 0.42 * side;
  const tx = tipX * side;
  const rootTE = 0.2;
  const p = [
    [rootX, y0, rootTE],
    [rootX, y0, rootLE],
    [tx, y0, tipLE],
    [tx, y0, tipTE],
    [rootX, y1, rootTE],
    [rootX, y1, rootLE],
    [tx, y1, tipLE],
    [tx, y1, tipTE],
  ];
  const faces = [
    [0, 1, 2, 3],
    [4, 7, 6, 5],
    [1, 5, 6, 2],
    [0, 3, 7, 4],
    [0, 4, 5, 1],
    [3, 2, 6, 7],
  ];
  for (const f of faces) {
    addTri(pos, nrm, idx, p[f[0]], p[f[1]], p[f[2]]);
    addTri(pos, nrm, idx, p[f[0]], p[f[2]], p[f[3]]);
  }
}

function addDeltaWing(pos: number[], nrm: number[], idx: number[], side: number): void {
  const y0 = -0.04,
    y1 = 0.08;
  const p = [
    [0.35 * side, y0, 3.4],
    [0.4 * side, y0, -4.8],
    [5.4 * side, y0, -3.6],
    [0.35 * side, y1, 3.4],
    [0.4 * side, y1, -4.8],
    [5.4 * side, y1, -3.6],
  ];
  addTri(pos, nrm, idx, p[0], p[1], p[2]);
  addTri(pos, nrm, idx, p[3], p[5], p[4]);
  addTri(pos, nrm, idx, p[0], p[2], p[5]);
  addTri(pos, nrm, idx, p[0], p[5], p[3]);
  addTri(pos, nrm, idx, p[1], p[4], p[5]);
  addTri(pos, nrm, idx, p[1], p[5], p[2]);
  addTri(pos, nrm, idx, p[0], p[3], p[4]);
  addTri(pos, nrm, idx, p[0], p[4], p[1]);
}

function toB64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

function boundsOf(pos: number[]): { min: number[]; max: number[] } {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], pos[i + k]);
      max[k] = Math.max(max[k], pos[i + k]);
    }
  }
  return { min, max };
}

function packGltf(pos: number[], nrm: number[], idx: number[], color: number[], extras: Record<string, unknown>): string {
  const pArr = new Float32Array(pos);
  const nArr = new Float32Array(nrm);
  const iArr = new Uint16Array(idx);
  const pBytes = pArr.byteLength;
  const nBytes = nArr.byteLength;
  const iOff = pBytes + nBytes;
  const pad = (4 - (iOff % 4)) % 4;
  const buf = new ArrayBuffer(iOff + pad + iArr.byteLength);
  new Uint8Array(buf, 0, pBytes).set(new Uint8Array(pArr.buffer));
  new Uint8Array(buf, pBytes, nBytes).set(new Uint8Array(nArr.buffer));
  new Uint8Array(buf, iOff + pad).set(new Uint8Array(iArr.buffer));
  const { min, max } = boundsOf(pos);
  const gltf = {
    asset: { version: "2.0", generator: "ace-horizon-jet" },
    extras,
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: "Fighter" }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1 },
            indices: 2,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        name: "skin",
        pbrMetallicRoughness: {
          baseColorFactor: [color[0], color[1], color[2], 1],
          metallicFactor: 0.62,
          roughnessFactor: 0.28,
        },
        emissiveFactor: [color[0] * 0.22, color[1] * 0.18, color[2] * 0.2],
        doubleSided: true,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: pos.length / 3,
        type: "VEC3",
        max,
        min,
      },
      { bufferView: 1, componentType: 5126, count: nrm.length / 3, type: "VEC3" },
      { bufferView: 2, componentType: 5123, count: idx.length, type: "SCALAR" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: pBytes },
      { buffer: 0, byteOffset: pBytes, byteLength: nBytes },
      { buffer: 0, byteOffset: iOff + pad, byteLength: iArr.byteLength },
    ],
    buffers: [
      {
        uri: "data:application/octet-stream;base64," + toB64(new Uint8Array(buf)),
        byteLength: buf.byteLength,
      },
    ],
  };
  const blob = new Blob([JSON.stringify(gltf)], { type: "model/gltf+json" });
  return URL.createObjectURL(blob);
}

function hexRgb(cssColor: string): number[] {
  const hex = cssColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return [r * 0.82 + 0.12, g * 0.82 + 0.12, b * 0.82 + 0.14];
}

/** Low-poly lofted fighter in glTF space (Y up, Z forward). */
export function jetModelUri(cssColor: string, variant: string = "sparrow"): string {
  const key = "v52:" + cssColor + ":" + variant;
  const hit = cache.get(key);
  if (hit) return hit;

  const pos: number[] = [];
  const nrm: number[] = [];
  const idx: number[] = [];
  const v = variant as JetVariant;

  const fat = v === "harrier" || v === "aegis" ? 1.18 : v === "wraith" ? 0.92 : 1;
  const long = v === "kestrel" || v === "viper" ? 1.08 : 1;
  addLoft(pos, nrm, idx, [
    { z: -6.5 * long, rx: 0.28 * fat, ry: 0.28 * fat },
    { z: -5.4 * long, rx: 0.48 * fat, ry: 0.38 * fat },
    { z: -3.2 * long, rx: 0.62 * fat, ry: 0.42 * fat },
    { z: -0.4, rx: 0.7 * fat, ry: 0.44 * fat, cy: 0.02 },
    { z: 2.4, rx: 0.58 * fat, ry: 0.4 * fat, cy: 0.06 },
    { z: 4.6 * long, rx: 0.4 * fat, ry: 0.3 * fat, cy: 0.04 },
    { z: 6.4 * long, rx: 0.22, ry: 0.18, cy: 0.02 },
    { z: 7.7 * long, rx: 0.08, ry: 0.07 },
  ]);
  addLoft(
    pos,
    nrm,
    idx,
    [
      { z: 1.35, rx: 0.22, ry: 0.12, cy: 0.42 },
      { z: 2.6, rx: 0.28, ry: 0.2, cy: 0.58 },
      { z: 3.9, rx: 0.22, ry: 0.16, cy: 0.5 },
      { z: 5.05, rx: 0.1, ry: 0.08, cy: 0.28 },
    ],
    10,
  );

  if (v === "wraith") {
    addDeltaWing(pos, nrm, idx, 1);
    addDeltaWing(pos, nrm, idx, -1);
  } else {
    const tip = v === "kestrel" ? 6.4 : v === "harrier" ? 5.1 : 5.7;
    const rootLE = v === "viper" ? 2.1 : 2.55;
    const tipLE = v === "viper" ? -0.4 : 0.2;
    const tipTE = v === "ace" || v === "leader" ? -1.5 : -1.05;
    addSweptWing(pos, nrm, idx, 1, tip, rootLE, tipLE, tipTE);
    addSweptWing(pos, nrm, idx, -1, tip, rootLE, tipLE, tipTE);
  }

  const twin = v === "viper" || v === "leader" || v === "wraith";
  if (twin) {
    addBox(pos, nrm, idx, 0.38, 1.35, -4.7, 0.1, 1.7, 1.25);
    addBox(pos, nrm, idx, -0.38, 1.35, -4.7, 0.1, 1.7, 1.25);
  } else {
    addBox(pos, nrm, idx, 0, 1.55, -4.65, 0.1, 1.95, 1.4);
    addBox(pos, nrm, idx, 0.12, 1.15, -5.0, 0.08, 0.85, 0.85);
    addBox(pos, nrm, idx, -0.12, 1.15, -5.0, 0.08, 0.85, 0.85);
  }
  addBox(pos, nrm, idx, 1.05, 0.16, -4.55, 2.15, 0.08, 0.95);
  addBox(pos, nrm, idx, -1.05, 0.16, -4.55, 2.15, 0.08, 0.95);
  addBox(pos, nrm, idx, 0.58, -0.16, 1.15, 0.4, 0.26, 2.2);
  addBox(pos, nrm, idx, -0.58, -0.16, 1.15, 0.4, 0.26, 2.2);
  if (v === "aegis") {
    addSweptWing(pos, nrm, idx, 1, 2.2, 5.2, 4.4, 3.5);
    addSweptWing(pos, nrm, idx, -1, 2.2, 5.2, 4.4, 3.5);
  }
  addBox(pos, nrm, idx, 0, -0.02, -6.55 * long, 0.34, 0.26, 0.5);

  const url = packGltf(pos, nrm, idx, hexRgb(cssColor), { variant });
  cache.set(key, url);
  return url;
}

export function missileModelUri(cssColor: string): string {
  const key = "msl:" + cssColor;
  const hit = cache.get(key);
  if (hit) return hit;
  const pos: number[] = [];
  const nrm: number[] = [];
  const idx: number[] = [];
  addLoft(pos, nrm, idx, [
    { z: -1.6, rx: 0.12, ry: 0.12 },
    { z: -0.4, rx: 0.16, ry: 0.16 },
    { z: 0.8, rx: 0.14, ry: 0.14 },
    { z: 1.8, rx: 0.02, ry: 0.02 },
  ], 8);
  addBox(pos, nrm, idx, 0.35, 0, -1.1, 0.55, 0.04, 0.45);
  addBox(pos, nrm, idx, -0.35, 0, -1.1, 0.55, 0.04, 0.45);
  addBox(pos, nrm, idx, 0, 0.35, -1.1, 0.04, 0.55, 0.45);
  const url = packGltf(pos, nrm, idx, hexRgb(cssColor), { kind: "missile" });
  cache.set(key, url);
  return url;
}
