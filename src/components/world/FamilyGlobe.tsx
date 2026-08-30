"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { GlobeMethods } from "react-globe.gl";
import { coordsForCountry, isHomeCountry } from "@/lib/reference/coordinates";
import { personShortName } from "@/lib/people";
import type { Person } from "@/lib/types";

// three.js is large and touches `window` at import time, so the globe is loaded
// only in the browser and only when this section is actually opened — it never
// enters the bundle for the tree or profile pages.
const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => <GlobePlaceholder />,
});

export interface CountryCount {
  country: string;
  person_count: number;
}

const GOLD = "#b0812f"; // --color-brand
const GOLD_BRIGHT = "#d9a94f"; // --color-brand-line
const LAND = "#e9e6d7"; // --color-paper-deep
const OCEAN = "#b7c0d1"; // --color-line-strong — a cool blue-grey reads as water
// far more clearly than another shade of cream would; land/ocean/card are all
// deliberately three genuinely different tones, not tonal variations of one
// palette that could end up matching each other by accident (that exact mistake
// broke the World map's Mapbox/MapLibre predecessor twice).
const INK_MUTED = "#4d5a78"; // --color-ink-muted

/** Longest a marker's name list gets before the rest collapse into a "+N" tail —
 * otherwise a city with a dozen relatives would sprawl across its neighbours. */
const MAX_NAMES_PER_MARKER = 3;

/** Natural Earth 110m country boundaries — a small (~480KB), public-domain,
 * static file, not a live service call: fetched once from this app's own
 * /public folder, same spirit as everything else in this globe (no account, no
 * key, nothing external at runtime). Sourced from react-globe.gl's own example
 * datasets, so the geometry is already known-good for the Polygons layer. */
const COUNTRIES_URL = "/globe/countries-110m.geojson";

interface CountryFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

/** One pin's worth of people, all resolved to the same point. */
interface LocationGroup {
  lat: number;
  lng: number;
  /** Whichever country the point belongs to, for isHome/selection matching —
   * every person contributing to a group shares a city, so in practice they
   * share a country too. */
  country: string;
  /** Empty for a "someone lives here, but not visible to you" pin — the count
   * still shown in the sidebar, just no name attached on the map. */
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

function GlobePlaceholder() {
  return (
    <div className="flex aspect-square w-full items-center justify-center">
      <p className="text-sm text-ink-faint">Xarita yuklanmoqda...</p>
    </div>
  );
}

export function FamilyGlobe({
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
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  const [countries, setCountries] = useState<CountryFeature[]>([]);

  // The globe needs explicit pixel dimensions; it can't size itself from CSS.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize(Math.round(entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(COUNTRIES_URL)
      .then((res) => res.json())
      .then((geojson: { features: CountryFeature[] }) => {
        if (!cancelled) setCountries(geojson.features);
      })
      .catch(() => {
        // Borders are decorative on top of the coloured sphere, not load-bearing
        // — an unreachable/blocked static file just means a plain ocean sphere
        // with pins, not a broken globe.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A solid material rather than an image texture: the old version of this
  // globe wrapped a photographic earth texture recoloured pixel-by-pixel by
  // luminance, which only ever encoded land-vs-ocean shape, never country
  // boundaries. Filling the sphere itself with the ocean tone and drawing land
  // as coloured, gold-stroked country polygons on top gives exact colour
  // control *and* real borders from the same data, instead of two unrelated
  // approaches bolted together.
  const globeMaterial = useMemo(
    () => new THREE.MeshPhongMaterial({ color: new THREE.Color(OCEAN) }),
    [],
  );

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

  // Rotate slowly on load, and stop once the user takes hold of it.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !size) return;
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableZoom = false;
    globe.pointOfView({ lat: 30, lng: 60, altitude: 2.4 }, 0);

    const stop = () => {
      controls.autoRotate = false;
    };
    const el = wrapperRef.current;
    el?.addEventListener("pointerdown", stop);
    return () => el?.removeEventListener("pointerdown", stop);
  }, [size]);

  // Fly to a country when it's picked from the list beside the globe.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !selectedCountry) return;
    const coords = coordsForCountry(selectedCountry);
    if (!coords) return;
    globe.controls().autoRotate = false;
    globe.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.9 }, 900);
  }, [selectedCountry]);

  return (
    <div ref={wrapperRef} className="w-full">
      {size > 0 && (
        <Globe
          ref={globeRef}
          width={size}
          height={size}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={globeMaterial}
          showAtmosphere
          atmosphereColor={GOLD}
          atmosphereAltitude={0.16}
          polygonsData={countries}
          polygonCapColor={() => LAND}
          polygonSideColor={() => LAND}
          polygonStrokeColor={() => GOLD}
          polygonAltitude={0.006}
          htmlElementsData={locationGroups}
          htmlLat={(d: object) => (d as LocationGroup).lat}
          htmlLng={(d: object) => (d as LocationGroup).lng}
          htmlAltitude={0.01}
          htmlElement={(d: object) => {
            const group = d as LocationGroup;
            const el = buildMarkerElement({
              isHome: isHomeCountry(group.country),
              isSelected: group.country === selectedCountry,
              names: formatNames(group.names),
            });
            // htmlElement only ever builds the node; react-globe.gl doesn't
            // attach any behaviour of its own, so the click handler is bound
            // here, once, at creation time — same country toggle-select as
            // the sidebar list.
            el.addEventListener("click", (e) => {
              e.stopPropagation();
              onSelectCountry(selectedCountry === group.country ? null : group.country);
            });
            return el;
          }}
        />
      )}
    </div>
  );
}
