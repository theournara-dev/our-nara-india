import type { Metadata } from "next";
import { Noto_Sans_KR, Playfair_Display, Poppins } from "next/font/google";
import { headers } from "next/headers";
import { Toaster } from "sonner";
import { SiteAnalytics } from "@/components/site-analytics";
import { Footer } from "@/components/layout/footer";
import { FloatingButtons } from "@/components/layout/floating-buttons";
import { Header } from "@/components/layout/header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { PopupHost } from "@/components/layout/popup-host";
import { CartProvider } from "@/components/cart/cart-provider";
import { ContactDialogHost } from "@/components/contact/contact-dialog";
import { SiteVersionProvider } from "@/components/site-version-provider";
import { getCategoryNav } from "@/data/categories";
import { SITE } from "@/lib/constants";
import { getSiteConfig } from "@/lib/site-config";
import { topBannerBackgroundCss } from "@/lib/site-content";
import { getSiteUrl, resolveRequestSiteVersion } from "@/lib/site-version";
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
  // Contact details, the top banner and the store picker come from the admin
  // site settings; defaults are baked in so nothing renders empty before an
  // admin saves them. Both versions are read because the store switcher is
  // client-side: the cart and product page must re-price delivery on switch
  // without waiting for a server round trip.
  const [siteContent, localSite, globalSite, navCategories] = await Promise.all(
    [
      getSiteConfig(initialVersion),
      getSiteConfig("local"),
      getSiteConfig("global"),
      // The header menu mirrors the admin's category tree.
      getCategoryNav(),
    ],
  );
  const shippingByVersion = {
    local: {
      shippingCents: localSite.shippingCents,
      freeShippingOverCents: localSite.freeShippingOverCents,
      dispatchCutoffHour: localSite.dispatchCutoffHour,
    },
    global: {
      shippingCents: globalSite.shippingCents,
      freeShippingOverCents: globalSite.freeShippingOverCents,
      dispatchCutoffHour: globalSite.dispatchCutoffHour,
    },
  };
  // The store selector's two halves wear each store's top-banner background
  // (client's slide 4): the International gradient and the India purple.
  const storeBackgrounds = {
    local: topBannerBackgroundCss(localSite.topBanner[0]),
    global: topBannerBackgroundCss(globalSite.topBanner[0]),
  };

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
      {/* The fixed mobile tab bar sits over the page, so the body keeps a
          matching bottom padding on phones or it would cover the footer. */}
      <body className="flex min-h-full flex-col overflow-x-clip max-md:pb-[calc(58px+env(safe-area-inset-bottom))]">
        <SiteVersionProvider
          initialVersion={initialVersion}
          shippingByVersion={shippingByVersion}
          brandLogo={siteContent.switcher.brandLogo}
        >
          <CartProvider>
            <Header
              siteContent={siteContent}
              navCategories={navCategories}
              storeBackgrounds={storeBackgrounds}
              topBanners={{
                local: localSite.topBanner,
                global: globalSite.topBanner,
              }}
              menuIcons={localSite.menuIcons}
            />
            <main className="flex-1">{children}</main>
            <Footer />
          </CartProvider>
          <MobileTabBar />
          {/* Storefront-wide floating actions (recent views + scroll to top);
              it hides itself inside the admin dashboard. */}
          <FloatingButtons />
          {/* Inside the provider: a store-picker popup switches the store, and
              the card reads the current version to mark the active card. */}
          <PopupHost switcher={siteContent.switcher} />
        </SiteVersionProvider>
        <Toaster richColors position="top-center" />
        <ContactDialogHost />
        <SiteAnalytics />
      </body>
    </html>
  );
}
