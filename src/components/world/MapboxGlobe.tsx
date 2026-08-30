"use client";

import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { HOME_POINT, coordsForCountry, isHomeCountry } from "@/lib/reference/coordinates";
import { greatCirclePath } from "@/lib/reference/greatCircle";
import { personName } from "@/lib/people";
import type { Person } from "@/lib/types";

export interface CountryCount {
  country: string;
  person_count: number;
}

/** Longest a marker's name list gets before the rest collapse into a "+N" tail —
 * otherwise a country with a dozen relatives would sprawl across its neighbours. */
const MAX_NAMES_PER_MARKER = 3;

const GOLD = "#b0812f"; // --color-brand
const GOLD_BRIGHT = "#d9a94f"; // --color-brand-line
const LAND = "#fdfcf7"; // --color-surface
const OCEAN = "#dcd8c7"; // --color-paper-sunken
const INK_MUTED = "#4d5a78"; // --color-ink-muted

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * Strips Mapbox's default style down to land, water, and country borders, then
 * repaints those three in the site's own parchment palette — a street atlas has
 * roads, buildings, and POI clutter this map has no use for, and none of it would
 * read as "the same illuminated surface as every other card" anyway.
 *
 * Layer ids are matched by substring rather than an exact whitelist: the "light"
 * style family has kept background/water/admin-0 as stable core ids for years, but
 * pinning to one style version's exact id list would silently break on a Mapbox
 * style update. Each layer is touched independently and wrapped so one unexpected
 * id can't take the rest of the recolour down with it.
 */
function applyParchmentTheme(map: mapboxgl.Map) {
  const layers = map.getStyle()?.layers ?? [];

  for (const layer of layers) {
    const id = layer.id;
    try {
      if (layer.type === "background") {
        map.setPaintProperty(id, "background-color", LAND);
        continue;
      }
      if (layer.type === "fill" && id.includes("water") && !id.includes("waterway")) {
        map.setPaintProperty(id, "fill-color", OCEAN);
        continue;
      }
      if (layer.type === "line" && id.includes("admin-0")) {
        map.setPaintProperty(id, "line-color", GOLD);
        map.setPaintProperty(id, "line-opacity", 0.45);
        map.setPaintProperty(id, "line-width", 0.8);
        continue;
      }
      // Everything else — roads, buildings, POIs, transit, every text label, minor
      // administrative lines — is noise this map doesn't need.
      map.setLayoutProperty(id, "visibility", "none");
    } catch {
      // A layer id/type Mapbox didn't expect here; skip it rather than abort the
      // whole recolour pass over one style quirk.
    }
  }
}

type ArcProps = { country: string; count: number };

function greatCircleFeatureCollection(
  distribution: CountryCount[],
): GeoJSON.FeatureCollection<GeoJSON.LineString, ArcProps> {
  const features: GeoJSON.Feature<GeoJSON.LineString, ArcProps>[] = [];
  for (const row of distribution) {
    if (isHomeCountry(row.country)) continue;
    const coords = coordsForCountry(row.country);
    if (!coords) continue;
    features.push({
      type: "Feature",
      properties: { country: row.country, count: row.person_count },
      geometry: { type: "LineString", coordinates: greatCirclePath(HOME_POINT, coords) },
    });
  }
  return { type: "FeatureCollection", features };
}

function buildMarkerElement(opts: { isHome: boolean; isSelected: boolean; names?: string }): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "flex cursor-pointer flex-col items-center gap-1";

  const dot = document.createElement("span");
  const size = opts.isHome ? 11 : 8;
  dot.style.width = `${size}px`;
  dot.style.height = `${size}px`;
  dot.style.borderRadius = "9999px";
  dot.style.background = opts.isSelected || opts.isHome ? GOLD_BRIGHT : GOLD;
  dot.style.boxShadow = opts.isSelected ? `0 0 0 3px ${GOLD_BRIGHT}55` : "0 1px 2px rgba(27,26,24,0.25)";
  el.appendChild(dot);

  if (opts.names) {
    const label = document.createElement("span");
    label.textContent = opts.names;
    label.className = "font-body italic whitespace-nowrap rounded px-1 text-[11px] leading-tight";
    label.style.color = opts.isSelected ? GOLD_BRIGHT : INK_MUTED;
    label.style.background = "rgba(248,244,236,0.85)";
    el.appendChild(label);
  }

  return el;
}

/** Mutable, always-current snapshot of the props the map's event handlers need —
 * those handlers are created once (inside the mount effect) and would otherwise
 * close over stale props from whatever render happened to be current at mount. */
interface LiveProps {
  distribution: CountryCount[];
  selectedCountry: string | null;
  onSelectCountry: (country: string | null) => void;
  namesByCountry: Map<string, string[]>;
}

export function MapboxGlobe({
  distribution,
  people,
  onSelectCountry,
  selectedCountry,
}: {
  distribution: CountryCount[];
  /** Only people whose current location the viewer is allowed to see — their
   * names are set beside their country's pin, not just its count. */
  people: Person[];
  onSelectCountry: (country: string | null) => void;
  selectedCountry: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const styleReadyRef = useRef(false);
  const imperativeRef = useRef<{ drawMarkers: () => void; highlightSelection: () => void } | null>(null);

  const namesByCountry = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of people) {
      if (!p.current_country) continue;
      const list = map.get(p.current_country);
      if (list) list.push(personName(p));
      else map.set(p.current_country, [personName(p)]);
    }
    return map;
  }, [people]);

  const live = useRef<LiveProps>({ distribution, selectedCountry, onSelectCountry, namesByCountry });
  // Refs can't be written during render (React flags it) — this keeps `live` fresh
  // after every render instead, which is still well before any event handler
  // below could read it.
  useEffect(() => {
    live.current = { distribution, selectedCountry, onSelectCountry, namesByCountry };
  });

  // Mount: create the map once. Everything data-dependent is drawn imperatively
  // (via imperativeRef, reading `live`), so this effect never needs to re-run —
  // recreating a Mapbox GL map on every prop change would be far too heavy.
  useEffect(() => {
    if (!containerRef.current || !TOKEN) return;
    mapboxgl.accessToken = TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      projection: "globe",
      center: [HOME_POINT.lng, 25],
      zoom: 1.2,
      attributionControl: true,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    function namesForCountry(country: string): string | undefined {
      const names = live.current.namesByCountry.get(country);
      if (!names || names.length === 0) return undefined;
      const shown = names.slice(0, MAX_NAMES_PER_MARKER).join(", ");
      const rest = names.length - MAX_NAMES_PER_MARKER;
      return rest > 0 ? `${shown} +${rest}` : shown;
    }

    function drawMarkers() {
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];

      for (const row of live.current.distribution) {
        const coords = coordsForCountry(row.country);
        if (!coords) continue;
        const el = buildMarkerElement({
          isHome: isHomeCountry(row.country),
          isSelected: row.country === live.current.selectedCountry,
          names: namesForCountry(row.country),
        });
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const current = live.current.selectedCountry;
          live.current.onSelectCountry(current === row.country ? null : row.country);
        });
        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([coords.lng, coords.lat])
          .addTo(map);
        markersRef.current.push(marker);
      }
    }

    function highlightSelection() {
      if (!map.getLayer("arcs-line")) return;
      const selected = live.current.selectedCountry;
      map.setPaintProperty(
        "arcs-line",
        "line-color",
        selected ? ["match", ["get", "country"], selected, GOLD_BRIGHT, GOLD] : GOLD,
      );
      map.setPaintProperty(
        "arcs-line",
        "line-width",
        selected ? ["match", ["get", "country"], selected, 2.2, 1.2] : 1.2,
      );
    }

    imperativeRef.current = { drawMarkers, highlightSelection };

    map.on("style.load", () => {
      applyParchmentTheme(map);
      map.setFog({
        color: LAND,
        "high-color": "#f4e3c2", // --color-brand-soft
        "horizon-blend": 0.04,
        "space-color": "#f4f2ea", // --color-paper
        "star-intensity": 0,
      });
      map.addSource("arcs", {
        type: "geojson",
        data: greatCircleFeatureCollection(live.current.distribution),
      });
      map.addLayer({
        id: "arcs-line",
        type: "line",
        source: "arcs",
        layout: { "line-cap": "round" },
        paint: { "line-color": GOLD, "line-width": 1.2, "line-opacity": 0.75 },
      });
      styleReadyRef.current = true;
      drawMarkers();
      highlightSelection();
    });

    // Slow autorotate on load, permanently stopped the moment the user takes hold
    // of it — same feel as the previous globe, ported to Mapbox's own recipe.
    let userInteracting = false;
    const SECONDS_PER_REVOLUTION = 240;
    const MAX_SPIN_ZOOM = 3;
    const SLOW_SPIN_ZOOM = 2;
    function spin() {
      if (userInteracting) return;
      const zoom = map.getZoom();
      if (zoom >= MAX_SPIN_ZOOM) return;
      let distancePerSecond = 360 / SECONDS_PER_REVOLUTION;
      if (zoom > SLOW_SPIN_ZOOM) {
        distancePerSecond *= (MAX_SPIN_ZOOM - zoom) / (MAX_SPIN_ZOOM - SLOW_SPIN_ZOOM);
      }
      const center = map.getCenter();
      center.lng -= distancePerSecond;
      map.easeTo({ center, duration: 1000, easing: (n) => n });
    }
    map.on("moveend", spin);
    spin();
    const stopSpin = () => {
      userInteracting = true;
    };
    map.on("mousedown", stopSpin);
    map.on("touchstart", stopSpin);
    map.on("wheel", stopSpin);

    return () => {
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      styleReadyRef.current = false;
    };
  }, []);

  // Redraw markers and the arc source when the underlying data changes.
  useEffect(() => {
    if (!styleReadyRef.current) return;
    imperativeRef.current?.drawMarkers();
    const source = mapRef.current?.getSource("arcs") as mapboxgl.GeoJSONSource | undefined;
    source?.setData(greatCircleFeatureCollection(distribution));
  }, [distribution, namesByCountry]);

  // Fly to and highlight the picked country; redraw markers so the selected one's
  // dot/label restyles (their DOM elements don't otherwise know about selection).
  useEffect(() => {
    if (!styleReadyRef.current) return;
    imperativeRef.current?.drawMarkers();
    imperativeRef.current?.highlightSelection();
    if (!selectedCountry) return;
    const coords = coordsForCountry(selectedCountry);
    if (!coords) return;
    mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 3.2, duration: 900 });
  }, [selectedCountry]);

  if (!TOKEN) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-strong p-6 text-center">
        <p className="text-sm font-medium text-notice">Mapbox token sozlanmagan</p>
        <p className="max-w-xs text-xs text-ink-faint">
          Xaritani koʻrsatish uchun <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> muhit
          oʻzgaruvchisini <code>.env.local</code> fayliga qoʻshing (mapbox.com dan
          bepul olinadi).
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className="aspect-square w-full overflow-hidden rounded-card" />;
}
