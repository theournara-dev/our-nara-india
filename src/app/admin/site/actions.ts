"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  DEFAULT_SWITCHER_CONTENT,
  normalizeSwitcher,
  normalizeTopBanner,
} from "@/lib/site-content";
import { parseSiteVersion } from "@/lib/site-version";
import {
  parseInput,
  safeEmail,
  safeMultiline,
  safeText,
} from "@/lib/validation";

/**
 * Admin writes for the per-version site configuration (contact details, the top
 * banner and the store picker). Everything the storefront shows from
 * /admin/site goes through here — see `src/lib/site-config.ts` for the read
 * side.
 */

const contentInput = z.object({
  version: z.string(),
  email: safeEmail(),
  phone: safeText(40).optional(),
  address: safeMultiline(300).optional(),
  topBanner: z.array(z.unknown()).max(10, "A banner holds at most 10 blocks"),
  // ── Delivery pricing (minor units) ────────────────────────────────────────
  shippingCents: z.coerce.number().int().min(0).max(10_000_000).optional(),
  freeShippingOverCents: z.coerce
    .number()
    .int()
    .min(0)
    .max(10_000_000)
    .nullable()
    .optional(),
  dispatchCutoffHour: z.coerce.number().int().min(0).max(23).optional(),
  // ── Invoice "from" block ────────────────────────────────────────────────
  invoice: z
    .object({
      legalName: safeText(160).optional(),
      address: safeMultiline(400).optional(),
      // The email may legitimately be blank (no address printed), so an empty
      // string passes instead of failing the email check.
      email: z.union([safeEmail(), z.literal("")]).optional(),
      phone: safeText(40).optional(),
      taxId: safeText(60).optional(),
      note: safeMultiline(300).optional(),
    })
    .optional(),
});

function toVersion(raw: string) {
  const parsed = parseSiteVersion(raw);
  if (!parsed) throw new Error("Unknown site version");
  return parsed;
}

/**
 * Save the contact details, stores page, top banner, delivery pricing and
 * invoice block.
 */
export async function saveSiteContent(input: z.infer<typeof contentInput>) {
  await requireAdmin();
  const data = parseInput(contentInput, input, "site.content");
  const version = toVersion(data.version);
  // Re-validate through the shared normalizer so a hand-rolled payload can't
  // store a block shape the storefront can't render. `allowEmpty` keeps an
  // in-progress block (added but not yet filled in) instead of silently
  // dropping it on the next reload.
  const topBanner = normalizeTopBanner(data.topBanner, [], {
    allowEmpty: true,
  });
  const fields = {
    email: data.email,
    phone: data.phone?.trim() || null,
    address: data.address?.trim() || null,
    topBanner,
    // Only write the fields the client sent: a stale tab that predates a
    // section must not wipe the values it doesn't know about.
    ...(data.shippingCents !== undefined
      ? { shippingCents: data.shippingCents }
      : {}),
    ...(data.freeShippingOverCents !== undefined
      ? { freeShippingOverCents: data.freeShippingOverCents || null }
      : {}),
    ...(data.dispatchCutoffHour !== undefined
      ? { dispatchCutoffHour: data.dispatchCutoffHour }
      : {}),
    ...(data.invoice
      ? {
          invoiceLegalName: data.invoice.legalName?.trim() || null,
          invoiceAddress: data.invoice.address?.trim() || null,
          invoiceEmail: data.invoice.email?.trim() || null,
          invoicePhone: data.invoice.phone?.trim() || null,
          invoiceTaxId: data.invoice.taxId?.trim() || null,
          invoiceNote: data.invoice.note?.trim() || null,
        }
      : {}),
  };

  await db.siteConfig.upsert({
    where: { version },
    create: { version, ...fields },
    update: fields,
  });

  revalidateSite();
}

const switcherInput = z.object({
  title: safeText(120, { min: 1, message: "Title is required" }),
  subtitle: safeText(200).optional(),
  blocks: z.array(z.unknown()).min(1, "At least one store card is required"),
});

/**
 * Save the store-picker popup. The popup describes both stores and appears on
 * both sites, so it is written to every version's row instead of being
 * duplicated per tab.
 */
export async function saveStorePicker(input: z.infer<typeof switcherInput>) {
  await requireAdmin();
  const data = parseInput(switcherInput, input, "site.switcher");
  const switcher = normalizeSwitcher(data, DEFAULT_SWITCHER_CONTENT);

  for (const version of ["local", "global"] as const) {
    await db.siteConfig.upsert({
      where: { version },
      create: { version, switcher },
      update: { switcher },
    });
  }

  revalidateSite();
}

function revalidateSite() {
  // The top banner and store picker are part of the root layout, and the
  // footer (contact details) renders on every storefront page.
  revalidatePath("/", "layout");
}
