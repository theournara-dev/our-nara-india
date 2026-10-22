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
  // Only a signed-in, verified visitor can be shown a success: Better Auth
  // verifies the token then signs them in before redirecting here, so a bare
  // visit (or a bookmark) must not claim anything was verified.
  const failed = Boolean(error);
  const verified = Boolean(user?.emailVerified);

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-center font-category text-3xl font-semibold text-ink">
          {failed ? "Link expired" : verified ? "Email verified" : "Verify your email"}
        </h1>
        <div className="mt-6 space-y-4 border border-[#e9e9e9] bg-white p-8 text-center">
          <p className="text-sm leading-6 text-[#666]">
            {failed
              ? "This verification link is invalid or has expired. Sign in and we will send a fresh one."
              : verified
                ? `Thanks, ${user?.name}. Your email address is verified and you are signed in.`
                : "Open the link in your verification email to verify your address."}
          </p>
          <Link
            href={verified ? "/account" : "/login"}
            className="inline-flex h-11 w-full items-center justify-center rounded bg-point-500 text-sm font-semibold text-white transition-colors hover:bg-point-600"
          >
            {verified ? "Go to my account" : "Go to login"}
          </Link>
        </div>
      </div>
    </Container>
  );
}
