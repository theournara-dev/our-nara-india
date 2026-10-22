import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

/** Landing page for the link in the password-reset email. Better Auth appends
 *  `?token=` on success or `?error=INVALID_TOKEN` when the link expired. */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const invalid = Boolean(error) || !token;

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-center font-category text-3xl font-semibold text-ink">
          Reset Password
        </h1>
        <p className="mb-8 text-center text-sm text-[#888]">
          Choose a new password for your OUR:NARA account.
        </p>

        {invalid ? (
          <div className="space-y-4 border border-[#e9e9e9] bg-white p-8 text-center">
            <p className="text-sm leading-6 text-[#666]">
              This reset link is invalid or has expired. Request a new one from
              the login page.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex h-11 w-full items-center justify-center rounded bg-point-500 text-sm font-semibold text-white transition-colors hover:bg-point-600"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <ResetPasswordForm token={token} />
        )}
      </div>
    </Container>
  );
}
