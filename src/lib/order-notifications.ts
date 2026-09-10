import { SITE } from "@/lib/constants";
import { trackingUrl } from "@/lib/delhivery-client";
import { getFromForVersion, sendEmail } from "@/lib/email";
import { formatMoney } from "@/lib/money";
import type { OrderStatusValue } from "@/lib/order-status";
import { getSiteUrl, type SiteVersion } from "@/lib/site-version";

/**
 * Order notification emails (customer + admin). These are best-effort: every
 * function wraps its send in try/catch and returns `{ ok: false }` instead of
 * throwing, so callers (webhook, cron, admin actions) never have their
 * critical path broken by an email failure.
 *
 * The sender domain is version-aware: the order's stored currency decides the
 * site version (INR → local/our-nara.com, USD → global/our-nara.co.kr), and
 * `getFromForVersion` picks the matching verified Resend sender.
 */

export type OrderNotificationStatus = Exclude<
  OrderStatusValue,
  "PENDING"
>;

/** Statuses that produce a customer email. PENDING is a no-op. */
const NOTIFIABLE_STATUSES = new Set<OrderNotificationStatus>([
  "PAID",
  "PRE_ORDER",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "FAILED",
]);

export type OrderNotificationItem = {
  name: string;
  quantity: number;
  priceCents: number;
  currency?: string | null;
};

/**
 * Structural subset of a Prisma Order (with `items` included) that the
 * notification templates need. `email`/`currency` are optional so callers that
 * pass a trimmed `select` (e.g. the cron reconciliation query) still typecheck;
 * the send is skipped when `email` is missing.
 */
export type OrderForNotification = {
  id: string;
  orderNumber: string;
  email?: string | null;
  currency?: string | null;
  totalCents: number;
  isPreOrder?: boolean;
  shipping?: unknown;
  items: OrderNotificationItem[];
};

const BRAND_COLOR = "#6f2dbd";

/** Escape a value for safe interpolation into an HTML template. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Version is inferred from the stored currency (INR=local, USD=global). */
function versionForOrder(currency: string | null | undefined): SiteVersion {
  return currency === "USD" ? "global" : "local";
}

function itemLines(items: OrderNotificationItem[]): string {
  return items.map((i) => `- ${i.name} x${i.quantity}`).join("\n");
}

function itemRowsHtml(items: OrderNotificationItem[]): string {
  return items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;color:#333">${escapeHtml(i.name)} × ${i.quantity}</td>
      </tr>`,
    )
    .join("");
}

function wrapHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:24px 0">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e9e9e9;border-radius:8px;overflow:hidden">
            <tr>
              <td style="background:${BRAND_COLOR};padding:20px 28px">
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:1px">${escapeHtml(SITE.name)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px">
                <h1 style="margin:0 0 16px;font-size:20px;color:#222">${escapeHtml(title)}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #eee;color:#888;font-size:12px">
                ${escapeHtml(SITE.name)} · ${escapeHtml(SITE.supportEmail)} · ${escapeHtml(SITE.url)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildStatusMessage(
  order: OrderForNotification,
  status: OrderNotificationStatus,
  waybill?: string | null,
): { subject: string; text: string; html: string } {
  const orderNumber = order.orderNumber;
  const total = formatMoney(order.totalCents, order.currency ?? "INR", {
    convert: false,
  });
  const itemsText = itemLines(order.items);
  const itemsHtml = itemRowsHtml(order.items);

  switch (status) {
    case "PAID":
    case "PRE_ORDER": {
      const preOrderNote =
        status === "PRE_ORDER"
          ? "\n\nThis is a pre-order — we'll ship it as soon as your items arrive in stock."
          : "";
      const preOrderNoteHtml =
        status === "PRE_ORDER"
          ? "<p>This is a pre-order — we'll ship it as soon as your items arrive in stock.</p>"
          : "";
      return {
        subject: `Order ${orderNumber} confirmed — ${SITE.name}`,
        text: `Thanks for your order!\n\nOrder number: ${orderNumber}\n\n${itemsText}\n\nTotal: ${total}${preOrderNote}\n\nWe'll notify you when it ships.`,
        html: wrapHtml(
          "Order confirmed",
          `<p>Thanks for your order! We're on it.</p>
           <p><strong>Order number:</strong> ${escapeHtml(orderNumber)}</p>
           <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">${itemsHtml}</table>
           <p style="text-align:right;font-size:16px;font-weight:700;color:#222">Total: ${escapeHtml(total)}</p>
           ${preOrderNoteHtml}
           <p>We'll notify you when it ships.</p>`,
        ),
      };
    }
    case "SHIPPED": {
      const trackingText = waybill
        ? `\n\nTrack your package: ${trackingUrl(waybill)}`
        : "";
      const trackingHtml = waybill
        ? `<p><a href="${escapeHtml(trackingUrl(waybill))}" style="color:${BRAND_COLOR};font-weight:700">Track your package on Delhivery</a></p>`
        : "";
      return {
        subject: `Order ${orderNumber} is on the way — ${SITE.name}`,
        text: `Good news — your order is on the way!\n\nOrder number: ${orderNumber}\n\n${itemsText}\n\nTotal: ${total}${trackingText}\n\nThanks for shopping with us!`,
        html: wrapHtml(
          "On the way",
          `<p>Good news — your order is on the way!</p>
           <p><strong>Order number:</strong> ${escapeHtml(orderNumber)}</p>
           <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">${itemsHtml}</table>
           ${trackingHtml}
           <p>Thanks for shopping with us!</p>`,
        ),
      };
    }
    case "DELIVERED": {
      return {
        subject: `Order ${orderNumber} delivered — ${SITE.name}`,
        text: `Your order has been delivered!\n\nOrder number: ${orderNumber}\n\n${itemsText}\n\nWe hope you love your K-beauty goodies. Enjoy!`,
        html: wrapHtml(
          "Delivered",
          `<p>Your order has been delivered!</p>
           <p><strong>Order number:</strong> ${escapeHtml(orderNumber)}</p>
           <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">${itemsHtml}</table>
           <p>We hope you love your K-beauty goodies. Enjoy!</p>`,
        ),
      };
    }
    case "CANCELLED": {
      return {
        subject: `Order ${orderNumber} cancelled — ${SITE.name}`,
        text: `Your order has been cancelled.\n\nOrder number: ${orderNumber}\n\n${itemsText}\n\nIf you have any questions, reply to this email or contact us at ${SITE.supportEmail}.`,
        html: wrapHtml(
          "Order cancelled",
          `<p>Your order has been cancelled.</p>
           <p><strong>Order number:</strong> ${escapeHtml(orderNumber)}</p>
           <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">${itemsHtml}</table>
           <p>If you have any questions, reply to this email or contact us at ${escapeHtml(SITE.supportEmail)}.</p>`,
        ),
      };
    }
    case "REFUNDED": {
      return {
        subject: `Refund processed for order ${orderNumber} — ${SITE.name}`,
        text: `Your refund has been processed.\n\nOrder number: ${orderNumber}\n\nAmount refunded: ${total}\n\nIt may take a few business days for the refund to appear on your statement.`,
        html: wrapHtml(
          "Refund processed",
          `<p>Your refund has been processed.</p>
           <p><strong>Order number:</strong> ${escapeHtml(orderNumber)}</p>
           <p><strong>Amount refunded:</strong> ${escapeHtml(total)}</p>
           <p>It may take a few business days for the refund to appear on your statement.</p>`,
        ),
      };
    }
    case "FAILED": {
      return {
        subject: `Payment failed — no order placed (${orderNumber}) — ${SITE.name}`,
        text: `We couldn't process your payment, so no order was placed and nothing has been charged.\n\nReference: ${orderNumber}\n\n${itemsText}\n\nTotal: ${total}\n\nYou can retry the payment from your cart, or contact us at ${SITE.supportEmail} if you need help.`,
        html: wrapHtml(
          "Payment failed",
          `<p>We couldn't process your payment, so <strong>no order was placed</strong> and nothing has been charged.</p>
           <p><strong>Reference:</strong> ${escapeHtml(orderNumber)}</p>
           <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">${itemsHtml}</table>
           <p><strong>Total:</strong> ${escapeHtml(total)}</p>
           <p>You can retry the payment from your cart, or contact us at ${escapeHtml(SITE.supportEmail)} if you need help.</p>`,
        ),
      };
    }
  }
}

/**
 * Send the customer a status-change email. Never throws — failures are logged
 * and reported as `{ ok: false }`. PENDING is a no-op (no email).
 */
export async function notifyOrderStatusChange(
  order: OrderForNotification,
  newStatus: OrderStatusValue,
  options?: { waybill?: string | null },
): Promise<{ ok: boolean; dev?: boolean }> {
  try {
    if (!NOTIFIABLE_STATUSES.has(newStatus as OrderNotificationStatus)) {
      return { ok: false };
    }
    if (!order.email) {
      console.error(
        `[order-notifications] No email on order ${order.orderNumber}; skipping ${newStatus} notification.`,
      );
      return { ok: false };
    }
    const version: SiteVersion = versionForOrder(order.currency);
    const { subject, text, html } = buildStatusMessage(
      order,
      newStatus as OrderNotificationStatus,
      options?.waybill,
    );
    return await sendEmail({
      to: order.email,
      from: getFromForVersion(version),
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error(
      `[order-notifications] Failed to send ${newStatus} email for order ${order.orderNumber}:`,
      err,
    );
    return { ok: false };
  }
}

function extractCustomerName(shipping: unknown): string {
  if (shipping && typeof shipping === "object") {
    const name = (shipping as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return "—";
}

/**
 * Notify the support inbox about a new order. Never throws — failures are
 * logged and reported as `{ ok: false }`.
 */
export async function notifyAdminsNewOrder(
  order: OrderForNotification,
): Promise<{ ok: boolean; dev?: boolean }> {
  try {
    const customerName = extractCustomerName(order.shipping);
    const total = formatMoney(order.totalCents, order.currency ?? "INR", {
      convert: false,
    });
    const itemsText = itemLines(order.items);
    const itemsHtml = itemRowsHtml(order.items);
    const version = versionForOrder(order.currency);
    const adminLink = `${getSiteUrl(version)}/admin/orders/${order.id}`;

    const subject = `New paid order ${order.orderNumber} — ${SITE.name}`;
    const text = [
      "New paid order received!",
      "",
      `Order number: ${order.orderNumber}`,
      `Customer: ${customerName}`,
      `Email: ${order.email ?? "—"}`,
      `Total: ${total}`,
      "",
      "Items:",
      itemsText,
      "",
      `Admin: ${adminLink}`,
    ].join("\n");

    const html = wrapHtml(
      "New paid order",
      `<p>A paid order just came in. Payment is confirmed.</p>
       <p><strong>Order number:</strong> ${escapeHtml(order.orderNumber)}</p>
       <p><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
       <p><strong>Email:</strong> ${escapeHtml(order.email ?? "—")}</p>
       <p><strong>Total:</strong> ${escapeHtml(total)}</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">${itemsHtml}</table>
       <p><a href="${escapeHtml(adminLink)}" style="color:${BRAND_COLOR};font-weight:700">View order in admin →</a></p>`,
    );

    return await sendEmail({
      to: SITE.supportEmail,
      from: getFromForVersion(version),
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error(
      `[order-notifications] Failed to send new-order admin email for order ${order.orderNumber}:`,
      err,
    );
    return { ok: false };
  }
}
