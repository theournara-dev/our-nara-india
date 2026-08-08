import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Container } from "@/components/ui/container";
import { auth } from "@/lib/auth";
import { AccountProvider } from "./account-provider";

// The account pages are client components with no server data fetching, so
// Next.js would otherwise statically prerender them and bypass the session
// check below. Force dynamic rendering so the auth guard runs on every request.
export const dynamic = "force-dynamic";

const accountLinks = [
  { label: "Overview", href: "/account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "Mileage", href: "/account/mileage" },
  { label: "Coupons", href: "/account/coupons" },
];

export default async function AccountLayout({
  children,
}: LayoutProps<"/account">) {
  // Authoritative server-side check: the proxy only verifies a cookie exists,
  // so we validate the actual session here and redirect if it's missing,
  // expired, or revoked.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };

  return (
    <AccountProvider user={user}>
      <Container className="grid gap-10 py-24 lg:grid-cols-[220px_1fr]">
        <aside>
          <p className="mb-1 text-sm font-semibold text-zinc-900">My Page</p>
          <p className="mb-3 truncate text-sm text-zinc-500">{user.name}</p>
          <nav className="space-y-1" aria-label="My Page">
            {accountLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-h-[60vh] min-w-0">{children}</div>
      </Container>
    </AccountProvider>
  );
}
