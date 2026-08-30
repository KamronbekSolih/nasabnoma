/**
 * City-level geocoding for a person's current location, via Nominatim
 * (OpenStreetMap's free search API — nominatim.org). No API key, but its usage
 * policy asks for a descriptive User-Agent and caps requests around 1/second;
 * this is called once per person save, not in a loop, so a family tree's
 * volume is nowhere near that ceiling.
 *
 * Deliberately server-only (imports nothing client-safe isn't needed for) and
 * deliberately never throws — a bad or unresolvable address should leave the
 * person's location text saved and just skip the coordinate, not fail the
 * whole save.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
// Identifies the app per Nominatim's usage policy — no personal contact info,
// just what's calling.
const USER_AGENT = "7avlod-shajara-tree/1.0 (+https://7avlod-shajara.vercel.app)";

/**
 * Geocodes a city-level location. Only worth calling when there's a district
 * (city/town) to resolve — country and region alone are already covered by the
 * app's own country-capital fallback (src/lib/reference/coordinates.ts), and
 * geocoding just the country name would only reproduce that, at the cost of an
 * external request every save.
 */
export async function geocodeCurrentLocation(location: {
  district: string | null;
  region: string | null;
  country: string | null;
}): Promise<GeoPoint | null> {
  const district = location.district?.trim();
  if (!district) return null;

  const query = [district, location.region?.trim(), location.country?.trim()]
    .filter(Boolean)
    .join(", ");

  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      // Nominatim can be slow under load; this is a best-effort enrichment
      // step, not something worth holding up a person's save for.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const results = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = results[0];
    if (!first) return null;

    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch {
    // Network hiccup, timeout, or a malformed response — the person's typed
    // location text is still saved regardless; only the map pin's precision
    // is affected, and it still has the country-capital fallback.
    return null;
  }
}
