"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendMemberIdLink } from "@/lib/email";
import { parseInput, safeEmail } from "@/lib/validation";

export type MemberIdResult = { ok: true } | { ok: false; message: string };

const input = z.object({ email: safeEmail() });

const EMAIL_COOLDOWN_MS = 10 * 60 * 1000;
const IP_COOLDOWN_MS = 60 * 1000;

/** True when a marker row exists and is younger than `ms`. */
async function throttled(identifier: string, ms: number) {
  const row = await db.verification.findFirst({ where: { identifier } });
  if (!row) return false;
  return Date.now() - row.updatedAt.getTime() < ms;
}

/** Create or refresh a marker row so the next call can see the cooldown. */
async function mark(identifier: string) {
  const row = await db.verification.findFirst({ where: { identifier } });
  const expiresAt = new Date(Date.now() + EMAIL_COOLDOWN_MS);
  if (row) {
    await db.verification.update({
      where: { id: row.id },
      data: { value: "1", expiresAt },
    });
  } else {
    await db.verification.create({
      data: { identifier, value: "1", expiresAt },
    });
  }
}

/**
 * Email the member ID (username) on file. Always reports success — a different
 * answer for unknown addresses would turn this into an account finder.
 */
export async function requestMemberId(inputValue: unknown): Promise<MemberIdResult> {
  let email: string;
  try {
    email = parseInput(input, inputValue, "account.forgot-id").email;
  } catch {
    return { ok: false, message: "Enter a valid email address." };
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";

  if (await throttled(`member-id-ip-${ip}`, IP_COOLDOWN_MS)) {
    return { ok: true };
  }

  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { name: true, username: true },
    });
    if (user && !(await throttled(`member-id-${email}`, EMAIL_COOLDOWN_MS))) {
      const host = h.get("x-forwarded-host") ?? h.get("host") ?? "our-nara.com";
      const origin =
        host.startsWith("localhost") ||
        host.startsWith("127.") ||
        host.startsWith("[::1]")
          ? `http://${host}`
          : `https://${host}`;
      // Google sign-ups have no username; the template explains how to sign
      // in instead, so the sender never waits for an email that never comes.
      await sendMemberIdLink(email, user.name, user.username, `${origin}/login`);
      await mark(`member-id-${email}`);
    }
    await mark(`member-id-ip-${ip}`);
  } catch (err) {
    // Log for support; the visitor still gets the neutral confirmation.
    console.error("[account.forgot-id] member ID email failed", err);
  }

  return { ok: true };
}
