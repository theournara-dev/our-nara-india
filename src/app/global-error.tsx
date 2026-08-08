"use client";

/** Root error boundary — only rendered when an error escapes the root layout,
 *  so it must provide its own <html>/<body> (the layout is not mounted). */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  if (process.env.NODE_ENV === "development") {
    console.error("Global error:", error);
  }

  return (
    <html lang="en">
      <body
        style={{ margin: 0, background: "#ffffff", fontFamily: "sans-serif" }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#a1a1aa",
            }}
          >
            Oops
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "34px",
              fontWeight: 600,
              color: "#18181b",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ margin: 0, maxWidth: "420px", color: "#52525b" }}>
            We couldn’t load this page. Please try again, or go back to the home
            page.
          </p>
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              onClick={reset}
              style={{
                padding: "10px 20px",
                borderRadius: "999px",
                border: "none",
                background: "#18181b",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Try again
            </button>
            {/* global-error renders outside the root layout, so a plain anchor
                (full page reload) is more reliable than next/link here. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: "10px 20px",
                borderRadius: "999px",
                border: "1px solid #d4d4d8",
                background: "#fff",
                color: "#18181b",
                cursor: "pointer",
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Back to home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
