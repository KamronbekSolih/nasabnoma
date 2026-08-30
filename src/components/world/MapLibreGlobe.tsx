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
 * otherwise a country with a dozen relatives would sprawl across its neighbours. */
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
 * Hides every text/icon label the basemap draws — country names, sea and
 * ocean names, city/town/POI labels, road shields — leaving only our own gold
 * pins and name labels. Started as just the three country-name layers, then
 * grew to "all of it" once it was clear the basemap's own labels were always
 * going to compete with ours rather than add anything: a city label sitting
 * under one of our pins doesn't clarify who's there, it just clutters. Matched
 * by type rather than a hardcoded id list, since that list only ever grew.
 */
function hideBasemapLabels(map: maplibregl.Map) {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    if (layer.type !== "symbol") continue;
    try {
      map.setLayoutProperty(layer.id, "visibility", "none");
    } catch {
      // Skip rather than let one unexpected layer abort the rest.
    }
  }
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
  distribution: CountryCount[];
  selectedCountry: string | null;
  onSelectCountry: (country: string | null) => void;
  namesByCountry: Map<string, string[]>;
}

export function MapLibreGlobe({
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
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const styleReadyRef = useRef(false);
  const imperativeRef = useRef<{ drawMarkers: () => void } | null>(null);

  const namesByCountry = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of people) {
      if (!p.current_country) continue;
      const list = map.get(p.current_country);
      // Ism + familiya only here — the full three-part name (with patronymic)
      // is what personName() gives everywhere else, but next to a map pin it's
      // one name too many.
      if (list) list.push(personShortName(p));
      else map.set(p.current_country, [personShortName(p)]);
    }
    return map;
  }, [people]);

  const live = useRef<LiveProps>({ distribution, selectedCountry, onSelectCountry, namesByCountry });
  // Refs can't be written during render (React flags it) — this keeps `live`
  // fresh after every render instead, which is still well before any event
  // handler below could read it.
  useEffect(() => {
    live.current = { distribution, selectedCountry, onSelectCountry, namesByCountry };
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
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([coords.lng, coords.lat])
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
  }, [distribution, namesByCountry]);

  // Fly to the picked country; redraw markers so the selected one's dot/label
  // restyles (their DOM elements don't otherwise know about selection).
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
