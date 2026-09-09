import type { Metadata } from "next";
import { Noto_Sans_KR, Playfair_Display, Poppins } from "next/font/google";
import { headers } from "next/headers";
import { Toaster } from "sonner";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { PopupHost } from "@/components/layout/popup-host";
import { CartProvider } from "@/components/cart/cart-provider";
import { ContactDialogHost } from "@/components/contact/contact-dialog";
import { SiteVersionProvider } from "@/components/site-version-provider";
import { SITE } from "@/lib/constants";
import {
  getSiteUrl,
  resolveRequestSiteVersion,
} from "@/lib/site-version";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

/**
 * Host-dependent metadata. Both production domains share one deployment, so
 * the canonical base URL (and the version it implies) must come from the
 * request host, not the build-time env.
 */
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const version = resolveRequestSiteVersion(host);
  return {
    metadataBase: new URL(getSiteUrl(version)),
    title: {
      default: SITE.name,
      template: `%s · ${SITE.name}`,
    },
    description: `${SITE.tagline} — ${SITE.description}`,
    openGraph: {
      siteName: SITE.name,
      title: SITE.name,
      description: `${SITE.tagline} — ${SITE.description}`,
      locale: version === "global" ? "en_US" : "en_IN",
      type: "website",
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Resolve this request's site version from the host so the global domain
  // (our-nara.co.kr) renders global immediately — same deployment, two
  // domains, so the build-time SITE_VERSION can't tell them apart.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const initialVersion = resolveRequestSiteVersion(host);

  return (
    <html
      lang="en"
      className={`${poppins.variable} ${playfair.variable} ${notoSansKr.variable} h-full antialiased overflow-x-clip`}
    >
      <head>
        {/* Original Pretendard font (the theme's primary font). */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css"
        />
      </head>
      <body className="flex min-h-full flex-col overflow-x-clip">
        <SiteVersionProvider initialVersion={initialVersion}>
          <CartProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </CartProvider>
        </SiteVersionProvider>
        <Toaster richColors position="top-center" />
        <PopupHost />
        <ContactDialogHost />
      </body>
    </html>
  );
}
