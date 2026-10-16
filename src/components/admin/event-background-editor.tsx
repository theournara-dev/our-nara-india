"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  EVENT_BACKGROUND_DEFAULT,
  EVENT_CARD_RADIUS,
  EVENT_CARD_REFERENCE_WIDTH,
  EVENT_ZOOM_MAX,
  EVENT_ZOOM_MIN,
  eventBackground,
  eventCardPreviewScale,
  nudgeFocus,
  type EventBackground,
} from "@/lib/event-background";

const sliderCls =
  "w-full cursor-pointer accent-point-500 disabled:cursor-not-allowed disabled:opacity-40";

/**
 * The background-image tools for one event card (client's slide 6): the card
 * itself — the shared `EventCardView`, drawn at the 600px box /event's grid
 * gives it and scaled down to fit the panel, so the corner, the type and the
 * crop are the page's own — with the artwork dragged into place and a zoom.
 *
 * Dragging moves the focus over the card's full range whatever the panel's
 * scale, which is also what the sliders set, so mouse, touch and keyboard all
 * land on the same framing.
 */
export function EventBackgroundEditor({
  value,
  onChange,
  disabled,
  children,
}: {
  value: EventBackground;
  onChange: (next: Partial<EventBackground>) => void;
  /** True while the card has no artwork: there is nothing to frame yet. */
  disabled?: boolean;
  /** The card to frame, already carrying the current value. */
  children: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState<number | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    focusX: number;
    focusY: number;
  } | null>(null);
  const bg = eventBackground(value);
  // Until the panel is measured the card is drawn hidden, so a first frame can
  // never show the wrong scale.
  const measured = panelWidth !== null;
  const scale = measured ? eventCardPreviewScale(panelWidth) : 1;
  const framed = !disabled;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setPanelWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /** The pointer's travel as a focus change, in the card's own pixels. */
  function focusFrom(
    clientX: number,
    clientY: number,
  ): Partial<EventBackground> {
    const start = drag.current;
    if (!start) return {};
    const s = scale || 1;
    return {
      focusX: nudgeFocus(start.focusX, (clientX - start.x) / s),
      focusY: nudgeFocus(start.focusY, (clientY - start.y) / s),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!framed || e.button !== 0) return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      focusX: bg.focusX,
      focusY: bg.focusY,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const next = focusFrom(e.clientX, e.clientY);
    if (
      drag.current &&
      (next.focusX !== undefined || next.focusY !== undefined)
    )
      onChange(next);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return (
    <div>
      <div
        ref={wrapRef}
        role="img"
        aria-label={
          framed
            ? "Event card preview — drag to move the background image"
            : "Event card preview"
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative w-full overflow-hidden bg-zinc-100 ${
          framed ? "cursor-grab touch-none active:cursor-grabbing" : ""
        }`}
        style={{
          maxWidth: EVENT_CARD_REFERENCE_WIDTH,
          aspectRatio: "1 / 1",
          // The card's own corner, at this panel's scale: a corner measured in
          // the panel's pixels alone would read rounder than the page's.
          borderRadius: EVENT_CARD_RADIUS * scale,
        }}
      >
        <div
          // The card is the page's own, so nothing inside it may navigate or
          // swallow the drag.
          className="pointer-events-none absolute left-0 top-0"
          style={{
            width: EVENT_CARD_REFERENCE_WIDTH,
            height: EVENT_CARD_REFERENCE_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            visibility: measured ? undefined : "hidden",
          }}
        >
          {children}
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-zinc-500">
            Background framing
          </span>
          <button
            type="button"
            onClick={() => onChange({ ...EVENT_BACKGROUND_DEFAULT })}
            disabled={!framed}
            className="text-xs text-point-500 hover:underline disabled:cursor-not-allowed disabled:text-zinc-300"
          >
            Reset framing
          </button>
        </div>

        <label className="block">
          <span className="flex items-center justify-between text-xs text-zinc-500">
            <span>Horizontal</span>
            <span className="tabular-nums text-zinc-400">{bg.focusX}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={bg.focusX}
            disabled={!framed}
            onChange={(e) => onChange({ focusX: Number(e.target.value) })}
            aria-label="Background image horizontal position"
            className={sliderCls}
          />
        </label>

        <label className="block">
          <span className="flex items-center justify-between text-xs text-zinc-500">
            <span>Vertical</span>
            <span className="tabular-nums text-zinc-400">{bg.focusY}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={bg.focusY}
            disabled={!framed}
            onChange={(e) => onChange({ focusY: Number(e.target.value) })}
            aria-label="Background image vertical position"
            className={sliderCls}
          />
        </label>

        <label className="block">
          <span className="flex items-center justify-between text-xs text-zinc-500">
            <span>Zoom</span>
            <span className="tabular-nums text-zinc-400">{bg.zoom}%</span>
          </span>
          <input
            type="range"
            min={EVENT_ZOOM_MIN}
            max={EVENT_ZOOM_MAX}
            step={5}
            value={bg.zoom}
            disabled={!framed}
            onChange={(e) => onChange({ zoom: Number(e.target.value) })}
            aria-label="Background image zoom"
            className={sliderCls}
          />
        </label>
      </div>

      <p className="mt-2 text-xs text-zinc-400">
        {framed
          ? "Drag the card to choose which part of the artwork shows, or use the sliders. The image always covers the whole card, and /event renders this exact framing."
          : "Upload a background image to frame it here. The card renders on the colour above until then."}
      </p>
    </div>
  );
}
