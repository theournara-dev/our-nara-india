"use client";

import type { InvoiceView } from "@/lib/invoices";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatusValue,
  type PaymentStatusValue,
} from "@/lib/order-status";

/**
 * Render an invoice as a PDF and hand it to the browser as a download.
 *
 * jsPDF is imported on demand, so the (~400 kB) library only loads when an
 * admin actually downloads an invoice. Amounts are written as "INR 1,150.00"
 * rather than "₹1,150.00": the built-in PDF fonts carry no rupee glyph, and a
 * broken character on a billing document is worse than the ISO code. The
 * on-screen preview keeps the rupee sign.
 */

const MARGIN = 14;
const LABEL = [140, 140, 145] as const;
const MUTED = [105, 105, 112] as const;
const INK = [24, 24, 27] as const;
const RULE = [226, 226, 232] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Indian-grouped amount with the currency code instead of its symbol. */
function pdfMoney(cents: number, currency: string): string {
  const amount = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
  return `${currency} ${amount}`;
}

export async function downloadInvoicePdf(view: InvoiceView): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const right = pageWidth - MARGIN;
  const contentWidth = right - MARGIN;

  const money = (cents: number) => pdfMoney(cents, view.currency);

  function font(size: number, style: "normal" | "bold" = "normal") {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  }

  function ink(color: readonly [number, number, number]) {
    doc.setTextColor(color[0], color[1], color[2]);
  }

  function rule(y: number) {
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.line(MARGIN, y, right, y);
  }

  let y = MARGIN;

  // ── Header: issuer on the left, document identity on the right ───────────
  font(18, "bold");
  ink(INK);
  doc.text("INVOICE", right, y + 6, { align: "right" });
  font(9.5);
  doc.text(view.number, right, y + 12, { align: "right" });
  ink(MUTED);
  font(8.5);
  doc.text(`Issued ${formatDate(view.issuedAt)}`, right, y + 16.5, {
    align: "right",
  });

  font(8);
  ink(LABEL);
  doc.text("FROM", MARGIN, y + 3);
  font(11, "bold");
  ink(INK);
  doc.text(view.from.legalName, MARGIN, y + 8.5);

  let fromY = y + 13.5;
  font(8.5);
  ink(MUTED);
  if (view.from.address) {
    const lines = doc.splitTextToSize(
      view.from.address,
      contentWidth * 0.62,
    ) as string[];
    doc.text(lines, MARGIN, fromY);
    fromY += lines.length * 4;
  }
  const contact = [view.from.email, view.from.phone].filter(Boolean).join(" · ");
  if (contact) {
    doc.text(contact, MARGIN, fromY);
    fromY += 4;
  }
  if (view.from.taxId) {
    doc.text(`Tax ID: ${view.from.taxId}`, MARGIN, fromY);
    fromY += 4;
  }

  y = Math.max(fromY, y + 20);
  rule(y);

  // ── Recipient and order reference ────────────────────────────────────────
  y += 5;
  font(8);
  ink(LABEL);
  doc.text("BILL TO", MARGIN, y);
  font(9.5, "bold");
  ink(INK);
  if (view.billTo.name) doc.text(view.billTo.name, MARGIN, y + 5);

  let billY = y + 9.5;
  font(8.5);
  ink(MUTED);
  const addressLines = [
    view.billTo.addressLine1,
    view.billTo.addressLine2,
    [view.billTo.city, view.billTo.state, view.billTo.postal]
      .filter(Boolean)
      .join(", "),
    view.billTo.country,
  ].filter((line): line is string => Boolean(line));
  for (const line of addressLines) {
    doc.text(doc.splitTextToSize(line, contentWidth * 0.5) as string[], MARGIN, billY);
    billY += 4;
  }
  if (view.billTo.phone) {
    doc.text(view.billTo.phone, MARGIN, billY);
    billY += 4;
  }
  if (view.billTo.email) {
    doc.text(view.billTo.email, MARGIN, billY);
    billY += 4;
  }

  // Order meta, right column.
  const meta: [string, string][] = [
    ["Order", view.orderNumber],
    ["Placed", formatDate(view.orderCreatedAt)],
    [
      "Status",
      ORDER_STATUS_LABELS[view.orderStatus as OrderStatusValue] ??
        view.orderStatus,
    ],
  ];
  let metaY = y + 5;
  for (const [label, value] of meta) {
    font(8.5);
    ink(LABEL);
    doc.text(label, right - 40, metaY);
    ink(INK);
    doc.text(value, right, metaY, { align: "right" });
    metaY += 4.5;
  }

  y = Math.max(billY, metaY) + 1;
  rule(y);

  // ── Line items ───────────────────────────────────────────────────────────
  const colItem = MARGIN;
  const colQty = right - 62;
  const colUnit = right - 26;
  const colAmount = right;
  const itemWidth = colQty - colItem - 14;

  function tableHead(top: number) {
    font(8);
    ink(LABEL);
    doc.text("ITEM", colItem, top);
    doc.text("QTY", colQty, top, { align: "right" });
    doc.text("UNIT", colUnit, top, { align: "right" });
    doc.text("AMOUNT", colAmount, top, { align: "right" });
    rule(top + 2);
    return top + 7;
  }

  y = tableHead(y + 5);

  for (const line of view.lines) {
    const nameLines = doc.splitTextToSize(line.name, itemWidth) as string[];
    const sub = [line.optionValue, line.sku].filter(Boolean).join(" · ");
    const rowHeight = nameLines.length * 4 + (sub ? 3.6 : 0) + 3;

    // Keep whole rows on one page.
    if (y + rowHeight > pageHeight - MARGIN - 24) {
      doc.addPage();
      y = tableHead(MARGIN + 2);
    }

    font(9.5);
    ink(INK);
    doc.text(nameLines, colItem, y);
    let rowY = y + nameLines.length * 4;
    if (sub) {
      font(7.5);
      ink(MUTED);
      doc.text(doc.splitTextToSize(sub, itemWidth) as string[], colItem, rowY);
      rowY += 3.6;
    }
    font(9.5);
    ink(INK);
    doc.text(String(line.quantity), colQty, y, { align: "right" });
    doc.text(money(line.unitCents), colUnit, y, { align: "right" });
    doc.text(money(line.lineTotalCents), colAmount, y, { align: "right" });

    rule(rowY + 1.5);
    y = rowY + 5;
  }

  // ── Totals ───────────────────────────────────────────────────────────────
  const totals: [string, string, boolean][] = [
    ["Subtotal", money(view.subtotalCents), false],
    [
      "Shipping",
      view.shippingCents === 0 ? "Free" : money(view.shippingCents),
      false,
    ],
    ...(view.discountCents > 0
      ? ([["Discount", `-${money(view.discountCents)}`, false]] as [
          string,
          string,
          boolean,
        ][])
      : []),
    ["Total", money(view.totalCents), true],
  ];

  y += 3;
  if (y + totals.length * 5 + 6 > pageHeight - MARGIN) {
    doc.addPage();
    y = MARGIN + 2;
  }

  for (const [label, value, strong] of totals) {
    if (strong) rule(y - 1);
    font(strong ? 10.5 : 9.5, strong ? "bold" : "normal");
    ink(strong ? INK : MUTED);
    doc.text(label, colUnit - 8, y + 2, { align: "right" });
    ink(INK);
    doc.text(value, colAmount, y + 2, { align: "right" });
    y += 5.5;
  }

  // ── Payments ─────────────────────────────────────────────────────────────
  if (view.payments.length > 0) {
    y += 6;
    if (y + 8 > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN + 2;
    }
    rule(y - 3);
    font(8);
    ink(LABEL);
    doc.text("PAYMENTS", MARGIN, y + 1);
    y += 6;

    for (const payment of view.payments) {
      font(8.5);
      ink(MUTED);
      const parts = [
        payment.provider.toUpperCase(),
        PAYMENT_STATUS_LABELS[payment.status as PaymentStatusValue] ??
          payment.status,
        payment.providerRef ?? "",
        formatDate(payment.createdAt),
      ].filter(Boolean);
      doc.text(parts.join("  ·  "), MARGIN, y);
      ink(INK);
      doc.text(
        pdfMoney(payment.amountCents, payment.currency),
        colAmount,
        y,
        { align: "right" },
      );
      y += 4.5;
    }
  }

  // ── Configured footer note ───────────────────────────────────────────────
  if (view.from.note) {
    const noteLines = doc.splitTextToSize(view.from.note, contentWidth - 8) as string[];
    const boxHeight = noteLines.length * 4 + 6;
    if (y + boxHeight + 4 > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN + 2;
    }
    y += 6;
    doc.setFillColor(248, 248, 250);
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.rect(MARGIN, y - 3, contentWidth, boxHeight, "FD");
    font(8.5);
    ink(MUTED);
    doc.text(noteLines, MARGIN + 4, y + 1);
    y += boxHeight;
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    font(7.5);
    ink(LABEL);
    doc.text(
      `${view.from.legalName} — ${view.number}`,
      MARGIN,
      pageHeight - 8,
    );
    doc.text(
      `Page ${page} of ${pages}`,
      right,
      pageHeight - 8,
      { align: "right" },
    );
  }

  doc.save(`${view.number}.pdf`);
}
