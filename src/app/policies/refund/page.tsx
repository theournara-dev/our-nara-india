import type { Metadata } from "next";
import { headers } from "next/headers";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import {
  getVersionConfig,
  resolveRequestSiteVersion,
} from "@/lib/site-version";

export const metadata: Metadata = { title: "Cancellation & Refund Policy" };

function IndiaRefundPolicy() {
  return (
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
  );
}

function GlobalRefundPolicy() {
  return (
    <Container className="mx-auto max-w-3xl space-y-6 pb-16 text-sm leading-relaxed text-zinc-600">
      <p>
        <strong className="text-zinc-900">Effective Date:</strong> 2026-09-10
      </p>
      <p>
        Please carefully read this policy before placing your order. By placing your order, you acknowledge and agree to the terms stated below.
      </p>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">1. Order Cancellation</h2>
        <h3 className="font-semibold text-zinc-900">1.1 Cancellation Before Shipment</h3>
        <p>
          Customers may request cancellation <strong className="text-zinc-900">within 1 hour of placing the order</strong>, provided the order has not already entered the processing or shipment stage.
        </p>
        <p>
          After the 1-hour cancellation period, cancellation may not be possible because the order may have already entered the international fulfillment and shipping process.
        </p>
        <p>
          For urgent cancellation requests, please contact Customer Support immediately. Cancellation cannot be guaranteed once the order has been processed or shipped.
        </p>
        <h3 className="font-semibold text-zinc-900">1.2 Cancellation After Shipment</h3>
        <p>
          Once an order has been dispatched from Korea or handed over to the international courier/logistics provider, <strong className="text-zinc-900">the order cannot be cancelled</strong>.
        </p>
        <p>
          As the product is shipped directly from Korea, customers are advised to carefully verify the product, quantity, delivery address, and other order details before completing payment.
        </p>
        <p>Refusing delivery after shipment does not automatically qualify the customer for a refund.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">2. Direct Shipment & Delivery Timeline</h2>
        <p>All applicable products are <strong className="text-zinc-900">shipped directly from Korea to the customer&apos;s delivery address</strong>.</p>
        <h3 className="font-semibold text-zinc-900">Estimated Delivery Time</h3>
        <p>
          The estimated delivery period is:
          <br />
          <strong className="text-zinc-900">15–20 business days from the date the order is confirmed and all required KYC information has been received and verified.</strong>
        </p>
        <p>This is an estimated delivery period and may be extended due to circumstances beyond our reasonable control, including:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>International shipping delays</li>
          <li>Customs clearance</li>
          <li>Import procedures</li>
          <li>Government or regulatory inspections</li>
          <li>Courier or logistics delays</li>
          <li>Public holidays</li>
          <li>Incorrect or incomplete customer information</li>
          <li>Force majeure events</li>
          <li>Delays caused by authorities in the destination country</li>
        </ul>
        <p>Customers are requested to allow additional time where customs clearance or other regulatory procedures cause delays.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">3. Mandatory KYC Verification</h2>
        <p>Because orders are shipped directly from Korea, <strong className="text-zinc-900">KYC/identity verification may be required before shipment</strong>.</p>
        <p>Customers may be required to provide a valid government-issued identification document, such as an ID card, passport, or other legally acceptable identification document.</p>
        <p>KYC information may be used for:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Identity verification</li>
          <li>Customs and import documentation</li>
          <li>Shipment processing</li>
          <li>Regulatory compliance</li>
          <li>Fraud prevention</li>
          <li>Transaction verification</li>
        </ul>
        <p>Customers must provide accurate and valid information when requested.</p>
        <p>Failure to provide the required KYC information may result in the order being delayed, suspended, or cancelled.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">4. No Return Policy</h2>
        <p><strong className="text-zinc-900">All sales are final and returns are not accepted.</strong></p>
        <p>Because the products are shipped directly from Korea through an international fulfillment process, <strong className="text-zinc-900">customers cannot return products simply because they have changed their mind, ordered the wrong product, no longer require the product, or are dissatisfied with the product after delivery.</strong></p>
        <p>Customers are therefore strongly advised to carefully review the product information, quantity, shipping address, and order details before completing their purchase.</p>
        <p>This no-return policy does not limit any rights or remedies that may be required under applicable law.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">5. Refund Policy</h2>
        <p>Although returns are not accepted, <strong className="text-zinc-900">refunds may be issued in eligible circumstances</strong> in accordance with this policy and applicable law.</p>
        <p>A refund may be considered where, for example:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>The order was not successfully fulfilled due to an issue attributable to us.</li>
          <li>The wrong product was dispatched by us.</li>
          <li>The product is confirmed to have a manufacturing defect or other qualifying issue.</li>
          <li>The shipment is confirmed to be lost in transit and cannot be delivered.</li>
          <li>A refund is otherwise required under applicable law.</li>
        </ul>
        <p>Refund eligibility will be determined after reviewing the order, shipment information, supporting documentation, and the circumstances of the claim.</p>
        <h3 className="font-semibold text-zinc-900">Change-of-Mind Refunds</h3>
        <p>Refunds are <strong className="text-zinc-900">not provided for change-of-mind requests</strong>, incorrect orders made by the customer, or refusal to accept delivery after shipment, except where a refund is required by applicable law.</p>
        <h3 className="font-semibold text-zinc-900">Refund Processing</h3>
        <p>Where a refund is approved, the refund will be initiated through the applicable payment method.</p>
        <p>The time required for the refund to appear in the customer&apos;s account depends on the payment provider, bank, card issuer, or other financial institution.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">6. Damaged, Defective or Incorrect Products</h2>
        <p>If you receive a product that appears to be <strong className="text-zinc-900">damaged, defective, incorrect, or materially different from the product you ordered</strong>, please contact Customer Support <strong className="text-zinc-900">as soon as possible after delivery</strong>.</p>
        <p>To enable us to properly investigate your claim, you may be required to provide:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Order ID</li>
          <li>A detailed description of the issue</li>
          <li>Clear photographs or video of the product and its packaging</li>
          <li>Photographs showing the product label, model number, serial number, or other identifying information, where applicable</li>
          <li>Any additional information reasonably requested by our support team</li>
        </ol>
        <h3 className="font-semibold text-zinc-900">AI-Assisted Verification</h3>
        <p>For the purpose of reviewing damage, defects, product identity, packaging condition, or whether the product received corresponds to the product ordered, <strong className="text-zinc-900">we may use automated systems, including AI-assisted image or information analysis, as part of our verification and fraud-prevention process</strong>.</p>
        <p>AI-assisted tools may be used to help identify apparent damage, product discrepancies, packaging issues, or other irregularities based on the information and images submitted by the customer.</p>
        <p><strong className="text-zinc-900">AI-assisted analysis does not by itself determine a customer&apos;s entitlement to a refund.</strong> Our team may review the submitted information and supporting evidence before making a final determination regarding refund eligibility.</p>
        <p>Where necessary, we may request additional photographs, videos, documentation, or other evidence to verify the claim.</p>
        <p>Our team will review the claim and determine whether the reported issue qualifies for a refund or other appropriate remedy under this policy and applicable law.</p>
        <p><strong className="text-zinc-900">Customers must not dispose of, alter, repair, modify, or materially change the product or its packaging before the claim has been reviewed</strong>, where retaining the product is reasonably possible.</p>
        <p>Submitting false, manipulated, misleading, or AI-generated evidence in connection with a refund claim may result in the claim being rejected and may lead to further action where appropriate.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">7. Customs, Duties & Import Requirements</h2>
        <p>International shipments may be subject to customs clearance, import requirements, taxes, duties, or other charges imposed by the destination country.</p>
        <p>Customers are responsible for providing accurate delivery and identification information and complying with applicable import requirements.</p>
        <p>Delays caused by customs authorities, government inspections, incomplete documentation, or incorrect information provided by the customer may extend the estimated delivery period.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">8. Important Customer Acknowledgment</h2>
        <p>By placing an order, the customer acknowledges and agrees that:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Products are shipped <strong className="text-zinc-900">directly from Korea</strong>.</li>
          <li>Estimated delivery is <strong className="text-zinc-900">15–20 business days</strong>, subject to possible delays.</li>
          <li>KYC verification may be required before shipment.</li>
          <li>A valid government-issued ID may be required for KYC and shipment processing.</li>
          <li><strong className="text-zinc-900">Returns are not accepted.</strong></li>
          <li>Refunds are available only in eligible circumstances as described in this policy or where required by applicable law.</li>
          <li>Change-of-mind requests generally do not qualify for a refund.</li>
          <li>Refusing delivery after shipment does not automatically qualify for a refund.</li>
          <li>Customers are responsible for providing accurate delivery, KYC, and customs information.</li>
          <li>AI-assisted systems may be used as part of the verification process for product damage, defects, discrepancies, and fraud prevention.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">9. Customer Support</h2>
        <p>For questions regarding your order, KYC verification, delivery, cancellation, or refund request, please contact our Customer Support team.</p>
        <p>
          <strong className="text-zinc-900">Customer Support</strong>
          <br />📧 <strong className="text-zinc-900">Email:</strong>{" "}
          <a className="hover:opacity-50" href="mailto:tft@thefirstteam.co.kr">tft@thefirstteam.co.kr</a>
          <br />📞 <strong className="text-zinc-900">Phone / WhatsApp:</strong> +82 [Insert Complete Number]
          <br />🕒 <strong className="text-zinc-900">Business Hours:</strong> Monday–Saturday, 10:00 AM–6:00 PM KST
        </p>
        <p>We recommend contacting us as soon as possible if you experience any issue with your order.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">10. Applicable Law</h2>
        <p>This policy is subject to applicable laws and regulations.</p>
        <p>Nothing in this policy is intended to exclude or restrict any mandatory consumer rights or legal remedies that cannot legally be excluded or restricted.</p>
        <p>Where applicable law provides a customer with rights that differ from this policy, those mandatory legal rights shall prevail.</p>
      </section>
    </Container>
  );
}

export default async function RefundPage() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const version = resolveRequestSiteVersion(host);
  const isGlobal = !getVersionConfig(version).showIndianAddress;

  return (
    <div>
      <PageHeader eyebrow="Legal" title="Cancellation & Refund Policy" />
      {isGlobal ? <GlobalRefundPolicy /> : <IndiaRefundPolicy />}
    </div>
  );
}
