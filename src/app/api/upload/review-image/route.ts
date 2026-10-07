import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadReviewImage } from "@/lib/blob";
import { getClientIp } from "@/lib/client-ip";
import { createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Review photo upload. Unlike the ID upload this one requires a signed-in
 * customer (only they can write a review), so the session is the gate and the
 * rate limit is just back-pressure on top of it.
 */
const limiter = createRateLimiter(20, 10 * 60 * 1000);

export async function POST(request: NextRequest) {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: request.headers });
  } catch {
    session = null;
  }
  if (!session?.user) {
    return NextResponse.json(
      { error: "Please sign in to add photos." },
      { status: 401 },
    );
  }

  const ip = await getClientIp();
  if (limiter.check(ip ?? session.user.id)) {
    return NextResponse.json(
      { error: "Too many uploads — please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const files = formData
    .getAll("file")
    .filter((entry): entry is File => entry instanceof File);
  if (files.length !== 1) {
    return NextResponse.json(
      { error: "Upload exactly one image." },
      { status: 400 },
    );
  }

  try {
    const url = await uploadReviewImage(files[0]);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 },
    );
  }
}
