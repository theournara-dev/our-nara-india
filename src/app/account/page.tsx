import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Real data (order count) is fetched server-side; force dynamic so the session
// guard and the count are always fresh. The layout is force-dynamic already;
// this keeps the page correct even if the layout changes.
export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  normal: "Member",
  manager: "Manager",
  admin: "Admin",
};

export default async function AccountOverviewPage() {
  // Same corrupt-cookie handling as the layout: treat an unreadable session
  // as anonymous (the layout redirects before this page renders anyway).
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    session = null;
  }
  const name = session?.user?.name ?? "";
  const email = session?.user?.email ?? "";
  const role = session?.user?.role;
  const roleLabel = ROLE_LABELS[role ?? "normal"] ?? role ?? "Member";

  // Orders placed while signed in carry the userId; guest checkouts made with
  // the same email (stored lowercased at creation) belong to the customer too.
  const orderCount = session
    ? await db.order.count({
        where: {
          OR: [
            { userId: session.user.id },
            { email: session.user.email.toLowerCase() },
          ],
        },
      })
    : 0;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
        Welcome back, {name.split(" ")[0]}
      </h1>
      <p className="mb-6 text-sm text-zinc-500">{email}</p>
      <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-600">
        <span className="text-zinc-400">Role</span>
        <span className="font-medium text-zinc-900">{roleLabel}</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-100 bg-white p-5">
          <p className="text-sm text-zinc-500">Orders</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {orderCount}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white p-5">
          <p className="text-sm text-zinc-500">Mileage</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">0P</p>
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white p-5">
          <p className="text-sm text-zinc-500">Wishlist</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">0</p>
        </div>
      </div>
      <p className="mt-8 text-sm text-zinc-500">
        Your orders are listed under the Orders tab, with full details for each
        purchase. Wishlists will be available once wishlisting is enabled.
      </p>
    </div>
  );
}
