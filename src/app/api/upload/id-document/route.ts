import { NextRequest, NextResponse } from "next/server";
import { uploadIdDocument } from "@/lib/blob";
import { getClientIp } from "@/lib/client-ip";
import { createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Guest-reachable ID upload for the global checkout requirement. Unlike the
 * admin uploader there is no session behind it, so validation stays strict —
 * exactly one image file within the image MIME + 5MB limits — and a per-IP
 * rate limit blunts abuse of the public blob store.
 */
const limiter = createRateLimiter(5, 10 * 60 * 1000);

export async function POST(request: NextRequest) {
  const ip = await getClientIp();
  if (limiter.check(ip ?? "unknown")) {
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
    const url = await uploadIdDocument(files[0]);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 },
    );
  }
}
