"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseInput, safeEmail, safeText } from "@/lib/validation";
import {
  parseSiteVersion,
  resolveRequestSiteVersion,
  SITE_VERSION_COOKIE,
} from "@/lib/site-version";

const preorderInput = z.object({
  productId: z.string().min(1, "Product is required"),
  name: safeText(120, { min: 1, message: "Name is required" }),
  email: safeEmail(),
  phone: safeText(40).optional(),
  addressLine1: safeText(200).optional(),
  addressLine2: safeText(200).optional(),
  city: safeText(120).optional(),
  state: safeText(120).optional(),
  postal: safeText(20).optional(),
  country: safeText(120).optional(),
  quantity: z.coerce.number().int().min(1).default(1),
});

export type PreorderInput = z.infer<typeof preorderInput>;

/** Save a pre-order placed from the product page. */
export async function createPreorder(input: PreorderInput) {
  const data = parseInput(preorderInput, input, "preorders.create");
  // The store is resolved server-side (the switcher's cookie, then the host),
  // like checkout, so the record says which storefront it came from.
  const [requestHeaders, cookieStore] = await Promise.all([
    headers(),
    cookies(),
  ]);
  const siteVersion =
    parseSiteVersion(cookieStore.get(SITE_VERSION_COOKIE)?.value) ??
    resolveRequestSiteVersion(
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    );
  await db.preorder.create({
    data: {
      productId: data.productId,
      siteVersion,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      addressLine1: data.addressLine1 || null,
      addressLine2: data.addressLine2 || null,
      city: data.city || null,
      state: data.state || null,
      postal: data.postal || null,
      country: data.country || null,
      quantity: data.quantity,
    },
  });
  revalidatePath("/admin/preorders");
  revalidatePath("/admin/products");
}
