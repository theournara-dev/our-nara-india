"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { WEEKDAYS } from "@/lib/store-hours";
import { parseSiteVersion } from "@/lib/site-version";
import {
  parseInput,
  safeEmail,
  safeMultiline,
  safeText,
} from "@/lib/validation";

/**
 * Admin writes for the store list behind /stores. Stores are a dynamic list per
 * storefront version: admins add, edit, reorder and remove them here; the
 * storefront reads them in `src/data/stores.ts`.
 */

const dayInput = z.object({
  closed: z.boolean(),
  open: z.string().max(5),
  close: z.string().max(5),
});

const hoursInput = z.record(z.string(), dayInput).optional();

const storeInput = z.object({
  id: z.string().min(1).optional(),
  version: z.string(),
  name: safeText(80).optional(),
  address: safeMultiline(300).optional(),
  phone: safeText(40).optional(),
  email: safeEmail().optional().or(z.literal("")),
  mapQuery: safeText(400).optional(),
  hours: hoursInput,
  isActive: z.boolean().optional(),
});

/** Keep only known weekdays, so a stray key can never reach the JSON column. */
function cleanHours(
  hours: z.infer<typeof hoursInput>,
):
  Record<string, { closed: boolean; open: string; close: string }> | undefined {
  if (!hours) return undefined;
  const out: Record<string, { closed: boolean; open: string; close: string }> =
    {};
  for (const day of WEEKDAYS) {
    const value = hours[day];
    if (!value) continue;
    out[day] = { closed: value.closed, open: value.open, close: value.close };
  }
  return out;
}

function revalidate() {
  revalidatePath("/stores");
  revalidatePath("/admin/stores");
}

/** Create or update one store. */
export async function saveStore(input: z.infer<typeof storeInput>) {
  await requireAdmin();
  const data = parseInput(storeInput, input, "store");
  const version = parseSiteVersion(data.version);
  if (!version) {
    return { ok: false as const, error: "Unknown store version" };
  }

  const hours = cleanHours(data.hours);
  const payload = {
    version,
    name: data.name?.trim() ?? "",
    address: data.address?.trim() ?? "",
    phone: data.phone?.trim() ?? "",
    email: data.email?.trim() ?? "",
    mapQuery: data.mapQuery?.trim() ?? "",
    ...(hours !== undefined ? { hours } : {}),
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
  };

  if (data.id) {
    await db.store.update({ where: { id: data.id }, data: payload });
    revalidate();
    return { ok: true as const, id: data.id };
  }

  // New stores go to the end of this version's list.
  const last = await db.store.findFirst({
    where: { version },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const created = await db.store.create({
    data: { ...payload, sortOrder: (last?.sortOrder ?? -1) + 1 },
    select: { id: true },
  });
  revalidate();
  return { ok: true as const, id: created.id };
}

/** Remove a store. */
export async function deleteStore(input: { id: string }) {
  await requireAdmin();
  const data = parseInput(
    z.object({ id: z.string().min(1) }),
    input,
    "store.delete",
  );
  await db.store.delete({ where: { id: data.id } });
  revalidate();
  return { ok: true as const };
}

/** Move a store up or down within its version, then renumber the list. */
export async function moveStore(input: {
  id: string;
  direction: "up" | "down";
}) {
  await requireAdmin();
  const data = parseInput(
    z.object({ id: z.string().min(1), direction: z.enum(["up", "down"]) }),
    input,
    "store.move",
  );
  const store = await db.store.findUnique({
    where: { id: data.id },
    select: { id: true, version: true },
  });
  if (!store) return { ok: false as const, error: "Store not found" };

  const all = await db.store.findMany({
    where: { version: store.version },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const ids = all.map((s) => s.id);
  const index = ids.indexOf(store.id);
  const target = data.direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) {
    return { ok: true as const };
  }
  ids.splice(index, 1);
  ids.splice(target, 0, store.id);

  await db.$transaction(
    ids.map((id, order) =>
      db.store.update({ where: { id }, data: { sortOrder: order } }),
    ),
  );
  revalidate();
  return { ok: true as const };
}
