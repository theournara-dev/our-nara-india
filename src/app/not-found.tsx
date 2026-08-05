import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center justify-center gap-4 py-28 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-zinc-400">
        404
      </p>
      <h1 className="font-display text-4xl font-semibold text-zinc-900">
        Page not found
      </h1>
      <p className="max-w-md text-zinc-600">
        The page you’re looking for doesn’t exist or has moved.
      </p>
      <Button href="/" variant="outline">
        Back to home
      </Button>
    </Container>
  );
}
