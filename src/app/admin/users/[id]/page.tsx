import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoicePreviewButton } from "@/components/admin/invoice-preview";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { orderAccountWhere } from "@/lib/order-ownership";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  type OrderStatusValue,
} from "@/lib/order-status";
import { RoleBadge } from "../role-badge";
import { UserAccess } from "../user-access";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-900">{value}</dd>
    </div>
  );
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      username: true,
      role: true,
      banned: true,
      banReason: true,
      banExpires: true,
      permissions: true,
      firstName: true,
      lastName: true,
      country: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postal: true,
      telephoneCode: true,
      telephone: true,
      mobileCode: true,
      mobile: true,
      createdAt: true,
    },
  });
  if (!user) notFound();

  // Same ownership rule as the customer account: orders placed signed-in plus
  // guest orders made with this email.
  const accountWhere = orderAccountWhere(user);

  const [orders, lifetime, wishlist] = await Promise.all([
    db.order.findMany({
      where: accountWhere,
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        status: true,
        totalCents: true,
        currency: true,
        isPreOrder: true,
        invoice: { select: { number: true } },
      },
    }),
    db.order.aggregate({
      where: accountWhere,
      _count: true,
      _sum: { totalCents: true },
    }),
    db.wishlistItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { productId: true, createdAt: true },
    }),
  ]);

  const productIds = wishlist.map((row) => row.productId);
  const products = productIds.length
    ? await db.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          slug: true,
          priceCents: true,
          currency: true,
          images: true,
        },
      })
    : [];
  const productById = new Map(products.map((p) => [p.id, p]));

  const address = [
    user.addressLine1,
    user.addressLine2,
    [user.city, user.state, user.postal].filter(Boolean).join(", "),
    user.country,
  ]
    .filter(Boolean)
    .join("\n");

  const telephone = user.telephone
    ? `${user.telephoneCode ?? ""}${user.telephone}`
    : "";
  const mobile = user.mobile ? `${user.mobileCode ?? ""}${user.mobile}` : "";
  const lifetimeCents = lifetime._sum.totalCents ?? 0;

  return (
    <div>
      <Link
        href="/admin/users"
        className="mb-4 inline-flex text-sm text-zinc-500 transition-colors hover:text-point-500"
      >
        ← Back to users
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {user.name || "Unnamed user"}
        </h1>
        <RoleBadge role={user.role} />
        {user.banned && (
          <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
            Blocked
          </span>
        )}
      </div>
      <p className="mb-6 -mt-4 text-sm text-zinc-500">{user.email}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-100 bg-white p-5">
          <h2 className="mb-2 font-semibold text-zinc-900">Customer details</h2>
          <dl className="divide-y divide-zinc-50">
            <Detail label="Member since" value={formatDate(user.createdAt)} />
            <Detail label="Username" value={user.username ? `@${user.username}` : "Not provided"} />
            <Detail
              label="Email"
              value={`${user.email}${user.emailVerified ? " (verified)" : " (unverified)"}`}
            />
            <Detail label="Contact name" value={
              [user.firstName, user.lastName].filter(Boolean).join(" ") ||
              "Not provided"
            } />
            <Detail label="Telephone" value={telephone || "Not provided"} />
            <Detail label="Mobile" value={mobile || "Not provided"} />
            <Detail
              label="Address"
              value={address || "Not provided"}
            />
            {user.banned && (
              <Detail
                label="Blocked"
                value={`${user.banReason ?? "No reason given"}${
                  user.banExpires
                    ? ` (until ${formatDate(user.banExpires)})`
                    : ""
                }`}
              />
            )}
          </dl>
        </section>

        <section>
          <UserAccess user={user} />
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-zinc-100 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-zinc-900">Purchases</h2>
          <p className="text-sm text-zinc-500">
            {lifetime._count} order{lifetime._count === 1 ? "" : "s"} ·{" "}
            {formatMoney(lifetimeCents, "INR", { convert: false })} lifetime
          </p>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-zinc-500">No purchases yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-2 py-2 font-medium">Order</th>
                    <th className="px-2 py-2 font-medium">Date</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 text-right font-medium">Invoice</th>
                    <th className="px-2 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-zinc-50 last:border-0"
                    >
                      <td className="px-2 py-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-medium text-zinc-900 transition-colors hover:text-point-500"
                        >
                          {order.orderNumber}
                        </Link>
                        {order.isPreOrder && (
                          <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                            Pre-order
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-zinc-500">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            ORDER_STATUS_STYLES[order.status as OrderStatusValue]
                          }`}
                        >
                          {ORDER_STATUS_LABELS[order.status as OrderStatusValue]}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        {order.invoice ? (
                          <InvoicePreviewButton
                            orderId={order.id}
                            orderNumber={order.orderNumber}
                          />
                        ) : (
                          <span className="text-xs text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-zinc-900">
                        {formatMoney(order.totalCents, order.currency, {
                          convert: false,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              Showing latest {orders.length} of {lifetime._count}
            </p>
          </>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-zinc-100 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-zinc-900">Wishlist</h2>
          <p className="text-sm text-zinc-500">
            {wishlist.length} saved product{wishlist.length === 1 ? "" : "s"}
          </p>
        </div>
        {wishlist.length === 0 ? (
          <p className="text-sm text-zinc-500">No saved products.</p>
        ) : (
          <ul className="divide-y divide-zinc-50">
            {wishlist.map((row) => {
              const product = productById.get(row.productId);
              return (
                <li
                  key={row.productId}
                  className="flex items-center gap-3 py-2"
                >
                  {product?.images[0] ? (
                    <Image
                      src={product.images[0]}
                      alt=""
                      width={40}
                      height={40}
                      unoptimized
                      className="h-10 w-10 rounded border border-zinc-200 object-cover"
                    />
                  ) : (
                    <span className="h-10 w-10 rounded bg-zinc-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    {product ? (
                      <Link
                        href={`/products/${product.slug}`}
                        className="truncate text-sm font-medium text-zinc-900 transition-colors hover:text-point-500"
                      >
                        {product.name}
                      </Link>
                    ) : (
                      <p className="truncate text-sm text-zinc-400">
                        Product no longer available ({row.productId})
                      </p>
                    )}
                    <p className="text-xs text-zinc-400">
                      Saved {formatDate(row.createdAt)}
                    </p>
                  </div>
                  {product && (
                    <span className="shrink-0 text-sm text-zinc-700">
                      {formatMoney(product.priceCents, product.currency, {
                        convert: false,
                      })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
