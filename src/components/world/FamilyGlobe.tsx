"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import type { GlobeMethods } from "react-globe.gl";
import { coordsForCountry, isHomeCountry } from "@/lib/reference/coordinates";

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

/** Longest a marker's name list gets before the rest collapse into a "+N" tail —
 * otherwise a city with a dozen relatives would sprawl across its neighbours. */

/** Natural Earth 110m country boundaries — a small (~480KB), public-domain,
 * static file, not a live service call: fetched once from this app's own
 * /public folder, same spirit as everything else in this globe (no account, no
 * key, nothing external at runtime). Sourced from react-globe.gl's own example
 * datasets, so the geometry is already known-good for the Polygons layer. */
const COUNTRIES_URL = "/globe/countries-110m.geojson";

/** Bar height range, as a fraction of the globe's radius. */
const MIN_BAR = 0.05;
const MAX_BAR = 0.34;

interface CountryBar {
  lat: number;
  lng: number;
  country: string;
  count: number;
  altitude: number;
}

/** The figure sitting on top of a bar. Just the number: the country name is
 * already in the sidebar list, and repeating it here crowded the globe as soon
 * as two countries sat near each other. */
function buildCountLabel(opts: { count: number; isSelected: boolean }): HTMLDivElement {
  const el = document.createElement("div");
  el.className =
    "cursor-pointer rounded-full px-1.5 py-0.5 font-display text-[11px] leading-none font-semibold";
  el.textContent = String(opts.count);
  el.style.color = opts.isSelected ? "#0d2350" : GOLD_BRIGHT;
  el.style.background = opts.isSelected ? GOLD_BRIGHT : "rgba(13,35,80,0.72)";
  el.style.border = `1px solid ${GOLD_BRIGHT}`;
  return el;
}

interface CountryFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
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
  onSelectCountry,
  selectedCountry,
}: {
  /** Per-country totals, counting people the viewer cannot see by name as well
   * — the globe draws one bar per country from this alone, so a country whose
   * residents are all masked still shows its true size. Naming who is there is
   * the sidebar's job, and it applies its own visibility rules. */
  distribution: CountryCount[];
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

  /**
   * One bar per country, height scaled by how many relatives live there.
   *
   * Deliberately country-level, where the markers this replaces were
   * city-level. A bar answers "how many of us are here" at a glance, which a
   * scatter of same-sized city dots never did. Exact cities are still recorded
   * per person and still shown on their profile — they just are not what this
   * view is for any more.
   *
   * Height is a square root, not linear. Linear against a maximum around 20
   * would leave a country holding one relative as a bar too short to see or
   * tap; sqrt keeps the smallest legible while the largest still reads as
   * clearly the biggest.
   *
   * Built from `distribution` rather than from `people`, so a country whose
   * residents are all privacy-masked still gets its bar and its true count —
   * the aggregate is visible even when no individual in it is.
   */
  const countryBars = useMemo(() => {
    const max = Math.max(1, ...distribution.map((d) => d.person_count));
    const bars: CountryBar[] = [];
    for (const row of distribution) {
      const point = coordsForCountry(row.country);
      if (!point) continue;
      bars.push({
        lat: point.lat,
        lng: point.lng,
        country: row.country,
        count: row.person_count,
        altitude: MIN_BAR + (MAX_BAR - MIN_BAR) * Math.sqrt(row.person_count / max),
      });
    }
    return bars;
  }, [distribution]);

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
          pointsData={countryBars}
          pointLat={(d: object) => (d as CountryBar).lat}
          pointLng={(d: object) => (d as CountryBar).lng}
          pointAltitude={(d: object) => (d as CountryBar).altitude}
          pointRadius={0.6}
          pointResolution={16}
          pointColor={(d: object) => {
            const bar = d as CountryBar;
            if (bar.country === selectedCountry) return GOLD_BRIGHT;
            return isHomeCountry(bar.country) ? GOLD_BRIGHT : GOLD;
          }}
          onPointClick={(d: object) => {
            const bar = d as CountryBar;
            onSelectCountry(selectedCountry === bar.country ? null : bar.country);
          }}
          // The count rides above its own bar. A hover tooltip would be no use
          // here: this is read on phones, where there is no hover, and the
          // number is the whole point of drawing the bar.
          htmlElementsData={countryBars}
          htmlLat={(d: object) => (d as CountryBar).lat}
          htmlLng={(d: object) => (d as CountryBar).lng}
          htmlAltitude={(d: object) => (d as CountryBar).altitude + 0.03}
          htmlElement={(d: object) => {
            const bar = d as CountryBar;
            const el = buildCountLabel({
              count: bar.count,
              isSelected: bar.country === selectedCountry,
            });
            // react-globe.gl attaches no behaviour of its own to an html
            // element, so the same toggle-select the bar has is bound here too
            // — the label is the easier tap target of the two.
            el.addEventListener("click", (e) => {
              e.stopPropagation();
              onSelectCountry(selectedCountry === bar.country ? null : bar.country);
            });
            return el;
          }}
        />
      )}
    </div>
  );
}
