import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Cancellation & Refund Policy" };

export default function RefundPage() {
  return (
    <div>
      <PageHeader eyebrow="Legal" title="Cancellation & Refund Policy" />
      <Container className="mx-auto max-w-3xl space-y-6 pb-16 text-sm leading-relaxed text-zinc-600">
        <p>
          <strong className="text-zinc-900">1. 1. Order Cancellations</strong>
          ▪1.1 Cancellation Before Dispatch
          Immediate Cancellation Window: You can cancel your order **within 1 hour** of placing it at no cost.
          If the order status is &quot;Processing&quot; (not yet packed or shipped), cancellation is usually instant upon request.
          ⚠️ Urgent Action:
          For urgent cancellations outside the window, please contact us immediately via the dedicated support channels.
        </p>
        <p>
          <strong className="text-zinc-900">1.2 Cancellation After Dispatch</strong>
            Once the item has been handed over to the courier (Delhivery), cancellation is not possible.
            You may **refuse the delivery** upon arrival. A refund will be processed once the package returns to the warehouse, subject to shipping fee deduction for non-defective items.
        </p>
        <p>
          <strong className="text-zinc-900">2. Return & Refund Eligibility </strong>
            Criteria for Return
            Returns must be requested **within 7 days of delivery**.
            Product must be in original condition: **unused, unopened, with all original tags and packaging intact**.
            Proof of purchase (Order ID) is mandatory.
        </p>
        <p>
          <strong className="text-zinc-900">Non-Returnable Items (Final Sale)</strong>
            Opened or consumed food, supplements, or personal-care products.
            Items explicitly marked as **&quot;Clearance&quot;** or **&quot;Final Sale&quot;**.
            Products damaged by customer misuse or neglect.
       
        </p>
        <p>
          <strong className="text-zinc-900">3. Return Process & Timeline </strong>
            1. **Initiate Return:** Email support@seoulveda.com with your Order ID and the detailed reason for the return.
            2. **Approval & Pickup:** Our team verifies eligibility (24–48 hours). If approved, a pickup via Delhivery is scheduled.
            3. **Warehouse QC:** The item undergoes a Quality Check at our Mumbai warehouse.
            Timeline for QC: 2–3 business days.
            4. **Final Action:** Upon QC approval, the refund or replacement is immediately initiated.
        </p>
        <p>
          <strong className="text-zinc-900">4. Refund Processing </strong>
          Refund processing time starts <strong>after</strong> the Quality Check is completed and approved by the warehouse.
          <br /> Method - Estimated Time (After Approval)
          <br /> Credit/Debit Card - 3 - 7 Business Days
          <br /> Net Banking / Bank Transfer - 3 - 5 Business Days
          <br /> UPI / Wallets - 1 - 3 Business Days (Fastest)
        </p>
        <p>
          <strong className="text-zinc-900">Contact Customer Support</strong>
          <br /> Please reach out during our business hours for immediate assistance.
          <br /> 📧 Email: support@seoulveda.com
          <br /> 📞 Phone / WhatsApp: [+918828338323]
          <br /> 🕒 Hours: Mon–Sat, 10:00 AM – 6:00 PM IST
        </p>
      </Container>
    </div>
  );
}
