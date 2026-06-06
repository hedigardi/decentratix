import type { MetadataRoute } from "next";

const baseUrl = "https://decentratix.hedigardi.com";

// sitemap.xml entries for indexable public routes.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/scanner`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
