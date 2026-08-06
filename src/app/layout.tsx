import type { Metadata } from "next";
import { Noto_Sans_KR, Playfair_Display, Poppins } from "next/font/google";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SITE } from "@/lib/constants";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.name,
    template: `%s · ${SITE.name}`,
  },
  description: `${SITE.tagline} — ${SITE.description}`,
  openGraph: {
    siteName: SITE.name,
    title: SITE.name,
    description: `${SITE.tagline} — ${SITE.description}`,
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${playfair.variable} ${notoSansKr.variable} h-full antialiased`}
    >
      <head>
        {/* Original Cafe24 theme CSS, served as a static asset (bypasses Tailwind). */}
        <link rel="stylesheet" href="/css/theme.css" />
      </head>
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
