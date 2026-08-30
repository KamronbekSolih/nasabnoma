/**
 * Map coordinates for the countries in `countries.ts`.
 *
 * Each point is the country's CAPITAL, not its geographic centroid. The centroid
 * rule reads badly on a globe for large countries — Russia's centroid sits in empty
 * Siberia, thousands of kilometres from where any Uzbek diaspora actually lives, so
 * an arc drawn to it would be quietly misleading. Capitals land near real population
 * centres in nearly every case and are a consistent, explainable rule.
 */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Tashkent — the origin every arc is drawn from. */
export const HOME_POINT: GeoPoint = { lat: 41.31, lng: 69.24 };
export const HOME_COUNTRY = "Oʻzbekiston";

export const COUNTRY_COORDS: Record<string, GeoPoint> = {
  "Oʻzbekiston": HOME_POINT,
  "Qozogʻiston": { lat: 51.17, lng: 71.45 },
  "Qirgʻiziston": { lat: 42.87, lng: 74.59 },
  "Tojikiston": { lat: 38.56, lng: 68.79 },
  "Turkmaniston": { lat: 37.95, lng: 58.38 },
  Rossiya: { lat: 55.76, lng: 37.62 },
  Ukraina: { lat: 50.45, lng: 30.52 },
  Belarus: { lat: 53.9, lng: 27.57 },
  Ozarbayjon: { lat: 40.41, lng: 49.87 },
  Armaniston: { lat: 40.18, lng: 44.51 },
  Gruziya: { lat: 41.72, lng: 44.78 },
  Moldova: { lat: 47.01, lng: 28.86 },
  Xitoy: { lat: 39.9, lng: 116.41 },
  Turkiya: { lat: 39.93, lng: 32.86 },
  Eron: { lat: 35.69, lng: 51.39 },
  "Afgʻoniston": { lat: 34.53, lng: 69.17 },
  Pokiston: { lat: 33.68, lng: 73.05 },
  Hindiston: { lat: 28.61, lng: 77.21 },
  "Saudiya Arabistoni": { lat: 24.71, lng: 46.68 },
  "Birlashgan Arab Amirliklari": { lat: 24.45, lng: 54.38 },
  Qatar: { lat: 25.29, lng: 51.53 },
  "Koreya Respublikasi": { lat: 37.57, lng: 126.98 },
  Yaponiya: { lat: 35.68, lng: 139.69 },
  Germaniya: { lat: 52.52, lng: 13.4 },
  Fransiya: { lat: 48.86, lng: 2.35 },
  "Buyuk Britaniya": { lat: 51.51, lng: -0.13 },
  Italiya: { lat: 41.9, lng: 12.5 },
  Ispaniya: { lat: 40.42, lng: -3.7 },
  Polsha: { lat: 52.23, lng: 21.01 },
  Chexiya: { lat: 50.08, lng: 14.44 },
  Niderlandiya: { lat: 52.37, lng: 4.9 },
  Shvetsiya: { lat: 59.33, lng: 18.07 },
  Norvegiya: { lat: 59.91, lng: 10.75 },
  Finlyandiya: { lat: 60.17, lng: 24.94 },
  "Amerika Qoʻshma Shtatlari": { lat: 38.91, lng: -77.04 },
  Kanada: { lat: 45.42, lng: -75.7 },
  Avstraliya: { lat: -35.28, lng: 149.13 },
  Isroil: { lat: 31.78, lng: 35.22 },
  Misr: { lat: 30.04, lng: 31.24 },
};

/** Country names are free text (the field is a combobox), so a typed-in spelling
 * won't match the table exactly. Normalising the apostrophe variants and case
 * recovers most of those before we give up on placing a pin. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[ʻʼ'`’]/g, "").trim();
}

const NORMALIZED_LOOKUP = new Map(
  Object.entries(COUNTRY_COORDS).map(([name, point]) => [normalize(name), point]),
);

export function coordsForCountry(country: string): GeoPoint | undefined {
  return COUNTRY_COORDS[country] ?? NORMALIZED_LOOKUP.get(normalize(country));
}

export function isHomeCountry(country: string): boolean {
  return normalize(country) === normalize(HOME_COUNTRY);
}
