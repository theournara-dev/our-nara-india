import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AccountOrderCard, type AccountOrder } from "./order-card";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default async function AccountOrdersPage() {
  // The layout already guards the session; re-check here so the page can't
  // render without one (same corrupt-cookie handling as the layout).
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    session = null;
  }
  if (!session) redirect("/login?session=expired");

  // Orders placed while signed in carry the userId; guest checkouts made with
  // the same email (stored lowercased at creation) belong to the customer too.
  const orders = await db.order.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { email: session.user.email.toLowerCase() },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: { orderBy: { id: "asc" } },
      payments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          provider: true,
          status: true,
          amountCents: true,
          currency: true,
          providerRef: true,
          createdAt: true,
        },
      },
      shipments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          waybill: true,
          status: true,
          providerStatus: true,
          createdAt: true,
        },
      },
    },
  });

  // Preformat dates on the server so the client card never re-formats (no
  // timezone/locale hydration mismatches).
  const data: AccountOrder[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    isPreOrder: o.isPreOrder,
    subtotalCents: o.subtotalCents,
    shippingCents: o.shippingCents,
    discountCents: o.discountCents,
    totalCents: o.totalCents,
    currency: o.currency,
    placedAt: formatDate(o.createdAt),
    items: o.items.map((i) => ({
      id: i.id,
      name: i.name,
      optionValue: i.optionValue,
      sku: i.sku,
      priceCents: i.priceCents,
      quantity: i.quantity,
      currency: i.currency,
    })),
    payments: o.payments.map((p) => ({
      id: p.id,
      provider: p.provider,
      status: p.status,
      amountCents: p.amountCents,
      currency: p.currency,
      providerRef: p.providerRef,
      createdAt: formatDateTime(p.createdAt),
    })),
    shipments: o.shipments.map((s) => ({
      id: s.id,
      waybill: s.waybill,
      status: s.status,
      providerStatus: s.providerStatus,
      createdAt: formatDate(s.createdAt),
    })),
    shipping: (o.shipping as AccountOrder["shipping"]) ?? null,
  }));

  return (
    <div className="min-w-0">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Orders</h1>
      {data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center">
          <p className="text-sm text-zinc-500">You have no orders yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((order) => (
            <AccountOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
