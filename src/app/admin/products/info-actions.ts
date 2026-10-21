"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { INFO_TEMPLATE_KEY } from "@/lib/info-rows";
import { parseSiteVersion, type SiteVersion } from "@/lib/site-version";
import { parseInput, safeMultiline, safeText } from "@/lib/validation";

/**
 * Storewide INFO ("MORE INFORMATION") content shown on every product page of
 * one store, unless that product provides its own rows.
 */

const rowsInput = z
  .array(
    z.object({
      heading: safeText(120).optional(),
      body: safeMultiline(4000).optional(),
    }),
  )
  .default([]);

export async function saveInfoTemplate(
  version: SiteVersion,
  rows: { heading?: string; body?: string }[],
) {
  await requireAdmin();
  const store = parseSiteVersion(version);
  if (!store) throw new Error("Unknown site version");
  const data = parseInput(rowsInput, rows, "infoTemplate.save");
  const key = INFO_TEMPLATE_KEY[store];

  await db.productInfoTemplate.upsert({
    where: { key },
    create: { key, blocks: data },
    update: { blocks: data },
  });

  revalidatePath("/admin/products/info");
}
