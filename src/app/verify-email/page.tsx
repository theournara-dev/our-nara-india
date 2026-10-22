import Link from "next/link";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Landing page for the link in the verification email. Better Auth verifies
 * the token at /api/auth/verify-email and redirects here with `?error=` when
 * the token is invalid or expired; on success it signs the user in.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  const failed = Boolean(error);

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-center font-category text-3xl font-semibold text-ink">
          {failed ? "Link expired" : "Email verified"}
        </h1>
        <div className="mt-6 space-y-4 border border-[#e9e9e9] bg-white p-8 text-center">
          <p className="text-sm leading-6 text-[#666]">
            {failed
              ? "This verification link is invalid or has expired. Sign in and we will send a fresh one."
              : user
                ? `Thanks, ${user.name}. Your email address is verified and you are signed in.`
                : "Your email address is verified. Sign in to continue."}
          </p>
          <Link
            href={failed || !user ? "/login" : "/account"}
            className="inline-flex h-11 w-full items-center justify-center rounded bg-point-500 text-sm font-semibold text-white transition-colors hover:bg-point-600"
          >
            {failed || !user ? "Go to login" : "Go to my account"}
          </Link>
        </div>
      </div>
    </Container>
  );
}
