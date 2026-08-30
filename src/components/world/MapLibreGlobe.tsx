"use client";

import { useEffect, useMemo, useRef } from "react";
// No default export — unlike mapbox-gl, MapLibre exports everything as named
// exports (Map, Marker, NavigationControl, ...); a namespace import keeps every
// maplibregl.X call site below unchanged.
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { HOME_POINT, coordsForCountry, isHomeCountry } from "@/lib/reference/coordinates";
import { personShortName } from "@/lib/people";
import type { Person } from "@/lib/types";

export interface CountryCount {
  country: string;
  person_count: number;
}

/** Longest a marker's name list gets before the rest collapse into a "+N" tail —
 * otherwise a city with a dozen relatives would sprawl across its neighbours. */
const MAX_NAMES_PER_MARKER = 3;

// These style the family-tree overlay we draw on top (pins, name labels) — our
// own data, not the basemap itself.
const GOLD = "#b0812f"; // --color-brand
const GOLD_BRIGHT = "#d9a94f"; // --color-brand-line
const INK_MUTED = "#4d5a78"; // --color-ink-muted

/** Free, keyless vector tiles — no account, no card, no request limits. See
 * https://openfreemap.org. MIT-licensed, donation-funded. "bright" rather than
 * "positron": shown unmodified (see below), and positron's default palette is
 * pale enough that it read as barely-there even before any recoloring. */
const STYLE_URL = "https://tiles.openfreemap.org/styles/bright";

// A prior version stripped this down to land/water/borders and repainted them
// in the site's palette. That recolor pass kept landing on tones that matched
// the globe's own card background too closely and made the map disappear
// depending on which part of the world was in view — twice. Showing the style
// exactly as OpenFreeMap ships it removes that whole failure mode; it's a
// normal-looking map now; not custom-themed, but reliably visible.

/**
 * City labels are the one basemap text layer kept — they give a pin real
 * geographic context now that people are plotted at their actual city rather
 * than always their country's capital. Everything else the style draws text
 * for (country names, sea/ocean names, towns, villages, POIs, road shields)
 * is hidden: it only ever competed with our own pins rather than adding
 * anything. Matched by type rather than a hardcoded id list for the "hide"
 * side, since that list only ever grew; the "keep" list is deliberately a
 * short, explicit exception to it.
 */
const KEEP_LABEL_LAYERS = new Set(["label_city", "label_city_capital"]);

function hideBasemapLabels(map: maplibregl.Map) {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    if (layer.type !== "symbol") continue;
    if (KEEP_LABEL_LAYERS.has(layer.id)) continue;
    try {
      map.setLayoutProperty(layer.id, "visibility", "none");
    } catch {
      // Skip rather than let one unexpected layer abort the rest.
    }
  }
}

/** One pin's worth of people, all resolved to the same point. */
interface LocationGroup {
  lat: number;
  lng: number;
  /** Whichever country the point belongs to, for isHome/selection matching —
   * every person contributing to a group shares a city, so in practice they
   * share a country too. */
  country: string;
  /** Empty for a "someone lives here, but not visible to you" pin — the
   * count still shown in the sidebar, just no name attached on the map. */
  names: string[];
}

function formatNames(names: string[]): string | undefined {
  if (names.length === 0) return undefined;
  const shown = names.slice(0, MAX_NAMES_PER_MARKER).join(", ");
  const rest = names.length - MAX_NAMES_PER_MARKER;
  return rest > 0 ? `${shown} +${rest}` : shown;
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
    // Plain text, no background chip — just the name sitting on the map.
    const label = document.createElement("span");
    label.textContent = opts.names;
    label.className = "font-body italic whitespace-nowrap text-[11px] leading-tight";
    label.style.color = opts.isSelected ? GOLD_BRIGHT : INK_MUTED;
    el.appendChild(label);
  }

  return el;
}

/** Mutable, always-current snapshot of the props the map's event handlers need —
 * those handlers are created once (inside the mount effect) and would otherwise
 * close over stale props from whatever render happened to be current at mount. */
interface LiveProps {
  selectedCountry: string | null;
  onSelectCountry: (country: string | null) => void;
  locationGroups: LocationGroup[];
}

export function MapLibreGlobe({
  distribution,
  people,
  onSelectCountry,
  selectedCountry,
}: {
  /** Per-country totals, including people the viewer can't see by name — used
   * only to place an unnamed pin for a country that has family in it but no
   * one visible to name there. */
  distribution: CountryCount[];
  /** Only people whose current location the viewer is allowed to see — their
   * names are set beside their own city's pin, not just their country's. */
  people: Person[];
  onSelectCountry: (country: string | null) => void;
  selectedCountry: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const styleReadyRef = useRef(false);
  const imperativeRef = useRef<{ drawMarkers: () => void } | null>(null);

  const locationGroups = useMemo(() => {
    const groups = new Map<string, LocationGroup>();
    const keyFor = (lat: number, lng: number) => `${lat.toFixed(3)},${lng.toFixed(3)}`;

    for (const p of people) {
      if (!p.current_country) continue;
      // A geocoded city point if one was resolved when this person was saved,
      // else the country's capital — the only precision available before
      // per-person geocoding existed, and still the fallback when a district
      // wasn't given or couldn't be resolved.
      const point =
        p.current_lat != null && p.current_lng != null
          ? { lat: p.current_lat, lng: p.current_lng }
          : coordsForCountry(p.current_country);
      if (!point) continue;

      const key = keyFor(point.lat, point.lng);
      let group = groups.get(key);
      if (!group) {
        group = { lat: point.lat, lng: point.lng, country: p.current_country, names: [] };
        groups.set(key, group);
      }
      // Ism + familiya only here — the full three-part name (with patronymic)
      // is what personName() gives everywhere else, but next to a map pin
      // it's one name too many.
      group.names.push(personShortName(p));
    }

    // A country with family in it but nobody the viewer can see by name still
    // gets a pin — unnamed, at the country's capital — so its presence isn't
    // silently dropped just because no one in it is nameable here.
    const countriesAlreadyShown = new Set(people.map((p) => p.current_country).filter((c): c is string => !!c));
    for (const row of distribution) {
      if (countriesAlreadyShown.has(row.country)) continue;
      const point = coordsForCountry(row.country);
      if (!point) continue;
      const key = keyFor(point.lat, point.lng);
      if (!groups.has(key)) {
        groups.set(key, { lat: point.lat, lng: point.lng, country: row.country, names: [] });
      }
    }

    return Array.from(groups.values());
  }, [people, distribution]);

  const live = useRef<LiveProps>({ selectedCountry, onSelectCountry, locationGroups });
  // Refs can't be written during render (React flags it) — this keeps `live`
  // fresh after every render instead, which is still well before any event
  // handler below could read it.
  useEffect(() => {
    live.current = { selectedCountry, onSelectCountry, locationGroups };
  });

  // Mount: create the map once. Everything data-dependent is drawn imperatively
  // (via imperativeRef, reading `live`), so this effect never needs to re-run —
  // recreating a MapLibre map on every prop change would be far too heavy.
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [HOME_POINT.lng, 25],
      zoom: 1.2,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    function drawMarkers() {
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];

      for (const group of live.current.locationGroups) {
        const el = buildMarkerElement({
          isHome: isHomeCountry(group.country),
          isSelected: group.country === live.current.selectedCountry,
          names: formatNames(group.names),
        });
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const current = live.current.selectedCountry;
          live.current.onSelectCountry(current === group.country ? null : group.country);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([group.lng, group.lat])
          .addTo(map);
        markersRef.current.push(marker);
      }
    }

    imperativeRef.current = { drawMarkers };

    map.on("style.load", () => {
      hideBasemapLabels(map);
      // Globe at world view, easing flat as the country flyTo (zoom 3.2) is
      // approached. MapLibre calls this projection "vertical-perspective", not
      // "globe" (that's Mapbox's name for the equivalent). Must happen after
      // the style has loaded — MapLibre throws ("Style is not done loading")
      // if called any earlier, e.g. right after construction.
      map.setProjection({
        type: [
          "interpolate",
          ["linear"],
          ["zoom"],
          3,
          "vertical-perspective",
          6,
          "mercator",
        ] as unknown as maplibregl.ProjectionSpecification["type"],
      });
      styleReadyRef.current = true;
      drawMarkers();
    });

    // Slow autorotate on load, permanently stopped the moment the user takes
    // hold of it.
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

  // Redraw markers when the underlying data changes.
  useEffect(() => {
    if (!styleReadyRef.current) return;
    imperativeRef.current?.drawMarkers();
  }, [locationGroups]);

  // Fly to the picked country; redraw markers so the selected one's dot/label
  // restyles (their DOM elements don't otherwise know about selection). Flies
  // to the country's capital regardless of which of its cities are pinned —
  // picking one specific city to zoom to over another would be arbitrary when
  // a country has more than one.
  useEffect(() => {
    if (!styleReadyRef.current) return;
    imperativeRef.current?.drawMarkers();
    if (!selectedCountry) return;
    const coords = coordsForCountry(selectedCountry);
    if (!coords) return;
    mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 3.2, duration: 900 });
  }, [selectedCountry]);

  return <div ref={containerRef} className="aspect-square w-full overflow-hidden rounded-card" />;
}
