import "server-only";
import { db } from "@/lib/db";

/** One recorded photo-ID decision on an order. */
export interface ApprovalHistoryRow {
  id: string;
  decision: string;
  note: string | null;
  actorEmail: string | null;
  createdAt: string;
}

/**
 * The order's photo-ID decisions, newest first. Kept out of the "use server"
 * action module on purpose: as an action it would be callable by any client
 * that knows an order id, and this list names the staff who made each call.
 */
export async function getApprovalHistory(
  orderId: string,
): Promise<ApprovalHistoryRow[]> {
  const rows = await db.orderApprovalLog.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    decision: r.decision,
    note: r.note,
    actorEmail: r.actorEmail,
    createdAt: r.createdAt.toISOString(),
  }));
}
