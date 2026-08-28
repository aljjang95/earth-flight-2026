export const R_EARTH = 6378137;

export function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function wrapPi(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function wrapDeg(d: number): number {
  let x = d % 360;
  if (x < 0) x += 360;
  return x;
}

export function bearingTo(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return Math.atan2(y, x);
}

export function distM(
  lon1: number,
  lat1: number,
  alt1: number,
  lon2: number,
  lat2: number,
  alt2: number,
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = φ2 - φ1;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const horiz = 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(a)));
  return Math.hypot(horiz, alt2 - alt1);
}

export function moveBody(
  o: { lon: number; lat: number; alt: number; heading: number; pitch: number; speed: number },
  dt: number,
): void {
  const gs = o.speed * Math.cos(o.pitch);
  o.lat += ((gs * Math.cos(o.heading)) / R_EARTH) * (180 / Math.PI) * dt;
  o.lon +=
    ((gs * Math.sin(o.heading)) / (R_EARTH * Math.cos((o.lat * Math.PI) / 180))) *
    (180 / Math.PI) *
    dt;
  o.alt += o.speed * Math.sin(o.pitch) * dt;
  o.lat = clamp(o.lat, -85, 85);
}

export function clockHour(relBearing: number): number {
  const deg = wrapDeg((relBearing * 180) / Math.PI);
  const h = Math.round(deg / 30) % 12;
  return h === 0 ? 12 : h;
}

export function leadPoint(
  lon: number,
  lat: number,
  heading: number,
  speed: number,
  time: number,
): { lon: number; lat: number } {
  const meters = speed * time;
  return {
    lon: lon + (Math.sin(heading) * meters) / 111320,
    lat: lat + (Math.cos(heading) * meters) / 111320,
  };
}
