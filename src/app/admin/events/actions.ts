"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  EVENT_ZOOM_MAX,
  EVENT_ZOOM_MIN,
  eventBackground,
} from "@/lib/event-background";
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
  // Framing for that artwork (client's slide 6): the point it focuses on, as the
  // percentages `object-position` reads, and a zoom where 100 is plain cover.
  imageFocusX: z.coerce.number().int().min(0).max(100).default(50),
  imageFocusY: z.coerce.number().int().min(0).max(100).default(50),
  imageZoom: z.coerce
    .number()
    .int()
    .min(EVENT_ZOOM_MIN)
    .max(EVENT_ZOOM_MAX)
    .default(100),
  // Hex background for cards without artwork, e.g. "#6f2dbd".
  color: safeText(20).optional(),
  href: safeText(2000).optional(),
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
  // Repaired the same way the storefront repairs a stored row, so neither can
  // act on a framing the card cannot draw.
  const framing = eventBackground({
    focusX: data.imageFocusX,
    focusY: data.imageFocusY,
    zoom: data.imageZoom,
  });
  return {
    title: data.title.trim(),
    text: data.text?.trim() || null,
    dateLabel: data.dateLabel?.trim() || null,
    image: data.image?.trim() || null,
    imageFocusX: framing.focusX,
    imageFocusY: framing.focusY,
    imageZoom: framing.zoom,
    color: data.color?.trim() || null,
    href: data.href?.trim() || null,
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
  // New events go to the end of the list; the table's arrows reorder them.
  const last = await db.event.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  await db.event.create({
    data: { ...fields(data), sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
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

/** Move an event up or down within the list, then renumber it. */
export async function moveEvent(id: string, direction: "up" | "down") {
  await requireAdmin();
  const rows = await db.event.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true },
  });
  const ids = rows.map((r) => r.id);
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) {
    return { ok: true as const };
  }
  ids.splice(index, 1);
  ids.splice(target, 0, id);

  await db.$transaction(
    ids.map((eventId, order) =>
      db.event.update({ where: { id: eventId }, data: { sortOrder: order } }),
    ),
  );
  revalidateEvents();
  return { ok: true as const };
}
