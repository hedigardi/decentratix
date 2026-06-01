import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Decentratix | Fair Ticket Resale Demo",
  description:
    "Portfolio dApp demo showing capped resale pricing, artist royalties, and anti-screenshot dynamic QR ticket validation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
