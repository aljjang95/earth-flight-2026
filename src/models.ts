const cache = new Map<string, string>();

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

function addSweptWing(
  pos: number[],
  nrm: number[],
  idx: number[],
  side: number,
): void {
  const y0 = -0.04,
    y1 = 0.1;
  const rootX = 0.45 * side;
  const tipX = 5.6 * side;
  const rootLE = 2.4,
    rootTE = 0.15;
  const tipLE = 0.15,
    tipTE = -1.15;
  const p = [
    [rootX, y0, rootTE],
    [rootX, y0, rootLE],
    [tipX, y0, tipLE],
    [tipX, y0, tipTE],
    [rootX, y1, rootTE],
    [rootX, y1, rootLE],
    [tipX, y1, tipLE],
    [tipX, y1, tipTE],
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

function toB64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

/** Low-poly fighter in glTF space (Y up, Z forward). */
export function jetModelUri(cssColor: string): string {
  const hit = cache.get(cssColor);
  if (hit) return hit;

  const pos: number[] = [];
  const nrm: number[] = [];
  const idx: number[] = [];

  addBox(pos, nrm, idx, 0, 0.12, 0.2, 1.05, 0.78, 10.4);
  addBox(pos, nrm, idx, 0, 0.08, 6.05, 0.62, 0.48, 2.4);
  addBox(pos, nrm, idx, 0, 0.18, -5.3, 0.55, 0.42, 1.8);
  addBox(pos, nrm, idx, 0, 0.62, 2.15, 0.58, 0.38, 2.1);
  addSweptWing(pos, nrm, idx, 1);
  addSweptWing(pos, nrm, idx, -1);
  addBox(pos, nrm, idx, 0, 1.35, -4.4, 0.12, 1.7, 1.6);
  addBox(pos, nrm, idx, 0.95, 0.22, -4.3, 1.9, 0.1, 1.05);
  addBox(pos, nrm, idx, -0.95, 0.22, -4.3, 1.9, 0.1, 1.05);
  addBox(pos, nrm, idx, 0.7, -0.15, 1.4, 0.55, 0.38, 2.6);
  addBox(pos, nrm, idx, -0.7, -0.15, 1.4, 0.55, 0.38, 2.6);
  addBox(pos, nrm, idx, 0, -0.02, -6.15, 0.42, 0.32, 0.7);

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

  const hex = cssColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const gltf = {
    asset: { version: "2.0", generator: "ace-horizon-jet" },
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
          baseColorFactor: [r * 0.55 + 0.12, g * 0.55 + 0.12, b * 0.55 + 0.12, 1],
          metallicFactor: 0.82,
          roughnessFactor: 0.28,
        },
        emissiveFactor: [r * 0.08, g * 0.08, b * 0.1],
        doubleSided: true,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: pos.length / 3,
        type: "VEC3",
        max: [6, 2.3, 7.3],
        min: [-6, -0.4, -6.6],
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
  const url = URL.createObjectURL(blob);
  cache.set(cssColor, url);
  return url;
}
