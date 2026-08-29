"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 0.25;
const MAX_SCALE = 2;

/**
 * Pan/zoom surface for the tree.
 *
 * The tree used to sit in a plain scrolling div, which stops working somewhere
 * around twenty people — you cannot see a whole generation and a branch at once.
 * This gives drag-to-pan, wheel/pinch zoom and a fit-to-screen control, which is
 * how every genealogy viewer behaves.
 *
 * The transform is applied to a single wrapper rather than to each node, so panning
 * stays cheap no matter how many people are drawn.
 */
export function TreeCanvas({
  children,
  contentKey,
}: {
  children: React.ReactNode;
  /** Changing this refits the view — used when the tree's root changes. */
  contentKey: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const cw = content.scrollWidth;
    const ch = content.scrollHeight;
    if (!cw || !ch) return;

    const pad = 48;
    const next = Math.min(
      1,
      Math.max(
        MIN_SCALE,
        Math.min((viewport.clientWidth - pad) / cw, (viewport.clientHeight - pad) / ch),
      ),
    );
    setScale(next);
    setOffset({
      x: (viewport.clientWidth - cw * next) / 2,
      y: (viewport.clientHeight - ch * next) / 2,
    });
  }, []);

  // Refit whenever the rendered tree changes shape.
  useEffect(() => {
    const id = requestAnimationFrame(fitToView);
    return () => cancelAnimationFrame(id);
  }, [contentKey, fitToView]);

  const zoomBy = useCallback((factor: number, originX?: number, originY?: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const px = originX ?? rect.width / 2;
    const py = originY ?? rect.height / 2;

    setScale((prev) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * factor));
      // Keep the point under the cursor fixed while scaling.
      setOffset((o) => ({
        x: px - ((px - o.x) * next) / prev,
        y: py - ((py - o.y) * next) / prev,
      }));
      return next;
    });
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // Registered natively rather than via onWheel: React attaches passive wheel
    // listeners, which cannot call preventDefault to stop the page scrolling.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  function handlePointerDown(e: React.PointerEvent) {
    // Let clicks on cards through; only blank canvas starts a drag.
    if ((e.target as HTMLElement).closest("[data-tree-node]")) return;
    dragState.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const start = dragState.current;
    if (!start) return;
    setOffset({ x: start.ox + (e.clientX - start.x), y: start.oy + (e.clientY - start.y) });
  }

  function handlePointerUp(e: React.PointerEvent) {
    dragState.current = null;
    setDragging(false);
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`girih-field h-full w-full touch-none ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div
          ref={contentRef}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
          }}
          className="inline-block will-change-transform"
        >
          {children}
        </div>
      </div>

      <div className="absolute right-3 bottom-3 flex flex-col gap-1 rounded-lg border border-line-strong bg-surface/95 p-1 shadow-sm backdrop-blur">
        <CanvasButton label="Kattalashtirish" onClick={() => zoomBy(1.2)}>
          +
        </CanvasButton>
        <CanvasButton label="Kichraytirish" onClick={() => zoomBy(1 / 1.2)}>
          −
        </CanvasButton>
        <CanvasButton label="Ekranga moslash" onClick={fitToView}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </CanvasButton>
      </div>
    </div>
  );
}

function CanvasButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-md text-lg leading-none text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink"
    >
      {children}
    </button>
  );
}
