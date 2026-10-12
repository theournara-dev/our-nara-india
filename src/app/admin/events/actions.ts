"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseInput, safeMultiline, safeText } from "@/lib/validation";

/**
 * Admin writes for /admin/events — the campaign cards on /event (client slide
 * 10). Images upload through the shared ImageField; the storefront read is in
 * `src/data/events.ts`.
 */

const eventInput = z.object({
  title: safeText(200, { min: 1, message: "Title is required" }),
  text: safeMultiline(600).optional(),
  dateLabel: safeText(80).optional(),
  image: safeText(2000).optional(),
  href: safeText(2000).optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  // Optional display window sent as `datetime-local` strings; empty = no limit.
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export type EventInput = z.infer<typeof eventInput>;

export type EventActionResult = { ok: true } | { ok: false; message: string };

/** Convert an optional `datetime-local` string to a Date or null. */
function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fields(data: EventInput) {
  return {
    title: data.title.trim(),
    text: data.text?.trim() || null,
    dateLabel: data.dateLabel?.trim() || null,
    image: data.image?.trim() || null,
    href: data.href?.trim() || null,
    sortOrder: data.sortOrder,
    isActive: data.isActive,
    startsAt: toDate(data.startsAt),
    expiresAt: toDate(data.expiresAt),
  };
}

function revalidateEvents() {
  revalidatePath("/admin/events");
  revalidatePath("/event");
}

export async function createEvent(input: EventInput, backHref: string) {
  await requireAdmin();
  const data = parseInput(eventInput, input, "events.create");
  await db.event.create({ data: fields(data) });
  revalidateEvents();
  redirect(backHref || "/admin/events");
}

export async function updateEvent(
  id: string,
  input: EventInput,
): Promise<EventActionResult> {
  await requireAdmin();
  const data = parseInput(eventInput, input, "events.update");
  try {
    await db.event.update({ where: { id }, data: fields(data) });
  } catch (err) {
    console.error(`[events] update failed for ${id}:`, err);
    return { ok: false, message: "Could not save this event." };
  }
  revalidateEvents();
  return { ok: true };
}

export async function toggleEventActive(
  id: string,
  isActive: boolean,
): Promise<EventActionResult> {
  await requireAdmin();
  try {
    await db.event.update({ where: { id }, data: { isActive } });
  } catch (err) {
    console.error(`[events] toggle failed for ${id}:`, err);
    return { ok: false, message: "Could not update this event." };
  }
  revalidateEvents();
  return { ok: true };
}

export async function deleteEvent(id: string): Promise<EventActionResult> {
  await requireAdmin();
  try {
    await db.event.delete({ where: { id } });
  } catch (err) {
    console.error(`[events] delete failed for ${id}:`, err);
    return { ok: false, message: "Could not delete this event." };
  }
  revalidateEvents();
  return { ok: true };
}
