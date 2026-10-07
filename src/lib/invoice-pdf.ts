"use client";

/**
 * Download an invoice as a PDF that looks exactly like the printed document.
 *
 * The invoice is rendered from its own DOM — the same markup and stylesheet the
 * print path uses — rather than re-drawn with PDF primitives, which is the only
 * way to keep the two in step (typeface, the rupee sign, the status pill,
 * spacing). The rendered page is then placed on A4 sheets with the same 14mm
 * margin the print stylesheet asks for.
 *
 * Both libraries are imported on demand: nothing is downloaded until an admin
 * actually asks for a PDF.
 */

/** A4 in points, and the print stylesheet's 14mm page margin. */
const PAGE_WIDTH_PT = 595.28;
const PAGE_HEIGHT_PT = 841.89;
const MM_TO_PT = 2.834_645_7;
const MARGIN_PT = 14 * MM_TO_PT;
const CONTENT_WIDTH_PT = PAGE_WIDTH_PT - MARGIN_PT * 2;
const CONTENT_HEIGHT_PT = PAGE_HEIGHT_PT - MARGIN_PT * 2;

/** The document is max-w-2xl (672px); the padding matches the print window. */
const PADDING_PX = 24;
const RENDER_WIDTH_PX = 672 + PADDING_PX * 2;

/** Browsers refuse canvases past ~16k px on the long edge. */
const MAX_CANVAS_PX = 16_000;
/** Target ~300 DPI for crisp small text. */
const TARGET_SCALE = 3;

function sliceCanvas(
  source: HTMLCanvasElement,
  startY: number,
  height: number,
): HTMLCanvasElement {
  const slice = document.createElement("canvas");
  slice.width = source.width;
  slice.height = height;
  const ctx = slice.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(
      source,
      0,
      startY,
      source.width,
      height,
      0,
      0,
      source.width,
      height,
    );
  }
  return slice;
}

/**
 * @param element the rendered invoice document (the print root)
 * @param filename base name for the download, without the extension
 */
export async function downloadInvoicePdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  // Render a copy at a fixed width, off-screen: the on-screen copy lives in a
  // scrolling dialog whose size would otherwise leak into the PDF.
  const holder = document.createElement("div");
  holder.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${RENDER_WIDTH_PX}px`,
    `padding:${PADDING_PX}px`,
    "box-sizing:border-box",
    "background:#ffffff",
  ].join(";");
  const clone = element.cloneNode(true) as HTMLElement;
  clone.removeAttribute("data-print-root");
  holder.appendChild(clone);
  document.body.appendChild(holder);

  let canvas: HTMLCanvasElement;
  try {
    // Wait for webfonts, or the snapshot falls back to a system face.
    if (document.fonts?.ready) await document.fonts.ready;
    const cssHeight = holder.scrollHeight;
    const scale = Math.max(
      1,
      Math.min(TARGET_SCALE, MAX_CANVAS_PX / Math.max(cssHeight, 1)),
    );
    canvas = await html2canvas(holder, {
      scale,
      backgroundColor: "#ffffff",
      logging: false,
    });
  } finally {
    holder.remove();
  }

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const imageWidthPt = CONTENT_WIDTH_PT;
  const pxPerPt = canvas.width / imageWidthPt;
  const pageHeightPx = Math.floor(CONTENT_HEIGHT_PT * pxPerPt);

  let offsetPx = 0;
  let page = 0;
  while (offsetPx < canvas.height) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - offsetPx);
    const slice = sliceCanvas(canvas, offsetPx, sliceHeightPx);
    if (page > 0) pdf.addPage();
    // JPEG, not PNG: jsPDF re-encodes PNG data uncompressed, which turned a
    // 400 kB page into a 12 MB file. At ~300 DPI the JPEG artefacts are far
    // below what a printer resolves.
    pdf.addImage(
      slice.toDataURL("image/jpeg", 0.95),
      "JPEG",
      MARGIN_PT,
      MARGIN_PT,
      imageWidthPt,
      sliceHeightPx / pxPerPt,
    );
    offsetPx += sliceHeightPx;
    page += 1;
  }

  pdf.save(`${filename}.pdf`);
}
