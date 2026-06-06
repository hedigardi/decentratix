import type { Metadata, Viewport } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";

import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

const body = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Production canonical host used by metadata, sitemap and structured data.
const siteUrl = "https://decentratix.hedigardi.com";

// Global metadata is shared across routes unless a child layout overrides it.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Decentratix",
  title: {
    default: "Decentratix | Fair Ticket Resale for Events",
    template: "%s | Decentratix",
  },
  description:
    "Fair ticket resale for events with capped pricing, organizer royalties, and rotating QR entry verification.",
  keywords: [
    "ticket resale",
    "fair ticketing",
    "blockchain ticketing",
    "dynamic QR ticket",
    "event entry verification",
    "royalty routing",
    "decentratix",
  ],
  alternates: {
    canonical: "/",
  },
  authors: [{ name: "Hedi Gardi", url: "https://hedigardi.com" }],
  creator: "Hedi Gardi",
  publisher: "hedigardi.com",
  category: "technology",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Decentratix",
    title: "Decentratix | Fair Ticket Resale for Events",
    description:
      "Launch fair ticket resale with price caps, automatic organizer royalties, and secure rotating QR checks at the gate.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Decentratix fair ticket resale platform",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Decentratix | Fair Ticket Resale for Events",
    description:
      "Fair resale with pricing caps, organizer royalties, and rotating QR entry security.",
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/site.webmanifest?v=20260607",
  icons: {
    icon: [
      { url: "/favicon.ico?v=20260607" },
      {
        url: "/favicon-16x16.png?v=20260607",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon-32x32.png?v=20260607",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=20260607", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Match browser chrome color to theme mode on mobile browsers.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Apply theme before hydration to avoid a flash between light/dark palettes.
  const themeInitScript = `
    (function() {
      try {
        var stored = localStorage.getItem("theme");
        var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        var theme = (stored === "light" || stored === "dark") ? stored : (prefersDark ? "dark" : "light");
        document.documentElement.dataset.theme = theme;
      } catch (e) {
        document.documentElement.dataset.theme = "light";
      }
    })();
  `;

  // Structured data improves rich search understanding for brand + website entity.
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Decentratix",
    url: siteUrl,
    logo: `${siteUrl}/android-chrome-512x512.png`,
    sameAs: ["https://hedigardi.com"],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Decentratix",
    url: siteUrl,
    description:
      "Fair ticket resale platform with on-chain verification and rotating QR-based entry checks.",
  };

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
