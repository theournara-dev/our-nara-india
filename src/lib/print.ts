"use client";

/**
 * Print a single element on its own page.
 *
 * Printing the dialog in place would drag the admin chrome (sidebar, header,
 * backdrop) onto the paper, so the element is re-rendered into a blank window
 * with the app's stylesheets copied across. Returns false when the browser
 * blocks the popup, so the caller can fall back to `window.print()` — the
 * `@media print` rules in globals.css hide everything but `[data-print-root]`.
 */
export function printElement(element: HTMLElement): boolean {
  const win = window.open("", "_blank", "width=1024,height=1200");
  if (!win) return false;

  const styles = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style'),
  )
    .map((el) => el.outerHTML)
    .join("\n");

  win.document.write(
    `<!DOCTYPE html><html class="${document.documentElement.className}"><head>` +
      `<meta charset="utf-8"><title>Invoice</title>${styles}</head>` +
      `<body class="bg-white p-8 text-zinc-900">${element.outerHTML}</body></html>`,
  );
  win.document.close();

  const print = () => {
    win.focus();
    win.print();
  };
  // Styles (and any webfont) need a moment before the snapshot is taken.
  if (win.document.readyState === "complete") {
    window.setTimeout(print, 300);
  } else {
    win.addEventListener("load", () => window.setTimeout(print, 300));
  }
  return true;
}
