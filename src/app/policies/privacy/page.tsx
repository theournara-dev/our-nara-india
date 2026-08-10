import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Terms of use & Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div>
      <PageHeader eyebrow="Legal" title="Terms of use & Privacy Policy" />

      <Container className="mx-auto max-w-3xl space-y-6 pb-16 text-sm leading-relaxed text-zinc-600">
    <p>
      Please read these Terms of use & Privacy Policy carefully before using <strong className="text-zinc-900">OUR NARA</strong>,
      owned and operated by <strong className="text-zinc-900">Seoulveda Trading LLP</strong>. By accessing or using
      this website, you agree to be bound by these terms.
    </p>

    <p>
      <strong className="text-zinc-900">1. Ownership of the Site.</strong>{" "}
      All content, including text, images, graphics, logos, trademarks, software,
      and other materials on this website are the intellectual property of
      Seoulveda Trading LLP and are protected by applicable copyright and
      trademark laws. Unauthorized copying, reproduction, or distribution is
      prohibited.
    </p>

    <p>
      <strong className="text-zinc-900">2. Acceptable Use.</strong>{" "}
      Users must not misuse the website by uploading harmful content, violating
      intellectual property rights, sending spam, attempting unauthorized access,
      or engaging in unlawful activities.
    </p>

    <p>
      <strong className="text-zinc-900">3. Account Security.</strong>{" "}
      You are responsible for maintaining the confidentiality of your account
      credentials. Notify us immediately if you suspect unauthorized access to
      your account.
    </p>

    <p>
      <strong className="text-zinc-900">4. Orders & Payments.</strong>{" "}
      Orders are subject to availability. By placing an order, you agree to
      provide accurate payment information and pay all applicable charges,
      including taxes and shipping fees.
    </p>

    <p>
      <strong className="text-zinc-900">5. User Content.</strong>{" "}
      Any content submitted to the website may be used by Seoulveda Trading LLP
      in accordance with these Terms. You must ensure that your submissions do
      not violate any third-party rights.
    </p>

    <p>
      <strong className="text-zinc-900">6. Privacy.</strong>{" "}
      Your use of this website is also governed by our Privacy Policy, which
      explains how personal information is collected, used, and protected.
    </p>

    <p>
      <strong className="text-zinc-900">7. Limitation of Liability.</strong>{" "}
      The website and its services are provided "as is" without warranties of
      any kind. Seoulveda Trading LLP shall not be liable for indirect,
      incidental, or consequential damages arising from the use of this website.
    </p>

    <p>
      <strong className="text-zinc-900">8. Termination.</strong>{" "}
      We reserve the right to suspend or terminate access to the website if
      these Terms are violated or if necessary to protect our services and users.
    </p>

    <p>
      <strong className="text-zinc-900">9. Changes to These Terms.</strong>{" "}
      We may update these Terms of use & Privacy Policy from time to time. Continued use of
      the website after changes are posted constitutes acceptance of the revised
      terms.
    </p>

    <p>
      <strong className="text-zinc-900">10. Contact Us.</strong>{" "}
      If you have any questions regarding these Terms of use & Privacy Policy, please
      contact us via email:consumeraffairs@seoulveda.com , phone:+91-88283383323, or the address provided on our Contact page.
    </p>
      </Container>
    </div>
  );
}
