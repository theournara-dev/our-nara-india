import Link from "next/link";
import {
  InvoicesTable,
  type InvoiceRow,
} from "@/components/admin/invoice-table";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ version?: string }>;

/** Customer name from the order's shipping Json (falls back like the emails). */
function customerName(shipping: unknown): string {
  if (shipping && typeof shipping === "object") {
    const name = (shipping as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return "—";
}

/** Issued invoices, newest first, with a local/global store filter. */
export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  // Validated against the known values — an arbitrary ?version= would make
  // Prisma throw and crash the page.
  const version =
    params.version === "local" || params.version === "global"
      ? params.version
      : "";

  const invoices = await db.invoice.findMany({
    where: version ? { order: { siteVersion: version } } : undefined,
    orderBy: { issuedAt: "desc" },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          email: true,
          status: true,
          currency: true,
          totalCents: true,
          shipping: true,
        },
      },
    },
  });

  const rows: InvoiceRow[] = invoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    issuedAt: invoice.issuedAt.toISOString(),
    orderId: invoice.order.id,
    orderNumber: invoice.order.orderNumber,
    customerName: customerName(invoice.order.shipping),
    email: invoice.order.email,
    status: invoice.order.status,
    currency: invoice.order.currency,
    totalCents: invoice.order.totalCents,
  }));

  function href(next: string | undefined) {
    return next ? `/admin/invoices?version=${next}` : "/admin/invoices";
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Invoices</h1>
        <p className="text-sm text-zinc-500">
          {rows.length} invoice{rows.length === 1 ? "" : "s"}. Each is issued
          automatically when an order is confirmed; the document always reflects
          the order&apos;s current state.
        </p>
      </div>

      {/* Store-version filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
          Store
        </span>
        {(
          [
            { value: "", label: "All stores" },
            { value: "local", label: "Local (India)" },
            { value: "global", label: "Global" },
          ] as const
        ).map((opt) => (
          <Link
            key={opt.value || "all"}
            href={href(opt.value || undefined)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              version === opt.value
                ? "bg-point-500 text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      <InvoicesTable rows={rows} />
    </div>
  );
}
