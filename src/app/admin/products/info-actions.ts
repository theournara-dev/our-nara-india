"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseInput, safeMultiline, safeText } from "@/lib/validation";

/**
 * Storewide INFO ("MORE INFORMATION") content shown on every product page,
 * unless a product provides its own override.
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
  rows: { heading?: string; body?: string }[],
) {
  await requireAdmin();
  const data = parseInput(rowsInput, rows, "infoTemplate.save");

  await db.productInfoTemplate.upsert({
    where: { key: "default" },
    create: { key: "default", blocks: data },
    update: { blocks: data },
  });

  revalidatePath("/admin/products/info");
}
