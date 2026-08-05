import { Container } from "@/components/ui/container";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}

/** Standard header used on interior/content pages. */
export function PageHeader({ eyebrow, title, subtitle, className }: PageHeaderProps) {
  return (
    <Container className={`py-10 text-center ${className ?? ""}`}>
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">{eyebrow}</p>
      )}
      <h1 className="font-display text-3xl font-semibold text-zinc-900 sm:text-4xl">{title}</h1>
      {subtitle && <p className="mx-auto mt-3 max-w-2xl text-zinc-600">{subtitle}</p>}
    </Container>
  );
}
