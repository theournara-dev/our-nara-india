"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";

const preorderInput = z.object({
  productId: z.string().min(1, "Product is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal: z.string().optional(),
  country: z.string().optional(),
  quantity: z.coerce.number().int().min(1).default(1),
});

export type PreorderInput = z.infer<typeof preorderInput>;

/** Save a pre-order placed from the product page. */
export async function createPreorder(input: PreorderInput) {
  const data = preorderInput.parse(input);
  await db.preorder.create({
    data: {
      productId: data.productId,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      addressLine1: data.addressLine1?.trim() || null,
      addressLine2: data.addressLine2?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      postal: data.postal?.trim() || null,
      country: data.country?.trim() || null,
      quantity: data.quantity,
    },
  });
  revalidatePath("/admin/preorders");
  revalidatePath("/admin/products");
}
