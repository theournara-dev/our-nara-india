import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendVerificationCode } from "@/lib/email";

export const runtime = "nodejs";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const COOLDOWN_MS = 60 * 1000; // 60 seconds

/**
 * Generate a 6-digit code, store it in the same format the email-otp plugin
 * expects (`email-verification-otp-{email}` → `${code}:0`), and email it.
 *
 * Unlike the plugin's `/email-otp/send-verification-otp` endpoint — which runs
 * the send in the background and always returns success even when the email
 * fails — this route surfaces send failures so the user isn't silently stuck
 * at "check your email".
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const identifier = `email-verification-otp-${email}`;
  const existing = await db.verification.findFirst({ where: { identifier } });

  // Cooldown: at most one code per 60s.
  if (existing) {
    const elapsed = Date.now() - existing.updatedAt.getTime();
    if (elapsed < COOLDOWN_MS) {
      const wait = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        { error: `Please wait ${wait}s before requesting a new code.` },
        { status: 429 },
      );
    }
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  if (existing) {
    await db.verification.update({
      where: { id: existing.id },
      data: { value: `${code}:0`, expiresAt },
    });
  } else {
    await db.verification.create({
      data: { identifier, value: `${code}:0`, expiresAt },
    });
  }

  try {
    await sendVerificationCode(email, code);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to send the verification email.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
