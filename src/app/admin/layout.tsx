import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// Force dynamic rendering so the session + role guard always runs, even if a
// future admin page has no server data fetching.
export const dynamic = "force-dynamic";

const nav = [
  { label: "Overview", href: "/admin" },
  { label: "Users & Permissions", href: "/admin/users" },
  { label: "Products", href: "/admin/products" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Coupons", href: "/admin/coupons" },
  { label: "Reviews", href: "/admin/reviews" },
  { label: "Banners & Popups", href: "/admin/banners" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = session?.user?.role;

  if (!session) redirect("/login");
  if (role !== "admin") redirect("/account");

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex max-w-[1400px] gap-8 px-6 py-8">
        <aside className="w-56 shrink-0">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Admin
          </p>
          <nav className="space-y-1" aria-label="Admin">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-white hover:text-zinc-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
