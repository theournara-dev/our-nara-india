"use client";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/** App-level error boundary. Replaces the bare "This page couldn't load"
 *  screen with a branded page and a recovery action. Rendered inside the root
 *  layout (Header/Footer still visible). */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Only log to the console in development; avoid leaking error internals to
  // end users in production.
  if (process.env.NODE_ENV === "development") {
    console.error("Page error:", error);
  }

  return (
    <Container className="flex flex-col items-center justify-center gap-4 py-28 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-zinc-400">
        Oops
      </p>
      <h1 className="font-display text-4xl font-semibold text-zinc-900">
        Something went wrong
      </h1>
      <p className="max-w-md text-zinc-600">
        We couldn’t load this page. It’s likely a temporary issue — please try
        again.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} variant="primary">
          Try again
        </Button>
        <Button href="/" variant="outline">
          Back to home
        </Button>
      </div>
    </Container>
  );
}
