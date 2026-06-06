import type { Metadata } from "next";

// Route-specific SEO metadata for the scanner experience.
export const metadata: Metadata = {
  title: "Gate Scanner",
  description:
    "Live gate scanner for Decentratix ticket verification with ownership checks and signed QR freshness windows.",
  alternates: {
    canonical: "/scanner",
  },
  openGraph: {
    type: "website",
    title: "Gate Scanner | Decentratix",
    description:
      "Scan and verify live ticket QR payloads with freshness windows, signature recovery, and on-chain ownership validation.",
    url: "https://decentratix.hedigardi.com/scanner",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Decentratix gate scanner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gate Scanner | Decentratix",
    description:
      "Verify ticket QR payloads with freshness and owner checks at event entry.",
    images: ["/twitter-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
