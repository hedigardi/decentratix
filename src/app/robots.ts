import type { MetadataRoute } from "next";

// robots.txt rules for the production domain.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://decentratix.hedigardi.com/sitemap.xml",
    host: "https://decentratix.hedigardi.com",
  };
}
