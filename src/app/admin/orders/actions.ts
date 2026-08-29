"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ORDER_STATUSES, type OrderStatusValue } from "./status";

/**
 * Manually set an order's status from the admin dashboard. Guarded by the
 * admin role check; only known statuses are accepted.
 */
export async function updateOrderStatus(id: string, status: string) {
  await requireAdmin();
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
    throw new Error("Invalid order status");
  }
  await db.order.update({
    where: { id },
    data: { status: status as OrderStatusValue },
  });
  revalidatePath("/admin/orders");
}
