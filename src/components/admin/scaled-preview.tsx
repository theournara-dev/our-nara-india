"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A block of the storefront drawn at the size the page gives it, then scaled
 * down to fit an admin panel. Scaling the whole picture — rather than redrawing
 * the block at the panel's own width — is what keeps its height, its crop and
 * any corner proportional to the page, which is the difference between a preview
 * an editor can trust and one that flatters the design.
 *
 * `children` should be the storefront's own component, so the preview cannot
 * drift from it.
 */
export function ScaledPreview({
  referenceWidth,
  referenceHeight,
  children,
}: {
  /** The width the page draws the block at, in pixels. */
  referenceWidth: number;
  /** The height the page draws it at, in pixels. */
  referenceHeight: number;
  children: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState<number | null>(null);
  // Until the panel is measured the picture stays hidden, so a first frame can
  // never show it at the wrong scale.
  const measured = panelWidth !== null;
  const scale = measured ? Math.min(1, panelWidth / referenceWidth) : 1;

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setPanelWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      className="w-full overflow-hidden bg-zinc-100"
      style={{ height: referenceHeight * scale }}
    >
      <div
        style={{
          width: referenceWidth,
          height: referenceHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          visibility: measured ? undefined : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
