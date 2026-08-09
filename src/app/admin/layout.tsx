import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

// Force dynamic rendering so the session + role guard always runs, even if a
// future admin page has no server data fetching.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // A corrupt/unreadable session cookie must not 500 the page — treat it as
  // no session so it gets cleared and the user is sent to login.
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    session = null;
  }
  const role = session?.user?.role;

  if (!session) {
    // ?session=expired tells the middleware to clear the stale cookie so this
    // doesn't bounce login → account → login forever.
    redirect("/login?session=expired");
  }
  if (role !== "admin") redirect("/account");

  return (
    <div className="relative min-h-screen bg-zinc-50">
      {/* Mobile notice — the dashboard is desktop-only. */}
      <div className="flex min-h-screen items-center justify-center p-6 md:hidden">
        <div className="max-w-sm text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Admin
          </p>
          <h1 className="mb-2 text-xl font-semibold text-zinc-900">
            Admin dashboard
          </h1>
          <p className="text-sm text-zinc-500">
            The admin dashboard is designed for desktop. Please open it on a
            desktop or tablet for the best experience.
          </p>
        </div>
      </div>

      {/* Desktop dashboard */}
      <div className="hidden md:block">
        <div className="mx-auto flex max-w-[1400px] gap-8 px-6 py-8">
          <aside className="w-56 shrink-0">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Admin
            </p>
            <AdminNav />
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
