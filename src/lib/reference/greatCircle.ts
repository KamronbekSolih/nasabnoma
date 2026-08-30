import type { GeoPoint } from "./coordinates";

/**
 * Interpolates points along the great-circle (shortest-path-on-a-sphere) arc between
 * two coordinates, using the standard spherical slerp formula.
 *
 * Needed because a plain two-point GeoJSON LineString is interpolated in flat
 * lon/lat space — on a globe that draws a path that visibly cuts through the
 * sphere instead of following its surface. Feeding Mapbox a pre-subdivided curve
 * fixes that; Mapbox itself only warps rendering, it doesn't reroute geometry.
 *
 * Not antimeridian-safe: it assumes the shorter arc between two points never
 * crosses ±180° longitude. True for every home→country pair this app draws
 * (Tashkent to everywhere in `COUNTRY_COORDS`), since none of them sit on the
 * Pacific side of the globe opposite it — worth revisiting if that ever changes.
 */
export function greatCirclePath(
  start: GeoPoint,
  end: GeoPoint,
  segments = 64,
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const lat1 = toRad(start.lat);
  const lon1 = toRad(start.lng);
  const lat2 = toRad(end.lat);
  const lon2 = toRad(end.lng);

  const angularDistance =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2,
      ),
    );

  if (angularDistance === 0) return [[start.lng, start.lat]];

  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const a = Math.sin((1 - f) * angularDistance) / Math.sin(angularDistance);
    const b = Math.sin(f * angularDistance) / Math.sin(angularDistance);
    const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
    const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);
    coords.push([toDeg(lon), toDeg(lat)]);
  }
  return coords;
}
